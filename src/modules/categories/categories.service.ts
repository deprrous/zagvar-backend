import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { paginate, resolveSortColumn } from '../../common/dto/paginated';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { slugify } from '../../common/utils/slug.util';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

const SORTABLE = ['name', 'slug', 'createdAt'] as const;

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: { name: dto.name, slug: dto.slug ?? slugify(dto.name) },
    });
  }

  async findAll(query: PaginationQueryDto) {
    const where: Prisma.CategoryWhereInput = query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { slug: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {};

    const orderBy = {
      [resolveSortColumn(query.sortBy, SORTABLE, 'createdAt')]: query.sortOrder,
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.category.findMany({
        where,
        orderBy,
        skip: query.skip,
        take: query.limit,
        include: { _count: { select: { subcategories: true, products: true } } },
      }),
      this.prisma.category.count({ where }),
    ]);

    return paginate(items, total, query.page, query.limit);
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { subcategories: true },
    });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.ensureExists(id);
    const data: Prisma.CategoryUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.slug !== undefined) data.slug = dto.slug;
    return this.prisma.category.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.category.delete({ where: { id } });
    return { id, deleted: true };
  }

  private async ensureExists(id: string) {
    const exists = await this.prisma.category.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Category not found');
  }
}
