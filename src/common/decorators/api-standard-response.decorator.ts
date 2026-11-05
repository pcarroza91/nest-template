import { Type, applyDecorators } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';

export const ApiStandardResponse = <TModel extends Type<unknown>>(
  model: TModel,
  status = 200,
  description = 'Operación exitosa',
) =>
  applyDecorators(
    ApiExtraModels(model),
    ApiResponse({
      status,
      description,
      schema: {
        properties: {
          success: { type: 'boolean', example: true },
          statusCode: { type: 'number', example: status },
          message: { type: 'string', example: 'OK' },
          data: { $ref: getSchemaPath(model) },
          meta: {
            type: 'object',
            properties: {
              timestamp: { type: 'string', format: 'date-time' },
              path: { type: 'string' },
            },
          },
          errors: { type: 'array', nullable: true, example: null },
        },
      },
    }),
  );
