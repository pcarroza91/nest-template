# ms-template

Template base para microservicios en **NestJS 11 + TypeORM**, con la organización tradicional de NestJS por tipo técnico (sin arquitectura hexagonal).

---

## Arranque rápido

El gestor de paquetes es **pnpm**, fijado en `package.json > packageManager`. Con corepack no hace falta instalarlo a mano:

```bash
corepack enable          # una sola vez por máquina
cp .env.example .env
pnpm install
pnpm start:dev
```

> `pnpm-lock.yaml` se versiona. En CI usa `pnpm install --frozen-lockfile` para que el install falle si el lockfile quedó desincronizado del `package.json`.

- API: `http://localhost:3000/api/v1`
- Documentación (Scalar): `http://localhost:3000/api/docs` — solo en dev y qa
- Health: `http://localhost:3000/health` (fuera del prefijo y sin versionar, para las probes)

> La primera vez, poné `DB_SYNCHRONIZE=true` en tu `.env` para que TypeORM cree el esquema, levantá la app una vez y volvelo a `false`. Viene apagado a propósito — ver **Esquema de base de datos**.

Con Docker:

```bash
docker compose up --build
```

---

## Cambiar de motor de base de datos

La conexión se arma en un solo lugar (`src/config/database.config.ts`) y la consumen tanto el runtime como el CLI de migraciones. Cambiar de motor es cambiar `DB_TYPE` en el `.env` e instalar su driver:

| `DB_TYPE`        | Driver a instalar      |
| ---------------- | ---------------------- |
| `postgres`       | `pg` *(ya incluido)*   |
| `mysql`          | `pnpm add mysql2`      |
| `mariadb`        | `pnpm add mysql2`      |
| `mssql`          | `pnpm add mssql`       |
| `sqlite`         | `pnpm add sqlite3`     |
| `better-sqlite3` | `pnpm add better-sqlite3` |

Para mantener esa portabilidad, las entidades evitan tipos propietarios: nada de `enum` nativo, `jsonb` ni `uuid` de postgres. En particular, **las columnas de fecha no llevan `type` explícito** — `@CreateDateColumn()` sin tipo deja que TypeORM elija el nativo de cada motor (`timestamp` en postgres, `datetime` en mysql/sqlite, `datetime2` en mssql). Fijar `timestamp` rompería sqlite y en mssql significaría `rowversion`.

Los tests e2e corren contra **sqlite en memoria**, así que la portabilidad se verifica en cada corrida sin levantar nada.

---

## Estructura

```
src/
├── main.ts                     # bootstrap: pipes, interceptor, filter, docs, helmet
├── app.module.ts
├── config/
│   ├── configuration.ts        # namespaces de config (app, docs, logger)
│   ├── env.validation.ts       # contrato de env, fail-fast al arrancar
│   └── database.config.ts      # builder de DataSourceOptions multi-motor
├── common/
│   ├── decorators/
│   ├── dto/                    # pagination-query, paginated-result
│   ├── exceptions/             # domain-exceptions
│   ├── filters/                # global-exception.filter
│   ├── guards/
│   ├── interceptors/           # response.interceptor
│   ├── interfaces/             # api-response, pagination-meta
│   └── pipes/
├── health/
└── modules/
    └── resource/               # módulo de ejemplo — cópialo y renómbralo
        ├── resource.module.ts
        ├── resource.controller.ts
        ├── resource.service.ts
        ├── business/
        ├── repositories/
        ├── mappers/
        ├── dto/
        └── entities/
```

---

## Las cuatro capas

### Repository — datos, con fail-fast

Toda consulta vive aquí; el service nunca toca el ORM. Si un método busca por identificador y no encuentra, **lanza la excepción de dominio**: el tipo de retorno es `Promise<Resource>`, nunca `Promise<Resource | null>`.

```ts
async findOneById(id: string): Promise<Resource> {
  const resource = await this.repository.findOne({ where: { id } });
  if (!resource) throw new EntityNotFoundException('Resource', id);
  return resource;
}
```

Los listados retornan `PaginatedResultDto<T>`, nunca un array suelto.

### Business — reglas de negocio encadenables

`@Injectable({ scope: Scope.TRANSIENT })`, fluent interface: cada regla retorna `this` y el método terminal entrega el resultado ya mapeado.

> **Sobre el estado interno:** `TRANSIENT` da una instancia por *consumidor*, no por request; como el service es singleton, comparte su instancia de business entre requests concurrentes. Es seguro porque **todos los métodos de la cadena son síncronos** — la cadena entera corre en un mismo tick del event loop, sin puntos de interleaving — y porque `init()` resetea el estado acumulado. **Nunca metas un `await` dentro de la cadena**: si necesitas E/S, resuélvela en el service antes de `init()` y pásala como parámetro. Si algún día una regla necesita ser asíncrona, cambia el scope a `Scope.REQUEST`.

