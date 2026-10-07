/** Offline resource discovery and explicit project-local installation. */
import { createHash, timingSafeEqual } from 'node:crypto'
import { lstat, mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, join, parse, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

export const RESOURCE_ROOT = fileURLToPath(new URL('../resources/', import.meta.url))
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const HASH = /^[a-f0-9]{64}$/
export const RESOURCE_USAGE = `undominated-check resources / install — original skills, agents and MCP server

Usage
  undominated-check resources list [--json]
  undominated-check resources inspect <id> [--json]
  undominated-check resources install <id> --project <dir> [--target <target>] [--dry-run] [--json]
  undominated-check install <id> --project <dir> [--target <target>] [--dry-run] [--json]

Targets
  Skills:
    --target universal   -> .agents/skills/<id> (default)
    --target claude      -> .claude/skills/<id>
    --target codex       -> .codex/skills/<id>
  Agents:
    --target universal   -> .agents/<id> (default)
    --target claude      -> .claude/agents/<id>
    --target github      -> .github/agents/<id>
    --target undominated -> .undominated/agents/<id>
  MCP servers:
    Installed to .undominated/mcp/<id> along with mcp-config.json.
    Generates ready-to-run setup commands and client configuration snippets.

Options
  --project <dir>   Existing absolute directory (mandatory for install).
  --target <target> Target environment: universal, claude, codex, github, undominated.
  --dry-run         Simulate install without creating directories or writing files.
  --json            Print machine-readable JSON output.
  --help, -h        Show this help message.

Examples
  # Install skills across environments
  npx undominated-check install undominated-evidence-audit --project /abs/path/to/project
  npx undominated-check install undominated-evidence-audit --project /abs/path/to/project --target claude
  npx undominated-check install undominated-evidence-audit --project /abs/path/to/project --target codex

  # Install portable agent profiles
  npx undominated-check install undominated-evidence-reviewer --project /abs/path/to/project
  npx undominated-check install undominated-evidence-reviewer --project /abs/path/to/project --target claude
  npx undominated-check install undominated-evidence-reviewer --project /abs/path/to/project --target github

  # Install MCP server with ready-to-run client setup
  npx undominated-check install undominated-mcp --project /abs/path/to/project

Safety & Behaviour
  Install copies bundled files only. Zero downloads, dependency installs, code execution,
  credentials or existing-config changes. Existing destinations and symlinks are strictly
  rejected; updates require reviewed removal. --project must be an existing absolute path.`

function safeRelative(value) {
  if (typeof value !== 'string' || !value || value.includes('\\') || value.includes('\0') || isAbsolute(value) || value.split('/').some(part => !part || part === '.' || part === '..')) {
    throw new Error(`unsafe resource path: ${String(value)}`)
  }
  // Archives must install consistently on Windows as well as POSIX filesystems.
  if (value.split('/').some(part => !/^[A-Za-z0-9._-]+$/.test(part) || part.endsWith('.') || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part))) {
    throw new Error(`nonportable resource path: ${value}`)
  }
  return value
}

async function statOrNull(path) {
  try { return await lstat(path) } catch (error) { if (error.code === 'ENOENT') return null; throw error }
}

// Walk from the filesystem root so a symlink in an ancestor cannot hide behind resolve().
async function assertDirectories(path, { create = false } = {}) {
  const absolute = resolve(path)
  let current = parse(absolute).root
  for (const component of absolute.slice(current.length).split(sep).filter(Boolean)) {
    current = join(current, component)
    let stat = await statOrNull(current)
    if (!stat && create) {
      try { await mkdir(current, { mode: 0o755 }) } catch (error) { if (error.code !== 'EEXIST') throw error }
      stat = await lstat(current)
    }
    if (!stat || !stat.isDirectory() || stat.isSymbolicLink()) throw new Error(`directory missing or symlink not allowed: ${current}`)
  }
}

async function sourceFile(root, item, file) {
  const path = resolve(root, safeRelative(item.path), safeRelative(file.path))
  if (relative(root, path).startsWith(`..${sep}`)) throw new Error('source escapes resource bundle')
  await assertDirectories(dirname(path))
  const stat = await lstat(path)
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`resource is not a regular file: ${path}`)
  const body = await readFile(path)
  const digest = createHash('sha256').update(body).digest('hex')
  if (!HASH.test(file.sha256 ?? '') || !timingSafeEqual(Buffer.from(digest), Buffer.from(file.sha256))) {
    throw new Error(`resource integrity mismatch: ${item.id}/${file.path}`)
  }
  return body
}

