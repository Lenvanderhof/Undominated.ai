import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { cp, lstat, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { inspectResource, installResource, loadResources, resourceMain, RESOURCE_ROOT } from '../src/resources.mjs'
import { main } from '../src/cli.mjs'

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

test('lists eleven skills, six portable agents and the first-party MCP bundle', async () => {
  const resources = await loadResources()
  assert.equal(resources.filter(x => x.kind === 'skill').length, 11)
  assert.equal(resources.filter(x => x.kind === 'agent').length, 6)
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

test('supports target directories for universal, claude, and codex skills', async t => {
  const project = await temporary(t)
  const universal = await installResource(skill, { project, target: 'universal' })
  assert.equal(universal.destination, join(project, '.agents', 'skills', skill))
  const defaultTarget = await installResource('undominated-migration-preflight', { project })
  assert.equal(defaultTarget.destination, join(project, '.agents', 'skills', 'undominated-migration-preflight'))
  const claude = await installResource('undominated-provider-quote-compare', { project, target: 'claude' })
  assert.equal(claude.destination, join(project, '.claude', 'skills', 'undominated-provider-quote-compare'))
  const codex = await installResource('undominated-benchmark-audit', { project, target: 'codex' })
  assert.equal(codex.destination, join(project, '.codex', 'skills', 'undominated-benchmark-audit'))
})

test('supports portable agent target directories for universal, claude, github, and undominated', async t => {
  const project = await temporary(t)
  const universalAgent = await installResource('undominated-evidence-reviewer', { project, target: 'universal' })
  assert.equal(universalAgent.destination, join(project, '.agents', 'undominated-evidence-reviewer'))
  assert.match(universalAgent.note, /no native agent was registered/)

  const claudeAgent = await installResource('undominated-migration-planner', { project, target: 'claude' })
  assert.equal(claudeAgent.destination, join(project, '.claude', 'agents', 'undominated-migration-planner'))
  assert.match(claudeAgent.note, /no native agent was registered/)

  const githubAgent = await installResource('undominated-resource-curator', { project, target: 'github' })
  assert.equal(githubAgent.destination, join(project, '.github', 'agents', 'undominated-resource-curator'))
  assert.match(githubAgent.note, /no native agent was registered/)

  const undomAgent = await installResource('undominated-release-verifier', { project, target: 'undominated' })
  assert.equal(undomAgent.destination, join(project, '.undominated', 'agents', 'undominated-release-verifier'))
  assert.match(undomAgent.note, /no native agent was registered/)
})

test('MCP export leaves host config untouched, provides helpers, and server answers offline', async t => {
  const project = await temporary(t)
  const existing = '{"existing":"host configuration"}\n'
  await writeFile(join(project, '.mcp.json'), existing)
  const result = await installResource('undominated-mcp', { project })
  assert.equal(await readFile(join(project, '.mcp.json'), 'utf8'), existing)
  assert.ok(result.helpers)
  assert.match(result.helpers.claudeCommand, /^claude mcp add undominated node /)
  assert.equal(result.helpers.cursorConfig.mcpServers.undominated.command, 'node')
  assert.equal(result.helpers.vscodeConfig.mcp.servers.undominated.command, 'node')
  assert.equal(result.helpers.configPath, join(result.destination, 'mcp-config.json'))

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

test('CLI install alias routes directly to resource installer and displays helpers', async t => {
  const project = await temporary(t)
  // Direct alias install of skill
  const skillRes = await main(['install', skill, '--project', project])
  assert.equal(skillRes.code, 0)
  assert.match(skillRes.out, new RegExp(`Installed ${skill}`))

  // Direct alias with target claude
  const claudeRes = await main(['install', 'undominated-migration-preflight', '--project', project, '--target', 'claude'])
  assert.equal(claudeRes.code, 0)
  assert.match(claudeRes.out, /\.claude\/skills\/undominated-migration-preflight/)

  // Direct alias with target codex
  const codexRes = await main(['install', 'undominated-plan-quote', '--project', project, '--target', 'codex'])
  assert.equal(codexRes.code, 0)
  assert.match(codexRes.out, /\.codex\/skills\/undominated-plan-quote/)

  // Direct alias of agent with target github
  const agentRes = await main(['install', 'undominated-evidence-reviewer', '--project', project, '--target', 'github'])
  assert.equal(agentRes.code, 0)
  assert.match(agentRes.out, /\.github\/agents\/undominated-evidence-reviewer/)

  // Direct alias of MCP server outputs setup helpers
  const mcpRes = await main(['install', 'undominated-mcp', '--project', project])
  assert.equal(mcpRes.code, 0)
  assert.match(mcpRes.out, /claude mcp add undominated node/)
  assert.match(mcpRes.out, /\.cursor\/mcp\.json/)
  assert.match(mcpRes.out, /\.vscode\/settings\.json/)

  // Direct alias of MCP server with --json outputs helpers structure
  const project2 = await temporary(t)
  const mcpJsonRes = await main(['install', 'undominated-mcp', '--project', project2, '--json'])
  assert.equal(mcpJsonRes.code, 0)
  const parsed = JSON.parse(mcpJsonRes.out)
  assert.ok(parsed.helpers.claudeCommand)
  assert.ok(parsed.helpers.cursorConfig)
  assert.ok(parsed.helpers.vscodeConfig)

  // Help output
  const installHelp = await main(['install', '--help'])
  assert.equal(installHelp.code, 0)
  assert.match(installHelp.out, /Targets/)
  assert.match(installHelp.out, /Examples/)
  assert.match(installHelp.out, /--target universal/)

  const resHelp = await main(['resources', '--help'])
  assert.equal(resHelp.code, 0)
  assert.match(resHelp.out, /Targets/)

  // Error: invalid target
  const invalidTarget = await main(['install', skill, '--project', project, '--target', 'badtarget'])
  assert.equal(invalidTarget.code, 1)
  assert.match(invalidTarget.err, /--target must be universal, claude, codex, github or undominated/)

  // Error: missing project
  const noProj = await main(['install', skill])
  assert.equal(noProj.code, 1)
  assert.match(noProj.err, /--project/)

  // Error: missing resource id
  const noId = await main(['install'])
  assert.equal(noId.code, 1)
  assert.match(noId.err, /expected exactly one resource id/)
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

for (const slug of ['evidence-audit', 'migration-preflight', 'provider-quote-compare', 'benchmark-audit', 'resource-audit', 'release-proof', 'seller-spread', 'dominance-wording', 'plan-quote', 'licence-boundary', 'context-tier']) {
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
  for (const slug of ['evidence-audit', 'migration-preflight', 'provider-quote-compare', 'benchmark-audit', 'resource-audit', 'release-proof', 'seller-spread', 'dominance-wording', 'plan-quote', 'licence-boundary', 'context-tier']) {
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

test('seller spread refuses same-owner tiers, zero rates and a mismatched headline', async t => {
  const collapsed = await runFixture(t, 'seller-spread', data => {
    data.claimedMultiple = '7.2'
    data.rows[0].inputPerMillion = '1.00'
    data.rows[1].inputPerMillion = '2.00'
    data.rows.push({ ...data.rows[0], seller: 'Synthetic North Priority', serviceTier: 'priority', inputPerMillion: '7.20', sourceUrl: 'https://example.org/synthetic-priority' })
  })
  assert.equal(collapsed.code, 1)
  assert.equal(collapsed.data.sellerOwners, 2)
  assert.equal(collapsed.data.ownerMultiple, '2')
  assert.equal(collapsed.data.rowMultiple, '7.2')
  assert.equal((await runFixture(t, 'seller-spread', data => { data.rows[1].sellerOwner = data.rows[0].sellerOwner })).code, 1)
  assert.equal((await runFixture(t, 'seller-spread', data => { data.rows[0].inputPerMillion = '0' })).code, 1)
  assert.equal((await runFixture(t, 'seller-spread', data => { data.rows[0].inputPerMillion = true })).code, 2)
  assert.equal((await runFixture(t, 'seller-spread', data => { data.rows[1].sellerOwner = ' Synthetic NORTH ' })).code, 1)
})

test('dominance wording keeps ties and dropped requirements out of a both-better claim', async t => {
  const tied = await runFixture(t, 'dominance-wording', data => { data.claim = 'both-better-and-cheaper' })
  assert.equal(tied.code, 1)
  assert.equal(tied.data.verdict, 'cheaper-at-equal-score')
  assert.equal((await runFixture(t, 'dominance-wording', data => { data.claim = 'weak-pareto' })).code, 0)
  const blind = await runFixture(t, 'dominance-wording', data => { data.candidate.capabilities.imageInput = false })
  assert.equal(blind.code, 1)
  assert.equal(blind.data.verdict, 'capability-loss')
  const shorter = await runFixture(t, 'dominance-wording', data => { data.candidate.capabilities.contextTokens = 64000 })
  assert.equal(shorter.data.verdict, 'capability-loss')
  const unrated = await runFixture(t, 'dominance-wording', data => { data.candidate.score = null; data.claim = 'incomparable' })
  assert.equal(unrated.code, 0)
  assert.equal(unrated.data.verdict, 'incomparable')
  assert.equal((await runFixture(t, 'dominance-wording', data => { data.candidate.score = false })).code, 2)
})

test('plan ceilings ignore recorded quotes and licence notes reject a public page as a licence', async t => {
  const smuggled = await runFixture(t, 'plan-quote', data => { data.includedPlanIds.push('synthetic-recorded') })
  assert.equal(smuggled.code, 1)
  assert.match(smuggled.data.issues[0], /not verified USD/)
  assert.equal((await runFixture(t, 'plan-quote', data => { data.monthlyCeilingUsd = '40.00' })).code, 1)
  assert.equal((await runFixture(t, 'plan-quote', data => { data.plans[1].amount = '20.00' })).code, 2)
  assert.equal((await runFixture(t, 'plan-quote', data => { data.plans[0].amount = 20 })).code, 2)
  const page = await runFixture(t, 'licence-boundary', data => { data.publicPageTreatedAsLicence = true })
  assert.equal(page.code, 1)
  assert.match(page.data.issues[0], /public page/)
  const favourable = await runFixture(t, 'licence-boundary', data => { data.claim = 'redistributable' })
  assert.equal(favourable.code, 1)
  const grant = await runFixture(t, 'licence-boundary', data => {
    Object.assign(data, { claim: 'redistributable', redistributionEvidence: 'explicit-grant', licenceName: 'Example grant', licenceUrl: 'https://example.org/license', evidenceQuote: 'You may redistribute with attribution.', attributionRequired: true, attributionPresent: false })
  })
  assert.equal(grant.code, 1)
  assert.match(grant.data.issues[0], /attribution/)
})

test('context tier keeps the top rung off the first boundary', async t => {
  const flattened = await runFixture(t, 'context-tier', data => { data.claim.multiple = '6.67' })
  assert.equal(flattened.code, 1)
  assert.equal(flattened.data.boundaries[0].multiple, '3.33')
  assert.equal(flattened.data.boundaries[1].multiple, '6.67')
  assert.match(flattened.data.issues[0], /that boundary/)
  const top = await runFixture(t, 'context-tier', data => { data.claim.pastTokens = 262144; data.claim.multiple = '6.67' })
  assert.equal(top.code, 0)
  const one = await runFixture(t, 'context-tier', data => { data.rungs = [data.rungs.at(-1)] })
  assert.equal(one.code, 1)
  assert.match(one.data.issues[0], /no pricing boundary/)
  assert.equal((await runFixture(t, 'context-tier', data => { data.rungs[0].inputPerMillion = false })).code, 2)
  assert.equal((await runFixture(t, 'context-tier', data => { data.rungs.at(-1).maxInputTokens = 999999 })).code, 2)
  const output = await runFixture(t, 'context-tier', data => { data.side = 'output' })
  assert.equal(output.code, 1)
  assert.equal(output.data.boundaries[0].multiple, '2')
  assert.equal((await runFixture(t, 'context-tier', data => { data.rungs[0].inputPerMillion = '0' })).code, 1)
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
