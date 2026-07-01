# incentive-workflow

Plugin de Claude Code + UI local com o fluxo de trabalho de desenvolvimento da incentive-me, integrado ao GitHub Projects (board **Produto #12**). É autônomo: não depende de nada dentro do monorepo — o clone do `incentive-me` é usado apenas como alvo de código.

## O que você ganha

- **Skills no Claude Code** (terminal): puxar tasks, spec técnica, plano de desenvolvimento, implementação em worktree com validação, mover issues, abrir PR, relatórios
- **UI local** (http://localhost:4545): board da sprint com métricas de pontos, filtros por sprint/usuário, execução de skills por tela com retorno renderizado
- **Daily automático**: relatório diário do que você fez/está fazendo/falta, com pontos da sprint

---

## Instalação (5 minutos)

### 1. Pré-requisitos

| Ferramenta | Como verificar | Observação |
|---|---|---|
| Node ≥ 18 | `node --version` | via nvm funciona |
| GitHub CLI autenticado | `gh auth status` | precisa dos scopes `repo` e `project`: `gh auth refresh -s project` |
| Claude Code | `claude --version` | |
| Clone do monorepo | `~/Desenvolvimento/incentive-me` | outro caminho? veja `INCENTIVE_REPO` abaixo |

### 2. Clonar e instalar o plugin

```bash
git clone <url-deste-repo> ~/Desenvolvimento/workflow-plugin
```

Dentro do Claude Code:

```
/plugin marketplace add ~/Desenvolvimento/workflow-plugin
/plugin install incentive-workflow@incentive-workflow-marketplace
```

Pronto: as skills (`/my-tasks`, `/spec`, `/dev-plan`, …) ficam disponíveis em qualquer sessão do Claude Code.

---

## Como rodar a UI — 3 maneiras

### Opção A — Auto-start com o Claude Code (zero configuração)

O plugin traz um hook `SessionStart` (`hooks/hooks.json`): **toda vez que você abre uma sessão do Claude Code, a UI sobe sozinha** se ainda não estiver rodando. Não precisa fazer nada além de instalar o plugin.

- Idempotente: se a UI já está no ar (por qualquer uma das opções), o hook não faz nada
- Log em `~/.local/state/incentive-workflow-ui.log`
- Para desativar o auto-start: `export INCENTIVE_UI_AUTOSTART=0` no seu `~/.bashrc`/`~/.zshrc`
- Limitação: a UI só sobe quando você abre o Claude Code (e continua rodando depois que ele fecha)

### Opção B — Serviço do Linux (systemd) — recomendado para uso diário

Sobe no **login da máquina**, independente de Claude Code, e reinicia sozinho se cair:

```bash
cd ~/Desenvolvimento/workflow-plugin
./scripts/install-systemd.sh
```

Gerenciamento:

```bash
systemctl --user status incentive-workflow-ui      # estado
journalctl --user -u incentive-workflow-ui -f      # logs ao vivo
systemctl --user restart incentive-workflow-ui     # reiniciar (ex.: após git pull)
systemctl --user disable --now incentive-workflow-ui  # desinstalar
```

### Opção C — Node direto (para testar/desenvolver a própria UI)

```bash
node ui/server.mjs
# → http://localhost:4545
```

Variáveis de ambiente (valem para as 3 opções):

| Variável | Default | Para quê |
|---|---|---|
| `PORT` | `4545` | porta da UI |
| `INCENTIVE_REPO` | `~/Desenvolvimento/incentive-me` | caminho do clone do monorepo (onde os jobs `claude -p` rodam) |

> As três opções convivem sem conflito: quem chegar primeiro ocupa a porta, os demais detectam e não duplicam.

---

## A UI

| Aba | O que faz |
|---|---|
| **Board** | Suas issues da sprint com cards de pontos (planejado/andamento/review/entregue), filtro por **sprint** (todas as iterations) e por **usuário GitHub**, seção de issues **sem pontos em Todo**, mover issue por dropdown, iniciar task (cria branch vinculada + In Progress + copia o checkout) |
| **Daily** | Gera o daily na hora e lista os relatórios salvos em `~/daily-reports/` |
| **Sprint Health** | Diagnóstico da sprint com filtros por **time** e **sprint** |
| **Dev Plan** | Gera o plano de uma issue para revisão; só grava na issue quando você aprovar |
| **Skills** | Todas as skills do plugin com descrição e execução por tela; as que alteram estado param no ponto de confirmação e mostram o que fariam |

## Skills (terminal)

**Fluxo de desenvolvimento** — encadeadas: cada uma oferece emendar a próxima:

```
/refine-ticket  →  /spec <n>  →  /dev-plan <n>  →  /implement-task <n>  →  /open-pr <n>
  escopo (PM)      contrato       plano na issue    worktree isolada +      PR padrão +
                   técnico                          sua validação p/ merge  Review/Tests
```

| Comando | O que faz |
|---|---|
| `/my-tasks` | Suas tasks da sprint atual, agrupadas por status |
| `/spec <n>` | Entrevista técnica: endpoints/retornos HTTP, tabelas/relacionamentos, estrutura de pastas, testes (happy path ou não, suites); publica `## Spec` na issue |
| `/dev-plan <n>` | Plano de desenvolvimento no formato claude-plan, obedecendo a spec |
| `/implement-task <n>` | Implementa numa worktree isolada; merge na feature branch **só com sua aprovação** do diff |
| `/start-task <n>` | Branch vinculada (base `development`) + assignee + In Progress |
| `/move-issue <n> <status>` | Move no board (Todo / In Progress / Review/Tests / Done) |
| `/open-pr` | PR para `development` com título conventional commits; move issue para Review/Tests |
| `/daily-report` | Daily com métricas de pontos (planejado/andamento/review/entregue) |
| `/sprint-health` | Saúde da sprint: spillover, gargalo de review, WIP, sem estimativa — aceita `--team` e `--iteration` (coleta rápida via labels/milestones do CI) |

**Gestão de tickets**: `/sprint-task` (criar issue na sprint com todos os campos) · `/refine-ticket` · `/convert-to-claude-plan`

**Código e qualidade**: `/commit` · `/pr-description` · `/pr-review` · `/test-use-cases` · `/unit-test-layer` · `/navigate` · `/navigate-tree` · `/db-schema` · `/gitnexus-*`

## Daily automático às 09:30 (opcional)

Gera o relatório todo dia útil sem abrir nada, salvando em `~/daily-reports/daily-<data>.md`:

```bash
mkdir -p ~/daily-reports
cp scripts/run-daily-report.sh ~/daily-reports/
(crontab -l 2>/dev/null; echo '30 9 * * * ~/daily-reports/run-daily-report.sh') | crontab -
```

> O script `run-daily-report.sh` roda `claude -p "/daily-report"` headless dentro do monorepo. Os relatórios também aparecem na aba Daily da UI.

## Solução de problemas

- **UI não abre** → `journalctl --user -u incentive-workflow-ui -n 30` (systemd) ou `cat ~/.local/state/incentive-workflow-ui.log` (hook/manual)
- **Mover issue falha com erro de permissão** → falta o scope project: `gh auth refresh -s project`
- **Board vazio** → confira o campo "usuário GitHub" na toolbar (vazio = detecta do `gh` CLI da máquina)
- **Jobs de daily/skill falham** → confirme que `claude` está no PATH e o plugin instalado em escopo de usuário

## Manutenção

- IDs do board (campos, opções, times, sizes) e convenções de branch/commit: [`reference/project-constants.md`](reference/project-constants.md) — board mudou? Atualize **só** esse arquivo (e as constantes espelhadas no topo de `ui/server.mjs`)
- As skills de "Gestão de tickets" e "Código e qualidade" foram copiadas do `incentive-me/.claude/skills` (originais intactos); evoluções acontecem aqui
