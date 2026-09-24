#!/usr/bin/env node
/**
 * Open the maintainer's seed threads in GitHub Discussions, once each.
 *
 * Each file in .github/discussion-seeds/ is one thread: front matter names the
 * title and the category (by slug, with fallbacks), the rest is the body. A
 * thread whose title already exists in the repository is skipped, so this is
 * safe to run again after adding a seed.
 *
 *   node scripts/seed-discussions.mjs                  # dry run: print the plan
 *   GITHUB_TOKEN=$(gh auth token) node scripts/seed-discussions.mjs --apply
 *
 * Run it with your own token and the threads are authored by you, which is what
 * a reader expects from a maintainer's opening question. The workflow
 * seed-discussions.yml does the same from Actions.
 *
 * Options: --repo owner/name (default $GITHUB_REPOSITORY, then
 * Lenvanderhof/Undominated.ai), --only <file-prefix>.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const SEEDS = join(ROOT, '.github', 'discussion-seeds')

/** Minimal front matter: `key: value` lines between two `---` fences. */
export function parseSeed(source, file = '') {
  const m = String(source).match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!m) throw new Error(`${file}: no front matter`)
  const meta = {}
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([a-z]+):\s*(.*)$/)
    if (kv) meta[kv[1]] = kv[2].trim().replace(/^(['"])(.*)\1$/, '$2')
  }
  if (!meta.title) throw new Error(`${file}: front matter has no title`)
  if (!meta.category) throw new Error(`${file}: front matter has no category`)
  const categories = [meta.category, ...(meta.fallback ?? '').split(',')].map((s) => s.trim()).filter(Boolean)
  return { file, title: meta.title, categories, body: m[2].trim() + '\n' }
}

export function loadSeeds(dir = SEEDS) {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md') && f !== 'README.md')
    .sort()
    .map((f) => parseSeed(readFileSync(join(dir, f), 'utf8'), f))
}

/** First category slug the repository actually has, or null. */
export function pickCategory(wanted, available) {
  for (const slug of wanted) {
    const hit = available.find((c) => c.slug === slug)
    if (hit) return hit
  }
  return null
}

async function graphql(token, query, variables) {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      authorization: `bearer ${token}`,
      'content-type': 'application/json',
      'user-agent': 'undominated-seed-discussions',
    },
    body: JSON.stringify({ query, variables }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok || body.errors) {
    throw new Error(`GitHub GraphQL ${res.status}: ${JSON.stringify(body.errors ?? body)}`)
  }
  return body.data
}

async function main() {
  const argv = process.argv.slice(2)
  const apply = argv.includes('--apply')
  const flag = (name) => {
    const i = argv.indexOf(name)
    return i === -1 ? null : argv[i + 1]
  }
  const [owner, name] = (flag('--repo') ?? process.env.GITHUB_REPOSITORY ?? 'Lenvanderhof/Undominated.ai').split('/')
  const only = flag('--only')
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN
  if (!token) {
    console.error('set GITHUB_TOKEN (e.g. GITHUB_TOKEN=$(gh auth token)) — reading categories needs it even for a dry run')
    process.exit(2)
  }

  const seeds = loadSeeds().filter((s) => !only || s.file.startsWith(only))
  const data = await graphql(
    token,
    `query($owner: String!, $name: String!) {
      repository(owner: $owner, name: $name) {
        id
        hasDiscussionsEnabled
        discussionCategories(first: 50) { nodes { id name slug } }
      }
    }`,
    { owner, name },
  )
  const repo = data.repository
  if (!repo?.hasDiscussionsEnabled) {
    console.error(`${owner}/${name} has Discussions switched off`)
    process.exit(1)
  }
  const categories = repo.discussionCategories.nodes

  const existing = new Set()
  let after = null
  do {
    const page = await graphql(
      token,
      `query($owner: String!, $name: String!, $after: String) {
        repository(owner: $owner, name: $name) {
          discussions(first: 100, after: $after) {
            nodes { title }
            pageInfo { hasNextPage endCursor }
          }
        }
      }`,
      { owner, name, after },
    )
    const d = page.repository.discussions
    for (const n of d.nodes) existing.add(n.title.trim())
    after = d.pageInfo.hasNextPage ? d.pageInfo.endCursor : null
  } while (after)

  console.log(`${owner}/${name}: categories ${categories.map((c) => c.slug).join(', ')}`)
  console.log(apply ? 'Creating:' : 'Dry run (pass --apply to create):')

  let created = 0
  let failed = 0
  for (const seed of seeds) {
    const category = pickCategory(seed.categories, categories)
    const label = `  ${seed.file} → ${category ? category.slug : '(no matching category)'} · ${seed.title}`
    if (existing.has(seed.title)) {
      console.log(`${label}  [exists, skipped]`)
      continue
    }
    if (!category) {
      console.log(`${label}  [skipped: none of ${seed.categories.join(', ')} exists]`)
      failed += 1
      continue
    }
    if (!apply) {
      console.log(label)
      continue
    }
    try {
      const out = await graphql(
        token,
        `mutation($repositoryId: ID!, $categoryId: ID!, $title: String!, $body: String!) {
          createDiscussion(input: { repositoryId: $repositoryId, categoryId: $categoryId, title: $title, body: $body }) {
            discussion { url }
          }
        }`,
        { repositoryId: repo.id, categoryId: category.id, title: seed.title, body: seed.body },
      )
      console.log(`${label}\n    ${out.createDiscussion.discussion.url}`)
      created += 1
      // Secondary rate limits punish bursts of content creation.
      await new Promise((r) => setTimeout(r, 3000))
    } catch (err) {
      console.error(`${label}\n    failed: ${err instanceof Error ? err.message : String(err)}`)
      failed += 1
    }
  }
  if (apply) console.log(`\n${created} created, ${failed} failed, ${seeds.length - created - failed} already there`)
  process.exit(failed ? 1 : 0)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await main()
