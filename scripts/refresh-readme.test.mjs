import { test } from 'node:test'
import assert from 'node:assert/strict'
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const exec = promisify(execFile)
const published = {
  stats: { models: 15, unrated: 9, providers: 2, updatedAt: '2026-01-02' },
  integrity: { coverage: { total: 10, unrated: 4, unratedPct: 40, variantRows: 5 } },
}
const markers = '<!--fig:standardModels-->10<!--/fig--> / <!--fig:unrated-->4<!--/fig--> / ' +
  '<!--fig:unratedPct-->40%<!--/fig--> / <!--fig:variantRows-->5<!--/fig-->'

async function fixture(t, content = markers, catalogue = published) {
  const root = await mkdtemp(join(tmpdir(), 'undominated-figures-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await mkdir(join(root, 'scripts'))
  await mkdir(join(root, 'docs'))
  const script = join(root, 'scripts/refresh-readme.mjs')
  await copyFile(new URL('./refresh-readme.mjs', import.meta.url), script)
  const guide = join(root, 'docs/PLATFORM.md')
  await writeFile(guide, content)
  await writeFile(join(root, 'README.md'), 'Keep the current resource overview.\n')
  const requests = []
  const server = createServer((req, res) => {
    requests.push(req.url)
    const data = req.url === '/data/catalogue.json' ? catalogue :
      req.url === '/data/frontier.json' ? { members: [] } : null
    res.writeHead(data ? 200 : 404, { 'content-type': 'application/json' })
    res.end(JSON.stringify(data))
  })
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  t.after(() => new Promise((resolve) => server.close(resolve)))
  const origin = `http://127.0.0.1:${server.address().port}`
  const run = (args) => exec(process.execPath, [script, ...args], { timeout: 5000 })
  return { root, guide, requests, origin, run }
}

test('staged checks use explicit model coverage and leave both documents untouched', async (t) => {
  const f = await fixture(t)
  const result = await f.run(['--check', '--origin', `${f.origin}/`])
  assert.match(result.stdout, /4 figures checked/)
  assert.ok(result.stdout.includes(f.origin))
  assert.deepEqual(f.requests.sort(), ['/data/catalogue.json', '/data/frontier.json'])
  assert.equal(await readFile(f.guide, 'utf8'), markers)
  assert.equal(await readFile(join(f.root, 'README.md'), 'utf8'), 'Keep the current resource overview.\n')
})

test('a stale check fails without writing; refresh changes only the platform guide', async (t) => {
  const stale = markers.replace('-->4<!--', '-->9<!--')
  const f = await fixture(t, stale)
  await assert.rejects(f.run(['--origin', f.origin, '--check']), (error) => {
    assert.match(error.stderr, /unrated: Platform guide says "9", the site says "4"/)
    return true
  })
  assert.equal(await readFile(f.guide, 'utf8'), stale)
  await f.run(['--origin', f.origin])
  assert.equal(await readFile(f.guide, 'utf8'), markers)
  assert.equal(await readFile(join(f.root, 'README.md'), 'utf8'), 'Keep the current resource overview.\n')
})

test('missing coverage refuses instead of substituting listing counts', async (t) => {
  const f = await fixture(t, markers, { stats: published.stats })
  await assert.rejects(f.run(['--origin', f.origin]), (error) => {
    assert.match(error.stderr, /does not publish integrity.coverage.total/)
    return true
  })
  assert.equal(await readFile(f.guide, 'utf8'), markers)
})

test('a document without figure markers cannot pass an empty check', async (t) => {
  const f = await fixture(t, 'No figures here.\n')
  await assert.rejects(f.run(['--check', '--origin', f.origin]), (error) => {
    assert.match(error.stderr, /refusing an empty freshness check/)
    return true
  })
})

test('invalid options stop before fetching or modifying files', async (t) => {
  const f = await fixture(t)
  const invalid = [
    ['--origin'], ['--origin', ''], ['--origin', '--check'],
    ['--origin', 'not-a-url'], ['--origin', 'file:///tmp/catalogue'],
    ['--origin', f.origin, '--origin', f.origin],
    ['--origin', `${f.origin}/data`], ['--origin', `${f.origin}?token=example`],
    ['--origin', `${f.origin}#section`],
    ['--origin', f.origin.replace('http://', 'http://user:pass@')],
    ['--origin', f.origin, '--chekc'],
  ]
  for (const args of invalid) {
    await assert.rejects(f.run(args), (error) => {
      assert.match(error.stderr, /--origin|unknown argument/)
      return true
    })
  }
  assert.deepEqual(f.requests, [])
  assert.equal(await readFile(f.guide, 'utf8'), markers)
})
