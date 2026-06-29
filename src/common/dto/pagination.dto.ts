import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export enum SortOrder {
  Asc = 'asc',
  Desc = 'desc',
}

/** Common pagination, sorting and search query params for list endpoints. */
export class PaginationQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit = 20;

  @ApiPropertyOptional({ description: 'Column to sort by' })
  @IsString()
  @IsOptional()
  sortBy?: string;

  @ApiPropertyOptional({ enum: SortOrder, default: SortOrder.Desc })
  @IsEnum(SortOrder)
  @IsOptional()
  sortOrder: SortOrder = SortOrder.Desc;

  @ApiPropertyOptional({ description: 'Free-text search term' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsOptional()
  search?: string;

  get skip(): number {
    return (this.page - 1) * this.limit;
  }
}
