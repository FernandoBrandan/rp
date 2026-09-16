# Flujo Dev → Prod para tu primera vez

Vas a trabajar con **3 "entornos" locales** que simulan la realidad:

| Entorno        | Qué es                    | DB                               | Docker                                         | Comando             |
| -------------- | ------------------------- | -------------------------------- | ---------------------------------------------- | ------------------- |
| **dev**        | Tu día a día              | Postgres local (Docker solo DBs) | `docker compose up -d`                         | `npm run start:dev` |
| **prod-local** | Simula prod en tu máquina | Postgres en Docker (todo)        | `docker compose -f docker-compose.prod.yml up` | Container           |
| **prod**       | Servidor real             | Postgres gestionado o Docker     | CI/CD                                          | Deploy              |

**Regla**: nunca toques prod directo. Todo pasa por dev → prod-local → prod.

---

## 1. El caso concreto: cambio mínimo en un controller

**Ejemplo**: agregás un endpoint `GET /products/count`.

### Paso 1 — Desarrollo (dev)

```bash
# 1. Levantás solo las DBs
docker compose up -d          # postgres + redis

# 2. Arrancás la app con hot reload
npm run start:dev             # NODE_ENV=dev → carga .env.dev
```

- `synchronize: true` → si cambiás una entity, la DB se actualiza sola. **No creás migración en dev.**
- Probás con curl/Postman/Swagger.
- Si el cambio es solo lógica del controller (no toca DB), listo. Pasás al paso 2.

### Paso 2 — Simular prod localmente

```bash
# 1. Frenás dev
Ctrl+C

# 2. Levantás TODO containerizado (app + DBs)
docker compose -f docker-compose.prod.yml up -d --build
```

- `NODE_ENV=prod` → carga `.env.prod`
- `synchronize: false` → **la DB NO se modifica sola**
- `migrationsRun: true` → las migraciones **pendientes se corren al arrancar**

**Si tu cambio tocó la DB** (agregaste columna, tabla, índice):

```bash
# Antes de levantar prod-local, generás la migración (en dev)
npm run migration:generate src/infra/database/migrations/AddProductCount

# Revisás el archivo generado (¡siempre!)
# Lo commiteás

# Ahora sí, prod-local la corre automáticamente al boot
docker compose -f docker-compose.prod.yml up -d --build
```

**Si solo cambió lógica** (controller, service, DTO): no hay migración. Solo rebuild de la imagen.

### Paso 3 — Verificar que prod-local funciona

```bash
curl http://localhost:3000/health/live    # debe responder
curl http://localhost:3000/products/count  # tu nuevo endpoint

# Logs
docker logs ecommerce_app -f
```

### Paso 4 — Deploy real

1. **Commit + push** a `main`.
2. **CI** corre: lint → build → test → genera imagen Docker → la pushea al registry.
3. **CD** (manual o automático) en el servidor:
   ```bash
   docker compose -f docker-compose.prod.yml pull
   docker compose -f docker-compose.prod.yml up -d
   ```
4. Las migraciones se corren solas al arrancar el container.

---

## 2. Manejo de `.env`

**Archivos**:

| Archivo        | ¿Commit?  | ¿Qué tiene?                                                   |
| -------------- | --------- | ------------------------------------------------------------- |
| `.env.example` | ✅ Sí     | Plantilla sin secretos, documenta todas las vars              |
| `.env.dev`     | ✅ Sí     | Valores locales (localhost, fake payment, secret dev)         |
| `.env.test`    | ✅ Sí     | Para CI (DB test, sin Redis real)                             |
| `.env.prod`    | ❌ **NO** | Secretos reales. Se inyecta por CI/CD o se monta en el server |
| `.env`         | ❌ **NO** | Override local opcional (tu máquina, no se commitea)          |

**`.gitignore`**:

```
.env
.env.prod
.env.*.local
```

**Cómo carga Nest** (en `ConfigModule`):

```ts
const env = process.env.NODE_ENV || 'dev';

ConfigModule.forRoot({
  envFilePath: [`.env.${env}`, '.env'],
  // El segundo pisa al primero → .env local puede override sin tocar el commiteado
});
```

**En prod real**: no usás `.env.prod` como archivo. El orquestador (Docker Swarm, K8s, Railway, etc.) te inyecta las variables como **environment variables del container**. `ConfigModule` las lee igual porque `process.env` ya las tiene.

