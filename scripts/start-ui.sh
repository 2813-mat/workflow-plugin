#!/usr/bin/env bash
# Sobe a UI do incentive-workflow se ainda não estiver rodando (idempotente).
# Usado pelo hook SessionStart do plugin e utilizável manualmente.
# Desative o auto-start exportando INCENTIVE_UI_AUTOSTART=0 no seu shell.
set -u

[ "${INCENTIVE_UI_AUTOSTART:-1}" = "0" ] && exit 0

PORT="${PORT:-4545}"

# Já tem alguém servindo na porta (systemd ou start manual)? Então não faz nada.
if curl -sf -m 2 -o /dev/null "http://127.0.0.1:$PORT/api/reports" 2>/dev/null; then
  exit 0
fi

# Garante node no PATH (cobre instalações via nvm em shells não interativos)
if ! command -v node >/dev/null 2>&1; then
  NVM_NODE=$(ls -d "$HOME"/.nvm/versions/node/*/bin 2>/dev/null | sort -V | tail -1)
  [ -n "${NVM_NODE:-}" ] && export PATH="$NVM_NODE:$PATH"
fi
command -v node >/dev/null 2>&1 || { echo "node não encontrado no PATH" >&2; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$HOME/.local/state"
mkdir -p "$LOG_DIR"

nohup node "$SCRIPT_DIR/../ui/server.mjs" >> "$LOG_DIR/incentive-workflow-ui.log" 2>&1 &
disown
exit 0
