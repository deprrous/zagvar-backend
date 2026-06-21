import { PartialType } from '@nestjs/swagger';
import { CreateShopSocialDto } from './create-shop-social.dto';

export class UpdateShopSocialDto extends PartialType(CreateShopSocialDto) {}