export async function loadResources(root = RESOURCE_ROOT) {
  await assertDirectories(root)
  const manifestPath = join(root, 'manifest.json')
  const manifestStat = await lstat(manifestPath)
  if (!manifestStat.isFile() || manifestStat.isSymbolicLink()) throw new Error('manifest must be a regular file')
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.resources)) throw new Error('unsupported resource manifest')
  const identities = new Set()
  for (const item of manifest.resources) {
    if (!ID.test(item.id) || identities.has(item.id)) throw new Error('invalid or duplicate resource id')
    identities.add(item.id)
    if (!['skill', 'agent', 'mcp-server'].includes(item.kind)) throw new Error('unsupported resource kind')
    safeRelative(item.path)
    safeRelative(item.entrypoint)
    if (!Array.isArray(item.files) || !item.files.length) throw new Error('resource has no files')
    const paths = new Set(), portablePaths = new Set()
    const reserved = new Set(['.undominated-install.json', ...(item.kind === 'mcp-server' ? ['mcp-config.json'] : [])])
    for (const file of item.files) {
      safeRelative(file.path)
      const folded = file.path.toLowerCase()
      if (portablePaths.has(folded) || !HASH.test(file.sha256 ?? '')) throw new Error('invalid or duplicate resource file')
      if (reserved.has(folded) || [...reserved].some(name => folded.startsWith(`${name}/`))) throw new Error(`reserved installer path: ${file.path}`)
      paths.add(file.path)
      portablePaths.add(folded)
    }
    for (const path of portablePaths) {
      const parts = path.split('/')
      for (let i = 1; i < parts.length; i++) {
        if (portablePaths.has(parts.slice(0, i).join('/'))) throw new Error(`file/directory path collision: ${path}`)
      }
    }
    if (!paths.has(item.entrypoint) || !paths.has('LICENSE')) throw new Error('resource is missing entrypoint or license')
  }
  return manifest.resources
}

export async function inspectResource(id, { root = RESOURCE_ROOT } = {}) {
  if (!ID.test(id)) throw new Error('invalid resource id')
  const item = (await loadResources(root)).find(resource => resource.id === id)
  if (!item) throw new Error(`unknown resource: ${id}`)
  const content = []
  for (const file of item.files) content.push({ path: file.path, body: await sourceFile(root, item, file) })
  return { item, content }
}

const VALID_TARGETS = new Set(['universal', 'claude', 'codex', 'github', 'undominated', 'agents'])

export async function installResource(id, { project, target = 'universal', dryRun = false, root = RESOURCE_ROOT } = {}) {
  if (!project || !isAbsolute(project) || project.split(/[\\/]/).includes('..')) throw new Error('--project must be an existing absolute directory without parent traversal')
  if (!VALID_TARGETS.has(target)) throw new Error('--target must be universal, claude, codex, github or undominated')
  await assertDirectories(project)
  const projectRoot = resolve(project)
  const { item, content } = await inspectResource(id, { root })
  const parent = item.kind === 'skill'
    ? (target === 'claude'
        ? join(projectRoot, '.claude', 'skills')
        : target === 'codex'
        ? join(projectRoot, '.codex', 'skills')
        : target === 'github'
        ? join(projectRoot, '.github', 'skills')
        : target === 'undominated'
        ? join(projectRoot, '.undominated', 'skills')
        : join(projectRoot, '.agents', 'skills'))
    : item.kind === 'agent'
    ? (target === 'claude'
        ? join(projectRoot, '.claude', 'agents')
        : target === 'github'
        ? join(projectRoot, '.github', 'agents')
        : target === 'undominated'
        ? join(projectRoot, '.undominated', 'agents')
        : target === 'codex'
        ? join(projectRoot, '.codex', 'agents')
        : join(projectRoot, '.agents'))
    : join(projectRoot, '.undominated', 'mcp')
  const destination = join(parent, item.id)
  // Dry-run checks existing ancestors without creating them.
  let ancestor = parent
  while (!(await statOrNull(ancestor))) ancestor = dirname(ancestor)
  await assertDirectories(ancestor)
  if (await statOrNull(destination)) throw new Error(`destination already exists; nothing overwritten: ${destination}`)
  let helpers
  if (item.kind === 'mcp-server') {
    const entrypointPath = join(destination, item.entrypoint)
    const config = { mcpServers: { undominated: { command: process.execPath, args: [entrypointPath] } } }
    content.push({ path: 'mcp-config.json', body: Buffer.from(`${JSON.stringify(config, null, 2)}\n`) })
    helpers = {
      claudeCommand: `claude mcp add undominated node ${entrypointPath}`,
      cursorConfig: {
        mcpServers: {
          undominated: {
            command: 'node',
            args: [entrypointPath],
          },
        },
      },
      vscodeConfig: {
        mcp: {
          servers: {
            undominated: {
              command: 'node',
              args: [entrypointPath],
            },
          },
        },
      },
      configPath: join(destination, 'mcp-config.json'),
    }
  }
  const note = item.kind === 'agent'
    ? 'Portable profile exported. Load AGENT.md manually; no native agent was registered.'
    : item.kind === 'mcp-server'
    ? 'Server copied. Ready-to-run setup commands and configuration snippets generated; server not started.'
    : 'Skill copied. Client discovery depends on the selected target.'
  const result = { id, kind: item.kind, destination, dryRun, files: content.map(file => file.path), note, ...(helpers ? { helpers } : {}) }
  if (dryRun) return result
  await assertDirectories(parent, { create: true })
  // mkdir is exclusive: existing empty directories are also protected against replacement.
  await mkdir(destination, { mode: 0o755 })
  for (const file of content) {
    const output = join(destination, safeRelative(file.path))
    await assertDirectories(dirname(output), { create: true })
    await writeFile(output, file.body, { flag: 'wx', mode: 0o644 })
  }
  await writeFile(join(destination, '.undominated-install.json'), `${JSON.stringify({ schemaVersion: 1, id, version: item.version, files: item.files }, null, 2)}\n`, { flag: 'wx', mode: 0o644 })
  return result
}