---

## 3. Docker: dev vs prod

**Dos compose files, no uno solo**:

| `docker-compose.yml` (dev)            | `docker-compose.prod.yml` (prod)           |
| ------------------------------------- | ------------------------------------------ |
| Solo **Postgres + Redis**             | **App + Postgres + Redis**                 |
| Puertos expuestos al host             | Solo app expone `3000`; DBs en red interna |
| App corre fuera (`npm run start:dev`) | App es un container                        |
| Sin healthcheck estricto              | `depends_on: condition: service_healthy`   |
| Sin `restart`                         | `restart: unless-stopped`                  |

**Comandos**:

```bash
# DEV — solo DBs
docker compose up -d

# PROD-LOCAL — todo
docker compose -f docker-compose.prod.yml up -d --build

# Apagar
docker compose down
docker compose -f docker-compose.prod.yml down
```

**Por qué no un solo file con profiles**: más simple de entender para tu primera vez. Dos files separados no se pisan y son explícitos.

---

## 4. Scripts de `package.json`

```json
"scripts": {
  "start:dev": "NODE_ENV=dev nest start --watch",
  "start:prod": "NODE_ENV=prod node dist/main.js",

  "build": "nest build",

  "migration:generate": "NODE_ENV=dev npm run typeorm -- migration:generate",
  "migration:run": "NODE_ENV=dev npm run typeorm -- migration:run",
  "migration:revert": "NODE_ENV=dev npm run typeorm -- migration:revert",
  "migration:show": "NODE_ENV=dev npm run typeorm -- migration:show",

  "seed:dev": "NODE_ENV=dev ts-node -r tsconfig-paths/register src/scripts/seed.ts",
  "seed:prod": "NODE_ENV=prod node dist/scripts/seed.js",

  "typeorm": "ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js -d src/infra/database/data-source.ts"
}
```

**Uso típico en dev**:

```bash
npm run migration:generate src/infra/database/migrations/AddX
npm run migration:run
npm run seed:dev
npm run start:dev
```

**En prod**: no corrés scripts manuales. El container arranca, `migrationsRun: true` corre las migraciones, y la app sirve.

---

## 5. Migraciones: cuándo y cómo

**Regla de oro**: `synchronize: false` en prod. Siempre.

|                 | Dev                                | Prod             |
| --------------- | ---------------------------------- | ---------------- |
| `synchronize`   | `true`                             | `false`          |
| `migrationsRun` | `false` (las corrés a mano)        | `true` (al boot) |
| Migraciones     | No creás, la DB se sincroniza sola | **Sí o sí**      |

**Primera vez que levantás la app (prod)**:

1. La DB está vacía.
2. Arranca el container → `migrationsRun: true`.
3. TypeORM ve la tabla `migrations` vacía → corre **todas** las migraciones en orden.
4. La DB queda creada.

**Segunda vez y siguientes**:

1. Arranca el container.
2. TypeORM compara migraciones pendientes vs tabla `migrations`.
3. Si no hay nuevas → no hace nada.
4. Si hay nuevas (vos generaste una) → corre solo esa.

**No necesitás un `.sh` con `.sql`.** Las migraciones **son** SQL versionado. Un `docker-entrypoint-initdb.d` con `.sql` solo corre **una vez** (cuando el volumen de Postgres se crea por primera vez). Si después cambiás el schema, ese `.sql` ya no se ejecuta. Las migraciones sí, siempre.

**Tu nota sobre el repo de Django**: ese patrón (`.docker/` con SQL) es para Django, que usa un sistema distinto. En TypeORM no lo necesitás. Usá migraciones.

---

## 6. Seeders: qué son y cuándo

**Migración** = schema (tablas, columnas, índices). **Seeder** = datos iniciales (admin, productos demo).

```bash
# Migración: crea la tabla products
# Seeder: inserta 3 productos de prueba
```

**Cuándo correr seeders**:

| Entorno | ¿Seed?                                                     |
| ------- | ---------------------------------------------------------- |
| dev     | ✅ Siempre, después de migrar                              |
| test/CI | ✅ Datos mínimos para tests                                |
| prod    | ❌ **Nunca** (o solo un seeder de "admin inicial" una vez) |

**En prod no seedeás productos demo**. Seedear prod es insertar datos basura.

**Si querés un admin inicial**: hacés un seeder **idempotente** (que verifica si ya existe antes de insertar) y lo corrés **una sola vez** manualmente:

