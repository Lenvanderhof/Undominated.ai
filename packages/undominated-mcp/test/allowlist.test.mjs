import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  AA_FIELD_NAMES,
  findAaFields,
  projectLmarena,
  projectModel,
  projectPrices,
} from '../src/quote.mjs'
import { TOOLS, createTools } from '../src/tools.mjs'
import { handleMessage, INSTRUCTIONS } from '../src/server.mjs'

const dir = dirname(fileURLToPath(import.meta.url))
const AA_MODEL = JSON.parse(readFileSync(resolve(dir, 'fixtures', 'model-with-aa.json'), 'utf8'))
const ORIGIN = 'https://undominated.ai'

test('the AA fixture actually carries the fields the allowlist must strip', () => {
  assert.equal(AA_MODEL.benchmarks.intelligence, 62.1)
  assert.equal(AA_MODEL.benchmarks.coding, 76.5)
  assert.equal(AA_MODEL.benchmarks.agentic, 56.6)
  assert.ok(Array.isArray(AA_MODEL.benchmarks.designArena))
  assert.equal(AA_MODEL.pricing.blendedPerMillion, 1.5)
  assert.equal(AA_MODEL.pricing.tiers.length, 3)
})

test('projectModel copies allowlisted fields and drops every AA axis', () => {
  const out = projectModel(AA_MODEL, {
    id: 'lab/aa-bait',
    provenanceUrl: `${ORIGIN}/data/models/lab__aa-bait.json`,
    pageUrl: `${ORIGIN}/models/lab__aa-bait/`,
  })
  assert.equal(out.name, 'AA Bait')
  assert.equal(out.provider, 'Lab')
  assert.equal(out.context, 128000)
  assert.equal(out.openWeights, true)
  assert.equal(out.prices.input, 1)
  assert.equal(out.prices.output, 2)
  assert.equal(out.prices.tiers.length, 3)
  assert.equal(out.prices.tiers[0].minPromptTokens, 0)
  assert.equal(out.prices.tiers[1].minPromptTokens, 32000)
  assert.equal(out.prices.tiers[2].minPromptTokens, 256000)
  assert.equal(out.lmarena.score, 1490.2)
  assert.equal(out.lmarena.effort, 'high')
  assert.equal(out.lmarena.licence, 'cc-by-4.0')
  assert.match(out.lmarena.source, /leaderboard-dataset/)
  assert.equal(out.provenance.fetchedAt, '2026-08-31')
  assert.equal(out.provenance.url, `${ORIGIN}/data/models/lab__aa-bait.json`)

  assert.equal(out.prices.blendedPerMillion, undefined)
  assert.equal(out.prices.longContextPenalty, undefined)
  assert.equal(out.prices.tierThreshold, undefined)
  assert.equal(out.prices.notes, undefined)
  assert.equal(out.intelligence, undefined)
  assert.equal(out.lmarena.intelligence, undefined)
  assert.equal(out.provenance.confidence, undefined)
  assert.equal(out.provenance.benchmarkCoverage, undefined)

  const hits = findAaFields(out)
  assert.deepEqual(hits, [], `AA keys leaked at ${hits.join(', ')}`)

  const text = JSON.stringify(out)
  for (const key of AA_FIELD_NAMES) {
    assert.doesNotMatch(text, new RegExp(`"${key}"`))
  }
  assert.doesNotMatch(text, /62\.1/)
  assert.doesNotMatch(text, /76\.5/)
  assert.doesNotMatch(text, /56\.6/)
  assert.doesNotMatch(text, /artificial_analysis/)
  assert.doesNotMatch(text, /designArena/)
  assert.doesNotMatch(text, /blendedPerMillion/)
  assert.doesNotMatch(text, /longContextPenalty/)
  assert.doesNotMatch(text, /costs 39% less/)
  assert.doesNotMatch(text, /"q":/)
})

