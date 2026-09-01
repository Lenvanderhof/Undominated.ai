/**
 * Argument parsing and the run loop, kept out of bin/ so both can be tested
 * without spawning a process. `main` never calls process.exit itself — it
 * returns a code and the strings it would have written, so a test can assert on
 * the exact bytes a user sees.
 */

import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import {
  ORIGIN,
  STATUS,
  fileSlug,
  frontierUrl,
  parseVerdict,
  renderFrontier,
  renderVerdict,
  verdictUrl,
} from './verdict.mjs'

export const USAGE = `undominated-check — is a model beaten by something better and cheaper?

Usage
  npx undominated-check <model-slug>
  npx undominated-check --frontier

Options
  --local <dir>   Read from a local directory instead of the network. Point it at
                  a checkout's static/data, or anywhere holding frontier.json and
                  dominance/<slug>.json.
  --origin <url>  Fetch from a different origin (default ${ORIGIN}).
  --json          Print the verdict document and the resolved URLs, unformatted.
  --frontier      List every model nothing beats on both quality and price.
  --exit-code     Exit with a status-specific code so CI can gate on it.
  --help          This text.
  --version       Print the package version.

Examples
  npx undominated-check google/gemini-3.7-flash
  npx undominated-check openai/gpt-5.2 --json
  npx undominated-check --frontier --local static/data
  npx undominated-check anthropic/claude-opus-5 --exit-code

Exit codes
  0  printed a verdict (or, with --exit-code, the model is on the frontier)
  1  usage error, or no verdict is published for that slug
  2  could not read the data
  With --exit-code: 3 dominated · 4 dominated with a trade · 5 unrated · 6 unpriced.
  unrated has its own code on purpose. Nobody having measured a model is not the
  same finding as a model being beaten, and a gate that conflates them will
  eventually approve a swap no evidence supports.

This tool is read-only. It fetches published JSON, sends nothing, and stores
nothing. It is not a router: it does not pick a model, hold keys, or execute
inference. Without --exit-code it is warn-never-fail — a printed verdict exits 0.
Every figure it prints carries the lens, the workload and the date the snapshot
was taken.`

export function parseArgs(argv) {
  const opts = {
    slug: null,
    local: null,
    origin: ORIGIN,
    json: false,
    frontier: false,
    exitCode: false,
    help: false,
    version: false,
  }
  const rest = []
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--help' || arg === '-h') opts.help = true
    else if (arg === '--version' || arg === '-v') opts.version = true
    else if (arg === '--json') opts.json = true
    else if (arg === '--frontier') opts.frontier = true
    else if (arg === '--exit-code') opts.exitCode = true
    else if (arg === '--local') opts.local = argv[++i] ?? null
    else if (arg === '--origin') opts.origin = argv[++i] ?? ORIGIN
    else if (arg.startsWith('--local=')) opts.local = arg.slice('--local='.length)
    else if (arg.startsWith('--origin=')) opts.origin = arg.slice('--origin='.length)
    else if (arg.startsWith('-')) return { ...opts, error: `unknown option ${arg}` }
    else rest.push(arg)
  }
  if (rest.length > 1) return { ...opts, error: `expected one model slug, got ${rest.length}` }
  opts.slug = rest[0] ?? null
  if (opts.origin) opts.origin = String(opts.origin).replace(/\/+$/, '')
  return opts
}

/** Local path or URL for one document, so the two modes share one code path. */
export function locate(kind, opts) {
  if (opts.local) {
    const dir = resolve(opts.local)
    return kind === 'frontier'
      ? { source: resolve(dir, 'frontier.json'), local: true }
      : { source: resolve(dir, 'dominance', `${fileSlug(opts.slug)}.json`), local: true }
  }
  return kind === 'frontier'
    ? { source: frontierUrl(opts.origin), local: false }
    : { source: verdictUrl(opts.slug, opts.origin), local: false }
}

class Missing extends Error {}

/** Identifies this CLI to the origin. Node's default fetch sends no UA. */
export const FETCH_UA = 'undominated-check/0.1.0 (+https://undominated.ai/check/)'

async function load({ source, local }, fetchImpl) {
  if (local) {
    try {
      return JSON.parse(await readFile(source, 'utf8'))
    } catch (err) {
      if (err && typeof err === 'object' && 'code' in err && err.code === 'ENOENT') {
        throw new Missing(`no file at ${source}`)
      }
      throw err
    }
  }
  let res
  try {
    res = await fetchImpl(source, {
      headers: { accept: 'application/json', 'user-agent': FETCH_UA },
    })
  } catch (err) {
    const cause =
      err instanceof Error && 'cause' in err && err.cause instanceof Error ? err.cause.message : ''
    throw new Error(
      `could not fetch ${source}: ${err instanceof Error ? err.message : String(err)}${
        cause ? ` (${cause})` : ''
      }`,
    )
  }
  if (res.status === 404) throw new Missing(`nothing published at ${source}`)
  if (!res.ok) throw new Error(`${source} returned ${res.status}`)
  return res.json()
}

/**
 * @param {string[]} argv
 * @param {{ fetch?: typeof globalThis.fetch, version?: string }} [deps]
 * @returns {Promise<{ code: number, out: string, err: string }>}
 */
export async function main(argv, deps = {}) {
  const fetchImpl = deps.fetch ?? globalThis.fetch
  const opts = parseArgs(argv)

  if (opts.error) return { code: 1, out: '', err: `${opts.error}\n\n${USAGE}\n` }
  if (opts.help) return { code: 0, out: `${USAGE}\n`, err: '' }
  if (opts.version) return { code: 0, out: `${deps.version ?? '0.0.0'}\n`, err: '' }
  if (!opts.frontier && !opts.slug) return { code: 1, out: '', err: `${USAGE}\n` }

  const kind = opts.frontier ? 'frontier' : 'verdict'
  const where = locate(kind, opts)

  let doc
  try {
    doc = await load(where, fetchImpl)
  } catch (err) {
    if (err instanceof Missing) {
      const hint = opts.frontier
        ? ''
        : `\n\nA slug with no verdict is not a good verdict. It usually means the\nmodel is absent from the catalogue, retired, or spelled differently —\ncheck ${opts.origin}/models/.\n`
      return { code: 1, out: '', err: `${err.message}${hint}` }
    }
    return { code: 2, out: '', err: `${err instanceof Error ? err.message : String(err)}\n` }
  }

  if (opts.frontier) {
    if (opts.json) return { code: 0, out: `${JSON.stringify(doc, null, 2)}\n`, err: '' }
    return { code: 0, out: renderFrontier(doc, { origin: opts.origin }), err: '' }
  }

  let verdict
  try {
    verdict = parseVerdict(doc)
  } catch (err) {
    return { code: 2, out: '', err: `${err instanceof Error ? err.message : String(err)}\n` }
  }

  if (opts.json) {
    const payload = {
      ...doc,
      _source: String(where.source),
      _checkUrl: `${opts.origin}/check/`,
      _modelUrl: `${opts.origin}/models/${fileSlug(verdict.slug)}/`,
    }
    return { code: 0, out: `${JSON.stringify(payload, null, 2)}\n`, err: '' }
  }

  const out = renderVerdict(verdict, { origin: opts.origin, source: String(where.source) })
  const code = opts.exitCode ? statusExitCode(verdict.status) : 0
  return { code, out, err: '' }
}

export const statusExitCode = (status) => STATUS[status]?.exitCode ?? 1
