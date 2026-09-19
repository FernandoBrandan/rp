# 16. Observabilidad

- requestId por request
- logs estructurados
- métricas básicas
- health endpoint real (que valide DB)

antes:
Log
request > correlationId > logs
Health check

Observabilidad mínima (logs + health)
Observabilidad operativa (metrics + alerts)
Observabilidad distribuida (tracing + correlation)

### Logs estructurados

```json
{
  "timestamp": "2025-01-15T10:23:45Z",
  "level": "error",
  "correlationId": "abc-123",
  "service": "orders",
  "event": "payment_failed",
  "orderId": "ord-456",
  "userId": "usr-789",
  "reason": "timeout after 3000ms"
}
```

### Métricas expuestas (Prometheus)

- `request_duration_ms`
- `orders_created_total`
- `payment_failures_total`
- `inventory_reservations_total`

### Health endpoints

- `GET /health/live` — ¿el proceso está vivo?
- `GET /health/ready` — valida: DB · Redis · estado del circuit breaker

# 🧠 OBJETIVO REAL

Querés poder responder:

```txt
- ¿Cuánto tarda cada request?
- ¿Dónde está el cuello de botella?
- ¿Qué pasa con 100/500/1000 usuarios?
- ¿Cuándo empieza a romperse?
```

---

# 🧱 1. Observabilidad MVP (lo mínimo serio)

- logger ✅
- correlationId ✅
- health module ✅

Ahora sumamos 3 cosas:

---

## 🟢 1.1 Interceptor de tiempo (LATENCIA)

👉 esto es CLAVE

```ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { tap } from 'rxjs/operators';

@Injectable()
export class TimingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const now = Date.now();

    const req = context.switchToHttp().getRequest();

    return next.handle().pipe(
      tap(() => {
        const delay = Date.now() - now;

        console.log({
          event: 'REQUEST_COMPLETED',
          path: req.url,
          method: req.method,
          latency: delay,
          correlationId: req.correlationId,
        });
      }),
    );
  }
}
```

---

### 🔌 Lo registrás global

```ts
app.useGlobalInterceptors(new TimingInterceptor());
```

---

### 🧠 Resultado

Cada request ahora te deja:

```json
{
  "event": "REQUEST_COMPLETED",
  "path": "/cart",
  "latency": 23
}
```

👉 esto YA es observabilidad real

---

## 🟢 1.2 Métricas simples (sin Prometheus aún)

Creamos algo básico:

```ts
export const metrics = {
  requests: 0,
  errors: 0,
  totalLatency: 0,
};
```

En interceptor:

```ts
metrics.requests++;
metrics.totalLatency += delay;
```

En errores:

```ts
metrics.errors++;
```

---

### Endpoint

```ts
@Get('/metrics')
getMetrics() {
  return {
    requests: metrics.requests,
    avgLatency: metrics.totalLatency / metrics.requests,
    errors: metrics.errors,
  };
}
```

---

## 🟢 1.3 Logging estructurado (mejorar lo que ya tenés)

En vez de `console.log`, usá:

```ts
logger.info({
  event: 'ORDER_CREATED',
  userId,
  total,
});
```

👉 importante: SIEMPRE JSON

---

# ⚡ 2. Testear carga (LO IMPORTANTE)

## 🟢 Herramienta simple: `autocannon`

```bash
npm install -g autocannon

## Test básico
autocannon -c 50 -d 10 http://localhost:3000/cart?userId=1
```

📊 Qué significa

- `-c 50` → 50 usuarios concurrentes
- `-d 10` → 10 segundos

## 🧠 Qué mirar - Autocannon te da:

- requests/sec
- latency promedio
- p95 (IMPORTANTÍSIMO)

---

# 🔥 3. Experimentos que TENÉS que hacer

## 🧪 Experimento 1: sin cache

- pegale a `/cart`
- medí latencia

## 🧪 Experimento 2: con cache (tu Redis)

👉 debería bajar latencia fuerte

## 🧠 Insight esperado

- DB = lento
- Cache = rápido

## 🧪 Experimento 3: subir concurrencia

```bash
autocannon -c 200 -d 20 http://localhost:3000/cart
```

## 🧠 Qué vas a ver

- latencia sube
- DB se satura
- CPU sube

## 🧪 Experimento 4: endpoint pesado (order)

Probá:

```bash
autocannon -c 50 -d 10 http://localhost:3000/orders
```

---

# 🧠 4. Qué estás aprendiendo (esto es SRE real)

### 🔴 Bottlenecks

- DB
- CPU
- locks

### 🟡 Trade-offs

| decisión    | impacto                          |
| ----------- | -------------------------------- |
| usar cache  | + velocidad / - consistencia     |
| sync DB     | + simple / - escalabilidad       |
| logs muchos | + observabilidad / - performance |

### 🟢 Latencia real

No importa promedio → importa: 👉 **p95 / p99**

---

# 🧪 5. Testing + performance juntos

Podés hacer:

```ts
it('should respond fast', async () => {
  const start = Date.now();

  await request(app.getHttpServer()).get('/cart?userId=1');

  const time = Date.now() - start;

  expect(time).toBeLessThan(100);
});
```

---

# 🚨 6. Cosas que te van a pasar (y están bien)

- requests lentos → DB
- inconsistencias → cache
- race conditions → concurrent users

👉 PERFECTO → eso querés

---

# 🧭 7. Roadmap SRE (tu siguiente nivel)

### MVP

- logs
- latency
- load test

### Nivel 2

- Prometheus
- Grafana
- dashboards

### Nivel 3

- tracing distribuido (OpenTelemetry)
- alertas

# 💥 Conclusión (importante)

- Ya estás entrando en: backend → ingeniería de sistemas
- Y eso implica:
- - medir
- - romper
- - entender por qué

---

# Proximo

## Armar un escenario guiado de caos:

- 500 users
- DB lenta
- cache activado/desactivado
- qué métricas mirar

## integrar Prometheus + Grafana en Docker