### Mapper — dominio ↔ DTO de salida

Único lugar donde se arman DTOs. La entidad ORM nunca se expone al cliente.

### Service — orquestador

Solo coordina. Sin `if` de existencia (los lanza el repository), sin cálculos, sin queries.

```ts
async calculate(id: string): Promise<ResourceCalculationDto> {
  const resource = await this.repository.findWithRelationsForCalculation(id);

  return this.business
    .init(resource)
    .validateEligibility()
    .applyDraftPenalty()
    .applyVolumeDiscount()
    .enforceMinimumAmount()
    .round()
    .getCalculationResult();
}
```

Si un módulo necesita datos de otro, inyecta el **service** del otro módulo, nunca su repository. Por eso `ResourceModule` exporta solo `ResourceService`.

---

## Respuesta estándar

Todos los endpoints responden con el mismo sobre, armado automáticamente por `ResponseInterceptor`. Los controllers retornan el dato plano.

```json
{
  "success": true,
  "statusCode": 200,
  "message": "OK",
  "data": {},
  "meta": { "timestamp": "...", "path": "..." },
  "errors": null
}
```

El mensaje se personaliza por endpoint con `@ResponseMessage('Recurso creado correctamente')`.

En listados, el interceptor detecta `PaginatedResultDto` y descompone el resultado: los items van a `data` y la metadata a `meta.pagination`.

```json
{
  "success": true,
  "statusCode": 200,
  "message": "OK",
  "data": [],
  "meta": {
    "timestamp": "...",
    "path": "...",
    "pagination": {
      "page": 1, "limit": 10, "totalItems": 47, "totalPages": 5,
      "hasNextPage": true, "hasPreviousPage": false
    }
  },
  "errors": null
}
```

Los errores usan el mismo contrato con `success: false`, `data: null` y el detalle en `errors`, gracias a `GlobalExceptionFilter`.

---

## Excepciones de dominio

El negocio lanza excepciones de dominio, nunca `HttpException`. El filtro las traduce por nombre:

| Excepción                        | HTTP  | `code`                    |
| -------------------------------- | ----- | ------------------------- |
| `EntityNotFoundException`        | `404` | `ENTITY_NOT_FOUND`        |
| `DuplicateEntityException`       | `409` | `DUPLICATE_ENTITY`        |
| `BusinessRuleViolationException` | `422` | `BUSINESS_RULE_VIOLATION` |
| `InvalidOperationException`      | `400` | `INVALID_OPERATION`       |
| `ForbiddenOperationException`    | `403` | `FORBIDDEN_OPERATION`     |
| `ExternalServiceException`       | `502` | `EXTERNAL_SERVICE_ERROR`  |

Al agregar una excepción nueva, regístrala en el mapa `DOMAIN_EXCEPTION_STATUS` de `global-exception.filter.ts`.

---

## Variables de entorno

`src/config/env.validation.ts` valida el entorno al arrancar: si falta o es inválida alguna variable, la app **no levanta** y el error indica cuál.

### Los tres entornos

`NODE_ENV` admite exactamente **`dev`**, **`qa`** y **`prod`**. Cualquier otro valor —incluidos `development`, `test`, `staging` o `production`— impide el arranque. Están definidos en el enum `Environment` y son la única fuente de verdad sobre en qué entorno corre el servicio.

Qué cambia en cada uno:

| Comportamiento | `dev` | `qa` | `prod` |
| --- | :---: | :---: | :---: |
| Documentación en `/api/docs` | sí | sí | **no** |
| `DB_SYNCHRONIZE=true` permitido | sí | **no arranca** | **no arranca** |
| Detalle real del error en la respuesta | sí | sí | **no** (opaco) |

> **Ojo con `prod`:** Express y varias librerías buscan literalmente `NODE_ENV === 'production'` para activar su modo productivo, y aquí nunca lo van a encontrar. Por eso `main.ts` se lo indica a Express de forma explícita con `app.set('env', 'production')` cuando el entorno es `prod`. Si incorporás una librería que decida algo según `NODE_ENV`, revisá que entienda `prod`.

> Al agregar una variable, **anota el tipo explícitamente** (`PORT: number = 3000`) y usa `@Type(() => Number)` en las numéricas. Sin anotación de tipo TypeScript emite `design:type: Object`, `enableImplicitConversion` no convierte el string del entorno y `@IsInt()` falla con cualquier valor.

---

## Seguridad

Decisiones ya tomadas en el template, con el porqué. No las relajes sin entender qué protegen.

