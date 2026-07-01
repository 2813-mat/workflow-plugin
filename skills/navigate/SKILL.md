---
name: navigate
description: 'Navigate the Incentive.me monorepo: trace hooks to controllers, find where pages live, understand which APIs each UI uses. Examples: "/navigate", "where does usePayouts().query.getBudgetById come from?", "find the controller for this hook"'
---

# navigate — Monorepo Navigation Guide

Use this skill when asked to trace data flow from frontend to backend, or to locate where a feature is implemented.

> **Internally uses `navigate-tree`** for the API side of every trace. Once a controller is identified, always query the project tree (`generate-project-tree`) before reading source files. See the [Decision tree for API-side navigation](#decision-tree-for-api-side-navigation) section below.

## The 3-Layer Chain

```
UI Component
    ↓ calls
useXxx().query.methodName          ← libs/query-client/{xxx}/src/index.ts
    ↓ wraps (SKIP — generated)
libs/client/{xxx}/src/apis/        ← auto-generated from Swagger, never read
    ↓ calls
apps/api/{xxx}/src/app/{module}/   ← real implementation lives here
    {module}.controller.ts
    {module}.service.ts
```

**Rule**: When given `useXxx().query.methodName`, go directly to the controller. Skip the generated client entirely.

## Resolving a Hook to a Controller

Given `usePayouts().query.getBudgetById({}, id)`:

1. Hook name `usePayouts` → `libs/query-client/payouts/src/index.ts`
2. Check which API class it wraps: `PayoutsApi` from `@incentive-me/client-payouts`
3. Method `getBudgetById` → look for `budgets` module folder
4. Controller: `apps/api/payouts/src/app/budgets/budget.controller.ts`

**Shortcut**: method prefix usually equals the module folder name.

- `getBudgetById`, `createBudget` → `budgets/` → `budget.controller.ts`
- `getPaymentBatches` → `payment-batches/` → `payment-batches.controller.ts`
- `getOrganization` → `organizations/` → `organizations.controller.ts`

## Hook → API Class Map

| Hook                      | API Class               | Package                                     |
| ------------------------- | ----------------------- | ------------------------------------------- |
| `usePayouts()`            | `PayoutsApi`            | `@incentive-me/client-payouts`              |
| `usePayoutsReports()`     | `ReportsApi`            | `@incentive-me/client-payouts`              |
| `useCatalog()`            | `CatalogApi`            | `@incentive-me/client-catalog`              |
| `useCatalogAdmin()`       | `CatalogAdminApi`       | `@incentive-me/client-catalog-admin`        |
| `usePlatform()`           | `PlatformApi`           | `@incentive-me/client-platform`             |
| `useAwardsGateway()`      | `AwardGatewayApi`       | `@incentive-me/client-awards-gateway`       |
| `useAwardsGatewayAdmin()` | `AwardsGatewayAdminApi` | `@incentive-me/client-awards-gateway-admin` |
| `useNotifications()`      | `NotificationsApi`      | `@incentive-me/client-notifications`        |
| `useStorage()`            | `StorageApi`            | `@incentive-me/client-storage`              |
| `useAudit()`              | `AuditApi`              | `@incentive-me/client-audit`                |
| `useConsultsCaching()`    | `ConsultsCachingApi`    | `@incentive-me/client-consults-caching`     |
| `useQueryExecutor()`      | `QueryExecutorApi`      | `@incentive-me/client-query-executor`       |

## UI App → Code Location Map

### ui-payments (`apps/ui/payments`)

Pages live directly in the app:

```
apps/ui/payments/src/app/pages/
  Budget/         → Budget management (create, list, approve, reprove)
  PaymentBatch/   → Payment batches (DigitalWallet, GiftCard, Transfer)
  Reports/        → Reports (Organization, Beneficiary, Environment)
  NewPayment/     → New payment flow
  Statement/      → Statement view
  Tracking/       → Payment tracking
```

APIs used: `usePayouts()`, `usePayoutsReports()`, `useCatalogAdmin()`, `usePlatform()`

### ui-catalog (`apps/ui/catalog`)

**Shell only** — the app has ~2 files. All real code is in the feature lib:

```
libs/features/catalog/src/app/pages/
  Catalog/        → Catalog browsing (Award, RewardType, Category, Section)
  Checkout/       → Checkout flow (Input, Shippment, Confirm)
  Exchange/       → Exchange (List, Detail)
```

APIs used: `useCatalog()`, `useConsultsCaching()`, `useNotifications()`

### ui-headquarter (`apps/ui/headquarter`)

Admin panel with sections:

```
apps/ui/headquarter/src/app/pages/
  Catalog/        → Awards, Wallets, Contexts, Catalogs, AudienceFilter,
                    Integrations, FailureMapping, AudienceTracking,
                    Exchanges, Storage, Purchase
  Comunication/   → Templates, Contacts, Notifications
  Access/         → Access management
  Data/           → Data management
  Financial/      → Financial management
  Structure/      → Structure management
```

APIs used: `useCatalogAdmin()`, `useAwardsGateway()`, `useAwardsGatewayAdmin()`,
`useNotifications()`, `usePlatform()`, `useStorage()`,
`useAudit()`, `useQueryExecutor()`

## API Controller Modules

### api/payouts (`apps/api/payouts/src/app/`)

```
budgets/              payment-batches/
consents/             payment-batches-validator/
environments/         payment-batch-status/
income-taxes/         payments/
organizations/        reports/
```

### api/catalog (`apps/api/catalog/src/app/`)

```
antifrauds/    awards/        catalogs/      exchanges/
filters/       integrations/  legacy-ledgers/ limits/
reward-types/  sections/      types/         wallets/
```

### api/catalog-admin (`apps/api/catalog-admin/src/app/`)

```
antifraud/     awards/        catalogs/      categories/
contexts/      exchanges/     filters/       integrations/
Input-types/   reward-types/  sections/      suggestions/
wallets/
```

### api/platform (`apps/api/platform/src/app/`)

```
billing-accounts/   conciliation/      digital-accounts/
invoices/           organizations/     permissions/
plans/              realms/            roles/
transactions/       users/             webhooks/
```

## Workflow: Tracing a Bug from UI to API

1. Find the hook call in the component: `useXxx().query.method`
2. Map hook → API module using the table above
3. Identify the target controller name (e.g. `BudgetsController`, `PaymentBatchesController`)
4. **Run navigate-tree to understand the API flow** — do NOT read source files yet:
   ```bash
   npx tsx tools/generate-project-tree/src/index.ts --cat --from=<ControllerName>
   ```
   This returns the controller's endpoints (HTTP method + path + summary) and the service methods each endpoint delegates to.
5. If the service call name is clear from the tree output, use `gitnexus_context({name: "serviceMethodName"})` for the full call graph.
6. Only read `.controller.ts` / `.service.ts` source files when you need **implementation logic** that the tree doesn't expose (e.g., complex conditionals, SQL queries).

### Decision tree for API-side navigation

```
Need to know which endpoints a controller exposes?
  → npx tsx tools/generate-project-tree/src/index.ts --cat --from=<ControllerName>

Don't know the exact controller name?
  → npx tsx tools/generate-project-tree/src/index.ts --list=controller --from=<app-name>
    then → --cat --from=<ControllerName>

Need only the service dependencies (no endpoint details)?
  → npx tsx tools/generate-project-tree/src/index.ts --list=service --from=<ControllerName>

Need implementation logic (conditionals, DB queries, business rules)?
  → read the source file (last resort, after tree output is exhausted)
```

## What NOT to Read

- `libs/client/**` — generated from Swagger, never modify, trust the controller as source of truth
- `libs/query-client/*/src/index.ts` — just a 2-3 line wrapper, no logic
- `.controller.ts` / `.service.ts` when `navigate-tree --cat` already answers the question

## Creating New Endpoints — ResponseDto Rule

**ALWAYS** wrap controller responses in a typed `ResponseDto`. This is what drives end-to-end typing: the Swagger schema is generated from the DTO, the client lib is generated from Swagger, and `useXxx().query/mutation` inherits the types from the client.

Without a `ResponseDto`, the generated client types are `any` and the frontend loses type safety.

### Pattern

```ts
// dto/response-my-resource.dto.ts
import { ApiProperty } from '@nestjs/swagger'

export class ResponseMyResourceDto {
  @ApiProperty()
  id: number

  @ApiProperty()
  value: string
  // ... ALL fields — every single property MUST have @ApiProperty()
  // Missing @ApiProperty() = field absent from Swagger = absent from generated client = `any` on the frontend
}

// my-resource.controller.ts
// ALL REST verbs (@Get, @Post, @Put, @Patch, @Delete) come from @incentive-me/node-core — NOT from @nestjs/common.
// NEVER use @ApiOkResponse/@ApiCreatedResponse — always use responseDto inside the decorator.
// This rule applies to every verb without exception.
@Get({
  path: ':id',
  description: '...',
  responseDto: ResponseMyResourceDto,        // single object
})
async findOne(@Param('id') id: number): Promise<ResponseMyResourceDto> {
  return this.service.findOne(id)
}

@Post({
  path: '/',
  description: '...',
  responseDto: ResponseMyResourceDto,
})
async create(@Body() dto: CreateDto): Promise<ResponseMyResourceDto> { ... }

@Put({
  path: ':id',
  description: '...',
  responseDto: ResponseMyResourceDto,
})
async update(...): Promise<ResponseMyResourceDto> { ... }

@Patch({
  path: ':id',
  description: '...',
  responseDto: ResponseMyResourceDto,
})
async patch(...): Promise<ResponseMyResourceDto> { ... }

@Delete({
  path: ':id',
  description: '...',
  // responseDto omitted only when the endpoint returns void
})
async remove(...): Promise<void> { ... }

@Get({
  path: '/',
  description: '...',
  isFiltered: true,
  responseDto: [ResponseMyResourceDto],      // array / paginated list
})
async findAll(...) { ... }
```

### Mapping entities to DTOs — private mapper rule

When the service needs to convert an entity (or raw query result) to a DTO, **always extract the logic into a private method** instead of inlining the object literal. This keeps service methods readable and the mapping reusable.

```ts
// my-resource.service.ts
private mapToDto(entity: MyEntity): ResponseMyResourceDto {
  return {
    id: entity.id,
    value: entity.value,
    nested: entity.relation ? {
      field: entity.relation.field,
    } : null,
  }
}

async findOne(id: number): Promise<ResponseMyResourceDto> {
  const entity = await MyEntity.findOneBy({ id })
  return this.mapToDto(entity)
}

async findAll(...) {
  const [entities, count] = await ...
  return filterResponse({ ..., dtos: entities.map((e) => this.mapToDto(e)) })
}
```

### After adding or changing a ResponseDto

Regenerate the client so the frontend picks up the new types (always via `task`, never `nx g` directly):

```bash
task nest:client:{target}:sync
```

### Self-check before finishing a backend task

1. Every new or modified endpoint has a dedicated `ResponseDto`
2. **Every field** in the DTO has `@ApiProperty()` — no exceptions, including optional and nested fields
3. `responseDto` is set inside the `@Get`/`@Post`/`@Put`/`@Delete` decorator — never `@ApiOkResponse`/`@ApiCreatedResponse`
4. Entity→DTO conversion is done in a private `mapToDto` method, not inlined
5. Client was regenerated — `libs/client/{target}` reflects the new shape
6. Frontend hook (`useXxx().query/mutation`) is now correctly typed with no `any`

## Generating New API Clients

When a new API is created or updated, always use the Taskfile target (never `nx g` directly):

```bash
task nest:client:{target}:sync
```

This regenerates `libs/client/{target}` from the API's Swagger. Run after backend changes before using new endpoints in frontend.

For external APIs (e.g. hub4pay), use:

```bash
task nest:client:{target}:sync:external
```
