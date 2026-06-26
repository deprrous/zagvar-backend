import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Electronics' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({
    example: 'Electronics',
    description: 'English display name. Shown when the storefront is in English.',
    nullable: true,
  })
  @IsString()
  @MaxLength(120)
  @IsOptional()
  engName?: string | null;

  @ApiPropertyOptional({
    example: 'electronics',
    description: 'URL-safe slug. Auto-generated from name when omitted.',
  })
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must be lowercase alphanumeric words separated by hyphens',
  })
  @IsOptional()
  slug?: string;

  @ApiPropertyOptional({
    default: 0,
    description: 'Display order; lower values are shown first.',
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  position?: number;
}
