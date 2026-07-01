---
name: refine-ticket
description: Refina um ticket escrito pelo PM atuando como tech lead. Conduz entrevista interativa (via grill-me) sobre a implementação e retorna um checklist objetivo em pt-BR com blocos de OBS, pronto para colar no ticket. Examples: "/refine-ticket Como PM, quero...", "refinar este ticket: ...", "ajude a refinar o ticket"
---

# Refine Ticket

Skill de refinamento técnico: o usuário (tech lead) cola os requisitos do PM e você o entrevista até ter clareza suficiente para gerar um checklist de implementação objetivo.

## Input

O texto do ticket vem como argumento direto na invocação da skill. Se nenhum texto for passado, pergunte ao usuário antes de prosseguir.

## Fluxo

1. **Ler o ticket** — Faça uma leitura crítica do que o PM escreveu. Identifique:
   - Objetivo de produto (o "porquê")
   - Comportamento esperado (o "o quê")
   - Ambiguidades, lacunas e premissas não declaradas
   - Pontos onde decisões técnicas estão implícitas

2. **Entrevistar** — Se a skill `grill-me` estiver disponível na sessão, invoque-a para conduzir a entrevista; senão, conduza você mesmo uma entrevista interativa (uma pergunta objetiva por vez, aprofundando conforme as respostas). Foque em:
   - Escopo (o que está dentro e fora)
   - Estados de UI, edge cases, validações
   - Impacto em fluxos existentes (regressões)
   - Permissões, multi-tenant, i18n quando aplicável
   - Compatibilidade com API/contratos existentes
   - Critérios de aceite mensuráveis
   - Telemetria/observabilidade se relevante

3. **Consultar código quando necessário** — Use GitNexus (`gitnexus_query`, `gitnexus_context`, `gitnexus_impact`) **apenas** quando o usuário citar áreas/símbolos específicos ou quando uma pergunta da entrevista depender de entender o estado atual do código. Não faça exploração proativa desnecessária.

4. **Gerar refinamento** — Quando a entrevista tiver coberto o suficiente para um dev responsável executar com autonomia, exiba o refinamento final no chat **e** salve-o em `refinement-<slug>.md` na raiz do projeto (working directory), onde `<slug>` é uma descrição breve da tarefa em kebab-case (ex.: `refinement-wallet-contact-requirement.md`). Sobrescreve se já existir um arquivo com o mesmo slug.

5. **Publicar no ticket (opcional)** — Depois de gerar e salvar o `.md`, **pergunte ao usuário** se deseja publicar o refinamento como comentário no ticket. Só prossiga com aprovação explícita. Ao aprovar, siga a seção **"Publicar no ticket"** abaixo: posta o comentário, move o campo **Phase** do ticket para **Development** e **apaga o `.md` local**. Se o usuário recusar, mantenha o arquivo `.md` (é a entrega nesse caso).

## Nomeação do arquivo

- Sempre prefixe com `refinement-` e use kebab-case curto (2-5 palavras) que identifique a tarefa.
- Derive o slug do tema central do ticket, não de detalhes de implementação. Bom: `refinement-wallet-contact-requirement.md`. Ruim: `refinement-add-column-to-organization-table.md`.
- Evite nomes genéricos como `refinement-fix.md` ou `refinement-feature.md`.
- **Nunca** salve como `refinement.md` (sem sufixo) — isso colide com refinamentos paralelos.

## Formato de saída (pt-BR)

Exiba no chat e salve em `refinement-<slug>.md` na raiz do projeto, exatamente neste formato:

```
## Refinamento

### Contexto
<1-3 linhas sobre o objetivo e o porquê — fruto da entrevista, não cópia do PM.>

### Checklist de implementação

#### Backend
**<Subgrupo, ex.: Schema e dados>**

- [ ] <Etapa objetiva, escopo de "o que fazer", não "como fazer">

> **OBS:** <consideração relevante atrelada à etapa imediatamente acima>

- [ ] <Próxima etapa>

**<Próximo subgrupo, ex.: Serviços de domínio>**

- [ ] ...

#### Frontend
**<Subgrupo, ex.: Consumo da configuração>**

- [ ] ...

### Observações importantes
<APENAS se houver pontos transversais que não couberam em uma OBS de item específico — ex.: dependência de outro time, decisão de arquitetura que afeta vários passos. Se não houver, omita esta seção inteira.>
```

