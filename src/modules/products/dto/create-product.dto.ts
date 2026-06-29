import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Owning shop. Required for super admins; ignored for shop admins (their own shop is used).',
  })
  @IsUUID()
  @IsOptional()
  shopId?: string;

  @ApiPropertyOptional({ example: 'Wireless Headphones' })
  @IsString()
  @MaxLength(200)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description:
      'Auto-generated from name when omitted. Unique within the shop.',
  })
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must be lowercase alphanumeric words separated by hyphens',
  })
  @IsOptional()
  slug?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 199.99, minimum: 0 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  price?: number;

  @ApiPropertyOptional({
    example: 149.99,
    minimum: 0,
    description: 'Discounted price. Shown struck-through against `price`.',
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  salePrice?: number;

  @ApiPropertyOptional({ example: 'MNT', default: 'MNT' })
  @IsString()
  @MaxLength(8)
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['S', 'M', 'L'],
    description: 'Available sizes for the product.',
  })
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  @IsOptional()
  size?: string[];

  @ApiPropertyOptional({
    type: [String],
    example: ['Red', 'Blue'],
    description: 'Available colors for the product.',
  })
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  @IsOptional()
  color?: string[];

  @ApiPropertyOptional({
    type: [String],
    format: 'uuid',
    description:
      'Categories this product belongs to. A product can be in many categories.',
  })
  @IsArray()
  @ArrayMaxSize(50)
  @IsUUID('all', { each: true })
  @IsOptional()
  categoryIds?: string[];

  @ApiPropertyOptional({
    type: [String],
    format: 'uuid',
    description:
      'Subcategories this product belongs to. Their parent categories are ' +
      'added automatically.',
  })
  @IsArray()
  @ArrayMaxSize(50)
  @IsUUID('all', { each: true })
  @IsOptional()
  subcategoryIds?: string[];

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
