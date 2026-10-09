import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { installResources, installResource, resourceMain } from '../src/resources.mjs'
import { installWizard } from '../src/install-wizard.mjs'
import { main } from '../src/cli.mjs'
const skill = 'undominated-evidence-audit'
async function directory(t) { const dir = await mkdtemp(join(tmpdir(), 'undominated-wizard-')); t.after(() => rm(dir, { recursive: true, force: true })); return dir }
function prompts(answers) {
  const transcript = [], remaining = [...answers]
  return { transcript, remaining, write: text => transcript.push(text), question: async text => { transcript.push(text); assert.ok(remaining.length, `unexpected question: ${text}`); return remaining.shift() }, close() {} }
}

test('bare install opens resource picker and multi-client choices, then confirms exact project destinations', async t => {
  const project = await directory(t), ui = prompts([skill, 'claude,cursor,codex', 'project', '', 'yes'])
  const result = await main(['install'], { interactiveTTY: true, cwd: project, ui })
  assert.equal(result.code, 0, result.err)
  for (const folder of ['.claude', '.cursor', '.agents']) assert.match(await readFile(join(project, folder, 'skills', skill, 'SKILL.md'), 'utf8'), /Evidence audit/)
  assert.match(ui.transcript.join(''), /Installation preview/)
  assert.match(ui.transcript.join(''), /3 resource directories/)
  assert.equal(ui.remaining.length, 0)
})

test('shared destinations are deduplicated and receipts retain selected targets', async t => {
  const project = await directory(t)
  const batch = await installResources(skill, { project, targets: ['universal', 'codex', 'codex', 'claude'] })
  assert.equal(batch.destinations.length, 2)
  assert.equal(batch.results.length, 3)
  const receipt = JSON.parse(await readFile(join(project, '.agents', 'skills', skill, '.undominated-install.json'), 'utf8'))
  assert.deepEqual(receipt.targets, ['universal', 'codex'])
})

test('multi-agent exports share one original but write both native adapters', async t => {
  const project = await directory(t), id = 'undominated-evidence-reviewer'
  const batch = await installResources(id, { project, targets: ['claude', 'github', 'universal'] })
  assert.equal(batch.destinations.length, 1)
  assert.match(await readFile(join(project, '.claude', 'agents', `${id}.md`), 'utf8'), /name:/)
  assert.match(await readFile(join(project, '.github', 'agents', `${id}.agent.md`), 'utf8'), /name:/)
  const receipt = JSON.parse(await readFile(join(batch.destinations[0], '.undominated-install.json'), 'utf8'))
  assert.equal(receipt.generatedFiles.length, 2)
})

test('conflict in last target blocks every target before the first write', async t => {
  const project = await directory(t)
  await mkdir(join(project, '.cursor', 'skills', skill), { recursive: true })
  await assert.rejects(installResources(skill, { project, targets: ['claude', 'codex', 'cursor'] }), /already exists/)
  assert.deepEqual(await readdir(project), ['.cursor'])
})

test('native adapter conflict blocks shared agent export and the other client', async t => {
  const project = await directory(t), id = 'undominated-evidence-reviewer'
  await mkdir(join(project, '.github', 'agents'), { recursive: true })
  await writeFile(join(project, '.github', 'agents', `${id}.agent.md`), 'existing')
  await assert.rejects(installResources(id, { project, targets: ['claude', 'github'] }), /already exists/)
  assert.deepEqual(await readdir(project), ['.github'])
})

test('global skill selection uses actual client-specific directories in the supplied test home', async t => {
  const home = await directory(t), ui = prompts(['claude,codex,github,cursor', 'global', 'y'])
  const result = await installWizard({ id: skill, home, ui })
  assert.equal(result.code, 0, result.err)
  for (const folder of ['.claude', '.agents', '.copilot', '.cursor']) assert.match(await readFile(join(home, folder, 'skills', skill, 'SKILL.md'), 'utf8'), /Evidence audit/)
  assert.match(ui.transcript.join(''), /global scope/)
})

for (const bad of ['relative-home', '/not-existing-undominated-test-home', '/tmp/../escape']) test(`global rejects invalid home ${bad}`, async () => {
  await assert.rejects(installResources(skill, { scope: 'global', home: bad }), /absolute|directory missing/)
})

test('global rejects home symlinks and a preexisting client symlink before writing other selections', async t => {
  const base = await directory(t), home = join(base, 'home'), link = join(base, 'link')
  await mkdir(home); await symlink(home, link)
  await assert.rejects(installResources(skill, { scope: 'global', home: link }), /symlink/)
  await symlink(base, join(home, '.copilot'))
  await assert.rejects(installResources(skill, { scope: 'global', home, targets: ['claude', 'github'] }), /symlink/)
  assert.deepEqual(await readdir(home), ['.copilot'])
})

test('unsupported global native profiles and VS Code MCP are refused, not silently redirected', async t => {
  const home = await directory(t)
  for (const [id, target] of [['undominated-evidence-reviewer', 'github'], ['undominated-mcp', 'vscode']]) await assert.rejects(installResource(id, { scope: 'global', home, target }), /Global installation is not supported/)
  assert.deepEqual(await readdir(home), [])
})

