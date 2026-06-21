import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { paginate, resolveSortColumn } from '../../common/dto/paginated';
import { slugify } from '../../common/utils/slug.util';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSubcategoryDto } from './dto/create-subcategory.dto';
import { QuerySubcategoryDto } from './dto/query-subcategory.dto';
import { UpdateSubcategoryDto } from './dto/update-subcategory.dto';

const SORTABLE = ['name', 'slug', 'createdAt'] as const;

@Injectable()
export class SubcategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSubcategoryDto) {
    await this.ensureCategoryExists(dto.categoryId);
    return this.prisma.subcategory.create({
      data: {
        categoryId: dto.categoryId,
        name: dto.name,
        slug: dto.slug ?? slugify(dto.name),
      },
    });
  }

  async findAll(query: QuerySubcategoryDto) {
    const where: Prisma.SubcategoryWhereInput = {
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.search
        ? { name: { contains: query.search, mode: 'insensitive' } }
        : {}),
    };

    const orderBy = {
      [resolveSortColumn(query.sortBy, SORTABLE, 'createdAt')]: query.sortOrder,
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.subcategory.findMany({
        where,
        orderBy,
        skip: query.skip,
        take: query.limit,
        include: { category: { select: { id: true, name: true, slug: true } } },
      }),
      this.prisma.subcategory.count({ where }),
    ]);

    return paginate(items, total, query.page, query.limit);
  }

  async findOne(id: string) {
    const subcategory = await this.prisma.subcategory.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!subcategory) throw new NotFoundException('Subcategory not found');
    return subcategory;
  }

  async update(id: string, dto: UpdateSubcategoryDto) {
    await this.ensureExists(id);
    if (dto.categoryId) await this.ensureCategoryExists(dto.categoryId);

    const data: Prisma.SubcategoryUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.categoryId !== undefined) {
      data.category = { connect: { id: dto.categoryId } };
    }
    return this.prisma.subcategory.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.subcategory.delete({ where: { id } });
    return { id, deleted: true };
  }

  private async ensureExists(id: string) {
    const exists = await this.prisma.subcategory.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Subcategory not found');
  }

  private async ensureCategoryExists(categoryId: string) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });
    if (!category) throw new BadRequestException('Category does not exist');
  }
}
