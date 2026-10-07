import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const binary = fileURLToPath(new URL('../bin/undominated-check.mjs', import.meta.url))
const skill = 'undominated-evidence-audit'
function cli(args) {
  const result = spawnSync(process.execPath, [binary, ...args], { encoding: 'utf8', timeout: 15000 })
  assert.equal(result.status, 0, result.stderr)
  return JSON.parse(result.stdout)
}

test('portable install works in a project with spaces, Unicode, quotes and shell metacharacters', async t => {
  // macOS tmpdir can traverse /var -> /private/var; use its canonical path because the installer refuses symlinks.
  const base = await mkdtemp(join(await realpath(tmpdir()), 'undominated-portable-'))
  t.after(() => rm(base, { recursive: true, force: true }))
  const project = join(base, "project café 'single' $()")
  await mkdir(project)
  const dry = cli(['install', skill, `--project=${project}`, '--target=codex', '--dry-run', '--json'])
  assert.equal(dry.destination, join(project, '.agents', 'skills', skill))
  assert.deepEqual(await readdir(project), [])
  const installed = cli(['install', skill, '--project', project, '--target', 'codex', '--json'])
  assert.match(await readFile(join(installed.destination, 'SKILL.md'), 'utf8'), /name: undominated-evidence-audit/)
  const profile = cli(['install', 'undominated-evidence-reviewer', '--project', project, '--target', 'claude', '--json'])
  assert.equal(profile.adapter.path, join(project, '.claude', 'agents', 'undominated-evidence-reviewer.md'))
  assert.match(await readFile(profile.adapter.path, 'utf8'), /name: "undominated-evidence-reviewer"/)
  const mcp = cli(['install', 'undominated-mcp', '--project', project, '--json'])
  const config = JSON.parse(await readFile(mcp.helpers.configPath, 'utf8'))
  assert.equal(config.mcpServers.undominated.command, process.execPath)
  assert.deepEqual(config.mcpServers.undominated.args, [join(mcp.destination, 'bin', 'undominated-mcp.mjs')])
  assert.equal((await readdir(project)).includes('.mcp.json'), false)

  // Parse the generated PowerShell with a local function; never register a real MCP client in CI.
  const powershell = process.platform === 'win32' ? 'pwsh.exe' : 'pwsh'
  const available = spawnSync(powershell, ['-NoProfile', '-NonInteractive', '-Command', '$PSVersionTable.PSVersion.ToString()'], { encoding: 'utf8', timeout: 10000 })
  if (process.platform === 'win32') assert.equal(available.status, 0, 'Windows CI requires PowerShell')
  if (available.status === 0) {
    const script = join(base, 'capture.ps1')
    await writeFile(script, `function claude { ConvertTo-Json -InputObject @($args) -Compress }\n${mcp.helpers.clients.claude.shellCommands.powershell.command}\n`)
    const parsed = spawnSync(powershell, ['-NoProfile', '-NonInteractive', '-File', script], { encoding: 'utf8', timeout: 15000 })
    assert.equal(parsed.status, 0, parsed.stderr)
    assert.deepEqual(JSON.parse(parsed.stdout), mcp.helpers.clients.claude.args)
  }
})
