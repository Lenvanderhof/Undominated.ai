import { test } from 'node:test'
import assert from 'node:assert/strict'
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const exec = promisify(execFile)
const records = (n) => Array.from({ length: n }, (_, i) => ({ id: `r${i}` }))
const indexes = () => ({
  skills: { kind: 'skills', reviewedAt: '2026-01-02', records: records(3) },
  agents: { kind: 'agents', reviewedAt: '2026-01-02', records: records(2) },
  'mcp-servers': { kind: 'mcp-servers', reviewedAt: '2026-01-02', records: records(4) },
})
const readme = 'Directories: <!--res:skills-->3<!--/res--> skills, <!--res:agents-->2<!--/res--> agents, ' +
  '<!--res:mcpServers-->4<!--/res--> MCP servers, checked <!--res:reviewedAt-->2026-01-02<!--/res-->; ' +
  '<!--res:total-->9<!--/res--> reviews. Hand prose 131 stays.\n'
const resources = 'See <!--res:skills-->3<!--/res--> skills (<!--res:reviewedAt-->2026-01-02<!--/res-->).\n'

async function fixture(t, { readmeText = readme, resourcesText = resources, data = indexes() } = {}) {
  const root = await mkdtemp(join(tmpdir(), 'undominated-resource-counts-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await mkdir(join(root, 'scripts'))
  await mkdir(join(root, 'docs'))
  const script = join(root, 'scripts/refresh-resource-counts.mjs')
  await copyFile(new URL('./refresh-resource-counts.mjs', import.meta.url), script)
  await writeFile(join(root, 'README.md'), readmeText)
  await writeFile(join(root, 'docs/RESOURCES.md'), resourcesText)
  const requests = []
  const server = createServer((req, res) => {
    requests.push(req.url)
    const match = /^\/data\/resources\/([a-z-]+)\.json$/.exec(req.url)
    const body = match ? data[match[1]] : undefined
    res.writeHead(body ? 200 : 404, { 'content-type': 'application/json' })
    res.end(JSON.stringify(body ?? null))
  })
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  t.after(() => new Promise((resolve) => server.close(resolve)))
  const origin = `http://127.0.0.1:${server.address().port}`
  const run = (args) => exec(process.execPath, [script, '--origin', origin, ...args], { timeout: 5000 })
  const read = async () => [await readFile(join(root, 'README.md'), 'utf8'), await readFile(join(root, 'docs/RESOURCES.md'), 'utf8')]
  return { requests, run, read }
}

test('a current check passes, reads the three published indexes and writes nothing', async (t) => {
  const f = await fixture(t)
  const result = await f.run(['--check'])
  assert.match(result.stdout, /7 statements in 2 files; 3 skills, 2 agents, 4 MCP servers, reviewed 2026-01-02/)
  assert.deepEqual(f.requests.sort(), ['/data/resources/agents.json', '/data/resources/mcp-servers.json', '/data/resources/skills.json'])
  assert.deepEqual(await f.read(), [readme, resources])
})

test('drift fails the check without writing; a refresh rewrites only the markers', async (t) => {
  const staleReadme = readme.replace('-->3<!--', '-->131<!--').replace('-->9<!--', '-->360<!--')
  const staleResources = resources.replace('2026-01-02', '2025-12-31')
  const f = await fixture(t, { readmeText: staleReadme, resourcesText: staleResources })
  await assert.rejects(f.run(['--check']), (error) => {
    assert.match(error.stderr, /README\.md: skills says "131", the site says "3"/)
    assert.match(error.stderr, /README\.md: total says "360", the site says "9"/)
    assert.match(error.stderr, /docs\/RESOURCES\.md: reviewedAt says "2025-12-31", the site says "2026-01-02"/)
    return true
  })
  assert.deepEqual(await f.read(), [staleReadme, staleResources])
  await f.run([])
  const [nextReadme, nextResources] = await f.read()
  assert.equal(nextReadme, readme)
  assert.equal(nextResources, resources)
  assert.ok(nextReadme.includes('Hand prose 131 stays.'))
})

test('indexes that disagree on their review date refuse one "checked on" date', async (t) => {
  const data = indexes()
  data.agents.reviewedAt = '2026-01-01'
  const f = await fixture(t, { data })
  await assert.rejects(f.run(['--check']), /disagree on reviewedAt/)
  await assert.rejects(f.run([]), /disagree on reviewedAt/)
  assert.deepEqual(await f.read(), [readme, resources])
})

test('a missing index or field fails closed instead of substituting a number', async (t) => {
  const missing = indexes()
  delete missing['mcp-servers']
  await assert.rejects((await fixture(t, { data: missing })).run(['--check']), /mcp-servers\.json returned 404/)
  const noRecords = indexes()
  delete noRecords.skills.records
  await assert.rejects((await fixture(t, { data: noRecords })).run(['--check']), /does not publish records/)
  const wrongKind = indexes()
  wrongKind.agents.kind = 'skills'
  await assert.rejects((await fixture(t, { data: wrongKind })).run(['--check']), /expected kind "agents"/)
})

test('a file without markers or with an unknown key stops the run', async (t) => {
  await assert.rejects((await fixture(t, { resourcesText: 'no markers here\n' })).run(['--check']), /docs\/RESOURCES\.md has no resource-count markers/)
  await assert.rejects(
    (await fixture(t, { readmeText: readme + '<!--res:workflows-->28<!--/res-->\n' })).run(['--check']),
    /unknown resource figure: workflows/,
  )
})
