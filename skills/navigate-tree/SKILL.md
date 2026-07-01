---
name: navigate-tree
description: 'Understand API information flow using the project tree: list apps, explore controllers, trace endpoints to service calls, find RPC handlers — without reading source files. Examples: "/navigate-tree", "what endpoints does PaymentBatchesController have?", "what services does api-payments use?", "show the flow of api-catalog", "what RPC routes does api-platform expose?"'
---

# navigate-tree — API Code Flow via Project Tree

Use this skill when asked about API structure, controller endpoints, RPC handlers, or service dependencies. It queries the live codebase via `task test:generate:project-tree` and returns only the relevant subtree — no file reads needed.

Complements the `navigate` skill (which traces frontend hooks → controllers). This skill covers the **API side**: apps → controllers → endpoints → service calls, and apps → rpc-handlers → service calls.

## When to Use

- "What endpoints does `XController` expose?"
- "What services does `api-payments` call?"
- "Show the flow inside `PaymentBatchesController`"
- "Which controllers exist in `api-catalog`?"
- "What does the `create` endpoint invoke in `XController`?"
- "What RPC routes does `api-platform` expose?"
- "Which service handles `platform@get_user_by_uuid_list`?"
- Any API-structure question that does not require reading implementation logic

## Command Hierarchy

Always pick the **most focused command** that answers the question. Prefer fewer tokens.

| Intent                                                   | Command                                       |
| -------------------------------------------------------- | --------------------------------------------- |
| All apps in the monorepo                                 | `--list=app`                                  |
| Controllers in a specific app                            | `--list=controller --from=<app-name>`         |
| RPC handlers exposed by an app                           | `--list=rpc --from=<app-name>`                |
| Service calls made by a controller                       | `--list=service --from=<ControllerName>`      |
| Full subtree of one controller (endpoints + services)    | `--cat --from=<ControllerName>`               |
| Full subtree of one app (all controllers + rpc-handlers) | `--cat --from=<app-name>`                     |
| Detail for a specific RPC route                          | `--cat --from=<app-name>` then filter by name |

## Workflow

**Step 1 — Determine scope** from the user's query:

```
Known controller name?
  YES → --cat --from=<ControllerName>

Known RPC router string (e.g. platform@get_user_by_uuid_list)?
  YES → --cat --from=<app-name>  (rpc-handlers appear at controller level)

Known app name, unknown controller?
  YES → --list=controller --from=<app-name>  →  then --cat --from=<ControllerName>

Unknown app?
  YES → --list=app  →  pick app  →  narrow with --list=controller or --cat
```

**Step 2 — Run the command via Bash**:

```bash
# Discover all apps
task test:generate:project-tree -- --list=app

# All controllers in an app
task test:generate:project-tree -- --list=controller --from=api-payments

# All RPC handlers exposed by an app (one router string per line)
task test:generate:project-tree -- --list=rpc --from=api-platform

# Service calls made by a controller (includes rpc-handler service calls)
task test:generate:project-tree -- --list=service --from=PaymentBatchesController

# Full controller subtree (endpoints + service calls) — most common
task test:generate:project-tree -- --cat --from=PaymentBatchesController

# Full app subtree (all controllers + rpc-handlers + endpoints)
task test:generate:project-tree -- --cat --from=api-payments
```

**Step 3 — Interpret the Markdown output**:

```
# api-platform                              ← app node

## UsersController                          ← HTTP controller class
  - type: controller
  - id: api/platform/ctrl/UsersController

### getUserById                             ← HTTP endpoint method
  - httpMethod: GET
  - path: "/:uuid"
  - summary: "Get user by UUID"

#### UsersService.findOne                   ← service call made by this endpoint
  - type: service-method

## platform@get_user_by_uuid_list           ← RabbitRPC handler (same level as controllers)
  - type: rpc-handler
  - httpMethod: RPC
  - exchange: platform
  - path: get_user_by_uuid_list

### UsersService.getUsersByUuidList         ← service call made by this RPC handler
  - type: service-method
```

- `httpMethod` + `path` → full HTTP route (e.g. `GET /users/:uuid`)
- `type: rpc-handler` + `exchange` + `path` → RabbitMQ route (`exchange@path`)
- `summary` / `description` → OpenAPI annotation on HTTP endpoints
- `### ServiceClass.method` → the service method this endpoint/handler delegates to
- Controller `id` pattern: `api/{app}/ctrl/{ClassName}` → file at `apps/api/{app}/src/app/{module}/{module}.controller.ts`
- RPC handler `id` pattern: `api/{app}/rpc/{routerString}` → handler in `.controller.ts` or `.service.ts`

**Step 4 — Answer without reading source files** unless the user explicitly asks for implementation logic (e.g., "show me the code", "what does the service method do internally").

## Rules

- ALWAYS use `task test:generate:project-tree -- <flags>` — never invoke `npx tsx` ou `npx ts-node` diretamente no script.
- NEVER read `.controller.ts` or `.service.ts` files when `--cat --from=X` already answers the question.
- NEVER write to `.local/tree-data.json` — use terminal output directly.
- The tool always re-scans live code; staleness is not a concern.
- Chain commands when needed: `--list=controller` to discover the name, then `--cat --from=<name>` to go deeper.
- If `--cat --from=<name>` returns empty, the name may be an alias — try `--list=controller --from=<app>` to see exact names.
- `rpc-handler` nodes appear at the same level as `controller` nodes inside an app subtree.
