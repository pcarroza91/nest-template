import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';

export class InternalAuthorizeResource {
  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  school_id?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  organization_id?: string | null;
}

export class InternalAuthorizeRequest {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  user_id!: string;

  @ApiProperty({ example: 'financing.calculate' })
  @IsString()
  permission_code!: string;

  @ApiPropertyOptional({ type: InternalAuthorizeResource, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => InternalAuthorizeResource)
  resource?: InternalAuthorizeResource | null;
}
