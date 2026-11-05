import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';
import { Environment } from '../../config/env.validation';
import { DomainException } from '../exceptions/domain-exceptions';
import { ApiResponse, ApiResponseError } from '../interfaces/api-response.interface';

const DOMAIN_EXCEPTION_STATUS: Record<string, HttpStatus> = {
  EntityNotFoundException: HttpStatus.NOT_FOUND,
  DuplicateEntityException: HttpStatus.CONFLICT,
  BusinessRuleViolationException: HttpStatus.UNPROCESSABLE_ENTITY,
  InvalidOperationException: HttpStatus.BAD_REQUEST,
  ForbiddenOperationException: HttpStatus.FORBIDDEN,
  ExternalServiceException: HttpStatus.BAD_GATEWAY,
};

const OPAQUE_SERVER_ERROR = 'Error al procesar la solicitud';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  private readonly exposeInternals = process.env.NODE_ENV !== Environment.Prod;

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    const { status, message, errors } = this.resolve(exception);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      const cause = exception instanceof Error ? exception : undefined;

      this.logger.error(
        { err: cause },
        `${request.method} ${request.originalUrl ?? request.url} -> ${status}: ${cause?.message ?? message}`,
      );
    }

    const body: ApiResponse<null> = {
      success: false,
      statusCode: status,
      message,
      data: null,
      meta: {
        timestamp: new Date().toISOString(),
        path: request.originalUrl ?? request.url,
      },
      errors,
    };

    response.status(status).json(body);
  }

  private resolve(exception: unknown): {
    status: HttpStatus;
    message: string;
    errors: ApiResponseError[];
  } {
    if (exception instanceof DomainException) {
      const status = DOMAIN_EXCEPTION_STATUS[exception.name] ?? HttpStatus.BAD_REQUEST;
      return {
        status,
        message: exception.message,
        errors: [
          {
            code: exception.code,
            message: exception.message,
            ...(exception.details ? { details: exception.details } : {}),
          },
        ],
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();

      if (typeof payload === 'string') {
        return { status, message: payload, errors: [{ code: exception.name, message: payload }] };
      }

      const { message: rawMessage, error } = payload as {
        message?: string | string[];
        error?: string;
      };

      const messages = Array.isArray(rawMessage)
        ? rawMessage
        : [rawMessage ?? error ?? exception.message];

      return {
        status,
        message: error ?? exception.message,
        errors: messages.map((m) => ({ code: error ?? exception.name, message: m })),
      };
    }

    if (exception instanceof QueryFailedError) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error al ejecutar la operación en base de datos',
        errors: [{ code: 'DATABASE_ERROR', message: this.clientDetail(exception.message) }],
      };
    }

    const withStatus = exception as { status?: unknown; statusCode?: unknown; message?: unknown };
    const rawStatus = withStatus.status ?? withStatus.statusCode;

    if (typeof rawStatus === 'number' && rawStatus >= 400 && rawStatus < 500) {
      const detail =
        typeof withStatus.message === 'string' ? withStatus.message : 'Solicitud inválida';

      return {
        status: rawStatus,
        message: detail,
        errors: [{ code: 'BAD_REQUEST', message: detail }],
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Error interno del servidor',
      errors: [
        {
          code: 'INTERNAL_SERVER_ERROR',
          message: this.clientDetail(
            exception instanceof Error ? exception.message : 'Error desconocido',
          ),
        },
      ],
    };
  }

  private clientDetail(detail: string): string {
    return this.exposeInternals ? detail : OPAQUE_SERVER_ERROR;
  }
}
