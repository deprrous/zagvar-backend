import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { paginate, resolveSortColumn } from '../../common/dto/paginated';
import { AuthUser, Role } from '../../common/types/auth.types';
import { slugify } from '../../common/utils/slug.util';
import { CloudflareService } from '../file/cf.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateShopDto } from './dto/create-shop.dto';
import { QueryShopDto } from './dto/query-shop.dto';
import { UpdateShopDto } from './dto/update-shop.dto';

const SORTABLE = ['name', 'createdAt'] as const;

/** Fields only a super admin may change on a shop. */
const SUPER_ADMIN_ONLY_FIELDS = ['slug', 'isActive'] as const;

@Injectable()
export class ShopsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudflare: CloudflareService,
  ) {}

  create(dto: CreateShopDto) {
    return this.prisma.shop.create({
      data: {
        name: dto.name,
        slug: dto.slug ?? slugify(dto.name),
        description: dto.description,
        address: dto.address,
        latitude: dto.latitude,
        longitude: dto.longitude,
        logoUrl: this.cloudflare.toStorageKey(dto.logoUrl),
        coverUrl: this.cloudflare.toStorageKey(dto.coverUrl),
        isActive: dto.isActive ?? true,
      },
    });
  }

  async findAll(query: QueryShopDto) {
    const where: Prisma.ShopWhereInput = {
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { address: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const orderBy = {
      [resolveSortColumn(query.sortBy, SORTABLE, 'createdAt')]: query.sortOrder,
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.shop.findMany({
        where,
        orderBy,
        skip: query.skip,
        take: query.limit,
        include: { _count: { select: { products: true, admins: true } } },
      }),
      this.prisma.shop.count({ where }),
    ]);

    return paginate(items, total, query.page, query.limit);
  }

  async findOne(id: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { id },
      include: { contacts: true, socials: true },
    });
    if (!shop) throw new NotFoundException('Shop not found');
    return shop;
  }

  async update(id: string, dto: UpdateShopDto, actor: AuthUser) {
    await this.ensureExists(id);

    if (actor.role === Role.ShopAdmin) {
      const forbidden = SUPER_ADMIN_ONLY_FIELDS.filter(
        (field) => dto[field] !== undefined,
      );
      if (forbidden.length > 0) {
        throw new ForbiddenException(
          `Shop admins cannot change: ${forbidden.join(', ')}`,
        );
      }
    }

    const data: Prisma.ShopUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.address !== undefined) data.address = dto.address;
    if (dto.latitude !== undefined) data.latitude = dto.latitude;
    if (dto.longitude !== undefined) data.longitude = dto.longitude;
    if (dto.logoUrl !== undefined)
      data.logoUrl = this.cloudflare.toStorageKey(dto.logoUrl);
    if (dto.coverUrl !== undefined)
      data.coverUrl = this.cloudflare.toStorageKey(dto.coverUrl);
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    return this.prisma.shop.update({ where: { id }, data });
  }

  async remove(id: string) {
    // Pull the shop's own images plus every product image up front; the DB
    // cascade (shop -> products -> product_images) wipes the rows, so we must
    // collect the R2 keys before deleting and purge the objects afterwards.
    const shop = await this.prisma.shop.findUnique({
      where: { id },
      select: {
        logoUrl: true,
        coverUrl: true,
        products: { select: { images: { select: { url: true } } } },
      },
    });
    if (!shop) throw new NotFoundException('Shop not found');

    await this.prisma.shop.delete({ where: { id } });

    await this.cloudflare.deleteKeys([
      shop.logoUrl,
      shop.coverUrl,
      ...shop.products.flatMap((p) => p.images.map((img) => img.url)),
    ]);
    return { id, deleted: true };
  }

  private async ensureExists(id: string) {
    const exists = await this.prisma.shop.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Shop not found');
  }
}
