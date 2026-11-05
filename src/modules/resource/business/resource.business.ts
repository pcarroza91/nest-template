import { Injectable, Scope } from '@nestjs/common';
import { BusinessRuleViolationException } from 'src/common/exceptions/domain-exceptions';
import { UpdateResourceDto } from '../dto/update-resource.dto';
import { ResourceCalculationDto, ResourceResponseDto } from '../dto/resource-response.dto';
import { Resource, ResourceStatus } from '../entities/resource.entity';
import { ResourceMapper } from '../mappers/resource.mapper';

const RULES = {
  DRAFT_PENALTY_RATE: 0.05,
  VOLUME_DISCOUNT_THRESHOLD: 1_000_000,
  VOLUME_DISCOUNT_RATE: 0.02,
  MIN_ALLOWED_AMOUNT: 0,
} as const;

@Injectable({ scope: Scope.TRANSIENT })
export class ResourceBusiness {
  private resource!: Resource;
  private baseAmount = 0;
  private adjustments = 0;
  private appliedRules: string[] = [];

  constructor(private readonly mapper: ResourceMapper) {}

  init(resource: Resource): this {
    this.resource = resource;
    this.baseAmount = Number(resource.amount);
    this.adjustments = 0;
    this.appliedRules = [];

    return this;
  }

  validateEligibility(): this {
    if (this.resource.status === ResourceStatus.Closed) {
      throw new BusinessRuleViolationException(
        `El recurso '${this.resource.code}' está cerrado y no admite operaciones`,
        { resourceId: this.resource.id, status: this.resource.status },
      );
    }

    if (this.resource.status === ResourceStatus.Suspended) {
      throw new BusinessRuleViolationException(
        `El recurso '${this.resource.code}' está suspendido`,
        { resourceId: this.resource.id, status: this.resource.status },
      );
    }

    return this;
  }

  applyDraftPenalty(): this {
    if (this.resource.status !== ResourceStatus.Draft) {
      return this;
    }

    const penalty = -(this.baseAmount * RULES.DRAFT_PENALTY_RATE);
    this.adjustments += penalty;
    this.appliedRules.push(
      `DRAFT_PENALTY(${RULES.DRAFT_PENALTY_RATE * 100}%) = ${penalty.toFixed(2)}`,
    );

    return this;
  }

  applyVolumeDiscount(): this {
    if (this.baseAmount < RULES.VOLUME_DISCOUNT_THRESHOLD) {
      return this;
    }

    const discount = -(this.baseAmount * RULES.VOLUME_DISCOUNT_RATE);
    this.adjustments += discount;
    this.appliedRules.push(
      `VOLUME_DISCOUNT(${RULES.VOLUME_DISCOUNT_RATE * 100}%) = ${discount.toFixed(2)}`,
    );

    return this;
  }

  enforceMinimumAmount(): this {
    const total = this.baseAmount + this.adjustments;

    if (total < RULES.MIN_ALLOWED_AMOUNT) {
      const correction = RULES.MIN_ALLOWED_AMOUNT - total;
      this.adjustments += correction;
      this.appliedRules.push(`MIN_AMOUNT_FLOOR = +${correction.toFixed(2)}`);
    }

    return this;
  }

  round(decimals = 2): this {
    const factor = 10 ** decimals;
    this.adjustments = Math.round(this.adjustments * factor) / factor;

    return this;
  }

  applyChanges(dto: UpdateResourceDto): this {
    if (dto.name !== undefined) {
      this.resource.name = dto.name.trim();
    }

    if (dto.description !== undefined) {
      this.resource.description = dto.description?.trim() ?? null;
    }

    if (dto.amount !== undefined) {
      if (dto.amount < RULES.MIN_ALLOWED_AMOUNT) {
        throw new BusinessRuleViolationException('El monto no puede ser negativo', {
          amount: dto.amount,
        });
      }
      this.resource.amount = dto.amount;
      this.baseAmount = dto.amount;
    }

    if (dto.status !== undefined) {
      this.transitionTo(dto.status);
    }

    return this;
  }

  transitionTo(next: ResourceStatus): this {
    const allowed: Record<ResourceStatus, ResourceStatus[]> = {
      [ResourceStatus.Draft]: [ResourceStatus.Active, ResourceStatus.Closed],
      [ResourceStatus.Active]: [ResourceStatus.Suspended, ResourceStatus.Closed],
      [ResourceStatus.Suspended]: [ResourceStatus.Active, ResourceStatus.Closed],
      [ResourceStatus.Closed]: [],
    };

    const current = this.resource.status;

    if (current !== next && !allowed[current].includes(next)) {
      throw new BusinessRuleViolationException(
        `Transición de estado inválida: ${current} -> ${next}`,
        { resourceId: this.resource.id, from: current, to: next },
      );
    }

    this.resource.status = next;

    return this;
  }

  getEntity(): Resource {
    return this.resource;
  }

  getResult(): ResourceResponseDto {
    return this.mapper.toResponseDto(this.resource);
  }

  getCalculationResult(): ResourceCalculationDto {
    return this.mapper.toCalculationDto(
      this.resource,
      this.baseAmount,
      this.adjustments,
      this.appliedRules,
    );
  }
}
