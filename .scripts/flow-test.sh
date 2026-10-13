#!/usr/bin/env bash
# .scripts/flow-test.sh
#
# Test de flujo con N iteraciones. Respeta dependencias:
#   admin login → create products → register users → login users
#              → add to cart → create order → wait → verify
#
# Uso:
#   ./flow-test.sh                  # 20 iter, secuencial
#   ./flow-test.sh -n 50            # 50 iter, secuencial
#   ./flow-test.sh -p               # 20 iter, paralelo
#   ./flow-test.sh -p -n 100        # 100 paralelo
#   ./flow-test.sh -c               # todos compiten por 1 producto (race test)

set -uo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@example.com}"
ADMIN_PASS="${ADMIN_PASS:-Admin1234!}"
N=20
PARALLEL=false
CONTENTION=false
WAIT_MS="${FAKE_PAYMENT_DELAY_MS:-3000}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    -n) N="$2"; shift 2 ;;
    -p) PARALLEL=true; shift ;;
    -c) CONTENTION=true; shift ;;
    -h|--help) sed -n '2,15p' "$0"; exit 0 ;;
    *) echo "Unknown: $1"; exit 1 ;;
  esac
done

RED=$'\e[31m'; GREEN=$'\e[32m'; YELLOW=$'\e[33m'; BLUE=$'\e[34m'; DIM=$'\e[2m'; RESET=$'\e[0m'

PASS=0; FAIL=0; TOTAL=0
ok()      { PASS=$((PASS+1)); TOTAL=$((TOTAL+1)); echo "${GREEN}✔${RESET} $1"; }
fail()    { FAIL=$((FAIL+1)); TOTAL=$((TOTAL+1)); echo "${RED}✘${RESET} $1"; }
section() { echo; echo "${BLUE}━━━ $1 ━━━${RESET}"; }
info()    { echo "${DIM}$1${RESET}"; }

STATE_DIR=$(mktemp -d)
trap 'rm -rf "$STATE_DIR"' EXIT

# ─── HTTP helper ────────────────────────────────────────────────────
# Devuelve body, escribe status a $STATE_DIR/.status
http() {
  local method="$1" path="$2" body="${3:-}" token="${4:-}"
  local args=(-s -w '\n%{http_code}' -X "$method" "$BASE_URL$path")
  [[ -n "$token" ]] && args+=(-H "Authorization: Bearer $token")
  [[ -n "$body"  ]] && args+=(-H 'content-type: application/json' -d "$body")
  local raw; raw=$(curl "${args[@]}")
  echo "$raw" | tail -n1 > "$STATE_DIR/.status"
  echo "$raw" | sed '$d'
}
status() { cat "$STATE_DIR/.status"; }

uuid() { cat /proc/sys/kernel/random/uuid; }

# ─── Pre-checks ─────────────────────────────────────────────────────
section "Pre-checks"

LIVE=$(http GET /health/live)
[[ "$(status)" == "200" ]] && ok "health/live OK" || { fail "health/live KO — ¿app corriendo en $BASE_URL?"; exit 1; }
command -v jq >/dev/null || { fail "jq requerido"; exit 1; }
info "N=$N  paralelo=$PARALLEL  contention=$CONTENTION"

# ─── FASE 1: admin login ────────────────────────────────────────────
section "1. Admin login"

BODY=$(http POST /auth/login "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASS\"}")
if [[ "$(status)" == "200" ]]; then
  ADMIN_TOKEN=$(echo "$BODY" | jq -r '.accessToken')
  ok "admin login OK"
else
  fail "admin login KO ($(status)) — ¿corriste 'npm run seed:dev'?"
  exit 1
fi

# ─── FASE 2: crear productos ────────────────────────────────────────
section "2. Productos (admin)"

