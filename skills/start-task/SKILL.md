---
name: start-task
description: 'Inicia o trabalho em uma issue: cria branch vinculada (gh issue develop), opcionalmente worktree, garante assignee e move o Status para In Progress no board. Examples: "/start-task 2203", "começar a issue 2203", "pegar a task 2203"'
---

# start-task — Iniciar trabalho em uma issue

## Uso

```
/start-task <issue-number>
/start-task <issue-number> --worktree   # cria git worktree separado
```

## Constantes

Leia `${CLAUDE_PLUGIN_ROOT}/reference/project-constants.md` — IDs do projeto, convenções de branch e snippets GraphQL.

## Pré-condição

Este comando deve rodar dentro de um clone do `incentive-me/incentive-me` (verifique com `gh repo view --json nameWithOwner`). Se não estiver, pergunte o caminho do clone antes de continuar.

## Fluxo

### 1 — Ler a issue

```bash
gh issue view <n> --json number,title,body,labels,assignees,url
```

### 2 — Derivar a branch

- Type pelo(s) label(s): `type/bug` ou "bug" → `fix`; "documentation" → `docs`; "chore" → `chore`; caso contrário → `feat`.
- Slug: título → ascii lowercase, não-alfanumérico vira `-`, colapsa `-` repetidos, máx. 40 chars (encurte mantendo o sentido se passar).
- Nome final: `<type>/<n>-<slug>`.

### 3 — Criar branch vinculada à issue

Se a branch já existir no remote, apenas faça fetch; senão:

```bash
gh issue develop <n> --name "<branch>" --base development
git fetch origin "<branch>":"<branch>"
```

- Sem `--worktree`: `git checkout <branch>`.
- Com `--worktree`: crie em `~/incentive-me/worktrees/<repo>/<branch>` e copie o `.local.env` do worktree principal, se existir.

### 4 — Garantir assignee

Se o usuário atual (`gh api user --jq '.login'`) não estiver nos assignees:

```bash
gh issue edit <n> --add-assignee @me
```

### 5 — Mover Status → In Progress

Resolva o project item ID (snippet das constantes) e atualize o campo Status com a option `In Progress` (`47fc9ee4`). Se a issue não estiver no project, avise e siga — não bloqueie.

### 6 — Apresentar o plano

- Se o body tiver seções `## Arquivos Relevantes` / `## Steps` (formato claude-plan) ou houver comentário começando com `## Refinamento`, mostre um resumo do plano e pergunte se é para começar a implementar.
- Se **não** houver plano, sugira rodar `/dev-plan <n>` antes de codar.

### 7 — Reportar

```
🚀 Trabalhando na issue #<n>: <título>
   Branch:   <branch>  (base: development)
   Worktree: <caminho ou "—">
   Status:   In Progress
   Plano:    <"encontrado no body/comentário" | "nenhum — rode /dev-plan <n>">
```

## Regras

- Nunca crie branch a partir de `main` — a base é sempre `development`.
- Não sobrescreva branch/worktree existente; reutilize.
- A movimentação de Status é best-effort: falha de scope `project` → oriente `gh auth refresh -s project` e siga.
