import { Injectable } from '@nestjs/common';
import { ResourceCalculationDto, ResourceResponseDto } from '../dto/resource-response.dto';
import { Resource } from '../entities/resource.entity';

@Injectable()
export class ResourceMapper {
  toResponseDto(resource: Resource): ResourceResponseDto {
    return {
      id: resource.id,
      code: resource.code,
      name: resource.name,
      description: resource.description,
      amount: Number(resource.amount),
      status: resource.status,
      createdAt: resource.createdAt,
      updatedAt: resource.updatedAt,
    };
  }

  toResponseDtoList(resources: Resource[]): ResourceResponseDto[] {
    return resources.map((resource) => this.toResponseDto(resource));
  }

  toCalculationDto(
    resource: Resource,
    baseAmount: number,
    adjustments: number,
    appliedRules: string[],
  ): ResourceCalculationDto {
    return {
      resource: this.toResponseDto(resource),
      baseAmount,
      adjustments,
      total: baseAmount + adjustments,
      appliedRules,
    };
  }
}
