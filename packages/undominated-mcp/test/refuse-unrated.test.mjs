import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { quoteVerdict, refuseStatus } from '../src/quote.mjs'
import { callTool, createTools, requireId } from '../src/tools.mjs'
import { handleMessage } from '../src/server.mjs'

const dir = dirname(fileURLToPath(import.meta.url))
const load = (name) => JSON.parse(readFileSync(resolve(dir, 'fixtures', name), 'utf8'))

const UNRATED = load('verdict-unrated.json')
const UNPRICED = load('verdict-unpriced.json')
const DOMINATED = load('verdict-dominated.json')
const FRONTIER = load('frontier.json')
const CATALOGUE = load('catalogue.json')

const ORIGIN = 'https://undominated.ai'

function stubFetch(docs) {
  return async (url) => {
    const body = docs[url]
    if (body === undefined) return { ok: false, status: 404, json: async () => ({}) }
    return { ok: true, status: 200, json: async () => structuredClone(body) }
  }
}

const live = stubFetch({
  [`${ORIGIN}/data/dominance/lab__unmeasured.json`]: UNRATED,
  [`${ORIGIN}/data/dominance/lab__nolist.json`]: UNPRICED,
  [`${ORIGIN}/data/dominance/lab__beaten.json`]: DOMINATED,
  [`${ORIGIN}/data/dominance/lab__mystery.json`]: { ...DOMINATED, slug: 'lab/mystery', status: 'provisionally-dominated' },
  [`${ORIGIN}/data/frontier.json`]: FRONTIER,
  [`${ORIGIN}/data/catalogue.json`]: CATALOGUE,
})

const tools = createTools({ fetch: live, origin: ORIGIN })

test('quoteVerdict refuses unrated as {error,id} and drops the zeros on the document', () => {
  const out = quoteVerdict(UNRATED, { id: 'lab/unmeasured' })
  assert.deepEqual(out, { error: 'unrated', id: 'lab/unmeasured' })
  assert.equal(Object.keys(out).length, 2)
  assert.equal(out.dq, undefined)
  assert.equal(out.savingPct, undefined)
  assert.equal(out.status, undefined)
})

test('get_verdict returns {error:"unrated",id} rather than a guess', async () => {
  const out = await tools.get_verdict({ id: 'lab/unmeasured' })
  assert.deepEqual(out, { error: 'unrated', id: 'lab/unmeasured' })
})

test('get_verdict returns {error:"unpriced",id} rather than a guess', async () => {
  const out = await tools.get_verdict({ id: 'lab/nolist' })
  assert.deepEqual(out, { error: 'unpriced', id: 'lab/nolist' })
})

test('refuseStatus is exactly the two-key object the tool contract names', () => {
  assert.deepEqual(refuseStatus('unrated', 'x/y'), { error: 'unrated', id: 'x/y' })
  assert.deepEqual(refuseStatus('unpriced', 'x/y'), { error: 'unpriced', id: 'x/y' })
})

test('an unpublished slug is unpublished, not a silent pass', async () => {
  const out = await tools.get_verdict({ id: 'lab/ghost' })
  assert.deepEqual(out, { error: 'unpublished', id: 'lab/ghost' })
})

test('an unknown status is an error, not a new verdict', async () => {
  const out = await tools.get_verdict({ id: 'lab/mystery' })
  assert.equal(out.error, 'unknown-status')
  assert.equal(out.id, 'lab/mystery')
  assert.equal(out.status, undefined)
  assert.equal(out.dq, undefined)
})

test('a dominated verdict is quoted as JSON, not paraphrased into prose', async () => {
  const out = await tools.get_verdict({ id: 'lab/beaten' })
  assert.equal(out.status, 'dominated')
  assert.equal(out.by, 'lab/thrift')
  assert.equal(out.dq, 100)
  assert.equal(out.savingPct, 80)
  assert.equal(out.lens, 'lmarena')
  assert.equal(out.workload, 'balanced')
  assert.equal(out.verifiedAt, '2026-08-26')
  assert.equal(out.asOf, '2026-08-26')
  assert.equal(out.provenanceUrl, `${ORIGIN}/data/dominance/lab__beaten.json`)
  const text = JSON.stringify(out)
  assert.doesNotMatch(text, /costs /)
  assert.doesNotMatch(text, /cheaper/)
  assert.doesNotMatch(text, /scores \+/)
  assert.doesNotMatch(text, /39% less/)
})

test('tools/call surfaces unrated as JSON content, not a thrown guess', async () => {
  const reply = await handleMessage(
    {
      jsonrpc: '2.0',
      id: 7,
      method: 'tools/call',
      params: { name: 'get_verdict', arguments: { id: 'lab/unmeasured' } },
    },
    { tools },
  )
  assert.equal(reply.result.isError, false)
  assert.deepEqual(JSON.parse(reply.result.content[0].text), {
    error: 'unrated',
    id: 'lab/unmeasured',
  })
})

test('missing id is invalid-params, not an implied model', async () => {
  await assert.rejects(() => callTool('get_verdict', {}, { tools }), /id is required/)
  assert.throws(() => requireId({}), /id is required/)
  assert.throws(() => requireId({ id: '  ' }), /id is required/)
})

test('get_frontier asOf is catalogue updatedAt, not frontier.json and not the clock', async () => {
  const out = await tools.get_frontier()
  assert.equal(out.asOf, '2026-08-31')
  assert.notEqual(out.asOf, FRONTIER.asOf)
  assert.equal(out.provenanceUrl, `${ORIGIN}/frontier/`)
  assert.deepEqual(
    out.models.map((m) => m.id),
    ['lab/apex', 'lab/thrift'],
  )
  assert.equal(out.models[0].name, 'Apex')
  assert.equal(out.models[1].name, 'Thrift')
  const text = JSON.stringify(out)
  assert.doesNotMatch(text, /"score"/)
  assert.doesNotMatch(text, /"price"/)
  assert.doesNotMatch(text, /1500/)
  assert.doesNotMatch(text, /"q":/)
})