**Regras de seção:**
- **NUNCA** inclua "Critérios de aceite", "Fora de escopo", "Plano de testes" ou qualquer outra seção além das três acima.
- A seção "Observações importantes" é **opcional** — só apareça se houver conteúdo realmente transversal. Sem conteúdo = sem seção.
- Mantenha o refinamento enxuto. Se um ponto pode virar OBS inline, prefira isso a criar bloco no final.

**Estrutura do checklist:**
- Divida sempre em camadas **Backend** e **Frontend** como `####` (h4). Se a tarefa for puramente backend ou puramente frontend, mantenha apenas a camada relevante.
- Dentro de cada camada, agrupe os itens por afinidade usando subgrupos em **negrito** (`**Subgrupo**`). Exemplos de subgrupos comuns:
  - Backend: "Schema e dados", "Serviços de domínio", "Pontos de validação", "Contrato de API", "Jobs e workers"
  - Frontend: "Consumo da configuração", "Validação inline", "Componentes/UI", "Estado e rotas"
- Não force subgrupos se a camada tem poucos itens (≤3). Nesses casos, liste direto sob a camada sem subdividir.
- Ordene os subgrupos por dependência lógica (ex.: schema → serviços → API → frontend).

Use blocos `> **OBS:**` inline quando houver:
- Risco de regressão em fluxo conhecido
- Decisão técnica tomada durante a entrevista que precisa ser preservada
- Limitação atual do código que impacta a abordagem em um item específico

## Publicar no ticket

Executado **apenas** após o passo 5 do fluxo, com aprovação explícita do usuário. O ticket do GitHub passa a ser a fonte da verdade do refinamento (é de lá que a skill `implement-ticket` lê e marca os checkboxes depois).

**Pré-requisitos:** o `gh` precisa do scope `project` para mover o Phase (`gh auth refresh -s project`). Postar o comentário só exige `repo`. Se o scope `project` faltar, ainda assim poste o comentário e avise que o Phase ficou pendente.

**Constantes (Produto sprint):**

```
Repo:          incentive-me/incentive-me
Project:       PVT_kwDOA9blt84BDMn8   (#12)
Campo Phase:   PVTSSF_lADOA9blt84BDMn8zg1Xldw
  - Refinement (origem):   7e46bdad
  - Development (destino): a96f5481
```

**Passos:**

1. **Obter a issue** — número ou URL. Se não foi informado na sessão, pergunte antes de postar.

2. **Postar o comentário (como o usuário)** — o `gh` usa o token autenticado, então o comentário sai na conta do próprio usuário. O corpo já começa com `## Refinamento`, que é como a `implement-ticket` o localiza depois.

   ```bash
   gh issue comment <n> --body-file refinement-<slug>.md
   ```

3. **Mover Phase → Development (best-effort)** — resolva o project item id da issue neste project e atualize o campo:

   ```bash
   # item id da issue dentro do project
   gh api graphql -f query='
   {
     repository(owner: "incentive-me", name: "incentive-me") {
       issue(number: <n>) {
         projectItems(first: 20) { nodes { id project { id } } }
       }
     }
   }' --jq '.data.repository.issue.projectItems.nodes[] | select(.project.id=="PVT_kwDOA9blt84BDMn8") | .id'

   # move o Phase para Development
   gh api graphql -f query='
   mutation {
     updateProjectV2ItemFieldValue(input: {
       projectId: "PVT_kwDOA9blt84BDMn8"
       itemId: "<project_item_id>"
       fieldId: "PVTSSF_lADOA9blt84BDMn8zg1Xldw"
       value: { singleSelectOptionId: "a96f5481" }
     }) { projectV2Item { id } }
   }'
   ```

   Se a issue não estiver no project (nenhum item id), avise e siga — não bloqueie por causa do Phase.

