#!/usr/bin/env node
/**
 * Does every page that names "the current dump" name the newest one?
 *
 * WHY THIS EXISTS. On 2026-09-23 CITATION.cff was moved to catalogue-2026-09-23
 * in three commits while the README and datasets/README.md went on citing
 * catalogue-2026-09-19 — a reader following "how to cite" and a reader following
 * "download" got different bytes. The source of truth is not a web page here but
 * the git tags themselves: a dump exists when its `catalogue-YYYY-MM-DD` tag does.
 *
 *   node scripts/dump-current.mjs          # rewrite the stale references in place
 *   node scripts/dump-current.mjs --check  # exit 1 if any reference is stale
 *
 * Needs the tags locally (`actions/checkout` with `fetch-depth: 0`).
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** Files that name the current dump, and nothing older. */
export const FILES = ['README.md', 'datasets/README.md', 'CITATION.cff']

const TAG = /catalogue-(\d{4}-\d{2}-\d{2})/g

export function newestCatalogueTag(tags) {
  const dated = tags.map((t) => t.trim()).filter((t) => /^catalogue-\d{4}-\d{2}-\d{2}$/.test(t))
  return dated.sort().at(-1) ?? null
}

/**
 * Rewrite every dump reference in one file to `tag`. For CITATION.cff the
 * `version` and `date-released` fields are the dump date too.
 * @returns {{ next: string, stale: string[] }}
 */
export function rewrite(file, text, tag) {
  const date = tag.slice('catalogue-'.length)
  const stale = new Set()
  let next = text.replace(TAG, (whole) => {
    if (whole !== tag) stale.add(whole)
    return tag
  })
  if (file.endsWith('.cff')) {
    next = next.replace(/^(version|date-released): '(\d{4}-\d{2}-\d{2})'$/gm, (whole, key, was) => {
      if (was !== date) stale.add(`${key} ${was}`)
      return `${key}: '${date}'`
    })
  }
  return { next, stale: [...stale] }
}

function main() {
  const check = process.argv.includes('--check')
  const tags = execFileSync('git', ['tag', '--list', 'catalogue-*'], { cwd: ROOT, encoding: 'utf8' }).split('\n')
  const tag = newestCatalogueTag(tags)
  if (!tag) {
    console.error('no catalogue-YYYY-MM-DD tag found — fetch tags (fetch-depth: 0) before checking')
    process.exit(2)
  }

  const findings = []
  for (const file of FILES) {
    const path = resolve(ROOT, file)
    const text = readFileSync(path, 'utf8')
    if (!text.includes(tag)) findings.push(`${file}: never names ${tag}`)
    const { next, stale } = rewrite(file, text, tag)
    for (const s of stale) findings.push(`${file}: says ${s}, newest dump is ${tag}`)
    if (!check && next !== text) writeFileSync(path, next)
  }

  if (check && findings.length) {
    console.error('dump references are stale:')
    for (const f of findings) console.error(`  ${f}`)
    console.error('\nRun: node scripts/dump-current.mjs')
    process.exit(1)
  }
  console.log(
    check
      ? `${FILES.length} files cite ${tag}, the newest dump`
      : `dump references ${findings.length ? 'rewritten' : 'already current'}: ${tag}`,
  )
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main()
