import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Min,
  MaxLength,
} from 'class-validator';
import { ResourceStatus } from '../entities/resource.entity';

export class CreateResourceDto {
  @ApiProperty({ description: 'Código único del recurso', example: 'RES-001' })
  @IsString()
  @Length(3, 50)
  @Matches(/^[A-Za-z0-9-_]+$/, {
    message: 'code solo admite letras, números, guion y guion bajo',
  })
  code!: string;

  @ApiProperty({ description: 'Nombre del recurso', example: 'Subvención habitacional' })
  @IsString()
  @Length(3, 150)
  name!: string;

  @ApiPropertyOptional({ description: 'Descripción libre' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'Monto asociado', example: 1500000, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount?: number;

  @ApiPropertyOptional({ enum: ResourceStatus, default: ResourceStatus.Draft })
  @IsOptional()
  @IsEnum(ResourceStatus)
  status?: ResourceStatus;
}
