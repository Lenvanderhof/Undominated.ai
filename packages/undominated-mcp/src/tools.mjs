/**
 * MCP tool dispatch. Fetches the published JSON; never computes a second
 * frontier. A second implementation would eventually give a second answer.
 */

import {
  ORIGIN,
  catalogueUrl,
  frontierDataUrl,
  frontierPageUrl,
  modelPageUrl,
  modelUrl,
  projectFrontier,
  projectModel,
  quoteVerdict,
  verdictUrl,
} from './quote.mjs'
import { RESOURCE_TOOLS, createResourceTools } from './resources.mjs'

class Missing extends Error {
  constructor(message) {
    super(message)
    this.name = 'Missing'
  }
}

export const TOOLS = Object.freeze([
  ...RESOURCE_TOOLS,
  {
    name: 'get_verdict',
    description:
      'Quote the published dominance verdict for a model slug. JSON out: status, by, dq, savingPct, losses, lens, workload, asOf, licence, provenanceUrl, verifiedAt. Unrated or unpriced returns {error, id} — not a guess, not zero. Does not compute; reads the live document. Do not paraphrase prices into prose.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Model slug, e.g. google/gemini-3.7-flash',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'get_model',
    description:
      'Quote allowlisted fields for a model slug: name, provider (the model’s maker), prices, priceBasis, priceRow, deal, context, openWeights, lmarena if present, provenance. prices is the published reference price: the rate card of one seller’s offer, named in priceRow.provider, which is often a reseller and not the maker. Where priceRow.discount is present that offer is on promotion and prices is its standard rate, each rate divided by (1 − discount); what it charges today is the deal. priceBasis is reference, deal-only (no offer passed the like-for-like test and the price is a fallback; priceRow.reasons says why) or model-level. deal is a cheaper offer right now that does not pass that test, or the price row’s own promoted price, with its reasons; it is not the price. The reason precision-not-disclosed means a reseller declares no serving precision: never read it as full precision. Such an offer is excluded from reference pricing unless the model is explicitly closed-weight; an absent open-weight declaration is not evidence of closed weights. provenance.held naming pricing means the price is kept at an earlier published record while a newer upstream value is reviewed. Artificial Analysis intelligence/coding/agentic fields are stripped. Missing scores are omitted, never zero. Not a router.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Model slug, e.g. google/gemini-3.7-flash',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'get_frontier',
    description:
      'List models nothing on the catalogue beats on both LMArena Elo and price. JSON out: ids, names, provenanceUrl https://undominated.ai/frontier/, asOf from the live catalogue updatedAt. Not a routing table and not a recommendation.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
])

export function originOf(env = process.env) {
  const raw = env?.UNDOMINATED_ORIGIN
  return nonempty(raw) ? String(raw).replace(/\/+$/, '') : ORIGIN
}

const nonempty = (s) => typeof s === 'string' && s.length > 0

export function requireId(args) {
  const id = args?.id
  if (typeof id !== 'string' || !id.trim()) {
    const err = new Error('id is required (model slug, e.g. google/gemini-3.7-flash)')
    err.code = 'invalid-params'
    throw err
  }
  return id.trim()
}

async function loadJson(url, fetchImpl) {
  const res = await fetchImpl(url, {
    headers: {
      accept: 'application/json',
      'user-agent': 'undominated-mcp/0.1.0 (+https://undominated.ai)',
    },
  })
  if (res.status === 404) throw new Missing(`nothing published at ${url}`)
  if (!res.ok) throw new Error(`${url} returned ${res.status}`)
  return res.json()
}

async function loadOrMissing(url, fetchImpl) {
  try {
    return await loadJson(url, fetchImpl)
  } catch (err) {
    if (err instanceof Missing) return null
    throw err
  }
}

/**
 * @param {{ fetch?: typeof globalThis.fetch, origin?: string }} [deps]
 */
export function createTools(deps = {}) {
  const fetchImpl = deps.fetch ?? globalThis.fetch
  const origin = deps.origin ?? originOf()

  return {
    ...createResourceTools({ fetch: fetchImpl, origin }),
    origin,
    async get_verdict(args) {
      const id = requireId(args)
      const url = verdictUrl(id, origin)
      const doc = await loadOrMissing(url, fetchImpl)
      if (!doc) return { error: 'unpublished', id }
      return quoteVerdict(doc, { id, provenanceUrl: url })
    },
    async get_model(args) {
      const id = requireId(args)
      const url = modelUrl(id, origin)
      const doc = await loadOrMissing(url, fetchImpl)
      if (!doc) return { error: 'unpublished', id }
      return projectModel(doc, {
        id,
        provenanceUrl: url,
        pageUrl: modelPageUrl(id, origin),
      })
    },
    async get_frontier() {
      const [frontier, catalogue] = await Promise.all([
        loadJson(frontierDataUrl(origin), fetchImpl),
        loadJson(catalogueUrl(origin), fetchImpl),
      ])
      return projectFrontier(frontier, catalogue, { provenanceUrl: frontierPageUrl(origin) })
    },
  }
}

export async function callTool(name, args, deps = {}) {
  const tools = deps.tools ?? createTools(deps)
  if (name === 'get_verdict') return tools.get_verdict(args)
  if (name === 'get_model') return tools.get_model(args)
  if (name === 'get_frontier') return tools.get_frontier(args)
  if (name === 'search_resources') return tools.search_resources(args)
  if (name === 'get_resource') return tools.get_resource(args)
  const err = new Error(`unknown tool ${name}`)
  err.code = 'unknown-tool'
  throw err
}
