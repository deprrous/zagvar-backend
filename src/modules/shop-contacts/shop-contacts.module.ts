import { Module } from '@nestjs/common';
import { ShopContactsController } from './shop-contacts.controller';
import { ShopContactsService } from './shop-contacts.service';

@Module({
  controllers: [ShopContactsController],
  providers: [ShopContactsService],
})
export class ShopContactsModule {}
