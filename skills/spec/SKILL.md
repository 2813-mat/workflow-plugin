---
name: spec
description: 'Cria a spec técnica de uma task entrevistando o dev sobre pontos-chave: contrato de API (endpoints, retornos HTTP), tabelas e relacionamentos, estrutura de pastas, estratégia de testes (happy path ou não, suites). Roda ANTES do /dev-plan e alimenta ele. Examples: "/spec 2203", "criar spec da issue 2203", "especificar a task 2203"'
---

# spec — Spec técnica da task (roda antes do /dev-plan)

## Uso

```
/spec <issue-number>
```

## Constantes

Leia `${CLAUDE_PLUGIN_ROOT}/reference/project-constants.md`.

## Papel no fluxo

```
refine-ticket (escopo, com PM)  →  spec (contrato técnico, com o dev)  →  dev-plan (sequência de execução)  →  implement-task
```

A spec fecha as **decisões técnicas** que o plano precisa obedecer. O `/dev-plan` lê a spec publicada na issue e não deve contrariá-la.

## Fluxo

### 1 — Coletar contexto

```bash
gh issue view <n> --repo incentive-me/incentive-me --json title,body,labels,comments,url
```

- Se houver comentário `## Refinamento`, use-o como fonte do escopo.
- Explore brevemente o código para ancorar as perguntas na realidade do monorepo (onde vivem os módulos afetados, padrões existentes de controller/service/migration, suites de teste vizinhas). Perguntas genéricas são proibidas — cada pergunta deve citar o contexto real.

### 2 — Entrevistar o dev

Se esta skill foi invocada em sequência ao `refine-ticket` na mesma sessão, aproveite tudo que a entrevista de refinamento já decidiu — não repita perguntas; vá direto aos temas técnicos ainda em aberto.

Faça perguntas **objetivas e em blocos por tema**, uma rodada por vez (não despeje tudo de uma vez). Sempre proponha um default baseado no padrão do monorepo — o dev confirma ou corrige. Temas obrigatórios (pule o que não se aplica à task):

**Contrato de API**
- Endpoints: método, rota, payload de entrada e resposta
- Retornos HTTP por cenário: sucesso (200/201/204?), validação (400/422?), permissão (403), não encontrado (404), conflito (409)
- Formato de erro (segue o padrão do serviço? campos?)
- Paginação/filtros/ordenação quando for listagem

**Dados**
- Tabelas novas ou alteradas: colunas, tipos, defaults, índices
- Relacionamentos (1:N, N:N, FKs) e tabelas relacionadas afetadas
- Migration necessária? (padrão `libs/database/{service}/mysql/migrations/`)
- Dados existentes precisam de backfill?

**Estrutura**
- Em qual app/lib o código entra (`apps/api/*`, `apps/ui/*`, `libs/*`)
- Estrutura de pastas/módulos: novo module ou extensão de existente; nomes dos arquivos principais
- Reuso: existe algo em `generic-utils`, `node-core`, `node-nest`, `ui-base` que cobre parte?

**Testes**
- Tipos: unitário, integração, e2e — quais são obrigatórios para esta task?
- Cobertura: somente happy path ou também casos de erro/edge cases? Quais cenários de erro são inegociáveis?
- Suites: em qual suite e2e entra? Precisa de fixture/seed novo?

**Transversais** (só se relevante)
- Permissões/roles, multi-tenant, i18n, eventos/mensageria, observabilidade (logs/métricas), feature flag

### 3 — Quando parar

Pare quando todos os temas aplicáveis tiverem decisão registrada e nenhuma pergunta material estiver em aberto. Não invente perguntas para parecer completo — task pequena pode ter spec pequena.

### 4 — Gerar a spec

Mostre no chat e salve em `spec-<slug>.md` na raiz (kebab-case curto derivado do tema, ex.: `spec-legal-entity-detail.md`):

```markdown
## Spec

### Contrato de API
| Método | Rota | Sucesso | Erros |
|--------|------|---------|-------|
| POST | /v1/... | 201 (body: ...) | 400 validação · 403 sem permissão · 409 duplicado |

<detalhes de payload/resposta quando não couber na tabela>

### Dados
- Tabela `x`: colunas..., índices...
- Relacionamento: `x` N:1 `y` (FK `y_id`)
- Migration: sim — `libs/database/<service>/mysql/migrations/`

### Estrutura
- App: `apps/api/<serviço>` — module `<nome>` (novo|existente)
- Arquivos principais: controller, service, repository, dto
- Reuso: <o que vem de libs>

### Testes
- Unitário: <camadas> — happy path + <cenários de erro decididos>
- E2E: suite `<nome>` — <cenários>

### Decisões registradas
- <decisão tomada na entrevista que não é óbvia pelo resto da spec, com o porquê>
```

Seções sem conteúdo aplicável são omitidas. Nada de seção vazia.

### 5 — Publicar na issue (com aprovação)

Pergunte se pode publicar. Com aprovação:

```bash
gh issue comment <n> --repo incentive-me/incentive-me --body-file spec-<slug>.md
rm spec-<slug>.md
```

O comentário começa com `## Spec` — é assim que o `/dev-plan` o localiza. Se o usuário recusar, mantenha o `.md` local (é a entrega nesse caso).

### 6 — Encadear no plano

```
📐 Spec publicada na issue #<n>
   Próximo: /dev-plan <n>  (o plano vai obedecer a spec)
```

Ofereça continuar imediatamente: "Montar o plano agora com `/dev-plan <n>`?" Com aprovação, invoque a skill `dev-plan` passando o número da issue — ela vai ler a spec recém-publicada (ou o `spec-<slug>.md` local, se o usuário não publicou) e montar os Steps obedecendo as decisões registradas, sem re-perguntar nada que a spec já fechou.

## Regras

- Uma rodada de perguntas por tema; sempre com default proposto ("padrão do serviço X é Y — mantém?").
- Perguntas devem citar o código real (rotas existentes, tabelas existentes) — nunca genéricas.
- A spec registra **decisões**, não opções em aberto. Pergunta sem resposta = decisão pendente destacada no topo, não escondida.
- Não escreva plano de execução aqui (ordem de passos é papel do /dev-plan) — a spec diz *o que fica decidido*, não *em que ordem fazer*.
- Nunca publique sem aprovação explícita; nunca edite o body da issue — spec vai sempre como comentário.
