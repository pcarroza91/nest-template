import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum UserStatus {
  Activo = 'ACTIVO',
  Suspendido = 'SUSPENDIDO',
  Revocado = 'REVOCADO',
  PendienteVerificacion = 'PENDIENTE_VERIFICACION',
}

export class User {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  full_name!: string;

  @ApiProperty({ format: 'email' })
  email!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  organization_id?: string | null;

  @ApiProperty({ enum: UserStatus })
  status!: UserStatus;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  email_verified_at?: string | null;

  @ApiProperty({ format: 'date-time' })
  created_at!: string;
}
