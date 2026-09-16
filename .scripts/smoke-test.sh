#!/usr/bin/env bash
# scripts/smoke-test.sh
#
# Pruebas end-to-end del flujo: catalog → cart → order → payments.
# Requiere:
#   - Postgres corriendo
#   - Redis corriendo
#   - App levantada en $BASE_URL (default: http://localhost:3000)
#   - PAYMENT_PROVIDER=fake
#
# Uso:
#   ./scripts/smoke-test.sh
#   BASE_URL=http://localhost:4000 ./scripts/smoke-test.sh

set -uo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
FAKE_PAYMENT_DELAY_MS="${FAKE_PAYMENT_DELAY_MS:-3000}"

# ─── Colores ─────────────────────────────────────────────────────────────────
RED=$'\e[31m'
GREEN=$'\e[32m'
YELLOW=$'\e[33m'
BLUE=$'\e[34m'
DIM=$'\e[2m'
RESET=$'\e[0m'

# ─── Helpers ─────────────────────────────────────────────────────────────────
PASS=0
FAIL=0

section() {
  echo
  echo "${BLUE}━━━ $1 ━━━${RESET}"
}

ok() {
  echo "${GREEN}✔${RESET} $1"
  PASS=$((PASS + 1))
}

fail() {
  echo "${RED}✘${RESET} $1"
  FAIL=$((FAIL + 1))
}

info() {
  echo "${DIM}$1${RESET}"
}

# Compara y reporta
assert_eq() {
  local label="$1"
  local expected="$2"
  local actual="$3"
  if [ "$expected" = "$actual" ]; then
    ok "$label (=$actual)"
  else
    fail "$label — esperado: $expected, obtenido: $actual"
  fi
}

# GET que devuelve solo el body
http_get() {
  curl -s "$BASE_URL$1"
}

# POST/PUT/DELETE con body, devuelve "STATUS|BODY"
http_req() {
  local method="$1"
  local path="$2"
  local body="${3:-}"
  if [ -n "$body" ]; then
    curl -s -o /tmp/_resp -w "%{http_code}" -X "$method" "$BASE_URL$path" \
      -H 'content-type: application/json' -d "$body"
    echo -n "|"
    cat /tmp/_resp
  else
    curl -s -o /tmp/_resp -w "%{http_code}" -X "$method" "$BASE_URL$path"
    echo -n "|"
    cat /tmp/_resp
  fi
}

# Extrae un campo JSON con jq
json() {
  echo "$1" | jq -r "$2"
}

# Genera un UUID v4 (evita depender de uuidgen)
uuid() {
  if command -v uuidgen >/dev/null 2>&1; then
    uuidgen | tr '[:upper:]' '[:lower:]'
  else
    cat /proc/sys/kernel/random/uuid
  fi
}

# ─── Pre-checks ──────────────────────────────────────────────────────────────
section "Pre-checks"
info "BASE_URL=$BASE_URL"

if ! command -v jq >/dev/null 2>&1; then
  echo "${RED}Se requiere jq. Instalá: sudo apt install jq${RESET}"
  exit 1
fi
ok "jq disponible"

HEALTH=$(http_get /health/live)
HEALTH_STATUS=$(json "$HEALTH" '.status')
assert_eq "Health live" "ok" "$HEALTH_STATUS"

HEALTH=$(http_get /health/ready)
HEALTH_STATUS=$(json "$HEALTH" '.status')
assert_eq "Health ready" "ok" "$HEALTH_STATUS"

# ─── 1. Crear producto ───────────────────────────────────────────────────────
section "1. Crear producto"

SERIAL="PROD-TEST$(date +%s)"
CREATE_PRODUCT=$(http_req POST /products "{
  \"serial\": \"$SERIAL\",
  \"name\": \"Laptop Test\",
  \"price\": 1500.00,
  \"stock\": 10
}")
STATUS=$(echo "$CREATE_PRODUCT" | cut -d'|' -f1)
BODY=$(echo "$CREATE_PRODUCT" | cut -d'|' -f2-)

assert_eq "POST /products devuelve 201" "201" "$STATUS"

PRODUCT_ID=$(json "$BODY" '.id')
assert_eq "Serial respetado" "$SERIAL" "$(json "$BODY" '.serial')"
assert_eq "Stock inicial" "10" "$(json "$BODY" '.stock')"
assert_eq "Status inicial" "ACTIVE" "$(json "$BODY" '.status')"
info "PRODUCT_ID=$PRODUCT_ID"

