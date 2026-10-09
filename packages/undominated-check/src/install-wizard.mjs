import { createInterface } from 'node:readline'
import { homedir } from 'node:os'
import { resolve } from 'node:path'
import { inspectResource, installResources, loadResources, supportsGlobal, TARGETS } from './resources.mjs'

const LABELS = { universal: 'Shared Agent Skills directory (.agents) / portable export', claude: 'Claude Code', codex: 'Codex', github: 'GitHub Copilot', cursor: 'Cursor', vscode: 'VS Code', undominated: 'Undominated portable export (manual loading)' }
const ALIASES = { claude: ['claude-code'], github: ['github-copilot', 'copilot'], vscode: ['vs-code', 'visual studio code'] }
const CANCELLED = Symbol('cancelled')
const safe = value => String(value).replace(/[\u0000-\u001f\u007f-\u009f]/g, char => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`)

export function terminalPrompts(input = process.stdin, output = process.stderr) {
  const rl = createInterface({ input, output, terminal: true })
  let closed = false, pending
  const cancel = () => { closed = true; if (pending) pending(null); pending = undefined }
  rl.on('SIGINT', () => { output.write('\n'); cancel(); rl.close() })
  rl.on('close', cancel)
  return {
    write: text => output.write(text),
    question: prompt => closed ? Promise.resolve(null) : new Promise(resolve => {
      pending = resolve
      rl.question(prompt, answer => { pending = undefined; resolve(answer) })
    }),
    close: () => rl.close(),
  }
}

async function ask(ui, prompt) {
  const answer = await ui.question(prompt)
  if (answer === null || answer === undefined || /^(?:q|quit|cancel)$/i.test(answer.trim())) throw CANCELLED
  return answer.trim()
}
async function choose(ui, prompt, items, { multiple = false } = {}) {
  ui.write(`\n${prompt}\n${items.map((item, i) => `  ${i + 1}. ${safe(item.label)}`).join('\n')}\n`)
  while (true) {
    const answer = await ask(ui, multiple ? 'Enter one or more numbers or names, separated by commas: ' : 'Enter a number or name: ')
    const tokens = multiple ? answer.split(',').map(value => value.trim()) : [answer]
    const values = tokens.map(token => {
      if (/^\d+$/.test(token)) return items[Number(token) - 1]?.value
      const key = token.toLowerCase().replace(/\s+/g, ' ')
      const matches = items.filter(item => [item.value, item.label, ...(item.aliases ?? [])].some(value => value.toLowerCase().replace(/\s+/g, ' ') === key))
      return matches.length === 1 ? matches[0].value : undefined
    })
    if (values.length && values.every(value => value !== undefined && value !== '')) return multiple ? [...new Set(values)] : values[0]
    ui.write('Choose from the listed options, or type cancel.\n')
  }
}

export async function installWizard({ id, root, project, target, scope, dryRun = false, cwd = process.cwd(), home = homedir(), ui = terminalPrompts() } = {}) {
  try {
    ui.write('\nUndominated resource setup\nChoose your tools and installation scope. Type cancel or press Ctrl+C before confirmation to leave files unchanged.\n')
    const resources = await loadResources(root)
    if (!id) id = await choose(ui, 'Which resource would you like?', resources.map(item => ({ value: item.id, label: `${item.name} [${item.kind}] — ${item.id}` })))
    const { item } = await inspectResource(id, { root })
    ui.write(`\n${safe(item.name)} — ${safe(item.description)}\n`)
    const targets = target ? [target] : await choose(ui, 'Which tools should receive it?', TARGETS[item.kind].map(value => ({ value, label: LABELS[value], aliases: ALIASES[value] })), { multiple: true })
    if (targets.some(value => !TARGETS[item.kind].includes(value))) throw new Error('Selected client is not supported for this resource')
    if (!scope) {
      const globalSupported = targets.every(value => supportsGlobal(item.kind, value))
      if (!globalSupported) ui.write('This selection supports project scope only. GitHub agent profiles and VS Code MCP helpers do not have a global adapter in this release.\n')
      scope = project ? 'project' : await choose(ui, 'Installation scope', [
        { value: 'project', label: 'Project — this directory or another existing project' },
        ...(globalSupported ? [{ value: 'global', label: 'Global — your local user account, across projects' }] : []),
      ])
    }
    if (scope === 'project' && !project) {
      const chosen = await ask(ui, `Project directory [${safe(cwd)}]: `)
      project = resolve(cwd, chosen || '.')
    }
    const options = { root, targets, scope, ...(scope === 'project' ? { project } : { home }) }
    const preview = await installResources(id, { ...options, dryRun: true })
    ui.write(`\nInstallation preview — ${safe(scope)} scope\n`)
    for (const result of preview.results) {
      ui.write(`  ${safe(LABELS[result.target])}\n    ${safe(result.destination)}\n`)
      if (result.adapter) ui.write(`    Native profile: ${safe(result.adapter.path)}\n`)
      if (result.helpers) for (const [client, helper] of Object.entries(result.helpers.clients)) ui.write(`    ${safe(client)} registration: ${safe(helper.scope)} scope; manual setup after export\n`)
    }
    ui.write(`${preview.destinations.length} resource director${preview.destinations.length === 1 ? 'y' : 'ies'}, ${preview.fileCount} files including receipts. Shared destinations are written once.\nExisting files are never overwritten. No client configuration is changed and no resource is executed.\n`)
    if (item.kind === 'agent') ui.write('Native profiles inherit the host\'s tools, model and approval policy; portable profiles need manual loading.\n')
    if (dryRun) return { code: 0, out: 'Preview complete. No files written.\n', err: '' }
    const confirm = await ask(ui, 'Install these files? [y/N]: ')
    if (!/^(?:y|yes)$/i.test(confirm)) return { code: 0, out: 'Cancelled. No files written.\n', err: '' }
    // Resolve and verify again after the human pauses; do not trust a stale preview.
    const installed = await installResources(id, options)
    const lines = [`Installed ${id}.`, ...installed.destinations, 'Reload your selected client and verify discovery.']
    for (const result of installed.results) {
      if (result.helpers) {
        lines.push('', result.helpers.note)
        for (const [client, helper] of Object.entries(result.helpers.clients)) {
          lines.push(`${client} manual setup (${helper.scope} scope):`)
          if (helper.cwd) lines.push(`Run from project: ${JSON.stringify(helper.cwd)}`)
          if (helper.note) lines.push(helper.note)
          if (helper.shellCommands) for (const command of Object.values(helper.shellCommands)) lines.push(`${command.shell}:`, command.command)
          if (helper.config) lines.push(`Merge into ${helper.configPath}:`, JSON.stringify(helper.config, null, 2))
        }
      }
    }
    return { code: 0, out: `${lines.join('\n')}\n`, err: '' }
  } catch (error) {
    if (error === CANCELLED) return { code: 130, out: '', err: 'Cancelled. No files written.\n' }
    return { code: 1, out: '', err: `${error.message}\n` }
  } finally { ui.close?.() }
}