```bash
NODE_ENV=prod npm run seed:prod   # solo la primera vez
```

**Después nunca más.**

**Herramienta**: `@alireza_ghasemi/typeorm-seeder` es declarativo y soporta `env: ["dev", "staging"]` para que no corra en prod. O te armás un `seed.ts` simple con `if (NODE_ENV === 'prod') throw new Error('No seeds in prod')`.

---

## 7. Checklist antes de cada deploy

- [ ] Todo el código está en `main` (o la branch de deploy)
- [ ] CI verde: lint, build, tests
- [ ] Si tocaste entities → **generaste y commiteaste la migración**
- [ ] Revisaste la migración generada (renames suelen romper: DROP+CREATE pierde data)
- [ ] Probaste `docker compose -f docker-compose.prod.yml up --build` en local
- [ ] `.env.prod` **no está en git** (`git status` limpio)
- [ ] Secretos de prod están en el orquestador, no en el repo
- [ ] `health/live` responde OK en prod-local
- [ ] Smoke test manual (o `smoke-test.sh`) pasa

---

## 8. Qué automatizar

**Mínimo viable** (GitHub Actions):

```yaml
name: CI
on: [push]
jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run lint
      - run: npm run build
      - run: npm test
      - run: docker build -t app .
```

**Con deploy automático** (CD): después de CI verde, `docker push` al registry, y en el server `docker compose pull && up -d`.

**No automatices al principio**: deploy manual con 2 comandos está bien. Automatizá cuando duela.

---

## 9. Respuestas a tus notas

**"falta archivo migraciones, se migran siempre cuando se levanta la app?"**
Sí, con `migrationsRun: true`. Solo corre las **pendientes**, no todas. La primera vez corre todas; después solo las nuevas.

**"qué hago con la carpeta .env?"**

- `.env` → NO se commitea, es tu override local.
- `.env.dev` → se commitea, valores locales.
- `.env.prod` → NO se commitea, secretos. En prod real las vars las inyecta el orquestador, no un archivo.

**"secuencia entre probar dev y prod"**
Dev (`npm run start:dev`) → si tocó DB, generar migración → commit → prod-local (`docker compose -f docker-compose.prod.yml up --build`) → verificar → deploy real.

**"pensaba poner un .sh que levante un .sql"**
No lo hagas. Las migraciones **son** SQL versionado. Un `.sql` en `docker-entrypoint-initdb.d` solo corre una vez (cuando se crea el volumen). Las migraciones corren siempre que haya cambios pendientes.

**"diferencia entre levantar una app ejecutando sql o migraciones"**

- **SQL manual**: corrés `psql < init.sql`. Solo la primera vez. Si el schema cambia, tenés que acordarte de correr el nuevo SQL a mano. Propenso a error.
- **Migraciones**: versionadas en el repo. TypeORM sabe cuáles corriste y cuáles no. Automático al boot. Rollback (`migration:revert`).

**"necesitaría seeders no?"**
Para dev sí. Para prod: solo un seeder inicial de admin (idempotente, una vez). No seedees productos demo en prod.

---

## 10. El flujo completo resumido

```
┌─────────────────────────────────────────────────────────────┐
│ DEV                                                          │
│   docker compose up -d              → Postgres + Redis       │
│   npm run start:dev                 → hot reload, sync: true │
│   (si tocó DB) npm run migration:generate + migration:run   │
│   npm run seed:dev                                           │
│   Commit (incluye migración)                                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ PROD-LOCAL (simulación)                                      │
│   docker compose -f docker-compose.prod.yml up --build       │
│   → NODE_ENV=prod, sync:false, migrationsRun:true            │
│   Verificar health + endpoint nuevo                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ PROD (real)                                                  │
│   Push a main → CI verde → imagen al registry                │
│   Server: docker compose pull && up -d                       │
│   Migraciones corren solas al boot                           │
└─────────────────────────────────────────────────────────────┘
```

**Tu primera vez**: empezá con esto. Cuando te sientas cómodo, agregás staging, monitoring, y CD automático.

---

---

---

# Flujo de trabajo — Dev → Prod

## 🗺️ Diagrama general

