import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateShopAdminDto } from './create-shop-admin.dto';

/** Shop reassignment is not allowed; everything else is optionally updatable. */
export class UpdateShopAdminDto extends PartialType(
  OmitType(CreateShopAdminDto, ['shopId'] as const),
) {}
