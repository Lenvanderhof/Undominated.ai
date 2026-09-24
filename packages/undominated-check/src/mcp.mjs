/**
 * `undominated-check --mcp`: the same two read-only lookups, as MCP tools.
 *
 * An agent asked "is the model we pay for still worth it?" should quote the
 * published verdict, not reconstruct one from memory. This exposes exactly what
 * the CLI prints — `check_model` and `list_frontier` — over the Model Context
 * Protocol's stdio transport, so any MCP client can call it with no key.
 *
 * It computes nothing. Like the CLI, it reads the documents undominated.ai
 * already published and hands them back with their lens, workload, as-of date
 * and provenance URL attached. A lookup that fails is returned as a tool error
 * that says "cannot confirm", never as a plausible default.
 *
 * No SDK dependency: the transport is newline-delimited JSON-RPC 2.0, and the
 * four methods a tools-only server must answer fit in this file. The tests run
 * the real binary over stdio; it was also checked against the official
 * TypeScript SDK client (1.30.1) before release.
 */

import { createInterface } from 'node:readline'

import { Missing, load, locate } from './cli.mjs'
import {
  ORIGIN,
  STATUS,
  modelPageUrl,
  parseVerdict,
  renderFrontier,
  renderVerdict,
  verdictUrl,
} from './verdict.mjs'

/** Newest first. A client asking for one of these gets it echoed back. */
export const PROTOCOL_VERSIONS = Object.freeze(['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'])

export const SERVER_NAME = 'undominated-check'

/** Sent once at initialize. The same rules as skills/undominated/SKILL.md. */
export const INSTRUCTIONS = `Quote-only lookups against undominated.ai, which ranks AI models by independently measured quality first and price second.

- Call check_model before claiming a model is or is not good value; call list_frontier for what nothing beats.
- Always quote the status, the as-of date, the lens, the workload and the verdict URL with any claim.
- "unrated" means nobody published an independent score. It is not a low score and not a verdict.
- "dominated, with a trade" names what the cheaper model gives up. It is not a recommendation to switch.
- If a tool returns an error, say you cannot confirm. Never estimate a price, score or rank.`

const READ_ONLY = Object.freeze({
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
})

export const TOOLS = Object.freeze([
  {
    name: 'check_model',
    title: 'Check a model',
    description:
      'Is this model beaten by something both higher-scoring and cheaper? Returns the verdict undominated.ai published for it: ' +
      'status (frontier, dominated, dominated-with-tradeoff, unrated, unpriced), the model that beats it and by how much, ' +
      'what that model gives up, and the lens, workload, as-of date and URLs to cite.',
    inputSchema: {
      type: 'object',
      properties: {
        model: {
          type: 'string',
          description: 'Model id as provider/model, exactly as on undominated.ai, e.g. google/gemini-3.7-flash',
        },
      },
      required: ['model'],
      additionalProperties: false,
    },
    annotations: { title: 'Check a model', ...READ_ONLY },
  },
  {
    name: 'list_frontier',
    title: 'List the value frontier',
    description:
      'Every model that nothing in the catalogue beats on both quality and price, with score and effective $/M, ' +
      'plus the lens, workload and as-of date the list was computed under.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { title: 'List the value frontier', ...READ_ONLY },
  },
])

const text = (t) => [{ type: 'text', text: String(t).trim() }]

const toolError = (message) => ({ content: text(message), isError: true })

const rpcError = (id, code, message) => ({ jsonrpc: '2.0', id, error: { code, message } })

/**
 * @param {{ fetch?: typeof globalThis.fetch, origin?: string, local?: string | null, version?: string }} [deps]
 * @returns {(message: any) => Promise<object | null>} resolves to the response, or null for a notification
 */
