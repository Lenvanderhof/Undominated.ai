# undominated-check

Quote published AI model evidence, inspect original Undominated resources, and install the resources you choose into an explicit project.

Requires **Node.js 22.12+**. The offline skill checks additionally require **Python 3.10+**; they use only the standard library. No inference API key is required.

## Quote a published result

```sh
npx --yes undominated-check@0.4.0 google/gemini-3.7-flash --json
npx --yes undominated-check@0.4.0 --frontier --json
```

Model commands retrieve public JSON from [Undominated.ai](https://undominated.ai/). They do not send model prompts or inference credentials, route inference, or switch providers. The requested model identifier is part of the HTTP request. Inspect the returned benchmark, workload, date, source and recorded capability losses before applying a comparison to your own task.

The CLI quotes a published verdict; it does not recompute the frontier or price custom traffic. Use the [calculator](https://undominated.ai/calculator/) for a workload estimate. Use `--frontier` for a text summary or add `--json` for the published document.

## Inspect and install an original resource

Version **0.4.0** bundles **11 skills, six portable agent profiles and one MCP server**. The earlier `0.2.0` bundle contains six skills, four profiles and the same server. Consult the [version and availability map](https://github.com/Lenvanderhof/Undominated.ai/blob/main/docs/RESOURCES.md) for release verification and the corrections to `0.3.0` checkers.

```sh
npx --yes undominated-check@0.4.0 resources list
npx --yes undominated-check@0.4.0 resources inspect undominated-evidence-audit
npx --yes undominated-check@0.4.0 install undominated-evidence-audit --project /absolute/path/to/project --dry-run
npx --yes undominated-check@0.4.0 install undominated-evidence-audit --project /absolute/path/to/project
```

Replace the path with an existing project. Inspect the dry-run before installing. `install` is an alias for `resources install`; both `--project /path` and `--project=/path` forms work. Use `--json` for structured resource output. Bundled `status: fixture-tested` describes validation scope, not registry availability or production certification.

| Resource / target | Destination | Next step |
|---|---|---|
| Skill, default or `--target codex` | `.agents/skills/<id>/` | Load through the client's skill workflow |
| Skill, `--target claude` | `.claude/skills/<id>/` | Load through Claude Code's skill workflow |
| Skill, `--target github` | `.github/skills/<id>/` | Load through GitHub Copilot's skill workflow |
| Agent profile, default | `.undominated/agents/<id>/AGENT.md` | Load as portable task instructions |
| Agent profile, `--target claude` | Original export plus `.claude/agents/<id>.md` | Reload Claude Code and inspect the native agent |
| Agent profile, `--target github` | Original export plus `.github/agents/<id>.agent.md` | Select the custom agent in a compatible Copilot client |
| MCP server | `.undominated/mcp/undominated-mcp/` | Review the generated client setup, then register it |

Use `resources --help` for the resource-specific target list. Unsupported resource/target combinations fail before writing files. Existing default paths are preserved from `0.3.1`.

```sh
npx --yes undominated-check@0.4.0 install undominated-evidence-reviewer --project /absolute/path/to/project --target claude
npx --yes undominated-check@0.4.0 install undominated-mcp --project /absolute/path/to/project --json
```

Installation verifies bundled SHA-256 hashes, rejects traversal and symlink paths, and refuses existing destinations, including native adapter files. It never overwrites client configuration. Package acquisition through `npx` uses the network; copying bundled resources does not. A write failure can leave a partial new destination: inspect it before removing it and retrying. Do not install into a directory concurrently controlled by an untrusted process.

The default `AGENT.md` export remains portable. Explicit Claude/GitHub targets additionally create a native adapter that preserves the profile's body and retains the original licensed export. Native adapters inherit the host's model, available tools and permission rules; the profile's prose does not enforce a sandbox or read-only access. The installer does not invoke an agent or grant a permission bypass.

MCP JSON output separates executable paths and arguments. Printed shell commands are labelled for their shell and quote each argument. They register the server only when you run them yourself. The export uses absolute paths tied to this machine; move/reinstall it if those paths change. MCP paths containing client interpolation syntax `${…}` are refused because clients could expand them to a different location. Review host configuration before importing it, and confirm the five MCP tools appear. See [client setup and measured compatibility](https://github.com/Lenvanderhof/Undominated.ai/blob/main/docs/INSTALLER.md).

From an installed skill directory:

```sh
python3 scripts/check.py examples/synthetic.json
```

Every skill includes an MIT licence, a scoped input contract and synthetic examples. Evidence-audit and release-proof also hash supplied local files. Exit **0** means the supplied check passed, **1** requires review, and **2** identifies invalid input. A pass does not independently establish source truth, legal rights or permission to publish.

## Standard Skills CLI

The source skills follow the [Agent Skills specification](https://agentskills.io/specification) and support the [Skills CLI](https://github.com/vercel-labs/skills):

```sh
npx --yes skills@1.7.1 add Lenvanderhof/Undominated.ai --list
npx --yes skills@1.7.1 add Lenvanderhof/Undominated.ai --skill undominated-evidence-audit --agent codex --copy --yes
```

Repository discovery is separate from a skills.sh marketplace listing. This route also discovers the separate legacy quote-only `undominated` skill, which is outside the 18-resource bundle.

## Model command options

| Option | Effect |
|---|---|
| `--json` | Return the published document with resolved URLs |
| `--frontier` | Retrieve the frontier document; pair with `--json` |
| `--local <dir>` | Read existing `frontier.json` or `dominance/<slug>.json` files locally |
| `--origin <url>` | Fetch from a specified origin instead of the default website |
| `--exit-code` | Opt in to verdict-specific exit codes |
| `--plain`, `--color` | Disable or force terminal presentation |
| `--help`, `--version` | Show usage or package version |

Without `--exit-code`, a printed model verdict exits **0**, including `dominated` and `unrated`; usage/unpublished-model errors exit **1**, and read failures exit **2**. With `--exit-code`, frontier is **0**, dominated **3**, dominated with a capability trade **4**, unrated **5**, and unpriced **6**. Treat a benchmark verdict as a reason to investigate, not an automatic migration or merge gate. These model exit codes are separate from skill-check exit codes.

Dominance can include a tie on one axis and a strict improvement on the other. Unrated is not zero, and a capability loss is not a strict replacement. Read the precise margins and recorded losses, not only the status label.

## Source checkout

From the repository root:

```sh
node packages/undominated-check/scripts/build-resources.mjs
node packages/undominated-check/bin/undominated-check.mjs resources list
npm test --prefix packages/undominated-check
```

The root package is a GitHub installation wrapper; npm releases come from the dedicated package directory. [Maintainer release procedure](https://github.com/Lenvanderhof/Undominated.ai/blob/main/packages/undominated-check/PUBLISH.md).

## Optional Bash completion

For a local npm installation, source the bundled completion file from your project:

```sh
source node_modules/undominated-check/completions/undominated-check.bash
```

For a global installation, use `source "$(npm root -g)/undominated-check/completions/undominated-check.bash"`. Completion suggests commands, resource IDs and install flags for the `undominated-check` executable. Resource completion reads the installed bundle without fetching website data. The installer does not edit your shell profile.

## Evidence and support

The software is [MIT](LICENSE). Its licence grants no extra rights over data it fetches. Published verdicts use LMArena evidence under CC BY 4.0 with attribution; Artificial Analysis redistribution rights remain unresolved and those scores are excluded from the public output. Provider prices retain their source, seller and applicable conditions.

[Full installation guide](https://github.com/Lenvanderhof/Undominated.ai/blob/main/docs/GETTING-STARTED.md) · [Resource contracts](https://github.com/Lenvanderhof/Undominated.ai/blob/main/docs/RESOURCES.md) · [Evidence boundaries](https://github.com/Lenvanderhof/Undominated.ai/blob/main/docs/EVIDENCE.md) · [Report a correction](https://github.com/Lenvanderhof/Undominated.ai/issues/new?template=wrong-price.yml)
