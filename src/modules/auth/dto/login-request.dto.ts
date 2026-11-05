import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, IsUUID } from 'class-validator';

export class LoginRequest {
  @ApiProperty({ format: 'email' })
  @IsEmail()
  email!: string;

  @ApiProperty({ format: 'password' })
  @IsString()
  password!: string;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description: 'Requerido si el email existe en más de una organización.',
  })
  @IsOptional()
  @IsUUID()
  organization_id?: string | null;
}
