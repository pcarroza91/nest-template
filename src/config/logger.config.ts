import { randomUUID } from 'node:crypto';
import { IncomingMessage, ServerResponse } from 'node:http';
import { Params } from 'nestjs-pino';

const SILENT_ROUTES = ['/health'];

const PINO_HTTP_SYNTHETIC_ERROR = 'failed with status code';

export function buildLoggerParams(options: {
  level: string;
  pretty: boolean;
  serviceName: string;
}): Params {
  const { level, pretty, serviceName } = options;

  return {
    pinoHttp: {
      level,

      transport: pretty
        ? {
            target: 'pino-pretty',
            options: {
              singleLine: true,
              colorize: true,
              translateTime: 'SYS:HH:MM:ss.l',
              ignore: 'pid,hostname,service,req,res,responseTime,reqId,context',
              messageFormat: '{if context}[{context}] {end}{msg}',
            },
          }
        : undefined,

      genReqId: (req: IncomingMessage) =>
        (req.headers['x-request-id'] as string) ??
        (req.headers['x-correlation-id'] as string) ??
        randomUUID(),

      autoLogging: {
        ignore: (req: IncomingMessage) =>
          SILENT_ROUTES.some((route) => req.url?.startsWith(route) === true),
      },

      customLogLevel: (_req: IncomingMessage, res: ServerResponse, err?: Error) => {
        if (err ?? res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },

      customSuccessMessage: (req: IncomingMessage, res: ServerResponse, responseTime: number) =>
        `${req.method} ${req.url} ${res.statusCode} - ${responseTime}ms`,

      customErrorMessage: (req: IncomingMessage, res: ServerResponse) =>
        `${req.method} ${req.url} ${res.statusCode}`,

      serializers: {
        req: (req: { id: string; method: string; url: string }) => ({
          id: req.id,
          method: req.method,
          url: req.url,
        }),
        res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),

        err: (err: Error & { type?: string }) =>
          err?.message?.startsWith(PINO_HTTP_SYNTHETIC_ERROR)
            ? undefined
            : { type: err?.type ?? err?.name, message: err?.message, stack: err?.stack },
      },

      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'req.body.password',
          'req.body.token',
        ],
        remove: true,
      },

      customProps: () => ({ service: serviceName }),
    },
  };
}
