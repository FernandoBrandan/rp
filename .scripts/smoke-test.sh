#!/usr/bin/env bash
# Pruebas end-to-end con auth:
#   auth → catalog → cart → order → payment
# Requiere: app corriendo en $BASE_URL, Postgres y Redis arriba, seed ejecutado.

set -uo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@example.com}"
ADMIN_PASS="${ADMIN_PASS:-Admin1234!}"

RED=$'\e[31m'; GREEN=$'\e[32m'; YELLOW=$'\e[33m'; BLUE=$'\e[34m'; DIM=$'\e[2m'; RESET=$'\e[0m'

PASS=0; FAIL=0
section() { echo; echo "${BLUE}━━━ $1 ━━━${RESET}"; }
ok() { echo "${GREEN}✔${RESET} $1"; PASS=$((PASS+1)); }
fail() { echo "${RED}✘${RESET} $1"; FAIL=$((FAIL+1)); }
info() { echo "${DIM}$1${RESET}"; }
assert_eq() {
  local label="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then ok "$label (=$actual)"
  else fail "$label — esperado: $expected, obtenido: $actual"; fi
}
json() { echo "$1" | jq -r "$2"; }
uuid() { cat /proc/sys/kernel/random/uuid; }

# GET/POST con header opcional
http_get() {
  local path="$1" token="${2:-}"
  if [ -n "$token" ]; then
    curl -s "$BASE_URL$path" -H "Authorization: Bearer $token"
  else
    curl -s "$BASE_URL$path"
  fi
}

# Devuelve "STATUS|BODY"
http_req() {
  local method="$1" path="$2" body="${3:-}" token="${4:-}"
  local args=(-s -o /tmp/_resp -w "%{http_code}" -X "$method" "$BASE_URL$path")
  [ -n "$token" ] && args+=(-H "Authorization: Bearer $token")
  [ -n "$body" ] && args+=(-H 'content-type: application/json' -d "$body")
  local status=$(curl "${args[@]}")
  echo -n "$status|"
  cat /tmp/_resp
}

# ─── Pre-checks ─────────────────────────────────────────────────
section "Pre-checks"
info "BASE_URL=$BASE_URL"

command -v jq >/dev/null || { echo "${RED}Se requiere jq${RESET}"; exit 1; }
ok "jq disponible"

LIVE=$(json "$(http_get /health/live)" '.status')
assert_eq "Health live" "ok" "$LIVE"

READY=$(json "$(http_get /health/ready)" '.status')
assert_eq "Health ready" "ok" "$READY"

# ─── 1. Register user ───────────────────────────────────────────
section "1. Register user"

USER_EMAIL="user-$(date +%s)@example.com"
USER_PASS="User1234!"

RES=$(http_req POST /auth/register "{
  \"email\": \"$USER_EMAIL\",
  \"password\": \"$USER_PASS\"
}")
STATUS=$(echo "$RES" | cut -d'|' -f1)
BODY=$(echo "$RES" | cut -d'|' -f2-)
assert_eq "POST /auth/register → 201" "201" "$STATUS"

# ─── 2. Register duplicado ──────────────────────────────────────
section "2. Register duplicado"

RES=$(http_req POST /auth/register "{
  \"email\": \"$USER_EMAIL\",
  \"password\": \"$USER_PASS\"
}")
STATUS=$(echo "$RES" | cut -d'|' -f1)
assert_eq "POST /auth/register duplicado → 409" "409" "$STATUS"

# ─── 3. Password corta ──────────────────────────────────────────
section "3. Password corta"

RES=$(http_req POST /auth/register "{
  \"email\": \"otro@example.com\",
  \"password\": \"123\"
}")
STATUS=$(echo "$RES" | cut -d'|' -f1)
assert_eq "POST /auth/register password corta → 400" "400" "$STATUS"

# ─── 4. Login user ──────────────────────────────────────────────
section "4. Login user"

