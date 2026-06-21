import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUrl, Min } from 'class-validator';

export class CreateProductImageDto {
  @ApiProperty({ example: 'https://cdn.example.com/img/headphones.jpg' })
  @IsUrl()
  url!: string;

  @ApiPropertyOptional({ default: 0, description: 'Display order' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  position?: number;
}
