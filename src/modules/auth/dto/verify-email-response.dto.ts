import { ApiProperty } from '@nestjs/swagger';

export class VerifyEmailResponse {
  @ApiProperty()
  ok!: boolean;

  @ApiProperty({ enum: ['ACTIVO'] })
  status!: 'ACTIVO';
}
