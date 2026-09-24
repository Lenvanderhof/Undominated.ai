# Contributing

This repository is the public face of [undominated.ai](https://undominated.ai/), not a code drop of the ranking engine. There are three ways to help, and one thing not to send.

## 1. Correct a figure

Open a [Wrong figure](https://github.com/Lenvanderhof/Undominated.ai/issues/new?template=wrong-price.yml) issue when a live price, score, or rank disagrees with a primary source. Required: model, what the page shows, what it should be, source URL, date. Corrections with a primary source are applied on the site and logged publicly at [/corrections/](https://undominated.ai/corrections/).

## 2. Argue in Discussions

[Discussions](https://github.com/Lenvanderhof/Undominated.ai/discussions) hold the questions the index has not settled — the second quality lens, the default workload, what to do with unrated models, where "dominated, with a trade" draws its line. A disagreement with a source attached is the most useful post there is. How to cite a dump or read `null` goes in Q&A.

## 3. Improve the tools

The MIT-licensed tools take pull requests:

| Path | What it is |
|---|---|
| [`packages/undominated-check/`](packages/undominated-check/) | The npm CLI and MCP server |
| [`actions/dominated-warn/`](actions/dominated-warn/) | The warn-only GitHub Action |
| [`skills/undominated/`](skills/undominated/) | The quote-only agent skill |
| [`scripts/`](scripts/) | The generators and checks that keep this README honest |

Before you open one:

```sh
npm test                                        # CLI, MCP server, action, scripts — offline, Node ≥ 22.12
node packages/undominated-check/prepublish.mjs  # one version everywhere it ships
```

The rules the tools already follow, and that a change must keep:

- **Quote, never compute.** The CLI, Action and MCP server read the verdict the site published. A second implementation of the frontier eventually gives a second answer.
- **Warn, never fail.** Nothing here blocks a merge by default. `unrated` never shares an exit code with `dominated`.
- **No runtime dependencies** in the CLI or the Action.
- **Every figure carries its lens, workload, date and URL.** A lookup that fails says *cannot confirm*.
- A user-facing change adds a line to the package's `CHANGELOG.md`; that section becomes the release notes.

Releases are cut by the maintainer by pushing a tag (`undominated-check@X.Y.Z` or `vX.Y.Z`); see [`.github/workflows/release.yml`](.github/workflows/release.yml).

## What not to send

- Scraped catalogues, paywalled extracts, or Artificial Analysis dumps. Redistribution of those scores is unresolved; we will not take them through this tracker.
- Pull requests that add or edit model rows, prices or scores. The live board is generated from sourced vendor pages, not from GitHub edits — file a correction instead.
- Hand-edited figures in the README. They are generated (`scripts/refresh-readme.mjs`, `build-hero.mjs`, `build-floor-table.mjs`, `dump-current.mjs`, `pins-current.mjs`) and checked daily.
- Links to any other GitHub repository you believe is "the real source." This repository is the GitHub presence of the product.
