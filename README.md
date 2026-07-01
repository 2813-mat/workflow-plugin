# incentive-workflow

Plugin de Claude Code com o fluxo de trabalho de desenvolvimento da incentive-me, integrado ao GitHub Projects (board **Produto #12**). É autônomo: não depende de nada dentro do monorepo — o clone do `incentive-me` é usado apenas como alvo de código.

## Fluxo de trabalho

| Comando | O que faz |
|---|---|
| `/my-tasks` | Lista suas tasks da sprint atual, agrupadas por status |
| `/start-task <n>` | Cria branch vinculada à issue (base `development`), opcional worktree, assignee e move para In Progress |
| `/spec <n>` | Entrevista o dev e fecha o contrato técnico da task (endpoints/retornos HTTP, tabelas e relacionamentos, estrutura de pastas, estratégia de testes); publica como comentário `## Spec` na issue |
| `/dev-plan <n>` | Explora o código e grava um plano de desenvolvimento na issue (formato claude-plan), obedecendo a spec quando existir |
| `/implement-task <n>` | Implementa a issue numa **worktree isolada**; merge na branch de feature só após **sua validação** do diff |
| `/move-issue <n> <status>` | Move a issue no board (Todo / In Progress / Review/Tests / Done) ou o campo Phase |
| `/open-pr` | Abre PR para `development` com título conventional commits e corpo no padrão do time; move a issue para Review/Tests |
| `/daily-report` | Relatório diário: métricas de pontos (planejado/andamento/entregue), feito, em review, bloqueios e o que falta |
| `/sprint-health` | Diagnóstico da sprint: spillover, gargalos de review, WIP, itens sem estimativa — com pontos de melhoria |

## Gestão de tickets e sprint

| Comando | O que faz |
|---|---|
| `/sprint-task` | Cria issue na sprint do Produto com todos os campos obrigatórios |
| `/refine-ticket` | Refina ticket do PM como tech lead (entrevista + checklist de implementação) |
| `/convert-to-claude-plan <n>` | Converte issue existente para o formato claude-plan |

## Código, PRs e qualidade

| Comando | O que faz |
|---|---|
| `/commit` | Commit convencionado (commitlint) com co-autoria |
| `/pr-description` | Gera `pr.md` com descrição de PR no padrão do time |
| `/pr-review <n>` | Revisa a PR vinculada a uma issue contra os critérios do ticket |
| `/test-use-cases` · `/unit-test-layer` | Apoio a testes do monorepo |
| `/navigate` · `/navigate-tree` · `/db-schema` | Navegação do monorepo NX e schema de banco |
| `/gitnexus-*` | Análise de impacto, refactoring, debugging e exploração via GitNexus |

## Fluxo típico de um dia

```
/daily-report            → visão do dia + suas métricas de pontos
/my-tasks                → escolher a próxima task
/spec 2203               → fechar o contrato técnico (API, dados, pastas, testes)
/dev-plan 2203           → planejar obedecendo a spec
/implement-task 2203     → implementação em worktree isolada → você valida → merge
/open-pr 2203            → PR + Review/Tests
/move-issue 2203 done    → após merge/QA
```

## Instalação

```bash
# dentro do Claude Code
/plugin marketplace add /home/mateusubirajara/Desenvolvimento/workflow-plugin
/plugin install incentive-workflow@incentive-workflow-marketplace
```

Ou publique este repositório no GitHub e adicione o marketplace por `owner/repo`.

## UI local

```bash
node ui/server.mjs   # → http://localhost:4545
```

Interface web para operar sem decorar comandos: board da sprint com seus pontos (planejado/andamento/review/entregue), mover issue por dropdown, iniciar task (cria a branch e copia o comando de checkout), gerar daily e sprint-health (rodam `claude -p` em background), revisar/gravar dev plans na issue e uma aba **Skills** com todas as skills do plugin — descrição, campo de argumentos e execução com retorno renderizado na tela (skills que alteram estado param no ponto de confirmação e mostram o que fariam). Relatórios diários ficam salvos em `~/daily-reports/` e podem ser reabertos pela UI. Requisitos: Node ≥ 18, `gh` e `claude` no PATH.

O servidor roda como serviço systemd de usuário (sobe sozinho no login da máquina, reinicia se cair — não depende de sessão do Claude Code):

```bash
systemctl --user status incentive-workflow-ui    # ver estado
systemctl --user restart incentive-workflow-ui   # reiniciar (ex.: após editar ui/server.mjs)
systemctl --user disable --now incentive-workflow-ui  # desligar de vez
```

Unit em `~/.config/systemd/user/incentive-workflow-ui.service`.

## Daily automático

O `/daily-report` pode ser agendado (job recorrente do Claude Code) para rodar todos os dias às 09:30.

## Pré-requisitos

- `gh` autenticado com scopes `repo` e `project` (`gh auth refresh -s project`)
- As skills que mexem em código (`/start-task`, `/dev-plan`, `/implement-task`, `/open-pr`, `/commit`, testes e navegação) devem rodar dentro de um clone do `incentive-me/incentive-me`

## Manutenção

Todos os IDs do projeto (campos, opções de status, times, sizes) e as convenções de branch/commit ficam em [`reference/project-constants.md`](reference/project-constants.md). Se o board mudar (novo campo, nova coluna, novo time), atualize apenas esse arquivo.

As skills em "Gestão de tickets" e "Código, PRs e qualidade" foram **copiadas** do `incentive-me/.claude/skills` (os originais continuam lá, intocados). Evoluções passam a ser feitas aqui.
