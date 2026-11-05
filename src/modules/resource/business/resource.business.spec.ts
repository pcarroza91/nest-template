import { Test } from '@nestjs/testing';
import { BusinessRuleViolationException } from 'src/common/exceptions/domain-exceptions';
import { Resource, ResourceStatus } from '../entities/resource.entity';
import { ResourceMapper } from '../mappers/resource.mapper';
import { ResourceBusiness } from './resource.business';

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

describe('ResourceBusiness', () => {
  let business: ResourceBusiness;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [ResourceBusiness, ResourceMapper],
    }).compile();

    business = await moduleRef.resolve(ResourceBusiness);
  });

  describe('validateEligibility', () => {
    it('deja pasar un recurso activo', () => {
      expect(() => business.init(buildResource()).validateEligibility()).not.toThrow();
    });

    it.each([ResourceStatus.Closed, ResourceStatus.Suspended])(
      'rechaza un recurso en estado %s',
      (status) => {
        expect(() => business.init(buildResource({ status })).validateEligibility()).toThrow(
          BusinessRuleViolationException,
        );
      },
    );
  });

  describe('cadena de cálculo', () => {
    it('aplica descuento por volumen sobre montos que superan el umbral', () => {
      const result = business
        .init(buildResource({ amount: 1_000_000 }))
        .applyVolumeDiscount()
        .round()
        .getCalculationResult();

      expect(result.baseAmount).toBe(1_000_000);
      expect(result.adjustments).toBe(-20_000);
      expect(result.total).toBe(980_000);
      expect(result.appliedRules).toHaveLength(1);
    });

    it('no aplica descuento por volumen bajo el umbral', () => {
      const result = business
        .init(buildResource({ amount: 500_000 }))
        .applyVolumeDiscount()
        .getCalculationResult();

      expect(result.adjustments).toBe(0);
      expect(result.appliedRules).toEqual([]);
    });

    it('acumula penalización de borrador y descuento por volumen', () => {
      const result = business
        .init(buildResource({ amount: 2_000_000, status: ResourceStatus.Draft }))
        .applyDraftPenalty()
        .applyVolumeDiscount()
        .round()
        .getCalculationResult();

      expect(result.adjustments).toBe(-140_000);
      expect(result.total).toBe(1_860_000);
      expect(result.appliedRules).toHaveLength(2);
    });

    it('nunca deja el total bajo el mínimo permitido', () => {
      const result = business
        .init(buildResource({ amount: 0, status: ResourceStatus.Draft }))
        .applyDraftPenalty()
        .enforceMinimumAmount()
        .round()
        .getCalculationResult();

      expect(result.total).toBeGreaterThanOrEqual(0);
    });

    it('init() resetea el estado acumulado entre ejecuciones', () => {
      business.init(buildResource({ amount: 2_000_000 })).applyVolumeDiscount();

      const second = business
        .init(buildResource({ amount: 500_000 }))
        .applyVolumeDiscount()
        .getCalculationResult();

      expect(second.adjustments).toBe(0);
      expect(second.appliedRules).toEqual([]);
    });
  });

  describe('transitionTo', () => {
    it('permite ACTIVE -> SUSPENDED', () => {
      const entity = business
        .init(buildResource({ status: ResourceStatus.Active }))
        .transitionTo(ResourceStatus.Suspended)
        .getEntity();

      expect(entity.status).toBe(ResourceStatus.Suspended);
    });

    it('rechaza cualquier transición desde CLOSED', () => {
      expect(() =>
        business
          .init(buildResource({ status: ResourceStatus.Closed }))
          .transitionTo(ResourceStatus.Active),
      ).toThrow(BusinessRuleViolationException);
    });

    it('rechaza DRAFT -> SUSPENDED', () => {
      expect(() =>
        business
          .init(buildResource({ status: ResourceStatus.Draft }))
          .transitionTo(ResourceStatus.Suspended),
      ).toThrow(BusinessRuleViolationException);
    });
  });

  describe('applyChanges', () => {
    it('normaliza y aplica los campos presentes', () => {
      const entity = business
        .init(buildResource())
        .applyChanges({ name: '  Nuevo nombre  ', amount: 250_000 })
        .getEntity();

      expect(entity.name).toBe('Nuevo nombre');
      expect(entity.amount).toBe(250_000);
    });

    it('ignora los campos ausentes', () => {
      const entity = business.init(buildResource()).applyChanges({}).getEntity();

      expect(entity.name).toBe('Recurso de prueba');
      expect(entity.amount).toBe(1_000_000);
    });

    it('rechaza montos negativos', () => {
      expect(() => business.init(buildResource()).applyChanges({ amount: -1 })).toThrow(
        BusinessRuleViolationException,
      );
    });
  });
});
