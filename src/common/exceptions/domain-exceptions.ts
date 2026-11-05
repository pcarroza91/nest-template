export abstract class DomainException extends Error {
  readonly code: string;
  readonly details?: Record<string, unknown>;

  protected constructor(message: string, code: string, details?: Record<string, unknown>) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.details = details;
    Error.captureStackTrace?.(this, new.target);
  }
}

export class EntityNotFoundException extends DomainException {
  constructor(entity: string, identifier: unknown) {
    super(`${entity} con identificador '${String(identifier)}' no existe`, 'ENTITY_NOT_FOUND', {
      entity,
      identifier,
    });
  }
}

export class DuplicateEntityException extends DomainException {
  constructor(entity: string, field: string, value: unknown) {
    super(`Ya existe un ${entity} con ${field} '${String(value)}'`, 'DUPLICATE_ENTITY', {
      entity,
      field,
      value,
    });
  }
}

export class BusinessRuleViolationException extends DomainException {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'BUSINESS_RULE_VIOLATION', details);
  }
}

export class InvalidOperationException extends DomainException {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'INVALID_OPERATION', details);
  }
}

export class ForbiddenOperationException extends DomainException {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'FORBIDDEN_OPERATION', details);
  }
}

export class ExternalServiceException extends DomainException {
  constructor(service: string, message: string, details?: Record<string, unknown>) {
    super(`Error al comunicarse con ${service}: ${message}`, 'EXTERNAL_SERVICE_ERROR', {
      service,
      ...details,
    });
  }
}
