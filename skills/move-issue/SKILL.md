---
name: move-issue
description: 'Move uma issue de coluna no board Produto (#12): Todo, In Progress, Review/Tests, Done — ou o campo Phase (Refinement/Development). Examples: "/move-issue 2203 done", "mover a 2203 para review", "issue 2203 está pronta"'
---

# move-issue — Mover issue no board

## Uso

```
/move-issue <issue-number> <status>
/move-issue <issue-number> --phase <refinement|development>
```

## Constantes

Leia `${CLAUDE_PLUGIN_ROOT}/reference/project-constants.md` — field IDs e option IDs de Status e Phase.

## Mapeamento de status (aceite variações pt/en)

| Entrada aceita | Status alvo | Option ID |
|---|---|---|
| todo, backlog, a fazer | Todo | `f75ad846` |
| in progress, progress, andamento, fazendo, doing | In Progress | `47fc9ee4` |
| review, tests, review/tests, revisão | Review/Tests | `5b90cd58` |
| done, concluído, pronto, finalizada | Done | `98236657` |

Phase: refinement → `7e46bdad` · development → `a96f5481` (campo `PVTSSF_lADOA9blt84BDMn8zg1Xldw`).

## Fluxo

1. **Resolver o project item ID** da issue no projeto `PVT_kwDOA9blt84BDMn8` (snippet das constantes). Se a issue não estiver no projeto, avise e pergunte se deve adicioná-la (`addProjectV2ItemById`) antes de mover.
2. **Ler o status atual** (fieldValues do item) e informar a transição: `Todo → In Progress`.
3. **Executar a mutation** `updateProjectV2ItemFieldValue` com o field ID e option ID corretos.
4. **Avisos contextuais** (não bloqueiam):
   - Movendo para **Done** com PR vinculada ainda aberta → avise.
   - Movendo para **Review/Tests** sem PR vinculada → avise que não há PR e sugira `/open-pr`.
   - Movendo para **In Progress** sem assignee → ofereça `gh issue edit <n> --add-assignee @me`.
5. **Reportar**: `✅ #<n> movida: <de> → <para>` + link do board.

## Regras

- Uma única mutation por chamada; não altere outros campos.
- Erro de permissão em project → oriente `gh auth refresh -s project`.
- Se o argumento de status for ambíguo, pergunte em vez de adivinhar.
