import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional, IsUUID } from 'class-validator';

export class CreateRoleAssignmentRequest {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  user_id!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  role_id!: string;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Opcional — restringe la asignación a un solo dominio.',
  })
  @IsOptional()
  @IsInt()
  module_id?: number | null;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  school_ids?: string[];
}
