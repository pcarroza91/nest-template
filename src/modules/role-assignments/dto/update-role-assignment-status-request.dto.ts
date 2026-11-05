import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export enum RoleAssignmentStatusUpdate {
  Suspendido = 'SUSPENDIDO',
  Revocado = 'REVOCADO',
}

export class UpdateRoleAssignmentStatusRequest {
  @ApiProperty({ enum: RoleAssignmentStatusUpdate })
  @IsEnum(RoleAssignmentStatusUpdate)
  status!: RoleAssignmentStatusUpdate;
}
