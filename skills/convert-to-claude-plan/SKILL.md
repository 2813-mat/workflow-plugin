---
name: convert-to-claude-plan
description: 'Converts an existing GitHub issue to the claude_plan template format, finding relevant files and standardizing structure for Claude Code implementation. Examples: "/convert-to-claude-plan 1964", "converter issue para claude plan", "migrar issue para claude plan"'
---

# convert-to-claude-plan — Convert issue to Claude implementation plan

## Usage

```
/convert-to-claude-plan <issue-number>
```

## Template format (source of truth)

```markdown
## Arquivos Relevantes

<!-- Entrypoints e arquivos principais onde as alterações devem acontecer. -->

## Contexto

<!-- O quê e por quê. Descreva o problema ou feature de forma clara. -->

## Steps

- [ ] step 1
- [ ] atualizar testes automatizados em apps/e2e de acordo com o escopo da tarefa
- [ ] rodar testes automatizados com nx e2e {nxProjectName}-e2e de acordo com os projetos afetados
```

## Workflow

### Step 1 — Fetch the existing issue

```bash
gh issue view <number> --repo incentive-me/incentive-me --json title,body,labels,assignees
```

Read the current title, body, and labels carefully.

### Step 2 — Find relevant files

Use GitNexus and/or codebase exploration to locate the main files that will need to change:

- Run `gitnexus_query({ query: "<concept from issue>" })` to find execution flows related to the task
- Run `gitnexus_context({ name: "<symbol>" })` for specific symbols mentioned or implied
- Use `find` or `grep` to locate components, controllers, services, or migrations referenced in the issue body
- Focus on **entrypoints**: the files where the change begins (route files, controllers, components, migration files, service methods)

List each file with a one-line explanation of why it is relevant:

```
- `apps/ui/headquarter/src/pages/nds/NdsPage.tsx` — página principal das NDs; botão a ser ocultado está aqui
- `libs/database/platform/mysql/migrations/` — nova migration necessária para a mudança de schema
```

### Step 3 — Write the implementation steps

Decompose the task into concrete, ordered steps. Each step must be:
- Actionable (starts with a verb: "Remover", "Adicionar", "Criar", "Atualizar", "Verificar")
- Scoped to a specific file or layer when possible
- Small enough that it can be verified independently

**Always include as the last two steps** (in this exact order, adjusting `{nxProjectName}` to the affected project):
```
- [ ] atualizar testes automatizados em apps/e2e de acordo com o escopo da tarefa
- [ ] rodar testes automatizados com nx e2e {nxProjectName}-e2e de acordo com os projetos afetados
```

To find the correct `{nxProjectName}`, check `project.json` in the relevant app directory or run:
```bash
find apps -name "project.json" | xargs grep -l '"name"' | head -10
```

### Step 4 — Compose the new body

Assemble the body following the template exactly. Rules:

- **Arquivos Relevantes**: list only files that will actually be touched — no speculative entries. Include the file path in a code span and a short explanation after a dash.
- **Contexto**: one clear paragraph explaining *what* the task is and *why* it is needed. Preserve the original intent from the issue; add context only when the original is too vague for a developer (or Claude) to act on without ambiguity.
- **Steps**: ordered checklist. The last two steps are always the e2e ones above.
- Do NOT include the HTML comments from the template in the final body.

### Step 5 — Update the issue

```bash
gh issue edit <number> \
  --repo incentive-me/incentive-me \
  --body "<new body>" \
  --add-label "claude-plan"
```

### Step 6 — Report to user

Summarize what changed:

```
✅ Issue #<number> convertida para claude-plan
   Arquivos relevantes: <count> arquivo(s) listado(s)
   Steps: <count> step(s) definido(s)
   Label adicionada: claude-plan
   Link: https://github.com/incentive-me/incentive-me/issues/<number>
```

## Rules

- NEVER change the issue title
- NEVER remove information from the original body — only restructure and enrich
- Preserve the original acceptance criteria if present; convert them into Steps if not already in checklist format
- If the issue already has a `## Sub-issues` section or `## Commits relacionados`, keep them intact at the end of the body
- The e2e steps are mandatory and must always be the last two items in the Steps checklist
- If the task clearly does not touch any app with an e2e suite (e.g. pure DB migration or script-only change), replace the e2e steps with: `- [ ] verificar manualmente o comportamento esperado em ambiente de desenvolvimento`
