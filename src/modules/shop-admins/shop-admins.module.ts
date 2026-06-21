import { Module } from '@nestjs/common';
import { ShopAdminsController } from './shop-admins.controller';
import { ShopAdminsService } from './shop-admins.service';

@Module({
  controllers: [ShopAdminsController],
  providers: [ShopAdminsService],
})
export class ShopAdminsModule {}
