import { Module } from '@nestjs/common';
import { ProductsModule } from '../products/products.module';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';

@Module({
  imports: [ProductsModule],
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}
