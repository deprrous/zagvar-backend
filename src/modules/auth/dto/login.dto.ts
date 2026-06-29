import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'superadmin@zagvar.local',
    description: "A super admin's email or a shop admin's username",
  })
  @IsString()
  @IsNotEmpty()
  username!: string;

  @ApiProperty({ example: 'ChangeMe123!', minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;
}
