import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateUserRequest {
  @ApiProperty({ format: 'email' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  full_name?: string | null;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  organization_id!: string;

  @ApiPropertyOptional({
    format: 'password',
    nullable: true,
    description: 'Opcional si el alta se completa por invitación por correo.',
  })
  @IsOptional()
  @IsString()
  password?: string | null;
}
