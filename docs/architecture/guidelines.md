# Lineamientos de arquitectura de microservicios (backend)

Arquitectura de referencia para un **microservicio modular** (`ms-<dominio>`): un servicio HTTP que
contiene un solo dominio, organizado por módulos. No nombra módulos concretos:
`docs/architecture.md` muestra cómo se aplica en este template.

Un `ms-` nace de extraer un dominio de un monolito modular.

| Término     | Qué es                                                                                                | Ejemplo                 |
| ----------- | ----------------------------------------------------------------------------------------------------- | ----------------------- |
| **Dominio** | Contexto acotado de negocio, con datos, reglas y lenguaje propios. Un `ms-` contiene exactamente uno. | `identity`, `academic`  |
| **Módulo**  | Una capacidad dentro del dominio, con la anatomía de la [§4](#4-anatomía-de-un-módulo).               | `users`, `sessions`     |
| **Evento**  | Hecho de negocio ya ocurrido, publicado por el dominio dueño ([§10](#10-eventos)).                    | `identity.user.created` |

## 1. Principios

1. **Por módulo de dominio; dentro, por rol técnico.** Todo lo de una capacidad vive en su carpeta
   de `modules/`; dentro de ella, cada pieza tiene un rol fijo (controller, service, business, lib,
   repository, mapper, models, entidad).
2. **Dependencias en una sola dirección y sin ciclos.** Los módulos usan `common` y `config`, nunca
   al revés. Un módulo usa otro por su contrato público, nunca por una pieza interna.
3. **Cada pieza hace una sola cosa.** El controller recibe, el service coordina, el business
   concentra la lógica de negocio, el lib ofrece cálculos puros genéricos, el repository consulta, el
   mapper traduce.
4. **El modelo de persistencia no sale del módulo.** La entidad ORM no se expone al cliente ni a
   otro módulo: hacia afuera viajan DTOs.
5. **Un solo contrato de respuesta.** Éxitos y errores salen con el mismo sobre, armado por piezas
   transversales; ningún controller lo arma a mano.
6. **Fallar pronto y en el lugar correcto.** El entorno inválido impide arrancar; lo que no existe
   lo detecta el repository; la regla rota la detecta el business. Cada capa lanza excepciones de
   dominio y una sola pieza las traduce a HTTP.
7. **Seguro por defecto.** Lo peligroso (sincronizar esquema, publicar docs, CORS abierto, detalle de
   errores) está apagado salvo que el entorno lo admita expresamente.
8. **Extender copiando el módulo de ejemplo.** Un módulo nuevo nace de la plantilla; no se crean
   capas ni carpetas que el módulo no necesita todavía.

## 2. Contexto

```mermaid
flowchart LR
    subgraph PUB["«zone» Red pública"]
        C(["Cliente<br/>web · móvil · backoffice"])
    end
    GW["«component»<br/>API Gateway"]
    subgraph INT["«zone» Red interna"]
        MS["«component»<br/>Microservicio"]
        OTH["«component»<br/>Otros microservicios"]
        DB[("Base de datos<br/>propia")]
    end

    C -- "HTTPS + token" --> GW
    GW -- "/api/v1/…" --> MS
    GW -- "/api/v1/…" --> OTH
    OTH -- "/api/v1/… · mTLS" --> MS
    MS -- "lee y escribe" --> DB

    classDef zonePub fill:transparent,stroke:#a07c3b,stroke-dasharray:4 3
    classDef zoneInt fill:transparent,stroke:#2563eb,stroke-dasharray:4 3
    classDef ext fill:transparent,stroke:#a07c3b,stroke-width:2px
    classDef gw fill:transparent,stroke:#475569,stroke-width:2px
    classDef other fill:transparent,stroke:#2563eb,stroke-width:2px
    classDef main fill:transparent,stroke:#e11d74,stroke-width:4px
    class PUB zonePub
    class INT zoneInt
    class C,DB ext
    class GW gw
    class OTH other
    class MS main
```

- Cada microservicio es dueño de su base de datos; ningún otro servicio la lee directamente.
- El tráfico de usuarios entra por el gateway con un token; el gateway es la frontera entre la red
  pública y la interna y enruta hacia la API (`/api/v1/…`) de cada microservicio.
- Las probes de salud (`/health`) quedan fuera del prefijo y de la versión de la API.

## 3. Capas

```mermaid
flowchart TB
    BOOT["<b>bootstrap</b><br/>main · app.module<br/>pipes · interceptor · filtro · seguridad"]
    MOD["<b>modules</b><br/>una carpeta por capacidad de dominio<br/>A usa el contrato público de B, sin ciclos"]
    HEALTH["<b>health</b><br/>probes"]
    COMMON["<b>common</b><br/>contrato de respuesta · excepciones<br/>paginación · guards · decoradores"]
    CONFIG["<b>config</b><br/>entorno validado · conexión a BD · logger"]

    BOOT == "registra" ==> MOD
    BOOT == "registra" ==> HEALTH
    BOOT == "configura con" ==> CONFIG
    BOOT == "aplica" ==> COMMON
    MOD == "usa" ==> COMMON
    COMMON -. "solo el enum de entornos" .-> CONFIG

    classDef app fill:transparent,stroke:#475569,stroke-width:2px
    classDef feature fill:transparent,stroke:#2563eb,stroke-width:2px
    classDef core fill:transparent,stroke:#d14343,stroke-width:2px
    classDef shared fill:transparent,stroke:#2f9254,stroke-width:2px
    class BOOT app
    class MOD,HEALTH feature
    class CONFIG core
    class COMMON shared
```

| Capa        | Responsabilidad                                                                        | Puede depender de                         | No depende de                                    |
| ----------- | -------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------ |
| `bootstrap` | Arrancar, aplicar lo transversal (seguridad, validación, sobre, errores) y registrar.  | `modules`, `health`, `common`, `config`   | —                                                |
| `modules`   | Implementar cada capacidad de dominio.                                                 | `common`, contrato público de otro módulo | Piezas internas de otro módulo; `config` directo |
| `health`    | Informar si el proceso y sus dependencias responden.                                   | `common`                                  | `modules`                                        |
| `common`    | Piezas transversales sin dominio: sobre de respuesta, excepciones, paginación, guards. | `config` (solo el enum de entornos)       | `modules`                                        |
| `config`    | Leer y validar el entorno; construir conexión a BD y logger.                           | —                                         | `modules`, `common`                              |

Un módulo no lee `process.env`: recibe la configuración por `ConfigService` o por parámetros. La
única excepción hacia `config` desde `common` es el enum de entornos que usa el filtro de errores
para decidir si expone el detalle.

## 4. Anatomía de un módulo

Un módulo implementa una capacidad del dominio (usuarios, sesiones, pagos). Reúne en una carpeta de
`modules/` todo lo de esa capacidad: su API HTTP, sus reglas, sus datos y sus definiciones. Hacia
afuera solo expone su service y sus DTOs y enums; lo demás es interno
([§6](#6-reglas-de-dependencia-y-privacidad)).

`<x>` es el nombre del módulo en singular (`resource`, `user`); `<X>`, el mismo nombre en
PascalCase (`Resource`, `User`).

### 4.1. Archivos principales

```
modules/<x>/
├── <x>.module.ts
├── <x>.controller.ts
├── <x>.service.ts
└── <x>.service.spec.ts
```

Todo módulo los tiene desde que nace.

- **`<x>.module.ts`**: declara los controllers, registra como providers el
  service y las piezas de las carpetas (repository, mapper, business) e importa
  `TypeOrmModule.forFeature([<X>])` si el módulo tiene entidad. **Exporta solo el service**
  ([§6](#6-reglas-de-dependencia-y-privacidad)).
- **`<x>.controller.ts`**: declara las rutas, valida la entrada con DTOs y pipes, documenta el
  endpoint y delega en el service. Devuelve el dato plano: no arma el sobre de respuesta ni captura
  excepciones. Un módulo puede tener más de un controller cuando sus rutas cuelgan de recursos
  distintos (por ejemplo `/<x>` y `/<padre>/:id/<x>`, en `<padre>-<x>.controller.ts`); todos
  delegan en el mismo service.
- **`<x>.service.ts`**: coordina repository, business, mapper y services de otros
  módulos; no decide, no consulta y no calcula. Es la única pieza que otros módulos pueden usar.
- **`<x>.service.spec.ts`**: nace cuando el service deja de devolver stubs.

### 4.2. `models/`: DTOs, enums, interfaces, tipos y constantes

```
modules/<x>/models/
├── dto/
│   ├── create-<x>.dto.ts
│   ├── update-<x>.dto.ts
│   ├── find-<x>s-query.dto.ts
│   └── <x>-response.dto.ts
├── enums/
│   └── <x>-status.enum.ts
├── interfaces/
│   └── <x>-<forma>.interface.ts
├── types/
│   └── <x>.types.ts
└── constants/
    └── <x>.constants.ts
```

- **`dto/`** (público): el contrato HTTP con el cliente.
  - `create-<x>.dto.ts`: el cuerpo de creación, con `class-validator` en cada campo.
  - `update-<x>.dto.ts`: `PartialType(OmitType(Create<X>Dto, [campos inmutables]))`. No vuelve a
    declarar los campos que hereda.
  - `find-<x>s-query.dto.ts`: los parámetros de un listado. Extiende `PaginationQueryDto` y suma sus
    filtros.
  - `<x>-response.dto.ts`: la salida. Nunca es la entidad, y solo la arma el mapper.
  - Existen los DTOs que las rutas necesitan: un módulo sin listado no tiene `find-…-query.dto.ts`.
- **`enums/`** (público): valores cerrados del dominio (estados, tipos), uno por archivo.
- **`interfaces/`** (privado): formas internas que no son contrato HTTP: el resultado del business, los datos
  que recibe el mapper, las opciones de un método.
- **`types/`** (privado): alias y uniones de tipos (`type <X>Code = string`, uniones de literales).
- **`constants/`** (privado): valores fijos que no son reglas de negocio: largos máximos, valores
  por defecto, claves. Los umbrales y tasas van en el business ([§4.6](#46-business-reglas-de-negocio)).

Reglas:

- **Solo definiciones.** Sin lógica, sin E/S, sin services ni ORM. Los DTOs pueden usar los
  decoradores de `class-validator`, `class-transformer` y `@nestjs/swagger`.
- **No depende del resto del módulo.** Las demás piezas importan de `models/`; `models/` no importa
  de ninguna de ellas.
- **Cada subcarpeta aparece cuando hace falta.** Un módulo de contrato suele tener solo `dto/` y
  `enums/`.
- **La entidad no va aquí:** vive en `entities/`.
- Si un OpenAPI externo fija los nombres y la forma de los DTOs, manda el contrato.

### 4.3. `entities/`: modelo de persistencia

```
modules/<x>/entities/
└── <x>.entity.ts
```

- Usa tipos portables entre motores: sin `enum` nativo, `jsonb` ni `uuid` propietario.
- No sale del módulo (principio 4).

### 4.4. `repositories/`: consultas

```
modules/<x>/repositories/
└── <x>.repository.ts
```

- Es la única pieza que inyecta `Repository<<X>>`, `DataSource` o `EntityManager`.
- Si busca por identificador y no encuentra, **lanza** `EntityNotFoundException`: el retorno es
  `Promise<T>`, nunca `Promise<T | null>`. Si el dato ya existe, lanza `DuplicateEntityException`.
- Los listados devuelven `PaginatedResultDto<T>`, nunca un array suelto.
- Uno por entidad.

### 4.5. `mappers/`: entidad → DTO

```
modules/<x>/mappers/
└── <x>.mapper.ts
```

- Convierte la entidad en DTO de salida con funciones puras.
- Es el único lugar donde se arma un DTO de salida.

### 4.6. `business/`: reglas de negocio

```
modules/<x>/business/
├── <x>.business.ts
└── <x>.business.spec.ts
```

- **Centraliza la lógica de negocio completa** del módulo: reglas, validaciones, transiciones de
  estado y los cálculos propios del negocio.
- Interfaz fluida: `init(entidad)` abre la cadena y resetea el estado, cada regla devuelve `this` y
  un método terminal entrega el resultado.
- **Todos sus métodos son síncronos.** El service trae de la BD lo que las reglas necesitan antes
  de `init()`.
- Cuando una regla no se cumple, lanza una excepción de dominio (`BusinessRuleViolationException`).
- Los parámetros de negocio (umbrales, tasas) son constantes del propio business.
- El spec es obligatorio.

### 4.7. `libs/`: cálculos puros genéricos

```
modules/<x>/libs/
├── <cálculo>.lib.ts
└── <cálculo>.lib.spec.ts
```

- **Centraliza cálculos puros transversales o genéricos** que no encierran ninguna regla de negocio:
  redondeos, porcentajes, prorrateos, diferencias de fechas, conversiones de unidades.
- Se nombra por el cálculo (`rounding.lib.ts`), no por el módulo.
- Son deterministas, síncronos y sin estado. No son providers: se importan directo.
- No hacen E/S, no leen configuración, no usan el ORM y no lanzan excepciones de dominio.
- Si otro módulo necesita el mismo cálculo, baja a `common`.

### 4.8. Estructura completa

```
modules/<x>/
├── <x>.module.ts                 # registra controllers y providers · exporta solo el service
├── <x>.controller.ts             # rutas, validación, documentación; delega en el service
├── <x>.service.ts                # coordina: repository · business · mapper
├── <x>.service.spec.ts
│
├── models/                       # solo definiciones; no importa el resto del módulo
│   ├── dto/                      # público: contrato HTTP
│   │   ├── create-<x>.dto.ts     # entrada: class-validator
│   │   ├── update-<x>.dto.ts     # entrada: PartialType(OmitType(Create…, campos inmutables))
│   │   ├── find-<x>s-query.dto.ts # listado: extiende PaginationQueryDto
│   │   └── <x>-response.dto.ts   # salida: nunca la entidad
│   ├── enums/                    # público: <x>-status.enum.ts
│   ├── interfaces/               # privado: resultado del business, datos del mapper
│   ├── types/                    # privado: alias y uniones
│   └── constants/                # privado: valores fijos que no son reglas de negocio
├── events/                       # opcional: esquemas de los eventos que publica (§10)
│   └── <x>-<hecho>.event.ts
├── entities/
│   └── <x>.entity.ts             # modelo ORM, tipos portables
├── repositories/
│   └── <x>.repository.ts         # única puerta al ORM; lanza EntityNotFoundException
├── mappers/
│   └── <x>.mapper.ts             # entidad → DTO de salida
├── business/
│   ├── <x>.business.ts           # reglas, validaciones, transiciones; síncrono
│   └── <x>.business.spec.ts
└── libs/                         # opcional
    ├── <cálculo>.lib.ts          # cálculo puro genérico; no es provider, se importa directo
    └── <cálculo>.lib.spec.ts
```

El módulo `resource` del template tiene todo salvo `libs/` y `events/`.

### 4.9. Cómo crece un módulo

| Etapa        | Cuándo                                                       | Carpetas                                      | Qué cambia                                                                                          |
| ------------ | ------------------------------------------------------------ | --------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Contrato     | El contrato está acordado y se publica antes que la lógica.  | Archivos principales + `models/`              | El module registra controller y service. El service devuelve stubs tipados con `TODO(<requisito>)`. |
| Persistencia | Hay datos propios que leer o escribir, sin reglas.           | + `entities/` · `repositories/` · `mappers/`  | El module importa `TypeOrmModule.forFeature` y registra repository y mapper. Se acaban los stubs.   |
| Reglas       | Hay un `if` de negocio, un cálculo o una máquina de estados. | + `business/`                                 | El module registra el business. El service encadena `init(…).regla()` en vez de decidir.            |
| —            | Hace falta un cálculo puro genérico, sin regla de negocio.   | + `libs/` (en cualquier etapa)                | Nada en el module: los libs no se registran.                                                        |
| —            | Solo se combinan datos de otros módulos.                     | Archivos principales + `models/`, sin entidad | El module importa los módulos dueños; el service usa sus services exportados.                       |

## 5. Roles de los elementos

Cómo se relacionan las piezas de un módulo. Qué hace cada una está en la [§4](#4-anatomía-de-un-módulo).

```mermaid
flowchart LR
    subgraph MOD["«package» módulo"]
        CTRL["«component»<br/>controller"]
        DTO["«component»<br/>models/<br/>dto · enums · interfaces<br/>types · constants"]
        SVC["«component»<br/>service<br/>coordinación"]
        BIZ["«component»<br/>business/<br/>reglas"]
        LIB["«component»<br/>libs/<br/>cálculo puro genérico"]
        REPO["«component»<br/>repositories/<br/>consultas"]
        MAP["«component»<br/>mappers/<br/>entidad → DTO"]
        ENT["«component»<br/>entities/<br/>modelo ORM"]
    end
    subgraph COMMON["«package» common"]
        EXC["«component»<br/>excepciones<br/>de dominio"]
        PAG["«component»<br/>PaginatedResultDto"]
    end
    OTHER["«component»<br/>service de<br/>otro módulo"]
    DB[("Base de datos")]

    CTRL -- "DTO validado" --> SVC
    CTRL -.-> DTO
    SVC -- "lee y guarda" --> REPO
    SVC -- "init(…).regla().regla()" --> BIZ
    SVC -- "arma salida" --> MAP
    SVC -- "contrato público" --> OTHER
    BIZ -- "resultado" --> MAP
    BIZ -- "usa" --> LIB
    MAP -. "usa" .-> LIB
    REPO --> ENT
    REPO --> DB
    REPO -. "no existe / duplicado" .-> EXC
    BIZ -. "regla rota" .-> EXC
    REPO -.-> PAG
    MAP -.-> DTO

    classDef pkgFeature fill:transparent,stroke:#2563eb,stroke-dasharray:4 3
    classDef root fill:transparent,stroke-width:2px
    classDef comp fill:transparent,stroke:#c79a00,stroke-width:2px
    classDef service fill:transparent,stroke:#6a9a12,stroke-width:2px
    classDef store fill:transparent,stroke:#6d45d1,stroke-width:2px
    classDef core fill:transparent,stroke:#d14343,stroke-width:2px
    classDef pure fill:transparent,stroke:#6b7280,stroke-width:2px
    classDef pkgShared fill:transparent,stroke:#2f9254,stroke-dasharray:4 3
    classDef shared fill:transparent,stroke:#2f9254,stroke-width:2px
    classDef ext fill:transparent,stroke:#a07c3b,stroke-width:2px
    class MOD pkgFeature
    class CTRL root
    class DTO,MAP,LIB pure
    class SVC service
    class BIZ store
    class REPO,ENT core
    class COMMON pkgShared
    class EXC,PAG shared
    class OTHER,DB ext
```

## 6. Reglas de dependencia y privacidad

```mermaid
flowchart LR
    APPM["«component»<br/>app.module"] --> M["«component»<br/>Módulo"]
    X["«component»<br/>Otro módulo"] -- "service exportado" --> S["«component»<br/>Service"]
    X -- "tipos de DTO y enums" --> D["«component»<br/>models/dto<br/>models/enums"]
    X -. "✗" .-> R["«component»<br/>Repository · Business · Lib<br/>Mapper · Entidad<br/>models/interfaces · types · constants"]
    C["«component»<br/>Controller"] -. "✗" .-> R2["«component»<br/>Repository · ORM"]

    classDef routes fill:transparent,stroke:#475569,stroke-width:2px
    classDef page fill:transparent,stroke:#1d4ed8,stroke-width:2px
    classDef service fill:transparent,stroke:#6a9a12,stroke-width:2px
    classDef pure fill:transparent,stroke:#6b7280,stroke-width:2px
    classDef core fill:transparent,stroke:#d14343,stroke-width:2px
    class APPM routes
    class M,X,C page
    class S service
    class D pure
    class R,R2 core
    linkStyle 3,4 stroke:#dc2626,stroke-width:3px,color:#dc2626
```

- El contrato público de un módulo es su **service exportado** y sus **DTOs y enums**
  (`models/dto/` y `models/enums/`). Lo demás es privado: entidad, repository, business, lib,
  mapper y `models/interfaces`, `models/types` y `models/constants`.
- Un controller solo inyecta el service de su módulo.
- Ninguna pieza fuera del repository inyecta `Repository<T>`, `DataSource` ni `EntityManager`.
- Nadie fuera de `common/filters` lanza ni traduce `HttpException` por reglas de negocio: se lanzan
  excepciones de dominio.

### 6.1. Dependencias entre módulos

```mermaid
flowchart LR
    A["«component»<br/>Módulo A"] -- "imports: [BModule]<br/>inyecta BService" --> B["«component»<br/>Módulo B"]
    A -- "import type de B/models" --> B
    B -. "✗ ciclo" .-> A

    classDef page fill:transparent,stroke:#1d4ed8,stroke-width:2px
    class A,B page
    linkStyle 2 stroke:#dc2626,stroke-width:3px,color:#dc2626
```

- Si A necesita **datos** de B, importa `BModule` e inyecta `BService`. Nunca el repository de B.
- Si A solo necesita **la forma** de un dato de B (un DTO anidado, un enum), importa el tipo desde
  `B/models/dto/` o `B/models/enums/`. Eso no crea dependencia en tiempo de ejecución.

```mermaid
flowchart LR
    subgraph MAL["✗ ciclo"]
        A1["«component»<br/>Módulo A"] -- "usa" --> B1["«component»<br/>Módulo B"]
        B1 -- "usa" --> A1
    end
    subgraph BIEN["✓ la pieza común baja"]
        A2["«component»<br/>Módulo A"] -- "usa" --> C["«component»<br/>Módulo C<br/>pieza común con dominio"]
        B2["«component»<br/>Módulo B"] -- "usa" --> C
        A2 -. "sin dominio" .-> COM["«package»<br/>common/"]
        B2 -.-> COM
    end

    classDef bad fill:transparent,stroke:#dc2626,stroke-dasharray:4 3
    classDef good fill:transparent,stroke:#2f9254,stroke-dasharray:4 3
    classDef page fill:transparent,stroke:#1d4ed8,stroke-width:2px
    classDef shared fill:transparent,stroke:#2f9254,stroke-width:2px
    class MAL bad
    class BIEN good
    class A1,B1,A2,B2,C page
    class COM shared
    linkStyle 0,1 stroke:#dc2626,stroke-width:3px
```

- El grafo entre módulos no tiene ciclos. Si dos módulos se necesitan mutuamente, la pieza común
  baja a un tercer módulo o a `common` (si no tiene dominio).
- `forwardRef` no se usa para esconder un ciclo.
- Si un tipo de B lo usan varios módulos y no pertenece claramente a B, se mueve a `common/dto/`
  solo cuando no tiene dominio; si lo tiene, se queda en su dueño.

## 7. Flujo de una petición

En toda petición, el `ValidationPipe` valida antes de entrar al controller, el interceptor arma el
sobre a la salida y el filtro global traduce cualquier excepción.

### 7.1. Lectura por identificador

```mermaid
sequenceDiagram
    actor U as Usuario
    box rgba(225,29,116,0.12) front
        participant FE as App<br/>web · móvil
    end
    box rgba(100,116,139,0.15) borde
        participant GW as API Gateway
    end
    box rgba(71,85,105,0.15) bootstrap
        participant P as Guard · ValidationPipe
        participant I as Interceptor<br/>de respuesta
    end
    box rgba(29,78,216,0.15) Módulo
        participant C as Controller
        participant S as Service
        participant R as Repository
        participant M as Mapper
    end
    box rgba(160,124,59,0.15) externo
        participant DB as Base de datos
    end

    U->>FE: abre el detalle
    FE->>GW: GET /api/v1/x/:id + token
    GW->>P: enruta al microservicio
    P->>C: id validado (ParseUUIDPipe)
    C->>S: findOne(id)
    S->>R: findOneById(id)
    R->>DB: SELECT
    DB-->>R: fila
    R-->>S: entidad
    S->>M: toResponseDto(entidad)
    M-->>S: DTO
    S-->>C: DTO
    C-->>I: dato plano
    I-->>GW: { success, statusCode, message, data, meta, errors: null }
    GW-->>FE: misma respuesta
    FE-->>U: muestra el detalle
```

### 7.2. Escritura con reglas de negocio

```mermaid
sequenceDiagram
    actor U as Usuario
    box rgba(225,29,116,0.12) front
        participant FE as App<br/>web · móvil
    end
    box rgba(100,116,139,0.15) borde
        participant GW as API Gateway
    end
    box rgba(71,85,105,0.15) bootstrap
        participant P as ValidationPipe
        participant I as Interceptor
    end
    box rgba(29,78,216,0.15) Módulo
        participant C as Controller
        participant S as Service
        participant R as Repository
        participant B as Business
        participant M as Mapper
    end
    box rgba(160,124,59,0.15) externo
        participant DB as Base de datos
    end

    U->>FE: guarda los cambios
    FE->>GW: PATCH /api/v1/x/:id + cuerpo + token
    GW->>P: enruta al microservicio
    P->>C: DTO validado (whitelist, sin campos extra)
    C->>S: update(id, dto)
    S->>R: findOneById(id)
    R-->>S: entidad
    S->>B: init(entidad)
    B-->>S: this
    S->>B: validar()
    B-->>S: this
    S->>B: aplicar(dto)
    B-->>S: this
    S->>B: getEntity()
    B-->>S: entidad modificada
    Note over S,B: el service encadena · el business ejecuta<br/>síncrono: sin await en la cadena
    S->>R: save(entidad)
    R->>DB: UPDATE
    R-->>S: entidad guardada
    S->>M: toResponseDto(entidad)
    M-->>S: DTO
    S-->>C: DTO
    C-->>I: dato plano
    I-->>GW: sobre con @ResponseMessage
    GW-->>FE: misma respuesta
    FE-->>U: confirma el cambio
```

### 7.3. Errores

```mermaid
sequenceDiagram
    actor U as Usuario
    box rgba(225,29,116,0.12) front
        participant FE as App<br/>web · móvil
    end
    box rgba(100,116,139,0.15) borde
        participant GW as API Gateway
    end
    box rgba(29,78,216,0.15) Módulo
        participant S as Service
        participant R as Repository
        participant B as Business
    end
    box rgba(47,146,84,0.15) common
        participant F as Filtro global
    end
    box rgba(71,85,105,0.15) observabilidad
        participant L as Logger
    end

    U->>FE: envía la acción
    FE->>GW: petición + token
    alt entrada inválida
        Note over GW,F: ValidationPipe lanza BadRequest
        F-->>GW: 400 · errores por campo
    else no existe
        GW->>S: petición validada
        S->>R: findOneById
        R--xF: EntityNotFoundException
        F-->>GW: 404 · ENTITY_NOT_FOUND
    else duplicado
        GW->>S: petición validada
        S->>R: create
        R--xF: DuplicateEntityException
        F-->>GW: 409 · DUPLICATE_ENTITY
    else regla rota
        GW->>S: petición validada
        S->>B: init(…).regla()
        B--xF: BusinessRuleViolationException
        F-->>GW: 422 · BUSINESS_RULE_VIOLATION
    else fallo del servidor (BD, bug)
        GW->>S: petición validada
        S->>R: consulta
        R--xF: QueryFailedError / Error
        F->>L: error con tipo y stack (solo 5xx)
        F-->>GW: 500 · detalle real fuera de prod, opaco en prod
    end
    GW-->>FE: sobre con success: false · errors[]
    FE-->>U: muestra el error
```

- Los 4xx no imprimen stack: están descritos en la respuesta.
- Los 5xx dejan una sola entrada con stack, la del filtro global.
- Un error de una librería HTTP con status 4xx (por ejemplo, cuerpo demasiado grande) se respeta y
  no se convierte en 500.

### 7.4. Listado paginado

```mermaid
sequenceDiagram
    actor U as Usuario
    box rgba(225,29,116,0.12) front
        participant FE as App<br/>web · móvil
    end
    box rgba(100,116,139,0.15) borde
        participant GW as API Gateway
    end
    box rgba(71,85,105,0.15) bootstrap
        participant P as ValidationPipe
        participant I as Interceptor
    end
    box rgba(29,78,216,0.15) Módulo
        participant C as Controller
        participant S as Service
        participant R as Repository
        participant M as Mapper
    end

    U->>FE: busca o cambia de página
    FE->>GW: GET /api/v1/x?page=2&limit=10&search=… + token
    GW->>P: enruta al microservicio
    P->>C: QueryDto (extiende PaginationQueryDto)
    C->>S: findAll(query)
    S->>R: findPaginated(query)
    R-->>S: PaginatedResultDto<Entidad>
    S->>M: page.map(toResponseDto)
    M-->>S: PaginatedResultDto<DTO>
    S-->>C: PaginatedResultDto<DTO>
    C-->>I: resultado paginado
    I-->>GW: data: [items] · meta.pagination
    GW-->>FE: misma respuesta
    FE-->>U: muestra la página
```

## 8. Arranque y entornos

```mermaid
stateDiagram-v2
    [*] --> ValidandoEntorno
    ValidandoEntorno --> NoArranca : variable faltante o inválida
    ValidandoEntorno --> NoArranca : opción peligrosa fuera de su entorno
    ValidandoEntorno --> Conectando : entorno válido
    Conectando --> NoArranca : BD inalcanzable
    Conectando --> Escuchando : listo
    Escuchando --> Apagando : SIGTERM
    Apagando --> [*] : cierra conexiones
    NoArranca --> [*]
```

- Hay exactamente tres entornos: `dev`, `qa` y `prod`. Cualquier otro valor impide arrancar.
- Toda variable de entorno se declara y valida en un solo contrato. Si falta o es inválida, el
  proceso no levanta y el error dice cuál.
- Lo que depende del entorno (docs publicadas, `synchronize`, detalle de errores) se decide por el
  entorno, no por una variable suelta: la variable solo puede **apagar** algo, nunca encenderlo
  fuera de los entornos permitidos.
- El proceso atiende `SIGTERM` y cierra conexiones antes de salir.

## 9. Dónde ubicar el código

```mermaid
flowchart TB
    Q{"¿Tiene dominio?"}
    Q -- "no" --> T{"¿Qué es?"}
    T -- "lectura de entorno,<br/>conexión, logger" --> CFG["config/"]
    T -- "respuesta, errores, paginación,<br/>guards, decoradores" --> COM["common/"]
    Q -- "sí" --> O{"¿De qué módulo<br/>es dueño?"}
    O -- "de uno nuevo" --> NEW["copiar el módulo de ejemplo"]
    O -- "de uno existente" --> K{"¿Qué hace?"}
    K -- "recibe HTTP" --> CT["controller"]
    K -- "coordina pasos" --> SV["service"]
    K -- "lógica de negocio" --> BZ["business/"]
    K -- "cálculo puro genérico" --> LB["libs/"]
    K -- "consulta o guarda" --> RP["repositories/"]
    K -- "entidad → salida" --> MP["mappers/"]
    K -- "DTO, enum, interfaz,<br/>tipo o constante" --> DT["models/"]
    K -- "forma en la BD" --> EN["entities/"]

    classDef shared fill:transparent,stroke:#2f9254,stroke-width:2px
    classDef core fill:transparent,stroke:#d14343,stroke-width:2px
    classDef feature fill:transparent,stroke:#2563eb,stroke-width:2px
    class COM shared
    class CFG core
    class NEW,CT,SV,BZ,LB,RP,MP,DT,EN feature
```

Un parámetro de negocio (umbral, tasa) vive como constante en el business; pasa a `config/` solo
cuando debe cambiar por entorno. Un cálculo que expresa una regla de negocio va al business; un
cálculo puro genérico va a `libs/` del módulo, y baja a `common` cuando lo necesita más de un
módulo. Una utilidad sin dominio que no es un cálculo (formatear, parsear) va a `common` aunque hoy
tenga un solo consumidor. Una pieza con dominio se queda en el módulo dueño aunque otro la necesite: el otro la
consume por su contrato público ([§6.1](#61-dependencias-entre-módulos)).

## 10. Eventos

Se usa un evento en vez de una llamada cuando:

| Situación                                                                     | Por qué no una llamada                                    |
| ----------------------------------------------------------------------------- | --------------------------------------------------------- |
| Otro servicio solo necesita enterarse (notificar, auditar, actualizar datos). | Al productor no le importa quién reacciona.               |
| Dos servicios se necesitarían mutuamente.                                     | Una de las dos direcciones pasa a eventos: no hay ciclos. |
| Un servicio lee datos de otro con mucha frecuencia.                           | Mantiene una proyección local alimentada por eventos.     |

- **Nombre:** `<dominio>.<entidad>.<hecho en pasado>` (`identity.user.created`). Nunca un
  imperativo: eso es un comando, y un comando no se publica como evento.
- **Dueño:** el módulo que lo publica declara su esquema en `modules/<x>/events/`. Los consumidores
  se adaptan.
- **Contenido mínimo:** identificadores y los datos del hecho, no la entidad completa.
- **Consumo idempotente:** un evento puede llegar más de una vez; el consumidor descarta los
  duplicados.

El sobre del evento, la publicación confiable (outbox) y el broker quedan pendientes de definir.
