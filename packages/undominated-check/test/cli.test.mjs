import assert from 'node:assert/strict'
import { mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { main, FETCH_UA } from '../src/cli.mjs'

test('install alias preserves the resources install contract and makes no network request', async t => {
  const project = await mkdtemp(join(tmpdir(), 'undominated-alias-'))
  t.after(() => rm(project, { recursive: true, force: true }))
  const args = ['undominated-evidence-audit', `--project=${project}`, '--target=codex', '--dry-run', '--json']
  const deps = { fetch() { throw new Error('resource command must not fetch') } }
  const alias = await main(['install', ...args], deps)
  const nested = await main(['resources', 'install', ...args], deps)
  assert.equal(alias.code, 0, alias.err)
  assert.deepEqual(alias, nested)
  assert.equal(JSON.parse(alias.out).dryRun, true)
  assert.deepEqual(await readdir(project), [])
  const help = await main(['install', '--help'], deps)
  assert.equal(help.code, 0)
  assert.match(help.out, /--project=PATH/)
  const invalid = await main(['install', 'undominated-evidence-audit', '--project='], deps)
  assert.equal(invalid.code, 1)
  assert.equal(invalid.out, '')
})

test('model command help/version and request identity retain their own contract', async () => {
  assert.equal((await main(['--version'], { version: '0.4.0' })).out, '0.4.0\n')
  assert.match((await main(['--help'])).out, /resources --help/)
  assert.match(FETCH_UA, /^undominated-check\/0\.4\.0 /)
  const urls = []
  const result = await main(['--frontier', '--json'], { fetch: async (url, options) => {
    urls.push({ url, options }); return { ok: true, status: 200, json: async () => ({ synthetic: 'frontier' }) }
  } })
  assert.equal(result.code, 0)
  assert.deepEqual(JSON.parse(result.out), { synthetic: 'frontier' })
  assert.equal(urls.length, 1)
  assert.equal(urls[0].options.headers['user-agent'], FETCH_UA)
})
