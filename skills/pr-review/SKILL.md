---
name: pr-review
description: 'Analisa se o PR vinculado a uma issue entrega o que o ticket pediu (User Story, Critérios de Aceitação e refinamento nos comentários), apontando lacunas, erros de interpretação do dev, redundância de código e oportunidades de reuso das libs genéricas. Saída: parecer em pt-BR no chat, nada postado no GitHub. Use ao revisar um PR contra o ticket que o originou. Examples: "/pr-review https://github.com/incentive-me/incentive-me/issues/1731", "analisar PR da issue 1731", "revisar este PR contra o ticket"'
---

# pr-review — Análise de PR vs Ticket (Incentive.me)

Avalia se o **PR vinculado** a uma issue entrega o que o **ticket** pediu. A saída é um **parecer em pt-BR no chat** — nada é postado no GitHub.

## Usage

```
/pr-review <link da issue>
/pr-review https://github.com/incentive-me/incentive-me/issues/1731
```

Aceita link completo da issue ou só o número. Repo fixo: `incentive-me/incentive-me`.

## Bases de reuso

Aliases de import (de `tsconfig.base.json`). O catálogo de reuso é montado lendo o barrel de cada base relevante:

| Lib           | Alias                         | Barrel                            | Quando checar |
|---------------|-------------------------------|-----------------------------------|---------------|
| Generic Utils | `@incentive-me/generic-utils` | `libs/generic/utils/src/index.ts` | **sempre**, qualquer PR |
| UI Base       | `@incentive-me/ui-base`       | `libs/ui/base/src/index.ts`       | PR **frontend** |
| Node Core     | `@incentive-me/node-core`     | `libs/node/core/src/index.ts`     | PR **backend** (sempre) |
| Node Nest     | `@incentive-me/node-nest`     | `libs/node/nest/src/index.ts`     | PR **backend** em API com bootstrap **nest** |

## Workflow

### Passo 1 — Resolver issue e localizar o PR

Extraia o número da issue do argumento. Leia o ticket:

```bash
gh issue view <n> --repo incentive-me/incentive-me \
  --json title,body,labels,comments
```

Localize o PR pelo campo **Development** da issue (PRs vinculados), via GraphQL:

```bash
gh api graphql -f query='
query($owner:String!,$repo:String!,$number:Int!){
  repository(owner:$owner,name:$repo){
    issue(number:$number){
      title
      closedByPullRequestsReferences(first:10, includeClosedPrs:true){
        nodes { number title state url }
      }
    }
  }
}' -F owner=incentive-me -F repo=incentive-me -F number=<n>
```

- **0 PRs** → informe que a issue não tem PR vinculado no campo Development e pare.
- **>1 PR** → liste-os e **pergunte qual analisar** (AskUserQuestion).
- **1 PR** → siga com ele.

### Passo 2 — Entender o ticket (o "esperado")

Construa um resumo do que foi **planejado**:

- Se houver **User Story** / **Critérios de Aceitação** no corpo → extraia cada AC como item verificável.
- Se o ticket for **texto curto** (ex.: bugfix sem AC) → trate o próprio texto como a intenção/comportamento esperado.
- Incorpore o **refinamento** dos comentários, se existir (decisões técnicas combinadas ali têm prioridade sobre suposições).

🚩 **Gate de confirmação (única pausa interativa):** se a intenção for **ambígua**, admitir **múltiplas interpretações plausíveis**, ou o problema for complexo e **faltar refinamento**, **PARE e pergunte ao usuário** (AskUserQuestion) qual solução foi planejada **antes** de julgar o PR. Não invente a intenção. Achados sobre o código (passo 5) nunca interrompem — vão todos no relatório final.

### Passo 3 — Ler o PR

```bash
gh pr view <pr> --repo incentive-me/incentive-me \
  --json title,body,files,additions,deletions,baseRefName,headRefName
gh pr diff <pr> --repo incentive-me/incentive-me
```

### Passo 4 — Detectar Frontend vs Backend e a base correta (pelos paths do diff)

- `apps/*web*` ou `libs/ui/*` → **frontend** → checar `@incentive-me/ui-base`.
- `apps/api/*` ou `libs/node/*` → **backend** → ver detecção de base abaixo.
- `@incentive-me/generic-utils` é checado **sempre**, em qualquer PR.

**Backend — detectar a base de bootstrap da API.** Backend não tem base única: cada API faz bootstrap de `node-core` **ou** `node-nest`. Identifique a API tocada (`apps/api/<nome>/...`) e leia o `main.ts`:

```bash
grep -E "@incentive-me/node-(core|nest)" apps/api/<nome>/src/main.ts
```

- `ApiFactory` de `@incentive-me/node-nest` → API **nest** (ex.: payments, datahub, directory, reports, support-integrations).
- `ApiModule` de `@incentive-me/node-core` → API **core** (catalog, payouts, platform, accounts, etc.).

Regra de checagem para backend:
- **Sempre** checar `generic-utils` + `node-core` (utilitários compartilhados — cache, message, ListFilter, CsvReader — são usados por ambos os tipos de API).
- **Se a API é nest**, checar **também** `node-nest` (primitivos de framework: `bootstrap`, `decorators`, `interceptors`, `exceptions`, `validation`, `security`, `swagger`).

