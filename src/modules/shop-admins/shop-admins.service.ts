import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { paginate, resolveSortColumn } from '../../common/dto/paginated';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateShopAdminDto } from './dto/create-shop-admin.dto';
import { UpdateShopAdminDto } from './dto/update-shop-admin.dto';

const BCRYPT_ROUNDS = 12;
const SORTABLE = ['username', 'createdAt'] as const;

/** Public projection — never leaks the password hash. */
const SAFE_SELECT = {
  id: true,
  shopId: true,
  username: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ShopAdminSelect;

@Injectable()
export class ShopAdminsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateShopAdminDto) {
    await this.ensureShopExists(dto.shopId);
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    return this.prisma.shopAdmin.create({
      data: {
        shopId: dto.shopId,
        username: dto.username,
        passwordHash,
        isActive: dto.isActive ?? true,
      },
      select: SAFE_SELECT,
    });
  }

  async findAll(query: PaginationQueryDto, shopId?: string) {
    const where: Prisma.ShopAdminWhereInput = {
      ...(shopId ? { shopId } : {}),
      ...(query.search
        ? {
            username: { contains: query.search, mode: 'insensitive' },
          }
        : {}),
    };

    const orderBy = {
      [resolveSortColumn(query.sortBy, SORTABLE, 'createdAt')]: query.sortOrder,
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.shopAdmin.findMany({
        where,
        orderBy,
        skip: query.skip,
        take: query.limit,
        select: SAFE_SELECT,
      }),
      this.prisma.shopAdmin.count({ where }),
    ]);

    return paginate(items, total, query.page, query.limit);
  }

  async findOne(id: string) {
    const admin = await this.prisma.shopAdmin.findUnique({
      where: { id },
      select: SAFE_SELECT,
    });
    if (!admin) throw new NotFoundException('Shop admin not found');
    return admin;
  }

  async update(id: string, dto: UpdateShopAdminDto) {
    await this.ensureExists(id);

    const data: Prisma.ShopAdminUpdateInput = {};
    if (dto.username !== undefined) data.username = dto.username;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.password !== undefined) {
      data.passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    }

    return this.prisma.shopAdmin.update({
      where: { id },
      data,
      select: SAFE_SELECT,
    });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.shopAdmin.delete({ where: { id } });
    return { id, deleted: true };
  }

  private async ensureExists(id: string) {
    const exists = await this.prisma.shopAdmin.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Shop admin not found');
  }

  private async ensureShopExists(shopId: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      select: { id: true },
    });
    if (!shop) throw new BadRequestException('Shop does not exist');
  }
}
