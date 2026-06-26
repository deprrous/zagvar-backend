import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { paginate } from '../../common/dto/paginated';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { PrismaService } from '../../prisma/prisma.service';

/** Read-only discovery over active shops, products and the global taxonomy. */
@Injectable()
export class PublicService {
  constructor(private readonly prisma: PrismaService) {}

  async listShops(query: PaginationQueryDto) {
    const where: Prisma.ShopWhereInput = {
      isActive: true,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
              { address: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.shop.findMany({
        where,
        orderBy: { [query.sortBy === 'name' ? 'name' : 'createdAt']: query.sortOrder },
        skip: query.skip,
        take: query.limit,
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          address: true,
          latitude: true,
          longitude: true,
          logoUrl: true,
          coverUrl: true,
          createdAt: true,
          _count: { select: { products: { where: { isActive: true } } } },
        },
      }),
      this.prisma.shop.count({ where }),
    ]);

    return paginate(items, total, query.page, query.limit);
  }

  async getShopBySlug(slug: string) {
    const shop = await this.prisma.shop.findFirst({
      where: { slug, isActive: true },
      include: {
        contacts: true,
        socials: true,
        products: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          take: 24,
          include: { images: { orderBy: { position: 'asc' }, take: 1 } },
        },
      },
    });
    if (!shop) throw new NotFoundException('Shop not found');
    return shop;
  }

  async listCategories() {
    return this.prisma.category.findMany({
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
      include: {
        subcategories: { orderBy: { name: 'asc' } },
        _count: { select: { products: { where: { isActive: true } } } },
      },
    });
  }

  listBanners() {
    return this.prisma.banner.findMany({
      where: { isActive: true },
      orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        title: true,
        imageUrl: true,
        linkUrl: true,
        position: true,
      },
    });
  }

  async getCategoryBySlug(slug: string) {
    const category = await this.prisma.category.findUnique({
      where: { slug },
      include: { subcategories: { orderBy: { name: 'asc' } } },
    });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }
}
