import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';

export class CreateBackofficeClientAccessRequest {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  role_assignment_id!: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  organization_ids!: string[];
}
