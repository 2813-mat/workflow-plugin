---
name: sprint-task
description: 'Create a GitHub issue and add it to the Produto sprint project with all required fields. Examples: "/sprint-task", "create sprint task", "criar tarefa na sprint"'
---

# sprint-task — Create task in the Produto Sprint

## Usage

```
/sprint-task
```

## Project constants

```
Repo:       incentive-me/incentive-me
Project ID: PVT_kwDOA9blt84BDMn8
Project #:  12
```

### Repository constants

```
Repo node ID: MDEwOlJlcG9zaXRvcnkyNjEyNTc4MzI=
```

### Issue type IDs

| Type    | ID                      |
|---------|-------------------------|
| Tarefa  | `IT_kwDOA9blt84Au0Ce`   |
| Bug     | `IT_kwDOA9blt84Au0Ch`   |

### Field IDs

| Field      | ID                                        |
|------------|-------------------------------------------|
| Status     | `PVTSSF_lADOA9blt84BDMn8zg1L5t4`         |
| Priority   | `PVTSSF_lADOA9blt84BDMn8zg1L5wE`         |
| Size       | `PVTSSF_lADOA9blt84BDMn8zg1L5wI`         |
| Team       | `PVTSSF_lADOA9blt84BDMn8zg1L5wg`         |
| Iteration  | `PVTIF_lADOA9blt84BDMn8zg1L5wQ`          |
| Category   | `PVTSSF_lADOA9blt84BDMn8zhBJcFk`         |

### Field option IDs

**Status**
| Option        | ID         |
|---------------|------------|
| Todo          | `f75ad846` |
| In Progress   | `47fc9ee4` |
| Review/Tests  | `5b90cd58` |
| Done          | `98236657` |

**Priority**
| Option | ID         |
|--------|------------|
| Now    | `6480f1d1` |
| Next   | `2a18752c` |
| Later  | `ec2b1543` |

**Size**
| Option                   | ID         |
|--------------------------|------------|
| 1 – Nenhum esforço       | `d7548c8f` |
| 2 – Meio dia ou menos    | `945efe7d` |
| 3 – Um dia               | `184b6ae7` |
| 5 – Dois a três dias     | `9d60bd40` |
| 8 – Quatro a cinco dias  | `4370971a` |
| 13 – Oito a dez dias     | `f532b869` |
| 21 – Duas sprints ou mais| `06b0283e` |

**Team**
| Option                    | ID         |
|---------------------------|------------|
| Incentivo                 | `41672ece` |
| Catálogo e Pagamentos     | `55a2a684` |
| Plataforma e Conta Digital| `56f1c554` |
| Marketplace               | `5757ccd0` |
| Product OPs               | `6d1d2c06` |

**Category**
| Option             | ID         |
|--------------------|------------|
| Produto (Feature)  | `1b225a19` |
| Débito Técnico     | `d56fa143` |
| Evolução Técnica   | `6cc91ec4` |
| Operacional        | `9349bac8` |

## Workflow

### Step 1 — Collect info from user

Ask (or infer from context) the following. **All fields are required except Priority and Parent issue.**

| Field        | Required | Notes |
|--------------|----------|-------|
| Title        | ✅       | Short, imperative |
| Body         | ✅       | Context, changes needed, acceptance criteria |
| Type         | ✅       | Tarefa or Bug |
| Assignee(s)  | ✅       | GitHub login(s) — always ask |
| Team         | ✅       | One of the 5 options above |
| Size         | ✅       | Fibonacci estimate |
| Category     | ✅       | Feature / Débito Técnico / Evolução Técnica / Operacional |
| Priority     | ❌       | Now / Next / Later — ask if not clear from context |
| Parent issue | ❌       | Issue number if this is a sub-issue |

### Step 2 — Detect current iteration

```bash
gh api graphql -f query='
{
  node(id: "PVT_kwDOA9blt84BDMn8") {
    ... on ProjectV2 {
      fields(first: 20) {
        nodes {
          ... on ProjectV2IterationField {
            name
            configuration {
              iterations { id title startDate duration }
            }
          }
        }
      }
    }
  }
}'
```

Pick the iteration whose `startDate <= today < startDate + duration days`. Use that iteration's `id` in Step 5.

### Step 3 — Create the issue

Use the GraphQL `createIssue` mutation so the issue type can be set in a single call. Use `issueTypeId` from the table above (`IT_kwDOA9blt84Au0Ce` for Tarefa, `IT_kwDOA9blt84Au0Ch` for Bug).

If it is a sub-issue, prepend `"Relacionado a #<parent>.\n\n"` to the body.

```bash
gh api graphql -f query='
mutation {
  createIssue(input: {
    repositoryId: "MDEwOlJlcG9zaXRvcnkyNjEyNTc4MzI="
    title: "<title>"
    body: "<body>"
    assigneeIds: ["<assignee_node_id>"]
    issueTypeId: "<type_id>"
  }) {
    issue {
      number
      id
    }
  }
}'
```

