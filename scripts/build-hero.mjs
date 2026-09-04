#!/usr/bin/env node
/**
 * The README hero: the argument, drawn from the live board.
 *
 * WHY NOT A PICTURE. docs/brand/banner.png had five figures baked into its
 * pixels — "11 undominated · 97 of 108 · 409 in the catalogue · 63% unrated ·
 * 15,000× price spread". By 2026-09-04 four of the five were wrong, and no text
 * edit could fix them because they were pixels. A hero that states numbers has
 * to be generated from the same source the numbers come from, or it becomes the
 * most prominent wrong claim the project makes.
 *
 * WHAT IT DRAWS. Every rated, priced model as one dot: quality up, effective
 * price right (log). The frontier — the models nothing beats on both axes at
 * once — is the staircase. Everything below and right of it is a strictly worse
 * deal, and that shape IS the thesis: you cannot argue with a scatter plot of
 * published prices.
 *
 * No axis is invented and no dot is placed by hand. If /data/frontier.json and
 * /data/catalogue.json disagree with this image, the image is regenerated.
 *
 *   node scripts/build-hero.mjs            # -> docs/brand/hero.svg
 *   node scripts/build-hero.mjs --check    # exit 1 if the committed file is stale
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = resolve(ROOT, 'docs/brand/hero.svg')
const ORIGIN = 'https://undominated.ai'

// Dual Witness palette, from src/lib/brand/embed-lockup.mjs in the build repo.
const GROUND = '#0F0E0B'
const WITNESS = '#FBFAF8'
const EVIDENCE = '#83B81D'
const MUTED = '#6C6659'

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
 * Rated AND priced, standard delivery. The same population every dominance
 * claim on the site is made over — quoting a different one here would be the
 * denominator error this project logs corrections for.
 */
const points = (catalogue.rows ?? [])
  .filter((r) => r.v === 'standard' && r.q != null && r.p > 0)
  .map((r) => ({ slug: r.s, q: r.q, price: r.p }))

if (points.length < 50) throw new Error(`only ${points.length} rated+priced rows — refusing to draw a thin board`)

const onFrontier = new Set((frontier.members ?? []).map((m) => m.slug))

const W = 1200
const H = 480
const PAD = { top: 96, right: 56, bottom: 64, left: 64 }
const plotW = W - PAD.left - PAD.right
const plotH = H - PAD.top - PAD.bottom

const qs = points.map((p) => p.q)
const ps = points.map((p) => p.price)
const qMin = Math.min(...qs)
const qMax = Math.max(...qs)
const lpMin = Math.log10(Math.min(...ps))
const lpMax = Math.log10(Math.max(...ps))

// Price runs left-to-right on a log scale; quality runs bottom-to-top. The
// frontier therefore reads as a staircase climbing to the right, and the
// dominated mass sits under it.
const x = (price) => PAD.left + ((Math.log10(price) - lpMin) / (lpMax - lpMin)) * plotW
const y = (q) => PAD.top + plotH - ((q - qMin) / (qMax - qMin)) * plotH

const dominated = points.filter((p) => !onFrontier.has(p.slug))
const members = points.filter((p) => onFrontier.has(p.slug)).sort((a, b) => a.price - b.price)

const dot = (p, r) => `M${x(p.price).toFixed(1)} ${y(p.q).toFixed(1)}m-${r} 0a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 -${2 * r} 0`
const dominatedPath = dominated.map((p) => dot(p, 3)).join('')
const frontierPath = members.map((p) => dot(p, 5)).join('')

// The staircase itself: from each frontier member, right to the next member's
// price at the same quality, then up. A straight line between them would claim
// models exist in between, which is exactly the kind of invented shape the
// house style refuses.
let stair = ''
members.forEach((m, i) => {
  const px = x(m.price)
  const py = y(m.q)
  if (i === 0) stair += `M${px.toFixed(1)} ${py.toFixed(1)}`
  else {
    const prev = members[i - 1]
    stair += `L${px.toFixed(1)} ${y(prev.q).toFixed(1)}L${px.toFixed(1)} ${py.toFixed(1)}`
  }
})

const n = (v) => Number(v).toLocaleString('en-US')
const asOf = String(s.updatedAt ?? '').slice(0, 10)

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${
  n(s.dominatedCount)
} of ${n(s.ratedPriced ?? s.rated)} rated, priced models are beaten on quality and undercut on price. ${
  frontier.members.length
} are not.">
  <rect width="${W}" height="${H}" fill="${GROUND}"/>
  <text x="${PAD.left}" y="52" fill="${WITNESS}" font-family="Georgia, 'Times New Roman', serif" font-size="34" font-weight="600">${
    n(s.dominatedCount)
  } of ${n(s.ratedPriced ?? s.rated)} models are a strictly worse deal.</text>
  <text x="${PAD.left}" y="78" fill="${MUTED}" font-family="system-ui, sans-serif" font-size="15">Something on the same board is better on quality <tspan font-style="italic">and</tspan> cheaper. ${
    frontier.members.length
  } are not — that staircase is the value frontier.</text>
  <path d="${dominatedPath}" fill="${MUTED}" fill-opacity="0.55"/>
  <path d="${stair}" fill="none" stroke="${EVIDENCE}" stroke-width="1.5" stroke-opacity="0.5"/>
  <path d="${frontierPath}" fill="${EVIDENCE}"/>
  <text x="${PAD.left}" y="${H - 26}" fill="${MUTED}" font-family="system-ui, sans-serif" font-size="13">cheaper →</text>
  <text x="${W - PAD.right}" y="${H - 26}" fill="${MUTED}" font-family="system-ui, sans-serif" font-size="13" text-anchor="end">${
    n(s.models)
  } models · ${n(s.providers)} providers · effective $/M, balanced workload · LMArena · as of ${asOf}</text>
  <text x="${PAD.left - 14}" y="${PAD.top - 8}" fill="${MUTED}" font-family="system-ui, sans-serif" font-size="13" transform="rotate(-90 ${
    PAD.left - 14
  } ${PAD.top - 8})" text-anchor="end">better →</text>
</svg>
`

if (check) {
  if (!existsSync(OUT)) {
    console.error('docs/brand/hero.svg does not exist — run: node scripts/build-hero.mjs')
    process.exit(1)
  }
  if (readFileSync(OUT, 'utf8') !== svg) {
    console.error('docs/brand/hero.svg is stale — run: node scripts/build-hero.mjs')
    process.exit(1)
  }
  console.log(`hero.svg agrees with ${ORIGIN} (${points.length} rated+priced rows, ${members.length} on the frontier, as of ${asOf})`)
  process.exit(0)
}

writeFileSync(OUT, svg)
console.log(
  `docs/brand/hero.svg  ${(svg.length / 1024).toFixed(1)} KB · ${points.length} rated+priced rows · ${members.length} on the frontier · as of ${asOf}`,
)