PRODUCTS_FILE="$STATE_DIR/products.tsv"
if $CONTENTION; then
  # 1 producto para todos — stock = N * 2 (por si todos compran 2)
  SERIAL="PROD-FLOW-CONTENTION-$(date +%s)"
  BODY=$(http POST /products "{\"serial\":\"$SERIAL\",\"name\":\"Contention Product\",\"price\":100,\"stock\":$((N*2))}" "$ADMIN_TOKEN")
  if [[ "$(status)" == "201" ]]; then
    PID=$(echo "$BODY" | jq -r '.id')
    printf "1\t%s\t%s\t%d\n" "$SERIAL" "$PID" $((N*2)) > "$PRODUCTS_FILE"
    ok "1 producto creado (stock=$((N*2))) — modo contención"
  else
    fail "POST /products KO ($(status))"; exit 1
  fi
else
  # N productos, 1 por usuario
  for i in $(seq 1 "$N"); do
    SERIAL="PROD-FLOW-${i}-$(date +%s%N | tail -c 6)"
    BODY=$(http POST /products "{\"serial\":\"$SERIAL\",\"name\":\"Product $i\",\"price\":100,\"stock\":10}" "$ADMIN_TOKEN")
    if [[ "$(status)" == "201" ]]; then
      PID=$(echo "$BODY" | jq -r '.id')
      printf "%d\t%s\t%s\t%d\n" "$i" "$SERIAL" "$PID" 10 >> "$PRODUCTS_FILE"
    else
      fail "POST /products [$i] KO ($(status))"
    fi
  done
  CREATED=$(wc -l < "$PRODUCTS_FILE")
  if [[ "$CREATED" == "$N" ]]; then
    ok "$N productos creados"
  else
    fail "solo $CREATED/$N productos creados"
  fi
fi

# ─── FASE 3: registrar + login usuarios ─────────────────────────────
section "3. Registro + login de $N usuarios"

USERS_FILE="$STATE_DIR/users.tsv"
: > "$USERS_FILE"

register_one() {
  local i="$1"
  local email="flow-${i}-$(date +%s%N | tail -c 8)@example.com"
  local pass="User1234!"

  http POST /auth/register "{\"email\":\"$email\",\"password\":\"$pass\"}" > /dev/null
  [[ "$(status)" == "201" ]] || { echo "REG_KO:$i:$(status)" >&2; return 1; }

  local body
  body=$(http POST /auth/login "{\"email\":\"$email\",\"password\":\"$pass\"}")
  [[ "$(status)" == "200" ]] || { echo "LOGIN_KO:$i:$(status)" >&2; return 1; }

  local token; token=$(echo "$body" | jq -r '.accessToken')
  printf "%d\t%s\t%s\n" "$i" "$email" "$token" >> "$USERS_FILE"
}
export -f register_one http status uuid
export BASE_URL STATE_DIR

 

USERS_OK=$(wc -l < "$USERS_FILE")
[[ "$USERS_OK" == "$N" ]] && ok "$N/$N usuarios listos" || fail "$USERS_OK/$N usuarios listos"

# ─── FASE 4: add to cart + create order ─────────────────────────────
section "4. Cart + Order ($N iteraciones)"

ORDERS_FILE="$STATE_DIR/orders.tsv"
: > "$ORDERS_FILE"

flow_one() {
  local i="$1"
  local token; token=$(awk -v k="$i" '$1==k{print $3}' "$USERS_FILE")
  [[ -z "$token" ]] && return 1

  # Elegir producto: en contención siempre el mismo; si no, el i-ésimo
  local pid
  if [[ "$CONTENTION" == "true" ]]; then
    pid=$(awk 'NR==1{print $3}' "$PRODUCTS_FILE")
  else
    pid=$(awk -v k="$i" '$1==k{print $3}' "$PRODUCTS_FILE")
  fi
  [[ -z "$pid" ]] && return 1

  # Add to cart
  http POST /cart/items "{\"item\":{\"productId\":\"$pid\",\"quantity\":2}}" "$token" > /dev/null
  [[ "$(status)" == "201" ]] || { echo "CART_KO:$i:$(status)" >&2; return 1; }

  # Create order
  local idem="flow-$(uuid)"
  local body
  body=$(http POST /orders "{\"idempotencyKey\":\"$idem\",\"items\":[{\"productId\":\"$pid\",\"quantity\":2,\"price\":100}]}" "$token")
  [[ "$(status)" == "201" ]] || { echo "ORDER_KO:$i:$(status)" >&2; return 1; }

  local oid; oid=$(echo "$body" | jq -r '.id')
  printf "%d\t%s\t%s\t%s\t%s\n" "$i" "$token" "$oid" "$idem" "$pid" >> "$ORDERS_FILE"
}
export -f flow_one
 

