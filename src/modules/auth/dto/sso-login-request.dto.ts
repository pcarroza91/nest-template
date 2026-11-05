import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';

export enum SsoProvider {
  Google = 'GOOGLE',
  Microsoft = 'MICROSOFT',
}

export class SsoLoginRequest {
  @ApiProperty({ enum: SsoProvider })
  @IsEnum(SsoProvider)
  provider!: SsoProvider;

  @ApiProperty()
  @IsString()
  external_provider_id!: string;
}