```
                    ┌──────────────────────┐
                    │   IDEA / CAMBIO      │
                    └──────────┬───────────┘
                               │
                               ▼
        ╔══════════════════════════════════════════╗
        ║  FASE 1 · DEV (día a día)                ║
        ╚══════════════════════════════════════════╝
                               │
                               ▼
        ╔══════════════════════════════════════════╗
        ║  FASE 2 · MIGRACIÓN (si tocó DB)         ║
        ╚══════════════════════════════════════════╝
                               │
                               ▼
        ╔══════════════════════════════════════════╗
        ║  FASE 3 · COMMIT + PUSH                  ║
        ╚══════════════════════════════════════════╝
                               │
                               ▼
        ╔══════════════════════════════════════════╗
        ║  FASE 4 · PROD-LOCAL (simulación)        ║
        ╚══════════════════════════════════════════╝
                               │
                               ▼
        ╔══════════════════════════════════════════╗
        ║  FASE 5 · CI (automático)                ║
        ╚══════════════════════════════════════════╝
                               │
                               ▼
        ╔══════════════════════════════════════════╗
        ║  FASE 6 · DEPLOY PROD                    ║
        ╚══════════════════════════════════════════╝
```

---

## 🟢 FASE 1 · DEV

### 1.1 — Levantar entorno (primera vez del día)

```bash
# Ir al proyecto
cd ~/proyecto

# Levantar solo DBs (Postgres + Redis)
docker compose up -d

# Verificar que están sanas
docker compose ps
# Esperado: postgres "healthy", redis "healthy"
```

### 1.2 — Instalar deps (si package.json cambió)

```bash
npm ci
```

### 1.3 — Arrancar app con hot reload

```bash
npm run start:dev
# → NODE_ENV=dev
# → carga .env.dev
# → synchronize: true (la DB se auto-actualiza)
```

### 1.4 — Desarrollar y probar

```bash
# En otra terminal
curl http://localhost:3000/health
curl http://localhost:3000/products
# O abrir Swagger
open http://localhost:3000/api/docs
```

### 1.5 — Correr tests

```bash
npm run test
npm run test:e2e
npm run lint
```

---

## 🟡 FASE 2 · MIGRACIÓN (solo si tocó entities)

**¿Tocaste una entity?** (`*.orm-entity.ts`, agregaste columna, tabla, índice)

```
¿Tocaste entity?
   │
   ├── NO  ──▶  Ir a FASE 3
   │
   └── SÍ  ──▶  Continuar acá
```

### 2.1 — Generar migración

```bash
npm run migration:generate src/infra/database/migrations/DescripcionDelCambio
# Ejemplo: AddProductCount, AddIndexOnOrdersUserId
```

### 2.2 — **Revisar el archivo generado** (CRÍTICO)

```bash
# Abrir el archivo
code src/infra/database/migrations/1712345678901-DescripcionDelCambio.ts

# ⚠️ Revisar:
#  - ¿Hay DROP TABLE / DROP COLUMN? → perdés data
#  - ¿Renombró o recreó? → TypeORM a veces hace DROP+CREATE en vez de RENAME
#  - ¿Los tipos son correctos?
```

### 2.3 — Aplicar en dev

```bash
npm run migration:run
npm run migration:show    # verifica que está aplicada
```

### 2.4 — Reiniciar la app

```bash
# Ctrl+C en start:dev, y de nuevo
npm run start:dev
```

---

## 🔵 FASE 3 · COMMIT + PUSH

### 3.1 — Ver qué cambió

```bash
git status
git diff
```

### 3.2 — Verificar que `.env.prod` NO está

```bash
git status | grep ".env.prod"
# Debe estar vacío. Si aparece → no lo commitees.
```

### 3.3 — Commit

```bash
git add .
git commit -m "feat(products): add count endpoint"
```

### 3.4 — Push

```bash
git push origin main
```

---

## 🟠 FASE 4 · PROD-LOCAL (simulación antes del deploy)

### 4.1 — Frenar dev

```bash
# Ctrl+C en start:dev
```

### 4.2 — Bajar DBs de dev

```bash
docker compose down
# ⚠️ NO uses -v (perderías datos de dev)
```

### 4.3 — Levantar TODO containerizado

```bash
docker compose -f docker-compose.prod.yml up -d --build
# → NODE_ENV=prod
# → carga .env.prod
# → synchronize: false
# → migrationsRun: true (corre migraciones pendientes al boot)
```

### 4.4 — Ver logs del arranque