To get an assignee's node ID from their GitHub login:

```bash
gh api graphql -f query='{ user(login: "<login>") { id } }'
```

Save `issue.number` as `<number>` and `issue.id` as `<issue_node_id>`.

### Step 4 — Add issue to the project

```bash
gh api graphql -f query='
mutation {
  addProjectV2ItemById(input: {
    projectId: "PVT_kwDOA9blt84BDMn8"
    contentId: "<issue_node_id>"
  }) {
    item { id }
  }
}'
```

Save the returned `item.id` as `<project_item_id>`.

### Step 5 — Set all required fields

Run one mutation per field (replace `<project_item_id>` and option IDs from the tables above):

**Status → Todo (always)**
```bash
gh api graphql -f query='
mutation {
  updateProjectV2ItemFieldValue(input: {
    projectId: "PVT_kwDOA9blt84BDMn8"
    itemId: "<project_item_id>"
    fieldId: "PVTSSF_lADOA9blt84BDMn8zg1L5t4"
    value: { singleSelectOptionId: "f75ad846" }
  }) { projectV2Item { id } }
}'
```

**Iteration → current iteration id**
```bash
gh api graphql -f query='
mutation {
  updateProjectV2ItemFieldValue(input: {
    projectId: "PVT_kwDOA9blt84BDMn8"
    itemId: "<project_item_id>"
    fieldId: "PVTIF_lADOA9blt84BDMn8zg1L5wQ"
    value: { iterationId: "<iteration_id>" }
  }) { projectV2Item { id } }
}'
```

**Team**
```bash
gh api graphql -f query='
mutation {
  updateProjectV2ItemFieldValue(input: {
    projectId: "PVT_kwDOA9blt84BDMn8"
    itemId: "<project_item_id>"
    fieldId: "PVTSSF_lADOA9blt84BDMn8zg1L5wg"
    value: { singleSelectOptionId: "<team_option_id>" }
  }) { projectV2Item { id } }
}'
```

**Size**
```bash
gh api graphql -f query='
mutation {
  updateProjectV2ItemFieldValue(input: {
    projectId: "PVT_kwDOA9blt84BDMn8"
    itemId: "<project_item_id>"
    fieldId: "PVTSSF_lADOA9blt84BDMn8zg1L5wI"
    value: { singleSelectOptionId: "<size_option_id>" }
  }) { projectV2Item { id } }
}'
```

**Category**
```bash
gh api graphql -f query='
mutation {
  updateProjectV2ItemFieldValue(input: {
    projectId: "PVT_kwDOA9blt84BDMn8"
    itemId: "<project_item_id>"
    fieldId: "PVTSSF_lADOA9blt84BDMn8zhBJcFk"
    value: { singleSelectOptionId: "<category_option_id>" }
  }) { projectV2Item { id } }
}'
```

**Priority** (only if provided)
```bash
gh api graphql -f query='
mutation {
  updateProjectV2ItemFieldValue(input: {
    projectId: "PVT_kwDOA9blt84BDMn8"
    itemId: "<project_item_id>"
    fieldId: "PVTSSF_lADOA9blt84BDMn8zg1L5wE"
    value: { singleSelectOptionId: "<priority_option_id>" }
  }) { projectV2Item { id } }
}'
```

### Step 6 — Link to parent (if sub-issue)

**Update child body** — already done in Step 3 with `"Relacionado a #<parent>."`.

**Update parent checklist** — fetch the current parent body and append the new item to the `## Sub-issues` section:

```bash
# Fetch current body
gh api repos/incentive-me/incentive-me/issues/<parent> --jq '.body'

# Edit parent adding the new checklist item
gh issue edit <parent> --repo incentive-me/incentive-me --body "<updated_body>"
```

Checklist format:
```markdown
## Sub-issues

- [ ] #<new_issue> — <title>
```

If the parent body does not yet have a `## Sub-issues` section, create one.

### Step 7 — Report to user

```
✅ Issue #<number> criada: <title>
   Type:      <Tarefa|Bug>
   Assignee:  <login>
   Team:      <team>
   Size:      <size>
   Category:  <category>
   Sprint:    <iteration title>
   Project:   https://github.com/orgs/incentive-me/projects/12
   Issue:     https://github.com/incentive-me/incentive-me/issues/<number>
```

## Rules

- NEVER skip Steps 2–5 — the issue must always be added to the project with all required fields set
- Always default Status to **Todo**
- Always detect the current iteration dynamically (Step 2) — never hardcode an iteration ID
- If the parent issue has a `## Sub-issues` checklist, preserve all existing items when editing the body
- Body must always include: context, required changes, and acceptance criteria sections
