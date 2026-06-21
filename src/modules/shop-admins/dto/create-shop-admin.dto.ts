import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateShopAdminDto {
  @ApiProperty({ format: 'uuid', description: 'Shop this admin manages' })
  @IsUUID()
  shopId!: string;

  @ApiProperty({ example: 'owner@acme.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'StrongPass123!', minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(72) // bcrypt max input length
  password!: string;

  @ApiPropertyOptional({ example: 'Jane Owner' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
