import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateBannerDto {
  @ApiPropertyOptional({ example: 'Summer sale' })
  @IsString()
  @MaxLength(200)
  @IsOptional()
  title?: string;

  @ApiProperty({ example: 'https://cdn.zagvar.com/banners/summer.jpg' })
  @IsUrl()
  @MaxLength(2048)
  imageUrl!: string;

  @ApiPropertyOptional({
    example: '/category/electronics',
    description: 'Where the banner links to when clicked (absolute or relative).',
  })
  @IsString()
  @MaxLength(2048)
  @IsOptional()
  linkUrl?: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    default: 0,
    description: 'Display order; lower values are shown first.',
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  position?: number;
}
