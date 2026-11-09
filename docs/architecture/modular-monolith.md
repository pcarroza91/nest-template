# Lineamientos de arquitectura de monolito modular (backend)

Arquitectura de referencia para un **monolito modular** (`mm-<nombre>`): un solo despliegue con
varios dominios. Cada dominio se organiza como un microservicio de la
[guía del microservicio modular](modular-microservice.md), cuyas §4 a §11 se aplican sin cambios
dentro de él. Esta guía agrega solo lo que ocurre **entre** dominios.

La frontera entre dominios se trata como la frontera entre servicios, para que extraer un dominio
cambie integraciones, bindings y datos, no sus módulos ni los de los demás
([§10](#10-extraer-un-dominio)).

> **MS §x** remite a la sección x de la [guía del microservicio modular](modular-microservice.md).
> **§x** sin prefijo remite a esta guía.

## 1. Modelo conceptual

| Concepto             | Qué es                                                                                                                                  | Dónde vive                            | Obligatorio                     |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ------------------------------- |
| **Dominio**          | Contexto de negocio dueño de sus módulos, sus datos y sus contratos.                                                                    | `domains/<d>/`                        | Sí                              |
| **Módulo**           | Una capacidad del dominio, con la anatomía de la [MS §4](modular-microservice.md#4-anatomía-de-un-módulo) y sus propios endpoints HTTP. | `domains/<d>/modules/<x>/`            | Sí                              |
| **Contrato público** | Lo que el dominio **ofrece** a otros dominios del mismo proceso: una `abstract class` por capacidad y sus modelos.                      | `domains/<d>/public/`                 | Cuando otro dominio lo necesita |
| **Integración**      | El **único punto** por el que el dominio consume algo de afuera: otro dominio del monolito o un servicio externo.                       | `domains/<d>/integrations/<origen>/`  | Cuando consume algo de afuera   |
| **Orquestador**      | Coordina un proceso de varios pasos que no pertenece a un solo módulo ([MS §8.6](modular-microservice.md#86-orquestación-de-procesos)). | `domains/<d>/orchestrator/<proceso>/` | No                              |
| **Evento**           | Hecho ya ocurrido que el dominio publica; su esquema es parte del contrato público ([MS §11](modular-microservice.md#11-eventos)).      | `domains/<d>/public/events/`          | No                              |

## 2. Contexto

```mermaid
flowchart LR
    subgraph PUB["«zone» Red pública"]
        C(["Cliente<br/>web · móvil · backoffice"])
    end
    GW("«component»<br/>API Gateway")
    subgraph INT["«zone» Red interna"]
        UP("«component»<br/>Servicios que lo consumen")
        MM("«component»<br/>Monolito modular<br/>un proceso · varios dominios")
        DOWN("«component»<br/>Servicios que consume<br/>incluye ms- extraídos")
        subgraph DB["«component» Base de datos"]
            S1[("schema<br/>dominio A")]
            S2[("schema<br/>dominio B")]
        end
    end

    C -- "HTTPS + token" --> GW
    GW -- "/api/&lt;dominio&gt;/v1/…" --> MM
    UP -- "/api/&lt;dominio&gt;/v1/… · mTLS" --> MM
    MM -- "integrations · HTTP" --> DOWN
    DOWN -. "eventos, nunca HTTP de vuelta" .-> MM
    MM -- "cada dominio, su schema" --> S1
    MM --> S2

    classDef external fill:#ffd9cb,stroke:#494238,stroke-width:2px,color:#3c4747
    classDef infra fill:#ded6ce,stroke:#494238,stroke-width:2px,color:#3c4747
    classDef main fill:#efe2c0,stroke:#494238,stroke-width:3px,color:#3c4747
    classDef pkg fill:transparent,stroke:#8a857d,stroke-width:1.5px,stroke-dasharray:5 4
    class C,UP,DOWN external
    class GW,S1,S2 infra
    class MM main
    class PUB,INT,DB pkg
    linkStyle default stroke-dasharray:6 4
```

- **Un proceso, un despliegue, varios dominios.** Hacia afuera es un solo servicio que expone la API
  de cada dominio.
- **Una base de datos, un schema por dominio** ([§9](#9-datos-y-consistencia)). Ningún dominio lee
  el schema de otro, aunque compartan la conexión.
- **Las rutas llevan el dominio:** `/api/<dominio>/v1/…`. Así, al extraer un dominio, el gateway
  solo redirige su prefijo al nuevo `ms-` ([§10](#10-extraer-un-dominio)).
- **Una sola `/health`** para todo el proceso, fuera del prefijo y de la versión de la API.
- **Entre dominios del mismo proceso no hay HTTP:** se comunican por contratos en proceso
  ([§5](#5-contratos-públicos)) y eventos en memoria. Solo lo que está fuera del proceso (servicios
  externos o dominios ya extraídos) se llama por HTTP, siempre desde `integrations/`
  ([§6](#6-integraciones-la-única-entrada-de-lo-ajeno)).
- Con un mismo servicio externo, la llamada síncrona va en un solo sentido y la vuelta, por eventos,
  igual que en la [MS §2](modular-microservice.md#2-contexto).

## 3. Capas

El monolito tiene capas en **dos niveles**: las del **proceso**, compartidas por todos los dominios,
y las de **cada dominio**, que son las de la [MS §3](modular-microservice.md#3-capas) más `public`.

```mermaid
flowchart TB
    BOOT("<b>bootstrap</b><br/>main · app.module<br/>pipes · interceptor · filtro · seguridad")
    HEALTH("<b>health</b><br/>probes del proceso")
    subgraph DA["«package» dominio A · consume"]
        ORCH("<b>orchestrator</b> (opcional)<br/>procesos de varios pasos")
        MOD("<b>modules</b><br/>capacidades del dominio")
        INTG("<b>integrations</b><br/>única entrada de lo ajeno")
    end
    subgraph DB2["«package» dominio B · ofrece"]
        PUBL("<b>public</b><br/>contratos · modelos · eventos")
        MODB("<b>modules</b>")
    end
    COMMON("<b>common</b><br/>respuesta · excepciones<br/>guards · bus de eventos")
    CONFIG("<b>config</b><br/>entorno validado · conexión a BD · logger")
    EXT("«component»<br/>servicio externo")

    BOOT -- "registra el &lt;d&gt;-domain.module" --> DA
    BOOT -- "registra" --> DB2
    BOOT -- "registra" --> HEALTH
    BOOT -- "configura con" --> CONFIG
    ORCH -- "coordina" --> MOD
    ORCH -- "usa" --> INTG
    MOD -- "pide lo ajeno" --> INTG
    INTG -- "contrato · en proceso" --> PUBL
    PUBL -. "lo implementa" .-> MODB
    INTG -- "HTTP" --> EXT
    MOD -- "usa" --> COMMON
    MODB -- "usa" --> COMMON
    COMMON -. "solo el enum de entornos" .-> CONFIG
    MOD -. "✗" .-> MODB

    classDef bootstrap fill:#c3e7ff,stroke:#494238,stroke-width:2px,color:#3c4747
    classDef health fill:#b6ecf3,stroke:#494238,stroke-width:2px,color:#3c4747
    classDef modules fill:#efe2c0,stroke:#494238,stroke-width:2px,color:#3c4747
    classDef orchestrator fill:#ffd7dd,stroke:#494238,stroke-width:2px,color:#3c4747
    classDef integrations fill:#f9d9f4,stroke:#494238,stroke-width:2px,color:#3c4747
    classDef public fill:#e0e0ff,stroke:#494238,stroke-width:2px,color:#3c4747
    classDef common fill:#beecdd,stroke:#494238,stroke-width:2px,color:#3c4747
    classDef config fill:#d5e8c8,stroke:#494238,stroke-width:2px,color:#3c4747
    classDef external fill:#ffd9cb,stroke:#494238,stroke-width:2px,color:#3c4747
    classDef pkg fill:transparent,stroke:#8a857d,stroke-width:1.5px,stroke-dasharray:5 4
    class BOOT bootstrap
    class HEALTH health
    class MOD,MODB modules
    class ORCH orchestrator
    class INTG integrations
    class PUBL public
    class COMMON common
    class CONFIG config
    class EXT external
    class DA,DB2 pkg
    linkStyle default stroke-dasharray:6 4
    linkStyle 13 stroke:#dc2626,stroke-width:2px,color:#dc2626
```

| Nivel   | Capa           | Responsabilidad                                                                                                                                                                  | Puede depender de                                                                   | No depende de                                   |
| ------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------- |
| Proceso | `bootstrap`    | Arrancar, aplicar lo transversal (seguridad, validación, sobre, errores) y registrar el `<d>-domain.module` de cada dominio.                                                     | los dominios, `health`, `common`, `config`                                          | —                                               |
| Proceso | `health`       | Informar si el proceso y sus dependencias responden. Una sola para todo el monolito.                                                                                            | `common`                                                                            | los dominios                                    |
| Proceso | `common`       | Piezas transversales sin dominio: sobre de respuesta, excepciones, paginación, guards, bus de eventos en memoria.                                                                | `config` (solo el enum de entornos)                                                 | los dominios                                    |
| Proceso | `config`       | Leer y validar el entorno; construir la conexión a BD y el logger.                                                                                                               | —                                                                                   | los dominios, `common`                          |
| Dominio | `public`       | Declarar lo que el dominio ofrece y vincular cada contrato con el service de su módulo dueño ([§5](#5-contratos-públicos)).                                                       | los services de sus propios `modules/`                                              | otro dominio; `integrations`, `orchestrator`    |
| Dominio | `modules`      | Implementar cada capacidad. Lo de otros dominios lo recibe solo por `integrations/` de su dominio ([§6](#6-integraciones-la-única-entrada-de-lo-ajeno)).                          | `common`, contrato público de otro módulo del dominio, `integrations` de su dominio | otro dominio; `orchestrator`; `config` directo  |
| Dominio | `orchestrator` | Coordinar un proceso de varios pasos del dominio dueño ([§7](#7-orquestación-entre-dominios)).                                                                                   | contrato público de sus módulos, `integrations` de su dominio, `common`             | otro dominio; otro orchestrator                 |
| Dominio | `integrations` | Única entrada de lo ajeno: otros dominios por su `public/` (solo los de su `calls` o `subscribes`, [§8](#8-dependencias-entre-dominios-y-ciclos)) y servicios externos por HTTP. | `public/` de los dominios declarados, `common`, `ConfigService`                     | `modules/` ni `orchestrator/` de ningún dominio |

- Las capas del proceso no conocen ningún dominio: si algo de `common/` necesita uno, no es de
  `common/`.
- Entre módulos del **mismo** dominio no hay integración: se usa el contrato público del otro
  módulo, como en la [MS §6.1](modular-microservice.md#61-dependencias-entre-módulos).

## 4. Estructura

```
architecture/
└── domains.json                          # manifiesto: qué dominio depende de cuál (§8)
src/
├── domains/
│   ├── academic/
│   │   ├── academic-domain.module.ts     # importa sus módulos, su public y sus piezas opcionales
│   │   ├── public/                       # lo único que otro dominio puede importar
│   │   │   ├── academic-public.module.ts # vincula cada contrato con su implementación · los exporta
│   │   │   ├── courses.contract.ts       # un contrato por capacidad
│   │   │   ├── seats.contract.ts
│   │   │   ├── models/                   # tipos de los contratos: serializables
│   │   │   └── events/                   # esquemas de los eventos que publica
│   │   ├── modules/                      # anatomía de la MS §4
│   │   ├── integrations/                 # todo lo que consume de afuera: §6
│   │   │   ├── identity/                 # otro dominio del monolito (en proceso)
│   │   │   └── mailer/                   # servicio externo (HTTP)
│   │   ├── orchestrator/                 # opcional: MS §8.6
│   │   └── migrations/                   # solo tablas de su schema
│   └── enrollment/
│       └── …
├── common/                               # compartido por todos los dominios, sin dominio
├── config/
└── app.module.ts                         # importa los <d>-domain.module
```

- `integrations/<origen>/` nace con la primera dependencia hacia ese origen. `orchestrator/` y
  `public/` nacen cuando hacen falta: un dominio que nadie consume no tiene `public/`.
- `common/` y `config/` son de todos y no tienen dominio, igual que en el microservicio. Si algo de
  `common/` necesita conocer un dominio, no es de `common/`.

## 5. Contratos públicos

Un contrato lo **declara quien ofrece la capacidad**, en su `public/`, y lo **implementa el service
del módulo dueño**. No hay una clase intermedia que solo reenvíe.

```ts
// domains/academic/public/courses.contract.ts
export abstract class CoursesContract {
  abstract getCourse(id: string): Promise<CourseSummary>;
  abstract getCourses(ids: string[]): Promise<CourseSummary[]>;
}

// domains/academic/public/models/course-summary.ts
export interface CourseSummary {
  id: string;
  code: string;
  capacity: number;
  startsAt: string; // ISO 8601
}

// domains/academic/modules/course/course.service.ts
@Injectable()
export class CourseService implements CoursesContract {
  async getCourse(id: string): Promise<CourseSummary> {
    const course = await this.repository.findOneById(id);
    return this.mapper.toSummary(course);
  }
  // …
}

// domains/academic/public/academic-public.module.ts
@Module({
  imports: [CourseModule, SectionModule],
  providers: [
    { provide: CoursesContract, useExisting: CourseService },
    { provide: SeatsContract, useExisting: SectionService },
  ],
  exports: [CoursesContract, SeatsContract],
})
export class AcademicPublicModule {}

// domains/enrollment/modules/enrollment/enrollment.module.ts
@Module({ imports: [AcademicIntegrationModule, …], … }) // su integración (§6), nunca AcademicPublicModule

// domains/enrollment/modules/enrollment/enrollment.service.ts
import { CoursesContract } from '../../integrations/academic'; // nunca '@domains/academic/public'

constructor(private readonly courses: CoursesContract) {}
```

- **Uno por capacidad**, no uno por dominio (`CoursesContract`, `SeatsContract`). Si un contrato
  junta operaciones de agregados distintos, se divide.
- **El token es la `abstract class`.** El consumidor inyecta el contrato y usa sus modelos; nunca
  `CourseService`. Los recibe a través de su integración, que es la única que importa `public/`.
- **`useExisting` reutiliza el service del módulo.** Si su firma no calza con el contrato sin
  deformarlo, un `public/<capacidad>.provider.ts` lo implementa traduciendo; esa traducción es su
  responsabilidad.
- **Los modelos públicos solo importan otros modelos públicos.** Nunca entidades, DTOs HTTP, enums
  privados ni clases de `common/` con comportamiento.
- **Pensados como si fueran remotos.** Objetos planos y serializables (fechas en ISO, sin métodos,
  sin carga lazy, sin callbacks), operaciones por lote (`getCourses(ids)`) y de granularidad
  gruesa. En proceso un `for` con `getCourse` es barato; extraído, son N llamadas HTTP.
- **El dueño autoriza.** El service que implementa el contrato aplica el alcance (tenant, permisos)
  con la identidad del contexto de la petición, no solo los guards del controller: una llamada en
  proceso no pasa por esos guards y, al extraer el dominio, sí pasará por una autorización. Fuera de
  una petición (job, evento), el llamador fija una identidad de sistema explícita.
- **Evolución aditiva.** Se agregan métodos y campos opcionales; no se cambian ni se quitan. Un
  cambio que rompe crea un contrato nuevo en paralelo (`CoursesContractV2`) y el anterior se marca
  `@deprecated` hasta que el manifiesto no muestre consumidores.

## 6. Integraciones: la única entrada de lo ajeno

Todo lo que un dominio consume de afuera entra por `domains/<consumidor>/integrations/<origen>/`, sea
**otro dominio del monolito** o un **servicio externo**. Los módulos y el orquestador importan el
`<Origen>IntegrationModule`; nunca `public/` de otro dominio ni un client HTTP de otra parte. Así
hay una sola forma de consumir, y el día que un origen cambia de lugar solo cambia su integración.

```
domains/enrollment/integrations/
├── common/                              # base HTTP de la MS §8: solo si hay orígenes por HTTP
├── academic/                            # otro dominio del monolito
│   ├── academic-integration.module.ts
│   └── index.ts                         # reexporta contratos, modelos y eventos que usa
└── payments/                            # servicio externo: igual que en la MS §8.1
    ├── payments-integration.module.ts
    ├── payments.client.ts
    ├── mappers/
    └── models/
```

| Origen                    | Forma mínima                                                                                                            | Cuando cambia de lugar                                               |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Otro dominio del monolito | Un module que importa y reexporta `<Origen>PublicModule`, sin clases.                                                   | Al extraerse, el mismo module implementa el mismo contrato por HTTP. |
| Servicio externo          | Module, client, mappers y models, con las reglas de la [MS §8](modular-microservice.md#8-integraciones-y-orquestación). | —                                                                    |

```ts
// domains/enrollment/integrations/academic/academic-integration.module.ts
// academic en el monolito
@Module({ imports: [AcademicPublicModule], exports: [AcademicPublicModule] })
export class AcademicIntegrationModule {}

// academic ya extraído: cambia solo este archivo
@Module({
  imports: [HttpModule.registerAsync(…)],
  providers: [{ provide: CoursesContract, useClass: CoursesHttpClient }],
  exports: [CoursesContract],
})
export class AcademicIntegrationModule {}

// domains/enrollment/integrations/academic/index.ts
export { AcademicIntegrationModule } from './academic-integration.module';
export { CoursesContract, type CourseSummary } from '@domains/academic/public';
export { COURSE_CLOSED, type CourseClosedEvent } from '@domains/academic/public/events';
```

**Cuándo una integración hacia otro dominio agrega una clase**, además del module:

| Necesidad concreta                                                           | Qué agrega                                                                                                            |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Usar el contrato del otro dominio tal como viene.                            | Nada: el module reexporta el contrato.                                                                                |
| El modelo del otro dominio no calza con el propio y la traducción se repite. | `<origen>.client.ts` que inyecta el contrato y entrega tipos propios.                                                 |
| Una operación combina varios contratos del otro dominio.                     | `<origen>.client.ts` que los combina.                                                                                 |
| El otro dominio ya fue extraído.                                             | `<Capacidad>HttpClient` que implementa el **mismo contrato** por HTTP ([MS §8.4](modular-microservice.md#84-reglas)). |

- **El module y el `index.ts` que reexportan no son una capa que reenvía.** No tienen clases ni
  métodos: son el único lugar donde se decide si el origen está en proceso o es remoto y de dónde
  vienen sus tipos. Al extraer el origen, `index.ts` pasa a reexportar desde el paquete de
  contratos y los módulos consumidores no cambian sus imports.
- **Una clase que solo reenvía métodos** sin traducir, combinar ni salir por HTTP no se crea.
- **Los eventos de otro dominio también entran por aquí.** El listener vive en el módulo que
  reacciona ([MS §11](modular-microservice.md#11-eventos)), pero importa el nombre y el esquema del evento desde `integrations/<origen>/index.ts`,
  nunca desde `public/` del otro dominio.
- **Una integración nunca contiene reglas de negocio** del dominio que consume y nunca importa sus
  `modules/` ni su `orchestrator/` ([MS §3](modular-microservice.md#3-capas)).
- **Las excepciones de `common/` cruzan tal cual en proceso.** La implementación HTTP produce las
  mismas con la tabla de la [MS §8.4](modular-microservice.md#84-reglas), así que el consumidor no distingue de dónde vino.
- **No se separa en `internal/` y `external/`.** La carpeta lleva el nombre del origen, no su
  ubicación: un dominio que se extrae pasa de interno a externo, y separarlas obligaría a mover la
  carpeta y cambiar los imports de cada módulo consumidor, justo lo que esta sección evita. Si un
  origen es otro dominio del monolito lo dice el manifiesto ([§8](#8-dependencias-entre-dominios-y-ciclos)): está en su `calls`.

## 7. Orquestación entre dominios

Un orquestador ([MS §8.6](modular-microservice.md#86-orquestación-de-procesos)) vive en el dominio **dueño del proceso** y usa contratos de otros dominios a
través de las integraciones de su dominio, igual que los módulos. Además de las reglas de la [MS §8.6](modular-microservice.md#86-orquestación-de-procesos):

- **Los contratos los implementan services o providers, nunca orquestadores.** Así ningún dominio
  puede llamar al orquestador de otro y no se forman cadenas de orquestadores entre dominios.
- **Los pasos de otros dominios no entran en la transacción local.** Se ordenan para escribir
  primero lo propio, cada paso remoto tiene su compensación en el dominio dueño y un fallo de la
  compensación deja el proceso marcado como pendiente.
- **Lo que no necesita respuesta inmediata va por evento**, no como un paso más del orquestador.

## 8. Dependencias entre dominios y ciclos

Entre dominios hay tres tipos de dependencia, con riesgos distintos:

| Tipo            | Ejemplo                                             | Riesgo si forma un ciclo                                               | Regla                                                 |
| --------------- | --------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------- |
| **Estructural** | `enrollment/integrations` importa `academic/public` | No se puede compilar, probar ni extraer un dominio sin el otro.        | DAG obligatorio                                       |
| **Síncrona**    | `enrollment` llama a `CoursesContract`              | Recursión entre dominios; al extraer, latencia y fallos en cascada.    | DAG obligatorio                                       |
| **Asíncrona**   | `enrollment` escucha `academic.course.closed`       | Bucles de eventos que se realimentan; consistencia que nunca converge. | Ciclos permitidos solo si están declarados y terminan |

Un ciclo no es un deadlock por sí mismo; lo que produce es acoplamiento: dos dominios que solo
pueden cambiar, desplegarse y extraerse juntos.

```mermaid
flowchart LR
    EN("enrollment") -- "llama" --> AC("academic")
    EN -- "llama" --> ID("identity")
    AC -- "llama" --> ID
    AC -- "llama" --> CF("configuration")
    AC -. "evento" .-> EN
    AC -. "✗ llamada" .-> EN

    classDef modules fill:#efe2c0,stroke:#494238,stroke-width:2px,color:#3c4747
    class EN,AC,ID,CF modules
    linkStyle default stroke-dasharray:6 4
    linkStyle 5 stroke:#dc2626,stroke-width:2px,color:#dc2626
```

**Manifiesto.** Las dependencias permitidas se declaran en `architecture/domains.json`. Una
dependencia nueva es un cambio del manifiesto, revisado como cualquier otro:

```json
{
  "identity": { "calls": [], "subscribes": [] },
  "configuration": { "calls": [], "subscribes": [] },
  "academic": { "calls": ["identity", "configuration"], "subscribes": [] },
  "enrollment": { "calls": ["academic", "identity"], "subscribes": ["academic"] }
}
```

**Verificación en CI** (`npm run arch:check`, obligatorio para integrar):

1. **dependency-cruiser**, con reglas generadas desde el manifiesto:
   - solo `integrations/` importa `public/` de otro dominio, y solo de los dominios en su `calls`
     o `subscribes`;
   - `modules/` y `orchestrator/` nunca importan otro dominio;
   - `public/models` y `public/events` solo importan otros archivos de `public/`;
   - `modules/` no importa `orchestrator/`; un orquestador no importa otro orquestador;
   - sin imports circulares (`no-circular`) en todo `src/`.
2. **Grafo del manifiesto:** `calls` debe ser acíclico, incluidos los ciclos indirectos (A → B → C →
   A). El script falla con el camino del ciclo.
3. **`forwardRef` prohibido** fuera de `common/` (regla de ESLint `no-restricted-syntax`): en Nest es
   la forma habitual de esconder un ciclo.
4. **Suscripciones:** cada evento de otro dominio que reexporta `integrations/<origen>/index.ts`
   debe estar en su `subscribes`. Un ciclo en el
   grafo de eventos se rechaza salvo que el manifiesto lo marque con su condición de término.

Detectar ciclos de imports no basta: un binding o un evento puede crear una dependencia que el
grafo de imports no muestra. Por eso el manifiesto es la fuente y los imports se validan contra él.

**Si aparece un ciclo**, en este orden:

1. La pieza que ambos necesitan baja a un tercer dominio o, si no tiene dominio, a `common/`.
2. Una de las direcciones pasa a evento, declarado en `subscribes`.
3. Si los dos dominios siempre cambian juntos, la frontera está mal trazada y se fusionan.

## 9. Datos y consistencia

1. Cada dominio tiene su propio schema (o prefijo de tabla, si el motor no tiene schemas) y sus
   propias migraciones.
2. Entre dominios no hay FKs, relaciones del ORM ni joins. De otro dominio solo se guarda el id.
3. No hay transacciones entre dominios, aunque compartan la conexión. Cada dominio confirma lo suyo;
   lo demás se resuelve con eventos o compensación.
4. Un evento se publica **después** del commit, nunca dentro de la transacción. Los consumidores son
   idempotentes desde el principio.
5. Un dominio no llama por HTTP a la API de otro dominio del mismo proceso: su integración usa el
   contrato en proceso.
6. Las rutas de cada dominio cuelgan de `/api/<dominio>/v1` (`RouterModule` con `path:
'<dominio>/v1'` y sus módulos como `children`, sin `enableVersioning`). Al extraer el dominio, el
   gateway envía ese prefijo al nuevo servicio.

## 10. Extraer un dominio

```mermaid
flowchart LR
    A("1 · publicar public/<br/>como paquete de contratos") --> B("2 · mover domains/&lt;d&gt;/<br/>a ms-&lt;d&gt;")
    B --> C("3 · mover su schema<br/>a una BD propia")
    C --> D("4 · en los consumidores<br/>integración HTTP del contrato")
    D --> E("5 · eventos al broker<br/>con outbox")
    E --> F("6 · el gateway envía<br/>/api/&lt;d&gt;/… al ms")

    classDef orchestrator fill:#ffd7dd,stroke:#494238,stroke-width:2px,color:#3c4747
    class A,B,C,D,E,F orchestrator
    linkStyle default stroke-dasharray:6 4
```

Extraer **no es automático**. Las reglas anteriores reducen el cambio, pero estos puntos siempre
requieren trabajo:

| Qué cambia                   | Antes (en proceso)                                       | Después (HTTP)                                                                                                                                                    |
| ---------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contratos y modelos públicos | Las integraciones los importan de `domains/<d>/public/`. | Se publican como paquete; solo las integraciones cambian la ruta del import.                                                                                      |
| Implementación del contrato  | El service, por `useExisting`.                           | El `<Origen>IntegrationModule` de cada consumidor la cambia por un client HTTP, con timeout, reintentos y errores ([MS §8.4](modular-microservice.md#84-reglas)). |
| Autorización                 | La identidad del contexto, en memoria.                   | Token propagado e identidad de servicio entre servicios.                                                                                                          |
| Latencia y fallos            | Llamada en memoria; falla con el proceso.                | Red: timeouts, 502 y degradación; las lecturas por lote se vuelven indispensables.                                                                                |
| Consistencia                 | Eventos en memoria tras el commit.                       | Broker con outbox; consistencia eventual explícita.                                                                                                               |
| Datos                        | Mismo servidor, schema propio.                           | Base de datos propia y migración de los datos.                                                                                                                    |

Lo que **no** debería cambiar: los módulos del dominio extraído, los módulos y orquestadores de los
consumidores y los contratos. En cada consumidor cambia solo `integrations/<d>/`. Si un paso exige tocar módulos de otro dominio, una regla de esta sección se rompió
antes.

## 11. Gobierno

| Regla | Descripción                                                                                                                     | Cómo se verifica                                                  |
| ----- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| AR-01 | Cada dominio es dueño de sus módulos, su schema y sus migraciones.                                                              | Revisión + migraciones por carpeta de dominio                     |
| AR-02 | Los módulos exponen sus propios endpoints HTTP, sin pasar por `public/` ni por un orquestador.                                  | Revisión                                                          |
| AR-03 | Toda comunicación con otro dominio o servicio pasa por `integrations/<origen>/`; solo ahí se importa `public/` de otro dominio. | dependency-cruiser                                                |
| AR-04 | La comunicación síncrona entre dominios usa contratos; la asíncrona, eventos de `public/events/`.                               | dependency-cruiser + manifiesto                                   |
| AR-05 | Las dependencias estructurales y síncronas entre dominios forman un DAG declarado.                                              | Script del manifiesto                                             |
| AR-06 | Los ciclos de eventos solo existen declarados y con condición de término.                                                       | Script del manifiesto                                             |
| AR-07 | Una integración no tiene clases que solo reenvían; su forma mínima hacia otro dominio es el module que reexporta.               | Revisión                                                          |
| AR-08 | Los orquestadores son opcionales, no deciden, no llaman a otros orquestadores ni implementan contratos.                         | dependency-cruiser + revisión                                     |
| AR-09 | Los modelos públicos no exponen entidades ni DTOs HTTP y son serializables.                                                     | dependency-cruiser (`public/` solo importa `public/`)             |
| AR-10 | Los contratos se diseñan como remotos: por lote, gruesos y con evolución aditiva.                                               | Revisión                                                          |
| AR-11 | El dueño del contrato autoriza; la identidad del llamador siempre es explícita.                                                 | Tests del service que implementa el contrato                      |
| AR-12 | No hay transacciones entre dominios; los eventos se publican después del commit.                                                | Revisión + tests                                                  |
| AR-13 | No hay llamadas HTTP entre dominios del mismo proceso.                                                                          | Revisión: ninguna integración apunta a la URL del propio monolito |
| AR-14 | Toda verificación automática corre en CI y bloquea la integración.                                                              | Pipeline                                                          |

## 12. Decisiones pendientes

- **Publicación confiable de eventos.** Publicar después del commit puede perder un evento si el
  proceso cae entre ambos. Un outbox lo evita; falta decidir si se adopta desde el inicio o al
  extraer el primer dominio ([MS §11](modular-microservice.md#11-eventos)).
- **Reportes que cruzan dominios.** Sin joins entre dominios, un reporte que combina varios necesita
  proyecciones locales alimentadas por eventos o un dominio de reportes con acceso de solo lectura
  documentado como excepción.
- **Nombre de `public/`.** Se mantiene mientras no choque con convenciones del framework.
