---
name: dev-plan
description: 'Monta um plano de desenvolvimento para uma issue: explora o código, escreve Arquivos Relevantes + Contexto + Steps (formato claude-plan) e grava no body da issue com a label claude-plan. Examples: "/dev-plan 2203", "montar plano para a issue 2203", "planejar a task 2203"'
---

# dev-plan — Plano de desenvolvimento de uma issue

## Uso

```
/dev-plan <issue-number>
```

## Constantes

Leia `${CLAUDE_PLUGIN_ROOT}/reference/project-constants.md`.

## Fluxo

### 1 — Coletar contexto da issue

```bash
gh issue view <n> --repo incentive-me/incentive-me --json title,body,labels,comments,url
```

- Se houver comentário começando com `## Refinamento`, ele é a fonte principal do escopo (gerado pela skill refine-ticket) — use o checklist dele como base dos Steps.
- Se o body **já** estiver no formato claude-plan (tem `## Steps` com checkboxes), mostre o plano existente e pergunte se é para regenerar antes de qualquer edição.

### 2 — Explorar o código

No clone do `incentive-me` (monorepo NX: `apps/api/*` NestJS, `apps/ui/*` React, `apps/job/*`, `apps/worker/*`, `libs/*`):

- Localize os arquivos de entrada relevantes (controllers, services, componentes, migrations) via grep/glob a partir dos termos do ticket.
- Se as skills GitNexus estiverem disponíveis na sessão (`gitnexus_query`, `gitnexus_context`, `gitnexus_impact`), prefira-as para mapear símbolos e impacto.
- Verifique se a mudança exige migration: `libs/database/{service}/mysql/migrations/{index}-{YYYY}-{MM}-{DD}-{description}.sql`.

### 3 — Redigir o plano (formato claude-plan)

```markdown
## Arquivos Relevantes

- `caminho/arquivo.ts` — por que é entrypoint

## Contexto

<2-5 linhas: o porquê da mudança e o estado atual do código. Background, não implementação.>

## Steps

- [ ] <passo objetivo e verificável, ordenado por dependência: schema → domínio → API → frontend>
- [ ] ...
- [ ] Adicionar/atualizar testes unitários das camadas alteradas
- [ ] Adicionar/atualizar testes e2e cobrindo o fluxo
```

Regras de redação:
- Um passo = uma responsabilidade; verbos de sistema ("expor endpoint", "persistir", "validar"), não de IDE.
- Steps devem ser executáveis por um dev (ou pelo Claude via gh-task.sh) sem voltar ao ticket.
- Testes sempre como passos finais explícitos.

### 4 — Confirmar e gravar na issue

Mostre o plano no chat e **peça confirmação antes de editar o body** (a edição substitui o conteúdo atual — preserve seções úteis do body original, como contexto do PM, dentro de `## Contexto`).

```bash
gh issue edit <n> --repo incentive-me/incentive-me --body "<plano>" --add-label claude-plan
```

### 5 — Reportar

```
📝 Plano gravado na issue #<n> (<url>)
   Steps: <N> · Migration: <sim/não> · Camadas: <backend/frontend/ambas>
   Próximo passo: /start-task <n>
```

## Regras

- Nunca edite o body sem aprovação explícita do usuário.
- Não inclua refactors fora do escopo do ticket no plano.
- Se o escopo estiver ambíguo demais para planejar, pare e faça as perguntas — ou sugira a skill `refine-ticket` do repo.
