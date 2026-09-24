#!/usr/bin/env node
/**
 * Refuses a publish whose version is stated inconsistently anywhere it ships.
 *
 * The same version lives in four places: this package.json, the repository-root
 * package.json (the `npx github:Lenvanderhof/Undominated.ai` install source),
 * server.json (twice — the MCP Registry entry and the npm package it points at)
 * and a CHANGELOG heading that becomes the GitHub Release body. On 2026-09-24
 * the root still said 0.1.0 a fortnight after 0.1.1 shipped. A typed version
 * rots like a typed figure; this makes the publish fail instead.
 *
 *   node packages/undominated-check/prepublish.mjs            # check
 *   node packages/undominated-check/prepublish.mjs --tag X    # also: tag names this version
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const read = (p) => readFileSync(join(HERE, p), 'utf8')
const json = (p) => JSON.parse(read(p))

const pkg = json('package.json')
const root = json('../../package.json')
const server = json('server.json')
const changelog = read('CHANGELOG.md')
const bin = read('bin/undominated-check.mjs')

const v = pkg.version
const problems = []
const expect = (ok, message) => ok || problems.push(message)

expect(/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(v), `package.json version "${v}" is not SemVer`)
expect(root.version === v, `root package.json says ${root.version}, the package says ${v}`)
expect(server.version === v, `server.json version says ${server.version}, the package says ${v}`)
const npmEntry = (server.packages ?? []).find((p) => p.registryType === 'npm')
expect(npmEntry?.identifier === pkg.name, `server.json npm identifier is ${npmEntry?.identifier}, not ${pkg.name}`)
expect(npmEntry?.version === v, `server.json npm package version says ${npmEntry?.version}, the package says ${v}`)
expect(server.name === pkg.mcpName, `server.json name ${server.name} ≠ package.json mcpName ${pkg.mcpName}`)
expect(
  new RegExp(`^## ${v.replace(/\./g, '\\.')}(\\s|$)`, 'm').test(changelog),
  `CHANGELOG.md has no "## ${v}" section — it becomes the release notes`,
)
expect(bin.startsWith('#!/usr/bin/env node'), 'bin/undominated-check.mjs lost its shebang')
expect(Object.keys(pkg.dependencies ?? {}).length === 0, 'the CLI promises no runtime dependencies')

const at = process.argv.indexOf('--tag')
if (at !== -1) {
  const tag = process.argv[at + 1] ?? ''
  expect(tag === `${pkg.name}@${v}`, `tag "${tag}" does not name ${pkg.name}@${v}`)
}

if (problems.length) {
  console.error(`refusing to publish ${pkg.name}@${v}:`)
  for (const p of problems) console.error(`  ${p}`)
  process.exit(1)
}
console.log(`${pkg.name}@${v}: version consistent across package.json, root, server.json and CHANGELOG`)
