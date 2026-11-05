import { ApiProperty } from '@nestjs/swagger';

export class SessionSummary {
  @ApiProperty({ nullable: true })
  device_info!: string | null;

  @ApiProperty({ format: 'date-time', nullable: true })
  last_used_at!: string | null;
}
