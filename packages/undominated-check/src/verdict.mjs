/**
 * Verdict semantics and rendering for `undominated-check`.
 *
 * This module does NOT recompute dominance. It reads the document that
 * `src/lib/dominance.mjs` already produced and that the site publishes at
 * /data/dominance/<fileSlug>.json. Recomputing would mean shipping a second
 * implementation of the frontier and eventually a second answer; reading the
 * published verdict means the CLI and the /check/ page can only ever disagree
 * if the file itself is stale, which the `asOf` line makes visible.
 *
 * The two things this file necessarily duplicates from the site — the slug-to-
 * filename mapping and the status vocabulary — are pinned by
 * scripts/undominated-check.test.mjs, which imports both this module and
 * src/lib/dominance.mjs and asserts they agree. A published npm package cannot
 * reach outside its own directory, so the copy is deliberate and the test is
 * what stops it drifting.
 */

export const ORIGIN = 'https://undominated.ai'

/**
 * Must stay identical to `fileSlug` in src/lib/dominance.mjs.
 * Asserted over the whole published corpus by the test.
 */
export const fileSlug = (slug) => String(slug).replace(/[/:]/g, '__')

export const verdictUrl = (slug, origin = ORIGIN) =>
  `${origin}/data/dominance/${fileSlug(slug)}.json`

export const frontierUrl = (origin = ORIGIN) => `${origin}/data/frontier.json`

export const modelPageUrl = (slug, origin = ORIGIN) => `${origin}/models/${fileSlug(slug)}/`

/**
 * One entry per status `computeDominanceDocuments` can emit.
 *
 * `exitCode` is only used under `--exit-code`, and the codes are deliberately
 * distinct rather than collapsed to 0/1. `unrated` must never share an exit code
 * with `dominated`: nobody measuring a model is not the same finding as a model
 * being beaten, and a CI gate that cannot tell them apart will eventually be
 * used to justify a swap that no evidence supports.
 */
export const STATUS = Object.freeze({
  frontier: {
    exitCode: 0,
    headline: 'on the frontier',
    detail: 'Nothing in the catalogue is both higher scoring and cheaper.',
  },
  dominated: {
    exitCode: 3,
    headline: 'dominated',
    detail: 'Something scores higher, costs less, and gives up nothing it can do.',
  },
  'dominated-with-tradeoff': {
    exitCode: 4,
    headline: 'dominated, with a trade',
    detail: 'Something scores higher and costs less, but cannot do everything this can.',
  },
  unrated: {
    exitCode: 5,
    headline: 'unrated',
    detail: 'No independent quality score. Unrated is not a low score — it is no measurement.',
  },
  unpriced: {
    exitCode: 6,
    headline: 'unpriced',
    detail: 'No published price to compare, so no verdict is possible.',
  },
})

export const LOSS_LABEL = Object.freeze({
  context: 'a smaller context window',
  output: 'a lower maximum output',
  modality: 'an input mode it does not accept',
  tools: 'tool use',
  reasoning: 'extended reasoning',
})

/** Every field the CLI is willing to read. An unknown status is an error, not a guess. */
export function parseVerdict(doc) {
  if (!doc || typeof doc !== 'object') throw new Error('verdict document is not an object')
  const status = String(doc.status ?? '')
  if (!Object.hasOwn(STATUS, status)) {
    throw new Error(
      `unknown verdict status ${JSON.stringify(status)} — this CLI is older than the data it read`,
    )
  }
  return {
    v: Number(doc.v ?? 0),
    slug: String(doc.slug ?? ''),
    status,
    by: doc.by == null ? null : String(doc.by),
    dq: Number(doc.dq ?? 0),
    savingPct: Number(doc.savingPct ?? 0),
    losses: Array.isArray(doc.losses) ? doc.losses.map(String) : [],
    lens: String(doc.lens ?? ''),
    workload: String(doc.workload ?? ''),
    asOf: String(doc.asOf ?? ''),
    methodologySha: String(doc.methodologySha ?? ''),
    licence: String(doc.licence ?? ''),
  }
}

const pad = (label) => label.padEnd(11)

/**
 * The finding as one sentence, with its conditions attached.
 *
 * A verdict that names a winner without naming the margin is a recommendation;
 * a verdict that names the margin is evidence. Only the second is useful in a
 * terminal, because the reader can go and check it.
 */
export function summaryLine(v) {
  const s = STATUS[v.status]
  if ((v.status === 'dominated' || v.status === 'dominated-with-tradeoff') && v.by) {
    const named = v.losses.map((l) => LOSS_LABEL[l] ?? l)
    const cost = named.length ? ` but gives up ${joinList(named)}` : ''
    return `${s.headline} — ${v.by} ${margin(v)}${cost}`
  }
  return s.headline
}

/**
 * Both margins are rounded in the published document — quality to one decimal,
 * saving to a whole percent — so either can arrive as zero on a verdict that is
 * nonetheless real. Dominance needs only one axis to improve strictly.
 *
 * "costs 0% less" shipped in the first draft of this CLI and is precisely the
 * sentence STYLE bans: a number that reads as a finding while carrying none.
 * Say which axis actually moved instead.
 */
function margin(v) {
  const better = v.dq > 0 ? `scores +${v.dq}` : null
  const cheaper = v.savingPct > 0 ? `costs ${v.savingPct}% less` : null
  if (better && cheaper) return `${better} and ${cheaper}`
  if (better) return `${better} at no extra cost`
  if (cheaper) return `${cheaper} at the same score`
  // Both rounded to nothing. The margins are real but below display precision;
  // naming the file beats inventing a figure for them.
  return 'scores at least as high and costs no more, by margins under the rounding'
}

const joinList = (xs) =>
  xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`

/**
 * Human output. Deliberately plain text with no colour: this is meant to end up
 * in CI logs and issue comments, where escape codes are noise.
 */
export function renderVerdict(v, { origin = ORIGIN, source } = {}) {
  const s = STATUS[v.status]
  const lines = [
    '',
    `  ${v.slug}`,
    `  ${summaryLine(v)}`,
    '',
    `  ${pad('lens')}${v.lens}`,
    `  ${pad('workload')}${v.workload}`,
    `  ${pad('as of')}${v.asOf}`,
  ]
  if (v.by) lines.push(`  ${pad('beaten by')}${modelPageUrl(v.by, origin)}`)
  // The canonical URL prints in every mode, including --local. Someone reading
  // a CI log needs a link they can open, not the runner's filesystem path.
  lines.push(`  ${pad('verdict')}${verdictUrl(v.slug, origin)}`)
  if (source && source !== verdictUrl(v.slug, origin)) {
    lines.push(`  ${pad('read from')}${source}`)
  }
  lines.push(`  ${pad('page')}${origin}/check/`, '', `  ${s.detail}`, '')
  return lines.join('\n')
}

export function renderFrontier(doc, { origin = ORIGIN } = {}) {
  const members = Array.isArray(doc?.members) ? doc.members : []
  const width = Math.max(0, ...members.map((m) => String(m.slug).length))
  const lines = [
    '',
    `  ${members.length} models on the frontier · lens ${doc.lens} · workload ${doc.workload} · as of ${doc.asOf}`,
    '',
    ...members.map(
      (m) => `  ${String(m.slug).padEnd(width)}  ${String(m.score).padStart(7)}  $${m.price}/M`,
    ),
    '',
    `  ${origin}/frontier/`,
    '',
  ]
  return lines.join('\n')
}
