---
name: open-pr
description: 'Abre PR da branch atual para development: gera título conventional commits (type(SCOPE): ...) e corpo no padrão do time, vincula a issue e move para Review/Tests. Examples: "/open-pr", "abrir PR", "criar o PR dessa branch"'
---

# open-pr — Abrir PR no padrão do time

## Uso

```
/open-pr                # infere a issue pelo nome da branch
/open-pr <issue-number> # força o vínculo com a issue
/open-pr --draft
```

## Constantes

Leia `${CLAUDE_PLUGIN_ROOT}/reference/project-constants.md` — convenções de título/escopo e IDs do board.

## Fluxo

### 1 — Validar o estado da branch

```bash
git branch --show-current          # não pode ser development nem main
git status --porcelain             # avisar se houver mudanças não commitadas
git log development..HEAD --oneline
```

Se não houver commits à frente de `development`, pare e avise. Faça `git push -u origin <branch>` se a branch ainda não estiver no remote (ou estiver atrás).

### 2 — Identificar a issue

Extraia o número do padrão da branch `<type>/<n>-<slug>`; se não casar e não veio por argumento, pergunte. Leia a issue (`gh issue view <n> --json title,body,labels`) para contexto do resumo.

### 3 — Gerar título

Analise `git diff development...HEAD --stat` e os commits:

- **type**: o mesmo do prefixo da branch (`feat`, `fix`, etc.).
- **SCOPE**: pelo diretório dominante dos arquivos alterados (`apps/api/platform` → `API-PLATFORM`, `apps/ui/headquarter` → `UI-HEADQUARTER`, `libs/` compartilhada entre vários → `GLOBAL`, etc. — lista completa nas constantes).
- **descrição**: imperativa, inglês, lowercase, sem ponto final.

Formato final: `type(SCOPE): short imperative description`

### 4 — Gerar corpo (padrão pr.md do time)

```markdown
## O que foi feito

- <bullets objetivos citando artefatos concretos: endpoints, componentes, colunas, migrations>

## Resumo

<Parágrafo 1: o que foi solicitado (do ticket).>
<Parágrafo 2: o que foi entregue e como.>

Closes #<n>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

Corpo em pt-BR; título em inglês.

### 5 — Confirmar e criar

Mostre título + corpo e **confirme com o usuário** antes de criar:

```bash
gh pr create --base development --title "<título>" --body "<corpo>" [--draft]
```

### 6 — Mover a issue → Review/Tests

Resolva o project item ID e atualize o Status para `Review/Tests` (`5b90cd58`). Best-effort: se falhar, informe e siga.

### 7 — Reportar

```
🔀 PR aberta: <url>
   Título: <título>
   Issue:  #<n> → Review/Tests
   Checks: check-pr (format/lint/test), pre-commit, e2e — acompanhe com `gh pr checks --watch`
```

## Regras

- Base é **sempre** `development`.
- Título precisa passar no commitlint — valide type e SCOPE contra as listas das constantes antes de criar.
- Nunca crie a PR sem mostrar título e corpo para aprovação.
- PR de mudança em serviço de outro time deve ficar separada (convenção do time) — se o diff tocar domínio de outro time junto com o seu, avise antes de criar.
