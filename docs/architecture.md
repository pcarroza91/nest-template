# Arquitectura de ms-template (backend)

Cómo se concretan en este template los [lineamientos de arquitectura](architecture/modular-microservice.md).
Cada sección indica el lineamiento que aplica; la notación de los diagramas es la misma. El
[README](../README.md) es la guía de uso; este documento explica la estructura y sus reglas.

## Parte II: concreción en ms-template

## 10. Stack y mapa del repositorio

NestJS 11 sobre Express, TypeORM 0.3, TypeScript 5 (`strictNullChecks`, `noImplicitAny`),
`class-validator`/`class-transformer`, pino (`nestjs-pino`), `@nestjs/terminus`, `@nestjs/swagger`
para generar OpenAPI y Scalar para renderizarlo. Node ≥ 22, pnpm 11. Aplica las capas de la
[§3](architecture/modular-microservice.md#3-capas).

```mermaid
flowchart TB
    subgraph BOOT["«package» bootstrap"]
        MAIN("«component»<br/>main.ts<br/>helmet · CORS · /api · URI v1<br/>ValidationPipe · Scalar")
        APPM("«component»<br/>app.module.ts<br/>ConfigModule · LoggerModule<br/>TypeOrmModule · módulos")
    end
    subgraph MODULES["«package» src/modules"]
        RES("«component»<br/>resource<br/>módulo de ejemplo completo")
        IDN("«component»<br/>auth · users · organizations<br/>sessions · role-assignments · …<br/>Identity Service (contrato)")
    end
    HEALTH("«component»<br/>src/health<br/>terminus")
    subgraph COMMON["«package» src/common"]
        RESP("«component»<br/>interceptors · filters<br/>sobre ApiResponse")
        EXC("«component»<br/>exceptions<br/>domain-exceptions")
        DTO("«component»<br/>dto · interfaces<br/>paginación · Ack · Error")
        SEC("«component»<br/>guards · decorators<br/>JwtAuthGuard · @Public")
    end
    subgraph CONFIG["«package» src/config"]
        ENV("«component»<br/>env.validation.ts<br/>configuration.ts")
        DBC("«component»<br/>database.config.ts")
        LOG("«component»<br/>logger.config.ts")
    end
    DB[("Postgres<br/>u otro motor")]

    APPM --> RES & IDN & HEALTH
    APPM -- "validate · load" --> ENV
    APPM -- "forRootAsync" --> DBC & LOG
    MAIN -- "useGlobal*" --> RESP
    RES & IDN -.-> EXC & DTO & SEC
    RESP -.-> EXC
    RESP -. "Environment" .-> ENV
    RES --> DB

    classDef bootstrap fill:#c3e7ff,stroke:#494238,stroke-width:2px,color:#3c4747
    classDef health fill:#b6ecf3,stroke:#494238,stroke-width:2px,color:#3c4747
    classDef modules fill:#efe2c0,stroke:#494238,stroke-width:2px,color:#3c4747
    classDef common fill:#beecdd,stroke:#494238,stroke-width:2px,color:#3c4747
    classDef config fill:#d5e8c8,stroke:#494238,stroke-width:2px,color:#3c4747
    classDef infra fill:#ded6ce,stroke:#494238,stroke-width:2px,color:#3c4747
    classDef pkg fill:transparent,stroke:#8a857d,stroke-width:1.5px,stroke-dasharray:5 4
    class MAIN,APPM bootstrap
    class HEALTH health
    class RES,IDN modules
    class RESP,EXC,DTO,SEC common
    class ENV,DBC,LOG config
    class DB infra
    class BOOT,MODULES,COMMON,CONFIG pkg
    linkStyle default stroke-dasharray:6 4
```

Mapa del repositorio:

```mermaid
---
config:
  flowchart:
    nodeSpacing: 12
    subGraphTitleMargin:
      top: 4
      bottom: 14
---
flowchart LR
    ROOT("«package» ms-template/")
    subgraph SRC["«package» src/"]
        MAINF("main.ts<br/>app.module.ts")
        CFG("config/<br/>env.validation · configuration<br/>database.config · logger.config")
        subgraph COM["«package» common/"]
            CDEC("<span style='display:inline-block;width:150px'>decorators</span>")
            CDTO("<span style='display:inline-block;width:150px'>dto</span>")
            CEXC("<span style='display:inline-block;width:150px'>exceptions</span>")
            CFIL("<span style='display:inline-block;width:150px'>filters</span>")
            CGRD("<span style='display:inline-block;width:150px'>guards</span>")
            CINT("<span style='display:inline-block;width:150px'>interceptors</span>")
            CIFC("<span style='display:inline-block;width:150px'>interfaces</span>")
            CMAP("<span style='display:inline-block;width:150px'>mappers</span>")
            CPIP("<span style='display:inline-block;width:150px'>pipes</span>")
        end
        HLT("health/")
        subgraph MODS["«package» modules/"]
            MRES("<span style='display:inline-block;width:150px'>resource</span>")
            MAUTH("<span style='display:inline-block;width:150px'>auth</span>")
            MUSR("<span style='display:inline-block;width:150px'>users</span>")
            MORG("<span style='display:inline-block;width:150px'>organizations</span>")
            MBO("<span style='display:inline-block;width:150px'>backoffice</span>")
            MAM("<span style='display:inline-block;width:150px'>auth-methods</span>")
            MSES("<span style='display:inline-block;width:150px'>sessions</span>")
            MRA("<span style='display:inline-block;width:150px'>role-assignments</span>")
            MPO("<span style='display:inline-block;width:150px'>permission-overrides</span>")
            MINT("<span style='display:inline-block;width:150px'>internal</span>")
        end
    end
    TST("test/<br/>e2e · sqlite en memoria")
    OAS("identity_service_openapi.yaml<br/>contrato de Identity")
    DCK("Dockerfile · docker-compose.yml<br/>§20")
    DOCS("docs/")

    ROOT --> SRC & TST & OAS & DCK & DOCS

    classDef bootstrap fill:#c3e7ff,stroke:#494238,stroke-width:2px,color:#3c4747
    classDef health fill:#b6ecf3,stroke:#494238,stroke-width:2px,color:#3c4747
    classDef modules fill:#efe2c0,stroke:#494238,stroke-width:2px,color:#3c4747
    classDef common fill:#beecdd,stroke:#494238,stroke-width:2px,color:#3c4747
    classDef config fill:#d5e8c8,stroke:#494238,stroke-width:2px,color:#3c4747
    classDef infra fill:#ded6ce,stroke:#494238,stroke-width:2px,color:#3c4747
    classDef pkg fill:transparent,stroke:#8a857d,stroke-width:1.5px,stroke-dasharray:5 4
    class MAINF bootstrap
    class HLT health
    class MRES,MAUTH,MUSR,MORG,MBO,MAM,MSES,MRA,MPO,MINT modules
    class CDEC,CDTO,CEXC,CFIL,CGRD,CINT,CIFC,CMAP,CPIP common
    class CFG config
    class TST,OAS,DCK,DOCS infra
    class ROOT,SRC,COM,MODS pkg
    linkStyle default stroke-dasharray:6 4
```

Rutas resultantes:

```mermaid
flowchart LR
    REQ(["Petición HTTP"])
    PFX{"¿Empieza con<br/>/api?"}
    DOCSR("/api/docs<br/>Scalar · solo dev y qa<br/>sin versión")
    VER("/api/v1/…<br/>versionado por URI")
    BIZ("/api/v1/&lt;recurso&gt;<br/>API de negocio · gateway")
    INT("/api/v1/internal/…<br/>entre microservicios · red interna")
    HEALTHR("/health · /health/liveness<br/>probes · sin prefijo ni versión")

    REQ --> PFX
    PFX -- "no" --> HEALTHR
    PFX -- "sí" --> DOCSR
    PFX -- "sí" --> VER
    VER --> BIZ & INT

    classDef bootstrap fill:#c3e7ff,stroke:#494238,stroke-width:2px,color:#3c4747
    classDef health fill:#b6ecf3,stroke:#494238,stroke-width:2px,color:#3c4747
    classDef external fill:#ffd9cb,stroke:#494238,stroke-width:2px,color:#3c4747
    classDef controller fill:#9cceff,stroke:#494238,stroke-width:2px,color:#3c4747
    classDef decision fill:#eeeae4,stroke:#494238,stroke-width:2px,color:#3c4747
    class VER,DOCSR bootstrap
    class HEALTHR health
    class REQ external
    class BIZ,INT controller
    class PFX decision
    linkStyle default stroke-dasharray:6 4
```

## 11. Módulo de ejemplo: `resource`

Es un módulo en la etapa de reglas ([§4.9](architecture/modular-microservice.md#49-cómo-crece-un-módulo)) y
la plantilla que se copia para crear uno nuevo.

Archivos del módulo:

```mermaid
flowchart LR
    subgraph RESF["«package» src/modules/resource/"]
        F1("resource.module.ts<br/>providers: Service · Business · Repository · Mapper<br/>exports: [Service]")
        F2("resource.controller.ts<br/>/resources")
        F3("resource.service.ts<br/>+ .spec.ts · orquesta")
        subgraph FB["«package» business/"]
            F4("resource.business.ts<br/>+ .spec.ts<br/>TRANSIENT · interfaz fluida · RULES")
        end
        subgraph FR["«package» repositories/"]
            F5("resource.repository.ts")
        end
        subgraph FM["«package» mappers/"]
            F6("resource.mapper.ts")
        end
        subgraph FD["«package» dto/"]
            F7("create-resource.dto.ts")
            F8("update-resource.dto.ts<br/>PartialType(OmitType(Create, code))")
            F9("find-resources-query.dto.ts<br/>extiende PaginationQueryDto")
            F10("resource-response.dto.ts<br/>ResourceResponseDto · ResourceCalculationDto")
        end
        subgraph FE["«package» entities/"]
            F11("resource.entity.ts<br/>tabla resources · soft delete")
        end
    end

    classDef modules fill:#efe2c0,stroke:#494238,stroke-width:2px,color:#3c4747
    classDef controller fill:#9cceff,stroke:#494238,stroke-width:2px,color:#3c4747
    classDef service fill:#cdc2fa,stroke:#494238,stroke-width:2px,color:#3c4747
    classDef business fill:#eac393,stroke:#494238,stroke-width:2px,color:#3c4747
    classDef repository fill:#9ad7b1,stroke:#494238,stroke-width:2px,color:#3c4747
    classDef entity fill:#76d9db,stroke:#494238,stroke-width:2px,color:#3c4747
    classDef mapper fill:#f8b6d8,stroke:#494238,stroke-width:2px,color:#3c4747
    classDef models fill:#ffb6b3,stroke:#494238,stroke-width:2px,color:#3c4747
    classDef pkg fill:transparent,stroke:#8a857d,stroke-width:1.5px,stroke-dasharray:5 4
    class F1 modules
    class F2 controller
    class F3 service
    class F4 business
    class F5 repository
    class F11 entity
    class F6 mapper
    class F7,F8,F9,F10 models
    class RESF,FB,FR,FM,FD,FE pkg
    linkStyle default stroke-dasharray:6 4
```

```mermaid
flowchart LR
    subgraph RES["«package» modules/resource"]
        CTRL("«component»<br/>ResourceController")
        SVC("«component»<br/>ResourceService")
        BIZ("«component»<br/>ResourceBusiness<br/>TRANSIENT")
        REPO("«component»<br/>ResourceRepository")
        MAP("«component»<br/>ResourceMapper")
        ENT("«component»<br/>Resource<br/>entity")
    end
    ORM("«component»<br/>Repository&lt;Resource&gt;<br/>TypeORM")

    CTRL --> SVC
    SVC --> REPO & BIZ & MAP
    BIZ --> MAP
    REPO --> ORM
    ORM -.-> ENT

    classDef infra fill:#ded6ce,stroke:#494238,stroke-width:2px,color:#3c4747
    classDef controller fill:#9cceff,stroke:#494238,stroke-width:2px,color:#3c4747
    classDef service fill:#cdc2fa,stroke:#494238,stroke-width:2px,color:#3c4747
    classDef business fill:#eac393,stroke:#494238,stroke-width:2px,color:#3c4747
    classDef repository fill:#9ad7b1,stroke:#494238,stroke-width:2px,color:#3c4747
    classDef entity fill:#76d9db,stroke:#494238,stroke-width:2px,color:#3c4747
    classDef mapper fill:#f8b6d8,stroke:#494238,stroke-width:2px,color:#3c4747
    classDef pkg fill:transparent,stroke:#8a857d,stroke-width:1.5px,stroke-dasharray:5 4
    class ORM infra
    class CTRL controller
    class SVC service
    class BIZ business
    class REPO repository
    class ENT entity
    class MAP mapper
    class RES pkg
    linkStyle default stroke-dasharray:6 4
```

| Método y ruta                    | Service     | Business                                                                                       | Respuesta                        |
| -------------------------------- | ----------- | ---------------------------------------------------------------------------------------------- | -------------------------------- |
| `POST /resources`                | `create`    | —                                                                                              | `201` · `ResourceResponseDto`    |
| `GET /resources`                 | `findAll`   | —                                                                                              | `200` · paginado                 |
| `GET /resources/:id`             | `findOne`   | —                                                                                              | `200`                            |
| `GET /resources/:id/calculation` | `calculate` | `validateEligibility · applyDraftPenalty · applyVolumeDiscount · enforceMinimumAmount · round` | `200` · `ResourceCalculationDto` |
| `PATCH /resources/:id`           | `update`    | `validateEligibility · applyChanges` (→ `transitionTo`)                                        | `200`                            |
| `DELETE /resources/:id`          | `remove`    | —                                                                                              | `204` · soft delete              |

Decisiones que el módulo fija como referencia:

- **Fail-fast en el repository.** `findOneById`, `findOneByCode` y
  `findWithRelationsForCalculation` lanzan `EntityNotFoundException`; `create` lanza
  `DuplicateEntityException` si el `code` existe. El service no tiene ningún `if`.
- **Business transient y síncrono.** `TRANSIENT` da una instancia por consumidor, no por request:
  el service singleton la comparte entre requests. Es seguro porque la cadena no tiene `await` y
  `init()` resetea el estado. Si una regla necesitara E/S, se resuelve en el service antes de
  `init()`; si eso no alcanza, el scope pasa a `Scope.REQUEST`.
- **Trazabilidad de reglas.** Cada regla aplicada agrega una línea a `appliedRules`, que viaja en
  la respuesta del cálculo.
- **Máquina de estados explícita.** `transitionTo` declara las transiciones permitidas en un mapa
  (`DRAFT → ACTIVE|CLOSED`, `ACTIVE → SUSPENDED|CLOSED`, `SUSPENDED → ACTIVE|CLOSED`, `CLOSED → ∅`).
- **Parámetros de negocio como constantes.** `RULES` vive en el business; se mueve a `config/` solo
  si debe variar por entorno.
- **Entidad portable.** `varchar` en vez de `enum` nativo, `decimal` con transformer a `number`,
  fechas sin `type` explícito, `@DeleteDateColumn` para soft delete (§16).

## 12. Secuencia: calcular un recurso

```mermaid
sequenceDiagram
    actor CL as Cliente
    box rgba(239,226,192,0.6) resource
        participant C as ResourceController
        participant S as ResourceService
        participant R as ResourceRepository
        participant B as ResourceBusiness
        participant M as ResourceMapper
    end
    box rgba(222,214,206,0.6) externo
        participant DB as Base de datos
    end

    CL->>C: GET /api/v1/resources/:id/calculation
    C->>S: calculate(id)
    S->>R: findWithRelationsForCalculation(id)
    R->>DB: SELECT … WHERE id
    alt no existe
        R--xCL: EntityNotFoundException → 404
    else existe
        R-->>S: Resource
        S->>B: init(resource)
        S->>B: .validateEligibility()
        alt CLOSED o SUSPENDED
            B--xCL: BusinessRuleViolationException → 422
        else elegible
            S->>B: .applyDraftPenalty().applyVolumeDiscount()<br/>.enforceMinimumAmount().round()
            S->>B: .getCalculationResult()
            B->>M: toCalculationDto(resource, base, ajustes, reglas)
            M-->>S: ResourceCalculationDto
            S-->>C: DTO
            C-->>CL: 200 · data: { resource, baseAmount, adjustments, total, appliedRules }
        end
    end
```

### 12.1. Secuencia: eliminar un recurso

```mermaid
sequenceDiagram
    actor CL as Cliente
    box rgba(239,226,192,0.6) resource
        participant C as ResourceController
        participant S as ResourceService
        participant R as ResourceRepository
    end
    box rgba(222,214,206,0.6) externo
        participant DB as Base de datos
    end

    CL->>C: DELETE /api/v1/resources/:id
    C->>S: remove(id)
    S->>R: softRemove(id)
    R->>R: findOneById(id) (lanza 404 si no existe)
    R->>DB: UPDATE … SET deletedAt = now
    R-->>S: void
    S-->>C: void
    C-->>CL: 204
```

El registro queda en la tabla con `deletedAt`; TypeORM lo excluye de las lecturas siguientes.

## 13. Formas de un módulo: Identity Service

Los nueve módulos restantes implementan el contrato de `identity_service_openapi.yaml` en la etapa
de contrato ([§4.9](architecture/modular-microservice.md#49-cómo-crece-un-módulo)): controllers, DTOs y
services que devuelven stubs tipados con `TODO(RFn)`. Las carpetas `business/`, `entities/`,
`mappers/` y `repositories/` existen con `.gitkeep`.

| Módulo                 | Controllers y ruta base                            | Guard                                       |
| ---------------------- | -------------------------------------------------- | ------------------------------------------- |
| `auth`                 | `/auth` (login, SSO, verify-email, password-reset) | `JwtAuthGuard`; todas las rutas `@Public()` |
| `users`                | `/users` · `/organizations/:id/users`              | `JwtAuthGuard`                              |
| `organizations`        | `/organizations/:id/transfer-ownership`            | `JwtAuthGuard`                              |
| `backoffice`           | `/backoffice` · `/backoffice-client-access`        | `JwtAuthGuard`                              |
| `auth-methods`         | `/auth-methods` · `/users/me/mfa`                  | `JwtAuthGuard`                              |
| `sessions`             | `/sessions` · `/users/me/sessions`                 | `JwtAuthGuard`                              |
| `role-assignments`     | `/role-assignments`                                | `JwtAuthGuard`                              |
| `permission-overrides` | `/permission-overrides`                            | `JwtAuthGuard`                              |
| `internal`             | `/internal/authorize`                              | ninguno (§13.1)                             |

Dependencias actuales entre módulos (solo tipos de `dto/`, sin dependencia en tiempo de ejecución,
[§6.1](architecture/modular-microservice.md#61-dependencias-entre-módulos)):

```mermaid
flowchart LR
    USERS("«component»<br/>users")
    BO("«component»<br/>backoffice")
    AM("«component»<br/>auth-methods")
    RA("«component»<br/>role-assignments")
    SE("«component»<br/>sessions")

    USERS -- "AuthMethodSummary · AuthMethodType" --> AM
    USERS -- "RoleAssignment · RoleAssignmentStatus" --> RA
    USERS -- "SessionSummary" --> SE
    BO -- "User · UserStatus" --> USERS

    classDef modules fill:#efe2c0,stroke:#494238,stroke-width:2px,color:#3c4747
    class USERS,BO,AM,RA,SE modules
    linkStyle default stroke-dasharray:6 4
```

El grafo no tiene ciclos. Cuando estos módulos ganen persistencia, una necesidad de **datos** (no
de forma) se resuelve importando el módulo y su service exportado, nunca su repository.

### 13.1. Rutas internas

`internal` no lleva `JwtAuthGuard` a propósito: el OpenAPI declara `security: []` y la ruta solo es
alcanzable por red interna (mTLS a nivel de infraestructura o service mesh). La protección es de
red, no de aplicación; esta ruta nunca se publica en el API Gateway.

### 13.2. Convenciones heredadas del contrato

Los DTOs de Identity siguen el OpenAPI, no las convenciones de `resource`:

| Aspecto          | `resource`                          | Identity (OpenAPI)                           |
| ---------------- | ----------------------------------- | -------------------------------------------- |
| Nombre de clase  | `CreateResourceDto`, `…ResponseDto` | `CreateUserRequest`, `User`, `TokenPair`     |
| Propiedades      | `camelCase`                         | `snake_case` (`full_name`, `created_at`)     |
| Valores de enum  | inglés (`ACTIVE`)                   | español (`ACTIVO`, `PENDIENTE_VERIFICACION`) |
| Fechas en el DTO | `Date`                              | `string` ISO 8601                            |

Cuando el contrato lo fija un OpenAPI externo, manda el contrato. `common/dto/error.dto.ts` exporta
una clase `Error` que tapa al `Error` nativo: se importa siempre con alias
(`import { Error as ErrorDto } …`).

## Parte III: capacidades transversales

## 14. Configuración y entornos (`src/config`)

Aplica la [§9](architecture/modular-microservice.md#9-arranque-y-entornos).

- `env.validation.ts` declara `EnvironmentVariables` y `validateEnv`. Toda variable nueva se agrega
  ahí con tipo explícito (`PORT: number = 3000`) y `@Type(() => Number)` si es numérica; sin
  anotación, `design:type` es `Object` y la validación falla con cualquier valor.
- `configuration.ts` expone tres namespaces (`app`, `docs`, `logger`) con `registerAs`. Los módulos
  leen por `ConfigService`, no por `process.env`.
- `NODE_ENV` admite solo `dev`, `qa`, `prod` (enum `Environment`). Como Express espera
  `'production'`, `main.ts` hace `app.set('env', 'production')` cuando el entorno es `prod`.

```mermaid
flowchart LR
    FILES[(".env.local<br/>.env<br/>variables del proceso")]
    subgraph CONFIG["«package» src/config"]
        VAL("«component»<br/>validateEnv<br/>EnvironmentVariables")
        SYNC("«component»<br/>assertSafeSynchronize")
        NS("«component»<br/>configuration.ts<br/>app · docs · logger")
        DBO("«component»<br/>buildDataSourceOptions")
        LGP("«component»<br/>buildLoggerParams")
    end
    STOP(["No arranca<br/>error con la variable"])
    CS("«component»<br/>ConfigService<br/>global · cache")
    subgraph BOOT["«package» bootstrap"]
        MAIN("«component»<br/>main.ts")
        APPM("«component»<br/>app.module.ts")
    end

    FILES --> VAL
    VAL -- "inválida" --> STOP
    VAL --> SYNC
    SYNC -- "synchronize fuera de dev" --> STOP
    SYNC -- "válido" --> NS
    NS --> CS
    CS -- "app.* · docs.*" --> MAIN
    CS -- "logger.*" --> LGP
    FILES -- "process.env" --> DBO
    LGP & DBO --> APPM

    classDef bootstrap fill:#c3e7ff,stroke:#494238,stroke-width:2px,color:#3c4747
    classDef config fill:#d5e8c8,stroke:#494238,stroke-width:2px,color:#3c4747
    classDef infra fill:#ded6ce,stroke:#494238,stroke-width:2px,color:#3c4747
    classDef bad fill:transparent,stroke:#dc2626,stroke-width:2px,stroke-dasharray:4 3
    classDef pkg fill:transparent,stroke:#8a857d,stroke-width:1.5px,stroke-dasharray:5 4
    class MAIN,APPM bootstrap
    class VAL,SYNC,NS,DBO,LGP,CS config
    class FILES infra
    class STOP bad
    class CONFIG,BOOT pkg
    linkStyle default stroke-dasharray:6 4
```

Qué decide cada entorno:

```mermaid
flowchart TB
    ENVQ{"NODE_ENV"}
    DEV("<b>dev</b><br/>docs: sí<br/>synchronize: admitido<br/>errores 5xx: detalle real")
    QA("<b>qa</b><br/>docs: sí<br/>synchronize: no arranca<br/>errores 5xx: detalle real")
    PROD("<b>prod</b><br/>docs: no<br/>synchronize: no arranca<br/>errores 5xx: opaco<br/>Express en modo production")
    OTHER(["otro valor<br/>no arranca"])

    ENVQ -- "dev" --> DEV
    ENVQ -- "qa" --> QA
    ENVQ -- "prod" --> PROD
    ENVQ -- "development · production · …" --> OTHER

    classDef config fill:#d5e8c8,stroke:#494238,stroke-width:2px,color:#3c4747
    classDef decision fill:#eeeae4,stroke:#494238,stroke-width:2px,color:#3c4747
    classDef bad fill:transparent,stroke:#dc2626,stroke-width:2px,stroke-dasharray:4 3
    class DEV,QA,PROD config
    class ENVQ decision
    class OTHER bad
    linkStyle default stroke-dasharray:6 4
```

| Comportamiento               | `dev` |      `qa`      |     `prod`     | Dónde se decide                                                             |
| ---------------------------- | :---: | :------------: | :------------: | --------------------------------------------------------------------------- |
| Documentación en `/api/docs` |  sí   |       sí       |     **no**     | `DOCS_ALLOWED_ENVS` · `docsConfig`                                          |
| `DB_SYNCHRONIZE=true`        |  sí   | **no arranca** | **no arranca** | `SYNCHRONIZE_ALLOWED_ENVS` · `assertSafeSynchronize` · `resolveSynchronize` |
| Detalle real de errores 5xx  |  sí   |       sí       |   **opaco**    | `GlobalExceptionFilter.exposeInternals`                                     |

## 15. Contrato de respuesta y errores (`src/common`)

Aplica el principio 5 y la [§7.3](architecture/modular-microservice.md#73-errores).

`ResponseInterceptor` envuelve todo retorno en `ApiResponse<T>`; si el retorno es un
`PaginatedResultDto`, pone `items` en `data` y la metadata en `meta.pagination`.
`GlobalExceptionFilter` (`@Catch()` sin filtro) produce el mismo sobre con `success: false`,
`data: null` y `errors[]`.

```mermaid
flowchart LR
    CTRL("«component»<br/>Controller<br/>retorna dato plano")
    THROW("«component»<br/>cualquier capa<br/>lanza excepción")
    subgraph COMMON["«package» src/common"]
        INT("«component»<br/>ResponseInterceptor")
        PAGQ{"¿PaginatedResultDto?"}
        FIL("«component»<br/>GlobalExceptionFilter")
        MSG("«component»<br/>@ResponseMessage")
    end
    OK("ApiResponse<br/>success: true<br/>data · meta · errors: null")
    OKP("ApiResponse<br/>success: true<br/>data: items · meta.pagination")
    ERR("ApiResponse<br/>success: false<br/>data: null · errors[]")

    CTRL --> INT
    MSG -. "message" .-> INT
    INT --> PAGQ
    PAGQ -- "no" --> OK
    PAGQ -- "sí" --> OKP
    THROW --> FIL --> ERR

    classDef modules fill:#efe2c0,stroke:#494238,stroke-width:2px,color:#3c4747
    classDef common fill:#beecdd,stroke:#494238,stroke-width:2px,color:#3c4747
    classDef external fill:#ffd9cb,stroke:#494238,stroke-width:2px,color:#3c4747
    classDef controller fill:#9cceff,stroke:#494238,stroke-width:2px,color:#3c4747
    classDef decision fill:#eeeae4,stroke:#494238,stroke-width:2px,color:#3c4747
    classDef pkg fill:transparent,stroke:#8a857d,stroke-width:1.5px,stroke-dasharray:5 4
    class THROW modules
    class INT,FIL,MSG common
    class OK,OKP,ERR external
    class CTRL controller
    class PAGQ decision
    class COMMON pkg
    linkStyle default stroke-dasharray:6 4
```

```json
{
  "success": true,
  "statusCode": 200,
  "message": "OK",
  "data": {},
  "meta": { "timestamp": "…", "path": "…" },
  "errors": null
}
```

El filtro resuelve en este orden:

```mermaid
flowchart TB
    E(["excepción"])
    Q1{"1 · ¿DomainException?"}
    Q2{"2 · ¿HttpException?<br/>incluye ValidationPipe"}
    Q3{"3 · ¿QueryFailedError?"}
    Q4{"4 · ¿trae status 4xx?<br/>body-parser y compañía"}
    R1("status de DOMAIN_EXCEPTION_STATUS<br/>(400 si no está registrada)<br/>code de la excepción · details")
    R2("su status<br/>un error por mensaje de validación")
    R3("500 · DATABASE_ERROR")
    R4("ese 4xx · BAD_REQUEST")
    R5("500 · INTERNAL_SERVER_ERROR")
    LOG("log con tipo y stack<br/>solo si status ≥ 500")
    OPQ("detalle real en dev y qa<br/>mensaje opaco en prod")

    E --> Q1
    Q1 -- "sí" --> R1
    Q1 -- "no" --> Q2
    Q2 -- "sí" --> R2
    Q2 -- "no" --> Q3
    Q3 -- "sí" --> R3
    Q3 -- "no" --> Q4
    Q4 -- "sí" --> R4
    Q4 -- "no" --> R5
    R3 & R5 --> LOG
    R3 & R5 -.-> OPQ

    classDef modules fill:#efe2c0,stroke:#494238,stroke-width:2px,color:#3c4747
    classDef common fill:#beecdd,stroke:#494238,stroke-width:2px,color:#3c4747
    classDef decision fill:#eeeae4,stroke:#494238,stroke-width:2px,color:#3c4747
    class E modules
    class R1,R2,R3,R4,R5,LOG,OPQ common
    class Q1,Q2,Q3,Q4 decision
    linkStyle default stroke-dasharray:6 4
```

Jerarquía de excepciones de dominio:

```mermaid
classDiagram
    class Error
    class DomainException {
        <<abstract>>
        +string code
        +Record details
    }
    class EntityNotFoundException {
        404 · ENTITY_NOT_FOUND
    }
    class DuplicateEntityException {
        409 · DUPLICATE_ENTITY
    }
    class BusinessRuleViolationException {
        422 · BUSINESS_RULE_VIOLATION
    }
    class InvalidOperationException {
        400 · INVALID_OPERATION
    }
    class ForbiddenOperationException {
        403 · FORBIDDEN_OPERATION
    }
    class ExternalServiceException {
        502 · EXTERNAL_SERVICE_ERROR
    }
    Error <|-- DomainException
    DomainException <|-- EntityNotFoundException
    DomainException <|-- DuplicateEntityException
    DomainException <|-- BusinessRuleViolationException
    DomainException <|-- InvalidOperationException
    DomainException <|-- ForbiddenOperationException
    DomainException <|-- ExternalServiceException
```

| Excepción de dominio             | HTTP | `code`                    |
| -------------------------------- | ---- | ------------------------- |
| `EntityNotFoundException`        | 404  | `ENTITY_NOT_FOUND`        |
| `DuplicateEntityException`       | 409  | `DUPLICATE_ENTITY`        |
| `BusinessRuleViolationException` | 422  | `BUSINESS_RULE_VIOLATION` |
| `InvalidOperationException`      | 400  | `INVALID_OPERATION`       |
| `ForbiddenOperationException`    | 403  | `FORBIDDEN_OPERATION`     |
| `ExternalServiceException`       | 502  | `EXTERNAL_SERVICE_ERROR`  |

Una excepción nueva extiende `DomainException` en `domain-exceptions.ts` **y** se registra en
`DOMAIN_EXCEPTION_STATUS`; si no, cae en 400 por defecto.

Documentación del sobre en OpenAPI: `@ApiStandardResponse(Dto, status, descripción)` y
`@ApiPaginatedResponse(Dto)`. El mensaje se personaliza con `@ResponseMessage('…')`.

`ValidationPipe` global: `whitelist`, `forbidNonWhitelisted`, `transform`, sin conversión
implícita. Un campo no declarado en el DTO es un 400.

## 16. Persistencia y portabilidad (`database.config.ts`)

```mermaid
flowchart TB
    T{"DB_TYPE"}
    FILE("sqlite · better-sqlite3<br/>database = ruta o :memory:")
    PG("postgres (por defecto)<br/>schema = DB_SCHEMA · public<br/>ssl")
    MY("mysql · mariadb<br/>utf8mb4 · timezone Z<br/>ssl")
    MS("mssql<br/>schema = dbo<br/>encrypt = DB_SSL")
    SSL{"DB_SSL"}
    SSLON("rejectUnauthorized: true<br/>+ ca = DB_SSL_CA")
    SSLOFF("sin TLS")
    SY{"DB_SYNCHRONIZE=true<br/>y NODE_ENV=dev?"}
    SYON("synchronize: true")
    SYOFF("synchronize: false")
    OPTS("DataSourceOptions<br/>entities: **/*.entity{.ts,.js}")

    T --> FILE & PG & MY & MS
    PG & MY --> SSL
    SSL -- "true" --> SSLON
    SSL -- "false" --> SSLOFF
    FILE & SSLON & SSLOFF & MS --> SY
    SY -- "sí" --> SYON
    SY -- "no" --> SYOFF
    SYON & SYOFF --> OPTS

    classDef config fill:#d5e8c8,stroke:#494238,stroke-width:2px,color:#3c4747
    classDef infra fill:#ded6ce,stroke:#494238,stroke-width:2px,color:#3c4747
    classDef decision fill:#eeeae4,stroke:#494238,stroke-width:2px,color:#3c4747
    class SSLON,SSLOFF,SYON,SYOFF,OPTS config
    class FILE,PG,MY,MS infra
    class T,SSL,SY decision
    linkStyle default stroke-dasharray:6 4
```

- `buildDataSourceOptions(env)` es la única fuente de verdad de la conexión. Cambiar de motor es
  cambiar `DB_TYPE` e instalar el driver (`pg` incluido; `mysql2`, `mssql`, `sqlite3` a pedido;
  `better-sqlite3` como devDependency para e2e).
- Las entidades se registran por glob (`**/*.entity{.ts,.js}`): un módulo nuevo no toca la
  configuración del ORM, solo declara `TypeOrmModule.forFeature([Entidad])`.
- Tipos portables: sin `enum` nativo, `jsonb` ni `uuid` propietario; fechas sin `type` explícito.
- TLS: con `DB_SSL=true`, `rejectUnauthorized` es siempre `true`; una CA propia va en `DB_SSL_CA`.
- `synchronize`: apagado por defecto, permitido solo en `dev`, con doble barrera (validación de
  entorno y `resolveSynchronize`).
- **Migraciones: todavía no existen.** El README lista lo que hay que reponer (`typeorm.datasource.ts`,
  opciones `migrations*`, `DB_MIGRATIONS_RUN`, scripts). Hasta entonces, el esquema en `qa`/`prod`
  se crea por fuera.

## 17. Seguridad

Barreras por las que pasa cada petición, en el orden de ejecución de Nest:

```mermaid
flowchart LR
    IN(["Petición"])
    H("«component»<br/>helmet<br/>CSP estricto<br/>(docs: CSP con CDN de Scalar)")
    C("«component»<br/>CORS<br/>lista blanca CORS_ORIGINS")
    G{"JwtAuthGuard<br/>¿@Public()?"}
    GJ("validar JWT<br/>⚠ stub: hoy siempre pasa")
    V("«component»<br/>ValidationPipe<br/>whitelist · forbidNonWhitelisted")
    CT("«component»<br/>Controller")
    L("«component»<br/>logger<br/>redact: authorization · cookie<br/>password · token")

    IN --> H --> C --> G
    G -- "sí" --> V
    G -- "no" --> GJ --> V
    V --> CT
    IN -. "una línea por request" .-> L

    classDef bootstrap fill:#c3e7ff,stroke:#494238,stroke-width:2px,color:#3c4747
    classDef common fill:#beecdd,stroke:#494238,stroke-width:2px,color:#3c4747
    classDef config fill:#d5e8c8,stroke:#494238,stroke-width:2px,color:#3c4747
    classDef external fill:#ffd9cb,stroke:#494238,stroke-width:2px,color:#3c4747
    classDef controller fill:#9cceff,stroke:#494238,stroke-width:2px,color:#3c4747
    classDef decision fill:#eeeae4,stroke:#494238,stroke-width:2px,color:#3c4747
    class H,C,V bootstrap
    class GJ common
    class L config
    class IN external
    class CT controller
    class G decision
    linkStyle default stroke-dasharray:6 4
```

- `helmet()` global con CSP estricto; un segundo `helmet()` solo en la ruta de docs permite el CDN de
  Scalar (`cdn.jsdelivr.net`).
- CORS con lista blanca `CORS_ORIGINS`; vacía = ningún origen cruzado. Nunca `origin: true`.
- Autenticación: `JwtAuthGuard` + `@Public()`. Hoy el guard es un **stub que siempre deja pasar**
  (`TODO: validar JWT real`) y se aplica por controller con `@UseGuards`. El objetivo, según el
  README, es registrarlo como `APP_GUARD` global para que un endpoint olvidado quede cerrado.
- El logger elimina `authorization`, `cookie`, `password` y `token` (`redact.remove`).
- Sin rate limiting: lo resuelve el gateway o cada proyecto.

## 18. Observabilidad

```mermaid
flowchart LR
    REQ(["Petición"])
    RID("genReqId<br/>x-request-id · x-correlation-id<br/>o UUID")
    SIL{"¿/health?"}
    NOLOG("sin log")
    PH("«component»<br/>pino-http<br/>req: id · method · url<br/>res: statusCode")
    LVL{"status"}
    INFO("INFO")
    WARN("WARN")
    ERRL("ERROR")
    FIL("«component»<br/>GlobalExceptionFilter<br/>err con tipo y stack")
    OUT[("salida<br/>LOG_PRETTY=true: una línea coloreada<br/>prod: JSON + service")]

    REQ --> RID --> SIL
    SIL -- "sí" --> NOLOG
    SIL -- "no" --> PH --> LVL
    LVL -- "< 400" --> INFO
    LVL -- "4xx" --> WARN
    LVL -- "5xx" --> ERRL
    ERRL -. "causa raíz (única)" .-> FIL
    INFO & WARN & ERRL & FIL --> OUT

    classDef common fill:#beecdd,stroke:#494238,stroke-width:2px,color:#3c4747
    classDef config fill:#d5e8c8,stroke:#494238,stroke-width:2px,color:#3c4747
    classDef external fill:#ffd9cb,stroke:#494238,stroke-width:2px,color:#3c4747
    classDef infra fill:#ded6ce,stroke:#494238,stroke-width:2px,color:#3c4747
    classDef decision fill:#eeeae4,stroke:#494238,stroke-width:2px,color:#3c4747
    classDef info fill:#c3e7b4,stroke:#494238,stroke-width:2px,color:#3c4747
    classDef warn fill:#f9dd97,stroke:#494238,stroke-width:2px,color:#3c4747
    classDef error fill:#ffb7b7,stroke:#494238,stroke-width:2px,color:#3c4747
    class FIL common
    class RID,PH,NOLOG config
    class INFO info
    class WARN warn
    class ERRL error
    class REQ external
    class OUT infra
    class SIL,LVL decision
    linkStyle default stroke-dasharray:6 4
```

Probes de salud:

```mermaid
flowchart LR
    K8S(["orquestador<br/>HEALTHCHECK de Docker"])
    LIV("GET /health/liveness<br/>{ status: ok }<br/>no toca dependencias")
    RDY("GET /health<br/>terminus")
    DBP("pingCheck database<br/>timeout 3 s")
    MEM("checkHeap<br/>512 MB")

    K8S -- "¿vive?" --> LIV
    K8S -- "¿listo?" --> RDY
    RDY --> DBP & MEM

    classDef health fill:#b6ecf3,stroke:#494238,stroke-width:2px,color:#3c4747
    classDef infra fill:#ded6ce,stroke:#494238,stroke-width:2px,color:#3c4747
    class LIV,RDY,DBP,MEM health
    class K8S infra
    linkStyle default stroke-dasharray:6 4
```

- **Una línea por request** (pino-http): serializers que recortan `req`/`res`, nivel por status
  (5xx `error`, 4xx `warn`, resto `info`), `/health` silenciado.
- **Un solo dueño del stack trace**: `GlobalExceptionFilter`, solo en 5xx. `LoggerErrorInterceptor`
  no se registra y el `err` sintético de pino-http se descarta.
- **Correlación**: `genReqId` respeta `x-request-id` / `x-correlation-id` o genera un UUID. Cada
  línea lleva `service: APP_NAME`.
- `LOG_PRETTY=true` en desarrollo; en `prod`, JSON por línea.
- **Health** (`@nestjs/terminus`): `/health` comprueba la BD (`pingCheck`, 3 s) y el heap (512 MB);
  `/health/liveness` no toca dependencias y es la que usa el `HEALTHCHECK` del contenedor.

## 19. Documentación de la API

```mermaid
flowchart LR
    DEC("decoradores<br/>@ApiProperty · @ApiOperation<br/>@ApiStandardResponse · @ApiPaginatedResponse")
    PLG("plugin de nest-cli.json<br/>classValidatorShim · introspectComments")
    SW("«component»<br/>@nestjs/swagger<br/>SwaggerModule.createDocument")
    EN{"docs.enabled<br/>NODE_ENV ∈ {dev, qa}<br/>y DOCS_ENABLED ≠ false"}
    SC("«component»<br/>Scalar apiReference<br/>GET /api/docs (ruta exacta)")
    NO("sin docs publicadas")
    OAS[("identity_service_openapi.yaml<br/>contrato de referencia")]

    DEC & PLG --> SW --> EN
    EN -- "sí" --> SC
    EN -- "no" --> NO
    SW -. "debe coincidir" .- OAS

    classDef bootstrap fill:#c3e7ff,stroke:#494238,stroke-width:2px,color:#3c4747
    classDef external fill:#ffd9cb,stroke:#494238,stroke-width:2px,color:#3c4747
    classDef models fill:#ffb6b3,stroke:#494238,stroke-width:2px,color:#3c4747
    classDef decision fill:#eeeae4,stroke:#494238,stroke-width:2px,color:#3c4747
    class PLG,SW,NO,SC bootstrap
    class OAS external
    class DEC models
    class EN decision
    linkStyle default stroke-dasharray:6 4
```

`@nestjs/swagger` genera el documento desde los decoradores y el plugin de `nest-cli.json`
(`classValidatorShim`, `introspectComments`); Scalar lo renderiza en `/<API_PREFIX>/<DOCS_PATH>`
con `server.get` sobre la ruta exacta. No se publica el JSON crudo. Solo en `dev` y `qa`.

Para Identity, `identity_service_openapi.yaml` es el contrato de referencia: el documento que genera
el código debe coincidir con él en rutas, cuerpos y respuestas.

## 20. Empaquetado y despliegue

```mermaid
flowchart LR
    BASE("«component»<br/>pnpm-base<br/>node:22-alpine · corepack")
    BUILD("«component»<br/>builder<br/>install --frozen-lockfile · nest build")
    PDEPS("«component»<br/>prod-deps<br/>install --prod")
    RUN("«component»<br/>runtime<br/>tini · usuario app · HEALTHCHECK")

    BASE --> BUILD & PDEPS
    BUILD -- "dist/" --> RUN
    PDEPS -- "node_modules/" --> RUN

    classDef infra fill:#ded6ce,stroke:#494238,stroke-width:2px,color:#3c4747
    class BASE,BUILD,PDEPS,RUN infra
    linkStyle default stroke-dasharray:6 4
```

- Imagen multi-etapa; la final no tiene devDependencies ni código fuente, corre como usuario sin
  privilegios bajo `tini`.
- `pnpm-lock.yaml` versionado; en CI, `pnpm install --frozen-lockfile`.
- pnpm bloquea los scripts de instalación: un paquete con binarios nativos se autoriza en
  `pnpm-workspace.yaml > allowBuilds`.
- `docker-compose.yml` levanta `api` (`NODE_ENV=prod`) y `postgres:16`. Como `prod` no admite
  `synchronize`, el esquema no se crea solo (§16).

## Anexo A: verificación

| Comando                          | Verifica                                                                |
| -------------------------------- | ----------------------------------------------------------------------- |
| `pnpm build`                     | Tipos y compilación.                                                    |
| `pnpm lint`                      | ESLint con `recommendedTypeChecked` y Prettier.                         |
| `pnpm test`                      | Unitarios: business, service, config.                                   |
| `pnpm test:e2e`                  | E2E contra sqlite en memoria: sobre, errores, paginación, portabilidad. |
| `pnpm install --frozen-lockfile` | Lockfile sincronizado con `package.json`.                               |

Las reglas de capas y privacidad de la [§6](architecture/modular-microservice.md#6-reglas-de-dependencia-y-privacidad)
**hoy se verifican en revisión**, no con el linter. Para automatizarlas haría falta una regla de
imports (por ejemplo `no-restricted-imports` o un plugin de límites) que prohíba importar
`repositories/`, `business/`, `mappers/` y `entities/` de otro módulo, y la detección de ciclos.

## Anexo B: desvíos conocidos

Estado al 2026-11-03. Cada punto es una diferencia entre este documento y el código.

| Desvío                                                                                                          | Dónde                                 | Efecto                                                                                  |
| --------------------------------------------------------------------------------------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------- |
| `UpdateResourceDto` redeclara `amount` y `status` como `undefined` y `name`/`description` como obligatorios.    | `resource/dto/update-resource.dto.ts` | `pnpm test` falla al compilar `resource.service.spec.ts` y `resource.business.spec.ts`. |
| La imagen fija `NODE_ENV=production`, valor que `validateEnv` rechaza.                                          | `Dockerfile` (etapa `runtime`)        | El contenedor solo arranca si se sobrescribe `NODE_ENV` (compose lo hace con `prod`).   |
| `JwtAuthGuard` es un stub que siempre deja pasar y se aplica por controller, no como `APP_GUARD`.               | `common/guards/jwt-auth.guard.ts`     | Ningún endpoint está protegido; `resource` ni siquiera declara el guard.                |
| Las reglas de capas no las verifica el linter.                                                                  | `eslint.config.mjs`                   | Ver Anexo A.                                                                            |
| Sin migraciones.                                                                                                | `config/database.config.ts`           | El esquema en `qa`/`prod` se crea por fuera (§16).                                      |
| El contrato `/internal/authorize` vive en un módulo `internal`, organizado por quién lo usa y no por capacidad. | `src/modules/internal/`               | Contradice el principio 1: los módulos se organizan por capacidad de dominio.           |
