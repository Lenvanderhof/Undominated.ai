#!/usr/bin/env node
/**
 * Print one version's section of a CHANGELOG, for a GitHub Release body.
 *
 *   node scripts/release-notes.mjs packages/undominated-check/CHANGELOG.md 0.2.0
 *
 * Exits 1 when the section is missing or empty: a release with no notes is a
 * release nobody can evaluate, so the workflow stops rather than ship one.
 */
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

export function section(markdown, version) {
  const lines = String(markdown).split('\n')
  const head = new RegExp(`^## \\[?v?${version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]?(\\s|$)`)
  const start = lines.findIndex((l) => head.test(l))
  if (start === -1) return null
  const end = lines.findIndex((l, i) => i > start && /^## /.test(l))
  const body = lines.slice(start + 1, end === -1 ? undefined : end).join('\n').trim()
  return body || null
}

function main() {
  const [file, version] = process.argv.slice(2)
  if (!file || !version) {
    console.error('usage: release-notes.mjs <CHANGELOG.md> <version>')
    process.exit(1)
  }
  const body = section(readFileSync(file, 'utf8'), version)
  if (!body) {
    console.error(`${file} has no notes under "## ${version}"`)
    process.exit(1)
  }
  process.stdout.write(`${body}\n`)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main()
