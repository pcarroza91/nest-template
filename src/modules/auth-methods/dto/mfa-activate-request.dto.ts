import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export enum MfaType {
  Totp = 'TOTP',
  Sms = 'SMS',
}

export class MfaActivateRequest {
  @ApiProperty({ enum: MfaType })
  @IsEnum(MfaType)
  type!: MfaType;
}
