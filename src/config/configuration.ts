import { registerAs } from '@nestjs/config';
import { DOCS_ALLOWED_ENVS, Environment } from './env.validation';

const toBool = (value?: string): boolean => value === 'true';

const currentEnv = (): Environment => (process.env.NODE_ENV as Environment) ?? Environment.Dev;

const parseOrigins = (raw?: string): string[] =>
  (raw ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

export const appConfig = registerAs('app', () => ({
  name: process.env.APP_NAME ?? 'ms-template',
  env: currentEnv(),
  port: Number(process.env.PORT ?? 3000),
  apiPrefix: process.env.API_PREFIX ?? 'api',
  isProduction: currentEnv() === Environment.Prod,
  corsOrigins: parseOrigins(process.env.CORS_ORIGINS),
}));

export const docsConfig = registerAs('docs', () => ({
  enabled: DOCS_ALLOWED_ENVS.includes(currentEnv()) && toBool(process.env.DOCS_ENABLED ?? 'true'),
  path: process.env.DOCS_PATH ?? 'docs',
}));

export const loggerConfig = registerAs('logger', () => ({
  level: process.env.LOG_LEVEL ?? 'info',
  pretty: toBool(process.env.LOG_PRETTY ?? 'false'),
}));

export type AppConfig = ReturnType<typeof appConfig>;
export type DocsConfig = ReturnType<typeof docsConfig>;
export type LoggerConfig = ReturnType<typeof loggerConfig>;
