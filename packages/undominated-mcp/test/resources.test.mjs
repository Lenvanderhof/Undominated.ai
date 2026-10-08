import test from 'node:test'
import assert from 'node:assert/strict'
import { createTools } from '../src/tools.mjs'
import { handleMessage } from '../src/server.mjs'

const origin = 'https://fixture.example'
const record = { id: 'audit', name: 'Evidence audit', publisher: 'Fixture', summary: 'Inspect a claim', category: 'Research', tags: ['evidence'], limit: 'Source review only', review: { level: 'source-reviewed', notTested: ['Runtime'], reviewedAt: '2026-10-07' }, sources: [{ url: 'https://fixture.example/source' }], artifact: { path: '/private/path' }, receipt: 'private' }
function fixture() {
  const requests = []
  const tools = createTools({ origin, fetch: async url => {
    requests.push(url)
    if (url.endsWith('/skills.json')) return { ok: true, json: async () => ({ kind: 'skills', reviewedAt: '2026-10-07', records: [record] }) }
    if (url.endsWith('/skills/audit.json')) return { ok: true, json: async () => ({ kind: 'skills', resource: record }) }
    return { status: 404 }
  } })
  return { tools, requests }
}

test('resource discovery preserves review scope and returns only matching bounded results', async () => {
  const { tools, requests } = fixture()
  const out = await tools.search_resources({ kind: 'skills', query: 'evidence claim', limit: 1 })
  assert.equal(out.total, 1)
  assert.equal(out.resources[0].id, 'audit')
  assert.equal(out.resources[0].limitation, 'Source review only')
  assert.match(out.order, /not a quality rank/)
  assert.deepEqual(requests, [`${origin}/data/resources/skills.json`])
  assert.equal((await tools.search_resources({ kind: 'skills', query: 'nonexistent' })).total, 0)
})

test('resource review quotes limitations and excludes acquisition metadata', async () => {
  const { tools } = fixture()
  const out = await tools.get_resource({ kind: 'skills', id: 'audit' })
  assert.deepEqual(out.review.notTested, ['Runtime'])
  assert.doesNotMatch(JSON.stringify(out), /private|receipt|artifact/)
  assert.deepEqual(await tools.get_resource({ kind: 'skills', id: 'absent' }), { error: 'unpublished', kind: 'skills', id: 'absent' })
})

test('invalid resource requests cannot choose hosts or paths and make no requests', async () => {
  const { tools, requests } = fixture()
  for (const id of ['../secrets', 'a/b', 'https://elsewhere.example', '', 'A']) await assert.rejects(tools.get_resource({ kind: 'skills', id }), /slug/)
  for (const kind of ['../../x', 'unknown', undefined]) await assert.rejects(tools.search_resources({ kind }), /kind/)
  for (const limit of [0, 21, 1.5, '2']) await assert.rejects(tools.search_resources({ kind: 'skills', limit }), /limit/)
  await assert.rejects(tools.search_resources({ kind: 'skills', query: 'x'.repeat(181) }), /query/)
  assert.deepEqual(requests, [])
})

test('mismatched resource identity fails and malformed calls are MCP tool errors', async () => {
  const tools = createTools({ origin, fetch: async () => ({ ok: true, json: async () => ({ kind: 'agents', resource: record }) }) })
  await assert.rejects(tools.get_resource({ kind: 'skills', id: 'audit' }), /identity mismatch/)
  const reply = await handleMessage({ jsonrpc: '2.0', id: 7, method: 'tools/call', params: { name: 'search_resources', arguments: { kind: 'bad' } } }, { tools })
  assert.equal(reply.result.isError, true)
  assert.equal(JSON.parse(reply.result.content[0].text).error, 'invalid-params')
})

test('nested acquisition metadata is never quoted as part of a public review', async () => {
  const dirty = structuredClone(record)
  dirty.review.receipt = { path: '/private/review' }
  dirty.sources[0].receipt = { path: '/private/source' }
  dirty.install = { command: 'example', receipt: '/private/install' }
  dirty.license = { name: 'MIT', localFile: '/private/LICENSE' }
  dirty.access = { label: 'read only', acquisitionPath: '/private/access' }
  const tools = createTools({ origin, fetch: async () => ({ ok: true, json: async () => ({ kind: 'skills', resource: dirty }) }) })
  const result = await tools.get_resource({ kind: 'skills', id: 'audit' })
  assert.doesNotMatch(JSON.stringify(result), /private|receipt|localFile|acquisitionPath/)
  assert.equal(result.install.command, 'example')
  assert.deepEqual(result.review.notTested, ['Runtime'])
})
