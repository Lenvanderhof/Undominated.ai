/**
 * Warn-only GitHub Action (growth-beyond §3).
 *
 * v1 flags models the published dominance JSON marks strictly dominated
 * as of a dated snapshot. Always exits 0.
 */

import { appendFileSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

export const COMMENT_MARKER = '<!-- undominated-dominated-warn -->'
export const DEFAULT_ORIGIN = 'https://undominated.ai'

const DENY_PREFIXES = ['stealth/', 'fakeprovider/']
const MIME_OR_PATH_HEADS = new Set([
  'application',
  'audio',
  'font',
  'image',
  'multipart',
  'text',
  'video',
  'src',
  'lib',
  'dist',
  'node_modules',
  'home',
  'users',
  'var',
  'tmp',
  'etc',
])

// `@` is in the lookbehind so a scoped npm name (`@sveltejs/kit`) is not a model.
const SLUG_RE =
  /(?<![A-Za-z0-9._@-])([a-z0-9][a-z0-9-]{1,40})\/([a-z0-9][a-z0-9._:+-]{0,80}[a-z0-9])/gi

export const fileSlug = (slug) => String(slug).replace(/[/:]/g, '__')

export function looksLikeSecret(value) {
  const s = String(value ?? '')
  return /\bsk-/.test(s) || /\bghp_/.test(s) || /\bgithub_pat_/.test(s) || /\bBearer\s+/.test(s)
}

export function isDeniedSlug(slug) {
  const s = String(slug ?? '').toLowerCase()
  return DENY_PREFIXES.some((p) => s.startsWith(p))
}

export function extractSlugsFromText(text) {
  const found = []
  const seen = new Set()
  for (const line of String(text ?? '').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    if (/https?:\/\//i.test(trimmed)) continue
    if (looksLikeSecret(trimmed)) continue
    SLUG_RE.lastIndex = 0
    let m
    while ((m = SLUG_RE.exec(trimmed))) {
      const head = m[1].toLowerCase()
      if (MIME_OR_PATH_HEADS.has(head)) continue
      const slug = `${m[1]}/${m[2]}`
      if (looksLikeSecret(slug) || isDeniedSlug(slug)) continue
      if (seen.has(slug)) continue
      seen.add(slug)
      found.push(slug)
    }
  }
  return found
}

function collectStrings(value, out) {
  if (typeof value === 'string') {
    out.push(value)
    return
  }
  if (Array.isArray(value)) {
    for (const v of value) collectStrings(v, out)
    return
  }
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      if (/key|token|secret|password|auth/i.test(k)) continue
      collectStrings(v, out)
    }
  }
}

function addSlugs(text, slugs, seen) {
  for (const slug of extractSlugsFromText(text)) {
    if (seen.has(slug)) continue
    seen.add(slug)
    slugs.push(slug)
  }
}

export function scanWorkspace(root) {
  const files = []
  const slugs = []
  const seen = new Set()

  const addFile = (rel, { stringsOnly = false } = {}) => {
    const path = join(root, rel)
    try {
      if (!statSync(path).isFile()) return
    } catch {
      return
    }
    files.push(path)
    const text = readFileSync(path, 'utf8')
    if (stringsOnly) {
      // package.json keys are npm names (`@sveltejs/kit`), not models. The README
      // contract is string values only; scanning the raw file would flag pretty-
      // printed dependency keys the minified-with-a-URL fixture never exercised.
      try {
        const strings = []
        collectStrings(JSON.parse(text), strings)
        for (const s of strings) addSlugs(s, slugs, seen)
      } catch {
        /* invalid package.json is not a ranking event */
      }
      return
    }
    addSlugs(text, slugs, seen)
  }

  addFile('.env.example')
  addFile('package.json', { stringsOnly: true })
  try {
    for (const name of readdirSync(join(root, 'config'))) {
      if (name.endsWith('.toml')) addFile(join('config', name))
    }
  } catch {
    /* no config dir */
  }

  return { slugs, files }
}

export function isStrictlyDominated(doc) {
  return Boolean(doc && doc.status === 'dominated')
}

export function renderComment({ asOf, lens, origin, findings }) {
  const lines = [
    COMMENT_MARKER,
    `This is a **warning**, not a failed check. Undominated is not a router.`,
    '',
    `Declared models that are **strictly dominated as of ${asOf}** (lens: ${lens}).`,
    '',
  ]
  for (const f of findings) {
    const by = f.by ? ` — dominated by \`${f.by}\`` : ''
    lines.push(`- \`${f.slug}\`${by}`)
  }
  lines.push(
    '',
    `Source: ${origin}/data/frontier.json and per-model dominance JSON. Unrated is not dominated.`,
    'v1 flags strict dominance only. Price-delta materiality is out of scope here.',
  )
  return lines.join('\n')
}

function githubHeaders(token, extra = {}) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'undominated-dominated-warn',
    ...extra,
  }
}

