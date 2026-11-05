import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ResourceStatus } from '../entities/resource.entity';

export class ResourceResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'RES-001' })
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty({ example: 1500000 })
  amount!: number;

  @ApiProperty({ enum: ResourceStatus })
  status!: ResourceStatus;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}

export class ResourceCalculationDto {
  @ApiProperty()
  resource!: ResourceResponseDto;

  @ApiProperty({ description: 'Monto base antes de ajustes', example: 1500000 })
  baseAmount!: number;

  @ApiProperty({ description: 'Ajustes aplicados por reglas de negocio', example: -75000 })
  adjustments!: number;

  @ApiProperty({ description: 'Monto final', example: 1425000 })
  total!: number;

  @ApiProperty({ description: 'Trazabilidad de las reglas aplicadas', type: [String] })
  appliedRules!: string[];
}
