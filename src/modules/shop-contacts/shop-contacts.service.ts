import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateShopContactDto } from './dto/create-shop-contact.dto';
import { UpdateShopContactDto } from './dto/update-shop-contact.dto';

@Injectable()
export class ShopContactsService {
  constructor(private readonly prisma: PrismaService) {}

  create(shopId: string, dto: CreateShopContactDto) {
    return this.prisma.shopContact.create({
      data: { shopId, type: dto.type, value: dto.value },
    });
  }

  findAllForShop(shopId: string) {
    return this.prisma.shopContact.findMany({
      where: { shopId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async update(shopId: string, id: string, dto: UpdateShopContactDto) {
    await this.ensureBelongsToShop(shopId, id);
    return this.prisma.shopContact.update({
      where: { id },
      data: { type: dto.type, value: dto.value },
    });
  }

  async remove(shopId: string, id: string) {
    await this.ensureBelongsToShop(shopId, id);
    await this.prisma.shopContact.delete({ where: { id } });
    return { id, deleted: true };
  }

  /** Guards against mixing a contact id from a different shop. */
  private async ensureBelongsToShop(shopId: string, id: string) {
    const contact = await this.prisma.shopContact.findUnique({
      where: { id },
      select: { shopId: true },
    });
    if (!contact || contact.shopId !== shopId) {
      throw new NotFoundException('Contact not found for this shop');
    }
  }
}
