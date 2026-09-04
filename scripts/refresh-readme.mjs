#!/usr/bin/env node
/**
 * Keep every figure in README.md equal to what undominated.ai publishes.
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
 *   node scripts/refresh-readme.mjs          # rewrite README.md in place
 *   node scripts/refresh-readme.mjs --check  # exit 1 if any figure is stale
 *
 * `--check` is what CI runs, so a stale README fails a pull request rather than
 * being noticed by a reader.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const README = resolve(ROOT, 'README.md')
const ORIGIN = 'https://undominated.ai'

const check = process.argv.includes('--check')

async function json(path) {
  const res = await fetch(`${ORIGIN}${path}`, { headers: { accept: 'application/json' } })
  if (!res.ok) throw new Error(`${path} returned ${res.status}`)
  return res.json()
}

const [catalogue, frontier] = await Promise.all([
  json('/data/catalogue.json'),
  json('/data/frontier.json'),
])
const s = catalogue.stats ?? {}

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
  /** Models on the value frontier: nothing beats them on quality and price at once. */
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
  unrated: () => String(need(s.unrated, 'stats.unrated')),
  unratedPct: () => `${Math.round((100 * need(s.unrated, 'stats.unrated')) / need(s.models, 'stats.models'))}%`,
  /**
   * Dearest ÷ cheapest INPUT price. The site publishes this one; a blended-price
   * spread over the same catalogue is a different number (15,306× on the day
   * this was written), and quoting the wrong one is how a denominator error
   * ships. Take what is published.
   */
  spread: () => `${need(s.priceSpread, 'stats.priceSpread').toLocaleString('en-US')}×`,
  tiered: () => String(need(s.tieredContext, 'stats.tieredContext')),
  asOf: () => String(need(s.updatedAt, 'stats.updatedAt')).slice(0, 10),
}

const source = readFileSync(README, 'utf8')
const seen = new Set()
const stale = []

const next = source.replace(/<!--fig:([a-zA-Z]+)-->([\s\S]*?)<!--\/fig-->/g, (whole, key, current) => {
  const render = FIGURES[key]
  if (!render) throw new Error(`README names an unknown figure: ${key}`)
  seen.add(key)
  const value = render()
  if (current !== value) stale.push(`${key}: README says "${current}", the site says "${value}"`)
  return `<!--fig:${key}-->${value}<!--/fig-->`
})

const unused = Object.keys(FIGURES).filter((k) => !seen.has(k))

if (check) {
  if (stale.length) {
    console.error('README figures are stale:')
    for (const line of stale) console.error(`  ${line}`)
    console.error('\nRun: node scripts/refresh-readme.mjs')
    process.exit(1)
  }
  console.log(`README figures agree with ${ORIGIN} (${seen.size} checked, as of ${FIGURES.asOf()})`)
  if (unused.length) console.log(`  unused figures available: ${unused.join(', ')}`)
  process.exit(0)
}

writeFileSync(README, next)
console.log(
  stale.length
    ? `README updated — ${stale.length} figure(s) refreshed:\n${stale.map((l) => `  ${l}`).join('\n')}`
    : `README already current (${seen.size} figures, as of ${FIGURES.asOf()})`,
)
