---
name: daily-report
description: 'Relatório diário do dev: o que foi feito (PRs, issues, commits), o que está em andamento/review, bloqueios e o que ainda falta na sprint. Examples: "/daily-report", "meu daily", "o que eu fiz hoje?", "relatório de ontem: /daily-report --date 2026-06-30"'
---

# daily-report — Relatório diário

## Uso

```
/daily-report                    # hoje, para o usuário logado
/daily-report --date YYYY-MM-DD  # outro dia
/daily-report --team "<nome>"    # visão do time em vez de pessoal
```

## Constantes

Leia `${CLAUDE_PLUGIN_ROOT}/reference/project-constants.md`.

## Coleta (rode em paralelo quando possível)

Defina `LOGIN=$(gh api user --jq '.login')` e `DATE` (default: hoje, timezone America/Sao_Paulo).

1. **PRs merged no dia**:
   `gh pr list --repo incentive-me/incentive-me --author "$LOGIN" --state merged --search "merged:$DATE" --json number,title,url,mergedAt`
2. **PRs abertas/atualizadas** (em review):
   `gh pr list --repo incentive-me/incentive-me --author "$LOGIN" --state open --json number,title,url,isDraft,reviewDecision,statusCheckRollup`
3. **Issues fechadas no dia**:
   `gh issue list --repo incentive-me/incentive-me --assignee "$LOGIN" --state closed --search "closed:$DATE" --json number,title,url`
4. **Board da sprint atual** — snippet "Listar itens do projeto" das constantes, filtrado por assignee (ou Team, se `--team`): status de cada item, **Size**, labels `block-reason/*` e `Spillover`.
5. **Commits do dia na branch atual** (se estiver num clone): `git log --author="$(git config user.email)" --since="$DATE 00:00" --until="$DATE 23:59" --oneline --all` — use como detalhe do "em andamento".

## Formato de saída

```
# 📅 Daily — <data> (<login|time>)

## 📊 Meus pontos na sprint (<iteration title>)
| Planejado | Em andamento | Em review | Entregue |
|-----------|--------------|-----------|----------|
| <soma Size de TODOS os meus itens da sprint> | <soma Size dos In Progress> | <soma Size dos Review/Tests> | <soma Size dos Done> |

Entregue: <X> de <Y> pts (<Z>%) — <no ritmo | atrás | adiantado> para o dia <n> de <total> da sprint

## ✅ Feito
- PR #123 merged: <título> (<url>)
- Issue #456 concluída: <título>
<se vazio: "Nada finalizado hoje — em andamento abaixo.">

## 🔨 Em andamento
- #789 <título> — In Progress desde <estimativa>; commits de hoje: <resumo curto do que avançou>

## 👀 Em review
- PR #124 <título> — <aprovada/aguardando review/checks falhando (quais)>

## 🚧 Bloqueios
- #790 <título> — block-reason/<motivo>
<se vazio, omita a seção>

## 📋 Ainda falta na sprint (<iteration title>)
- #801 <título> (Size 5, Now)
- Total restante: <N> issues / <soma dos sizes> pts

## 💡 Pontos de atenção
<1-3 bullets acionáveis, só se houver sinal real. Exemplos:
- PR #124 aberta há 3 dias sem review — vale cobrar
- #801 é size 13 e a sprint termina em 2 dias — risco de spillover
- #790 sem estimativa (Size vazio)>
```

## Regras

- **Pontos (Size)**: extraia o número do início do valor do campo Size (ex.: "5 – Dois a três dias" → 5). Item sem Size conta como 0 e deve ser listado em "Pontos de atenção" como sem estimativa. "Planejado" = soma de todos os itens do usuário na iteration atual, independente de status.
- Somente leitura — nenhuma mutation.
- Ao final, ofereça: salvar em `daily-<data>.md` ou copiar para o standup (não salve sem pedir).
- Datas de busca do GitHub são UTC; para o dia em SP, use o range `YYYY-MM-DDT03:00:00..YYYY-MM-(DD+1)T03:00:00` quando a precisão importar.
- "Pontos de atenção" sem sinal real = omita a seção; nada de observação genérica.
