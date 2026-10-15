#!/usr/bin/env node
/**
 * Keep every figure in README.md, docs/PLATFORM.md and docs/RESOURCES.md equal to
 * what undominated.ai publishes.
 *
 * WHY THIS EXISTS. On 2026-09-04 the README stated eleven undominated models,
 * "97 of 108" dominated, 409 in the catalogue and 63% unrated. The live figures
 * were 10, 122 of 132, 414 and 68%. Seven wrong numbers on the public face of a
 * project whose one rule is never to publish a figure it cannot trace — stale
 * because a human typed them once and the catalogue moved underneath.
 *
 * A number that is typed will rot. A number that is generated cannot.
 *
 * HOW. Figures live between HTML comment markers:
 *
 *   <!--fig:frontier-->10<!--/fig-->
 *
 * The marker names a key in FIGURES below; each key is read from the site's own
 * published JSON, which is the same file the pages render from. Nothing here
 * computes a statistic — if a figure is not published, this script refuses
 * rather than deriving one, because a second implementation of a published
 * number is a second thing that can drift.
 *
 *   node scripts/refresh-readme.mjs          # rewrite every document below in place
 *   node scripts/refresh-readme.mjs --check  # exit 1 if any figure is stale
 *   node scripts/refresh-readme.mjs --check --origin http://localhost:4173
 *                                            # inspect a staged release
 *
 * `--check` is what CI runs, so a stale README fails a pull request rather than
 * being noticed by a reader.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
// Each document is checked on its own. One without markers is left alone, so the
// figures can live wherever a reader meets them, but the run as a whole refuses
// to pass with none at all.
const DOCUMENTS = [
  ['README.md', 'README'],
  ['docs/PLATFORM.md', 'Platform guide'],
  ['docs/RESOURCES.md', 'Resource library'],
].map(([path, label]) => ({ path: resolve(ROOT, path), name: path, label }))
let ORIGIN = 'https://undominated.ai'
let check = false
let originSeen = false
const argv = process.argv.slice(2)
for (let i = 0; i < argv.length; i += 1) {
  if (argv[i] === '--check') {
    check = true
  } else if (argv[i] === '--origin') {
    if (originSeen) throw new Error('--origin may be specified only once')
    originSeen = true
    const value = argv[++i]
    if (!value || value.startsWith('--')) throw new Error('--origin requires an HTTP(S) origin')
    let url
    try { url = new URL(value) } catch { throw new Error('--origin requires an HTTP(S) origin') }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
        url.pathname !== '/' || url.search || url.hash) {
      throw new Error('--origin must be an HTTP(S) origin without credentials, a path, query or fragment')
    }
    ORIGIN = url.origin
  } else {
    throw new Error(`unknown argument: ${argv[i]}`)
  }
}

async function json(path) {
  const res = await fetch(`${ORIGIN}${path}`, { headers: { accept: 'application/json' } })
  if (!res.ok) throw new Error(`${path} returned ${res.status}`)
  return res.json()
}

const sources = DOCUMENTS.filter((d) => existsSync(d.path)).map((d) => ({ ...d, text: readFileSync(d.path, 'utf8') }))
const MARKER = /<!--fig:([a-zA-Z]+)-->([\s\S]*?)<!--\/fig-->/g
const used = new Set(sources.flatMap((d) => [...d.text.matchAll(MARKER)].map((m) => m[1])))

const [catalogue, frontier] = await Promise.all([
  json('/data/catalogue.json'),
  json('/data/frontier.json'),
])
const s = catalogue.stats ?? {}
// Listing rows include service variants; they cannot supply a model-coverage denominator.
const coverage = catalogue.integrity?.coverage
const ranks = catalogue.integrity?.rankResolution

// The reviewed resource indexes are fetched only when a document states one of
// their figures, so a document about prices never depends on them.
const RESOURCE_KINDS = { skills: 'skills', agents: 'agents', mcpServers: 'mcp-servers', workflows: 'workflows' }
const resourceKeys = [...Object.keys(RESOURCE_KINDS), 'resourcesAsOf']
const resources = resourceKeys.some((k) => used.has(k))
  ? Object.fromEntries(await Promise.all(Object.entries(RESOURCE_KINDS).map(async ([key, kind]) =>
      [key, await json(`/data/resources/${kind}.json`)])))
  : {}

/**
 * One entry per marker. Each returns a STRING exactly as it should read, or
 * throws — a figure the site does not publish must stop the build, never fall
 * back to a plausible-looking default.
 */
const need = (value, name) => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    throw new Error(`the site does not publish ${name} — remove the marker or publish the figure`)
  }
  return value
}

