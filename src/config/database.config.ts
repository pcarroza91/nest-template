import { DataSourceOptions } from 'typeorm';
import { DatabaseType, Environment, SYNCHRONIZE_ALLOWED_ENVS } from './env.validation';

const FILE_BASED: DatabaseType[] = [DatabaseType.SQLite, DatabaseType.BetterSQLite3];

const DEFAULT_PORT: Partial<Record<DatabaseType, number>> = {
  [DatabaseType.Postgres]: 5432,
  [DatabaseType.MySQL]: 3306,
  [DatabaseType.MariaDB]: 3306,
  [DatabaseType.MSSQL]: 1433,
};

const toBool = (value?: string): boolean => value === 'true';

function buildSslOptions(env: NodeJS.ProcessEnv) {
  if (!toBool(env.DB_SSL)) {
    return undefined;
  }

  return {
    rejectUnauthorized: true,
    ...(env.DB_SSL_CA ? { ca: env.DB_SSL_CA } : {}),
  };
}

function resolveSynchronize(env: NodeJS.ProcessEnv): boolean {
  if (!toBool(env.DB_SYNCHRONIZE)) {
    return false;
  }

  const nodeEnv = (env.NODE_ENV as Environment) ?? Environment.Dev;

  return SYNCHRONIZE_ALLOWED_ENVS.includes(nodeEnv);
}

export function buildDataSourceOptions(env: NodeJS.ProcessEnv = process.env): DataSourceOptions {
  const type = (env.DB_TYPE ?? DatabaseType.Postgres) as DatabaseType;

  const shared = {
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: resolveSynchronize(env),
    logging: toBool(env.DB_LOGGING),
  };

  if (FILE_BASED.includes(type)) {
    return {
      type: type as 'sqlite' | 'better-sqlite3',
      database: env.DB_DATABASE ?? ':memory:',
      ...shared,
    };
  }

  const base = {
    host: env.DB_HOST ?? 'localhost',
    port: env.DB_PORT ? Number(env.DB_PORT) : (DEFAULT_PORT[type] ?? 5432),
    username: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    database: env.DB_DATABASE,
    ...shared,
  };

  switch (type) {
    case DatabaseType.MySQL:
    case DatabaseType.MariaDB:
      return {
        ...base,
        type: type as 'mysql' | 'mariadb',
        charset: 'utf8mb4',
        timezone: 'Z',
        ssl: buildSslOptions(env),
      };

    case DatabaseType.MSSQL:
      return {
        ...base,
        type: 'mssql',
        schema: env.DB_SCHEMA ?? 'dbo',
        options: {
          encrypt: toBool(env.DB_SSL),
          trustServerCertificate: !toBool(env.DB_SSL),
        },
      };

    case DatabaseType.Postgres:
    default:
      return {
        ...base,
        type: 'postgres',
        schema: env.DB_SCHEMA ?? 'public',
        ssl: buildSslOptions(env),
      };
  }
}
