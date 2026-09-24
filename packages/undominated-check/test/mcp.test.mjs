/**
 * `undominated-check --mcp`: protocol behaviour, tool results, and one real
 * stdio round trip through the published binary.
 *
 *   node --test 'packages/undominated-check/test/*.test.mjs'
 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { createInterface } from 'node:readline'
import { fileURLToPath } from 'node:url'

import { PROTOCOL_VERSIONS, TOOLS, createHandler } from '../src/mcp.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const DATA = join(HERE, 'fixtures', 'data')
const BIN = join(HERE, '..', 'bin', 'undominated-check.mjs')
const PKG = JSON.parse(readFileSync(join(HERE, '..', 'package.json'), 'utf8'))

const handler = (deps = {}) => createHandler({ local: DATA, version: PKG.version, ...deps })
const call = (name, args, deps) =>
  handler(deps)({ jsonrpc: '2.0', id: 7, method: 'tools/call', params: { name, arguments: args } })

describe('lifecycle', () => {
  test('initialize echoes a supported protocol version and declares tools only', async () => {
    const r = await handler()({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18' } })
    assert.equal(r.id, 1)
    assert.equal(r.result.protocolVersion, '2025-06-18')
    assert.deepEqual(r.result.capabilities, { tools: { listChanged: false } })
    assert.equal(r.result.serverInfo.name, 'undominated-check')
    assert.equal(r.result.serverInfo.version, PKG.version)
    assert.match(r.result.instructions, /Unrated|unrated/)
  })

  test('an unknown protocol version gets the newest this server speaks', async () => {
    const r = await handler()({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '1999-01-01' } })
    assert.equal(r.result.protocolVersion, PROTOCOL_VERSIONS[0])
  })

  test('notifications get no reply; ping gets an empty result', async () => {
    assert.equal(await handler()({ jsonrpc: '2.0', method: 'notifications/initialized' }), null)
    assert.deepEqual(await handler()({ jsonrpc: '2.0', id: 'p', method: 'ping' }), { jsonrpc: '2.0', id: 'p', result: {} })
  })

  test('unknown method is -32601; unknown tool is -32602', async () => {
    assert.equal((await handler()({ jsonrpc: '2.0', id: 2, method: 'resources/list' })).error.code, -32601)
    assert.equal((await call('rank_everything', {})).error.code, -32602)
  })
})

describe('tools', () => {
  test('both tools are declared read-only with a closed input schema', async () => {
    const r = await handler()({ jsonrpc: '2.0', id: 3, method: 'tools/list' })
    assert.deepEqual(r.result.tools.map((t) => t.name), ['check_model', 'list_frontier'])
    for (const t of TOOLS) {
      assert.equal(t.annotations.readOnlyHint, true)
      assert.equal(t.annotations.destructiveHint, false)
      assert.equal(t.inputSchema.additionalProperties, false)
    }
  })

  test('check_model quotes the verdict with its conditions and URLs', async () => {
    const { result } = await call('check_model', { model: 'acme/fast-1' })
    assert.equal(result.isError, undefined)
    assert.match(result.content[0].text, /dominated — acme\/fast-2 scores \+42\.5 and costs 31% less/)
    assert.match(result.content[0].text, /as of {6}2026-09-23/)
    const s = result.structuredContent
    assert.equal(s.status, 'dominated')
    assert.equal(s.asOf, '2026-09-23')
    assert.equal(s.lens, 'lmarena')
    assert.equal(s.verdictUrl, 'https://undominated.ai/data/dominance/acme__fast-1.json')
    assert.equal(s.beatenByUrl, 'https://undominated.ai/models/acme__fast-2/')
  })

  test('unrated is returned as unrated, not as an error and not as a score', async () => {
    const { result } = await call('check_model', { model: 'acme/quiet-1' })
    assert.equal(result.isError, undefined)
    assert.equal(result.structuredContent.status, 'unrated')
    assert.match(result.content[0].text, /not a low score/)
  })

  test('an unpublished model is a tool error that says it cannot confirm', async () => {
    const { result } = await call('check_model', { model: 'acme/ghost-9' })
    assert.equal(result.isError, true)
    assert.match(result.content[0].text, /not a good verdict/)
    assert.match(result.content[0].text, /Cannot confirm/)
  })

  test('bad arguments come back as a tool error the model can correct', async () => {
    for (const args of [{}, { model: '' }, { model: 'no-slash' }, { model: 42 }]) {
      const { result } = await call('check_model', args)
      assert.equal(result.isError, true, JSON.stringify(args))
    }
  })

  test('a fetch failure never becomes a verdict', async () => {
    const { result } = await call('check_model', { model: 'acme/fast-1' }, {
      local: null,
      fetch: async () => {
        throw new Error('offline')
      },
    })
    assert.equal(result.isError, true)
    assert.match(result.content[0].text, /Cannot confirm: could not fetch/)
  })

  test('list_frontier returns members with URLs', async () => {
    const { result } = await call('list_frontier', {})
    const s = result.structuredContent
    assert.equal(s.asOf, '2026-09-23')
    assert.deepEqual(s.members.map((m) => m.slug), ['acme/fast-2', 'acme/big-3'])
    assert.equal(s.members[0].modelUrl, 'https://undominated.ai/models/acme__fast-2/')
    assert.match(result.content[0].text, /2 models on the frontier/)
  })
})

describe('stdio', () => {
  test('the binary speaks newline-delimited JSON-RPC and exits when stdin closes', async () => {
    const child = spawn(process.execPath, [BIN, '--mcp', '--local', DATA], { stdio: ['pipe', 'pipe', 'pipe'] })
    const replies = new Map()
    const lines = createInterface({ input: child.stdout })
    const done = new Promise((resolve) => {
      lines.on('line', (line) => {
        const msg = JSON.parse(line)
        replies.set(msg.id, msg)
        if (replies.size === 4) child.stdin.end()
      })
      child.on('exit', resolve)
    })
    const send = (m) => child.stdin.write(`${JSON.stringify(m)}\n`)
    send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 't', version: '0' } } })
    send({ jsonrpc: '2.0', method: 'notifications/initialized' })
    send({ jsonrpc: '2.0', id: 2, method: 'tools/list' })
    send({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'check_model', arguments: { model: 'acme/fast-2' } } })
    child.stdin.write('not json\n')

    const code = await done
    assert.equal(code, 0)
    assert.equal(replies.get(1).result.protocolVersion, '2025-11-25')
    assert.equal(replies.get(2).result.tools.length, 2)
    assert.equal(replies.get(3).result.structuredContent.status, 'frontier')
    assert.equal(replies.get(null).error.code, -32700)
  })
})