RES=$(http_req POST /auth/login "{
  \"email\": \"$USER_EMAIL\",
  \"password\": \"$USER_PASS\"
}")
STATUS=$(echo "$RES" | cut -d'|' -f1)
BODY=$(echo "$RES" | cut -d'|' -f2-)
assert_eq "POST /auth/login → 200" "200" "$STATUS"

USER_TOKEN=$(json "$BODY" '.accessToken')
USER_ID=$(json "$BODY" '.user.id')
[ -n "$USER_TOKEN" ] && [ "$USER_TOKEN" != "null" ] && ok "accessToken recibido" || fail "sin accessToken"
assert_eq "role del user" "USER" "$(json "$BODY" '.user.role')"

# ─── 5. Login credenciales inválidas ────────────────────────────
section "5. Login credenciales inválidas"

RES=$(http_req POST /auth/login "{
  \"email\": \"$USER_EMAIL\",
  \"password\": \"wrong\"
}")
STATUS=$(echo "$RES" | cut -d'|' -f1)
assert_eq "POST /auth/login password mala → 401" "401" "$STATUS"

# ─── 6. Login admin ─────────────────────────────────────────────
section "6. Login admin"

RES=$(http_req POST /auth/login "{
  \"email\": \"$ADMIN_EMAIL\",
  \"password\": \"$ADMIN_PASS\"
}")
STATUS=$(echo "$RES" | cut -d'|' -f1)
BODY=$(echo "$RES" | cut -d'|' -f2-)
assert_eq "POST /auth/login admin → 200" "200" "$STATUS"

ADMIN_TOKEN=$(json "$BODY" '.accessToken')
assert_eq "role del admin" "ADMIN" "$(json "$BODY" '.user.role')"

# ─── 7. /users/me ───────────────────────────────────────────────
section "7. /users/me"

RES=$(http_get /users/me "$USER_TOKEN")
assert_eq "GET /users/me email" "$USER_EMAIL" "$(json "$RES" '.email')"

RES=$(http_get /users/me "")
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/users/me")
assert_eq "GET /users/me sin token → 401" "401" "$STATUS"

# ─── 8. Catalog: público vs admin ───────────────────────────────
section "8. Catalog"

RES=$(http_get /products "")
assert_eq "GET /products público → 200" "200" "$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/products")"

SERIAL="PROD-SMOKE-$(date +%s)"

# sin token → 401
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/products" \
  -H 'content-type: application/json' \
  -d "{\"serial\":\"$SERIAL\",\"name\":\"Smoke\",\"price\":100,\"stock\":10}")
assert_eq "POST /products sin token → 401" "401" "$STATUS"

# con token USER → 403
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/products" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H 'content-type: application/json' \
  -d "{\"serial\":\"$SERIAL\",\"name\":\"Smoke\",\"price\":100,\"stock\":10}")
assert_eq "POST /products con USER → 403" "403" "$STATUS"

# con token ADMIN → 201
RES=$(http_req POST /products "{
  \"serial\": \"$SERIAL\",
  \"name\": \"Smoke Laptop\",
  \"price\": 100,
  \"stock\": 10
}" "$ADMIN_TOKEN")
STATUS=$(echo "$RES" | cut -d'|' -f1)
BODY=$(echo "$RES" | cut -d'|' -f2-)
assert_eq "POST /products con ADMIN → 201" "201" "$STATUS"
PRODUCT_ID=$(json "$BODY" '.id')
info "PRODUCT_ID=$PRODUCT_ID"

# ─── 9. Cart ────────────────────────────────────────────────────
section "9. Cart"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/cart")
assert_eq "GET /cart sin token → 401" "401" "$STATUS"

RES=$(http_req POST /cart/items "{
  \"item\": { \"productId\": \"$PRODUCT_ID\", \"quantity\": 2 }
}" "$USER_TOKEN")
STATUS=$(echo "$RES" | cut -d'|' -f1)
assert_eq "POST /cart/items → 201" "201" "$STATUS"

