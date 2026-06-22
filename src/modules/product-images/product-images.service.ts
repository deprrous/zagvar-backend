import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CloudflareService } from '../file/cf.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductImageDto } from './dto/create-product-image.dto';
import { UpdateProductImageDto } from './dto/update-product-image.dto';

/** A product may have at most this many images. */
export const MAX_PRODUCT_IMAGES = 5;

@Injectable()
export class ProductImagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudflare: CloudflareService,
  ) {}

  async create(productId: string, dto: CreateProductImageDto) {
    await this.ensureUnderLimit(productId);
    return this.prisma.productImage.create({
      data: {
        productId,
        url: this.cloudflare.toStorageKey(dto.url),
        position: dto.position ?? 0,
      },
    });
  }

  /** Uploads a file to R2 and records its object key (signed for display). */
  async upload(
    productId: string,
    file: Express.Multer.File | undefined,
    position?: number,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    await this.ensureUnderLimit(productId);
    const { key } = await this.cloudflare.uploadFile(file, 'products');
    return this.prisma.productImage.create({
      data: { productId, url: key, position: position ?? 0 },
    });
  }

  findAllForProduct(productId: string) {
    return this.prisma.productImage.findMany({
      where: { productId },
      orderBy: { position: 'asc' },
    });
  }

  async update(productId: string, id: string, dto: UpdateProductImageDto) {
    await this.ensureBelongsToProduct(productId, id);
    return this.prisma.productImage.update({
      where: { id },
      data: {
        url: this.cloudflare.toStorageKey(dto.url),
        position: dto.position,
      },
    });
  }

  async remove(productId: string, id: string) {
    await this.ensureBelongsToProduct(productId, id);
    await this.prisma.productImage.delete({ where: { id } });
    return { id, deleted: true };
  }

  /** Rejects adding a new image once the per-product cap is reached. */
  private async ensureUnderLimit(productId: string) {
    const count = await this.prisma.productImage.count({
      where: { productId },
    });
    if (count >= MAX_PRODUCT_IMAGES) {
      throw new BadRequestException(
        `A product can have at most ${MAX_PRODUCT_IMAGES} images`,
      );
    }
  }

  private async ensureBelongsToProduct(productId: string, id: string) {
    const image = await this.prisma.productImage.findUnique({
      where: { id },
      select: { productId: true },
    });
    if (!image || image.productId !== productId) {
      throw new NotFoundException('Image not found for this product');
    }
  }
}
