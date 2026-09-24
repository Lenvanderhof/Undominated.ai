/**
 * Offline tests for the repository scripts that have pure cores.
 *
 *   node --test 'scripts/*.test.mjs'
 */
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { newestCatalogueTag, rewrite as rewriteDump } from './dump-current.mjs'
import { rewrite as rewritePins } from './pins-current.mjs'
import { section } from './release-notes.mjs'
import { loadSeeds, parseSeed, pickCategory } from './seed-discussions.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

describe('dump-current', () => {
  test('the newest tag wins by date, ignoring other tags', () => {
    assert.equal(
      newestCatalogueTag(['v1', 'catalogue-2026-09-19', 'catalogue-2026-09-23', 'catalogue-2026-08-31', 'undominated-check@0.2.0']),
      'catalogue-2026-09-23',
    )
    assert.equal(newestCatalogueTag(['v1']), null)
  })

  test('every stale reference is reported and rewritten, not just the first', () => {
    const md = 'a catalogue-2026-09-19 b (…/tag/catalogue-2026-09-19) c catalogue-2026-08-31'
    const { next, stale } = rewriteDump('README.md', md, 'catalogue-2026-09-23')
    assert.equal(next, 'a catalogue-2026-09-23 b (…/tag/catalogue-2026-09-23) c catalogue-2026-09-23')
    assert.deepEqual(stale.sort(), ['catalogue-2026-08-31', 'catalogue-2026-09-19'])
  })

  test('CITATION.cff version and date-released move with the tag', () => {
    const cff = "version: '2026-09-19'\ndate-released: '2026-09-19'\n  value: https://x/tag/catalogue-2026-09-19\n"
    const { next, stale } = rewriteDump('CITATION.cff', cff, 'catalogue-2026-09-23')
    assert.match(next, /^version: '2026-09-23'$/m)
    assert.match(next, /^date-released: '2026-09-23'$/m)
    assert.equal(stale.length, 3)
  })

  test('a current file is left byte-identical', () => {
    const cff = readFileSync(resolve(ROOT, 'CITATION.cff'), 'utf8')
    const tag = cff.match(/catalogue-\d{4}-\d{2}-\d{2}/)[0]
    assert.equal(rewriteDump('CITATION.cff', cff, tag).next, cff)
  })
})

describe('pins-current', () => {
  test('pins and the publish date follow npm latest', () => {
    const md = 'Package: [`undominated-check@0.1.1`](…) (MIT, 2026-09-09).\n`npx undominated-check@0.1.1 x`'
    const { next, stale } = rewritePins(md, { version: '0.2.0', date: '2026-10-01' })
    assert.equal(next, 'Package: [`undominated-check@0.2.0`](…) (MIT, 2026-10-01).\n`npx undominated-check@0.2.0 x`')
    assert.deepEqual(stale.sort(), ['@0.1.1', 'published 2026-09-09'])
  })

  test('an unpinned mention is not a pin', () => {
    const md = 'npx --yes undominated-check google/gemini-3.7-flash'
    assert.equal(rewritePins(md, { version: '9.9.9', date: null }).next, md)
  })
})

describe('release-notes', () => {
  const log = '# Changelog\n\n## 0.2.0\n\n- new\n\n## 0.1.1 — 2026-09-09\n\n- old\n'

  test('returns exactly one section', () => {
    assert.equal(section(log, '0.2.0'), '- new')
    assert.equal(section(log, '0.1.1'), '- old')
  })

  test('a missing or empty section is null, and 0.1.1 does not match 0.1.10', () => {
    assert.equal(section(log, '0.3.0'), null)
    assert.equal(section('## 1.0.0\n\n## 0.9.0\n- x', '1.0.0'), null)
    assert.equal(section('## 0.1.10\n- x', '0.1.1'), null)
  })

  test('the shipped changelogs have notes for their current versions', () => {
    const pkg = JSON.parse(readFileSync(resolve(ROOT, 'packages/undominated-check/package.json'), 'utf8'))
    assert.ok(section(readFileSync(resolve(ROOT, 'packages/undominated-check/CHANGELOG.md'), 'utf8'), pkg.version))
    assert.ok(section(readFileSync(resolve(ROOT, 'actions/dominated-warn/CHANGELOG.md'), 'utf8'), '1.0.0'))
  })
})

describe('seed-discussions', () => {
  test('front matter gives title, category and fallbacks in order', () => {
    const seed = parseSeed('---\ntitle: A "quoted" title\ncategory: ideas\nfallback: general, q-a\n---\nBody\n', 'x.md')
    assert.equal(seed.title, 'A "quoted" title')
    assert.deepEqual(seed.categories, ['ideas', 'general', 'q-a'])
    assert.equal(seed.body, 'Body\n')
  })

  test('the first category that exists wins', () => {
    const cats = [{ slug: 'general' }, { slug: 'q-a' }]
    assert.equal(pickCategory(['ideas', 'general'], cats).slug, 'general')
    assert.equal(pickCategory(['ideas'], cats), null)
  })

  test('every shipped seed parses, has a unique title, and dates any figure it quotes', () => {
    const seeds = loadSeeds()
    assert.ok(seeds.length >= 10)
    assert.equal(new Set(seeds.map((s) => s.title)).size, seeds.length)
    for (const s of seeds) {
      assert.ok(s.title.length <= 256, s.file)
      // A percentage or a dollar figure in a seed must come with a date. A
      // confidence level ("95% intervals") is a method, not a data point.
      const figures = s.body.replace(/\b\d{2}% (confidence )?intervals?/g, '')
      if (/\d+%|\$\d/.test(figures)) assert.match(s.body, /20\d\d-\d\d-\d\d/, `${s.file} quotes a figure with no date`)
    }
  })
})
