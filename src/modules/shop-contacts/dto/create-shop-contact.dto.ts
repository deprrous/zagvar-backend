import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateShopContactDto {
  @ApiProperty({
    example: 'phone',
    description: 'phone, email, whatsapp, etc.',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  type!: string;

  @ApiProperty({ example: '+976 9911 2233' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  value!: string;
}
