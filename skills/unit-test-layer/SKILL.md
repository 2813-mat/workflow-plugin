---
name: unit-test-layer
description: 'Scaffold the full unit test layer for a NestJS service: generates SUT, mocks, spec boilerplate and creates factories. Examples: "/unit-test-layer BudgetsService", "create unit tests for PaymentBatchesService", "scaffold test layer for api-payouts budgets service"'
---

# unit-test-layer — Unit Test Layer Scaffolding

Cria a camada completa de testes unitários para um serviço NestJS, seguindo o padrão de `docs/unit-testing-layer.md`. Usa as tasks `test:generate:sut` e `test:generate:spec` para o boilerplate e cria manualmente o arquivo de factories (que os geradores não produzem).

## When to Use

- "Crie os testes unitários para `XService`"
- "Scaffold test layer for `api-payouts` budgets"
- "Gere SUT, mocks e spec para `PaymentBatchesService`"

## Prerequisites

Verificar que `apps/api/<app>/jest.config.ts` tem as linhas de setup. Se ausentes, rodar primeiro:

```bash
task test:setup:jest -- --target=api-<app>
```

As linhas necessárias:

```ts
setupFiles: ['../../../jest.env.setup.ts'],
globalSetup: '../../../jest.setup.ts',
```

---

## Workflow

### Step 1 — Localizar o serviço

Use navigate-tree para descobrir a estrutura do serviço alvo:

```bash
# Se souber o controlador:
task test:generate:project-tree -- --cat --from=<ControllerName>

# Se souber só o app:
task test:generate:project-tree -- --list=controller --from=<app-name>
```

Do output, extraia:

- `APP_NAME` — do id do controlador: `api/{app}/ctrl/...` → `{app}` (ex: `payouts`)
- `DOMAIN` — pasta em `src/app/<domain>/`
- `SERVICE_FILE` — arquivo do serviço (ex: `approve-batches.service.ts`)

---

### Step 2 — Gerar SUT + Mocks

```bash
# Arquivos ainda não existem:
task test:generate:sut -- --app=<APP_NAME> --domain=<DOMAIN> --service=<SERVICE_FILE>

# Arquivos já existem (sobrescrever sem prompt):
task test:generate:sut -- --app=<APP_NAME> --domain=<DOMAIN> --service=<SERVICE_FILE> --overwrite
```

Arquivos gerados:

- `apps/api/<app>/tests/__testkit__/<service>.sut.ts`
- `apps/api/<app>/tests/__testkit__/mocks/<service>.mocks.ts`

---

### Step 3 — Revisar e completar o SUT

Leia os arquivos gerados e resolva os `// TODO` comments.

**`*.mocks.ts`** — Completar:

- Métodos gRPC: usar `jest.fn(() => of(undefined))` como default
- Serviços simples: usar `jest.fn().mockResolvedValue(undefined)`

**`*.sut.ts`** — Em `reset()`, adicionar defaults estáveis para evitar vazamento de estado entre testes:

```ts
const reset = () => {
  jest.clearAllMocks()
  // Adicionar defaults para mocks chamados nos success paths:
  myService.findOne.mockResolvedValue(null)
  repo.find.mockResolvedValue([])
}
```

**`nest.ts`** — Se `apps/api/<app>/tests/__testkit__/nest.ts` não existir, criar (os geradores não o produzem):

```ts
import { Logger } from '@nestjs/common'

export function silenceNestLogger() {
  jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined)
  jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined)
  jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined)
  jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined)
  jest.spyOn(Logger.prototype, 'verbose').mockImplementation(() => undefined)
}
```

---

### Step 4 — Gerar spec boilerplate

```bash
# Spec ainda não existe:
task test:generate:spec -- --app=<APP_NAME> --domain=<DOMAIN> --service=<SERVICE_FILE>

# Spec já existe (sobrescrever sem prompt):
task test:generate:spec -- --app=<APP_NAME> --domain=<DOMAIN> --service=<SERVICE_FILE> --overwrite
```

Arquivo gerado: `apps/api/<app>/tests/app/<domain>/<service>.service.spec.ts`

O spec já vem com:

- `beforeAll` → `silenceNestLogger()` + `createXxxSut()`
- `afterAll` → `ctx.close()` + `jest.restoreAllMocks()`
- `beforeEach` → `ctx.reset()`
- `it.todo()` placeholders por método público do serviço

---

### Step 5 — Criar o arquivo de factories

**Os geradores NÃO criam factories.** Criar `apps/api/<app>/tests/__testkit__/factories/<service>.factories.ts`:

1. Leia o serviço para identificar entidades TypeORM e DTOs usados
2. Para cada um, crie uma função `make*()`:

```ts
import { faker } from '@faker-js/faker/locale/pt_BR'
import { MyEntity } from '@incentive-me/database-<app>'
import { MyDto } from '../../../src/app/<domain>/dto'

export function makeMyEntity(overrides: Partial<MyEntity> = {}): MyEntity {
  return {
    id: +faker.string.numeric(),
    uuid: faker.string.uuid(),
    name: faker.commerce.productName(),
    value: faker.finance.amount(),
    email: faker.internet.email(),
    save: jest.fn().mockResolvedValue(undefined), // somente entidades TypeORM
    ...overrides,
  } as unknown as MyEntity
}

export function makeMyDto(overrides: Partial<MyDto> = {}): MyDto {
  return {
    uuid: faker.string.uuid(),
    name: faker.person.fullName(),
    ...overrides,
  }
}
```

Referência completa: `apps/api/payouts/tests/__testkit__/factories/approve-batches.factories.ts`

