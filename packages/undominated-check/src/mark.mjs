/**
 * Terminal chrome for undominated-check.
 *
 * Dual Witness path geometry is not redrawn here — the identity README forbids
 * tracing the mark. This is the product metaphor already on the social card:
 * a Pareto staircase. Chartreuse paints the stairs only when the printed
 * finding is itself a frontier claim.
 *
 * Colour and the staircase are TTY chrome. CI logs, pipes, and --json stay
 * the plain evidence `renderVerdict` already emits. No dependency.
 */

/** Evidence shard on dark ground. Brand table: design/brand/dual-witness/README.md */
export const SIGNAL = '#83B81D'

const ESC = '\x1b['
export const ansi = {
  reset: `${ESC}0m`,
  dim: `${ESC}2m`,
  bold: `${ESC}1m`,
  signal: `${ESC}38;2;131;184;29m`,
}

/**
 * Four-rung staircase, left-aligned, 8 columns. The cut on the right is a
 * riser, not a Dual Witness silhouette.
 */
export const STAIRS = ['      ▄▌', '    ▄██▌', '  ▄████▌', '▄██████▌']

export const STAIRS_ASCII = ['      #|', '    ##|', '  ####|', '######|']

export function pickStairs(env = {}) {
  const ctype = String(env.LC_ALL || env.LC_CTYPE || env.LANG || '')
  if (env.UNDOMINATED_ASCII === '1') return STAIRS_ASCII
  if (/UTF-?8/i.test(ctype) || env.WT_SESSION || env.TERM_PROGRAM === 'iTerm.app') {
    return STAIRS
  }
  // Modern terminals almost always accept these block characters. Prefer them
  // unless the operator asked for ASCII. A pipe is not a terminal anyway.
  return STAIRS
}

/**
 * @param {{ json?: boolean, plain?: boolean, color?: boolean }} opts
 * @param {{ tty?: boolean, env?: Record<string, string | undefined> }} deps
 */
export function wantsChrome(opts = {}, deps = {}) {
  if (opts.json || opts.plain) return false
  const env = deps.env ?? {}
  if (env.NO_COLOR != null && env.NO_COLOR !== '') return false
  if (env.FORCE_COLOR === '0') return false
  if (env.CI === 'true' || env.CI === '1') return false
  if (opts.color) return true
  return Boolean(deps.tty)
}

function paint(text, code, on) {
  if (!on || !text) return text
  return `${code}${text}${ansi.reset}`
}

export function lockup(env = {}, { signal = false, color = false } = {}) {
  const stairs = pickStairs(env)
  const names = ['  Undominated.ai', '  undominated-check', '  quote only', '']
  return stairs
    .map((row, i) => `${paint(row, ansi.signal, color && signal)}${names[i] ?? ''}`)
    .join('\n')
}

/** Longest first so "as of" is not split into "as". */
const DIM_NAMES = ['beaten by', 'read from', 'workload', 'as of', 'verdict', 'fetched', 'lens', 'page']

function dimLabel(line) {
  for (const name of DIM_NAMES) {
    const needle = `  ${name}`
    if (line.startsWith(needle)) {
      return `  ${paint(name, ansi.dim, true)}${line.slice(needle.length)}`
    }
  }
  return line
}

/**
 * Wrap already-rendered evidence. Never edits the numbers.
 * @param {string} text
 * @param {{ status?: string, ms?: number, env?: object, color?: boolean }} extra
 */
export function dress(text, extra = {}) {
  const color = Boolean(extra.color)
  const signal = extra.status === 'frontier'
  const head = lockup(extra.env, { signal, color })
  const lines = String(text).replace(/^\n/, '').split('\n')
  const dressed = lines.map((line, i) => {
    if (!color) return line
    if (extra.status) {
      const labelled = dimLabel(line)
      if (labelled !== line) return labelled
    }
    if (signal && /\bon the frontier\b/.test(line)) {
      return line.replace('on the frontier', paint('on the frontier', ansi.signal, true))
    }
    if (extra.status && i === 1 && line.trim()) return paint(line, ansi.bold, true)
    return line
  })
  const ms =
    extra.ms != null && Number.isFinite(extra.ms)
      ? `\n  ${color ? paint('fetched', ansi.dim, true) : 'fetched'}    ${Math.max(0, Math.round(extra.ms))} ms\n`
      : ''
  return `\n${head}\n${dressed.join('\n')}${ms}`
}
