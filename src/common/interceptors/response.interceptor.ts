import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { RESPONSE_MESSAGE_KEY } from '../decorators/response-message.decorator';
import { PaginatedResultDto } from '../dto/paginated-result.dto';
import { ApiResponse } from '../interfaces/api-response.interface';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<unknown>> {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<unknown>> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    const message =
      this.reflector.getAllAndOverride<string>(RESPONSE_MESSAGE_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? 'OK';

    return next.handle().pipe(
      map((payload): ApiResponse<unknown> => {
        const isPaginated = payload instanceof PaginatedResultDto;

        return {
          success: true,
          statusCode: response.statusCode,
          message,
          data: isPaginated ? payload.items : (payload ?? null),
          meta: {
            timestamp: new Date().toISOString(),
            path: request.originalUrl ?? request.url,
            ...(isPaginated ? { pagination: payload.meta } : {}),
          },
          errors: null,
        };
      }),
    );
  }
}
