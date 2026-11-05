import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginatedResultDto } from 'src/common/dto/paginated-result.dto';
import {
  DuplicateEntityException,
  EntityNotFoundException,
} from 'src/common/exceptions/domain-exceptions';
import { Repository } from 'typeorm';
import { CreateResourceDto } from '../dto/create-resource.dto';
import { FindResourcesQueryDto } from '../dto/find-resources-query.dto';
import { Resource } from '../entities/resource.entity';

@Injectable()
export class ResourceRepository {
  private static readonly ENTITY_NAME = 'Resource';

  constructor(
    @InjectRepository(Resource)
    private readonly repository: Repository<Resource>,
  ) {}

  async findOneById(id: string): Promise<Resource> {
    const resource = await this.repository.findOne({ where: { id } });
    if (!resource) {
      throw new EntityNotFoundException(ResourceRepository.ENTITY_NAME, id);
    }
    return resource;
  }

  async findOneByCode(code: string): Promise<Resource> {
    const resource = await this.repository.findOne({ where: { code } });
    if (!resource) {
      throw new EntityNotFoundException(ResourceRepository.ENTITY_NAME, code);
    }
    return resource;
  }

  async findWithRelationsForCalculation(id: string): Promise<Resource> {
    const resource = await this.repository.findOne({
      where: { id },
      relations: {},
    });

    if (!resource) {
      throw new EntityNotFoundException(ResourceRepository.ENTITY_NAME, id);
    }

    return resource;
  }

  async findPaginated(query: FindResourcesQueryDto): Promise<PaginatedResultDto<Resource>> {
    const qb = this.repository.createQueryBuilder('resource');

    if (query.search) {
      qb.andWhere('(LOWER(resource.name) LIKE :search OR LOWER(resource.code) LIKE :search)', {
        search: `%${query.search.toLowerCase()}%`,
      });
    }

    if (query.status) {
      qb.andWhere('resource.status = :status', { status: query.status });
    }

    if (query.minAmount !== undefined) {
      qb.andWhere('resource.amount >= :minAmount', { minAmount: query.minAmount });
    }

    const [items, totalItems] = await qb
      .orderBy(`resource.${query.sortBy}`, query.sortOrder)
      .skip(query.skip)
      .take(query.limit)
      .getManyAndCount();

    return new PaginatedResultDto(items, totalItems, query.page, query.limit);
  }

  async create(dto: CreateResourceDto): Promise<Resource> {
    await this.ensureCodeIsAvailable(dto.code);
    const resource = this.repository.create(dto);
    return this.repository.save(resource);
  }

  async save(resource: Resource): Promise<Resource> {
    return this.repository.save(resource);
  }

  async softRemove(id: string): Promise<void> {
    const resource = await this.findOneById(id);
    await this.repository.softRemove(resource);
  }

  private async ensureCodeIsAvailable(code: string): Promise<void> {
    const exists = await this.repository.exists({ where: { code } });
    if (exists) {
      throw new DuplicateEntityException(ResourceRepository.ENTITY_NAME, 'code', code);
    }
  }
}