ORDERS_OK=$(wc -l < "$ORDERS_FILE")
[[ "$ORDERS_OK" == "$N" ]] && ok "$N/$N órdenes creadas" || fail "$ORDERS_OK/$N órdenes creadas"

# ─── FASE 5: esperar payment ────────────────────────────────────────
section "5. Esperando pago simulado"
WAIT_S=$(( (WAIT_MS / 1000) + 2 ))
info "sleep ${WAIT_S}s (FAKE_PAYMENT_DELAY_MS=${WAIT_MS})"
sleep "$WAIT_S"

# ─── FASE 6: verificar estados ──────────────────────────────────────
section "6. Verificación"

PAID_OK=0; PAID_KO=0
while IFS=$'\t' read -r i token oid idem pid; do
  body=$(http GET "/orders/$oid" "" "$token")
  st=$(echo "$body" | jq -r '.status')
  if [[ "$st" == "PAID" ]]; then
    PAID_OK=$((PAID_OK+1))
  else
    PAID_KO=$((PAID_KO+1))
    info "  orden $oid → $st (esperado PAID)"
  fi
done < "$ORDERS_FILE"

[[ "$PAID_KO" == "0" ]] && ok "$PAID_OK/$ORDERS_OK órdenes PAID" || fail "$PAID_OK/$ORDERS_OK PAID ($PAID_KO no llegaron)"

# ─── FASE 7: stock descontado ───────────────────────────────────────
section "7. Verificación de stock"

STOCK_OK=0; STOCK_KO=0
while IFS=$'\t' read -r i serial pid initial; do
  body=$(http GET "/products/$serial")
  actual=$(echo "$body" | jq -r '.stock')
  expected=$((initial - 2))
  if [[ "$actual" == "$expected" ]]; then
    STOCK_OK=$((STOCK_OK+1))
  else
    STOCK_KO=$((STOCK_KO+1))
    info "  $serial: esperado=$expected actual=$actual"
  fi
done < "$PRODUCTS_FILE"

[[ "$STOCK_KO" == "0" ]] && ok "$STOCK_OK/$N stocks correctos" || fail "$STOCK_OK/$N stocks correctos"

# ─── FASE 8: idempotencia (spot check) ──────────────────────────────
section "8. Idempotencia (1 caso)"

read -r i token oid idem pid < <(head -n1 "$ORDERS_FILE")
# Repetir POST con el mismo idempotencyKey
body=$(http POST /orders "{\"idempotencyKey\":\"$idem\",\"items\":[{\"productId\":\"$pid\",\"quantity\":2,\"price\":100}]}" "$token")
new_id=$(echo "$body" | jq -r '.id')
if [[ "$new_id" == "$oid" ]]; then
  ok "mismo idempotencyKey → misma orden ($oid)"
else
  fail "idempotencia rota: esperado $oid, recibido $new_id"
fi

# ─── RESUMEN ────────────────────────────────────────────────────────
section "Resumen"
echo "  ${GREEN}PASS:${RESET} $PASS"
echo "  ${RED}FAIL:${RESET} $FAIL"
echo "  ${DIM}TOTAL:${RESET} $TOTAL"
echo
if [[ "$FAIL" == "0" ]]; then
  echo "${GREEN}✔ $PASS/$TOTAL${RESET}"
  exit 0
else
  echo "${RED}✘ $PASS/$TOTAL ($FAIL fallos)${RESET}"
  exit 1
fi