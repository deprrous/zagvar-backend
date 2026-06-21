import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';

/** A product cannot be moved to a different shop after creation. */
export class UpdateProductDto extends PartialType(
  OmitType(CreateProductDto, ['shopId'] as const),
) {}
