---
name: commit
description: "Stage and commit changes following conventional commits with project scope and Claude as co-author. Examples: \"/commit\", \"commit the changes\", \"make a commit\""
---

# commit — Conventional Commit with Scope

## Usage

```
/commit
```

## Commit Format

```
<type>(<SCOPE>): <description>

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

## Types

| Type | When to use |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `chore` | Maintenance, deps, release bumps |
| `refactor` | Code change that's not a fix or feature |
| `docs` | Documentation only |
| `test` | Adding or fixing tests |
| `ci` | CI/CD changes |
| `perf` | Performance improvement |

## Scopes

Use uppercase. Pick the most specific one that applies:

```
API-PLATFORM · API-CATALOG · API-NOTIFICATIONS · API-TRACKING
API-AWARDS-GATEWAY · JOB-RUNNER · KEYCLOAK
UI-HEADQUARTER · UI-CATALOG · UI-ADMIN · UI-STUDIO · UI-EMBED · UI-MANDALA
DEVOPS · DOC · GLOBAL
```

Use `GLOBAL` only when the change spans multiple unrelated scopes.

## Workflow

```
1. git diff --staged            → review what's staged
2. If nothing staged: git add -A, then git diff --staged to review all changes
3. Infer type and scope from the diff
4. git commit -m "..."
```

## Rules

- NEVER use `--no-verify`
- If the diff touches multiple scopes, either split the commit or use `GLOBAL`
- Keep the description in the imperative mood, lowercase, no period