test('get_model through the live fetch path still strips the AA fixture', async () => {
  const fetchImpl = async (url) => {
    assert.equal(url, `${ORIGIN}/data/models/lab__aa-bait.json`)
    return { ok: true, status: 200, json: async () => structuredClone(AA_MODEL) }
  }
  const tools = createTools({ fetch: fetchImpl, origin: ORIGIN })
  const out = await tools.get_model({ id: 'lab/aa-bait' })
  assert.equal(out.lmarena.score, 1490.2)
  assert.deepEqual(findAaFields(out), [])
  const text = JSON.stringify(out)
  assert.doesNotMatch(text, /62\.1/)
  assert.doesNotMatch(text, /intelligence/)
  assert.doesNotMatch(text, /"coding"/)
  assert.doesNotMatch(text, /agentic/)
})

test('lmarena is omitted when absent — unrated is not a score of zero', () => {
  const out = projectLmarena({
    benchmarks: { intelligence: 62.1, coding: 10, agentic: 1, lmarena: null },
  })
  assert.equal(out, undefined)
  const model = projectModel({
    slug: 'lab/unmeasured',
    name: 'Unmeasured',
    provider: 'Lab',
    benchmarks: { intelligence: 62.1, lmarena: null },
    pricing: { input: 2, output: 2, hasPricing: true },
  })
  assert.equal(model.lmarena, undefined)
  assert.doesNotMatch(JSON.stringify(model), /62\.1/)
})

test('openWeights unknown is omitted, never coerced to false', () => {
  const out = projectModel({ slug: 'lab/x', name: 'X', provider: 'Lab', openWeights: null })
  assert.equal(Object.hasOwn(out, 'openWeights'), false)
})

test('projectPrices keeps every tier rung and drops derived blends', () => {
  const prices = projectPrices(AA_MODEL.pricing)
  assert.equal(prices.tiers.length, 3)
  assert.equal(prices.blendedPerMillion, undefined)
  assert.equal(prices.longContextPenalty, undefined)
  assert.equal(prices.tierThreshold, undefined)
})

test('tools/list names quote and read-only resource tools with no router/gateway tool', () => {
  assert.deepEqual(
    TOOLS.map((t) => t.name),
    ['search_resources', 'get_resource', 'get_verdict', 'get_model', 'get_frontier'],
  )
  assert.equal(
    TOOLS.some((t) => /route|gateway|recommend|pick_provider/i.test(t.name)),
    false,
  )
  assert.match(JSON.stringify(TOOLS), /Unrated or unpriced returns/)
  assert.match(INSTRUCTIONS, /Artificial Analysis scores are never returned/)
  assert.match(INSTRUCTIONS, /does not route traffic/)
})

test('tools/call get_model returns JSON with the allowlist applied', async () => {
  const tools = createTools({
    origin: ORIGIN,
    fetch: async () => ({ ok: true, status: 200, json: async () => structuredClone(AA_MODEL) }),
  })
  const reply = await handleMessage(
    {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: { name: 'get_model', arguments: { id: 'lab/aa-bait' } },
    },
    { tools },
  )
  const payload = JSON.parse(reply.result.content[0].text)
  assert.equal(payload.name, 'AA Bait')
  assert.deepEqual(findAaFields(payload), [])
  assert.doesNotMatch(reply.result.content[0].text, /62\.1/)
})

test('the package is dependency-free and the bin is a node script', () => {
  const root = resolve(dir, '..')
  const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
  assert.equal(pkg.name, 'undominated-mcp')
  assert.deepEqual(pkg.dependencies, {})
  assert.equal(pkg.license, 'MIT')
  const bin = readFileSync(resolve(root, pkg.bin['undominated-mcp']), 'utf8')
  assert.match(bin, /^#!\/usr\/bin\/env node/)
  assert.match(readFileSync(resolve(root, 'README.md'), 'utf8'), /refuses rather than approximates/i)
  assert.match(readFileSync(resolve(root, 'LICENSE'), 'utf8'), /Artificial Analysis/)
})

test('initialize advertises tools only — no resources, no sampling', async () => {
  const reply = await handleMessage({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'test', version: '0' } },
  })
  assert.equal(reply.result.protocolVersion, '2025-03-26')
  assert.deepEqual(reply.result.capabilities, { tools: { listChanged: false } })
  assert.equal(reply.result.serverInfo.name, 'undominated-mcp')
  assert.match(reply.result.instructions, /refused|never returned|not zero/i)
})
