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
  projectPriceBasis,
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

// Gemma 4 26B A4B on 2026-09-30 (data/models.json): Google's model, priced at
// DekaLLM's bf16 row. Darkbloom's cheaper row declares no precision, so since
// R121 it is the deal and not the price.
const RESOLD = {
  slug: 'google/gemma-4-26b-a4b-it',
  name: 'Gemma 4 26B A4B',
  provider: 'Google',
  pricing: { input: 0.06, output: 0.33, cachedInput: null, hasPricing: true },
  priceBasis: 'reference',
  priceRow: {
    provider: 'DekaLLM',
    tag: 'dekallm/bf16',
    quantization: 'bf16',
    // The flag a record carried for a day before R121: not passed on.
    precisionNotDisclosed: false,
    reasons: [],
    internalNote: 'not for publication',
  },
  deal: {
    provider: 'Darkbloom',
    tag: 'darkbloom',
    quantization: 'unknown',
    precisionNotDisclosed: true,
    reasons: [{ reason: 'precision-not-disclosed', intelligence: 62.1 }],
    input: 0.042,
    output: 0.22,
    cachedInput: 0.021,
    blendedPerMillion: 0.0865,
  },
  referencePrecision: { label: 'unknown', source: null },
  modelLevelPricing: { input: 0.09, output: 0.3 },
}

test('get_model says whose offer the price is, and never passes it off as the maker’s', () => {
  const out = projectModel(RESOLD)
  assert.equal(out.provider, 'Google')
  assert.equal(out.prices.input, 0.06)
  assert.equal(out.priceBasis, 'reference')
  assert.deepEqual(out.priceRow, { provider: 'DekaLLM', tag: 'dekallm/bf16', quantization: 'bf16' })
  assert.deepEqual(out.deal, {
    provider: 'Darkbloom',
    tag: 'darkbloom',
    quantization: 'unknown',
    input: 0.042,
    output: 0.22,
    cachedInput: 0.021,
    reasons: [{ reason: 'precision-not-disclosed' }],
  })
  // The model-level price is not a second price to quote.
  assert.equal(out.modelLevelPricing, undefined)
  assert.equal(out.referencePrecision, undefined)
  assert.doesNotMatch(JSON.stringify(out), /internalNote|62\.1|blendedPerMillion|precisionNotDisclosed/)
})

test('a deal-only price carries its reasons; an unknown basis and a basis without a price are dropped', () => {
  // GPT-5.2 Codex on 2026-09-30: Azure's is the one serving row, and Azure
  // declares no precision.
  const dealOnly = projectPriceBasis({
    priceBasis: 'deal-only',
    priceRow: {
      provider: 'Azure',
      tag: 'azure',
      quantization: 'unknown',
      reasons: [{ reason: 'precision-not-disclosed' }],
    },
    deal: null,
  })
  assert.equal(dealOnly.priceBasis, 'deal-only')
  assert.deepEqual(dealOnly.priceRow, { provider: 'Azure', tag: 'azure', quantization: 'unknown', reasons: [{ reason: 'precision-not-disclosed' }] })
  assert.equal(Object.hasOwn(dealOnly, 'deal'), false)

  // R124, GPT-5.6 Sol on 2026-09-30: OpenAI's row is at 50% off and sets the
  // price at its standard rate, $4 / $20. The discount travels on the row and
  // the promoted price is the deal.
  const promoted = projectPriceBasis({
    priceBasis: 'reference',
    priceRow: { provider: 'OpenAI', tag: 'openai', quantization: 'unknown', reasons: [], discount: 0.5 },
    deal: { provider: 'OpenAI', tag: 'openai', quantization: 'unknown', reasons: [{ reason: 'promotion', pct: 50 }], input: 2, output: 10, cachedInput: 0.2 },
  })
  assert.deepEqual(promoted.priceRow, { provider: 'OpenAI', tag: 'openai', quantization: 'unknown', discount: 0.5 })
  assert.deepEqual(promoted.deal.reasons, [{ reason: 'promotion', pct: 50 }])
  assert.equal(promoted.deal.input, 2)
  // A discount that is not a fraction between 0 and 1 is not passed on.
  for (const discount of [0, 1, -0.5, 1.5, '0.5', null, Number.NaN]) {
    assert.equal(Object.hasOwn(projectPriceBasis({ priceBasis: 'reference', priceRow: { provider: 'OpenAI', tag: 'openai', discount } }).priceRow, 'discount'), false, String(discount))
  }

  const held = projectPriceBasis({ priceBasis: 'model-level', priceRow: null, deal: null })
  assert.deepEqual(held, { priceBasis: 'model-level' })

  assert.deepEqual(projectPriceBasis({ priceBasis: 'vendor-list' }), {})

  const unpriced = projectModel({ slug: 'lab/x', name: 'X', provider: 'Lab', priceBasis: 'model-level', pricing: { hasPricing: false } })
  assert.equal(unpriced.prices, undefined)
  assert.equal(Object.hasOwn(unpriced, 'priceBasis'), false)
})

test('a held price says so: model-level alone would read as today’s listing', () => {
  // GPT-5.6 Sol Pro as it was until 2026-10-06: kept at the published record
  // of 2026-09-23. That hold is retired (R122); a held price has this shape.
  const out = projectModel({
    slug: 'openai/gpt-5.6-sol-pro',
    name: 'GPT-5.6 Sol Pro',
    provider: 'OpenAI',
    pricing: { input: 2, output: 10, hasPricing: true },
    priceBasis: 'model-level',
    priceRow: null,
    deal: null,
    provenance: {
      source: 'openrouter/models',
      confidence: 'verified',
      held: [{ fields: ['pricing'], record: 'https://undominated.ai/data/publications/inputs/7bd7.json', recordDate: '2026-09-23', reviewer: 'internal' }],
    },
  })
  assert.equal(out.priceBasis, 'model-level')
  assert.equal(Object.hasOwn(out, 'priceRow'), false)
  assert.deepEqual(out.provenance.held, [
    { fields: ['pricing'], record: 'https://undominated.ai/data/publications/inputs/7bd7.json', recordDate: '2026-09-23' },
  ])
  assert.equal(out.provenance.confidence, undefined)
  assert.equal(projectModel({ slug: 'lab/x', provenance: { source: 's' } }).provenance.held, undefined)
})

test('no tool, instruction or README line calls the price the vendor’s own', () => {
  const root = resolve(dir, '..')
  const getModel = TOOLS.find((t) => t.name === 'get_model').description
  assert.match(getModel, /priceRow\.provider/)
  assert.match(getModel, /precision-not-disclosed/)
  assert.doesNotMatch(JSON.stringify(TOOLS) + INSTRUCTIONS, /precisionNotDisclosed/)
  assert.match(INSTRUCTIONS, /often not the model’s maker/)
  for (const text of [JSON.stringify(TOOLS), INSTRUCTIONS, readFileSync(resolve(root, 'README.md'), 'utf8'), readFileSync(resolve(root, 'LICENSE'), 'utf8')]) {
    assert.doesNotMatch(text, /vendor-published prices|vendor list prices/i)
  }
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
