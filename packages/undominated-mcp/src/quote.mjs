/**
 * Allowlisted projections over published Undominated.ai JSON.
 *
 * This module does not recompute dominance, blend a price, or fill a missing
 * score. It copies the fields a tool is allowed to emit. A denylist of
 * `intelligence`/`coding`/`agentic` would still ship the next AA-derived key
 * nobody remembered to write down; the fence is the allowlist.
 *
 * fileSlug and the status vocabulary are copied from the site rather than
 * imported. A published package cannot reach outside this directory, which is
 * the same constraint undominated-check documents in src/verdict.mjs.
 */

export const ORIGIN = 'https://undominated.ai'

export const fileSlug = (slug) => String(slug).replace(/[/:]/g, '__')

export const verdictUrl = (slug, origin = ORIGIN) =>
  `${origin}/data/dominance/${fileSlug(slug)}.json`

export const modelUrl = (slug, origin = ORIGIN) =>
  `${origin}/data/models/${fileSlug(slug)}.json`

export const frontierDataUrl = (origin = ORIGIN) => `${origin}/data/frontier.json`

export const catalogueUrl = (origin = ORIGIN) => `${origin}/data/catalogue.json`

export const frontierPageUrl = (origin = ORIGIN) => `${origin}/frontier/`

export const modelPageUrl = (slug, origin = ORIGIN) =>
  `${origin}/models/${fileSlug(slug)}/`

/** Statuses the live dominance documents emit. Anything else is an error, not a guess. */
export const QUOTED_STATUS = Object.freeze(['frontier', 'dominated', 'dominated-with-tradeoff'])
export const REFUSED_STATUS = Object.freeze(['unrated', 'unpriced'])

/**
 * Keys that must never appear in tool output, even if a live document still
 * carries them. Named so the test can assert the fence without scraping prose.
 * Not consulted by the projection — the projection only copies the allowlist.
 */
export const AA_FIELD_NAMES = Object.freeze(['intelligence', 'coding', 'agentic', 'designArena'])

const VERDICT_FIELDS = Object.freeze([
  'v',
  'slug',
  'lens',
  'workload',
  'asOf',
  'methodologySha',
  'licence',
  'status',
  'by',
  'dq',
  'savingPct',
  'losses',
])

const PRICE_SCALARS = Object.freeze([
  'currency',
  'unit',
  'input',
  'output',
  'cachedInput',
  'cacheWrite',
  'cacheWrite1h',
  'reasoning',
  'perWebSearch',
  'perImageInput',
  'perImageOutput',
  'perAudioInput',
  'perAudioOutput',
  'perAudioCached',
  'isFree',
  'hasPricing',
  'pricingKind',
  'hasTieredContext',
  'batchDiscountPct',
])

const TIER_FIELDS = Object.freeze([
  'minPromptTokens',
  'input',
  'output',
  'cachedInput',
  'cacheWrite',
])

const WINDOW_FIELDS = Object.freeze(['from', 'to', 'days', 'input', 'output', 'cachedInput', 'cacheWrite'])

const PROVENANCE_FIELDS = Object.freeze([
  'source',
  'sourceUrl',
  'fetchedAt',
  'enrichedBy',
  'arenaSource',
  'arenaLicence',
])

const finite = (n) => typeof n === 'number' && Number.isFinite(n)
const nonempty = (s) => typeof s === 'string' && s.length > 0

/**
 * Unrated and unpriced are findings with no comparison, not low scores.
 * The returned object is exactly `{ error, id }` so a zero in `dq` or
 * `savingPct` cannot be read as a measurement.
 */
export function refuseStatus(status, id) {
  return { error: status, id }
}

export function quoteVerdict(doc, { id, provenanceUrl } = {}) {
  const slug = nonempty(id) ? id : nonempty(doc?.slug) ? doc.slug : ''
  if (!doc || typeof doc !== 'object') return { error: 'unpublished', id: slug }
  const status = String(doc.status ?? '')
  if (REFUSED_STATUS.includes(status)) return refuseStatus(status, nonempty(doc.slug) ? doc.slug : slug)
  if (!QUOTED_STATUS.includes(status)) {
    return { error: 'unknown-status', id: nonempty(doc.slug) ? doc.slug : slug }
  }
  const out = {}
  for (const key of VERDICT_FIELDS) {
    if (Object.hasOwn(doc, key)) out[key] = doc[key]
  }
  out.id = nonempty(out.slug) ? out.slug : slug
  out.provenanceUrl = provenanceUrl ?? verdictUrl(out.id)
  // verifiedAt is the snapshot date on the live document, not the wall clock.
  // A fetch timestamp is a number we invented; asOf is a number we can trace.
  out.verifiedAt = nonempty(doc.asOf) ? doc.asOf : undefined
  if (out.verifiedAt === undefined) delete out.verifiedAt
  return out
}

function pick(obj, keys) {
  if (!obj || typeof obj !== 'object') return null
  const out = {}
  for (const key of keys) {
    if (!Object.hasOwn(obj, key)) continue
    const value = obj[key]
    if (value === undefined) continue
    out[key] = value
  }
  return Object.keys(out).length ? out : null
}

function projectRows(rows, keys) {
  if (!Array.isArray(rows) || rows.length === 0) return null
  const out = []
  for (const row of rows) {
    const picked = pick(row, keys)
    if (picked) out.push(picked)
  }
  return out.length ? out : null
}