test('global MCP preview has correct manual user-scope helpers and changes no config', async t => {
  const home = await directory(t)
  await writeFile(join(home, '.claude.json'), '{"preserved":true}')
  const batch = await installResources('undominated-mcp', { scope: 'global', home, targets: ['claude', 'codex', 'cursor'], dryRun: true })
  assert.equal(batch.destinations.length, 1)
  assert.equal(batch.results[0].helpers.clients.claude.scope, 'user')
  assert.ok(batch.results[0].helpers.clients.claude.args.includes('user'))
  assert.equal(batch.results[0].helpers.clients.claude.configPath, undefined)
  assert.equal(batch.results[2].helpers.clients.cursor.configPath, join(home, '.cursor', 'mcp.json'))
  assert.deepEqual(await readdir(home), ['.claude.json'])
})

test('multi-client MCP installation preserves existing config and exports one functioning server', async t => {
  const project = await directory(t)
  await writeFile(join(project, '.mcp.json'), '{"preserved":true}')
  const batch = await installResources('undominated-mcp', { project, targets: ['claude', 'codex', 'cursor', 'vscode'] })
  assert.equal(batch.destinations.length, 1)
  assert.equal(await readFile(join(project, '.mcp.json'), 'utf8'), '{"preserved":true}')
  assert.deepEqual((await readdir(project)).sort(), ['.mcp.json', '.undominated'])
})

for (const answers of [[null], ['cancel'], ['claude', null], ['claude', 'project', null], ['claude', 'project', '', null], ['claude', 'project', '', 'no'], ['claude', 'project', '', '']]) test(`cancellation writes nothing: ${JSON.stringify(answers)}`, async t => {
  const project = await directory(t), result = await installWizard({ id: skill, cwd: project, ui: prompts(answers) })
  assert.ok([0, 130].includes(result.code), result.err)
  assert.deepEqual(await readdir(project), [])
})

test('interactive dry run ends at preview without confirming or writing', async t => {
  const project = await directory(t), ui = prompts(['claude,codex', 'project', ''])
  const result = await installWizard({ id: skill, cwd: project, dryRun: true, ui })
  assert.equal(result.code, 0, result.err)
  assert.equal(ui.remaining.length, 0)
  assert.deepEqual(await readdir(project), [])
})

test('invalid choices reprompt without silently choosing the first tool', async t => {
  const project = await directory(t), ui = prompts(['', '99', 'codex,invalid', 'claude', 'wrong', 'project', '', 'n'])
  const result = await installWizard({ id: skill, cwd: project, ui })
  assert.equal(result.code, 0)
  assert.deepEqual(await readdir(project), [])
  assert.match(ui.transcript.join(''), /Choose from the listed options/)
})

test('nonTTY, JSON and CI flows never request wizard input; explicit interactive failure is actionable', async t => {
  const project = await directory(t), ui = { question: () => { throw new Error('must not prompt') } }
  for (const args of [['install', skill], ['install', skill, '--json'], ['install', '--interactive'], ['install', skill, '--interactive', '--json']]) {
    const result = await resourceMain(args, { interactiveTTY: false, ui })
    assert.equal(result.code, 1)
  }
  const explicit = await resourceMain(['install', skill, '--project', project, '--dry-run', '--json'], { interactiveTTY: true, ui })
  assert.equal(explicit.code, 0)
  assert.equal(JSON.parse(explicit.out).dryRun, true)
  assert.deepEqual(await readdir(project), [])
})

test('scripted global dry run is explicit and project/global cannot both be supplied', async t => {
  const home = await directory(t)
  const result = await resourceMain(['install', skill, '--global', '--target', 'github', '--dry-run', '--json'], { home })
  assert.equal(result.code, 0, result.err)
  assert.equal(JSON.parse(result.out).destination, join(home, '.copilot', 'skills', skill))
  assert.equal((await resourceMain(['install', skill, '--global', '--project', home])).code, 1)
  assert.deepEqual(await readdir(home), [])
})

test('confirmation rechecks destination, refusing files that appeared after preview', async t => {
  const project = await directory(t), ui = prompts(['claude', 'project', '', 'yes']), question = ui.question
  ui.question = async text => {
    if (text.startsWith('Install these')) await mkdir(join(project, '.claude', 'skills', skill), { recursive: true })
    return question(text)
  }
  const result = await installWizard({ id: skill, cwd: project, ui })
  assert.equal(result.code, 1)
  assert.match(result.err, /already exists/)
  assert.deepEqual(await readdir(join(project, '.claude', 'skills', skill)), [])
})


test('display names, case-insensitive keys and common client aliases work in multi-selection', async t => {
  const project = await directory(t), ui = prompts(['Claude Code, CoDeX, github-copilot, CURSOR', 'PROJECT', '', 'y'])
  const result = await installWizard({ id: skill, cwd: project, ui })
  assert.equal(result.code, 0, result.err)
  for (const folder of ['.claude', '.agents', '.github', '.cursor']) assert.match(await readFile(join(project, folder, 'skills', skill, 'SKILL.md'), 'utf8'), /Evidence audit/)
})