/**
 * One comment per PR, patched in place. A POST on every push would stack
 * identical warnings; the marker is how we find the previous one.
 */
export async function upsertPullRequestComment({ token, repository, number, body, fetchImpl }) {
  if (!token || !repository || !number) return { posted: false }
  const headers = githubHeaders(token)
  let existingId = null
  try {
    const list = await fetchImpl(
      `https://api.github.com/repos/${repository}/issues/${number}/comments?per_page=100`,
      { headers },
    )
    if (list?.ok) {
      const comments = await list.json()
      const found = Array.isArray(comments)
        ? comments.find((c) => String(c.body ?? '').includes(COMMENT_MARKER))
        : null
      if (found?.id) existingId = found.id
    }
  } catch {
    /* listing is best-effort; fall through to POST */
  }
  const url = existingId
    ? `https://api.github.com/repos/${repository}/issues/comments/${existingId}`
    : `https://api.github.com/repos/${repository}/issues/${number}/comments`
  await fetchImpl(url, {
    method: existingId ? 'PATCH' : 'POST',
    headers: githubHeaders(token, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ body }),
  })
  return { posted: true, updated: Boolean(existingId) }
}

export function logRun(r, { appendFile = appendFileSync, env = process.env, write = console } = {}) {
  if (r?.warning) write.warn(r.warning)
  if (r?.findings?.length) {
    write.warn(`warning: ${r.findings.length} declared model(s) strictly dominated`)
    for (const f of r.findings) {
      write.warn(`  ${f.slug}${f.by ? ` — dominated by ${f.by}` : ''}`)
    }
  } else {
    write.log('no strictly dominated declared models')
  }
  const summary = env.GITHUB_STEP_SUMMARY
  if (summary && r?.findings?.length) {
    try {
      appendFile(
        summary,
        renderComment({
          asOf: r.asOf ?? r.findings[0].asOf ?? 'unknown',
          lens: r.lens ?? 'lmarena',
          origin: r.origin ?? DEFAULT_ORIGIN,
          findings: r.findings,
        }) + '\n',
      )
    } catch {
      /* step summary is best-effort */
    }
  }
}

export async function run({
  workspace,
  origin = DEFAULT_ORIGIN,
  token,
  repository,
  event,
  fetchImpl = fetch,
  commentImpl,
} = {}) {
  const base = String(origin ?? DEFAULT_ORIGIN).replace(/\/$/, '')
  try {
    const { slugs } = scanWorkspace(workspace)
    const declared = slugs.filter((s) => !isDeniedSlug(s))
    const frontierRes = await fetchImpl(`${base}/data/frontier.json`)
    if (!frontierRes?.ok) {
      return {
        exitCode: 0,
        findings: [],
        origin: base,
        warning: `frontier fetch failed (${frontierRes?.status ?? 'error'})`,
      }
    }
    const frontier = await frontierRes.json()
    const asOf = frontier?.asOf ?? 'unknown'
    const lens = frontier?.lens ?? 'lmarena'
    const findings = []
    for (const slug of declared) {
      try {
        const href = `${base}/data/dominance/${fileSlug(slug)}.json`
        const res = await fetchImpl(href)
        if (!res?.ok) continue
        const doc = await res.json()
        if (!isStrictlyDominated(doc)) continue
        findings.push({ slug, by: doc.by ?? null, asOf: doc.asOf ?? asOf })
      } catch {
        /* one slug failing to fetch is not a failed check */
      }
    }
    let warning
    if (findings.length) {
      const body = renderComment({ asOf, lens, origin: base, findings })
      const number = event?.pull_request?.number
      const post = commentImpl ?? ((payload) => upsertPullRequestComment({ ...payload, fetchImpl }))
      try {
        await post({ body, token, repository, number })
      } catch (err) {
        warning = `comment failed: ${err?.message ?? err}`
      }
    }
    return { exitCode: 0, findings, asOf, lens, origin: base, warning }
  } catch (err) {
    return { exitCode: 0, findings: [], origin: base, warning: `fetch failed: ${err?.message ?? err}` }
  }
}

const isMain = process.argv[1] && String(process.argv[1]).endsWith('index.mjs')
if (isMain) {
  const eventPath = process.env.GITHUB_EVENT_PATH
  let event = {}
  if (eventPath) {
    try {
      event = JSON.parse(readFileSync(eventPath, 'utf8'))
    } catch {
      event = {}
    }
  }
  run({
    workspace: process.env.GITHUB_WORKSPACE ?? process.cwd(),
    origin: process.env.UNDOMINATED_ORIGIN ?? DEFAULT_ORIGIN,
    token: process.env.GITHUB_TOKEN,
    repository: process.env.GITHUB_REPOSITORY,
    event,
  })
    .then((r) => {
      logRun(r)
      process.exit(0)
    })
    .catch((err) => {
      console.warn(err)
      process.exit(0)
    })
}