export async function resourceMain(argv, { root = RESOURCE_ROOT } = {}) {
  try {
    if (!argv.length || argv.includes('--help') || argv.includes('-h')) return { code: 0, out: `${RESOURCE_USAGE}\n`, err: '' }
    const command = argv[0], positional = [], options = { root }
    let json = false
    for (let i = 1; i < argv.length; i++) {
      const arg = argv[i]
      if (arg === '--json') json = true
      else if (arg === '--dry-run') options.dryRun = true
      else if (arg === '--project' || arg === '--target') {
        if (!argv[i + 1] || argv[i + 1].startsWith('-')) throw new Error(`missing value for ${arg}`)
        options[arg.slice(2)] = argv[++i]
      } else if (arg.startsWith('--project=')) {
        options.project = arg.slice('--project='.length)
      } else if (arg.startsWith('--target=')) {
        options.target = arg.slice('--target='.length)
      } else if (arg.startsWith('-')) throw new Error(`unknown option: ${arg}`)
      else positional.push(arg)
    }
    if (command !== 'install' && (options.project || options.target || options.dryRun)) throw new Error('project, target and dry-run options are only valid for install')
    if (command === 'list' && !positional.length) {
      const resources = await loadResources(root)
      const out = json ? JSON.stringify(resources, null, 2) : resources.map(item => `${item.id}\t${item.kind}\t${item.description}`).join('\n')
      return { code: 0, out: `${out}\n`, err: '' }
    }
    if (positional.length !== 1) throw new Error('expected exactly one resource id')
    if (command === 'inspect') {
      const { item, content } = await inspectResource(positional[0], options)
      const entry = content.find(file => file.path === item.entrypoint).body.toString('utf8')
      const out = json ? JSON.stringify({ ...item, content: entry }, null, 2) : `${item.name} (${item.id})\nLicense: ${item.license}\nFiles verified: ${item.files.length}\n\n${entry}`
      return { code: 0, out: `${out}\n`, err: '' }
    }
    if (command === 'install') {
      const result = await installResource(positional[0], options)
      let out
      if (json) {
        out = JSON.stringify(result, null, 2)
      } else {
        const lines = [
          `${result.dryRun ? 'Would install' : 'Installed'} ${result.id}`,
          result.destination,
          result.note,
        ]
        if (result.helpers) {
          lines.push(
            '',
            'Ready-to-run setup command (Claude Code):',
            `  ${result.helpers.claudeCommand}`,
            '',
            'Cursor configuration (.cursor/mcp.json):',
            JSON.stringify(result.helpers.cursorConfig, null, 2).split('\n').map(l => `  ${l}`).join('\n'),
            '',
            'VS Code configuration (.vscode/settings.json):',
            JSON.stringify(result.helpers.vscodeConfig, null, 2).split('\n').map(l => `  ${l}`).join('\n'),
          )
        }
        out = lines.join('\n')
      }
      return { code: 0, out: `${out}\n`, err: '' }
    }
    throw new Error(`unknown resource command: ${command}`)
  } catch (error) {
    return { code: 1, out: '', err: `${error.message}\n` }
  }
}
