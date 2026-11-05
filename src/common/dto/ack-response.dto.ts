import { ApiProperty } from '@nestjs/swagger';

export class AckResponse {
  @ApiProperty()
  ok!: boolean;
}
