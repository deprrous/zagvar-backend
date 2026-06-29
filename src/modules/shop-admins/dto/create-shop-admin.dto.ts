import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
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

  @ApiProperty({ example: 'acme-owner', description: 'Login username' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  username!: string;

  @ApiProperty({ example: 'StrongPass123!', minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(72) // bcrypt max input length
  password!: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
