#!/usr/bin/env node
// UI local do incentive-workflow — http://localhost:4545
// Sem dependências: Node >= 18, gh CLI autenticado e claude CLI no PATH.
// IDs do board: mesmos de reference/project-constants.md — se o board mudar, atualize lá e aqui.

import http from 'node:http'
import { execFile, spawn } from 'node:child_process'
import { promisify } from 'node:util'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT || 4545)
const MONOREPO = process.env.INCENTIVE_REPO || path.join(os.homedir(), 'Desenvolvimento/incentive-me')
const REPORTS_DIR = path.join(os.homedir(), 'daily-reports')
const REPO = 'incentive-me/incentive-me'
const PROJECT_ID = 'PVT_kwDOA9blt84BDMn8'
const STATUS_FIELD_ID = 'PVTSSF_lADOA9blt84BDMn8zg1L5t4'
const STATUS_OPTIONS = {
  'Todo': 'f75ad846',
  'In Progress': '47fc9ee4',
  'Review/Tests': '5b90cd58',
  'Done': '98236657',
}

const pExecFile = promisify(execFile)
async function gh(args, opts = {}) {
  const { stdout } = await pExecFile('gh', args, { maxBuffer: 64 * 1024 * 1024, ...opts })
  return stdout
}
async function graphql(query) {
  return JSON.parse(await gh(['api', 'graphql', '-f', `query=${query}`]))
}

// ---------- Board ----------

async function getIterations() {
  const data = await graphql(`{
    node(id: "${PROJECT_ID}") { ... on ProjectV2 { fields(first: 20) { nodes {
      ... on ProjectV2IterationField { name configuration {
        iterations { id title startDate duration }
        completedIterations { id title startDate duration }
      } }
    } } } }
  }`)
  const field = data.data.node.fields.nodes.find(n => n && n.name === 'Iteration')
  const cfg = field?.configuration ?? {}
  const today = new Date().toISOString().slice(0, 10)
  const all = [...(cfg.iterations ?? []), ...(cfg.completedIterations ?? [])]
    .map(it => ({ ...it, endDate: new Date(new Date(it.startDate).getTime() + it.duration * 86400_000).toISOString().slice(0, 10) }))
    .sort((a, b) => b.startDate.localeCompare(a.startDate))
  const current = all.find(it => it.startDate <= today && today < it.endDate) ?? null
  return { all, current }
}

// Cache das issues do usuário (60s) — troca de sprint no dropdown fica instantânea.
const issueCache = { ts: 0, login: null, issues: [], iterations: null }

async function myIssues(refresh = false, user = null) {
  // login: informado pela UI ou detectado do gh CLI autenticado na máquina
  const login = user?.trim() || (await gh(['api', 'user', '--jq', '.login'])).trim()
  if (!refresh && issueCache.login === login && Date.now() - issueCache.ts < 60_000 && issueCache.issues.length) return issueCache
  const iterations = await getIterations()

  const issues = []
  let cursor = null
  for (let page = 0; page < 5; page++) { // até 500 issues mais recentes (cobre várias sprints)
    const after = cursor ? `"${cursor}"` : 'null'
    const data = await graphql(`{
      search(query: "repo:${REPO} is:issue assignee:${login} sort:updated-desc", type: ISSUE, first: 100, after: ${after}) {
        pageInfo { hasNextPage endCursor }
        nodes { ... on Issue {
          number title state url
          assignees(first: 5) { nodes { login } }
          labels(first: 15) { nodes { name } }
          projectItems(first: 10) { nodes {
            project { id }
            fieldValues(first: 20) { nodes {
              ... on ProjectV2ItemFieldSingleSelectValue { name field { ... on ProjectV2FieldCommon { name } } }
              ... on ProjectV2ItemFieldIterationValue { title field { ... on ProjectV2FieldCommon { name } } }
            } }
          } }
        } }
      }
    }`)
    const p = data.data.search
    issues.push(...p.nodes)
    if (!p.pageInfo.hasNextPage) break
    cursor = p.pageInfo.endCursor
  }

  const mapped = issues
    .filter(i => i.number)
    .map(i => {
      const item = i.projectItems.nodes.find(pi => pi.project.id === PROJECT_ID)
      const fv = name => item?.fieldValues.nodes.find(v => v.field?.name === name)
      return {
        number: i.number,
        title: i.title,
        url: i.url,
        assignees: i.assignees.nodes.map(a => a.login),
        labels: i.labels.nodes.map(l => l.name),
        iteration: fv('Iteration')?.title ?? null,
        status: fv('Status')?.name ?? '—',
        size: fv('Size')?.name ?? null,
        priority: fv('Priority')?.name ?? null,
      }
    })

  Object.assign(issueCache, { ts: Date.now(), login, issues: mapped, iterations })
  return issueCache
}

