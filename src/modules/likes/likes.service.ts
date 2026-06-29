import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/** A product the visitor has liked, shaped for the storefront list view. */
const LIKED_PRODUCT_INCLUDE = {
  images: { orderBy: { position: 'asc' }, take: 1 },
  shop: { select: { id: true, name: true, slug: true, logoUrl: true } },
} satisfies Prisma.ProductInclude;

@Injectable()
export class LikesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Toggle a like for `productId` by `anonId`: create it if absent, remove it
   * if present. Returns the resulting liked state and the product's total like
   * count. The toggle and recount run in a single transaction so the count is
   * consistent with the state we report.
   */
  async toggle(productId: string, anonId: string) {
    await this.ensureProductExists(productId);

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.like.findUnique({
        where: { anonId_productId: { anonId, productId } },
        select: { id: true },
      });

      if (existing) {
        await tx.like.delete({ where: { id: existing.id } });
      } else {
        await tx.like.create({ data: { anonId, productId } });
      }

      const count = await tx.like.count({ where: { productId } });
      return { productId, liked: !existing, count };
    });
  }

  /** Total like count for a product and whether this visitor has liked it. */
  async getForProduct(productId: string, anonId: string) {
    await this.ensureProductExists(productId);

    const [count, mine] = await this.prisma.$transaction([
      this.prisma.like.count({ where: { productId } }),
      this.prisma.like.findUnique({
        where: { anonId_productId: { anonId, productId } },
        select: { id: true },
      }),
    ]);

    return { productId, liked: mine !== null, count };
  }

  /** All product ids this visitor has liked (newest first). */
  async listMine(anonId: string): Promise<string[]> {
    const likes = await this.prisma.like.findMany({
      where: { anonId },
      orderBy: { createdAt: 'desc' },
      select: { productId: true },
    });
    return likes.map((l) => l.productId);
  }

  /**
   * Full product objects for every product this visitor has liked, ordered by
   * when they were liked (newest first). Resolved in a single query to avoid
   * N+1 fetches on the storefront. Products whose shop is inactive are filtered
   * out so the "liked" view never surfaces hidden items.
   */
  async listMineProducts(anonId: string) {
    const likes = await this.prisma.like.findMany({
      where: { anonId, product: { isActive: true, shop: { isActive: true } } },
      orderBy: { createdAt: 'desc' },
      select: { product: { include: LIKED_PRODUCT_INCLUDE } },
    });
    return likes.map((l) => l.product);
  }

  private async ensureProductExists(productId: string): Promise<void> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!product) throw new NotFoundException('Product not found');
  }
}
