import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { paginate, resolveSortColumn } from '../../common/dto/paginated';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { CloudflareService } from '../file/cf.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';

const SORTABLE = ['title', 'position', 'createdAt'] as const;

@Injectable()
export class BannersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudflare: CloudflareService,
  ) {}

  create(dto: CreateBannerDto) {
    return this.prisma.banner.create({
      data: {
        title: dto.title,
        imageUrl: this.cloudflare.toStorageKey(dto.imageUrl),
        linkUrl: dto.linkUrl,
        isActive: dto.isActive,
        position: dto.position,
      },
    });
  }

  async findAll(query: PaginationQueryDto) {
    const where: Prisma.BannerWhereInput = query.search
      ? { title: { contains: query.search, mode: 'insensitive' } }
      : {};

    const orderBy = {
      [resolveSortColumn(query.sortBy, SORTABLE, 'position')]: query.sortOrder,
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.banner.findMany({
        where,
        orderBy,
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.banner.count({ where }),
    ]);

    return paginate(items, total, query.page, query.limit);
  }

  async findOne(id: string) {
    const banner = await this.prisma.banner.findUnique({ where: { id } });
    if (!banner) throw new NotFoundException('Banner not found');
    return banner;
  }

  async update(id: string, dto: UpdateBannerDto) {
    await this.ensureExists(id);
    const data: Prisma.BannerUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.imageUrl !== undefined)
      data.imageUrl = this.cloudflare.toStorageKey(dto.imageUrl);
    if (dto.linkUrl !== undefined) data.linkUrl = dto.linkUrl;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.position !== undefined) data.position = dto.position;
    return this.prisma.banner.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.banner.delete({ where: { id } });
    return { id, deleted: true };
  }

  private async ensureExists(id: string) {
    const exists = await this.prisma.banner.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Banner not found');
  }
}
