import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { paginate, resolveSortColumn } from '../../common/dto/paginated';
import { AuthUser, Role } from '../../common/types/auth.types';
import { slugify } from '../../common/utils/slug.util';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

const SORTABLE = ['name', 'price', 'clickCount', 'createdAt'] as const;

const DETAIL_INCLUDE = {
  images: { orderBy: { position: 'asc' } },
  shop: { select: { id: true, name: true, slug: true, logoUrl: true } },
  category: { select: { id: true, name: true, slug: true } },
  subcategory: { select: { id: true, name: true, slug: true } },
} satisfies Prisma.ProductInclude;

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProductDto, actor: AuthUser) {
    const shopId = this.resolveShopId(dto.shopId, actor);
    await this.ensureShopExists(shopId);
    const { categoryId, subcategoryId } = await this.resolveTaxonomy(
      dto.categoryId,
      dto.subcategoryId,
    );

    return this.prisma.product.create({
      data: {
        shopId,
        name: dto.name,
        slug: dto.slug ?? slugify(dto.name),
        description: dto.description,
        price: dto.price,
        currency: dto.currency ?? 'USD',
        categoryId,
        subcategoryId,
        isActive: dto.isActive ?? true,
      },
      include: DETAIL_INCLUDE,
    });
  }

  /** Admin listing — sees all products (active and inactive). */
  async findAll(query: QueryProductDto) {
    return this.list(query, this.buildWhere(query));
  }

  /** Public listing — only active products belonging to active shops. */
  async findAllPublic(query: QueryProductDto) {
    const where: Prisma.ProductWhereInput = {
      ...this.buildWhere(query),
      isActive: true,
      shop: { isActive: true },
    };
    return this.list(query, where);
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

    return this.prisma.product.update({
      where: { id },
      data: { clickCount: { increment: 1 } },
      include: DETAIL_INCLUDE,
    });
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
    const { categoryId, subcategoryId } = await this.resolveTaxonomy(
      dto.categoryId,
      dto.subcategoryId,
    );

    const data: Prisma.ProductUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.price !== undefined) data.price = dto.price;
    if (dto.currency !== undefined) data.currency = dto.currency;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.categoryId !== undefined) {
      data.category = categoryId ? { connect: { id: categoryId } } : { disconnect: true };
    }
    if (dto.subcategoryId !== undefined) {
      data.subcategory = subcategoryId
        ? { connect: { id: subcategoryId } }
        : { disconnect: true };
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
          category: { select: { id: true, name: true, slug: true } },
          subcategory: { select: { id: true, name: true, slug: true } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return paginate(items, total, query.page, query.limit);
  }

  private buildWhere(query: QueryProductDto): Prisma.ProductWhereInput {
    const price: Prisma.DecimalFilter = {};
    if (query.minPrice !== undefined) price.gte = query.minPrice;
    if (query.maxPrice !== undefined) price.lte = query.maxPrice;

    return {
      ...(query.shopId ? { shopId: query.shopId } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.subcategoryId ? { subcategoryId: query.subcategoryId } : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
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

  private resolveShopId(shopIdFromDto: string | undefined, actor: AuthUser): string {
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
   * Validates the category/subcategory pair and derives the category from the
   * subcategory when only the latter is supplied.
   */
  private async resolveTaxonomy(
    categoryId?: string,
    subcategoryId?: string,
  ): Promise<{ categoryId?: string; subcategoryId?: string }> {
    if (categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: categoryId },
        select: { id: true },
      });
      if (!category) throw new BadRequestException('Category does not exist');
    }

    if (subcategoryId) {
      const subcategory = await this.prisma.subcategory.findUnique({
        where: { id: subcategoryId },
        select: { categoryId: true },
      });
      if (!subcategory) {
        throw new BadRequestException('Subcategory does not exist');
      }
      if (categoryId && subcategory.categoryId !== categoryId) {
        throw new BadRequestException(
          'Subcategory does not belong to the given category',
        );
      }
      // Keep category consistent with the chosen subcategory.
      return { categoryId: categoryId ?? subcategory.categoryId, subcategoryId };
    }

    return { categoryId, subcategoryId };
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
