/**
 * JSON-RPC 2.0 over stdio, newline-delimited, zero dependencies.
 *
 * The official SDK would pull a tree into an npx one-liner whose whole job is
 * to quote three public JSON files. MCP stdio is newline-delimited JSON-RPC;
 * we implement that and nothing else. Logs go to stderr. stdout is messages.
 */

import readline from 'node:readline'
import { createTools, callTool, TOOLS, originOf } from './tools.mjs'
import { ORIGIN } from './quote.mjs'

export const PROTOCOL_VERSIONS = Object.freeze([
  '2024-11-05',
  '2025-03-26',
  '2025-06-18',
])

export const INSTRUCTIONS =
  'Undominated quotes published measurements from undominated.ai. Unrated is not zero. Unpriced is not free. A model’s price is one seller’s offer, named in priceRow, and that seller is often not the model’s maker; a promoted offer is priced at its standard rate and its promoted price is the deal; a deal-only price and a deal carry their reasons, and precision-not-disclosed is never full precision. Artificial Analysis scores are never returned. This server does not route traffic, pick a provider, or approximate a missing number. Return the JSON as-is; do not paraphrase prices into prose.'

export function initializeResult(params = {}, { version = '0.1.0' } = {}) {
  const requested = params.protocolVersion
  const protocolVersion = PROTOCOL_VERSIONS.includes(requested)
    ? requested
    : PROTOCOL_VERSIONS[1]
  return {
    protocolVersion,
    capabilities: { tools: { listChanged: false } },
    serverInfo: { name: 'undominated-mcp', version },
    instructions: INSTRUCTIONS,
  }
}

function rpcResult(id, result) {
  return { jsonrpc: '2.0', id, result }
}

function rpcError(id, code, message, data) {
  const error = { code, message }
  if (data !== undefined) error.data = data
  return { jsonrpc: '2.0', id, error }
}

function toolContent(payload, isError = false) {
  return {
    content: [{ type: 'text', text: JSON.stringify(payload) }],
    isError,
  }
}

/**
 * One JSON-RPC message in, one reply out (or null for notifications).
 * @param {object} msg
 * @param {{ tools?: ReturnType<typeof createTools>, version?: string }} [ctx]
 */
export async function handleMessage(msg, ctx = {}) {
  if (msg == null || typeof msg !== 'object' || msg.jsonrpc !== '2.0') {
    return rpcError(msg && typeof msg === 'object' ? (msg.id ?? null) : null, -32600, 'invalid request')
  }
  const isNotification = !Object.hasOwn(msg, 'id')
  if (isNotification) return null

  switch (msg.method) {
    case 'initialize':
      return rpcResult(msg.id, initializeResult(msg.params ?? {}, ctx))
    case 'ping':
      return rpcResult(msg.id, {})
    case 'tools/list':
      return rpcResult(msg.id, { tools: TOOLS })
    case 'tools/call': {
      const name = msg.params?.name
      let args = msg.params?.arguments ?? {}
      if (typeof args === 'string') {
        try {
          args = JSON.parse(args)
        } catch {
          return rpcResult(msg.id, toolContent({ error: 'invalid-params', message: 'arguments is not JSON' }, true))
        }
      }
      try {
        const payload = await callTool(name, args, ctx)
        return rpcResult(msg.id, toolContent(payload, false))
      } catch (err) {
        const code = err && typeof err === 'object' ? err.code : undefined
        if (code === 'invalid-params' || code === 'unknown-tool') {
          return rpcResult(
            msg.id,
            toolContent({ error: code, message: err instanceof Error ? err.message : String(err) }, true),
          )
        }
        return rpcResult(
          msg.id,
          toolContent(
            { error: 'unavailable', message: err instanceof Error ? err.message : String(err) },
            true,
          ),
        )
      }
    }
    default:
      return rpcError(msg.id, -32601, `method not found: ${msg.method}`)
  }
}

function writeMessage(obj, stream) {
  stream.write(`${JSON.stringify(obj)}\n`)
}

/**
 * @param {{ stdin?: NodeJS.ReadableStream, stdout?: NodeJS.WritableStream, stderr?: NodeJS.WritableStream, fetch?: typeof fetch, origin?: string, version?: string }} [opts]
 */
export async function runStdio(opts = {}) {
  const stdin = opts.stdin ?? process.stdin
  const stdout = opts.stdout ?? process.stdout
  const stderr = opts.stderr ?? process.stderr
  const origin = opts.origin ?? originOf()
  const tools = opts.tools ?? createTools({ fetch: opts.fetch, origin })
  const ctx = { tools, version: opts.version, origin }

  const rl = readline.createInterface({ input: stdin, crlfDelay: Infinity, terminal: false })
  for await (const line of rl) {
    const trimmed = line.trim()
    if (!trimmed) continue
    let msg
    try {
      msg = JSON.parse(trimmed)
    } catch {
      writeMessage(rpcError(null, -32700, 'parse error'), stdout)
      continue
    }
    try {
      const reply = await handleMessage(msg, ctx)
      if (reply) writeMessage(reply, stdout)
    } catch (err) {
      stderr.write(`${err instanceof Error ? err.stack ?? err.message : String(err)}\n`)
      if (Object.hasOwn(msg, 'id')) {
        writeMessage(
          rpcResult(
            msg.id,
            toolContent({ error: 'unavailable', message: err instanceof Error ? err.message : String(err) }, true),
          ),
          stdout,
        )
      }
    }
  }
}

export { ORIGIN, createTools, TOOLS }
