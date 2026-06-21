import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { CloudflareService } from '../../modules/file/cf.service';

/**
 * Response fields that hold an image reference. Stored as bare object keys, they
 * are resolved to freshly signed URLs on the way out. Values that are already
 * absolute URLs (external seed images, social links) pass through untouched, so
 * `url` is safe to include even though ShopSocial also uses it.
 */
const IMAGE_FIELDS = new Set(['logoUrl', 'coverUrl', 'imageUrl', 'url']);

/**
 * Walks every successful response and replaces stored image keys with signed,
 * browser-loadable URLs. Runs inside the response envelope interceptor so it
 * sees the raw controller payload.
 */
@Injectable()
export class StorageUrlInterceptor implements NestInterceptor {
  constructor(private readonly cloudflare: CloudflareService) {}

  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      mergeMap(async (data) => {
        await this.signDeep(data);
        return data;
      }),
    );
  }

  private async signDeep(node: unknown): Promise<void> {
    if (Array.isArray(node)) {
      await Promise.all(node.map((child) => this.signDeep(child)));
      return;
    }
    if (!node || typeof node !== 'object' || node instanceof Date) return;

    const record = node as Record<string, unknown>;
    await Promise.all(
      Object.entries(record).map(async ([key, value]) => {
        if (typeof value === 'string' && IMAGE_FIELDS.has(key)) {
          record[key] = await this.cloudflare.toDisplayUrl(value);
        } else if (value && typeof value === 'object') {
          await this.signDeep(value);
        }
      }),
    );
  }
}
