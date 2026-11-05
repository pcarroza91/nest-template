import { Test } from '@nestjs/testing';
import { PaginatedResultDto } from 'src/common/dto/paginated-result.dto';
import { EntityNotFoundException } from 'src/common/exceptions/domain-exceptions';
import { ResourceBusiness } from './business/resource.business';
import { FindResourcesQueryDto } from './dto/find-resources-query.dto';
import { Resource, ResourceStatus } from './entities/resource.entity';
import { ResourceMapper } from './mappers/resource.mapper';
import { ResourceRepository } from './repositories/resource.repository';
import { ResourceService } from './resource.service';

const buildResource = (overrides: Partial<Resource> = {}): Resource => ({
  id: '3f1a2b4c-0000-4000-8000-000000000001',
  code: 'RES-001',
  name: 'Recurso de prueba',
  description: null,
  amount: 1_000_000,
  status: ResourceStatus.Active,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  deletedAt: null,
  ...overrides,
});

describe('ResourceService', () => {
  let service: ResourceService;
  let repository: jest.Mocked<ResourceRepository>;

  beforeEach(async () => {
    const repositoryMock: Partial<jest.Mocked<ResourceRepository>> = {
      create: jest.fn(),
      findPaginated: jest.fn(),
      findOneById: jest.fn(),
      findWithRelationsForCalculation: jest.fn(),
      save: jest.fn(),
      softRemove: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ResourceService,
        ResourceBusiness,
        ResourceMapper,
        { provide: ResourceRepository, useValue: repositoryMock },
      ],
    }).compile();

    service = moduleRef.get(ResourceService);
    repository = moduleRef.get(ResourceRepository);
  });

  it('findOne devuelve el DTO de salida, sin exponer la entidad', async () => {
    repository.findOneById.mockResolvedValue(buildResource());

    const result = await service.findOne('3f1a2b4c-0000-4000-8000-000000000001');

    expect(result).toMatchObject({ code: 'RES-001', amount: 1_000_000 });
    expect(result).not.toHaveProperty('deletedAt');
  });

  it('propaga la excepción de dominio del repository sin envolverla', async () => {
    repository.findOneById.mockRejectedValue(new EntityNotFoundException('Resource', 'x'));

    await expect(service.findOne('x')).rejects.toBeInstanceOf(EntityNotFoundException);
  });

  it('findAll conserva la metadata de paginación al mapear a DTOs', async () => {
    const query = Object.assign(new FindResourcesQueryDto(), { page: 2, limit: 10 });
    repository.findPaginated.mockResolvedValue(
      new PaginatedResultDto([buildResource()], 47, 2, 10),
    );

    const result = await service.findAll(query);

    expect(result).toBeInstanceOf(PaginatedResultDto);
    expect(result.meta).toMatchObject({
      page: 2,
      limit: 10,
      totalItems: 47,
      totalPages: 5,
      hasNextPage: true,
      hasPreviousPage: true,
    });
    expect(result.items[0].code).toBe('RES-001');
  });

  it('calculate delega la cadena de reglas en el business', async () => {
    repository.findWithRelationsForCalculation.mockResolvedValue(
      buildResource({ amount: 2_000_000, status: ResourceStatus.Draft }),
    );

    const result = await service.calculate('3f1a2b4c-0000-4000-8000-000000000001');

    expect(result.baseAmount).toBe(2_000_000);
    expect(result.total).toBe(1_860_000);
    expect(result.appliedRules).toHaveLength(2);
  });

  it('update persiste la entidad ya modificada por el business', async () => {
    repository.findOneById.mockResolvedValue(buildResource());
    repository.save.mockImplementation((resource) => Promise.resolve(resource));

    const result = await service.update('3f1a2b4c-0000-4000-8000-000000000001', {
      name: 'Actualizado',
    });

    expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({ name: 'Actualizado' }));
    expect(result.name).toBe('Actualizado');
  });
});
