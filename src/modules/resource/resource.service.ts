import { Injectable } from '@nestjs/common';
import { PaginatedResultDto } from 'src/common/dto/paginated-result.dto';
import { ResourceBusiness } from './business/resource.business';
import { CreateResourceDto } from './dto/create-resource.dto';
import { FindResourcesQueryDto } from './dto/find-resources-query.dto';
import { ResourceCalculationDto, ResourceResponseDto } from './dto/resource-response.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
import { ResourceMapper } from './mappers/resource.mapper';
import { ResourceRepository } from './repositories/resource.repository';

@Injectable()
export class ResourceService {
  constructor(
    private readonly repository: ResourceRepository,
    private readonly business: ResourceBusiness,
    private readonly mapper: ResourceMapper,
  ) {}

  async create(dto: CreateResourceDto): Promise<ResourceResponseDto> {
    const resource = await this.repository.create(dto);
    return this.mapper.toResponseDto(resource);
  }

  async findAll(query: FindResourcesQueryDto): Promise<PaginatedResultDto<ResourceResponseDto>> {
    const page = await this.repository.findPaginated(query);
    return page.map((resource) => this.mapper.toResponseDto(resource));
  }

  async findOne(id: string): Promise<ResourceResponseDto> {
    const resource = await this.repository.findOneById(id);
    return this.mapper.toResponseDto(resource);
  }

  async update(id: string, dto: UpdateResourceDto): Promise<ResourceResponseDto> {
    const resource = await this.repository.findOneById(id);
    const updated = this.business
      .init(resource)
      .validateEligibility()
      .applyChanges(dto)
      .getEntity();
    const saved = await this.repository.save(updated);
    return this.mapper.toResponseDto(saved);
  }

  async remove(id: string): Promise<void> {
    await this.repository.softRemove(id);
  }

  async calculate(id: string): Promise<ResourceCalculationDto> {
    const resource = await this.repository.findWithRelationsForCalculation(id);
    return this.business
      .init(resource)
      .validateEligibility()
      .applyDraftPenalty()
      .applyVolumeDiscount()
      .enforceMinimumAmount()
      .round()
      .getCalculationResult();
  }
}