**CORS — lista blanca explícita.** `CORS_ORIGINS` es una lista de orígenes separados por coma; vacía significa que no se autoriza ningún origen cruzado. Nunca uses `origin: true`: eso no es "el valor por defecto", refleja el `Origin` de cada petición, o sea autoriza a cualquier sitio. Combinado con `credentials: true` deja que cualquier página que visite tu usuario lea esta API con sus cookies.

**Detalle de errores.** Fuera de producción, un 5xx devuelve el mensaje real de la excepción, que agiliza el desarrollo. En producción devuelve un mensaje opaco: los errores internos revelan motor de base de datos, esquema, tablas y columnas. El detalle completo **siempre** queda en el log, con su tipo y su stack.

**Errores de cliente que no son `HttpException`.** Las librerías de Express (body-parser y compañía) lanzan errores con su propio `status`. El filtro global lo respeta cuando está entre 400 y 499, así que un cuerpo demasiado grande responde `413` y no `500`. Sin eso, cualquiera podría generar 5xx —con sus alertas y sus stacks— a voluntad.

**TLS hacia la base.** Con `DB_SSL=true` el certificado del servidor **siempre** se valida (`rejectUnauthorized: true`). Si la CA del proveedor no está entre las raíces del sistema (RDS, Cloud SQL), pasala en `DB_SSL_CA`. Desactivar la validación cifraría el tráfico pero aceptaría el certificado de cualquier intermediario, que es peor que no tener SSL porque da falsa confianza.

**Documentación y `synchronize`** están acotados por entorno; ver sus secciones.

Lo que el template **no** trae y cada proyecto debe resolver: autenticación y autorización (`common/guards/` está vacío) y rate limiting. Para lo primero, la forma correcta es un guard global vía `APP_GUARD` con un decorador `@Public()` para las excepciones — así olvidarse deja el endpoint cerrado, no abierto.

---

## Logging

Logger estructurado con pino (`src/config/logger.config.ts`). La regla es **una línea por request**:

```
[19:35:02.904] INFO: POST /api/v1/resources 201 - 20ms
[19:35:02.911] WARN: GET /api/v1/resources/434345 400 - 1ms
[19:35:03.128] ERROR: [GlobalExceptionFilter] POST /api/v1/resources -> 500: relation "resources" does not exist
    err: { "type": "QueryFailedError", "message": "...", "stack": ... }
[19:35:03.129] ERROR: POST /api/v1/resources 500
```

Cómo se consigue, porque por defecto pino-http es mucho más ruidoso:

- **Serializers**: recortan `req` a `{ id, method, url }` y `res` a `{ statusCode }`. Sin esto cada línea arrastra todos los headers de la request, que es el grueso del ruido.
- **`customLogLevel`**: clasifica por status (5xx → `error`, 4xx → `warn`, resto → `info`) en vez de loguear todo como info.
- **Un solo dueño del stack trace**: lo imprime únicamente el `GlobalExceptionFilter` y solo en 5xx. Los 4xx son errores del cliente, ya descritos en la respuesta, y no justifican un stack.
- **Sin `LoggerErrorInterceptor`**: `main.ts` no lo registra a propósito. Volcaba el error completo por cada request fallida, duplicando lo que ya loguean pino-http y el filtro.
- **Serializer de `err`**: descarta el `Error` genérico que pino-http fabrica ante cualquier 5xx (`failed with status code 500`), cuyo stack apunta a sus propios internals.
- **`/health` no se loguea**: las probes pegan cada pocos segundos.
- **`genReqId`**: respeta `x-request-id` / `x-correlation-id` si vienen del gateway; si no, genera un UUID.

`LOG_PRETTY=true` da la salida coloreada de arriba para desarrollo. En producción déjalo en `false`: pino emite JSON por línea, que es lo que esperan Loki, Datadog o CloudWatch.

> Sobre los warnings de `LegacyRouteConverter` al arrancar: los emite Nest al procesar el `exclude` de `setGlobalPrefix`, no el código del template. Son informativos — Nest auto-convierte la ruta — y no afectan el ruteo.

---

## Documentación de la API

La UI es **Scalar** (`@scalar/nestjs-api-reference`), no Swagger UI. La distinción importa:

- `@nestjs/swagger` **se queda**: es el que genera el documento OpenAPI a partir de los decoradores (`@ApiProperty`, `@ApiOperation`, `ApiPaginatedResponse`, `ApiStandardResponse`) y del plugin declarado en `nest-cli.json`.
- Scalar solo **renderiza** ese documento. Se cambió `SwaggerModule.setup()` por el middleware `apiReference()`.

