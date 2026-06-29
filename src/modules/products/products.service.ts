import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { paginate, resolveSortColumn } from '../../common/dto/paginated';
import { AuthUser, Role } from '../../common/types/auth.types';
import { slugify } from '../../common/utils/slug.util';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

const SORTABLE = ['name', 'price', 'clickCount', 'createdAt'] as const;

const TAXONOMY_SELECT = {
  select: { id: true, name: true, engName: true, slug: true },
  orderBy: { name: 'asc' },
} as const;

const DETAIL_INCLUDE = {
  images: { orderBy: { position: 'asc' } },
  shop: { select: { id: true, name: true, slug: true, logoUrl: true } },
  categories: TAXONOMY_SELECT,
  subcategories: TAXONOMY_SELECT,
  _count: { select: { likes: true } },
} satisfies Prisma.ProductInclude;

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProductDto, actor: AuthUser) {
    const shopId = this.resolveShopId(dto.shopId, actor);
    await this.ensureShopExists(shopId);
    const { categoryIds, subcategoryIds } = await this.resolveTaxonomy(
      dto.categoryIds,
      dto.subcategoryIds,
    );

    // Name is optional; slug stays NOT NULL and unique-per-shop, so fall back to
    // a generated slug when the name is missing or transliterates to empty.
    const slug =
      dto.slug ||
      (dto.name && slugify(dto.name)) ||
      `product-${randomUUID().slice(0, 8)}`;

    return this.prisma.product.create({
      data: {
        shopId,
        name: dto.name ?? null,
        slug,
        description: dto.description,
        price: dto.price ?? null,
        salePrice: dto.salePrice ?? null,
        currency: dto.currency ?? 'MNT',
        size: dto.size ?? [],
        color: dto.color ?? [],
        categories: { connect: categoryIds.map((id) => ({ id })) },
        subcategories: { connect: subcategoryIds.map((id) => ({ id })) },
        isActive: dto.isActive ?? true,
      },
      include: DETAIL_INCLUDE,
    });
  }

  /** Admin listing — sees all products (active and inactive). */
  async findAll(query: QueryProductDto) {
    return this.list(query, this.buildWhere(query));
  }

  /**
   * Public listing — only active products belonging to active shops. The public
   * API keeps the historical singular `category`/`subcategory` shape (derived
   * from the first of each set), so the storefront is unaffected by the move to
   * many-to-many taxonomy.
   */
  async findAllPublic(query: QueryProductDto) {
    const where: Prisma.ProductWhereInput = {
      ...this.buildWhere(query),
      isActive: true,
      shop: { isActive: true },
    };
    const result = await this.list(query, where);
    return { ...result, items: result.items.map((p) => toPublicProduct(p)) };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: DETAIL_INCLUDE,
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  /**
   * Public product detail. Atomically increments click_count in the same call
   * and returns the fresh record (single-column atomic increment).
   */
  async viewPublic(id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, isActive: true, shop: { isActive: true } },
      select: { id: true },
    });
    if (!product) throw new NotFoundException('Product not found');

    const updated = await this.prisma.product.update({
      where: { id },
      data: { clickCount: { increment: 1 } },
      include: DETAIL_INCLUDE,
    });
    return toPublicProduct(updated);
  }

  /** Atomic single-column increment of the click counter. */
  async incrementClick(id: string) {
    const exists = await this.prisma.product.findFirst({
      where: { id, isActive: true, shop: { isActive: true } },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Product not found');

    const updated = await this.prisma.product.update({
      where: { id },
      data: { clickCount: { increment: 1 } },
      select: { id: true, clickCount: true },
    });
    return updated;
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.ensureExists(id);

    const data: Prisma.ProductUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.price !== undefined) data.price = dto.price;
    if (dto.salePrice !== undefined) data.salePrice = dto.salePrice;
    if (dto.currency !== undefined) data.currency = dto.currency;
    if (dto.size !== undefined) data.size = dto.size;
    if (dto.color !== undefined) data.color = dto.color;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    if (dto.categoryIds !== undefined || dto.subcategoryIds !== undefined) {
      const { categoryIds, subcategoryIds } = await this.resolveTaxonomy(
        dto.categoryIds,
        dto.subcategoryIds,
      );
      // `set` replaces the full association list, so only touch the side(s) the
      // caller actually sent. Parent categories of chosen subcategories are
      // folded into `categoryIds` only when categories are being replaced too.
      if (dto.categoryIds !== undefined) {
        data.categories = { set: categoryIds.map((cid) => ({ id: cid })) };
      }
      if (dto.subcategoryIds !== undefined) {
        data.subcategories = {
          set: subcategoryIds.map((sid) => ({ id: sid })),
        };
      }
    }

    return this.prisma.product.update({
      where: { id },
      data,
      include: DETAIL_INCLUDE,
    });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.product.delete({ where: { id } });
    return { id, deleted: true };
  }

  // --- helpers ---------------------------------------------------------------

  private async list(query: QueryProductDto, where: Prisma.ProductWhereInput) {
    const orderBy = {
      [resolveSortColumn(query.sortBy, SORTABLE, 'createdAt')]: query.sortOrder,
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        orderBy,
        skip: query.skip,
        take: query.limit,
        include: {
          images: { orderBy: { position: 'asc' }, take: 1 },
          shop: { select: { id: true, name: true, slug: true } },
          categories: TAXONOMY_SELECT,
          subcategories: TAXONOMY_SELECT,
          _count: { select: { likes: true } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return paginate(items, total, query.page, query.limit);
  }

  private buildWhere(query: QueryProductDto): Prisma.ProductWhereInput {
    const price: Prisma.DecimalNullableFilter = {};
    if (query.minPrice !== undefined) price.gte = query.minPrice;
    if (query.maxPrice !== undefined) price.lte = query.maxPrice;

    return {
      ...(query.shopId ? { shopId: query.shopId } : {}),
      ...(query.categoryId
        ? { categories: { some: { id: query.categoryId } } }
        : {}),
      ...(query.subcategoryId
        ? { subcategories: { some: { id: query.subcategoryId } } }
        : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(query.sale ? { salePrice: { not: null } } : {}),
      ...(query.minPrice !== undefined || query.maxPrice !== undefined
        ? { price }
        : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
  }

  private resolveShopId(
    shopIdFromDto: string | undefined,
    actor: AuthUser,
  ): string {
    if (actor.role === Role.ShopAdmin) {
      if (!actor.shopId) throw new ForbiddenException('No shop associated');
      return actor.shopId; // shop admins can only create within their own shop
    }
    if (!shopIdFromDto) {
      throw new BadRequestException('shopId is required');
    }
    return shopIdFromDto;
  }

  /**
   * Validates the requested categories/subcategories and returns deduped id
   * lists. Each chosen subcategory's parent category is folded into the category
   * set so a product is always discoverable under the parent too.
   */
  private async resolveTaxonomy(
    categoryIds?: string[],
    subcategoryIds?: string[],
  ): Promise<{ categoryIds: string[]; subcategoryIds: string[] }> {
    const catIds = new Set(categoryIds ?? []);
    const subIds = [...new Set(subcategoryIds ?? [])];

    if (catIds.size > 0) {
      const found = await this.prisma.category.findMany({
        where: { id: { in: [...catIds] } },
        select: { id: true },
      });
      if (found.length !== catIds.size) {
        throw new BadRequestException('One or more categories do not exist');
      }
    }

    if (subIds.length > 0) {
      const subs = await this.prisma.subcategory.findMany({
        where: { id: { in: subIds } },
        select: { id: true, categoryId: true },
      });
      if (subs.length !== subIds.length) {
        throw new BadRequestException('One or more subcategories do not exist');
      }
      // Keep the category set consistent with the chosen subcategories.
      for (const sub of subs) catIds.add(sub.categoryId);
    }

    return { categoryIds: [...catIds], subcategoryIds: subIds };
  }

  private async ensureExists(id: string) {
    const exists = await this.prisma.product.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Product not found');
  }

  private async ensureShopExists(shopId: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      select: { id: true },
    });
    if (!shop) throw new BadRequestException('Shop does not exist');
  }
}

type TaxonomyRef = {
  id: string;
  name: string;
  engName: string | null;
  slug: string;
};

/**
 * Collapses the many-to-many `categories`/`subcategories` arrays back to the
 * legacy singular shape (`categoryId`/`subcategoryId` + `category`/
 * `subcategory`) used by the public API and storefront. The first of each set
 * is treated as the primary one.
 */
function toPublicProduct<
  T extends {
    categories: TaxonomyRef[];
    subcategories: TaxonomyRef[];
    _count?: { likes: number };
  },
>(product: T) {
  const { categories, subcategories, _count, ...rest } = product;
  const category = categories[0] ?? null;
  const subcategory = subcategories[0] ?? null;
  return {
    ...rest,
    categoryId: category?.id ?? null,
    subcategoryId: subcategory?.id ?? null,
    category,
    subcategory,
    // Total likes, flattened from Prisma's relation `_count` so the storefront
    // can render the heart count without an extra round-trip per card.
    likeCount: _count?.likes ?? 0,
  };
}
