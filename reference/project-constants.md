# Constantes — GitHub Projects incentive-me

Fonte da verdade para todas as skills deste plugin. Não hardcode estes valores nas skills; leia este arquivo.

## Repositório e projeto

```
Org:           incentive-me
Repo:          incentive-me/incentive-me
Repo node ID:  MDEwOlJlcG9zaXRvcnkyNjEyNTc4MzI=
Project:       Produto (#12)
Project ID:    PVT_kwDOA9blt84BDMn8
Board URL:     https://github.com/orgs/incentive-me/projects/12
Branch base:   development (PRs sempre para development; main é produção)
```

## Issue types (nativos)

| Type   | ID                    |
|--------|-----------------------|
| Tarefa | `IT_kwDOA9blt84Au0Ce` |
| Bug    | `IT_kwDOA9blt84Au0Ch` |

## Campos do projeto (field IDs)

| Campo     | ID                                 | Tipo         |
|-----------|------------------------------------|--------------|
| Status    | `PVTSSF_lADOA9blt84BDMn8zg1L5t4`   | SingleSelect |
| Priority  | `PVTSSF_lADOA9blt84BDMn8zg1L5wE`   | SingleSelect |
| Size      | `PVTSSF_lADOA9blt84BDMn8zg1L5wI`   | SingleSelect |
| Team      | `PVTSSF_lADOA9blt84BDMn8zg1L5wg`   | SingleSelect |
| Iteration | `PVTIF_lADOA9blt84BDMn8zg1L5wQ`    | Iteration    |
| Category  | `PVTSSF_lADOA9blt84BDMn8zhBJcFk`   | SingleSelect |
| Phase     | `PVTSSF_lADOA9blt84BDMn8zg1Xldw`   | SingleSelect |

## Option IDs

**Status**
| Opção        | ID         |
|--------------|------------|
| Todo         | `f75ad846` |
| In Progress  | `47fc9ee4` |
| Review/Tests | `5b90cd58` |
| Done         | `98236657` |

**Priority**: Now `6480f1d1` · Next `2a18752c` · Later `ec2b1543`

**Size**
| Opção                     | ID         |
|---------------------------|------------|
| 1 – Nenhum esforço        | `d7548c8f` |
| 2 – Meio dia ou menos     | `945efe7d` |
| 3 – Um dia                | `184b6ae7` |
| 5 – Dois a três dias      | `9d60bd40` |
| 8 – Quatro a cinco dias   | `4370971a` |
| 13 – Oito a dez dias      | `f532b869` |
| 21 – Duas sprints ou mais | `06b0283e` |

**Team**
| Opção                      | ID         |
|----------------------------|------------|
| Incentivo                  | `41672ece` |
| Catálogo e Pagamentos      | `55a2a684` |
| Plataforma e Conta Digital | `56f1c554` |
| Marketplace                | `5757ccd0` |
| Product OPs                | `6d1d2c06` |

**Category**: Produto (Feature) `1b225a19` · Débito Técnico `d56fa143` · Evolução Técnica `6cc91ec4` · Operacional `9349bac8`

**Phase**: Refinement `7e46bdad` · Development `a96f5481`

## Convenções de branch e commit

- Branch: `<type>/<issue-number>-<slug>` (ex.: `feat/2203-orgs-management`). Types: `feat`, `fix`, `docs`, `chore`, `hotfix`, `test`. Slug: lowercase, ascii, hífens, máx. 40 chars.
- Commit e título de PR (commitlint, `@commitlint/config-conventional`): `type(SCOPE): descrição imperativa em inglês, lowercase, sem ponto final`.
- Types permitidos: `feat`, `fix`, `chore`, `refactor`, `docs`, `test`, `ci`, `perf`.
- SCOPE em uppercase, o mais específico possível pelos arquivos alterados; `GLOBAL` só se múltiplos escopos não relacionados:

```
API-PLATFORM · API-CATALOG · API-NOTIFICATIONS · API-TRACKING · API-AWARDS-GATEWAY
JOB-RUNNER · KEYCLOAK
UI-HEADQUARTER · UI-CATALOG · UI-ADMIN · UI-STUDIO · UI-EMBED · UI-MANDALA
DEVOPS · DOC · GLOBAL
```

## Labels sincronizadas (workflow sync-project-issue.yaml)

O CI espelha campos do projeto em labels — úteis para filtrar via `gh`:
`size:N`, `priority/<name>`, `team/<name>`, `category/<name>`, `type/bug`, `type/tech-debt`, `block-reason/<name>`, `Spillover`, `spillover-size:N`, `claude-plan`.

## Snippets GraphQL reutilizáveis

**Detectar iteration (sprint) atual** — escolha a iteration com `startDate <= hoje < startDate + duration`:

```bash
gh api graphql -f query='
{
  node(id: "PVT_kwDOA9blt84BDMn8") {
    ... on ProjectV2 {
      fields(first: 20) {
        nodes {
          ... on ProjectV2IterationField {
            name
            configuration { iterations { id title startDate duration } }
          }
        }
      }
    }
  }
}'
```

**Resolver o project item ID de uma issue** (necessário antes de qualquer mutation de campo):

```bash
gh api graphql -f query='
{
  repository(owner: "incentive-me", name: "incentive-me") {
    issue(number: <n>) {
      projectItems(first: 20) { nodes { id project { id } } }
    }
  }
}' --jq '.data.repository.issue.projectItems.nodes[] | select(.project.id=="PVT_kwDOA9blt84BDMn8") | .id'
```

**Atualizar um campo single-select** (Status, Phase, etc.):

```bash
gh api graphql -f query='
mutation {
  updateProjectV2ItemFieldValue(input: {
    projectId: "PVT_kwDOA9blt84BDMn8"
    itemId: "<project_item_id>"
    fieldId: "<field_id>"
    value: { singleSelectOptionId: "<option_id>" }
  }) { projectV2Item { id } }
}'
```

**Listar itens do projeto com campos** (paginar com `after` enquanto `hasNextPage`):

```bash
gh api graphql -f query='
query($cursor: String) {
  node(id: "PVT_kwDOA9blt84BDMn8") {
    ... on ProjectV2 {
      items(first: 100, after: $cursor) {
        pageInfo { hasNextPage endCursor }
        nodes {
          id
          content {
            ... on Issue {
              number title state url closedAt updatedAt
              assignees(first: 5) { nodes { login } }
              labels(first: 15) { nodes { name } }
            }
          }
          fieldValues(first: 20) {
            nodes {
              ... on ProjectV2ItemFieldSingleSelectValue {
                name
                field { ... on ProjectV2FieldCommon { name } }
              }
              ... on ProjectV2ItemFieldIterationValue {
                title startDate duration
                field { ... on ProjectV2FieldCommon { name } }
              }
            }
          }
        }
      }
    }
  }
}' -f cursor="<cursor_ou_omitir>"
```

**Descobrir o login do usuário atual**: `gh api user --jq '.login'`

## Pré-requisitos de autenticação

O `gh` precisa dos scopes `repo` e `project`. Se uma mutation de projeto falhar por permissão, oriente: `gh auth refresh -s project`.
