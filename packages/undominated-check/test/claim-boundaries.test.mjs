import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { installResource, loadResources } from '../src/resources.mjs'

async function run(t, slug, change) {
  const project = await mkdtemp(join(tmpdir(), 'undominated-claim-boundary-'))
  t.after(() => rm(project, { recursive: true, force: true }))
  const { destination } = await installResource(`undominated-${slug}`, { project })
  const data = JSON.parse(await readFile(join(destination, 'examples/synthetic.json'), 'utf8'))
  change(data)
  const input = join(project, 'case.json')
  await writeFile(input, JSON.stringify(data))
  const result = spawnSync('python3', [join(destination, 'scripts/check.py'), input], { encoding: 'utf8' })
  assert.ifError(result.error)
  return { code: result.status, data: JSON.parse(result.stdout) }
}
const reverse = data => { data.claim = 'candidate-dominated'; data.candidate.score = 70; data.candidate.cost = '2.00' }

test('reverse dominance preserves requirements in the proposed baseline replacement', async t => {
  for (const change of [d => { d.candidate.capabilities.contextTokens = 256000 }, d => { d.baseline.capabilities.imageInput = false }]) {
    const result = await run(t, 'dominance-wording', d => { reverse(d); change(d) })
    assert.equal(result.code, 1)
    assert.equal(result.data.verdict, 'capability-loss')
    assert.deepEqual(result.data.capabilityCheck, { from: 'synthetic/candidate', to: 'synthetic/base' })
  }
  const unknown = await run(t, 'dominance-wording', d => { reverse(d); delete d.baseline.capabilities.contextTokens })
  assert.equal(unknown.code, 1)
  assert.equal(unknown.data.verdict, 'incomparable')
  assert.equal((await run(t, 'dominance-wording', reverse)).code, 0)
  assert.equal((await run(t, 'dominance-wording', d => { reverse(d); d.candidate.capabilities.contextTokens = 64000 })).code, 0)
})

test('forward dominance rejects dropped requirements and accepts preserved strict gains', async t => {
  const gain = d => { d.claim = 'both-better-and-cheaper'; d.candidate.score = 90 }
  assert.equal((await run(t, 'dominance-wording', gain)).code, 0)
  const lost = await run(t, 'dominance-wording', d => { gain(d); d.candidate.capabilities.imageInput = false })
  assert.equal(lost.code, 1)
  assert.deepEqual(lost.data.capabilityCheck, { from: 'synthetic/base', to: 'synthetic/candidate' })
})

const denial = d => Object.assign(d, {
  claim: 'internal-use-only', redistributionEvidence: 'explicit-denial', licenceName: 'Synthetic restrictive terms',
  licenceUrl: 'https://example.org/licence', evidenceQuote: 'Redistribution is prohibited.',
})

test('redistribution denial never invents an internal-use grant', async t => {
  const absent = await run(t, 'licence-boundary', denial)
  assert.equal(absent.code, 1)
  assert.equal(absent.data.internalUseEvidence, 'not-stated')
  const denied = await run(t, 'licence-boundary', d => { denial(d); d.internalUseEvidence = 'explicit-denial'; d.internalUseQuote = 'Internal use is prohibited.' })
  assert.equal(denied.code, 1)
  assert.equal((await run(t, 'licence-boundary', d => { denial(d); d.claim = 'not-redistributable' })).code, 0)
  const grant = await run(t, 'licence-boundary', d => { denial(d); d.internalUseEvidence = 'explicit-grant'; d.internalUseQuote = 'Internal evaluation is permitted.' })
  assert.equal(grant.code, 0)
  assert.equal(grant.data.internalUseEvidence, 'explicit-grant')
  assert.equal((await run(t, 'licence-boundary', d => { denial(d); d.internalUseEvidence = 'explicit-grant' })).code, 2)
})

test('only explicit null means an unbounded final context cap', async t => {
  const missing = await run(t, 'context-tier', d => { delete d.rungs.at(-1).maxInputTokens })
  assert.equal(missing.code, 2)
  assert.match(missing.data.error, /explicitly state maxInputTokens/)
  assert.equal((await run(t, 'context-tier', () => {})).code, 0)
  assert.equal((await run(t, 'context-tier', d => { d.rungs.at(-1).maxInputTokens = 999999 })).code, 2)
})

test('plan ceilings retain every supplied decimal digit before equality', async t => {
  const amount = '1.0000000000000000000000000001'
  const truncated = await run(t, 'plan-quote', d => { d.plans[0].amount = amount; d.monthlyCeilingUsd = '1' })
  assert.equal(truncated.code, 1)
  assert.equal(truncated.data.recomputedUsd, amount)
  assert.equal((await run(t, 'plan-quote', d => { d.plans[0].amount = amount; d.monthlyCeilingUsd = amount })).code, 0)
  const carry = await run(t, 'plan-quote', d => {
    d.plans[0].amount = '9999999999999999999999999999.99'
    d.plans.push({ ...d.plans[0], id: 'second', amount: '0.01' }); d.includedPlanIds.push('second')
    d.monthlyCeilingUsd = '10000000000000000000000000000.00'
  })
  assert.equal(carry.code, 0)
  assert.equal(carry.data.recomputedUsd, '10000000000000000000000000000.00')
})

test('rounded repeating ratios never establish exact equality', async t => {
  const rounded = '1.333333333333333333333333333'
  const tier = await run(t, 'context-tier', d => {
    d.rungs[0].inputPerMillion = '3'; d.rungs[1].inputPerMillion = '4'; d.claim.multiple = rounded
  })
  assert.equal(tier.code, 1)
  const spread = await run(t, 'seller-spread', d => {
    d.rows[0].inputPerMillion = '3'; d.rows[1].inputPerMillion = '4'; d.claimedMultiple = rounded
  })
  assert.equal(spread.code, 1)
})

// This labels local fixture coverage; publication availability is a separate receipt.
test('all bundled statuses describe validation without claiming publication', async () => {
  const resources = await loadResources()
  assert.equal(resources.length, 18)
  assert.ok(resources.every(resource => resource.status === 'fixture-tested'))
})
