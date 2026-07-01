#!/usr/bin/env bash
# Daily report automático (plugin incentive-workflow) — pensado para crontab:
#   30 9 * * * ~/daily-reports/run-daily-report.sh
# Requer: claude CLI e gh autenticado; plugin incentive-workflow instalado em escopo de usuário.
set -uo pipefail
export PATH="$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin"

REPO_DIR="${INCENTIVE_REPO:-$HOME/Desenvolvimento/incentive-me}"
OUT_DIR="${DAILY_REPORTS_DIR:-$HOME/daily-reports}"
OUT="$OUT_DIR/daily-$(date +%F).md"
mkdir -p "$OUT_DIR"
cd "$REPO_DIR"

claude -p "/daily-report — gere o relatório diário completo, incluindo a tabela de pontos da sprint (planejado / em andamento / em review / entregue). Não pergunte nada e não ofereça próximos passos: a resposta final deve conter APENAS o markdown do relatório, começando direto no título # 📅 Daily, sem preâmbulo." \
  --allowedTools "Bash(gh api:*)" "Bash(gh issue list:*)" "Bash(gh pr list:*)" "Bash(git log:*)" "Read" "Skill" \
  > "$OUT" 2> "$OUT_DIR/last-run.log"
notify-send "Daily report" "Relatório salvo em $OUT" 2>/dev/null || true