# ─── 2. Crear producto con serial inválido ───────────────────────────────────
section "2. Validación: serial inválido"

BAD_SERIAL=$(http_req POST /products "{
  \"serial\": \"XYZ-123\",
  \"name\": \"Bad\",
  \"price\": 10,
  \"stock\": 1
}")
STATUS=$(echo "$BAD_SERIAL" | cut -d'|' -f1)
assert_eq "POST /products con serial inválido → 400" "400" "$STATUS"

# ─── 3. Cart ─────────────────────────────────────────────────────────────────
section "3. Carrito"

USER_ID=$(uuid)
info "USER_ID=$USER_ID"

ADD_CART=$(http_req POST "/cart/$USER_ID" "{
  \"item\": { \"productId\": \"$PRODUCT_ID\", \"quantity\": 2 }
}")
STATUS=$(echo "$ADD_CART" | cut -d'|' -f1)
BODY=$(echo "$ADD_CART" | cut -d'|' -f2-)
assert_eq "POST /cart/:userId → 201" "201" "$STATUS"
assert_eq "Items en carrito" "1" "$(json "$BODY" '.items | length')"
assert_eq "Total items" "2" "$(json "$BODY" '.totalItems')"

GET_CART=$(http_get "/cart/$USER_ID")
assert_eq "GET /cart/:userId devuelve precio" "1500" "$(json "$GET_CART" '.items[0].price')"
assert_eq "Subtotal correcto" "3000" "$(json "$GET_CART" '.items[0].subtotal')"

# ─── 4. Crear orden ──────────────────────────────────────────────────────────
section "4. Crear orden"

IDEMPOTENCY_KEY="test-$(uuid)"
ORDER_REQ=$(http_req POST /orders "{
  \"userId\": \"$USER_ID\",
  \"idempotencyKey\": \"$IDEMPOTENCY_KEY\",
  \"items\": [
    { \"productId\": \"$PRODUCT_ID\", \"quantity\": 2, \"price\": 1500 }
  ]
}")
STATUS=$(echo "$ORDER_REQ" | cut -d'|' -f1)
BODY=$(echo "$ORDER_REQ" | cut -d'|' -f2-)

assert_eq "POST /orders → 201" "201" "$STATUS"

ORDER_ID=$(json "$BODY" '.id')
assert_eq "Total de la orden" "3000" "$(json "$BODY" '.total')"
assert_eq "Status inicial de la orden" "PENDING" "$(json "$BODY" '.status')"
info "ORDER_ID=$ORDER_ID"

# ─── 5. Idempotencia (mismo key, mismo resultado) ────────────────────────────
section "5. Idempotencia"

sleep 4  # dar tiempo al fake provider (delay por defecto 3s)

IDEM_REQ=$(http_req POST /orders "{
  \"userId\": \"$USER_ID\",
  \"idempotencyKey\": \"$IDEMPOTENCY_KEY\",
  \"items\": [
    { \"productId\": \"$PRODUCT_ID\", \"quantity\": 2, \"price\": 1500 }
  ]
}")
STATUS=$(echo "$IDEM_REQ" | cut -d'|' -f1)
BODY=$(echo "$IDEM_REQ" | cut -d'|' -f2-)
IDEM_ORDER_ID=$(json "$BODY" '.id')

assert_eq "POST /orders con mismo key → 201" "201" "$STATUS"
assert_eq "Devuelve el mismo ORDER_ID" "$ORDER_ID" "$IDEM_ORDER_ID"

# ─── 6. Estado final de la orden ─────────────────────────────────────────────
section "6. Estado final de la orden"

ORDER_FINAL=$(http_get "/orders/$ORDER_ID")
FINAL_STATUS=$(json "$ORDER_FINAL" '.status')
assert_eq "Status final" "PAID" "$FINAL_STATUS"

PAYMENT_URL=$(json "$ORDER_FINAL" '.paymentUrl')
if [ -n "$PAYMENT_URL" ] && [ "$PAYMENT_URL" != "null" ]; then
  ok "paymentUrl seteado ($PAYMENT_URL)"
else
  fail "paymentUrl no seteado"
fi