async function fetchBoard(iterationTitle, refresh = false, user = null) {
  const { login, issues, iterations } = await myIssues(refresh, user)
  const selected = iterationTitle || iterations.current?.title || iterations.all[0]?.title || null
  const items = issues.filter(i => i.iteration === selected)
  const noEstimate = issues.filter(i => i.status === 'Todo' && !i.size)

  const pts = i => Number(i.size?.match(/^\d+/)?.[0] ?? 0)
  const sum = arr => arr.reduce((s, i) => s + pts(i), 0)
  const byStatus = s => items.filter(i => i.status === s)
  return {
    login,
    iterations: iterations.all.map(it => ({ ...it, current: it.title === iterations.current?.title })),
    selected,
    items,
    noEstimate,
    points: {
      planned: sum(items),
      inProgress: sum(byStatus('In Progress')),
      inReview: sum(byStatus('Review/Tests')),
      done: sum(byStatus('Done')),
    },
  }
}

async function moveIssue(number, status) {
  const optionId = STATUS_OPTIONS[status]
  if (!optionId) throw new Error(`Status inválido: ${status}`)
  const out = await gh(['api', 'graphql', '-f', `query={
    repository(owner: "incentive-me", name: "incentive-me") {
      issue(number: ${number}) { projectItems(first: 20) { nodes { id project { id } } } }
    }
  }`, '--jq', `.data.repository.issue.projectItems.nodes[] | select(.project.id=="${PROJECT_ID}") | .id`])
  const itemId = out.trim().split('\n')[0]
  if (!itemId) throw new Error(`Issue #${number} não está no projeto Produto`)
  await graphql(`mutation {
    updateProjectV2ItemFieldValue(input: {
      projectId: "${PROJECT_ID}", itemId: "${itemId}",
      fieldId: "${STATUS_FIELD_ID}", value: { singleSelectOptionId: "${optionId}" }
    }) { projectV2Item { id } }
  }`)
  issueCache.ts = 0 // invalida o cache: o board reflete a mudança no próximo load
  return { number, status }
}

async function startTask(number) {
  const issue = JSON.parse(await gh(['issue', 'view', String(number), '--repo', REPO, '--json', 'number,title,labels']))
  const labels = issue.labels.map(l => l.name.toLowerCase())
  let type = 'feat'
  if (labels.some(l => l.includes('bug'))) type = 'fix'
  else if (labels.some(l => l.includes('documentation'))) type = 'docs'
  else if (labels.some(l => l.includes('chore'))) type = 'chore'
  const slug = issue.title.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40).replace(/-$/, '')
  const branch = `${type}/${number}-${slug}`

  let branchCreated = false
  try {
    await gh(['issue', 'develop', String(number), '--repo', REPO, '--name', branch, '--base', 'development'], { cwd: MONOREPO })
    branchCreated = true
  } catch (e) {
    if (!String(e.stderr || e.message).includes('already exists')) throw e
  }
  await gh(['issue', 'edit', String(number), '--repo', REPO, '--add-assignee', '@me']).catch(() => {})
  let moved = true
  try { await moveIssue(number, 'In Progress') } catch { moved = false }
  return { number, branch, branchCreated, moved, checkout: `cd ${MONOREPO} && git fetch origin ${branch} && git checkout ${branch}` }
}

