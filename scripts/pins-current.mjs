#!/usr/bin/env node
/**
 * Do the `undominated-check@x.y.z` pins in the docs name what npm actually serves?
 *
 * A pin ahead of the registry is a broken install command; a pin behind it
 * quietly keeps readers on an old CLI. Either is a figure typed by hand. The
 * registry's `latest` dist-tag is the only source, and the README's "(MIT,
 * YYYY-MM-DD)" is that version's publish date as npm records it.
 *
 *   node scripts/pins-current.mjs          # rewrite stale pins in place
 *   node scripts/pins-current.mjs --check  # exit 1 if any pin is stale
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const FILES = ['README.md', 'skills/undominated/SKILL.md']
const PKG = 'undominated-check'

/** @returns {{ next: string, stale: string[] }} */
export function rewrite(text, { version, date }) {
  const stale = new Set()
  let next = text.replace(/undominated-check@(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)/g, (whole, v) => {
    if (v !== version) stale.add(`@${v}`)
    return `${PKG}@${version}`
  })
  if (date) {
    next = next.replace(/\(MIT, (\d{4}-\d{2}-\d{2})\)/g, (whole, d) => {
      if (d !== date) stale.add(`published ${d}`)
      return `(MIT, ${date})`
    })
  }
  return { next, stale: [...stale] }
}

async function main() {
  const check = process.argv.includes('--check')
  const res = await fetch(`https://registry.npmjs.org/${PKG}`, {
    headers: { accept: 'application/json' },
  })
  if (!res.ok) {
    console.error(`registry.npmjs.org returned ${res.status} — cannot judge the pins`)
    process.exit(2)
  }
  const doc = await res.json()
  const version = doc['dist-tags']?.latest
  const date = doc.time?.[version]?.slice(0, 10)
  if (!version) {
    console.error(`npm publishes no latest dist-tag for ${PKG}`)
    process.exit(2)
  }

  const findings = []
  for (const file of FILES) {
    const path = resolve(ROOT, file)
    const text = readFileSync(path, 'utf8')
    const { next, stale } = rewrite(text, { version, date })
    for (const s of stale) findings.push(`${file}: pins ${s}, npm latest is ${version} (${date})`)
    if (!check && next !== text) writeFileSync(path, next)
  }

  if (check && findings.length) {
    console.error('version pins are stale:')
    for (const f of findings) console.error(`  ${f}`)
    console.error('\nRun: node scripts/pins-current.mjs')
    process.exit(1)
  }
  console.log(`pins ${findings.length && !check ? 'rewritten to' : 'agree with'} npm: ${PKG}@${version} (${date})`)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await main()
