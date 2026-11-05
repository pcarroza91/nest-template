import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum RoleAssignmentStatus {
  Activo = 'ACTIVO',
  Suspendido = 'SUSPENDIDO',
  Revocado = 'REVOCADO',
}

export class RoleAssignment {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  user_id!: string;

  @ApiProperty({ format: 'uuid' })
  role_id!: string;

  @ApiProperty({ enum: RoleAssignmentStatus })
  status!: RoleAssignmentStatus;

  @ApiProperty()
  is_org_owner!: boolean;

  @ApiPropertyOptional({ nullable: true })
  module_id?: number | null;

  @ApiPropertyOptional({ format: 'date', nullable: true })
  vigencia_desde?: string | null;

  @ApiPropertyOptional({ format: 'date', nullable: true })
  vigencia_hasta?: string | null;
}
