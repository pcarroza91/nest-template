import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AssignSchoolRequest {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  school_id!: string;
}
