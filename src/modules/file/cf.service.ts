import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';

/**
 * Lifetime of the signed URLs handed back to clients for displaying images.
 * Long enough to outlive a browsing session; capped below R2's 7-day limit.
 */
const SIGNED_URL_TTL_SECONDS = Number(process.env.CF_SIGNED_URL_TTL) || 86_400;

@Injectable()
export class CloudflareService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly endpoint: string;
  private readonly defaultFolder: string;

  constructor() {
    const accessKeyId = process.env.CF_R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.CF_R2_SECRET_ACCESS_KEY;
    const endpoint = process.env.CF_ENDPOINT;
    const bucket = process.env.CF_BUCKET_NAME;
    const folder = process.env.CF_FOLDER || 'uploads';

    if (!accessKeyId || !secretAccessKey || !endpoint || !bucket) {
      throw new Error('Cloudflare R2 configuration is incomplete');
    }

    this.bucket = bucket;
    this.endpoint = endpoint;
    this.defaultFolder = folder;

    this.s3 = new S3Client({
      endpoint: this.endpoint, // already full https://....r2.cloudflarestorage.com
      region: 'auto', // always "auto" for R2
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  // #region Upload
  async uploadFile(
    file: Express.Multer.File,
    folder: string = this.defaultFolder,
    _publicRead = true, // ignored for R2
    userId?: string,
  ): Promise<{ key: string; signedUrl: string }> {
    // Sanitize: strip path components, keep only safe ASCII chars, limit length
    const safeName = file.originalname
      .replace(/.*[\/\\]/, '') // strip directory components
      .replace(/[^a-zA-Z0-9._-]/g, '_') // only safe chars
      .slice(0, 100); // limit length
    const key = `${folder}/${randomUUID()}-${userId ?? 'anon'}-${safeName}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      Metadata: {
        'x-amz-meta-original-name': file.originalname,
      },
    });

    try {
      await this.s3.send(command);
      const signedUrl = await this.getSignedUrl(key, 600);
      return { key, signedUrl };
    } catch (err) {
      console.error('Upload error:', err);
      throw new InternalServerErrorException('errors.failedToUploadFile');
    }
  }
  // #endregion

  // #region Signed URL
  async getSignedUrl(key: string, expiresInSeconds = 300): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return await getSignedUrl(this.s3, command, {
      expiresIn: expiresInSeconds,
    });
  }
  // #endregion

  // #region Public URL
  /**
   * Builds a durable, publicly-resolvable URL for a stored object. Prefers a
   * configured CDN/custom-domain base (CF_PUBLIC_BASE_URL); falls back to the
   * raw R2 endpoint form (only resolvable if the bucket is public).
   */
  buildPublicUrl(key: string): string {
    const base = process.env.CF_PUBLIC_BASE_URL?.replace(/\/+$/, '');
    if (base) return `${base}/${key}`;
    return `${this.endpoint}/${this.bucket}/${key}`;
  }
  // #endregion

  // #region Key <-> display URL
  /**
   * A stored image reference is one of our own object keys when it carries no
   * URL scheme. Full URLs (external seed images, social links) are left alone.
   */
  private isOwnKey(value: string): boolean {
    return value.length > 0 && !/^[a-z][a-z0-9+.-]*:\/\//i.test(value);
  }

  /**
   * Normalizes a value we are about to persist down to a bare object key.
   * URLs pointing at our bucket (the raw endpoint form or a signed URL) are
   * reduced to their key; external URLs and bare keys are returned unchanged.
   * This is what lets the DB hold only keys while clients round-trip URLs.
   */
  toStorageKey<T extends string | null | undefined>(value: T): T {
    if (!value) return value;
    if (this.isOwnKey(value)) return value;

    // A configured CDN/custom-domain base wins (its objects live at base/<key>).
    const base = process.env.CF_PUBLIC_BASE_URL?.replace(/\/+$/, '');
    if (base && value.startsWith(`${base}/`)) {
      return value.slice(base.length + 1).split('?')[0] as T;
    }

    let url: URL;
    try {
      url = new URL(value);
    } catch {
      return value; // not a URL — leave as-is
    }
    const endpointHost = new URL(this.endpoint).host;
    const path = url.pathname.replace(/^\/+/, ''); // strips query + leading slash

    // Path-style URL: <endpointHost>/<bucket>/<key>
    if (url.host === endpointHost && path.startsWith(`${this.bucket}/`)) {
      return path.slice(this.bucket.length + 1) as T;
    }
    // Virtual-hosted URL (what the S3 presigner emits): <bucket>.<host>/<key>
    if (url.host === `${this.bucket}.${endpointHost}`) {
      return path as T;
    }
    return value; // external URL — persist verbatim
  }

  /**
   * Resolves a stored reference to a browser-loadable URL. Our object keys get
   * a freshly signed URL (the bucket is private); external/absolute URLs pass
   * through unchanged. Returned in API responses by the storage interceptor.
   */
  async toDisplayUrl<T extends string | null | undefined>(
    value: T,
  ): Promise<T | string> {
    if (!value) return value;
    // Reduce our-bucket URLs (including legacy raw-endpoint rows) to a key; an
    // external/absolute URL stays as-is and is passed straight through.
    const key = this.toStorageKey(value);
    if (!this.isOwnKey(key)) return key;
    return this.getSignedUrl(key, SIGNED_URL_TTL_SECONDS);
  }
  // #endregion

  // #region Extract key
  private extractKeyFromUrl(url: string): string {
    const prefix = `${this.endpoint}/${this.bucket}/`;
    if (!url.startsWith(prefix)) {
      throw new Error('Invalid R2 URL');
    }
    return url.replace(prefix, '');
  }
  // #endregion

  // #region Delete
  async deleteFile(fileUrl: string): Promise<void> {
    const key = this.extractKeyFromUrl(fileUrl);

    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    try {
      await this.s3.send(command);
    } catch (err) {
      console.error('Delete error:', err);
      throw new InternalServerErrorException('errors.failedToDeleteFile');
    }
  }

  /**
   * Deletes a single stored object by its reference. The value is first reduced
   * to our object key; external/absolute URLs (seed images, social links) are
   * not ours to delete and are skipped. Best-effort: a storage failure is logged
   * rather than thrown, so it never undoes a DB delete that already succeeded.
   */
  async deleteByKey(value: string | null | undefined): Promise<void> {
    if (!value) return;
    const key = this.toStorageKey(value);
    if (!this.isOwnKey(key)) return;
    try {
      await this.s3.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      );
    } catch (err) {
      console.error('Delete error:', err);
    }
  }

  /**
   * Bulk-deletes stored objects by their references — used when removing a
   * product (its images) or a whole shop (every product's images). Values are
   * normalized to keys and deduped; external/absolute URLs are skipped. R2 caps
   * a batch delete at 1000 keys, so the list is chunked. Best-effort: failures
   * are logged, never thrown.
   */
  async deleteKeys(values: Array<string | null | undefined>): Promise<void> {
    const keys = [
      ...new Set(
        values
          .map((v) => (v ? this.toStorageKey(v) : v))
          .filter((v): v is string => !!v && this.isOwnKey(v)),
      ),
    ];
    if (keys.length === 0) return;

    for (let i = 0; i < keys.length; i += 1000) {
      const chunk = keys.slice(i, i + 1000);
      try {
        await this.s3.send(
          new DeleteObjectsCommand({
            Bucket: this.bucket,
            Delete: { Objects: chunk.map((Key) => ({ Key })) },
          }),
        );
      } catch (err) {
        console.error('Bulk delete error:', err);
      }
    }
  }
  // #endregion
}
