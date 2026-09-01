# dominated-warn

Warn-only GitHub Action. When a consumer repo declares a model identifier that
Undominated currently marks **strictly dominated**, this comments on the pull
request. Contract: warn, never fail.

Undominated is **not a router**. This action does not pick a model, hold keys,
or execute inference.

## Install

Copy into the consumer repo. Do not add this job to required status checks.

```yaml
# .github/workflows/undominated-warn.yml  (in YOUR repo, not this one)
name: undominated-warn
on:
  pull_request:
jobs:
  warn:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
      - uses: Lenvanderhof/Undominated.ai/actions/dominated-warn@main
        continue-on-error: true
```

The public default branch is `main` — that ref exists. Pin a tag (for example
`@v1`) once one is published so a later commit cannot change what your workflow
runs. Until `actions/dominated-warn/` is on that public tree, copy this
directory into your repo and use `uses: ./actions/dominated-warn` instead.

This working repository (`Lenvanderhof/AIDREAMTEAM`) is private. A `uses:` line
pointing here will not resolve for other accounts.

The job must be allowed to succeed even when a model is dominated. Do not wrap
this step in a required check that treats a comment as a failure. The action
exits 0 on findings, on fetch failure, and on a missing comment token.

`ubuntu-latest` already has Node. No extra `setup-node` step, no secret, no
npm install. The only permission it uses is `pull-requests: write` so it can
comment; without that permission it still exits 0 and writes the warning to
the log. Fork PRs may refuse the comment; the job still succeeds.

## What it reads

Conservative scan of identifiers already in the consumer repo:

- `.env.example`
- `config/*.toml`
- `package.json` string values

It skips `.env`, source trees, URLs, MIME types, npm scopes (`@sveltejs/kit`),
dependency *keys*, and values that look like secrets (`sk-`, `ghp_`,
`github_pat_`, `Bearer`). It does not walk the rest of the tree.

## What it fetches

Static JSON, no key:

- `https://undominated.ai/data/frontier.json`
- `https://undominated.ai/data/dominance/<slug>.json`

Public lens is **LMArena**. A finding is “strictly dominated **as of** {date}”.
Unrated is not dominated. A cheaper-but-narrower row is a named trade, not a
strict finding.

If the fetch fails, the action warns on the log and **exits 0**.

## v1 scope vs classify()

Price-move materiality (≥5%, context cut, modality loss) lives in this
repository’s `scripts/watch-upstream.mjs` `classify()`. This action does **not**
reimplement `classify()`. v1 only flags strict dominance from the published
JSON so the two definitions cannot drift inside the action runtime.

## Licence

Vendor prices are facts the vendor published. LMArena Elo is CC BY 4.0.
Artificial Analysis scores are not in the dominance JSON.
