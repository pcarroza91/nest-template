import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class MfaVerifyRequest {
  @ApiProperty()
  @IsString()
  code!: string;
}
