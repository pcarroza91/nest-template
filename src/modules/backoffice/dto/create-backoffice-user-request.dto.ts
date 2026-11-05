import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateBackofficeUserRequest {
  @ApiProperty({ format: 'email' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  full_name?: string | null;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  role_id!: string;
}
