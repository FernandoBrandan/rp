# Identity — ordenado por fases

## Decisión de diseño

- Un solo `User` con roles `USER` | `ADMIN`.
- No separar auth-users de shopping-users.

Separar solo tiene sentido si:

- Multi-tenant complejo
- Dominios radicalmente distintos
- Auth es un servicio independiente

Para este MVP: no aplica.

---

## MVP (Fase 1)

**Objetivo**: un usuario puede registrarse, loguearse y recibir un access token. Los endpoints protegidos validan ese token.

### Dominio

- `User` (id, email, passwordHash, role)
- `Email` como Value Object (valida formato)
- `UserRole` enum: `USER` | `ADMIN`
- `UserRepository` (interface)

### Aplicación

- `RegisterUser` — crea usuario, hashea password
- `LoginUser` — valida credenciales, emite access token

### Infraestructura

- Implementación de `UserRepository` (TypeORM)
- `PasswordHasher` adapter (bcrypt)
- `JwtService` — emite **access token de corta duración** (15 min)

### Presentación

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`

### Seguridad

- `JwtAuthGuard` — protege endpoints autenticados
- `ValidationPipe` sobre DTOs de auth (`RegisterDTO`, `LoginDTO`)

**Exit criteria**: `POST /auth/register` + `POST /auth/login` funcionan, y un endpoint protegido con `@UseGuards(JwtAuthGuard)` rechaza requests sin token válido.a

---

## v2 (Fase 2 · Resiliencia · o Fase 3 · Observabilidad)

**Objetivo**: sesiones que duran más que el access token, y control de acceso por rol.

### Dominio

- Agregar campo `refreshTokenHash` a `User` (o entidad `RefreshToken` separada, con `userId`, `hash`, `expiresAt`)

### Aplicación

- `RefreshToken` — valida refresh token, emite nuevo par (access + refresh)
- `GetCurrentUser` — devuelve el perfil del usuario autenticado

### Infraestructura

- **Refresh token almacenado hasheado** (bcrypt, mismo hasher)
- Estrategia de rotación: al usarlo, se invalida el anterior

### Presentación

- `GET /auth/me` — requiere `JwtAuthGuard`
- `POST /auth/refresh` — recibe refresh, emite nuevo access

### Seguridad

- `RolesGuard` — lee metadata `@Roles('ADMIN')` y valida contra `request.user.role`
- `@Roles()` decorator
- Aplicar `RolesGuard` a endpoints admin (ej. `POST /products`, `PUT /products` en Catalog)

**Exit criteria**: el usuario puede mantener sesión sin re-loguearse; un `USER` no puede acceder a endpoints `ADMIN`.

---

## v3 / Backlog

**Objetivo**: seguridad avanzada. Solo cuando el proyecto lo exija.

- Logout server-side (invalidar refresh activo)
- Blacklist de access tokens en Redis (para revocación inmediata)
- Rotación con detección de reuso (si un refresh viejo se usa dos veces → revocar toda la familia)
- Multi-dispositivo (varios refresh activos por usuario)
- Rate limiting específico en `/auth/login` (anti brute-force)
- 2FA (si el dominio lo requiere)
- OAuth / social login (Google, GitHub)

**Cuándo**: no antes de tener tráfico real y un caso concreto que lo justifique.

---

## Reglas del BC

| Regla                                          | Por qué                                |
| ---------------------------------------------- | -------------------------------------- |
| Password siempre hasheado con bcrypt           | Nunca plaintext en DB ni logs          |
| Refresh token hasheado en DB                   | Si roban la DB, no sirven los tokens   |
| Access token corto (15 min)                    | Limita ventana de ataque si se filtra  |
| Validación de DTOs con `class-validator`       | Rechazo temprano de payloads inválidos |
| Guards aplicados a nivel controller, no método | Menos superficie de olvido             |

---

## Estructura de archivos objetivo

```
src/modules/00identity/
├── application/
│   ├── dto/request/         register, login, refresh
│   ├── dto/response/        auth.response, user.response
│   ├── mappers/             user.mapper
│   ├── ports/               password-hasher.port, token-service.port
│   └── use-cases/           register, login, refresh, get-current-user
├── domain/
│   ├── enums/               userRole.enum
│   ├── value-objects/       email.vo, passwordHash.vo
│   ├── user.entity.ts
│   └── repositories/        user.repository
├── infra/
│   ├── adapters/            bcrypt-hasher, jwt-token
│   ├── persistence/         user.orm-entity, user.orm.mapper
│   ├── repositories/        typeorm-user.repository
│   └── strategies/          jwt.strategy
├── presentation/
│   ├── auth.controller.ts
│   └── guards/              jwt-auth.guard, roles.guard
├── decorators/              roles.decorator, current-user.decorator
└── identity.module.ts
```

**MVP** construye: dominio completo, `register` + `login` use cases, `bcrypt-hasher`, `jwt-token`, `jwt-auth.guard`.
**v2** agrega: `refresh` use case, `get-current-user`, `roles.guard`, `roles.decorator`, `current-user.decorator`.

---

## Dependencias entre BCs

| Depende de              | Para qué                                        | Dirección                 |
| ----------------------- | ----------------------------------------------- | ------------------------- |
| —                       | Identity no depende de ningún otro BC           | ✅ Raíz                   |
| Catalog, Cart, Ordering | Consumen `JwtAuthGuard` para proteger endpoints | Identity expone guards    |
| Catalog, Cart, Ordering | Consumen `@CurrentUser()` para obtener `userId` | Identity expone decorator |

**Identity es el único BC del que todos dependen.** No al revés. Si algún día otro BC necesita algo de Identity, se hace vía puerto (`UserFinderPort` o similar).
