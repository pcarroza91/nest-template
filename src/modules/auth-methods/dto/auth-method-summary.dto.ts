import { ApiProperty } from '@nestjs/swagger';

export enum AuthMethodType {
  Password = 'PASSWORD',
  Google = 'GOOGLE',
  Microsoft = 'MICROSOFT',
}

export class AuthMethodSummary {
  @ApiProperty({ enum: AuthMethodType })
  type!: AuthMethodType;

  @ApiProperty({ format: 'date-time' })
  created_at!: string;
}
