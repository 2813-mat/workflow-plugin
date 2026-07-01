---
name: test-use-cases
description: 'Gera um arquivo MD com casos de uso de teste em linguagem de produto para um controller NestJS. Conduz discussão interativa sobre casos estruturais (endpoints + serviços) e casos não-funcionais. Examples: "/test-use-cases BudgetsController", "/test-use-cases PaymentBatchesController", "criar casos de uso para AwardsController"'
---

# test-use-cases — Discussão de Casos de Uso em Linguagem de Produto

Esta skill **não gera código de teste**. Ela gera um arquivo `.use-cases.md` com casos de uso escritos em linguagem de produto/negócio, para ser usado como guia de discussão antes de escrever qualquer teste.

Complementa a skill `unit-test-layer` (que scaffolda o código de teste). Esta skill cobre a **etapa anterior**: levantar e documentar o que deve ser testado.

## When to Use

- Antes de escrever testes unitários ou de integração para um controller
- Durante o planejamento de sprint para alinhar critérios de aceite
- Durante code review para verificar cobertura de regras de negócio
- Quando alguém pergunta "o que devemos testar neste controller?"

## Prerequisites

- Saber o nome do controller (ex: `BudgetsController`, `PaymentBatchesController`)
- As skills `navigate-tree` e `navigate` estão disponíveis

---

## Workflow

### Step 1 — Mapear o controller via navigate-tree

Executar o comando:

```bash
task test:generate:project-tree -- --cat --from=<ControllerName>
```

A partir do output, extrair:

- **App name** (campo `id`: `api/{app}/ctrl/...`)
- **Todos os endpoints**: método HTTP, path, summary/description
- **Métodos de serviço chamados por cada endpoint**: linhas `### ServiceClass.method`

Se o nome exato do controller for desconhecido, descobrir primeiro:

```bash
# Listar todos os apps
task test:generate:project-tree -- --list=app

# Listar controllers de um app
task test:generate:project-tree -- --list=controller --from=<app-name>
```

### Step 2 — Casos estruturais por endpoint

Para cada endpoint identificado no Step 1, elaborar em linguagem de produto:

**Casos de Sucesso** — o caminho feliz:

- Input válido → resposta esperada com dados corretos
- Usuário com permissão → acesso concedido
- Recurso existente → retorno correto

**Casos de Falha** — guards, validações e erros:

- Campos obrigatórios ausentes
- Formatos ou tipos inválidos (ex: UUID malformado, valor negativo)
- Acesso não autorizado (role/permissão ausente)
- Recurso não encontrado (404)
- Conflito em criação (duplicidade)
- Violações de regra de negócio visíveis no DTO ou guard

**Padrão de linguagem:**

> "Quando um gestor tenta criar um orçamento sem informar o valor máximo, o sistema deve retornar um erro de validação com a mensagem adequada."

Nunca escrever: "deve retornar status 400 com body `{ message: '...' }`". Escrever: "o sistema deve retornar um erro informando que o campo é obrigatório."

### Step 3 — Casos dos métodos de serviço chamados

Para cada método de serviço identificado no Step 1:

1. Localizar o arquivo do serviço usando navigate. O padrão é:

   ```
   apps/api/{app}/src/app/{module}/{module}.service.ts
   ```

   Se necessário, usar `navigate` para confirmar o caminho.

2. **Ler APENAS os métodos do serviço que foram identificados no Step 1** — não ler o arquivo inteiro, não analisar métodos não chamados pelos endpoints.

3. Para cada método lido, inferir em linguagem de produto:
   - Validações internas (guard clauses, throws)
   - Regras de negócio aplicadas antes de persistir
   - Chamadas a repositórios ou serviços externos que podem falhar
   - Transformações de dados com impacto no resultado

### Step 4 — Discussão interativa: casos não-funcionais

Após apresentar os casos estruturais dos Steps 2 e 3, perguntar ao usuário:

> "Existem casos de uso de negócio que não estão previstos no código atual?
> Por exemplo: limites de quantidade, regras de período (vigência, prazo), permissões especiais por contexto, comportamentos de auditoria, idempotência, concorrência ou casos de borda do domínio?"

