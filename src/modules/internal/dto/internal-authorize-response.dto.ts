import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InternalAuthorizeResponse {
  @ApiProperty()
  authorized!: boolean;

  @ApiPropertyOptional({ nullable: true })
  reason?: string | null;
}
