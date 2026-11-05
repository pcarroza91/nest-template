import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export enum AuthMethodStatusUpdate {
  Revocado = 'REVOCADO',
}

export class UpdateAuthMethodStatusRequest {
  @ApiProperty({ enum: AuthMethodStatusUpdate })
  @IsEnum(AuthMethodStatusUpdate)
  status!: AuthMethodStatusUpdate;
}
