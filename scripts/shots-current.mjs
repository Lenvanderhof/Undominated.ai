#!/usr/bin/env node
/**
 * Are the README's screenshots still showing the site that exists?
 *
 * WHY THIS EXISTS. On 2026-09-05 every shot in docs/shots/ was ten days old and
 * the alt text beside them was worse than old — it was wrong. It said "63%
 * unrated" against a live 68%, and "GLM 5.3 is undominated" when GLM 5.3 had
 * been beaten by Gemini 3.7 Flash and GLM 5.2 had taken its place on the
 * frontier. A screenshot cannot be generated from the data the way a figure
 * can, so it will always drift; what can be checked is whether anyone has
 * looked recently.
 *
 * Two rules, and the second is the one that matters:
 *
 *   1. Every file the manifest names exists, and every file in docs/shots/ is
 *      named by the manifest. An orphan shot is one nobody is checking.
 *   2. The shots are no more than `maxAgeDays` behind the live catalogue's own
 *      as-of date. That is a prompt to reshoot, not an assertion that the
 *      pixels are wrong.
 *
 * It deliberately does NOT try to verify the contents of a PNG. A check that
 * claims more than it tests is the failure this repo documents.
 *
 *   node scripts/shots-current.mjs          # report
 *   node scripts/shots-current.mjs --check  # exit 1 if stale or unlisted
 */
import { readFileSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SHOTS = resolve(ROOT, 'docs/shots')
const check = process.argv.includes('--check')

const manifest = JSON.parse(readFileSync(resolve(SHOTS, 'manifest.json'), 'utf8'))
const listed = new Set(manifest.shots.map((s) => s.file))
const onDisk = new Set(readdirSync(SHOTS).filter((f) => f.endsWith('.png')))

const problems = []
for (const f of listed) if (!onDisk.has(f)) problems.push(`${f}: named by the manifest, not on disk`)
for (const f of onDisk) if (!listed.has(f)) problems.push(`${f}: on disk, named by no manifest entry`)

const res = await fetch('https://undominated.ai/data/catalogue.json', {
  headers: { accept: 'application/json' },
})
if (!res.ok) {
  console.error(`catalogue.json returned ${res.status} — cannot judge staleness`)
  process.exit(check ? 2 : 0)
}
const live = ((await res.json()).stats ?? {}).updatedAt?.slice(0, 10)
if (!live) {
  console.error('the site publishes no stats.updatedAt — cannot judge staleness')
  process.exit(check ? 2 : 0)
}

const days = Math.round(
  (Date.parse(live) - Date.parse(manifest.catalogueAsOf)) / 86_400_000,
)
if (days > manifest.maxAgeDays) {
  problems.push(
    `the shots are ${days} days behind the live catalogue ` +
      `(taken against ${manifest.catalogueAsOf}, live is ${live}, limit ${manifest.maxAgeDays}) — reshoot`,
  )
}

if (problems.length) {
  console.error('README screenshots need attention:')
  for (const p of problems) console.error(`  ${p}`)
  console.error(`\nReshoot at the viewports in docs/shots/manifest.json, then update capturedOn and catalogueAsOf.`)
  process.exit(check ? 1 : 0)
}

console.log(
  `${listed.size} screenshots, taken against catalogue ${manifest.catalogueAsOf}; ` +
    `live is ${live} (${days} day${days === 1 ? '' : 's'} behind, limit ${manifest.maxAgeDays})`,
)
