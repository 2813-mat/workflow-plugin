---
name: my-tasks
description: 'Lista as tasks da sprint atual no GitHub Projects (Produto #12), agrupadas por status. Por padrão filtra pelo usuário logado; aceita --all (sprint inteira) ou --team <nome>. Examples: "/my-tasks", "minhas tasks", "o que tenho pra fazer na sprint?"'
---

# my-tasks — Puxar tasks da sprint

## Uso

```
/my-tasks            # minhas tasks na sprint atual
/my-tasks --all      # todas as tasks da sprint
/my-tasks --team "Plataforma e Conta Digital"
```

## Constantes

Leia `${CLAUDE_PLUGIN_ROOT}/reference/project-constants.md` antes de executar — todos os IDs, queries GraphQL e convenções estão lá.

## Fluxo

1. **Identificar o usuário** — `gh api user --jq '.login'` (pule se `--all` ou `--team`).
2. **Detectar a sprint atual** — use o snippet "Detectar iteration atual" das constantes. Guarde `id`, `title`, `startDate` e `duration`.
3. **Buscar os itens do projeto** — use o snippet "Listar itens do projeto com campos", paginando até `hasNextPage = false`. Filtre localmente (via `--jq` ou em memória):
   - `fieldValues` com Iteration == sprint atual
   - Se filtro por usuário: `assignees` contém o login
   - Se `--team`: fieldValue Team == nome informado
   - Ignore itens sem `content.number` (draft items) apenas se não tiverem título
4. **Apresentar** — agrupe por Status na ordem do fluxo: **In Progress → Review/Tests → Todo → Done**. Dentro de cada grupo, ordene por Priority (Now > Next > Later > sem prioridade). Formato:

```
## Sprint: <iteration title> (<startDate> → <fim>)  — <login|time|todos>

### 🔨 In Progress (N)
| # | Título | Size | Priority | Assignees |
|---|--------|------|----------|-----------|
| [#123](url) | ... | 5 | Now | @fulano |

### 👀 Review/Tests (N)
...

### 📋 Todo (N)
...

### ✅ Done (N)  — só a contagem e os números, sem tabela completa
```

5. **Sugerir próximo passo** — ao final, se houver itens em Todo do usuário, sugira: `"/start-task <n>"` para o item de maior prioridade. Se algum item tiver label `block-reason/*`, destaque como **bloqueado** com o motivo.

## Regras

- Nunca faça mutation nesta skill — é somente leitura.
- Se a sprint atual não for encontrada (gap entre iterations), avise e liste a iteration mais recente.
- Se o usuário não tiver nenhum item, diga isso claramente e ofereça `--all` ou `/sprint-task` (skill do repo incentive-me) para criar uma nova task.
