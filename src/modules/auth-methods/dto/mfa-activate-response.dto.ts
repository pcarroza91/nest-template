import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MfaActivateResponse {
  @ApiProperty({ format: 'uuid' })
  mfa_method_id!: string;

  @ApiPropertyOptional({ nullable: true, description: 'Solo si type=TOTP' })
  secret?: string | null;

  @ApiPropertyOptional({ nullable: true })
  qr_code_url?: string | null;
}