export function createHandler(deps = {}) {
  const fetchImpl = deps.fetch ?? globalThis.fetch
  const origin = String(deps.origin ?? ORIGIN).replace(/\/+$/, '')
  const local = deps.local ?? null
  const version = deps.version ?? '0.0.0'

  // load() sends the same user-agent the CLI does.
  const read = (kind, slug) => load(locate(kind, { origin, local, slug }), fetchImpl)

  async function checkModel(args) {
    const model = typeof args?.model === 'string' ? args.model.trim() : ''
    if (!model || !model.includes('/')) {
      return toolError('`model` must be a provider/model id, e.g. google/gemini-3.7-flash.')
    }
    const where = locate('verdict', { origin, local, slug: model })
    let doc
    try {
      doc = await read('verdict', model)
    } catch (err) {
      if (err instanceof Missing) {
        return toolError(
          `No verdict is published for ${model}. That is not a good verdict: the model is absent from the ` +
            `catalogue, retired, or spelled differently. Cannot confirm. Browse ${origin}/models/.`,
        )
      }
      return toolError(`Cannot confirm: ${messageOf(err)}`)
    }
    let v
    try {
      v = parseVerdict(doc)
    } catch (err) {
      return toolError(`Cannot confirm: ${messageOf(err)}`)
    }
    const urls = {
      verdictUrl: verdictUrl(v.slug, origin),
      modelUrl: modelPageUrl(v.slug, origin),
      beatenByUrl: v.by ? modelPageUrl(v.by, origin) : null,
      checkUrl: `${origin}/check/`,
    }
    return {
      content: text(renderVerdict(v, { origin, source: String(where.source) })),
      structuredContent: { ...v, headline: STATUS[v.status].headline, ...urls },
    }
  }

  async function listFrontier() {
    let doc
    try {
      doc = await read('frontier')
    } catch (err) {
      return toolError(`Cannot confirm the frontier: ${messageOf(err)}`)
    }
    const members = Array.isArray(doc?.members) ? doc.members : []
    return {
      content: text(renderFrontier(doc, { origin })),
      structuredContent: {
        lens: String(doc?.lens ?? ''),
        workload: String(doc?.workload ?? ''),
        asOf: String(doc?.asOf ?? ''),
        members: members.map((m) => ({
          slug: String(m.slug),
          score: Number(m.score),
          price: Number(m.price),
          modelUrl: modelPageUrl(m.slug, origin),
        })),
        frontierUrl: `${origin}/frontier/`,
      },
    }
  }

  return async function handle(message) {
    if (!message || typeof message !== 'object' || Array.isArray(message)) {
      return rpcError(null, -32600, 'Invalid Request')
    }
    const { id, method, params } = message
    const isRequest = id !== undefined && id !== null
    // A response to something we never sent, or a notification: nothing to say.
    if (typeof method !== 'string') return isRequest ? rpcError(id, -32600, 'Invalid Request') : null
    if (!isRequest) return null

    switch (method) {
      case 'initialize': {
        const asked = params?.protocolVersion
        return {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: PROTOCOL_VERSIONS.includes(asked) ? asked : PROTOCOL_VERSIONS[0],
            capabilities: { tools: { listChanged: false } },
            serverInfo: { name: SERVER_NAME, title: 'Undominated.ai check', version },
            instructions: INSTRUCTIONS,
          },
        }
      }
      case 'ping':
        return { jsonrpc: '2.0', id, result: {} }
      case 'tools/list':
        return { jsonrpc: '2.0', id, result: { tools: TOOLS } }
      case 'tools/call': {
        const name = params?.name
        const args = params?.arguments ?? {}
        if (name === 'check_model') return { jsonrpc: '2.0', id, result: await checkModel(args) }
        if (name === 'list_frontier') return { jsonrpc: '2.0', id, result: await listFrontier() }
        return rpcError(id, -32602, `Unknown tool: ${String(name)}`)
      }
      default:
        return rpcError(id, -32601, `Method not found: ${method}`)
    }
  }
}

const messageOf = (err) => (err instanceof Error ? err.message : String(err))

/**
 * Serve over stdio until the client closes stdin. stdout carries protocol
 * messages only; anything human goes to stderr.
 *
 * @param {{ input?: NodeJS.ReadableStream, output?: NodeJS.WritableStream, error?: NodeJS.WritableStream } & Parameters<typeof createHandler>[0]} [io]
 */
export async function serveStdio(io = {}) {
  const input = io.input ?? process.stdin
  const output = io.output ?? process.stdout
  const error = io.error ?? process.stderr
  const handle = createHandler(io)
  const send = (msg) => output.write(`${JSON.stringify(msg)}\n`)
  const pending = new Set()

  const lines = createInterface({ input, crlfDelay: Infinity })
  for await (const line of lines) {
    if (!line.trim()) continue
    let message
    try {
      message = JSON.parse(line)
    } catch {
      send(rpcError(null, -32700, 'Parse error'))
      continue
    }
    const batch = Array.isArray(message)
    const task = Promise.all((batch ? message : [message]).map((m) => handle(m)))
      .then((replies) => {
        const out = replies.filter(Boolean)
        if (out.length) send(batch ? out : out[0])
      })
      .catch((err) => error.write(`undominated-check --mcp: ${messageOf(err)}\n`))
      .finally(() => pending.delete(task))
    pending.add(task)
  }
  await Promise.all(pending)
}
