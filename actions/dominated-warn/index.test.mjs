/**
 * Warn-only GitHub Action (growth-beyond §3).
 *
 *   node --test actions/dominated-warn/index.test.mjs
 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  COMMENT_MARKER,
  DEFAULT_ORIGIN,
  extractSlugsFromText,
  fileSlug,
  isStrictlyDominated,
  logRun,
  looksLikeSecret,
  renderComment,
  run,
  scanWorkspace,
  upsertPullRequestComment,
} from './index.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))

const frontier = {
  v: 1,
  lens: 'lmarena',
  workload: 'balanced',
  asOf: '2026-08-26',
  members: [{ slug: 'anthropic/claude-opus-5', score: 1504.2, price: 10 }],
}

const verdict = (over) => ({
  v: 1,
  lens: 'lmarena',
  workload: 'balanced',
  asOf: '2026-08-26',
  by: null,
  dq: 0,
  savingPct: 0,
  losses: [],
  ...over,
})

const DOCS = {
  'openai/gpt-5': verdict({ slug: 'openai/gpt-5', status: 'dominated', by: 'meta/muse-spark-1.1' }),
  'openai/gpt-4o': verdict({ slug: 'openai/gpt-4o', status: 'unrated' }),
  'anthropic/claude-opus-5': verdict({ slug: 'anthropic/claude-opus-5', status: 'frontier' }),
  'google/gemini-2.5-pro': verdict({
    slug: 'google/gemini-2.5-pro',
    status: 'dominated-with-tradeoff',
    by: 'google/gemini-3.7-flash',
    losses: ['modality'],
  }),
  'openai/gpt-5-mini': verdict({ slug: 'openai/gpt-5-mini', status: 'unpriced' }),
}

const jsonResponse = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  async json() {
    return body
  },
  async text() {
    return JSON.stringify(body)
  },
})

const fetchCatalogue = (overrides = {}) => {
  const docs = { ...DOCS, ...overrides.docs }
  return async (url) => {
    const href = String(url)
    if (href.endsWith('/data/frontier.json')) {
      if (overrides.frontierFail) {
        throw new Error('ECONNRESET')
      }
      if (overrides.frontierStatus) {
        return jsonResponse({}, overrides.frontierStatus)
      }
      return jsonResponse(frontier)
    }
    const m = href.match(/\/data\/dominance\/([^/?#]+)\.json$/)
    if (m) {
      const slug = Object.keys(docs).find((s) => fileSlug(s) === decodeURIComponent(m[1]))
      if (!slug) return jsonResponse({ message: 'not found' }, 404)
      return jsonResponse(docs[slug])
    }
    if (href.includes('/issues/') && href.includes('/comments')) {
      return jsonResponse({ id: 1 }, 201)
    }
    return jsonResponse({ message: 'not found' }, 404)
  }
}

const workspace = (files) => {
  const root = mkdtempSync(join(tmpdir(), 'dominated-warn-'))
  for (const [rel, body] of Object.entries(files)) {
    const path = join(root, rel)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, body)
  }
  return root
}

describe('looksLikeSecret', () => {
  test('flags sk-, ghp_, github_pat_, and Bearer tokens', () => {
    assert.equal(looksLikeSecret('sk-ant-api03-aaaaaaaa'), true)
    assert.equal(looksLikeSecret('ghp_abcdefghijklmnopqrstuvwx'), true)
    assert.equal(looksLikeSecret('github_pat_11AAAA'), true)
    assert.equal(looksLikeSecret('Bearer eyJhbGciOiJIUzI1NiJ9.aa.bb'), true)
    assert.equal(looksLikeSecret('openai/gpt-5'), false)
  })
})

describe('extractSlugsFromText', () => {
  test('finds provider/model slugs', () => {
    const found = extractSlugsFromText('model = "anthropic/claude-opus-5"\n')
    assert.deepEqual(found, ['anthropic/claude-opus-5'])
  })

  test('skips secret values rather than scanning them for slugs', () => {
    const found = extractSlugsFromText(
      'OPENAI_API_KEY=sk-ant-api03-aaaaaaaa\nMODEL=openai/gpt-5\nAuthorization: Bearer eyJhbGciOi.aa.bb\nGITHUB_TOKEN=ghp_abcdefghijklmnopqrstuvwx\n',
    )
    assert.deepEqual(found, ['openai/gpt-5'])
    assert.ok(!found.some((s) => /sk-|ghp_|Bearer/i.test(s)))
  })

  test('does not treat path segments or MIME types as models', () => {
    const found = extractSlugsFromText(
      'import x from "src/lib"\nContent-Type: application/json\nimage/png\ntext/plain\n',
    )
    assert.deepEqual(found, [])
  })

  test('does not treat a scoped npm package as a model', () => {
    assert.deepEqual(extractSlugsFromText('"@sveltejs/kit": "2.0.0"\n'), [])
  })

  test('ignores commented .env lines and URLs', () => {
    const found = extractSlugsFromText(
      '# MODEL=openai/gpt-5\nhttps://github.com/Lenvanderhof/Undominated.ai\nhttps://undominated.ai/models/openai/gpt-5/\n',
    )
    assert.deepEqual(found, [])
  })
})

describe('scanWorkspace', () => {
  test('reads .env.example, config/*.toml, and package.json only', () => {
    const root = workspace({
      '.env.example': 'MODEL=openai/gpt-5\n',
      '.env': 'SECRET_MODEL=anthropic/claude-opus-5\nOPENAI_KEY=sk-live-secret\n',
      'config/models.toml': 'id = "google/gemini-2.5-pro"\n',
      'package.json': JSON.stringify({
        name: 'demo',
        model: 'anthropic/claude-opus-5',
        dependencies: { '@sveltejs/kit': '2.0.0' },
        repository: 'https://github.com/acme/app',
      }),
      'src/lib/foo.js': 'const m = "openai/gpt-4o"\n',
    })
    const { slugs, files } = scanWorkspace(root)
    assert.deepEqual([...slugs].sort(), [
      'anthropic/claude-opus-5',
      'google/gemini-2.5-pro',
      'openai/gpt-5',
    ])
    assert.ok(files.some((f) => f.endsWith('.env.example')))
    assert.ok(!files.some((f) => f.endsWith('.env')))
    assert.ok(!slugs.includes('openai/gpt-4o'))
  })

  test('does not exfiltrate secret-looking values into the slug list', () => {
    const root = workspace({
      '.env.example': 'KEY=sk-proj-secret\nMODEL=openai/gpt-5\n',
    })
    const { slugs } = scanWorkspace(root)
    assert.deepEqual(slugs, ['openai/gpt-5'])
    assert.equal(JSON.stringify(slugs).includes('sk-'), false)
  })

  test('package.json contributes string values only, not pretty-printed dependency keys', () => {
    const root = workspace({
      'package.json': `{
  "name": "demo",
  "model": "openai/gpt-5",
  "dependencies": {
    "@sveltejs/kit": "2.0.0",
    "express": "4.18.0"
  }
}
`,
    })
    const { slugs, files } = scanWorkspace(root)
    assert.deepEqual(slugs, ['openai/gpt-5'])
    assert.ok(!slugs.includes('sveltejs/kit'))
    assert.ok(files.some((f) => f.endsWith('package.json')))
  })
})

describe('isStrictlyDominated', () => {
  test('only status=dominated counts; unrated is not dominated', () => {
    assert.equal(isStrictlyDominated(DOCS['openai/gpt-5']), true)
    assert.equal(isStrictlyDominated(DOCS['openai/gpt-4o']), false)
    assert.equal(isStrictlyDominated(DOCS['anthropic/claude-opus-5']), false)
    assert.equal(isStrictlyDominated(DOCS['google/gemini-2.5-pro']), false)
    assert.equal(isStrictlyDominated(DOCS['openai/gpt-5-mini']), false)
    assert.equal(isStrictlyDominated(null), false)
  })
})

describe('fileSlug', () => {
  test('matches the dominance JSON filename contract', () => {
    assert.equal(fileSlug('anthropic/claude-opus-5'), 'anthropic__claude-opus-5')
    assert.equal(fileSlug('openai/gpt-4o-mini:free'), 'openai__gpt-4o-mini__free')
  })
})

describe('renderComment', () => {
  test('names the as-of date, LMArena lens, and warn-never-fail; not a router', () => {
    const body = renderComment({
      asOf: '2026-08-26',
      lens: 'lmarena',
      origin: DEFAULT_ORIGIN,
      findings: [{ slug: 'openai/gpt-5', by: 'meta/muse-spark-1.1', asOf: '2026-08-26' }],
    })
    assert.match(body, new RegExp(COMMENT_MARKER))
    assert.match(body, /strictly dominated as of 2026-08-26/i)
    assert.match(body, /lmarena/i)
    assert.match(body, /openai\/gpt-5/)
    assert.match(body, /meta\/muse-spark-1\.1/)
    assert.match(body, /not a router/i)
    assert.match(body, /warning/i)
    assert.doesNotMatch(body, /fail the job|block merge|Artificial Analysis|intelligence/i)
  })
})

describe('run', () => {
  test('comments when a declared model is strictly dominated and exits 0', async () => {
    const root = workspace({ '.env.example': 'MODEL=openai/gpt-5\n' })
    const comments = []
    const result = await run({
      workspace: root,
      origin: DEFAULT_ORIGIN,
      token: 'ghs_test',
      repository: 'acme/app',
      event: { pull_request: { number: 12 } },
      fetchImpl: fetchCatalogue(),
      commentImpl: async (payload) => {
        comments.push(payload)
      },
    })
    assert.equal(result.exitCode, 0)
    assert.equal(result.findings.length, 1)
    assert.equal(result.findings[0].slug, 'openai/gpt-5')
    assert.equal(comments.length, 1)
    assert.match(comments[0].body, /strictly dominated as of 2026-08-26/i)
  })

  test('does not treat unrated, frontier, or tradeoff rows as dominated', async () => {
    const root = workspace({
      '.env.example': 'A=openai/gpt-4o\nB=anthropic/claude-opus-5\nC=google/gemini-2.5-pro\n',
    })
    const comments = []
    const result = await run({
      workspace: root,
      origin: DEFAULT_ORIGIN,
      token: 'ghs_test',
      repository: 'acme/app',
      event: { pull_request: { number: 12 } },
      fetchImpl: fetchCatalogue(),
      commentImpl: async (payload) => {
        comments.push(payload)
      },
    })
    assert.equal(result.exitCode, 0)
    assert.deepEqual(result.findings, [])
    assert.equal(comments.length, 0)
  })

  test('fetch failure warns and exits 0', async () => {
    const root = workspace({ '.env.example': 'MODEL=openai/gpt-5\n' })
    const comments = []
    const result = await run({
      workspace: root,
      origin: DEFAULT_ORIGIN,
      token: 'ghs_test',
      repository: 'acme/app',
      event: { pull_request: { number: 12 } },
      fetchImpl: fetchCatalogue({ frontierFail: true }),
      commentImpl: async (payload) => {
        comments.push(payload)
      },
    })
    assert.equal(result.exitCode, 0)
    assert.equal(comments.length, 0)
    assert.match(result.warning, /fetch/i)
  })

  test('skips denied providers even if a consumer declared them', async () => {
    const root = workspace({ '.env.example': 'MODEL=stealth/ox-alpha\nOTHER=fakeprovider/demo\n' })
    const result = await run({
      workspace: root,
      origin: DEFAULT_ORIGIN,
      fetchImpl: fetchCatalogue({
        docs: {
          'stealth/ox-alpha': verdict({ slug: 'stealth/ox-alpha', status: 'dominated', by: 'x' }),
        },
      }),
      commentImpl: async () => {
        throw new Error('should not comment')
      },
    })
    assert.equal(result.exitCode, 0)
    assert.deepEqual(result.findings, [])
  })

  test('a comment failure still returns findings and exits 0', async () => {
    const root = workspace({ '.env.example': 'MODEL=openai/gpt-5\n' })
    const result = await run({
      workspace: root,
      origin: DEFAULT_ORIGIN,
      token: 'ghs_test',
      repository: 'acme/app',
      event: { pull_request: { number: 12 } },
      fetchImpl: fetchCatalogue(),
      commentImpl: async () => {
        throw new Error('API 403')
      },
    })
    assert.equal(result.exitCode, 0)
    assert.equal(result.findings.length, 1)
    assert.match(result.warning, /comment failed/i)
  })
})

describe('upsertPullRequestComment', () => {
  test('patches an existing marker comment instead of posting a second one', async () => {
    const calls = []
    const fetchImpl = async (url, opts = {}) => {
      calls.push({ url: String(url), method: opts.method ?? 'GET' })
      if (String(url).includes('/issues/') && String(url).includes('/comments') && !opts.method) {
        return jsonResponse([{ id: 99, body: `${COMMENT_MARKER}\nold` }])
      }
      return jsonResponse({ id: 99 }, 200)
    }
    const result = await upsertPullRequestComment({
      token: 'ghs_test',
      repository: 'acme/app',
      number: 12,
      body: `${COMMENT_MARKER}\nnew`,
      fetchImpl,
    })
    assert.equal(result.posted, true)
    assert.equal(result.updated, true)
    assert.ok(calls.some((c) => c.method === 'PATCH' && c.url.endsWith('/issues/comments/99')))
    assert.equal(
      calls.filter((c) => c.method === 'POST').length,
      0,
    )
  })
})

describe('logRun', () => {
  test('always logs; never implies a failed check', () => {
    const lines = []
    logRun(
      { findings: [{ slug: 'openai/gpt-5', by: 'meta/muse-spark-1.1' }] },
      { write: { warn: (s) => lines.push(String(s)), log: (s) => lines.push(String(s)) }, env: {} },
    )
    assert.ok(lines.some((l) => /openai\/gpt-5/.test(l)))
    assert.ok(lines.some((l) => /warning/i.test(l)))
  })
})

describe('packaging', () => {
  test('action.yml is composite, warn-never-fail, and does not fail the job', () => {
    const yml = readFileSync(join(HERE, 'action.yml'), 'utf8')
    assert.match(yml, /using:\s*composite/)
    assert.match(yml, /node/)
    assert.match(yml, /continue-on-error:\s*true/)
    assert.doesNotMatch(yml, /continue-on-error:\s*false/)
    assert.doesNotMatch(yml, /exit 1/)
    assert.doesNotMatch(yml, /core\.setFailed/)
  })

  test('standalone runtime does not import classify() or ranking', () => {
    const src = readFileSync(join(HERE, 'index.mjs'), 'utf8')
    assert.doesNotMatch(src, /watch-upstream/)
    assert.doesNotMatch(src, /SAFE_PRICE_DELTA/)
    assert.doesNotMatch(src, /from ['"]@actions\//)
    assert.doesNotMatch(src, /ranking\.mjs/)
    assert.doesNotMatch(src, /intelligence/)
  })

  test('README documents install, warn-never-fail, lens, and v1 scope', () => {
    const md = readFileSync(join(HERE, 'README.md'), 'utf8')
    assert.match(md, /Lenvanderhof\/Undominated\.ai\/actions\/dominated-warn@main/)
    assert.match(md, /pin a tag/i)
    assert.match(md, /warn, never fail/i)
    assert.match(md, /lmarena/i)
    assert.match(md, /not a router/i)
    assert.match(md, /as of/i)
    assert.match(md, /classify\(\)/)
    assert.match(md, /watch-upstream/)
    assert.match(md, /\.env\.example/)
    assert.match(md, /config\/\*\.toml/)
    assert.match(md, /package\.json/)
    assert.doesNotMatch(md, /Lenvanderhof\/AIDREAMTEAM\/actions\/dominated-warn@/)
  })

  test('launch-verdicts workflow drafts privately and never publishes', () => {
    const yml = readFileSync(resolve(HERE, '../../.github/workflows/launch-verdicts.yml'), 'utf8')
    assert.match(yml, /workflow_dispatch/)
    assert.match(yml, /cron:/)
    assert.match(yml, /watch-upstream\.mjs --json data\/\.cache\/changeset\.json/)
    assert.match(yml, /\|\| true/)
    assert.match(yml, /draft-verdict\.mjs data\/\.cache\/changeset\.json --out data\/drafts/)
    assert.match(yml, /upload-artifact/)
    assert.match(yml, /contents:\s*read/)
    assert.doesNotMatch(yml, /pull_request/)
    assert.doesNotMatch(yml, /create-pull-request/)
    assert.doesNotMatch(yml, /pull-requests:\s*write/)
    assert.doesNotMatch(yml, /contents:\s*write/)
    assert.doesNotMatch(yml, /--out static/)
    assert.doesNotMatch(yml, /--out build/)
    assert.doesNotMatch(yml, /rsync/)
    assert.doesNotMatch(yml, /deploy:undominated/)
    assert.doesNotMatch(yml, /secrets\./)
  })
})
