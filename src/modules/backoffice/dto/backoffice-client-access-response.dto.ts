import { ApiProperty } from '@nestjs/swagger';

export class BackofficeClientAccessResponse {
  @ApiProperty({ format: 'uuid' })
  role_assignment_id!: string;

  @ApiProperty({ type: [String] })
  organization_ids!: string[];
}
