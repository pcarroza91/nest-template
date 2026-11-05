import { ApiProperty } from '@nestjs/swagger';

export class Error {
  @ApiProperty()
  code!: string;

  @ApiProperty()
  message!: string;
}
