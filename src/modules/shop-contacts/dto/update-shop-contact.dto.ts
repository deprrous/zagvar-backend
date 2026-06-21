import { PartialType } from '@nestjs/swagger';
import { CreateShopContactDto } from './create-shop-contact.dto';

export class UpdateShopContactDto extends PartialType(CreateShopContactDto) {}
