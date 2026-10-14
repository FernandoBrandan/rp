# Identity
* **Decisiones** 
  + [x] Un solo `User` con roles `USER | ADMIN`
  + [x] Auth como servicio independiente (00auth + 00user)

* **Fase 1** — MVP - register, login, get access token. Endpoints validate token.
  + [x] Dominio
    - [x] `User` (id, email, passwordHash, role)
    - [x] `Email` VO (formato + normalización)
    - [x] `UserRole` enum
    - [x] `UserRepository` interface
  + [x] Aplicación
    - [x] `RegisterUser` (hash bcrypt)
    - [x] `LoginUser` (emite access token)
  + [x] Infraestructura
    - [x] `TypeOrmUserRepository`
    - [x] `PasswordHasher` (bcrypt)
    - [x] `JwtService` (access token) 15 min
  + [x] Presentación
    - [x] `POST /auth/register`
    - [x] `POST /auth/login`
    - [x] `GET /user/me`
  + [x] Seguridad
    - [x] `JwtAuthGuard`
    - [x] `ValidationPipe` en DTOs
  + [ ] Bugs a arreglar
    - [ ] `expiresIn` fuera de `signOptions` → tokens no expiran
    - [ ] Login timing-safe (dummy hash)
    - [ ] `RolesGuard` null check
    - [ ] Sacar `email` del payload JWT
    - [ ] Tag Swagger `user` → `users`
  + [ ] Check
    - [ ] `JwtService` -> Verificar si emite token corta duración 15 min 
    - [ ] `JwtAuthGuard` -> Verificar rechaza requests sin token válido

* **Fase 2** — Refresh + roles : sesiones que duran más que el access token, y control de acceso por rol.
  + [ ] Dominio: `refreshTokenHash` en `User` /  entidad 'RefreshToken' separada, con 'userId', 'hash', 'expiresAt'
  + [ ] Aplicación
    - [ ] `RefreshToken` use case : valida refresh token, emite nuevo par (access + refresh)
    - [ ] `GetCurrentUser` : devuelve el perfil del usuario autenticado
  + [ ] Infra: rotación de refresh
    - [ ] Refresh token almacenado hasheado (bcrypt, mismo hasher)
    - [ ] Estrategia de rotación: al usarlo, se invalida el anterior
  + [ ] Presentación
    - [ ] `POST /auth/refresh` - recibe refresh, emite nuevo access
    - [ ] `GET /auth/me` - requiere `JwtAuthGuard`
  + [ ] Seguridad
    - [ ] `@Roles()` decorator
    - [ ] `RolesGuard` en endpoints admin - lee metadata `@Roles('ADMIN')` y valida contra `request.user.role`
    - [ ] Aplicar `RolesGuard` a endpoints admin POST /products,  PUT /products` en Catalog
  + [ ] Mantener sesión sin re-loguearse; un `USER` no puede acceder a endpoints `ADMIN` .

* **Fase 3-4** — Backlog - seguridad avanzada
  + [ ] Logout server-side (invalidar refresh activo)
  + [ ] Blacklist access tokens (Redis)  (para revocación inmediata)
  + [ ] Rotación con detección de reuso  (si un refresh viejo se usa dos veces → revocar toda la familia)
  + [ ] Multi-dispositivo (varios refresh activos por usuario)
  + [ ] Rate limit en `/auth/login`  (anti brute-force)
  + [ ] 2FA
  + [ ] OAuth / social login (Google, GitHub) 
 

## Reglas del BC

| Regla                                          | Por qué                                |
| ---------------------------------------------- | -------------------------------------- |
| Password siempre hasheado con bcrypt           | Nunca plaintext en DB ni logs          |
| Refresh token hasheado en DB                   | Si roban la DB, no sirven los tokens   |
| Access token corto (15 min)                    | Limita ventana de ataque si se filtra  |
| Validación de DTOs con `class-validator` | Rechazo temprano de payloads inválidos |
| Guards aplicados a nivel controller, no método | Menos superficie de olvido             |

---

 **MVP** construye: dominio completo, `register` + `login` use cases, `bcrypt-hasher` , `jwt-token` , `jwt-auth.guard` .
 **v2** agrega: `refresh` use case, `get-current-user` , `roles.guard` , `roles.decorator` , `current-user.decorator` .

---

## Dependencias entre BCs

| Depende de              | Para qué                                        | Dirección                 |
| ----------------------- | ----------------------------------------------- | ------------------------- |
| —                       | Identity no depende de ningún otro BC           | ✅ Raíz                   |
| Catalog, Cart, Ordering | Consumen `JwtAuthGuard` para proteger endpoints | Identity expone guards    |
| Catalog, Cart, Ordering | Consumen `@CurrentUser()` para obtener `userId` | Identity expone decorator |

 **Identity es el único BC del que todos dependen.** No al revés. 
 Si algún día otro BC necesita algo de Identity, se hace vía puerto ( `UserFinderPort` o similar).
