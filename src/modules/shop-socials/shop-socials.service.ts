import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateShopSocialDto } from './dto/create-shop-social.dto';
import { UpdateShopSocialDto } from './dto/update-shop-social.dto';

@Injectable()
export class ShopSocialsService {
  constructor(private readonly prisma: PrismaService) {}

  create(shopId: string, dto: CreateShopSocialDto) {
    return this.prisma.shopSocial.create({
      data: { shopId, platform: dto.platform, url: dto.url },
    });
  }

  findAllForShop(shopId: string) {
    return this.prisma.shopSocial.findMany({
      where: { shopId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async update(shopId: string, id: string, dto: UpdateShopSocialDto) {
    await this.ensureBelongsToShop(shopId, id);
    return this.prisma.shopSocial.update({
      where: { id },
      data: { platform: dto.platform, url: dto.url },
    });
  }

  async remove(shopId: string, id: string) {
    await this.ensureBelongsToShop(shopId, id);
    await this.prisma.shopSocial.delete({ where: { id } });
    return { id, deleted: true };
  }

  private async ensureBelongsToShop(shopId: string, id: string) {
    const social = await this.prisma.shopSocial.findUnique({
      where: { id },
      select: { shopId: true },
    });
    if (!social || social.shopId !== shopId) {
      throw new NotFoundException('Social link not found for this shop');
    }
  }
}
