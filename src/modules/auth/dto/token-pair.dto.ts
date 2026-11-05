import { ApiProperty } from '@nestjs/swagger';

export class TokenPair {
  @ApiProperty({ description: 'JWT de corta duración' })
  access_token!: string;

  @ApiProperty()
  refresh_token!: string;

  @ApiProperty()
  expires_in!: number;
}