// ---------- Jobs (claude -p) ----------

const jobs = new Map()
const READ_TOOLS = ['Bash(gh api:*)', 'Bash(gh issue list:*)', 'Bash(gh issue view:*)', 'Bash(gh pr list:*)', 'Bash(git log:*)', 'Read', 'Glob', 'Grep', 'Skill']

function startJob(kind, prompt, onDone, tools = READ_TOOLS) {
  const id = Math.random().toString(36).slice(2, 10)
  const job = { id, kind, status: 'running', output: '', error: '', startedAt: new Date().toISOString() }
  jobs.set(id, job)
  const child = spawn('claude', ['-p', prompt, '--allowedTools', ...tools], { cwd: MONOREPO })
  child.stdout.on('data', d => { job.output += d })
  child.stderr.on('data', d => { job.error += d })
  child.on('close', code => {
    job.status = code === 0 ? 'done' : 'failed'
    job.finishedAt = new Date().toISOString()
    if (code === 0 && onDone) { try { onDone(job) } catch { } }
  })
  child.on('error', err => { job.status = 'failed'; job.error += String(err) })
  return job
}

// ---------- Skills do plugin ----------

const SKILLS_DIR = path.join(__dirname, '..', 'skills')
// Skills que alteram estado (GitHub/git). As demais são leitura/análise.
const MUTATING = new Set(['sprint-task', 'move-issue', 'start-task', 'open-pr', 'implement-task', 'commit', 'convert-to-claude-plan', 'refine-ticket', 'dev-plan', 'spec'])
const SKILL_TOOLS = [
  'Bash(gh api:*)', 'Bash(gh issue:*)', 'Bash(gh pr list:*)', 'Bash(gh pr view:*)', 'Bash(gh pr diff:*)',
  'Bash(git log:*)', 'Bash(git diff:*)', 'Bash(git status:*)', 'Bash(git branch:*)',
  'Read', 'Glob', 'Grep', 'Skill',
]
const HEADLESS_SUFFIX = `\n\nContexto de execução: você está rodando headless a partir de uma UI local — NÃO faça perguntas. Se alguma etapa exigir confirmação explícita do usuário (merge, push, criar PR, editar body de issue, publicar comentário), NÃO execute essa etapa: descreva exatamente o que seria feito e pare aí. A resposta final deve ser APENAS markdown do resultado, sem preâmbulo.`

