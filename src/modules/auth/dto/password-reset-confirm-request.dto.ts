import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class PasswordResetConfirmRequest {
  @ApiProperty()
  @IsString()
  token!: string;

  @ApiProperty({ format: 'password' })
  @IsString()
  new_password!: string;
}
