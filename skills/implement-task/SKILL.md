---
name: implement-task
description: 'Implementa uma issue de ponta a ponta numa worktree isolada, em branch de trabalho separada. O merge na branch de feature SÓ acontece após validação explícita do usuário sobre o diff. Examples: "/implement-task 2203", "implementar a issue 2203"'
---

# implement-task — Implementar issue em worktree isolada com validação

## Uso

```
/implement-task <issue-number>
```

## Constantes

Leia `${CLAUDE_PLUGIN_ROOT}/reference/project-constants.md` — convenções de branch, IDs do board e snippets GraphQL.

## Princípio

A implementação acontece numa **branch de trabalho** (`claude/<n>-<slug>`) dentro de uma **worktree isolada** — nunca direto na branch de feature. A branch de feature (`<type>/<n>-<slug>`) só recebe o código depois que o usuário revisar o diff e aprovar explicitamente. Sem aprovação, nada é mergeado nem pushado.

## Fluxo

### 1 — Preparação

Rode dentro de um clone do `incentive-me/incentive-me` (confira com `gh repo view --json nameWithOwner`; se não estiver, pergunte o caminho).

1. Leia a issue: `gh issue view <n> --json number,title,body,labels,comments,url`.
2. Se **não** houver plano (seções `## Steps` no body ou comentário `## Refinamento`), pare e sugira `/dev-plan <n>` primeiro — implementar sem plano só com confirmação do usuário.
3. Derive os nomes (convenções nas constantes):
   - Branch de feature: `<type>/<n>-<slug>` — crie vinculada à issue se não existir: `gh issue develop <n> --name "<feature-branch>" --base development`
   - Branch de trabalho: `claude/<n>-<slug>` — criada a partir da feature branch
4. Crie a worktree isolada:
   ```bash
   git fetch origin "<feature-branch>"
   git worktree add ~/incentive-me/worktrees/incentive-me/claude-<n>-<slug> -b "claude/<n>-<slug>" "origin/<feature-branch>"
   ```
   Copie `.local.env` do worktree principal se existir.
5. Mova a issue para **In Progress** no board (best-effort) e garanta o assignee (`gh issue edit <n> --add-assignee @me`).

### 2 — Implementação (dentro da worktree)

Trabalhe **somente** dentro da worktree. Siga o plano da issue:

- `## Arquivos Relevantes` = entrypoints; `## Contexto` = background; `## Steps` = implemente em ordem.
- Antes de editar símbolos centrais, se GitNexus estiver disponível, rode `gitnexus_impact` — pause e avise se o risco for HIGH/CRITICAL.
- A cada step concluído, marque o checkbox na issue (`gh issue edit <n> --body "<body com [x]>"`).
- Descobriu algo fora do plano? Comente na issue (`gh issue comment <n>`), não expanda o escopo por conta própria.
- Commits pequenos e convencionados (`type(SCOPE): desc` — valide contra as constantes), na branch de trabalho.
- Rode os testes das camadas alteradas (`npx nx test <projeto>`) antes de declarar pronto.

### 3 — Validação do usuário (GATE OBRIGATÓRIO)

Ao terminar todos os steps:

1. Apresente um resumo da entrega: steps concluídos, arquivos alterados (`git diff <feature-branch>...HEAD --stat`), resultado dos testes.
2. Mostre o diff completo ou por arquivo, como o usuário preferir.
3. **Pergunte explicitamente**: "Aprovar o merge de `claude/<n>-<slug>` na `<feature-branch>`?"
4. Se o usuário pedir ajustes, faça-os na worktree e volte ao passo 1 deste gate.

**NUNCA** faça merge, push da feature branch ou abra PR sem o "sim" explícito.

### 4 — Merge e limpeza (só após aprovação)

```bash
# no clone principal (fora da worktree)
git checkout "<feature-branch>"
git merge --no-ff "claude/<n>-<slug>" -m "merge: implement #<n> via claude worktree"
git push origin "<feature-branch>"
git worktree remove ~/incentive-me/worktrees/incentive-me/claude-<n>-<slug>
git branch -D "claude/<n>-<slug>"
```

### 5 — Próximo passo

Ofereça `/open-pr <n>` (a partir da feature branch) e informe:

```
✅ Issue #<n> implementada e mergeada em <feature-branch>
   Worktree removida · Branch de trabalho apagada
   Steps: <N>/<N> · Testes: <resultado>
   Próximo: /open-pr <n>
```

## Regras

- Implementação **só** na worktree; nunca toque na feature branch diretamente antes da aprovação.
- Sem aprovação = worktree e branch de trabalho ficam intactas para o usuário inspecionar; diga onde estão.
- Só implemente o que a issue descreve — sem refactors extras nem gold-plating.
- Se os testes falharem, reporte o output real e corrija antes de apresentar para validação; nunca apresente como pronto com teste quebrado.
