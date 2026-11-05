import { Type, plainToInstance } from 'class-transformer';
import {
  IsBooleanString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  validateSync,
} from 'class-validator';

export enum Environment {
  Dev = 'dev',
  Qa = 'qa',
  Prod = 'prod',
}

export const DOCS_ALLOWED_ENVS: Environment[] = [Environment.Dev, Environment.Qa];

export const SYNCHRONIZE_ALLOWED_ENVS: Environment[] = [Environment.Dev];

export enum DatabaseType {
  Postgres = 'postgres',
  MySQL = 'mysql',
  MariaDB = 'mariadb',
  MSSQL = 'mssql',
  SQLite = 'sqlite',
  BetterSQLite3 = 'better-sqlite3',
}

export class EnvironmentVariables {
  @IsEnum(Environment, {
    message: `NODE_ENV debe ser uno de: ${Object.values(Environment).join(', ')}`,
  })
  @IsOptional()
  NODE_ENV: Environment = Environment.Dev;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  @IsOptional()
  PORT: number = 3000;

  @IsString()
  @IsOptional()
  API_PREFIX: string = 'api';

  @IsString()
  @IsOptional()
  APP_NAME: string = 'ms-template';

  @IsString()
  @IsOptional()
  CORS_ORIGINS: string = '';

  @IsEnum(DatabaseType, {
    message: `DB_TYPE debe ser uno de: ${Object.values(DatabaseType).join(', ')}`,
  })
  DB_TYPE: DatabaseType = DatabaseType.Postgres;

  @IsString()
  @IsOptional()
  DB_HOST: string = 'localhost';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  @IsOptional()
  DB_PORT?: number;

  @IsString()
  @IsOptional()
  DB_USERNAME?: string;

  @IsString()
  @IsOptional()
  DB_PASSWORD?: string;

  @IsString()
  @IsNotEmpty({ message: 'DB_DATABASE es obligatorio' })
  DB_DATABASE!: string;

  @IsString()
  @IsOptional()
  DB_SCHEMA?: string;

  @IsBooleanString()
  @IsOptional()
  DB_SSL: string = 'false';

  @IsString()
  @IsOptional()
  DB_SSL_CA?: string;

  @IsBooleanString()
  @IsOptional()
  DB_SYNCHRONIZE: string = 'false';

  @IsBooleanString()
  @IsOptional()
  DB_LOGGING: string = 'false';

  @IsBooleanString()
  @IsOptional()
  DOCS_ENABLED: string = 'true';

  @IsString()
  @IsOptional()
  DOCS_PATH: string = 'docs';

  @IsString()
  @IsOptional()
  LOG_LEVEL: string = 'info';

  @IsBooleanString()
  @IsOptional()
  LOG_PRETTY: string = 'false';
}

export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
    exposeDefaultValues: true,
  });

  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    const detail = errors
      .map((e) => `  - ${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`)
      .join('\n');
    throw new Error(`Configuración de entorno inválida:\n${detail}`);
  }

  assertSafeSynchronize(validated);

  return validated;
}

function assertSafeSynchronize(env: EnvironmentVariables): void {
  if (env.DB_SYNCHRONIZE !== 'true') {
    return;
  }

  if (!SYNCHRONIZE_ALLOWED_ENVS.includes(env.NODE_ENV)) {
    throw new Error(
      `DB_SYNCHRONIZE=true no está permitido con NODE_ENV=${env.NODE_ENV}: ` +
        `puede borrar columnas y datos. Solo se admite en ` +
        `${SYNCHRONIZE_ALLOWED_ENVS.join(' o ')}; en el resto de los entornos ` +
        `el esquema debe crearse con migraciones.`,
    );
  }
}
