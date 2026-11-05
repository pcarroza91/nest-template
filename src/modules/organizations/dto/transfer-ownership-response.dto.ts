import { ApiProperty } from '@nestjs/swagger';

export class TransferOwnershipResponse {
  @ApiProperty({ format: 'uuid' })
  previous_owner_role_assignment_id!: string;

  @ApiProperty({ format: 'uuid' })
  new_owner_role_assignment_id!: string;
}
