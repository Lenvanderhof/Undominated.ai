import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { cp, lstat, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { inspectResource, installResource, loadResources, resourceMain, RESOURCE_ROOT } from '../src/resources.mjs'

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
async function temporary(t) {
  const path = await mkdtemp(join(tmpdir(), 'undominated-resources-test-'))
  t.after(() => rm(path, { recursive: true, force: true }))
  return path
}
async function bundle(t) {
  const root = join(await temporary(t), 'bundle')
  await cp(RESOURCE_ROOT, root, { recursive: true })
  return root
}
async function mutateManifest(root, change) {
  const path = join(root, 'manifest.json')
  const data = JSON.parse(await readFile(path, 'utf8'))
  change(data)
  await writeFile(path, JSON.stringify(data))
}
const skill = 'undominated-evidence-audit'

test('lists six skills, four portable agents and the first-party MCP bundle', async () => {
  const resources = await loadResources()
  assert.equal(resources.filter(x => x.kind === 'skill').length, 6)
  assert.equal(resources.filter(x => x.kind === 'agent').length, 4)
  assert.equal(resources.filter(x => x.kind === 'mcp-server').length, 1)
  for (const item of resources) await inspectResource(item.id)
})

test('dry run creates no directories; real install preserves every declared byte', async t => {
  const project = await temporary(t)
  const preview = await installResource(skill, { project, dryRun: true })
  assert.equal(preview.dryRun, true)
  assert.deepEqual(await readdir(project), [])
  const result = await installResource(skill, { project })
  const original = await inspectResource(skill)
  for (const file of original.content) assert.deepEqual(await readFile(join(result.destination, file.path)), file.body)
  assert.ok((await lstat(join(result.destination, '.undominated-install.json'))).isFile())
})

test('existing nonempty and empty destinations are never overwritten', async t => {
  const project = await temporary(t)
  const result = await installResource(skill, { project })
  await assert.rejects(installResource(skill, { project }), /already exists/)
  await rm(result.destination, { recursive: true })
  await mkdir(result.destination)
  await assert.rejects(installResource(skill, { project }), /already exists/)
  assert.deepEqual(await readdir(result.destination), [])
})

test('absolute explicit project and constrained target are mandatory', async t => {
  const project = await temporary(t)
  await assert.rejects(installResource(skill), /--project/)
  await assert.rejects(installResource(skill, { project: '.' }), /--project/)
  await assert.rejects(installResource(skill, { project: `${project}/../x` }), /--project/)
  await assert.rejects(installResource('../escape', { project }), /invalid resource id/)
  await assert.rejects(installResource(skill, { project, target: '../escape' }), /--target/)
})

test('rejects symlink project, parent and final destination', async t => {
  const base = await temporary(t), actual = join(base, 'actual'), link = join(base, 'link')
  await mkdir(actual)
  await symlink(actual, link)
  await assert.rejects(installResource(skill, { project: link }), /symlink/)
  await symlink(actual, join(actual, '.agents'))
  await assert.rejects(installResource(skill, { project: actual }), /symlink/)
  await rm(join(actual, '.agents'))
  await mkdir(join(actual, '.agents', 'skills'), { recursive: true })
  await symlink(base, join(actual, '.agents', 'skills', skill))
  await assert.rejects(installResource(skill, { project: actual }), /already exists/)
  assert.deepEqual((await readdir(base)).sort(), ['actual', 'link'])
})

test('rejects broken symlink parent without writing elsewhere', async t => {
  const project = await temporary(t)
  await symlink(join(project, 'missing'), join(project, '.agents'))
  await assert.rejects(installResource(skill, { project }), /symlink/)
  assert.deepEqual(await readdir(project), ['.agents'])
})

test('rejects integrity mismatch before creating a project directory', async t => {
  const root = await bundle(t), project = await temporary(t)
  await writeFile(join(root, skill, 'SKILL.md'), 'tampered')
  await assert.rejects(installResource(skill, { project, root }), /integrity mismatch/)
  assert.deepEqual(await readdir(project), [])
})

test('rejects source file and manifest symlinks', async t => {
  const root = await bundle(t), target = join(root, skill, 'SKILL.md')
  await rm(target)
  await symlink(join(root, skill, 'LICENSE'), target)
  await assert.rejects(inspectResource(skill, { root }), /regular file/)
  const manifest = join(root, 'manifest.json'), backup = join(root, 'manifest-original.json')
  await cp(manifest, backup)
  await rm(manifest)
  await symlink(backup, manifest)
  await assert.rejects(loadResources(root), /regular file/)
})

for (const bad of ['../escape', '/tmp/escape', 'a/../../escape', 'a\\escape', 'a//escape']) {
  test(`rejects manifest file traversal ${bad}`, async t => {
    const root = await bundle(t)
    await mutateManifest(root, data => { data.resources[0].files[0].path = bad })
    await assert.rejects(loadResources(root), /unsafe resource path/)
  })
}

test('rejects duplicate manifest identity and duplicate file paths', async t => {
  const root = await bundle(t)
  await mutateManifest(root, data => { data.resources[1].id = data.resources[0].id })
  await assert.rejects(loadResources(root), /duplicate resource id/)
  const other = await bundle(t)
  await mutateManifest(other, data => { data.resources[0].files.push(data.resources[0].files[0]) })
  await assert.rejects(loadResources(other), /duplicate resource file/)
})

test('Claude skill target is explicit; profiles remain portable', async t => {
  const project = await temporary(t)
  const installed = await installResource(skill, { project, target: 'claude' })
  assert.equal(installed.destination, join(project, '.claude', 'skills', skill))
  const agent = await installResource('undominated-evidence-reviewer', { project, target: 'claude' })
  assert.equal(agent.destination, join(project, '.undominated', 'agents', agent.id))
  assert.match(agent.note, /no native agent was registered/)
})

test('MCP export leaves host config untouched and installed server answers initialize/tools-list offline', async t => {
  const project = await temporary(t)
  const existing = '{"existing":"host configuration"}\n'
  await writeFile(join(project, '.mcp.json'), existing)
  const result = await installResource('undominated-mcp', { project })
  assert.equal(await readFile(join(project, '.mcp.json'), 'utf8'), existing)
  const config = JSON.parse(await readFile(join(result.destination, 'mcp-config.json'), 'utf8'))
  assert.equal(config.mcpServers.undominated.command, process.execPath)
  const child = spawnSync(process.execPath, config.mcpServers.undominated.args, { encoding: 'utf8', input: [
    { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18' } },
    { jsonrpc: '2.0', id: 2, method: 'tools/list' },
  ].map(x => JSON.stringify(x)).join('\n') + '\n' })
  assert.equal(child.status, 0, child.stderr)
  const messages = child.stdout.trim().split('\n').map(line => JSON.parse(line))
  assert.equal(messages[0].result.serverInfo.name, 'undominated-mcp')
  assert.ok(messages[1].result.tools.some(tool => tool.name === 'search_resources'))
})

test('resource CLI rejects unknown options and shows verified entrypoint text', async () => {
  assert.equal((await resourceMain(['install', skill])).code, 1)
  assert.equal((await resourceMain(['list', '--project', '/tmp'])).code, 1)
  assert.equal((await resourceMain(['install', skill, '--project'])).code, 1)
  assert.equal((await resourceMain(['list', '--bogus'])).code, 1)
  assert.equal((await resourceMain(['inspect', 'absent'])).code, 1)
  const result = await resourceMain(['inspect', skill, '--json'])
  assert.equal(result.code, 0)
  assert.match(JSON.parse(result.out).content, /Evidence audit/)
})

async function runFixture(t, slug, mutate) {
  const source = join(repository, 'skills', `undominated-${slug}`)
  const directory = await temporary(t)
  await cp(join(source, 'examples'), directory, { recursive: true })
  const input = join(directory, 'synthetic.json')
  const data = JSON.parse(await readFile(input, 'utf8'))
  if (mutate) await mutate(data, directory)
  await writeFile(input, JSON.stringify(data))
  const result = spawnSync('python3', [join(source, 'scripts/check.py'), input], { encoding: 'utf8' })
  assert.equal(result.error, undefined)
  assert.equal(result.stderr, '', result.stderr)
  return { code: result.status, data: JSON.parse(result.stdout) }
}

for (const slug of ['evidence-audit', 'migration-preflight', 'provider-quote-compare', 'benchmark-audit', 'resource-audit', 'release-proof']) {
  test(`synthetic ${slug} example executes successfully`, async t => {
    const result = await runFixture(t, slug)
    assert.equal(result.code, 0, JSON.stringify(result.data))
    assert.equal(result.data.status, 'pass')
  })
}

test('evidence validator rejects altered arithmetic, evidence bytes and zero denominators', async t => {
  assert.equal((await runFixture(t, 'evidence-audit', data => { data.expected = 74 })).code, 1)
  assert.equal((await runFixture(t, 'evidence-audit', async (_, dir) => { await writeFile(join(dir, 'evidence.txt'), 'Changed') })).code, 1)
  assert.equal((await runFixture(t, 'evidence-audit', data => { data.denominator = 0 })).code, 2)
})

test('migration validator blocks lost vision, unknown limits and missing evaluation evidence', async t => {
  assert.equal((await runFixture(t, 'migration-preflight', data => { data.candidate.inputModalities = ['text'] })).code, 1)
  assert.equal((await runFixture(t, 'migration-preflight', data => { data.candidate.contextTokens = null })).code, 1)
  assert.equal((await runFixture(t, 'migration-preflight', data => { data.evaluations = [] })).code, 1)
  assert.equal((await runFixture(t, 'migration-preflight', data => { data.evaluations.push(data.evaluations[0]) })).code, 2)
})

test('provider calculator preserves whole-request tiers and counts distinct sellers', async t => {
  const result = await runFixture(t, 'provider-quote-compare')
  assert.equal(result.data.distinctSellers, 2)
  assert.equal(result.data.sellerQuotes[0].seller, 'Synthetic B')
  assert.equal(result.data.sellerQuotes[0].cost, '0.011')
  assert.equal(result.data.sellerQuotes[1].cost, '0.016')
  const duplicate = await runFixture(t, 'provider-quote-compare', data => { data.quotes[1].seller = 'synthetic a' })
  assert.equal(duplicate.code, 2)
  assert.match(duplicate.data.error, /distinct sellers/)
  assert.equal((await runFixture(t, 'provider-quote-compare', data => { data.quotes[0].tiers.reverse() })).code, 2)
  assert.equal((await runFixture(t, 'provider-quote-compare', data => { data.quotes[0].precision = 'unknown' })).code, 2)
  assert.equal((await runFixture(t, 'provider-quote-compare', data => { data.quotes[1].currency = 'EUR' })).code, 2)
})

test('benchmark validator reports missing cohort and refuses duplicate identities or constant scores', async t => {
  const complete = await runFixture(t, 'benchmark-audit')
  assert.ok(Math.abs(complete.data.pearson - 1) < 1e-12)
  assert.ok(Math.abs(complete.data.spearman - 1) < 1e-12)
  const missing = await runFixture(t, 'benchmark-audit', data => { data.rows[0].b = null })
  assert.equal(missing.code, 1)
  assert.equal(missing.data.coverage, 0.75)
  assert.equal((await runFixture(t, 'benchmark-audit', data => { data.rows[1].id = data.rows[0].id })).code, 2)
  assert.equal((await runFixture(t, 'benchmark-audit', data => { data.rows.forEach(row => { row.a = 1 }) })).code, 1)
})

test('resource intake does not equate missing checks or excessive permissions with approval', async t => {
  assert.equal((await runFixture(t, 'resource-audit', data => { delete data.checks.functionalTest })).code, 1)
  assert.equal((await runFixture(t, 'resource-audit', data => { data.resource.permissions.push('write:production') })).code, 1)
  assert.equal((await runFixture(t, 'resource-audit', data => { data.resource.license = 'unknown' })).code, 1)
})

test('release verifier catches a soft 404 under HTTP 200 and absent runtime proof', async t => {
  const soft = await runFixture(t, 'release-proof', async (_, dir) => { await writeFile(join(dir, 'response.txt'), 'Synthetic resource v1 is available. Resource not found.') })
  assert.equal(soft.code, 1)
  assert.match(soft.data.issues[0], /public receipt failed/)
  assert.equal((await runFixture(t, 'release-proof', data => { data.runtime.passed = null })).code, 1)
  assert.equal((await runFixture(t, 'release-proof', data => { data.artifacts[0].sha256 = '0'.repeat(64) })).code, 1)
})

test('reserved install metadata and MCP config names fail before any writes', async t => {
  for (const [kind, path] of [['skill', '.undominated-install.json'], ['skill', '.undominated-install.json/nested'], ['mcp-server', 'mcp-config.json']]) {
    const root = await bundle(t), project = await temporary(t)
    let id
    await mutateManifest(root, data => {
      const item = data.resources.find(resource => resource.kind === kind)
      id = item.id
      item.files.push({ path, sha256: '0'.repeat(64) })
    })
    await assert.rejects(installResource(id, { root, project }), /reserved installer path/)
    assert.deepEqual(await readdir(project), [])
  }
})

test('manifest parent-file collisions, case duplicates and Windows device names fail before writes', async t => {
  for (const paths of [['examples', 'examples/file.json'], ['LICENSE', 'license'], ['CON'], ['x:stream'], ['folder./file']]) {
    const root = await bundle(t), project = await temporary(t)
    await mutateManifest(root, data => {
      for (const path of paths) data.resources[0].files.push({ path, sha256: '0'.repeat(64) })
    })
    await assert.rejects(installResource(skill, { root, project }), /collision|duplicate|nonportable/)
    assert.deepEqual(await readdir(project), [])
  }
})

test('evidence and release validators reject traversal, absolute paths and symlink evidence', async t => {
  for (const path of ['../outside.txt', '/etc/passwd']) {
    assert.equal((await runFixture(t, 'evidence-audit', data => { data.evidenceFile = path })).code, 2)
    assert.equal((await runFixture(t, 'release-proof', data => { data.artifacts[0].path = path })).code, 2)
  }
  const result = await runFixture(t, 'evidence-audit', async (data, dir) => {
    await symlink('/etc/passwd', join(dir, 'escape.txt'))
    data.evidenceFile = 'escape.txt'
  })
  assert.equal(result.code, 2)
  assert.match(result.data.error, /symlinks/)
})

test('all validators return structured invalid input errors for a malformed object', async t => {
  for (const slug of ['evidence-audit', 'migration-preflight', 'provider-quote-compare', 'benchmark-audit', 'resource-audit', 'release-proof']) {
    const result = await runFixture(t, slug, data => { for (const key of Object.keys(data)) delete data[key] })
    assert.equal(result.code, 2)
    assert.equal(result.data.status, 'invalid')
  }
})

test('provider pricing applies inclusive boundaries and preserves a third tier', async t => {
  const atBoundary = await runFixture(t, 'provider-quote-compare', data => { data.workload.inputTokens = 2048 })
  const aboveBoundary = await runFixture(t, 'provider-quote-compare', data => { data.workload.inputTokens = 2049 })
  assert.equal(atBoundary.data.allQuotes[0].cost, '0.004048')
  assert.equal(aboveBoundary.data.allQuotes[0].cost, '0.010147')
  const third = await runFixture(t, 'provider-quote-compare', data => {
    data.workload.inputTokens = 8193
    data.quotes[0].tiers[1].maxInputTokens = 8192
    data.quotes[0].tiers.push({ maxInputTokens: null, inputPerMillion: '6', outputPerMillion: '8' })
  })
  assert.equal(third.data.allQuotes[0].cost, '0.057158')
})

test('benchmark Spearman uses average tie ranks and measures nonidentical orderings', async t => {
  const swapped = await runFixture(t, 'benchmark-audit', data => {
    data.rows.forEach((row, index) => { row.b = [1, 3, 2, 4][index] })
  })
  assert.ok(Math.abs(swapped.data.pearson - 0.8) < 1e-12)
  assert.ok(Math.abs(swapped.data.spearman - 0.8) < 1e-12)
  const tied = await runFixture(t, 'benchmark-audit', data => { data.rows[1].a = 1 })
  assert.ok(Math.abs(tied.data.spearman - 0.9486832980505138) < 1e-12)
})

test('extreme finite benchmark magnitudes cannot turn an inverse relationship into a positive one', async t => {
  const result = await runFixture(t, 'benchmark-audit', data => {
    data.rows = [
      { id: 'synthetic/a', a: 1e308, b: 8e307 },
      { id: 'synthetic/b', a: 9e307, b: 9e307 },
      { id: 'synthetic/c', a: 8e307, b: 1e308 },
    ]
  })
  assert.equal(result.code, 0)
  assert.ok(Math.abs(result.data.pearson + 1) < 1e-12)
  assert.ok(Math.abs(result.data.spearman + 1) < 1e-12)
})

test('whitespace or capitalization cannot disguise unknown precision or unresolved licensing', async t => {
  for (const precision of [' unknown ', ' UNKNOWN ', ' Unspecified ']) {
    const result = await runFixture(t, 'provider-quote-compare', data => { data.quotes.forEach(quote => { quote.precision = precision }) })
    assert.equal(result.code, 2)
    assert.match(result.data.error, /unknown precision/)
  }
  for (const license of [' unknown ', ' NONE ', ' Unlicensed ']) {
    const result = await runFixture(t, 'resource-audit', data => { data.resource.license = license })
    assert.equal(result.code, 1)
    assert.ok(result.data.issues.includes('license absent or unresolved'))
  }
})

test('whitespace-only model, evaluation, count and modality identities are invalid', async t => {
  assert.equal((await runFixture(t, 'benchmark-audit', data => { data.rows[0].id = ' \t ' })).code, 2)
  assert.equal((await runFixture(t, 'migration-preflight', data => { data.requirements.requiredEvalIds = [' ']; data.evaluations = [{ id: ' ', passed: true }] })).code, 2)
  assert.equal((await runFixture(t, 'migration-preflight', data => { data.candidate.inputModalities.push(' ') })).code, 2)
  assert.equal((await runFixture(t, 'migration-preflight', data => { data.requirements.inputModalities.push(' ') })).code, 2)
  assert.equal((await runFixture(t, 'evidence-audit', data => { data.operation = 'count'; data.items = [' ']; data.expected = 1 })).code, 2)
})
