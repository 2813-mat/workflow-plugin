---
name: sprint-health
description: 'Diagnóstico da sprint com pontos de melhoria: spillover, gargalos em review, WIP alto, itens sem estimativa, distribuição por pessoa/categoria. Examples: "/sprint-health", "como está a sprint?", "pontos de melhoria da sprint"'
---

# sprint-health — Saúde da sprint e pontos de melhoria

## Uso

```
/sprint-health                     # sprint atual, todos os times
/sprint-health --team "<nome>"     # só um time
/sprint-health --iteration "<título>"  # sprint passada (retrospectiva)
```

## Constantes

Leia `${CLAUDE_PLUGIN_ROOT}/reference/project-constants.md`.

## Coleta

1. **Sprint alvo** — detecte a iteration atual (ou resolva `--iteration` pelo título) e calcule dias decorridos/restantes.
2. **Itens do projeto** — snippet "Listar itens do projeto", filtrado pela iteration alvo (e Team, se informado). Capture: Status, Size, Priority, Category, assignees, labels (`Spillover`, `block-reason/*`), `updatedAt`.
3. **PRs em aberto do repo** — `gh pr list --repo incentive-me/incentive-me --state open --json number,title,createdAt,reviewDecision,isDraft,author` — cruze com as issues da sprint para medir tempo em review.

## Métricas a calcular

| Métrica | Como | Sinal de alerta |
|---|---|---|
| Progresso | pts Done / pts totais vs. % da sprint decorrida | progresso < % decorrido − 15pp |
| Spillover | itens com label `Spillover` | > 20% dos itens |
| Gargalo de review | itens em Review/Tests e idade das PRs abertas | PR aberta > 2 dias úteis sem review |
| WIP por pessoa | itens In Progress por assignee | > 2 por pessoa |
| Sem estimativa | itens sem Size | qualquer um |
| Sem assignee | itens Todo/In Progress sem assignee | In Progress sem dono |
| Itens parados | In Progress com `updatedAt` antigo | > 3 dias sem update |
| Mix de categoria | distribuição Feature / Débito Técnico / Evolução / Operacional | informativo |
| Risco de estouro | itens grandes (size ≥ 8) ainda em Todo com sprint > 50% decorrida | qualquer um |

## Formato de saída

```
# 🩺 Saúde da sprint — <iteration title> (dia X de Y)

## Placar
| | Todo | In Progress | Review/Tests | Done |
|---|---|---|---|---|
| Issues | n | n | n | n |
| Pontos | n | n | n | n |

Progresso: <n>% dos pontos concluídos com <m>% da sprint decorrida — <no ritmo | atrás | adiantado>

## 🔴 Pontos de melhoria
<bullets ordenados por impacto, cada um com issue/PR concreta e ação sugerida.
Só liste o que os dados sustentam. Ex.:
- Review é o gargalo: 4 PRs aguardando > 2 dias (#124, #130...) — sugerir rodízio de review no daily
- #801 (size 13) ainda em Todo no dia 7 de 10 — quebrar em sub-issues ou mover para a próxima sprint
- 3 itens sem estimativa (#810, #811, #812) — estimar no planning>

## 🟡 Observações
<sinais menores; omita se não houver>

## Por pessoa
| Assignee | In Progress | Review | Done (pts) |
|---|---|---|---|
```

## Regras

- Somente leitura — nenhuma mutation.
- Cada ponto de melhoria precisa apontar issues/PRs específicas e uma ação — nada de "melhorar comunicação".
- Se usado com `--iteration` passada, mude o tom para retrospectiva: o que estourou, o que ficou parado, sugestões para a próxima sprint.
- Ao final, ofereça salvar como `sprint-health-<iteration>.md` (não salve sem pedir).
