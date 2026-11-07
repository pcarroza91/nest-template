# Arquitectura

| Guía                                                  | Para qué                                                                                                                        |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| [Microservicio modular](modular-microservice.md)      | Un servicio (`ms-<dominio>`) con un solo dominio organizado por módulos: capas, anatomía de un módulo, integraciones y eventos. |
| [Monolito modular](modular-monolith.md)               | Un despliegue (`mm-<nombre>`) con varios dominios: contratos públicos, integraciones entre dominios, ciclos y extracción.       |
| [Recorrido de una petición](explorable/peticion.html) | Versión interactiva del flujo de una petición en este template.                                                                 |

**Orden de lectura:** primero el microservicio. El monolito no repite nada: cada uno de sus dominios
se organiza como un microservicio y la guía del monolito agrega solo lo que ocurre entre dominios.
Por eso cada dominio de un `mm-` es un `ms-` en potencia.

Cómo se aplican en este template: [`docs/architecture.md`](../architecture.md).