const FIGURES = {
  /** No other model scores at least as high for less, or higher for the same price. */
  frontier: () => String(need(frontier.members?.length, 'frontier size')),
  /** Every purchasable row in the catalogue, all variants. */
  models: () => String(need(s.models, 'stats.models')),
  providers: () => String(need(s.providers, 'stats.providers')),
  /** Rated AND priced: the population every dominance claim is made over. */
  rated: () => String(need(s.ratedPriced ?? s.rated, 'stats.ratedPriced')),
  dominated: () => String(need(s.dominatedCount, 'stats.dominatedCount')),
  dominatedPct: () => `${need(s.dominatedPct, 'stats.dominatedPct')}%`,
  /** "122 of 132" — stated together so the denominator can never drift away. */
  dominatedOfRated: () =>
    `${need(s.dominatedCount, 'stats.dominatedCount')} of ${need(s.ratedPriced ?? s.rated, 'stats.ratedPriced')}`,
  /** Fail closed until the public API provides this explicit population. */
  standardModels: () => String(need(coverage?.total, 'integrity.coverage.total')),
  unrated: () => String(need(coverage?.unrated, 'integrity.coverage.unrated')),
  unratedPct: () => `${need(coverage?.unratedPct, 'integrity.coverage.unratedPct')}%`,
  variantRows: () => String(need(coverage?.variantRows, 'integrity.coverage.variantRows')),
  /**
   * Dearest ÷ cheapest INPUT price. The site publishes this one; a blended-price
   * spread over the same catalogue is a different number (15,306× on the day
   * this was written), and quoting the wrong one is how a denominator error
   * ships. Take what is published.
   */
  spread: () => `${need(s.priceSpread, 'stats.priceSpread').toLocaleString('en-US')}×`,
  tiered: () => String(need(s.tieredContext, 'stats.tieredContext')),
  /** What a dominated model costs against the cheapest alternative that beats it, as the site states it. */
  overpayMedian: () => `${need(s.overpayMedian, 'stats.overpayMedian')}×`,
  /** Ranks the published confidence intervals can separate, out of rendered positions. */
  distinctRanks: () => String(need(ranks?.distinctRanks, 'integrity.rankResolution.distinctRanks')),
  rankPositions: () => String(need(ranks?.positions, 'integrity.rankResolution.positions')),
  asOf: () => String(need(s.updatedAt, 'stats.updatedAt')).slice(0, 10),
  /** Listed records in each reviewed resource index; the same counts the directory pages state. */
  skills: () => String(need(resources.skills?.records?.length, '/data/resources/skills.json records')),
  agents: () => String(need(resources.agents?.records?.length, '/data/resources/agents.json records')),
  mcpServers: () => String(need(resources.mcpServers?.records?.length, '/data/resources/mcp-servers.json records')),
  workflows: () => String(need(resources.workflows?.recipes?.length, '/data/resources/workflows.json recipes')),
  /** The review date each index publishes; a range when they differ, never a guess. */
  resourcesAsOf: () => {
    const dates = Object.keys(RESOURCE_KINDS).map((k) => need(resources[k]?.reviewedAt, `${k} reviewedAt`)).sort()
    return dates[0] === dates[dates.length - 1] ? dates[0] : `${dates[0]} to ${dates[dates.length - 1]}`
  },
}

const seen = new Set()
const stale = []
let occurrences = 0

for (const doc of sources) {
  doc.next = doc.text.replace(MARKER, (whole, key, current) => {
    const render = FIGURES[key]
    if (!render) throw new Error(`${doc.label} names an unknown figure: ${key}`)
    seen.add(key)
    occurrences += 1
    const value = render()
    if (current !== value) stale.push({ key, current, value, label: doc.label })
    return `<!--fig:${key}-->${value}<!--/fig-->`
  })
}

/**
 * One line per DISTINCT wrong reading, with a count of where it appears.
 *
 * The grouping key is `key + current`, never `key` alone, and that is the whole
 * point. A figure stated in two places can be stale in one of them and correct
 * in the other, or — worse and likelier — wrong in both places by different
 * amounts, because a human updated one and missed the second. Collapsing by
 * figure name would print one of those two wrong values and silently drop the
 * other, which is how a checker reports a problem and still leaves you blind to
 * half of it. Grouping on the reading keeps every distinct wrongness visible and
 * only merges lines that would have been literally identical.
 *
 * Every occurrence is still CHECKED individually above; this only decides how
 * the finding reads. A number stated twice is checked twice.
 */
const report = (rows) => {
  const byReading = new Map()
  for (const row of rows) {
    const id = `${row.label}\u0000${row.key}\u0000${row.current}`
    const hit = byReading.get(id) ?? { ...row, count: 0 }
    hit.count += 1
    byReading.set(id, hit)
  }
  return [...byReading.values()].map(
    (r) =>
      `${r.key}: ${r.label} says "${r.current}", the site says "${r.value}"` +
      (r.count > 1 ? ` — in ${r.count} places` : ''),
  )
}

if (!occurrences) {
  throw new Error(`no figure markers in ${DOCUMENTS.map((d) => d.name).join(', ')} — refusing an empty freshness check`)
}

const unused = Object.keys(FIGURES).filter((k) => !seen.has(k))

// Distinct figures vs. how many times they are stated — the second number is
// the one that matters, since a figure is only as current as its last mention.
const counted = `${seen.size} figure${seen.size === 1 ? '' : 's'}` +
  (occurrences === seen.size ? '' : ` in ${occurrences} places`)

if (check) {
  if (stale.length) {
    console.error('Generated figures are stale:')
    for (const line of report(stale)) console.error(`  ${line}`)
    console.error('\nRun: node scripts/refresh-readme.mjs')
    process.exit(1)
  }
  console.log(`Figures agree with ${ORIGIN} (${counted} checked, as of ${FIGURES.asOf()})`)
  if (unused.length) console.log(`  unused figures available: ${unused.join(', ')}`)
  process.exit(0)
}

for (const doc of sources) if (doc.next !== doc.text) writeFileSync(doc.path, doc.next)
console.log(
  stale.length
    ? `Figures updated — ${stale.length} of ${occurrences} statements rewritten:\n` +
      report(stale)
        .map((l) => `  ${l}`)
        .join('\n')
    : `Figures already current (${counted}, as of ${FIGURES.asOf()})`,
)
