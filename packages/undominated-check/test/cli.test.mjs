/**
 * Self-contained tests for the published CLI: no network, no build tree.
 *
 *   node --test packages/undominated-check/test/
 *
 * Fixtures under test/fixtures/data are synthetic (`acme/*`). They follow the
 * published layout — frontier.json and dominance/<fileSlug>.json — so --local
 * exercises the same code path a mirrored copy of the site would.
 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { FETCH_UA, main, parseArgs, statusExitCode } from '../src/cli.mjs'
import { STATUS, fileSlug, parseVerdict, summaryLine } from '../src/verdict.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const DATA = join(HERE, 'fixtures', 'data')
const PKG = JSON.parse(readFileSync(join(HERE, '..', 'package.json'), 'utf8'))

const fixture = (slug) =>
  JSON.parse(readFileSync(join(DATA, 'dominance', `${fileSlug(slug)}.json`), 'utf8'))

const run = (argv, deps = {}) => main(argv, { version: PKG.version, tty: false, env: {}, ...deps })

/** A fetch that serves the fixture directory as if it were the origin. */
function fixtureFetch(seen = []) {
  return async (url, init) => {
    seen.push({ url: String(url), init })
    const path = new URL(url).pathname.replace(/^\/data\//, '')
    try {
      const body = JSON.parse(readFileSync(join(DATA, path), 'utf8'))
      return { ok: true, status: 200, json: async () => body }
    } catch {
      return { ok: false, status: 404, json: async () => ({}) }
    }
  }
}

describe('parseArgs', () => {
  test('one slug, flags in any order', () => {
    const o = parseArgs(['--json', 'acme/fast-1', '--exit-code'])
    assert.equal(o.slug, 'acme/fast-1')
    assert.equal(o.json, true)
    assert.equal(o.exitCode, true)
  })

  test('--local and --origin in both spellings; trailing slash dropped', () => {
    assert.equal(parseArgs(['--local', 'x']).local, 'x')
    assert.equal(parseArgs(['--local=y']).local, 'y')
    assert.equal(parseArgs(['--origin', 'https://e.test/']).origin, 'https://e.test')
    assert.equal(parseArgs(['--origin=https://e.test//']).origin, 'https://e.test')
  })

  test('two slugs or an unknown flag is a usage error', () => {
    assert.match(parseArgs(['a/b', 'c/d']).error, /expected one model slug/)
    assert.match(parseArgs(['--nope']).error, /unknown option --nope/)
  })

  test('--mcp is a mode, not a slug', () => {
    const o = parseArgs(['--mcp', '--local', 'd'])
    assert.equal(o.mcp, true)
    assert.equal(o.slug, null)
  })
})

describe('verdicts from --local', () => {
  test('dominated names the winner and both margins', async () => {
    const r = await run(['acme/fast-1', '--local', DATA])
    assert.equal(r.code, 0)
    assert.match(r.out, /dominated — acme\/fast-2 scores \+42\.5 and costs 31% less/)
    assert.match(r.out, /as of {6}2026-09-23/)
    assert.match(r.out, /beaten by {2}https:\/\/undominated\.ai\/models\/acme__fast-2\//)
    assert.match(r.out, /verdict {4}https:\/\/undominated\.ai\/data\/dominance\/acme__fast-1\.json/)
  })

  test('a trade names every loss', async () => {
    const r = await run(['acme/wide-1', '--local', DATA])
    assert.match(r.out, /but gives up a smaller context window and an input mode it does not accept/)
  })

  test('margins rounded to zero never print "0% less"', () => {
    const line = summaryLine(parseVerdict(fixture('acme/tie-1')))
    assert.doesNotMatch(line, /0% less/)
    assert.match(line, /margins under the rounding/)
  })

  test('the colon in a slug maps to the published filename', async () => {
    const r = await run(['acme/free-1:beta', '--local', DATA])
    assert.equal(r.code, 0)
    assert.match(r.out, /unpriced/)
  })

  test('warn, never fail: every printed verdict exits 0 without --exit-code', async () => {
    for (const slug of ['acme/fast-1', 'acme/wide-1', 'acme/fast-2', 'acme/quiet-1', 'acme/free-1:beta']) {
      assert.equal((await run([slug, '--local', DATA])).code, 0, slug)
    }
  })

  test('--exit-code gives each status its own code; unrated never shares with dominated', async () => {
    const codes = {}
    for (const slug of ['acme/fast-1', 'acme/wide-1', 'acme/fast-2', 'acme/quiet-1', 'acme/free-1:beta']) {
      const r = await run([slug, '--local', DATA, '--exit-code'])
      codes[fixture(slug).status] = r.code
    }
    assert.deepEqual(codes, {
      dominated: 3,
      'dominated-with-tradeoff': 4,
      frontier: 0,
      unrated: 5,
      unpriced: 6,
    })
    assert.equal(new Set(Object.values(codes)).size, 5)
    for (const [status, { exitCode }] of Object.entries(STATUS)) assert.equal(statusExitCode(status), exitCode)
  })

  test('--json returns the document plus resolvable URLs', async () => {
    const r = await run(['acme/fast-1', '--local', DATA, '--json'])
    const doc = JSON.parse(r.out)
    assert.equal(doc.status, 'dominated')
    assert.equal(doc._modelUrl, 'https://undominated.ai/models/acme__fast-1/')
    assert.equal(doc._checkUrl, 'https://undominated.ai/check/')
  })

  test('an unpublished slug exits 1 and says absence is not a good verdict', async () => {
    const r = await run(['acme/ghost-9', '--local', DATA])
    assert.equal(r.code, 1)
    assert.match(r.err, /not a good verdict/)
  })

  test('a status newer than the CLI is an error, not a guess', async () => {
    const r = await run(['acme/future-1', '--local', DATA])
    assert.equal(r.code, 2)
    assert.match(r.err, /older than the data/)
  })

  test('--frontier lists members with lens, workload and date', async () => {
    const r = await run(['--frontier', '--local', DATA])
    assert.equal(r.code, 0)
    assert.match(r.out, /2 models on the frontier · lens lmarena · workload balanced · as of 2026-09-23/)
    assert.match(r.out, /acme\/fast-2 +1401\.5 {2}\$0\.12\/M/)
  })
})

describe('network mode', () => {
  test('fetches the canonical URL with this version in the user-agent', async () => {
    const seen = []
    const r = await run(['acme/fast-2'], { fetch: fixtureFetch(seen) })
    assert.equal(r.code, 0)
    assert.equal(seen[0].url, 'https://undominated.ai/data/dominance/acme__fast-2.json')
    assert.equal(seen[0].init.headers['user-agent'], FETCH_UA)
    assert.equal(FETCH_UA, `undominated-check/${PKG.version} (+https://undominated.ai/check/)`)
  })

  test('--origin is honoured', async () => {
    const seen = []
    await run(['acme/fast-2', '--origin', 'https://mirror.test/'], { fetch: fixtureFetch(seen) })
    assert.equal(seen[0].url, 'https://mirror.test/data/dominance/acme__fast-2.json')
  })

  test('a network failure exits 2 and names the URL', async () => {
    const r = await run(['acme/fast-2'], {
      fetch: async () => {
        throw new Error('fetch failed', { cause: new Error('ECONNRESET') })
      },
    })
    assert.equal(r.code, 2)
    assert.match(r.err, /could not fetch https:\/\/undominated\.ai\/data\/dominance\/acme__fast-2\.json: fetch failed \(ECONNRESET\)/)
  })

  test('a 5xx exits 2; a 404 exits 1', async () => {
    const status = (s) => async () => ({ ok: false, status: s, json: async () => ({}) })
    assert.equal((await run(['acme/x'], { fetch: status(503) })).code, 2)
    assert.equal((await run(['acme/x'], { fetch: status(404) })).code, 1)
  })
})

describe('plumbing', () => {
  test('--version prints the package version', async () => {
    assert.equal((await run(['--version'])).out, `${PKG.version}\n`)
  })

  test('no slug prints usage and exits 1', async () => {
    const r = await run([])
    assert.equal(r.code, 1)
    assert.match(r.err, /Usage/)
  })

  test('--mcp through main() refuses rather than half-starting a server', async () => {
    const r = await run(['--mcp'])
    assert.equal(r.code, 1)
    assert.match(r.err, /--mcp/)
  })

  test('pipes and CI get plain bytes; a TTY gets the staircase', async () => {
    const plain = await run(['acme/fast-2', '--local', DATA], { tty: true, env: { CI: 'true' } })
    assert.doesNotMatch(plain.out, /\x1b\[/)
    const dressed = await run(['acme/fast-2', '--local', DATA], { tty: true, env: {} })
    assert.match(dressed.out, /▄██████▌/)
    assert.match(dressed.out, /\x1b\[38;2;131;184;29m/)
  })
})
