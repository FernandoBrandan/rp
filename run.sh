#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

B=$'\e[1m'; G=$'\e[32m'; Y=$'\e[33m'; R=$'\e[31m'; D=$'\e[2m'; N=$'\e[0m'

COMPOSE_DEV="docker compose --env-file .env.dev -f .docker/docker-compose.yml"
COMPOSE_PROD="docker compose --env-file .env.docker -f .docker/docker-compose.prod.yml"

which_stack() {
  docker ps --format '{{.Names}}' 2>/dev/null | grep -q '^ecommerce_app$' && echo prod && return
  docker ps --format '{{.Names}}' 2>/dev/null | grep -q '^ecommerce_postgres$' && echo dev && return
  echo none
}

usage() {
  cat <<EOF
${B}Uso:${N} ./run.sh <comando>

${B}Entornos:${N}
  dev        Levanta Postgres + Redis (para 'npm run start:dev')
  prod       Build + levanta todo containerizado
  down       Baja ambos stacks
  nuke       Baja todo y borra volúmenes (⚠️)

${B}Útiles:${N}
  ps           Estado de containers (dev + prod)
  logs [svc]   Logs en vivo (auto-detecta el stack activo)
  sh <svc>     Shell dentro de un container (app | postgres | redis)
  db           Abre psql en el Postgres del stack activo
  smoke        Corre .scripts/smoke-test.sh

${B}Migraciones${N} (siempre NODE_ENV=dev):
  migrate      Corre migraciones pendientes
  revert       Revierte la última
  show         Lista aplicadas/pendientes
  seed         Carga datos de demo (1 admin + 3 productos) — idempotente
  
${B}Otros:${N}
  help         Este mensaje
EOF
}

cmd="${1:-help}"; shift || true

case "$cmd" in

  dev)
    $COMPOSE_PROD down --remove-orphans >/dev/null 2>&1 || true
    $COMPOSE_DEV up -d
    echo "${G}✔${N} Dev arriba. ${D}→ npm run start:dev${N}"
    ;;

  prod)
    # 1. Build PRIMERO: si falla, dev sigue intacto
    if ! $COMPOSE_PROD build; then
      echo "${R}✘ Build falló. El stack de dev sigue como estaba.${N}"
      exit 1
    fi
    # 2. Recién ahora bajamos dev y levantamos prod
    $COMPOSE_DEV down --remove-orphans >/dev/null 2>&1 || true
    $COMPOSE_PROD up -d
    echo "${G}✔${N} Prod-local arriba."
    echo "  ${D}→ App:      http://localhost:3000${N}"
    echo "  ${D}→ Swagger:  http://localhost:3000/api/docs${N}"
    echo "  ${D}→ Health:   http://localhost:3000/health${N}"
    echo "  ${D}→ Logs:     ./run.sh logs${N}"
    ;;

  down)
    $COMPOSE_DEV down --remove-orphans >/dev/null 2>&1 || true
    $COMPOSE_PROD down --remove-orphans >/dev/null 2>&1 || true
    echo "${G}✔${N} Containers bajados."
    ;;

  nuke)
    read -p "${R}⚠️  Borra Postgres + Redis (volúmenes). ¿Seguro? [y/N]${N} " -n 1 -r; echo
    [[ $REPLY =~ ^[Yy]$ ]] || exit 1
    $COMPOSE_DEV down -v --remove-orphans >/dev/null 2>&1 || true
    $COMPOSE_PROD down -v --remove-orphans >/dev/null 2>&1 || true
    echo "${G}✔${N} Todo borrado."
    ;;

  ps)
    echo "${B}— Dev —${N}"; $COMPOSE_DEV ps || true
    echo; echo "${B}— Prod-local —${N}"; $COMPOSE_PROD ps || true
    ;;

  logs)
    case "$(which_stack)" in
      prod) $COMPOSE_PROD logs -f "$@" ;;
      dev)  $COMPOSE_DEV  logs -f "$@" ;;
      *)    echo "${Y}Ningún stack arriba.${N} Corré './run.sh dev' o './run.sh prod'." ;;
    esac
    ;;

  sh)
    case "${1:-app}" in
      app)      docker exec -it ecommerce_app sh ;;
      postgres) docker exec -it ecommerce_postgres sh ;;
      redis)    docker exec -it ecommerce_redis sh ;;
      *)        echo "${R}Servicio desconocido: ${1:-} (app|postgres|redis)${N}"; exit 1 ;;
    esac
    ;;

  db)
    docker exec -it ecommerce_postgres psql -U postgres -d ecommerce
    ;;

  migrate) NODE_ENV=dev npm run migration:run:dev ;;
  revert)  NODE_ENV=dev npm run migration:revert ;;
  show)    NODE_ENV=dev npm run migration:show ;;

  seed)    NODE_ENV=dev npm run seed:dev ;;

  smoke)
    bash .scripts/smoke-test.sh
    ;;

  help|*) usage ;;
esac