La UI se sirve en `/api/docs` y **solo ahí**: se registra con `get` sobre la ruta exacta, no con `use`, así que cualquier subruta devuelve 404. No hay endpoint con el spec OpenAPI crudo — la UI ya lo lleva embebido, y para importarlo a Postman o generar clientes se exporta desde la propia interfaz de Scalar.

**En qué entornos se publica.** Solo con `NODE_ENV` en `dev` o `qa`. En `prod` no se publica aunque pongas `DOCS_ENABLED=true`: esa variable solo puede *apagarla*, nunca encenderla fuera de esos entornos. La lógica está en `docsConfig` (`configuration.ts`) y la lista en `DOCS_ALLOWED_ENVS` (`env.validation.ts`).

`DOCS_PATH` cambia la ruta. Ambas variables se llamaban `SWAGGER_*`; se renombraron porque ya no configuran Swagger UI.

> **Sobre el CSP:** Scalar carga su bundle desde `cdn.jsdelivr.net`, y el `helmet()` global impone `script-src 'self'`, que lo bloquearía y dejaría la página en blanco. Por eso `main.ts` monta un segundo `helmet()` **solo en la ruta de docs**, que pisa la cabecera y permite el CDN. El resto de la API conserva el CSP estricto. Si necesitás un despliegue sin salida a internet, hay que auto-hospedar el bundle y apuntar la opción `cdn` de Scalar a esa ruta.

---

## Dependencias con binarios nativos

pnpm bloquea por defecto los scripts de instalación de las dependencias (protección contra supply chain). Si agregas un paquete que compila binarios — `bcrypt`, `sharp`, un driver nativo — el install avisará con `ERR_PNPM_IGNORED_BUILDS` y el paquete quedará sin compilar.

Para autorizarlo, decláralo en `pnpm-workspace.yaml`:

```yaml
allowBuilds:
  better-sqlite3: true
  '@scarf/scarf': false   # telemetría de terceros: bloqueada a propósito
```

---

## Esquema de base de datos

El template **todavía no usa migraciones**. El esquema lo crea TypeORM al arrancar con `DB_SYNCHRONIZE=true`.

`synchronize` compara las entidades contra el esquema y lo altera sin preguntar: **puede borrar columnas con todos sus datos**. Por eso está acotado en dos niveles:

- **Viene en `false` por defecto**, en todos los entornos. Nunca se activa por herencia de un `.env` copiado.
- **Solo se admite con `NODE_ENV=dev`.** En `qa` o `prod`, poner `DB_SYNCHRONIZE=true` **impide el arranque** con un error explícito, en vez de degradar en silencio. El guard está en `assertSafeSynchronize` (`env.validation.ts`), y `database.config.ts` lo refuerza forzando `synchronize: false` si se construye la conexión sin pasar por la validación.

Consecuencia práctica: el servicio `api` del `docker compose` corre con `NODE_ENV=prod`, así que **no puede crear el esquema solo**. Hasta que existan migraciones, hay que crearlo aparte. Para desarrollo local, activá `DB_SYNCHRONIZE=true` una vez y volvelo a `false`.

Cuando llegue el momento, lo que hay que reponer es:

1. `src/config/typeorm.datasource.ts` — un `DataSource` que reutilice `buildDataSourceOptions()` para el CLI.
2. En `database.config.ts`, las opciones `migrations`, `migrationsRun` y `migrationsTableName`.
3. La variable `DB_MIGRATIONS_RUN` en `env.validation.ts` y en `.env.example`.
4. Los scripts `migration:generate` / `run` / `revert` en `package.json`.

---

## Tests

```bash
pnpm test          # unitarios (business, service, config)
pnpm test:cov      # con cobertura
pnpm test:e2e      # e2e contra sqlite en memoria, sin docker
```

Los tests del business usan `moduleRef.resolve()` en vez de `get()`, porque el provider es `TRANSIENT`.

---

## Checklist: módulo nuevo

1. Copia `src/modules/resource/` y renombra recurso, archivos y clases.
2. `entities/<x>.entity.ts` — entidad ORM con tipos portables.
3. `repositories/<x>.repository.ts` — queries con fail-fast; método paginado si lista.
4. `mappers/<x>.mapper.ts` — dominio → DTO de salida.
5. `business/<x>.business.ts` — reglas encadenables (`this`), transient, métodos síncronos.
6. `dto/` — entrada con `class-validator`; el query DTO extiende `PaginationQueryDto`.
7. `<x>.service.ts` — solo orquesta repository + business.
8. `<x>.controller.ts` — endpoints delgados que retornan el dato plano.
9. `<x>.module.ts` — registra todo como providers y **exporta solo el service**.
10. Registra el módulo en `app.module.ts`.
# nest-template