Para cada caso mencionado pelo usuário:

1. **Analisar viabilidade**: verificar se a estrutura atual do endpoint (guards, DTOs de entrada, campos disponíveis na request, response type) suporta ou expõe o dado necessário para testar esse caso.

2. **Se viável**: adicionar ao endpoint correspondente como caso não-funcional na seção `## Casos de Uso Não Funcionais`.

3. **Se NÃO viável**: adicionar à seção `## Requisitos de Alteração de Endpoint` com:
   - Por que a estrutura atual não suporta
   - O que seria necessário alterar no endpoint (DTO, guard, campo na response, etc.)

Não encerrar este step sem confirmar com o usuário que todos os casos relevantes foram levantados.

### Step 5 — Gerar o arquivo MD

Salvar em:

```
apps/api/{app}/tests/use-cases/{controller-kebab-name}.use-cases.md
```

Exemplos:

- `BudgetsController` → `apps/api/payouts/tests/use-cases/budgets.use-cases.md`
- `PaymentBatchesController` → `apps/api/payments/tests/use-cases/payment-batches.use-cases.md`

---

## Estrutura do Arquivo MD Gerado

```markdown
# Casos de Uso — {ControllerName}

> App: `{app-name}` | Gerado em: {YYYY-MM-DD}

---

## Endpoints Analisados

### `{HTTP_METHOD} {path}` — {summary}

#### Casos de Sucesso

| #   | Cenário | Pré-condição | Resultado Esperado |
| --- | ------- | ------------ | ------------------ |
| S1  | ...     | ...          | ...                |

#### Casos de Falha

| #   | Cenário | Pré-condição | Resultado Esperado |
| --- | ------- | ------------ | ------------------ |
| F1  | ...     | ...          | ...                |

#### Casos de Serviço (`{ServiceClass.method}`)

| #   | Cenário | Pré-condição | Resultado Esperado |
| --- | ------- | ------------ | ------------------ |
| SV1 | ...     | ...          | ...                |

---

## Casos de Uso Não Funcionais

> Casos levantados na discussão que são **suportados** pela estrutura atual do endpoint.

| #   | Endpoint | Cenário | Resultado Esperado |
| --- | -------- | ------- | ------------------ |
| NF1 | ...      | ...     | ...                |

---

## Requisitos de Alteração de Endpoint

> Casos de uso de negócio que **NÃO são possíveis** com a estrutura atual. Requerem
> alteração no endpoint antes de poderem ser cobertos por testes.

### Caso: {descrição do caso de uso}

**Endpoint afetado:** `{HTTP_METHOD} {path}`

**Por que não é possível atualmente:**

> ...

**Requisitos de alteração:**

- [ ] ...

---

## Resumo de Cobertura

| Endpoint               | Sucesso | Falha | Serviço | Não Funcional |
| ---------------------- | ------- | ----- | ------- | ------------- |
| `{HTTP_METHOD} {path}` | N       | N     | N       | N             |
```

---

## Rules

- ALWAYS usar `task test:generate:project-tree -- <flags>` para mapear controllers — nunca `npx tsx` ou `npx ts-node` diretamente no script.
- NEVER gerar código de teste — o output desta skill é exclusivamente um arquivo `.use-cases.md`.
- NEVER ler o arquivo de serviço inteiro — somente os métodos explicitamente chamados pelos endpoints mapeados no Step 1.
- NEVER pular o Step 4 (discussão interativa) — os casos não-funcionais são parte essencial do output.
- ALWAYS usar linguagem de produto nos cenários: descrever comportamentos do sistema, não implementação técnica.
- ALWAYS executar `--cat --from=<ControllerName>` antes de ler qualquer arquivo-fonte.
- ALWAYS verificar viabilidade de cada caso não-funcional antes de classificá-lo.
- ALWAYS colocar casos inviáveis em `## Requisitos de Alteração de Endpoint` — nunca misturá-los com casos executáveis.
- Se o controller não for encontrado pelo `--cat`, usar `--list=controller --from=<app>` para descobrir o nome exato.
- Usar a skill `navigate` para localizar arquivos de serviço quando o padrão de path não for suficiente.
