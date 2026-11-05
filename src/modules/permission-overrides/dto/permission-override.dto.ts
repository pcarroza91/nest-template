import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PermissionOverrideStatus {
  Activo = 'ACTIVO',
  Revocado = 'REVOCADO',
}

export class PermissionOverride {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  user_id!: string;

  @ApiProperty({ format: 'uuid' })
  permission_id!: string;

  @ApiProperty({ enum: PermissionOverrideStatus })
  status!: PermissionOverrideStatus;

  @ApiPropertyOptional({ format: 'date', nullable: true })
  vigencia_desde?: string | null;

  @ApiPropertyOptional({ format: 'date', nullable: true })
  vigencia_hasta?: string | null;
}