```bash
docker logs ecommerce_app -f
# Buscar:
#  - "Migrations run: X"
#  - "Nest application successfully started"
#  - Sin errores de conexión
```

### 4.5 — Verificar salud y endpoint

```bash
curl http://localhost:3000/health/live
curl http://localhost:3000/health/ready
curl http://localhost:3000/products/count    # tu endpoint nuevo

# Smoke test completo (si tenés)
./.scripts/smoke-test.sh
```

### 4.6 — Si algo falla

```bash
# Ver logs
docker logs ecommerce_app --tail 100

# Bajar todo
docker compose -f docker-compose.prod.yml down

# Volver a dev y arreglar
docker compose up -d
npm run start:dev
```

### 4.7 — Si todo OK, bajar prod-local

```bash
docker compose -f docker-compose.prod.yml down
```

---

## 🟣 FASE 5 · CI (automático al push)

**Se dispara solo con el `git push`**:

```
GitHub Actions
   │
   ├── npm ci
   ├── npm run lint
   ├── npm run build
   ├── npm test
   ├── docker build
   └── docker push → registry
```

### 5.1 — Verificar que pasó

```bash
# En GitHub → Actions → último workflow
# O con gh CLI:
gh run list --limit 5
gh run watch
```

### 5.2 — Si falla el CI

```bash
# Ver el log del step que falló
gh run view <run-id> --log-failed

# Arreglar en local, commit, push de nuevo
```

---

## 🔴 FASE 6 · DEPLOY A PROD

### 6.1 — Conectarse al servidor

```bash
ssh user@prod-server
cd /opt/ecommerce
```

### 6.2 — Traer la nueva imagen

```bash
docker compose -f docker-compose.prod.yml pull
```

### 6.3 — Aplicar (rolling restart)

```bash
docker compose -f docker-compose.prod.yml up -d
# → Baja el container viejo
# → Levanta el nuevo
# → migrationsRun: true aplica migraciones pendientes
```

### 6.4 — Verificar

```bash
# Logs
docker logs ecommerce_app -f --tail 50

# Health
curl https://api.tudominio.com/health/live
curl https://api.tudominio.com/health/ready

# Endpoint nuevo
curl https://api.tudominio.com/products/count
```

### 6.5 — Si algo falla → rollback

```bash
# Volver a la imagen anterior (tag específico)
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d \
  --scale app=0   # ← o usar una imagen con tag anterior

# ⚠️ Si la migración ya corrió, el rollback de código NO revierte la DB.
#    Para eso: npm run migration:revert (con cuidado)
```

---

## 📋 Checklist rápido antes de cada deploy

```
□ CI verde
□ Migration commiteada (si tocó DB)
□ Migration revisada a mano
□ Probado en prod-local
□ .env.prod NO está en git
□ Secretos en el servidor (no en el repo)
□ health/live y health/ready OK en prod-local
□ Smoke test pasa
□ Tengo un plan de rollback
```

---

## 🆘 Comandos de emergencia

```bash
# Ver logs en vivo
docker logs ecommerce_app -f --tail 100

# Entrar al container
docker exec -it ecommerce_app sh

# Conectarse a la DB de prod
docker exec -it ecommerce_postgres psql -U postgres -d ecommerce

# Ver migraciones aplicadas
docker exec -it ecommerce_app npm run migration:show

# Revertir última migración (¡cuidado en prod!)
docker exec -it ecommerce_app npm run migration:revert

# Bajar todo sin perder datos
docker compose -f docker-compose.prod.yml down

# Bajar todo PERDIENDO datos (solo dev)
docker compose -f docker-compose.prod.yml down -v
```

---

## 🔄 Resumen en una línea por fase

| Fase           | Comando clave                                             | Resultado                              |
| -------------- | --------------------------------------------------------- | -------------------------------------- |
| 1 · Dev        | `docker compose up -d && npm run start:dev`               | App con hot reload en `localhost:3000` |
| 2 · Migración  | `npm run migration:generate` + `migration:run`            | Schema versionado                      |
| 3 · Commit     | `git add . && git commit && git push`                     | Código en `main`                       |
| 4 · Prod-local | `docker compose -f docker-compose.prod.yml up --build`    | Simulación de prod OK                  |
| 5 · CI         | (automático)                                              | Tests + build + imagen                 |
| 6 · Deploy     | `docker compose -f docker-compose.prod.yml pull && up -d` | Prod actualizado                       |
