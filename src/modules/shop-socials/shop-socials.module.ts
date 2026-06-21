import { Module } from '@nestjs/common';
import { ShopSocialsController } from './shop-socials.controller';
import { ShopSocialsService } from './shop-socials.service';

@Module({
  controllers: [ShopSocialsController],
  providers: [ShopSocialsService],
})
export class ShopSocialsModule {}
