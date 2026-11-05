import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import { appConfig, docsConfig, loggerConfig } from './config/configuration';
import { buildDataSourceOptions } from './config/database.config';
import { validateEnv } from './config/env.validation';
import { buildLoggerParams } from './config/logger.config';
import { HealthModule } from './health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { AuthMethodsModule } from './modules/auth-methods/auth-methods.module';
import { BackofficeModule } from './modules/backoffice/backoffice.module';
import { InternalModule } from './modules/internal/internal.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { PermissionOverridesModule } from './modules/permission-overrides/permission-overrides.module';
import { ResourceModule } from './modules/resource/resource.module';
import { RoleAssignmentsModule } from './modules/role-assignments/role-assignments.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['.env.local', '.env'],
      load: [appConfig, docsConfig, loggerConfig],
      validate: validateEnv,
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        buildLoggerParams({
          level: config.get<string>('logger.level', 'info'),
          pretty: config.get<boolean>('logger.pretty', false),
          serviceName: config.get<string>('app.name', 'ms-template'),
        }),
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => buildDataSourceOptions(process.env),
    }),
    HealthModule,
    ResourceModule,
    OrganizationsModule,
    AuthModule,
    UsersModule,
    BackofficeModule,
    AuthMethodsModule,
    SessionsModule,
    RoleAssignmentsModule,
    PermissionOverridesModule,
    InternalModule,
  ],
})
export class AppModule {}