/**
 * Vendor-published rates only. `blendedPerMillion` and `longContextPenalty` are
 * derived in our pipeline; quoting them here would present a computed number as
 * a list price. `tierThreshold` is the first rung of a ladder — keeping it
 * without the rest of `tiers` is how Qwen3.7 Flash was mispriced. The ladder
 * travels as the array, every rung.
 */
export function projectPrices(pricing) {
  if (!pricing || typeof pricing !== 'object') return undefined
  const out = pick(pricing, PRICE_SCALARS) ?? {}
  const tiers = projectRows(pricing.tiers, TIER_FIELDS)
  if (tiers) out.tiers = tiers
  const windows = projectRows(pricing.priceWindows, WINDOW_FIELDS)
  if (windows) out.priceWindows = windows
  const hasRate =
    finite(out.input) ||
    finite(out.output) ||
    out.isFree === true ||
    out.hasPricing === true ||
    (out.tiers && out.tiers.length > 0)
  return hasRate && Object.keys(out).length ? out : undefined
}

export function projectLmarena(model) {
  const b = model?.benchmarks
  if (!b || typeof b !== 'object') return undefined
  const out = {}
  if (finite(b.lmarena)) out.score = b.lmarena
  if (nonempty(b.lmarenaEffort)) out.effort = b.lmarenaEffort
  if (b.lmarenaCi && typeof b.lmarenaCi === 'object') {
    const ci = {}
    if (finite(b.lmarenaCi.lower)) ci.lower = b.lmarenaCi.lower
    if (finite(b.lmarenaCi.upper)) ci.upper = b.lmarenaCi.upper
    if (finite(b.lmarenaCi.halfWidth)) ci.halfWidth = b.lmarenaCi.halfWidth
    if (Object.keys(ci).length) out.ci = ci
  }
  if (finite(b.lmarenaVotes)) out.votes = b.lmarenaVotes
  if (finite(b.lmarenaRankUB)) out.rankUB = b.lmarenaRankUB
  if (finite(b.lmarenaDocument)) out.document = b.lmarenaDocument
  const licence = model?.provenance?.arenaLicence
  const source = model?.provenance?.arenaSource
  if (nonempty(licence)) out.licence = licence
  if (nonempty(source)) out.source = source
  // A block with only licence/source and no score would look like a rating.
  if (!finite(out.score) && !finite(out.document)) return undefined
  return out
}

export function projectProvenance(model, { provenanceUrl, pageUrl } = {}) {
  const picked = pick(model?.provenance, PROVENANCE_FIELDS) ?? {}
  if (provenanceUrl) picked.url = provenanceUrl
  if (pageUrl) picked.page = pageUrl
  return Object.keys(picked).length ? picked : undefined
}

/**
 * Allowlisted model projection. Unknown keys on the input, including every
 * Artificial Analysis axis, are dropped by construction.
 */
export function projectModel(model, { id, provenanceUrl, pageUrl } = {}) {
  const slug = nonempty(model?.slug) ? model.slug : nonempty(id) ? id : ''
  if (!model || typeof model !== 'object') return { error: 'unpublished', id: slug }
  const out = { id: slug }
  if (nonempty(model.name)) out.name = model.name
  if (nonempty(model.provider)) out.provider = model.provider
  const prices = projectPrices(model.pricing)
  if (prices) out.prices = prices
  if (finite(model.contextWindow)) out.context = model.contextWindow
  if (model.openWeights === true || model.openWeights === false) out.openWeights = model.openWeights
  const lmarena = projectLmarena(model)
  if (lmarena) out.lmarena = lmarena
  const provenance = projectProvenance(model, { provenanceUrl, pageUrl })
  if (provenance) out.provenance = provenance
  return out
}

/**
 * Frontier listing: ids and names only. Member `score`/`price` on frontier.json
 * are an Elo and a workload-blended rate; repeating them here would invite an
 * agent to paraphrase them into a recommendation, which this server is not.
 *
 * `asOf` is catalogue `stats.updatedAt`, not frontier.json's own asOf and not
 * the clock. The task names that field so the two documents cannot silently
 * disagree in our output.
 */
export function projectFrontier(frontier, catalogue, { provenanceUrl } = {}) {
  const updatedAt = catalogue?.stats?.updatedAt
  if (!nonempty(updatedAt)) return { error: 'unavailable', id: 'frontier' }
  const names = new Map()
  if (Array.isArray(catalogue?.rows)) {
    for (const row of catalogue.rows) {
      if (nonempty(row?.s) && nonempty(row?.n)) names.set(row.s, row.n)
    }
  }
  const members = Array.isArray(frontier?.members) ? frontier.members : []
  const models = members.map((m) => {
    const id = nonempty(m?.slug) ? m.slug : nonempty(m?.id) ? m.id : ''
    const item = { id }
    const name = names.get(id)
    if (nonempty(name)) item.name = name
    return item
  }).filter((m) => nonempty(m.id))
  return {
    models,
    provenanceUrl: provenanceUrl ?? frontierPageUrl(),
    asOf: updatedAt,
  }
}

/** Walk a value and report any AA-derived key. Used by tests and as a last check. */
export function findAaFields(value, path = '') {
  const hits = []
  if (Array.isArray(value)) {
    value.forEach((item, i) => hits.push(...findAaFields(item, `${path}[${i}]`)))
    return hits
  }
  if (!value || typeof value !== 'object') return hits
  for (const [key, child] of Object.entries(value)) {
    const here = path ? `${path}.${key}` : key
    if (AA_FIELD_NAMES.includes(key)) hits.push(here)
    hits.push(...findAaFields(child, here))
  }
  return hits
}