4. **Apagar o `.md` local** — só após o comentário ter sido postado com sucesso (a movimentação de Phase é best-effort e não bloqueia a remoção):

   ```bash
   rm refinement-<slug>.md
   ```

5. **Reportar** — confirme o link do comentário, o novo Phase e que o arquivo local foi removido.

6. **Encadear na spec** — o refinamento fecha o escopo; o contrato técnico fica na skill `spec`. Ofereça continuar imediatamente: "Seguir para a `/spec <n>`? A entrevista técnica aproveita o contexto que acabamos de levantar." Com aprovação, invoque a skill `spec` passando o número da issue — sem repetir perguntas já respondidas no refinamento.

## Regras de redação do checklist

- **Objetivo, não prescritivo.** Diga *o que* precisa existir/mudar, não *qual arquivo* editar nem *qual linha*. Exemplo bom: "Adicionar validação de CPF duplicado no fluxo de criação de beneficiário". Exemplo ruim: "Editar `BeneficiaryService.create` linha 42 para chamar `validateCpf`".
- **Uma responsabilidade por item.** Se um item tem "e" no meio, considere quebrar.
- **Verbos de produto/sistema**, não de IDE: "validar", "expor endpoint", "persistir", "exibir", "registrar evento".
- **Sem comentários de implementação** dentro do checklist — use OBS para isso.
- **Ordene por dependência lógica** (backend → contrato → frontend, ou data model → regras → UI), não por arquivo.

## Integração cross-times

Sempre que a implementação exigir mudança no domínio/serviço de **outro time** (ex.: emitir evento em api-platform, alterar contrato de outra API), trate assim:

- O **planejamento e o desenvolvimento podem ser feitos por nós** — não terceirize o trabalho, só a aprovação.
- As mudanças no serviço do time externo **devem ficar isoladas em um PR separado**, disponibilizado para que o time dono revise, valide e aprove. O código sob nossa responsabilidade (nossos serviços/UI) segue em PR(s) próprio(s), com nossa aprovação e deploy.
- No checklist, represente as mudanças do time externo como um **subgrupo próprio e rotulado** (ex.: `**Plataforma — emissão do evento (PR separado)**`), separado dos subgrupos dos nossos serviços.
- Registre em **Observações importantes** a divisão de PRs e de ownership: o que é nosso (dev + aprovação + deploy) vs. o que vai em PR separado para aprovação do time externo.

## Quando parar a entrevista

Pare quando:
- Todas as ambiguidades materiais do ticket foram resolvidas
- Você consegue redigir critérios de aceite verificáveis
- Edge cases relevantes têm decisão tomada
- O usuário sinaliza que está suficiente

Não force perguntas além disso — refinamento excessivo é desperdício.

## Anti-padrões

- ❌ Copiar trechos do ticket original no Contexto sem síntese
- ❌ Checklist com itens prescritivos ("editar X linha Y")
- ❌ OBS genéricas tipo "atenção aos testes" sem dizer *o quê* testar
- ❌ Pular a entrevista e ir direto pro checklist
- ❌ Explorar código com GitNexus sem necessidade clara
- ❌ Esquecer de salvar o `refinement-<slug>.md` na raiz do projeto
- ❌ Salvar como `refinement.md` (sem sufixo descritivo) — quebra refinamentos paralelos
- ❌ Criar seções extras ("Critérios de aceite", "Fora de escopo", "Testes", etc.) — apenas Contexto, Checklist e (opcional) Observações importantes
- ❌ Criar "Observações importantes" vazio ou só para repetir o que já está nas OBS inline
- ❌ Postar o comentário no ticket sem aprovação explícita do usuário
- ❌ Editar o **corpo** da issue — o refinamento vai sempre como **comentário**
- ❌ Apagar o `.md` local quando o usuário recusou publicar, ou antes do comentário ter sido postado com sucesso
