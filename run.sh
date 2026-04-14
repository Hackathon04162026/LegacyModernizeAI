#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-dev}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd "$REPO_ROOT"

echo "Using repo: $REPO_ROOT"
echo "Mode: $MODE"

if command -v npm >/dev/null 2>&1; then
  NPM_BIN="npm"
elif [ -x "$REPO_ROOT/tools/node/npm" ]; then
  NPM_BIN="$REPO_ROOT/tools/node/npm"
elif [ -x "$REPO_ROOT/tools/node/bin/npm" ]; then
  NPM_BIN="$REPO_ROOT/tools/node/bin/npm"
else
  echo "npm was not found. Install Node.js or add a portable runtime under tools/node." >&2
  exit 1
fi

open_url() {
  local url="$1"
  (
    sleep 5
    if command -v open >/dev/null 2>&1; then
      open "$url" >/dev/null 2>&1 || true
    elif command -v xdg-open >/dev/null 2>&1; then
      xdg-open "$url" >/dev/null 2>&1 || true
    fi
  ) &
}

if [ "$MODE" = "demo" ]; then
  echo "Installing dependencies if needed..."
  "$NPM_BIN" install

  echo "Building frontend..."
  "$NPM_BIN" run build

  echo "Starting API on http://localhost:4000 ..."
  open_url "http://localhost:4000"
  "$NPM_BIN" run dev:api
  exit $?
fi

echo "Installing dependencies if needed..."
"$NPM_BIN" install

echo "Starting API in background..."
"$NPM_BIN" run dev:api > api.log 2> api.err.log &
API_PID=$!

echo "Starting web app in background..."
"$NPM_BIN" run dev:web > web.log 2> web.err.log &
WEB_PID=$!

open_url "http://localhost:5173"

echo ""
echo "Dev mode started."
echo "API: http://localhost:4000"
echo "Web: http://localhost:5173"
echo "API PID: $API_PID"
echo "Web PID: $WEB_PID"
echo "Logs: api.log, api.err.log, web.log, web.err.log"
wait