CART=$(http_get /cart "$USER_TOKEN")
assert_eq "Cart items count" "1" "$(json "$CART" '.items | length')"
assert_eq "Cart total items" "2" "$(json "$CART" '.totalItems')"

# ─── 10. Crear orden ────────────────────────────────────────────
section "10. Crear orden"

IDEMPOTENCY_KEY="smoke-$(uuid)"

RES=$(http_req POST /orders "{
  \"idempotencyKey\": \"$IDEMPOTENCY_KEY\",
  \"items\": [ { \"productId\": \"$PRODUCT_ID\", \"quantity\": 2, \"price\": 100 } ]
}" "$USER_TOKEN")
STATUS=$(echo "$RES" | cut -d'|' -f1)
BODY=$(echo "$RES" | cut -d'|' -f2-)
assert_eq "POST /orders → 201" "201" "$STATUS"

ORDER_ID=$(json "$BODY" '.id')
assert_eq "Total" "200" "$(json "$BODY" '.total')"
info "ORDER_ID=$ORDER_ID"

# ─── 11. Idempotencia ───────────────────────────────────────────
section "11. Idempotencia"

sleep 4  # dar tiempo al fake provider

RES=$(http_req POST /orders "{
  \"idempotencyKey\": \"$IDEMPOTENCY_KEY\",
  \"items\": [ { \"productId\": \"$PRODUCT_ID\", \"quantity\": 2, \"price\": 100 } ]
}" "$USER_TOKEN")
BODY=$(echo "$RES" | cut -d'|' -f2-)
assert_eq "Mismo idempotencyKey devuelve mismo ORDER_ID" "$ORDER_ID" "$(json "$BODY" '.id')"

# ─── 12. Estado final ───────────────────────────────────────────
section "12. Estado final de la orden"

FINAL=$(http_get "/orders/$ORDER_ID" "$USER_TOKEN")
assert_eq "Status final" "PAID" "$(json "$FINAL" '.status')"

URL=$(json "$FINAL" '.paymentUrl')
[ -n "$URL" ] && [ "$URL" != "null" ] && ok "paymentUrl seteado" || fail "paymentUrl vacío"

# ─── 13. Stock descontado ───────────────────────────────────────
section "13. Stock descontado"

PROD=$(http_get "/products/$SERIAL" "")
assert_eq "Stock post-orden (10 - 2)" "8" "$(json "$PROD" '.stock')"

# ─── 14. Stock insuficiente ─────────────────────────────────────
section "14. Stock insuficiente"

RES=$(http_req POST /orders "{
  \"idempotencyKey\": \"smoke-big-$(uuid)\",
  \"items\": [ { \"productId\": \"$PRODUCT_ID\", \"quantity\": 1000, \"price\": 100 } ]
}" "$USER_TOKEN")
STATUS=$(echo "$RES" | cut -d'|' -f1)
assert_eq "POST /orders sin stock → 400" "400" "$STATUS"

# ─── 15. Order inexistente ──────────────────────────────────────
section "15. Order inexistente"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/orders/NO-EXISTE" \
  -H "Authorization: Bearer $USER_TOKEN")
assert_eq "GET /orders/:id inexistente → 404" "404" "$STATUS"

# ─── 16. Mis órdenes ────────────────────────────────────────────
section "16. Mis órdenes"

RES=$(http_get /orders "$USER_TOKEN")
assert_eq "GET /orders incluye la creada" "1" "$(echo "$RES" | jq '[.[] | select(.id=="'"$ORDER_ID"'")] | length')"

# ─── Resumen ────────────────────────────────────────────────────
section "Resumen"
TOTAL=$((PASS + FAIL))
if [ "$FAIL" -eq 0 ]; then
  echo "${GREEN}✔ $PASS/$TOTAL passed${RESET}"
  exit 0
else
  echo "${RED}✘ $PASS/$TOTAL passed, $FAIL fallidos${RESET}"
  exit 1
fi