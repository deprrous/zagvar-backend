import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUrl, MaxLength, MinLength } from 'class-validator';

export class CreateShopSocialDto {
  @ApiProperty({
    example: 'instagram',
    description: 'facebook, instagram, telegram, etc.',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  platform!: string;

  @ApiProperty({ example: 'https://instagram.com/acme' })
  @IsUrl()
  @MaxLength(500)
  url!: string;
}