# ─── 7. Stock descontado ─────────────────────────────────────────────────────
section "7. Stock descontado"

PRODUCT_AFTER=$(http_get "/products/$SERIAL")
assert_eq "Stock post-orden (10 - 2)" "8" "$(json "$PRODUCT_AFTER" '.stock')"

# ─── 8. Idempotencia bajo concurrencia ───────────────────────────────────────
section "8. Idempotencia bajo concurrencia"

CONCURRENT_KEY="concurrent-$(uuid)"
PAYLOAD="{
  \"userId\": \"$USER_ID\",
  \"idempotencyKey\": \"$CONCURRENT_KEY\",
  \"items\": [
    { \"productId\": \"$PRODUCT_ID\", \"quantity\": 1, \"price\": 1500 }
  ]
}"

# Dispara 3 requests en paralelo
for i in 1 2 3; do
  (
    curl -s -o "/tmp/_concurrent_$i" -w "%{http_code}" \
      -X POST "$BASE_URL/orders" \
      -H 'content-type: application/json' \
      -d "$PAYLOAD" > "/tmp/_status_$i"
  ) &
done
wait

# Recolecta los IDs devueltos
IDS=()
for i in 1 2 3; do
  ID=$(jq -r '.id // "null"' "/tmp/_concurrent_$i" 2>/dev/null || echo "null")
  IDS+=("$ID")
done
UNIQUE_IDS=$(printf '%s\n' "${IDS[@]}" | sort -u | grep -v '^null$' | wc -l)

assert_eq "Solo 1 ORDER_ID único entre 3 requests" "1" "$UNIQUE_IDS"
info "IDs devueltos: ${IDS[*]}"

# ─── 9. Stock insuficiente ───────────────────────────────────────────────────
section "9. Stock insuficiente"

BIG_ORDER=$(http_req POST /orders "{
  \"userId\": \"$USER_ID\",
  \"idempotencyKey\": \"big-$(uuid)\",
  \"items\": [
    { \"productId\": \"$PRODUCT_ID\", \"quantity\": 1000, \"price\": 1500 }
  ]
}")
STATUS=$(echo "$BIG_ORDER" | cut -d'|' -f1)
assert_eq "POST /orders sin stock → 4xx" "400" "$STATUS"

# ─── 10. Producto inactivo ───────────────────────────────────────────────────
section "10. Producto inactivo"

INACTIVATE=$(http_req PUT /products "{
  \"serial\": \"$SERIAL\",
  \"status\": \"INACTIVE\"
}")
STATUS=$(echo "$INACTIVATE" | cut -d'|' -f1)
assert_eq "PUT /products → INACTIVE" "200" "$STATUS"

INACTIVE_ORDER=$(http_req POST /orders "{
  \"userId\": \"$USER_ID\",
  \"idempotencyKey\": \"inactive-$(uuid)\",
  \"items\": [
    { \"productId\": \"$PRODUCT_ID\", \"quantity\": 1, \"price\": 1500 }
  ]
}")
STATUS=$(echo "$INACTIVE_ORDER" | cut -d'|' -f1)
assert_eq "POST /orders con producto inactivo → 400" "400" "$STATUS"

# ─── 11. Cart con producto inactivo ──────────────────────────────────────────
section "11. Cart rechaza producto inactivo"

CART_INACTIVE=$(http_req POST "/cart/$USER_ID" "{
  \"item\": { \"productId\": \"$PRODUCT_ID\", \"quantity\": 1 }
}")
STATUS=$(echo "$CART_INACTIVE" | cut -d'|' -f1)
assert_eq "POST /cart con producto inactivo → 400" "400" "$STATUS"

# ─── 12. Orden inexistente ───────────────────────────────────────────────────
section "12. Orden inexistente"

NOT_FOUND=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/orders/NO-EXISTE")
assert_eq "GET /orders/:id inexistente → 404" "404" "$NOT_FOUND"

# ─── Resumen ─────────────────────────────────────────────────────────────────
section "Resumen"

TOTAL=$((PASS + FAIL))
if [ "$FAIL" -eq 0 ]; then
  echo "${GREEN}✔ $PASS/$TOTAL passed${RESET}"
  exit 0
else
  echo "${RED}✘ $PASS/$TOTAL passed, $FAIL fallidos${RESET}"
  exit 1
fi