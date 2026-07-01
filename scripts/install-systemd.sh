#!/usr/bin/env bash
# Instala a UI do incentive-workflow como serviço systemd de usuário.
# Sobe no login da máquina e reinicia sozinho se cair. Uso:
#   ./scripts/install-systemd.sh
# Variáveis opcionais:
#   PORT=4545                          porta da UI
#   INCENTIVE_REPO=~/caminho/monorepo  clone do incentive-me (default: ~/Desenvolvimento/incentive-me)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_DIR="$(dirname "$SCRIPT_DIR")"
NODE_BIN="$(command -v node || true)"
if [ -z "$NODE_BIN" ]; then
  NODE_BIN=$(ls "$HOME"/.nvm/versions/node/*/bin/node 2>/dev/null | sort -V | tail -1)
fi
[ -n "$NODE_BIN" ] || { echo "❌ node não encontrado — instale Node >= 18"; exit 1; }

UNIT_DIR="$HOME/.config/systemd/user"
mkdir -p "$UNIT_DIR"
cat > "$UNIT_DIR/incentive-workflow-ui.service" <<EOF
[Unit]
Description=incentive-workflow UI (localhost:${PORT:-4545})

[Service]
ExecStart=$NODE_BIN $PLUGIN_DIR/ui/server.mjs
Environment=PATH=$HOME/.local/bin:$(dirname "$NODE_BIN"):/usr/local/bin:/usr/bin:/bin
${PORT:+Environment=PORT=$PORT}
${INCENTIVE_REPO:+Environment=INCENTIVE_REPO=$INCENTIVE_REPO}
Restart=on-failure
RestartSec=3

[Install]
WantedBy=default.target
EOF

systemctl --user daemon-reload
systemctl --user enable --now incentive-workflow-ui.service
sleep 1
if systemctl --user is-active --quiet incentive-workflow-ui.service; then
  echo "✅ Serviço ativo — http://localhost:${PORT:-4545}"
  echo "   status:    systemctl --user status incentive-workflow-ui"
  echo "   logs:      journalctl --user -u incentive-workflow-ui -f"
  echo "   remover:   systemctl --user disable --now incentive-workflow-ui && rm $UNIT_DIR/incentive-workflow-ui.service"
else
  echo "❌ Serviço não subiu — veja: journalctl --user -u incentive-workflow-ui -n 30"
  exit 1
fi
