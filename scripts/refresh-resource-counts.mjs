#!/usr/bin/env node
/**
 * Keep the resource-directory counts in README.md and docs/RESOURCES.md equal
 * to what undominated.ai publishes.
 *
 * WHY. On 2026-10-13 both files said "131 skills, 101 agent definitions and
 * 128 MCP servers, checked on 2026-10-07" while the live directories listed far
 * more. The counts had been typed by hand once; the directories moved on.
 *
 * HOW. Counts sit between HTML comment markers, e.g.
 *
 *   <!--res:skills-->257<!--/res-->
 *
 * Each key is read from the site's own published resource indexes
 * (/data/resources/{skills,agents,mcp-servers}.json, the files the directory
 * pages render from): the count is the length of `records`, the date is
 * `reviewedAt`. Nothing is estimated. A missing index, a missing field, or
 * three indexes that disagree on their review date stop the run.
 *
 *   node scripts/refresh-resource-counts.mjs          # rewrite both files
 *   node scripts/refresh-resource-counts.mjs --check  # exit 1 on any drift
 *   node scripts/refresh-resource-counts.mjs --origin http://127.0.0.1:8080
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const FILES = ['README.md', 'docs/RESOURCES.md']
const KINDS = { skills: 'skills', agents: 'agents', mcpServers: 'mcp-servers' }

let ORIGIN = 'https://undominated.ai'
let check = false
let originSeen = false
const argv = process.argv.slice(2)
for (let i = 0; i < argv.length; i += 1) {
  if (argv[i] === '--check') check = true
  else if (argv[i] === '--origin') {
    if (originSeen) throw new Error('--origin may be specified only once')
    originSeen = true
    const value = argv[++i]
    let url
    try { url = new URL(value) } catch { throw new Error('--origin requires an HTTP(S) origin') }
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('--origin requires an HTTP(S) origin')
    ORIGIN = url.origin
  } else throw new Error(`unknown argument: ${argv[i]}`)
}

async function index(kind) {
  const path = `/data/resources/${kind}.json`
  const res = await fetch(`${ORIGIN}${path}`, { headers: { accept: 'application/json' } })
  if (!res.ok) throw new Error(`${path} returned ${res.status}`)
  const data = await res.json()
  if (data?.kind !== kind) throw new Error(`${path}: expected kind "${kind}", got ${JSON.stringify(data?.kind)}`)
  if (!Array.isArray(data.records)) throw new Error(`${path}: the site does not publish records`)
  if (typeof data.reviewedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(data.reviewedAt)) {
    throw new Error(`${path}: the site does not publish reviewedAt`)
  }
  return { count: data.records.length, reviewedAt: data.reviewedAt.slice(0, 10) }
}

const entries = await Promise.all(Object.entries(KINDS).map(async ([key, kind]) => [key, await index(kind)]))
const published = Object.fromEntries(entries)
const dates = new Set(entries.map(([, value]) => value.reviewedAt))
if (dates.size !== 1) {
  throw new Error(`the resource indexes disagree on reviewedAt (${[...dates].join(', ')}) — refusing one "checked on" date`)
}

const FIGURES = {
  skills: () => String(published.skills.count),
  agents: () => String(published.agents.count),
  mcpServers: () => String(published.mcpServers.count),
  total: () => String(published.skills.count + published.agents.count + published.mcpServers.count),
  reviewedAt: () => [...dates][0],
}

const stale = []
const rewritten = new Map()
let occurrences = 0
for (const file of FILES) {
  const path = resolve(ROOT, file)
  const source = readFileSync(path, 'utf8')
  let found = 0
  const next = source.replace(/<!--res:([a-zA-Z]+)-->([\s\S]*?)<!--\/res-->/g, (whole, key, current) => {
    const render = FIGURES[key]
    if (!render) throw new Error(`${file} names an unknown resource figure: ${key}`)
    found += 1
    const value = render()
    if (current !== value) stale.push(`${file}: ${key} says "${current}", the site says "${value}"`)
    return `<!--res:${key}-->${value}<!--/res-->`
  })
  if (!found) throw new Error(`${file} has no resource-count markers — refusing an empty freshness check`)
  occurrences += found
  rewritten.set(path, { source, next })
}

const summary = `${published.skills.count} skills, ${published.agents.count} agents, ` +
  `${published.mcpServers.count} MCP servers, reviewed ${FIGURES.reviewedAt()}`

if (check) {
  if (stale.length) {
    console.error('Resource counts are stale:')
    for (const line of stale) console.error(`  ${line}`)
    console.error('\nRun: node scripts/refresh-resource-counts.mjs')
    process.exit(1)
  }
  console.log(`Resource counts agree with ${ORIGIN} (${occurrences} statements in ${FILES.length} files; ${summary})`)
  process.exit(0)
}

for (const [path, { source, next }] of rewritten) if (next !== source) writeFileSync(path, next)
console.log(stale.length
  ? `Resource counts updated — ${stale.length} of ${occurrences} statements rewritten (${summary}):\n` +
    stale.map((line) => `  ${line}`).join('\n')
  : `Resource counts already current (${summary})`)
