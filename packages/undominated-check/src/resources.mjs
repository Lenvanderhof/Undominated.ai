/** Offline resource discovery and explicit project-local installation. */
import { createHash, timingSafeEqual } from 'node:crypto'
import { lstat, mkdir, readFile, unlink, rmdir, open } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, isAbsolute, join, parse, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

export const RESOURCE_ROOT = fileURLToPath(new URL('../resources/', import.meta.url))
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const HASH = /^[a-f0-9]{64}$/
export const RESOURCE_USAGE = `undominated-check resources / install — bundled skills, profiles and MCP server

  resources list [--json]
  resources inspect <id> [--json]
  install [id]                    Guided setup in your terminal
  resources install [id]          Same guided setup
  install <id> --project <existing-absolute-directory>
          [--target <target>] [--dry-run] [--json]
  install <id> --global [--target <target>] [--dry-run] [--json]
  install [id] --interactive       Explicit guided setup; never with --json

Guided setup lets you choose multiple clients, project/global scope, and review
every destination before confirmation. Cancelling before confirmation writes nothing.
Explicit --project/--global commands preserve non-interactive operation.

Both --project=PATH and --target=NAME are accepted.
Skills: universal/codex -> .agents/skills/<id>; claude -> .claude/skills/<id>;
        github -> .github/skills/<id> (.copilot/skills globally);
        cursor -> .cursor/skills/<id>; undominated -> .undominated/skills/<id>.
Profiles: universal/undominated -> .undominated/agents/<id> (portable original).
          claude additionally writes .claude/agents/<id>.md;
          github additionally writes .github/agents/<id>.agent.md.
Native adapters inherit the host's tools, model and permission policy. Reload the
client and verify discovery; the installer does not start or invoke an agent.
MCP: .undominated/mcp/<id> plus mcp-config.json and manual setup helpers.
     Targets: universal, undominated, claude, codex, cursor, vscode.
     Claude helper matches project/user scope; Codex changes user config if run.
Global scope uses your home directory. Global GitHub profiles and VS Code MCP
helpers are not supported; use project scope. Global exports stay on this machine.

Install copies verified bundled files only. No downloads, dependency installs,
execution, credentials or existing-config changes. Existing destinations and
symlinks are rejected. --dry-run creates nothing. Scripts must select an explicit
--project or --global scope. No prompts when output is piped or CI is enabled.
Shell helpers are labelled POSIX sh or PowerShell; not Windows cmd.exe.`

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
async function assertDirectories(path, { create = false, created = [] } = {}) {
  const absolute = resolve(path)
  let current = parse(absolute).root
  for (const component of absolute.slice(current.length).split(sep).filter(Boolean)) {
    current = join(current, component)
    let stat = await statOrNull(current)
    if (!stat && create) {
      try { await mkdir(current, { mode: 0o755 }); created.push(current) } catch (error) { if (error.code !== 'EEXIST') throw error }
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

export const TARGETS = {
  skill: ['universal', 'claude', 'codex', 'github', 'cursor', 'undominated'],
  agent: ['universal', 'undominated', 'claude', 'github'],
  'mcp-server': ['universal', 'undominated', 'claude', 'codex', 'cursor', 'vscode'],
}
const CONTROL = /[\u0000-\u001f\u007f-\u009f]/

async function assertNewDestination(path) {
  let ancestor = dirname(path)
  while (!(await statOrNull(ancestor))) ancestor = dirname(ancestor)
  await assertDirectories(ancestor)
  if (await statOrNull(path)) throw new Error(`destination already exists; nothing overwritten: ${path}`)
}

function shellHelper(command, args, scope) {
  // Every token is quoted, including executable paths. Never concatenate user paths as shell syntax.
  const posix = value => `'${value.replaceAll("'", "'\"'\"'")}'`
  const powershell = value => `'${value.replaceAll("'", "''")}'`
  const tokens = [command, ...args]
  return {
    command, args, scope,
    shellCommands: {
      posix: { shell: 'POSIX sh (Linux/macOS)', command: tokens.map(posix).join(' ') },
      powershell: { shell: 'PowerShell (not cmd.exe)', command: `& ${tokens.map(powershell).join(' ')}` },
    },
  }
}

function mcpHelpers(project, destination, item, target, scope) {
  const entrypoint = join(destination, item.entrypoint)
  // JSON escaping does not stop a client from interpreting its own ${variable} syntax.
  if ([entrypoint, process.execPath].some(value => value.includes('${') || CONTROL.test(value))) {
    throw new Error('MCP setup paths must not contain control characters or ${variable} interpolation; choose a different project path')
  }
  const server = { type: 'stdio', command: process.execPath, args: [entrypoint] }
  const portableConfig = { mcpServers: { undominated: server } }
  const all = target === 'universal' || target === 'undominated'
  const clients = {}
  if (all || target === 'claude') clients.claude = {
    ...shellHelper('claude', ['mcp', 'add', '--scope', scope === 'global' ? 'user' : 'project', '--transport', 'stdio', 'undominated', '--', process.execPath, entrypoint], scope === 'global' ? 'user' : 'project'),
    ...(scope === 'project' ? { cwd: project, configPath: join(project, '.mcp.json'), config: portableConfig } : {}),
  }
  if (all || target === 'codex') clients.codex = {
    ...shellHelper('codex', ['mcp', 'add', 'undominated', '--', process.execPath, entrypoint], 'user'),
    note: 'Running this command changes Codex user configuration, not a project-only configuration.',
  }
  if (all || target === 'cursor') clients.cursor = {
    scope: scope === 'global' ? 'user' : 'project', configPath: join(project, '.cursor', 'mcp.json'), config: portableConfig,
  }
  if ((all || target === 'vscode') && scope === 'project') clients.vscode = {
    scope: 'project', configPath: join(project, '.mcp.json'), config: portableConfig,
    legacyConfigPath: join(project, '.vscode', 'mcp.json'),
    legacyConfig: { servers: { undominated: server } },
  }
  return {
    configPath: join(destination, 'mcp-config.json'),
    server, clients,
    note: 'Manual setup only. Review and merge the selected snippet into existing client configuration; do not replace it. Commands may register or start the server when you run them.',
  }
}

function nativeAgent(item, content, project, destination, target) {
  if (!['claude', 'github'].includes(target)) return null
  if (typeof item.description !== 'string' || !item.description.trim()) throw new Error('native agent adapter requires a resource description')
  const original = content.find(file => file.path === item.entrypoint).body.toString('utf8')
  const body = original.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '').replace(
    /This is a portable agent instruction profile\.[^\n]*/,
    `This is a native ${target === 'claude' ? 'Claude' : 'GitHub'} adapter of the original portable profile preserved separately. Its tools, model and permission gates come from the host; this adapter does not restrict tools or bypass approval. Reload and verify discovery in the client.${target === 'github' ? ' GitHub cloud selection additionally requires the profile to be committed to the appropriate repository branch.' : ''}`,
  )
  const path = join(project, target === 'claude' ? '.claude' : '.github', 'agents', `${item.id}${target === 'claude' ? '.md' : '.agent.md'}`)
  const originalPath = join(destination, item.entrypoint)
  const link = relative(dirname(path), originalPath).split(sep).join('/')
  // JSON strings are YAML-compatible scalars, so metadata cannot introduce new frontmatter fields.
  const header = `---\nname: ${JSON.stringify(item.id)}\ndescription: ${JSON.stringify(item.description)}\n---\n\n`
  const text = `${header}<!-- Generated adapter. Original MIT profile and LICENSE: ${link} -->\n\n${body}`
  return {
    path, body: Buffer.from(text),
    info: {
      client: target, path, sourceProfile: originalPath,
      format: target === 'claude' ? 'claude-subagent-markdown' : 'github-agent-markdown',
      toolAccess: 'inherited-from-host', model: 'inherited-from-host', permissions: 'host-controlled',
      note: 'Native adapter written for client discovery. Reload and confirm it in the client; no agent was started or invoked. Tools are not restricted by this adapter.',
    },
  }
}

async function prepareResource(id, { project, target = 'universal', dryRun = false, root = RESOURCE_ROOT, scope = 'project', home = homedir() } = {}) {
  if (!['project', 'global'].includes(scope)) throw new Error('scope must be project or global')
  if (scope === 'global') {
    if (project !== undefined) throw new Error('--global and --project cannot be combined')
    project = home
  }
  if (typeof project !== 'string' || !project || !isAbsolute(project) || project.split(/[\\/]/).includes('..') || CONTROL.test(project)) {
    throw new Error('--project must be an existing absolute directory without parent traversal or control characters')
  }
  if (typeof dryRun !== 'boolean') throw new Error('dryRun must be a boolean')
  if (!Object.values(TARGETS).some(targets => targets.includes(target))) throw new Error(`unknown --target: ${String(target)}`)
  await assertDirectories(project)
  const projectRoot = resolve(project)
  const { item, content } = await inspectResource(id, { root })
  if (!TARGETS[item.kind].includes(target)) throw new Error(`--target ${target} is not supported for ${item.kind}; choose ${TARGETS[item.kind].join(', ')}`)
  if (scope === 'global' && !supportsGlobal(item.kind, target)) throw new Error(`Global installation is not supported for ${item.kind}/${target}; use project scope`)
  const skillFolder = { universal: '.agents', codex: '.agents', claude: '.claude', github: scope === 'global' ? '.copilot' : '.github', cursor: '.cursor', undominated: '.undominated' }
  const parent = item.kind === 'skill'
    ? join(projectRoot, skillFolder[target], 'skills')
    : join(projectRoot, '.undominated', item.kind === 'agent' ? 'agents' : 'mcp')
  const destination = join(parent, item.id)
  let helpers, adapter
  if (item.kind === 'mcp-server') {
    helpers = mcpHelpers(projectRoot, destination, item, target, scope)
    const config = { mcpServers: { undominated: helpers.server } }
    content.push({ path: 'mcp-config.json', body: Buffer.from(`${JSON.stringify(config, null, 2)}\n`) })
  }
  if (item.kind === 'agent') adapter = nativeAgent(item, content, projectRoot, destination, target)
  // Check every requested output before creating any directory, including a native adapter's tree.
  await assertNewDestination(destination)
  if (adapter) await assertNewDestination(adapter.path)
  const note = item.kind === 'agent'
    ? adapter ? adapter.info.note : 'Portable profile exported. Load AGENT.md manually; no native agent was registered.'
    : item.kind === 'mcp-server'
      ? 'Server export and manual setup helpers prepared. No client configuration changed; server not started.'
      : target === 'undominated' ? 'Skill exported to an Undominated directory; load it manually.' : 'Skill copied to the selected client directory. Verify discovery in the client.'
  const result = {
    id, kind: item.kind, target, scope, destination, dryRun,
    files: content.map(file => file.path), note,
    ...(helpers ? { helpers } : {}), ...(adapter ? { adapter: adapter.info } : {}),
  }
  const outputs = content.map(file => ({ path: join(destination, safeRelative(file.path)), body: file.body }))
  if (adapter) outputs.push({ path: adapter.path, body: adapter.body })
  const generatedFiles = []
  if (helpers) generatedFiles.push({ path: helpers.configPath, sha256: createHash('sha256').update(content.find(file => file.path === 'mcp-config.json').body).digest('hex') })
  if (adapter) generatedFiles.push({ path: adapter.path, sha256: createHash('sha256').update(adapter.body).digest('hex') })
  return { result, outputs, metadata: { schemaVersion: 1, id, version: item.version, target, scope, files: item.files, generatedFiles } }
}

export function supportsGlobal(kind, target) {
  // GitHub profile global discovery and VS Code user config differ across products.
  // Offer only the global paths whose native format we actually support.
  return !(kind === 'agent' && target === 'github') && !(kind === 'mcp-server' && target === 'vscode')
}

export async function installResources(id, { targets = ['universal'], dryRun = false, ...options } = {}) {
  if (!Array.isArray(targets) || !targets.length || targets.some(target => typeof target !== 'string')) throw new Error('choose at least one target')
  if (typeof dryRun !== 'boolean') throw new Error('dryRun must be a boolean')
  const plans = []
  for (const target of new Set(targets)) plans.push(await prepareResource(id, { ...options, target, dryRun }))
  const files = new Map(), directories = new Map()
  for (const plan of plans) {
    const existing = directories.get(plan.result.destination)
    if (existing) {
      existing.targets.push(plan.result.target)
      existing.metadata.generatedFiles.push(...plan.metadata.generatedFiles.filter(file => !existing.metadata.generatedFiles.some(old => old.path === file.path)))
    } else directories.set(plan.result.destination, { targets: [plan.result.target], metadata: plan.metadata })
    for (const file of plan.outputs) {
      if (files.has(file.path) && !files.get(file.path).equals(file.body)) throw new Error(`conflicting generated output: ${file.path}`)
      files.set(file.path, file.body)
    }
  }
  for (const [destination, entry] of directories) files.set(join(destination, '.undominated-install.json'), Buffer.from(`${JSON.stringify({ ...entry.metadata, targets: entry.targets }, null, 2)}\n`))
  // All target conflicts, hashes, symlinks and existing destinations are checked before the first write.
  for (const file of files.keys()) await assertNewDestination(file)
  const results = plans.map(plan => {
    if (!dryRun) return plan.result
    const result = { ...plan.result, note: 'Preview only; no files written. No client configuration changed or resource executed.' }
    if (result.adapter) result.adapter = { ...result.adapter, note: 'Native adapter would be written; client discovery has not been checked.' }
    return result
  })
  if (dryRun) return { id, dryRun, results, destinations: [...directories.keys()], fileCount: files.size }
  const createdFiles = [], createdDirectories = []
  try {
    for (const destination of directories.keys()) {
      await assertDirectories(dirname(destination), { create: true, created: createdDirectories })
      await mkdir(destination, { mode: 0o755 })
      createdDirectories.push(destination)
    }
    for (const [path, body] of files) {
      await assertDirectories(dirname(path), { create: true, created: createdDirectories })
      const handle = await open(path, 'wx', 0o644)
      createdFiles.push(path)
      try { await handle.writeFile(body) } finally { await handle.close() }
    }
  } catch (error) {
    // Never recursively delete a tree: concurrent files must survive cleanup.
    for (const path of createdFiles.reverse()) await unlink(path).catch(() => {})
    for (const path of createdDirectories.reverse()) await rmdir(path).catch(() => {})
    throw error
  }
  return { id, dryRun, results, destinations: [...directories.keys()], fileCount: files.size }
}

export async function installResource(id, { target = 'universal', ...options } = {}) {
  return (await installResources(id, { ...options, targets: [target] })).results[0]
}

export async function resourceMain(argv, deps = {}) {
  const { root = RESOURCE_ROOT } = deps
  try {
    if (!argv.length || (argv.length === 1 && ['--help', '-h'].includes(argv[0]))) return { code: 0, out: `${RESOURCE_USAGE}\n`, err: '' }
    const command = argv[0], positional = [], options = { root }, seen = new Set()
    if (!['list', 'inspect', 'install'].includes(command)) throw new Error(`unknown resource command: ${command}`)
    let json = false, help = false
    for (let i = 1; i < argv.length; i++) {
      const arg = argv[i], equal = arg.indexOf('='), name = equal < 0 ? arg : arg.slice(0, equal)
      if (['--json', '--dry-run', '--help', '-h', '--project', '--target', '--interactive', '--global'].includes(name)) {
        const key = name === '-h' ? '--help' : name
        if (seen.has(key)) throw new Error(`duplicate option: ${key}`)
        seen.add(key)
        if (name === '--project' || name === '--target') {
          const value = equal < 0 ? argv[++i] : arg.slice(equal + 1)
          if (!value || value.startsWith('-')) throw new Error(`missing value for ${name}`)
          options[name.slice(2)] = value
        } else {
          if (equal >= 0) throw new Error(`${name} does not accept a value`)
          if (name === '--json') json = true
          else if (name === '--dry-run') options.dryRun = true
          else if (name === '--global') options.scope = 'global'
          else if (name === '--interactive') options.interactive = true
          else help = true
        }
      } else if (arg.startsWith('-')) throw new Error(`unknown option: ${arg}`)
      else positional.push(arg)
    }
    if (command !== 'install' && ['--project', '--target', '--dry-run', '--global', '--interactive'].some(name => seen.has(name))) throw new Error('project, target and dry-run options are only valid for install')
    if (help) return { code: 0, out: `${RESOURCE_USAGE}\n`, err: '' }
    if (command === 'list' && !positional.length) {
      const resources = await loadResources(root)
      const out = json ? JSON.stringify(resources, null, 2) : resources.map(item => `${item.id}\t${item.kind}\t${item.description}`).join('\n')
      return { code: 0, out: `${out}\n`, err: '' }
    }
    if (options.scope === 'global' && options.project !== undefined) throw new Error('--global and --project cannot be combined')
    const input = deps.input ?? process.stdin, output = deps.output ?? process.stderr
    const terminal = deps.interactiveTTY ?? Boolean(input.isTTY && process.stdout.isTTY && output.isTTY && !deps.env?.CI && !process.env.CI)
    if (command === 'install' && (options.interactive || (terminal && !options.project && !options.scope && !json))) {
      if (json) throw new Error('--interactive cannot be combined with --json')
      if (!terminal) throw new Error('Interactive setup requires a terminal. Use --project /absolute/path or --global with --target for scripted installation.')
      if (positional.length > 1) throw new Error('expected at most one resource id for interactive install')
      const { installWizard, terminalPrompts } = await import('./install-wizard.mjs')
      return installWizard({ id: positional[0], ...options, ...(deps.cwd ? { cwd: deps.cwd } : {}), ...(deps.home ? { home: deps.home } : {}), ui: deps.ui ?? terminalPrompts(input, output) })
    }
    if (positional.length !== 1 || command === 'list') throw new Error('expected exactly one resource id for inspect or install, and none for list')
    if (command === 'inspect') {
      const { item, content } = await inspectResource(positional[0], options)
      const entry = content.find(file => file.path === item.entrypoint).body.toString('utf8')
      const out = json ? JSON.stringify({ ...item, content: entry }, null, 2) : `${item.name} (${item.id})\nLicense: ${item.license}\nFiles verified: ${item.files.length}\n\n${entry}`
      return { code: 0, out: `${out}\n`, err: '' }
    }
    const result = await installResource(positional[0], { ...options, ...(deps.home ? { home: deps.home } : {}) })
    const lines = [`${result.dryRun ? 'Would install' : 'Installed'} ${result.id}`, result.destination, result.note]
    if (result.adapter) lines.push(`Native adapter: ${result.adapter.path}`, 'Tools, model and permission policy: inherited from the host; no permission bypass configured.')
    if (result.helpers) {
      lines.push('', result.helpers.note, `Generated config: ${result.helpers.configPath}`)
      for (const [client, setup] of Object.entries(result.helpers.clients)) {
        lines.push('', `${client} manual setup (${setup.scope} scope):`)
        if (setup.cwd) lines.push(`Run from project: ${JSON.stringify(setup.cwd)}`)
        if (setup.note) lines.push(setup.note)
        if (setup.shellCommands) for (const shell of Object.values(setup.shellCommands)) lines.push(`${shell.shell}:`, `  ${shell.command}`)
        if (setup.config) lines.push(`Merge into ${setup.configPath}:`, JSON.stringify(setup.config, null, 2))
      }
    }
    return { code: 0, out: `${json ? JSON.stringify(result, null, 2) : lines.join('\n')}\n`, err: '' }
  } catch (error) {
    return { code: 1, out: '', err: `${error.message}\n` }
  }
}