### Passo 5 — Montar catálogo de reuso (barato) e analisar

Leia só a **superfície pública** das bases relevantes para saber o que já existe — barrel principal e sub-barrels:

```bash
cat libs/generic/utils/src/index.ts          # categorias: ArrayUtils, DateUtils, Formatters, ObjectUtils, StringUtils, Jwt, JsonSchema...
ls  libs/generic/utils/src/lib/*/             # métodos por categoria
cat libs/ui/base/src/index.ts                 # se frontend
cat libs/node/core/src/index.ts               # se backend
cat libs/node/nest/src/index.ts               # se backend nest
```

Com o catálogo em mãos, analise o **diff** (escopo = apenas o diff; GitNexus está desligado, não rastreie o grafo de chamadas do codebase):

1. **Aderência ao ticket** — confronte cada AC / a intenção com o que o diff faz. Classifique:
   - ✅ atendido · ⚠️ parcial · ❌ não atendido · ➕ fora de escopo (feito mas não pedido)
   - cite `arquivo:linha` como evidência.
2. **Erros de interpretação** — onde o dev parece ter entendido algo diferente do ticket/refinamento.
3. **Redundância de código** — duplicação dentro do próprio diff, código morto, blocos repetidos.
4. **Reuso de genéricos** — lógica escrita à mão que **já existe** no catálogo. Sugira o helper/componente e o import. Heurísticas comuns:
   - formatar moeda/CPF/CNPJ/data à mão → `Formatters` (`CurrencyFormatter`, `CpfFormatter`, `DateFormatter`…)
   - manipular datas com `dayjs`/`Date` cru → `DateUtils`
   - `map/filter/reduce` repetitivos para agrupar/deduplicar → `ArrayUtils`
   - clonar/comparar/pegar valor aninhado de objeto → `ObjectUtils`
   - capitalizar/slug/máscara de string → `StringUtils`
   - toast, modal, data grid, scroll infinito (frontend) → `@incentive-me/ui-base`
   - cache, fila/mensageria, background job, filtro de lista, leitura de CSV (backend) → `@incentive-me/node-core`
   - decorator/interceptor/exception/validação/bootstrap de API nest → `@incentive-me/node-nest`

### Passo 6 — Relatório em pt-BR

Imprima no chat (não poste no GitHub):

```markdown
## Análise de PR #<pr> — <título do PR>  ·  ticket #<issue>

**Ticket entendido como:** <resumo da intenção / US / principais AC>

### Aderência ao ticket
- [✅/⚠️/❌] <critério/intenção> — <comentário> (`arquivo:linha`)

### Possíveis erros de interpretação
- <ponto> — <o que o ticket pedia vs o que o PR fez>  | "Nenhum identificado"

### Redundância de código
- <duplicação/código morto> (`arquivo:linha`)  | "Nenhuma identificada"

### Oportunidades de reuso (libs genéricas)
- <lógica à mão> → use `<helper>` de `<alias>` (`arquivo:linha`)  | "Nenhuma identificada"

### Fora de escopo / extras
- <mudança feita mas não pedida pelo ticket>  | "Nenhum"

### Veredito
**<aderente / aderente com ressalvas / não aderente>** — <resumo em 1-2 frases>
```

## Rules

- **Idioma:** todo o parecer em **pt-BR**.
- **Seja conciso:** bullets curtos e diretos, sem repetir contexto. O **Veredito** é a única seção que deve vir completo (resumo + as ressalvas/divergências principais). Use tabela quando ajudar a condensar (ex.: achados × arquivo:linha).
- **Nunca** postar comentário/review no GitHub — a saída é só no chat. Operações `gh` permitidas são apenas de **leitura** (`issue view`, `pr view`, `pr diff`, `api graphql` de query).
- **Escopo de código = apenas o diff do PR.** GitNexus está desligado; não rastrear o grafo de chamadas do codebase. (Quando o NX voltar, esta regra pode ser revista para detectar reimplementação fora do diff.)
- **Backend não tem base única:** sempre detecte se a API faz bootstrap de `node-core` ou `node-nest` (Passo 4) antes de sugerir reuso — não assuma `node-core`.
- **Confirme quando tiver dúvida sobre a solução planejada** — o gate do Passo 2 é obrigatório quando a intenção do ticket é ambígua. É a única pausa interativa; achados de código vão sempre no relatório final.
- Refinamento nos comentários **tem prioridade** sobre suposições quando contradiz o corpo do ticket.
- **Sempre cite `arquivo:linha` (intervalo de linhas) como evidência** de todo achado — nunca aponte um arquivo sem as linhas. As linhas referem-se ao **diff do PR** (lado `+`); como o branch do PR normalmente **não está em checkout local**, deixe isso explícito e prefira links do PR no GitHub a paths locais (que cairiam em linhas erradas).
- Se uma seção não tiver achados, escreva explicitamente "Nenhum(a) identificado(a)" — não omita a seção.
