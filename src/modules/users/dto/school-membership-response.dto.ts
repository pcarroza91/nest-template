import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum SchoolMembershipStatus {
  Activo = 'ACTIVO',
  Suspendido = 'SUSPENDIDO',
  Revocado = 'REVOCADO',
}

export class SchoolMembershipResponse {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  user_id!: string;

  @ApiProperty({ format: 'uuid' })
  school_id!: string;

  @ApiProperty({ enum: SchoolMembershipStatus })
  status!: SchoolMembershipStatus;

  @ApiPropertyOptional({ format: 'date', nullable: true })
  vigencia_desde?: string | null;

  @ApiPropertyOptional({ format: 'date', nullable: true })
  vigencia_hasta?: string | null;
}
