# undominated-check

```
      ▄▌
    ▄██▌  Undominated.ai
  ▄████▌  undominated-check
▄██████▌  quote only
```

Is the model you are paying for beaten by something both better and cheaper?

```sh
npm install --save-dev undominated-check
npx undominated-check google/gemini-3.7-flash
```

One-shot, no install: `npx undominated-check google/gemini-3.7-flash`.

The model-check commands are read-only. They fetch published JSON from [undominated.ai](https://undominated.ai), print the
verdict, and exit. They send no private data, store nothing, and need no key or account.

**Not a router.** It does not pick a model, hold keys, or execute inference.

**Warn, never fail.** Printing `dominated` still exits 0. Pass `--exit-code` only if a job
must distinguish statuses — and even then, do not make it a merge blocker.

On a TTY the Pareto staircase and chartreuse paint the **frontier** finding only.
Pipes, CI, `--json`, and `--plain` stay the same bytes as before — no colour in a log.
`--color` forces the chrome when you are capturing a screenshot.

## Original resources (0.2.0)

Version 0.2.0 includes six original skills, four portable agent profiles and a local copy of the Undominated MCP server. Inspect a resource before installing it into an explicit project:

```sh
npx --yes undominated-check@0.2.0 resources list
npx --yes undominated-check@0.2.0 resources inspect undominated-evidence-audit
npx --yes undominated-check@0.2.0 resources install undominated-evidence-audit --project /absolute/path/to/project --dry-run
npx --yes undominated-check@0.2.0 resources install undominated-evidence-audit --project /absolute/path/to/project
npx --yes undominated-check@0.2.0 resources install undominated-mcp --project /absolute/path/to/project
```

From a source checkout, run `node packages/undominated-check/scripts/build-resources.mjs` at the repository root, then use `node packages/undominated-check/bin/undominated-check.mjs` in place of the npx prefix.

Use `--json` for machine-readable output, or `--target claude` to put a skill under `.claude/skills` instead of `.agents/skills`. The project directory must already exist and its path must contain no symlinks. Installation checks bundled SHA-256 hashes, rejects path traversal and symlinks, and refuses existing destinations, including empty directories. It does not run scripts, install dependencies, fetch packages, use credentials or edit existing client configuration. A filesystem write failure can leave a partial new destination; inspect it before removing it and retrying. Do not install into a directory concurrently controlled by an untrusted process.

Agent profiles are exported under `.undominated/agents/<id>/AGENT.md`; load the file into your agent or adapt it to your client's native format. Exporting Markdown does not automatically register a subagent. The MCP export goes under `.undominated/mcp/undominated-mcp/` and includes a separate `mcp-config.json` with absolute Node and server paths. Import that configuration manually; the installer does not start the server. Running the MCP server accesses public Undominated endpoints without credentials. Its new resource tools require the corresponding website data release.

Each skill has an MIT license, scoped workflow, dependency-free Python 3.10+ validator and clearly labeled synthetic example. From the installed skill directory:

```sh
python3 scripts/check.py examples/synthetic.json
```

The evidence-audit and release-proof examples include local files their checks hash. Exit 0 means the supplied check passed within its scope; it is not source truth, security certification, or permission to release anything.

### Standard skills CLI

The source directories follow the [Agent Skills specification](https://agentskills.io/specification). The [official skills CLI](https://github.com/vercel-labs/skills) supports discovery and named skill selection:

```sh
npx skills add Lenvanderhof/Undominated.ai --list
npx skills add Lenvanderhof/Undominated.ai --skill undominated-evidence-audit --agent codex --copy
```

For a local checkout, replace `Lenvanderhof/Undominated.ai` with `./skills`. Repository discovery is separate from a skills.sh marketplace listing.

## README badge

Same verdict as a static SVG. The slug is the dominance filename: `/` and `:` become `__`.

```md
![Undominated](https://undominated.ai/badge/anthropic__claude-opus-5.svg)
```

Measured 2026-08-31: that URL returns HTTP 200, `image/svg+xml`. Nested
`/badge/anthropic/claude-opus-5.svg` also 200; `__` is the canonical prerendered key.

---

## What it prints

```
$ npx undominated-check allenai/olmo-3-32b-think

  allenai/olmo-3-32b-think
  dominated — tencent/hy3 scores +142.6 and costs 39% less

  lens       lmarena
  workload   balanced
  as of      2026-08-30
  beaten by  https://undominated.ai/models/tencent__hy3/
  verdict    https://undominated.ai/data/dominance/allenai__olmo-3-32b-think.json
  page       https://undominated.ai/check/

  Something scores higher, costs less, and gives up nothing it can do.
```

Every line after the finding is there so you can disagree with it. The lens says which benchmark,
the workload says which input:output mix priced it, `as of` says how stale it might be, and the
verdict URL is the exact document this output was rendered from.

### The five verdicts

| Status | Means | Exit code under `--exit-code` |
|---|---|---|
| `on the frontier` | Nothing in the catalogue is both higher scoring and cheaper. | 0 |
| `dominated` | Something scores higher, costs less, and gives up nothing it can do. | 3 |
| `dominated, with a trade` | Something scores higher and costs less, but drops context, output, a modality, tool use or reasoning. The loss is named. | 4 |
| `unrated` | Nobody has published an independent quality score. | 5 |
| `unpriced` | No published price, so no verdict is possible. | 6 |

**`unrated` has its own exit code on purpose.** Nobody having measured a model is not the same
finding as a model being beaten. A gate that collapses the two will eventually approve a swap that
no evidence supports. Absence of a verdict is never a favourable verdict.

**`dominated, with a trade` is not a recommendation.** Sixty-one percent of raw "better and cheaper"
verdicts, measured on this catalogue, named a replacement that could not do the incumbent's job —
half the context, or no image input. That is why the trade is a separate status with its own exit
code, and why the losses are printed rather than summarised.

---

## Usage

```
npx undominated-check <model-slug>
npx undominated-check --frontier
```

| Option | Effect |
|---|---|
| `--local <dir>` | Read from a directory instead of the network. Point it at a checkout's `static/data`. |
| `--origin <url>` | Fetch from a different origin. Default `https://undominated.ai`. |
| `--json` | Print the verdict document plus the resolved URLs, unformatted. |
| `--frontier` | List every model nothing beats on both quality and price. |
| `--exit-code` | Exit with the status-specific code above, for CI. |
| `--help`, `--version` | |

Without `--exit-code`, exit is `0` whenever a verdict was printed, `1` on a usage error or an
unpublished slug, and `2` when the data could not be read.

### Offline

Nothing needs the network if you already have the files:

```sh
npx undominated-check --frontier --local static/data
```

```
  9 models on the frontier · lens lmarena · workload balanced · as of 2026-08-30

  upstage/solar-pro4                 1376.2  $0.0525/M
  qwen/qwen3-30b-a3b-instruct-2507   1384.3  $0.0844/M
  deepseek/deepseek-v4-flash         1431.6  $0.1013/M
  google/gemma-4-26b-a4b-it          1434.6  $0.1375/M
  tencent/hy3                        1441.2  $0.1444/M
  google/gemma-4-31b-it              1441.7  $0.1525/M
  xiaomi/mimo-v2.5-pro                 1465  $0.5437/M
  google/gemini-3.7-flash            1490.2  $0.75/M
  anthropic/claude-opus-5            1504.2  $10/M

  https://undominated.ai/frontier/
```

The directory needs `frontier.json` and `dominance/<slug>.json`, with `/` and `:` in the slug
replaced by `__`. That is the same layout the site publishes, so mirroring it is a `curl` away.

### In CI

Default is **warn, never fail**: a printed verdict exits 0, including `dominated` and `unrated`.
A job that blocks a merge over a public-benchmark verdict under one workload is uninstalled the
same day.

```yaml
- run: npx undominated-check openai/gpt-5.2
```

`--exit-code` is opt-in, for jobs that want the status-specific codes above. Exit 3 or 4 means
something cheaper now scores higher. Treat that as a prompt to look, not as a merge blocker —
the verdict is computed on a public benchmark under one workload, and your workload is not that
one. `unrated` (5) and `unpriced` (6) stay distinct from each other and from dominated: nobody
having measured a model is not the same finding as a model being beaten.

---

## What it does not do

- **It does not compute anything.** It reads the verdict `undominated.ai` already published. There
  is deliberately no second implementation of the frontier here, because two implementations
  eventually give two answers and only one of them gets checked.
- **It does not price your workload.** The published lens is `balanced` — three input tokens per
  output token, no cache. If your traffic is output-heavy or cache-heavy the ordering changes.
  [/check/](https://undominated.ai/check/) lets you pick the workload;
  [/audit/](https://undominated.ai/audit/) reads it off an actual bill, in your browser.
- **It does not know your constraints.** Region, data-retention terms, latency, an existing contract
  and a rate limit are all invisible to it.
- **It is not a router.** It does not pick a model, hold keys, or execute inference. No
  affiliate links, no take-rate. See [/independence/](https://undominated.ai/independence/).

## Data and licensing

The CLI is MIT. The data is not sublicensed by it.

Verdicts are computed over **LMArena Elo**, used under **CC BY 4.0** from the official dataset —
attribute LMArena if you republish a score. Each verdict document carries its own `licence` field
saying so. No Artificial Analysis figure reaches this output; their redistribution terms are
unresolved and the pipeline excludes them from every public surface.

Prices come from providers' own published rates via the OpenRouter models API.

## Getting a number wrong

If a figure here disagrees with the vendor's own page, that is worth reporting and the correction
gets logged rather than quietly overwritten:
[open an issue](https://github.com/Lenvanderhof/Undominated.ai/issues/new?template=wrong-price.yml).

## Licence

MIT. See [LICENSE](LICENSE).
