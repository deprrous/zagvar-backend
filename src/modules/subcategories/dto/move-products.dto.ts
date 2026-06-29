import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

/**
 * Moves every product linked to one subcategory over to another: the source
 * subcategory is disconnected and the target connected on each affected
 * product.
 */
export class MoveSubcategoryProductsDto {
  @ApiProperty({
    format: 'uuid',
    description:
      'Subcategory to move products out of (removed from each product).',
  })
  @IsUUID()
  fromSubcategoryId!: string;

  @ApiProperty({
    format: 'uuid',
    description: 'Subcategory to move products into (added to each product).',
  })
  @IsUUID()
  toSubcategoryId!: string;
}
