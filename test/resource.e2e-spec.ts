import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { GlobalExceptionFilter } from 'src/common/filters/global-exception.filter';
import { ResponseInterceptor } from 'src/common/interceptors/response.interceptor';

describe('Resources (e2e)', () => {
  let app: INestApplication;
  let createdId: string;

  beforeAll(async () => {
    Object.assign(process.env, {
      NODE_ENV: 'dev',
      DB_TYPE: 'better-sqlite3',
      DB_DATABASE: ':memory:',
      DB_SYNCHRONIZE: 'true',
      DB_LOGGING: 'false',
      DOCS_ENABLED: 'false',
      LOG_LEVEL: 'silent',
      LOG_PRETTY: 'false',
    });

    const { AppModule } = await import('src/app.module');

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication({ logger: false });
    app.setGlobalPrefix('api', { exclude: ['health', 'health/liveness'] });
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalInterceptors(new ResponseInterceptor(app.get(Reflector)));
    app.useGlobalFilters(new GlobalExceptionFilter());

    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('POST /api/v1/resources crea un recurso y responde con el sobre estándar', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/resources')
      .send({ code: 'RES-001', name: 'Recurso e2e', amount: 2000000, status: 'DRAFT' })
      .expect(201);

    expect(response.body).toMatchObject({
      success: true,
      statusCode: 201,
      message: 'Recurso creado correctamente',
      errors: null,
    });
    expect(response.body.meta).toHaveProperty('timestamp');
    expect(response.body.meta.path).toBe('/api/v1/resources');
    expect(response.body.data).toMatchObject({ code: 'RES-001', amount: 2000000 });

    createdId = response.body.data.id as string;
  });

  it('POST rechaza payloads inválidos con success:false y detalle de errores', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/resources')
      .send({ code: 'x', name: 'a' })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.data).toBeNull();
    expect(response.body.errors.length).toBeGreaterThan(0);
  });

  it('POST rechaza un código duplicado con 409', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/resources')
      .send({ code: 'RES-001', name: 'Duplicado' })
      .expect(409);

    expect(response.body.errors[0].code).toBe('DUPLICATE_ENTITY');
  });

  it('GET /api/v1/resources devuelve data plana y meta.pagination', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/resources?page=1&limit=10')
      .expect(200);

    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.meta.pagination).toMatchObject({
      page: 1,
      limit: 10,
      totalItems: 1,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    });
  });

  it('GET rechaza query params fuera de contrato', async () => {
    await request(app.getHttpServer()).get('/api/v1/resources?limit=999').expect(400);
    await request(app.getHttpServer()).get('/api/v1/resources?unknown=1').expect(400);
  });

  it('GET /:id/calculation aplica las reglas de negocio', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/resources/${createdId}/calculation`)
      .expect(200);

    expect(response.body.data).toMatchObject({
      baseAmount: 2000000,
      adjustments: -140000,
      total: 1860000,
    });
  });

  it('GET de un id inexistente responde 404 con la excepción de dominio mapeada', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/resources/3f1a2b4c-0000-4000-8000-0000000000ff')
      .expect(404);

    expect(response.body.success).toBe(false);
    expect(response.body.errors[0].code).toBe('ENTITY_NOT_FOUND');
  });

  it('PATCH actualiza el recurso', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/resources/${createdId}`)
      .send({ name: 'Recurso actualizado', status: 'ACTIVE' })
      .expect(200);

    expect(response.body.data).toMatchObject({
      name: 'Recurso actualizado',
      status: 'ACTIVE',
    });
  });

  it('PATCH rechaza una transición de estado inválida con 422', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/resources/${createdId}`)
      .send({ status: 'DRAFT' })
      .expect(422);

    expect(response.body.errors[0].code).toBe('BUSINESS_RULE_VIOLATION');
  });

  it('DELETE hace soft delete y deja el recurso fuera del listado', async () => {
    await request(app.getHttpServer()).delete(`/api/v1/resources/${createdId}`).expect(204);

    const response = await request(app.getHttpServer()).get('/api/v1/resources').expect(200);

    expect(response.body.data).toHaveLength(0);
  });

  it('GET /health responde fuera del prefijo y sin versionar', async () => {
    await request(app.getHttpServer()).get('/health/liveness').expect(200);
  });
});
