---
name: pr-description
description: 'Generates PR description following the project standard (en-US) and saves it to pr.md. Examples: "/pr-description", "generate PR description", "create pr.md"'
---

After finishing your commits, run /pr-description in Claude Code and paste the generated pr.md into your PR.

# pr-description — PR Description for Incentive.me

## Usage

```
/pr-description
```

## Generated file format (`pr.md`)

```markdown
# <type>(<SCOPE>): <short description in English>

## O que foi feito

- <bullet objetivo sobre o que foi implementado/alterado>
- <bullet objetivo sobre o que foi implementado/alterado>
- ...

## Resumo

**O que foi solicitado:**
<1-2 frases explicando o problema ou necessidade que motivou a tarefa>

**O que foi entregue:**
<1-2 frases descrevendo a solução e como ela atende ao que foi solicitado>
```

## Workflow

```
1. git branch --show-current               → confirmar que não está em main/development
2. git log development...HEAD --oneline       → entender os commits desta branch
3. git diff development...HEAD                → entender todas as mudanças em relação à development
4. Inferir scope e type a partir do diff
5. Escrever pr.md seguindo o formato acima
```

## Rules

- The title follows the conventional commits pattern: `type(SCOPE): description` — always **in English**
- All other sections write **in Portuguese (pt-BR)**
- Scopes in uppercase — same as `/commit`:
  ```
  API-PLATFORM · API-CATALOG · API-NOTIFICATIONS · API-TRACKING
  API-AWARDS-GATEWAY · JOB-RUNNER · KEYCLOAK
  UI-HEADQUARTER · UI-CATALOG · UI-ADMIN · UI-STUDIO · UI-EMBED · UI-MANDALA
  DEVOPS · DOC · GLOBAL
  ```
- If the change spans multiple scopes, use `GLOBAL`
- **"O que foi feito"**: lista objetiva de bullets — o que foi adicionado, alterado ou removido. Foco em artefatos concretos (endpoints, componentes, métodos, colunas, etc.)
- **"Resumo"**: dois parágrafos curtos — o primeiro contextualiza a solicitação, o segundo descreve o que foi entregue
- Always save to the `pr.md` file at the repository root
- If `pr.md` already exists, overwrite it
- The `git diff development...HEAD` step is **mandatory** — use it to ensure the description accurately reflects all changes introduced compared to the `development` branch