function listSkills() {
  return fs.readdirSync(SKILLS_DIR)
    .filter(d => fs.existsSync(path.join(SKILLS_DIR, d, 'SKILL.md')))
    .map(d => {
      const src = fs.readFileSync(path.join(SKILLS_DIR, d, 'SKILL.md'), 'utf8')
      const fm = src.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? ''
      const desc = fm.match(/^description:\s*['"]?([\s\S]*?)['"]?\s*$/m)?.[1] ?? ''
      return { name: d, description: desc.split(/Examples?:/i)[0].trim(), mutating: MUTATING.has(d) }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}

const PROMPTS = {
  daily: `/daily-report — gere o relatório diário completo, incluindo a tabela de pontos da sprint (planejado / em andamento / em review / entregue). Não pergunte nada e não ofereça próximos passos: a resposta final deve conter APENAS o markdown do relatório, começando direto no título # 📅 Daily, sem preâmbulo.`,
  health: (team, iteration) => `/sprint-health${team ? ` --team "${team}"` : ''}${iteration ? ` --iteration "${iteration}"` : ''} — gere o diagnóstico da sprint${iteration ? ` "${iteration}"` : ' atual'}${team ? ` do time ${team}` : ''}. Não pergunte nada e não ofereça próximos passos: a resposta final deve conter APENAS o markdown do relatório, começando direto no título, sem preâmbulo.`,
  plan: n => `/dev-plan ${n} — monte o plano de desenvolvimento da issue ${n}, mas NÃO edite a issue: a resposta final deve conter APENAS o markdown do plano (seções ## Arquivos Relevantes, ## Contexto e ## Steps), sem preâmbulo. A gravação na issue será feita depois, com aprovação do usuário.`,
}

// ---------- HTTP ----------

function json(res, code, body) {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(body))
}
async function readBody(req) {
  let data = ''
  for await (const chunk of req) data += chunk
  return data ? JSON.parse(data) : {}
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`)
  const route = `${req.method} ${url.pathname}`
  try {
    if (route === 'GET /') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
      return res.end(fs.readFileSync(path.join(__dirname, 'index.html')))
    }
    if (route === 'GET /api/board') return json(res, 200, await fetchBoard(url.searchParams.get('iteration'), url.searchParams.get('refresh') === '1', url.searchParams.get('user')))
    if (route === 'POST /api/move') {
      const { number, status } = await readBody(req)
      return json(res, 200, await moveIssue(Number(number), status))
    }
    if (route === 'POST /api/start-task') {
      const { number } = await readBody(req)
      return json(res, 200, await startTask(Number(number)))
    }
    if (route === 'POST /api/jobs') {
      const { kind, issue, team, iteration } = await readBody(req)
      let job
      if (kind === 'daily') {
        job = startJob('daily', PROMPTS.daily, j => {
          fs.mkdirSync(REPORTS_DIR, { recursive: true })
          fs.writeFileSync(path.join(REPORTS_DIR, `daily-${new Date().toISOString().slice(0, 10)}.md`), j.output)
        })
      } else if (kind === 'health') job = startJob('health', PROMPTS.health(team, iteration))
      else if (kind === 'plan') job = startJob('plan', PROMPTS.plan(Number(issue)))
      else return json(res, 400, { error: `kind inválido: ${kind}` })
      return json(res, 202, { id: job.id })
    }
    if (route === 'GET /api/skills') return json(res, 200, listSkills())
    if (route === 'POST /api/run-skill') {
      const { skill, args } = await readBody(req)
      if (!listSkills().some(s => s.name === skill)) return json(res, 400, { error: `skill desconhecida: ${skill}` })
      const prompt = `/${skill}${args ? ' ' + args : ''}${HEADLESS_SUFFIX}`
      const job = startJob(`skill:${skill}`, prompt, null, SKILL_TOOLS)
      return json(res, 202, { id: job.id })
    }
    if (route.startsWith('GET /api/jobs/')) {
      const job = jobs.get(url.pathname.split('/').pop())
      return job ? json(res, 200, job) : json(res, 404, { error: 'job não encontrado' })
    }
    if (route === 'POST /api/save-plan') {
      const { number, body } = await readBody(req)
      await gh(['issue', 'edit', String(number), '--repo', REPO, '--body', body, '--add-label', 'claude-plan'])
      return json(res, 200, { ok: true })
    }
    if (route === 'GET /api/reports') {
      fs.mkdirSync(REPORTS_DIR, { recursive: true })
      const files = fs.readdirSync(REPORTS_DIR).filter(f => f.startsWith('daily-') && f.endsWith('.md')).sort().reverse()
      return json(res, 200, files)
    }
    if (route.startsWith('GET /api/reports/')) {
      const name = path.basename(url.pathname)
      return json(res, 200, { name, content: fs.readFileSync(path.join(REPORTS_DIR, name), 'utf8') })
    }
    json(res, 404, { error: 'rota não encontrada' })
  } catch (err) {
    json(res, 500, { error: String(err.stderr || err.message || err) })
  }
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`incentive-workflow UI → http://localhost:${PORT}`)
  console.log(`monorepo: ${MONOREPO}`)
})
