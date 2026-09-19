## Cómo leer los docs

- Empezá por [PLAYBOOK](./docs/02%20PLAYBOOK.md) si querés entender **cómo** se construye.
- Andá a [PROYECTO](./docs/03%20PROYECTO.md) si querés entender **qué** tiene este e-commerce.
- Mirá [DECISIONES](./docs/04%20DECISIONES.md) para los **por qué**.
- Chequeá [PROGRESO](./docs/05%20PROGRESO.md) para el **estado actual**.

# E-commerce Modular y Resiliente

Monolito modular en NestJS que demuestra DDD ligero, arquitectura
hexagonal mínima y resiliencia sin sobre-ingeniería.

> Un e-commerce no necesita microservicios ni Kafka para ser robusto.
> Este proyecto lo demuestra.

---

## La idea

Separar dominios, proteger invariantes y manejar fallos externos
**sin** pagar el costo operativo de un sistema distribuido.

Una sola base. Un solo deploy. Bounded contexts.
Eventos internos en lugar de broker.
Compensación en lugar de transacciones distribuidas.
Idempotencia en lugar de locks.

---

## Qué demuestra

### Arquitectura

- **DDD ligero**: entidades, value objects (`Money`, `Serial`, `Email`),
  repositorios por agregado
- **Hexagonal mínima**: puertos + adapters entre bounded contexts,
  sin acoplamiento directo
- **Monolito modular**: 8 BCs separados por carpeta, comunicación por
  eventos internos (`EventEmitter2`) y puertos

### Consistencia de negocio

- **Idempotencia en órdenes**: `idempotencyKey` con unique constraint
  - manejo de race condition (`23505`)
- **Máquina de estados explícita**: transiciones validadas en el dominio,
  no en el controller
- **Compensación**: si el pago falla, la reserva de stock se libera
- **Stock nunca negativo**: `UPDATE ... WHERE stock >= qty` (atómico en DB)

### Observabilidad (Fase 1)

- **Correlation ID** propagado por request vía `AsyncLocalStorage`
- **Logs estructurados** con Winston
- **Health check** con validación de DB

### Documentación

- Swagger en `/api/docs`
- ADRs en `docs/DECISIONES.md`
- Playbook reusable en `docs/PLAYBOOK.md`

---

## Stack

Node.js · TypeScript · NestJS · PostgreSQL · TypeORM · Redis · Docker

---

## Roadmap

El proyecto avanza por **fases cerradas**, no por features sueltas.
No se abre una fase sin cerrar la anterior.

| Fase | Foco                                         | Estado     |
| ---- | -------------------------------------------- | ---------- |
| 0    | Infra base                                   | ⚠️ parcial |
| 1    | MVP funcional                                | ⚠️ 40%     |
| 2    | Resiliencia (retry, timeout, breaker)        | ❌         |
| 3    | Observabilidad (métricas, health live/ready) | ❌         |
| 4    | Performance (cache, rate limit)              | ❌         |
| 5    | Expansión (shipping, notificaciones)         | ❌         |

Detalle completo en [`docs/PROGRESO.md`](./docs/PROGRESO.md).

---

## Cómo levantarlo

```bash
# Requiere Docker
docker compose up
```

App: `http://localhost:3000`  
Swagger: `http://localhost:3000/api/docs`  
Health: `http://localhost:3000/health`

---

## Documentación

- [**Playbook**](./docs/PLAYBOOK.md) — cómo se construye un proyecto así, paso a paso
- [**Proyecto**](./docs/PROYECTO.md) — spec de este e-commerce por BC y fase
- [**Decisiones**](./docs/DECISIONES.md) — ADRs (por qué monolito, por qué `EventEmitter2`, etc.)
- [**Progreso**](./docs/PROGRESO.md) — checklist viva

---

## Qué NO incluye intencionalmente

- Microservicios
- Event sourcing
- CQRS distribuido
- Kafka
- Orquestadores complejos

**El objetivo es demostrar que un sistema bien modelado no necesita
complejidad prematura.**
