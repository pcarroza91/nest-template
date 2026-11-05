import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class TransferOwnershipRequest {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  new_owner_role_assignment_id!: string;
}
