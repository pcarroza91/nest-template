import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { Express, RequestHandler } from 'express';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

const SCALAR_CDN = 'https://cdn.jsdelivr.net';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const logger = app.get(Logger);
  app.useLogger(logger);

  const config = app.get(ConfigService);
  const port = config.get<number>('app.port', 3000);
  const apiPrefix = config.get<string>('app.apiPrefix', 'api');
  const isProduction = config.get<boolean>('app.isProduction', false);

  if (isProduction) {
    (app.getHttpAdapter().getInstance() as Express).set('env', 'production');
  }

  app.use(helmet());

  const corsOrigins = config.get<string[]>('app.corsOrigins', []);

  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : false,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    maxAge: 86_400,
  });

  if (corsOrigins.length === 0) {
    logger.warn('CORS_ORIGINS vacío: no se autorizan peticiones desde otros orígenes');
  }

  app.setGlobalPrefix(apiPrefix, { exclude: ['health', 'health/liveness'] });
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  app.useGlobalInterceptors(new ResponseInterceptor(app.get(Reflector)));
  app.useGlobalFilters(new GlobalExceptionFilter());

  if (config.get<boolean>('docs.enabled')) {
    const docsPath = `/${apiPrefix}/${config.get<string>('docs.path', 'docs')}`;
    const server = app.getHttpAdapter().getInstance() as Express;

    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle(config.get<string>('app.name', 'ms-template'))
        .setDescription('API del microservicio')
        .setVersion('1.0')
        .addBearerAuth()
        .build(),
    );

    server.get(
      docsPath,
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", SCALAR_CDN],
            styleSrc: ["'self'", "'unsafe-inline'", SCALAR_CDN],
            fontSrc: ["'self'", 'data:', SCALAR_CDN],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'", SCALAR_CDN],
            workerSrc: ["'self'", 'blob:'],
          },
        },
      }),
      apiReference({
        content: document,
        title: `${config.get<string>('app.name', 'ms-template')} · API`,
      }) as RequestHandler,
    );
  }

  app.enableShutdownHooks();
  await app.listen(port);
  logger.log(`${config.get<string>('app.name')} escuchando en :${port}/${apiPrefix}`);
}

void bootstrap();