**Faker cheatsheet:**

| Tipo de campo    | Faker                          |
| ---------------- | ------------------------------ |
| UUID             | `faker.string.uuid()`          |
| ID numérico      | `+faker.string.numeric()`      |
| Valor monetário  | `faker.finance.amount()`       |
| Email            | `faker.internet.email()`       |
| Nome completo    | `faker.person.fullName()`      |
| CPF (11 dígitos) | `faker.string.numeric(11)`     |
| Telefone         | `faker.phone.number()`         |
| Nome de produto  | `faker.commerce.productName()` |
| String aleatória | `faker.string.alpha(10)`       |

---

### Step 6 — Implementar os casos de teste

No spec gerado, substitua os `it.todo()` por casos reais. **Cada método público DEVE ter pelo menos um bloco `success` e um bloco `fails`**, agrupados com `describe` aninhado:

```ts
describe('myMethod', () => {
  describe('success', () => {
    it('should return entity when found', async () => {
      const entity = makeMyEntity({ id: 1 })
      ctx.repos.myRepo.findOne.mockResolvedValue(entity)

      const result = await ctx.sut.myMethod(entity.uuid)

      expect(result).toEqual(expect.objectContaining({ id: entity.id }))
      expect(ctx.repos.myRepo.findOne).toHaveBeenCalledWith(expect.objectContaining({ where: { uuid: entity.uuid } }))
    })
  })

  describe('fails', () => {
    it('should throw NotFoundException when entity not found', async () => {
      ctx.repos.myRepo.findOne.mockResolvedValue(null)

      await expect(ctx.sut.myMethod('non-existent-uuid')).rejects.toThrow(/not found/i)

      expect(ctx.mocks.otherService.doSomething).not.toHaveBeenCalled()
    })

    it('should throw when dependency rejects', async () => {
      ctx.mocks.otherService.doSomething.mockRejectedValue(new Error('service error'))

      await expect(ctx.sut.myMethod('uuid')).rejects.toThrow('service error')
    })

    // gRPC observable error
    it('should propagate gRPC error', async () => {
      const { throwError } = await import('rxjs')
      ctx.mocks.grpcClient.rpcMethod.mockReturnValueOnce(throwError(() => new Error('RPC failed')))

      await expect(ctx.sut.myMethod(makeUser())).rejects.toThrow('RPC failed')
    })
  })
})
```

**Falhas comuns a cobrir por tipo de operação:**

| Operação                  | Falhas obrigatórias                                     |
| ------------------------- | ------------------------------------------------------- |
| Busca por ID/UUID         | entidade não encontrada (`NotFoundException`)           |
| Criação                   | conflito de unicidade; dependência não encontrada       |
| Atualização               | entidade não encontrada; estado inválido para transição |
| Deleção                   | entidade não encontrada; dependência que impede remoção |
| Chamada gRPC              | observable que emite erro (`throwError`)                |
| Chamada a serviço externo | rejeição do mock (`mockRejectedValue`)                  |
| Permissão/autorização     | acesso negado (`ForbiddenException`)                    |

---

### Step 7 — Verificar

```bash
task test:unit:api-<app>
# Com cobertura (flags extras após --):
task test:unit:api-<app> -- --coverage
```

Durante a execução desta skill (e em qualquer passo intermediário que precise rodar testes), **sempre** usar `task test:unit:api-<app>` — nunca `npx nx test` diretamente. A task já aplica `--skip-nx-cache`; argumentos adicionais do Nx vão após `--`.

---

## Files Generated / Created

```
apps/api/<app>/
└── tests/
    ├── __testkit__/
    │   ├── nest.ts                          ← criar se ausente (Step 3)
    │   ├── <service>.sut.ts                 ← gerado em Step 2
    │   ├── mocks/
    │   │   └── <service>.mocks.ts           ← gerado em Step 2
    │   └── factories/
    │       └── <service>.factories.ts       ← criado em Step 5 (MANUAL)
    └── app/
        └── <domain>/
            └── <service>.service.spec.ts    ← gerado em Step 4
```

---

## Rules

- ALWAYS usar `task` para comandos de tooling e testes: `test:generate:project-tree`, `test:generate:sut`, `test:generate:spec`, `test:setup:jest`, `test:unit:<project>`. Nunca chamar `npx tsx`, `npx ts-node` ou `npx nx` diretamente.
- NEVER run the generators before Step 1 (navigate-tree) — precisa do APP_NAME, DOMAIN e SERVICE_FILE exatos.
- ALWAYS criar o factories file — os geradores não o criam.
- ALWAYS verificar se `nest.ts` existe no `__testkit__/` do app e criar se ausente.
- NEVER conectar ao banco real: nenhum provider TypeORM real, nenhuma chamada HTTP.
- NEVER usar `jest.setTimeout` nos testes — se ficar lento, há conexão real escapando.
- ALWAYS usar `beforeAll` para criar o SUT, `beforeEach` apenas para `ctx.reset()`.
- ALWAYS fechar o módulo no `afterAll` via `ctx.close()` para evitar open handles.
- NEVER omitir `jest.restoreAllMocks()` no `afterAll` — limpa os spies do Logger.
- ALWAYS estruturar cada método público com `describe('success')` + `describe('fails')` — nunca deixar apenas o happy path.
- ALWAYS cobrir no `fails`: entidade não encontrada, dependência rejeitada, e qualquer transição de estado inválida que o serviço valide.
- NEVER submeter spec com `it.todo()` remanescentes — substituir todos antes de considerar o Step 6 concluído.
