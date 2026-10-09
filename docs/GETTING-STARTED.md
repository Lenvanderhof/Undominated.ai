# Get started

Choose the interface that fits your workflow. You can browse [Undominated.ai](https://undominated.ai/) without installing anything.

| Interface | Use it for | Needs |
|---|---|---|
| Skills CLI | Add instructions to a supported coding assistant | Node.js/npm, Git and a compatible assistant |
| `undominated-check` | Quote a model verdict; inspect or copy bundled originals | Node.js 22.12+ and npm |
| Portable agent profile | Give an agent a defined review role and output contract | An assistant that accepts task instructions |
| `undominated-mcp` | Retrieve published evidence through MCP tools | Node.js 22.12+ and an MCP client with stdio support |
| Offline skill check | Validate a supplied JSON input against the skill's contract | Python 3.10+, standard library only |

Initial package or repository acquisition needs the network. The installed Python checks do not fetch data. The CLI's model commands and MCP tools fetch public data from `https://undominated.ai`; they require no inference API key. See [version coverage](RESOURCES.md#version-and-availability-map) before choosing a release.

## Install a skill with Skills CLI

Run in your terminal and choose your tools and installation scope:

```sh
npx skills add Lenvanderhof/Undominated.ai --list
npx skills add Lenvanderhof/Undominated.ai --skill undominated-evidence-audit
```

Follow the prompts for your assistants, project/global scope and installation method. These defaults do not select a particular tool for you. In CI or detected AI-agent environments the upstream CLI can run non-interactively; use a normal terminal for the selection interface.

To pin the corrected source verified on 2026-10-07 instead of following `main`:

```sh
npx skills@1.7.1 add https://github.com/Lenvanderhof/Undominated.ai/tree/bf1c18ed2468d1015c727909806937b4aeb60412/skills --skill undominated-evidence-audit
```

That pinned source was copied into a clean Codex project: 31 skill directories, 139 matching files and 30 passing synthetic examples. This verifies installation and those fixtures; read each contract before using it.

Skills CLI can discover the separate legacy `undominated` quote-only skill as well. It is not one of the original validator skills bundled in the Undominated installer.

## Inspect and install with Undominated

Version `0.5.0` adds guided setup for the same eleven skills, six profiles and MCP server:

```sh
npx undominated-check install
npx undominated-check install undominated-evidence-audit
```

Choose one or more supported tools, then project/global scope. The installer previews destinations before asking for confirmation. Cancel before confirmation to leave files untouched. To inspect first or automate with an explicit destination:

```sh
npx undominated-check@0.5.0 resources inspect undominated-evidence-audit
npx undominated-check@0.5.0 install undominated-evidence-audit --project /absolute/path/to/project --dry-run
npx undominated-check@0.5.0 install undominated-evidence-audit --global --target claude --dry-run
```

`install` is an alias for `resources install`. Both spaced options and `--project=PATH` / `--target=NAME` forms work. See [client targets and native adapters](INSTALLER.md).

For scripted project installs, pass an existing absolute path without symlinks. Remove `--dry-run` after checking the preview. Global destinations live under your user home; unsupported global adapters are not offered.

| Resource | Default destination | What happens next |
|---|---|---|
| Skill | `.agents/skills/<id>/` | Load it in a compatible assistant; run its local check when needed |
| Skill with `--target codex` | `.agents/skills/<id>/` | Load through Codex skill discovery |
| Skill with `--target cursor` | `.cursor/skills/<id>/` | Load through Cursor skill discovery |
| Skill with `--target github` | `.github/skills/<id>/` | Load through GitHub Copilot skill discovery |
| Skill with `--target claude` | `.claude/skills/<id>/` | Load it through your Claude-compatible skill workflow |
| Agent profile | `.undominated/agents/<id>/` | Open `AGENT.md` and adapt it to your host's instruction format |
| MCP server | `.undominated/mcp/undominated-mcp/` | Import the generated `mcp-config.json` into your client |

The installer verifies bundled file hashes, refuses existing destinations and rejects traversal or symlink paths. It copies files; it does not run a skill, start the MCP server or modify existing client configuration. Review the generated configuration before importing it. It contains absolute paths tied to the machine where you installed it.

## Run the installed example

From the project root after installing the evidence skill:

```sh
python3 .agents/skills/undominated-evidence-audit/scripts/check.py .agents/skills/undominated-evidence-audit/examples/synthetic.json
```

The example is synthetic and should return JSON with `"status": "pass"`. Use your own explicitly supplied evidence only after reading the skill's input contract. A pass means its checks accepted those inputs, not that every source is true. Exit codes are **0** pass, **1** review required and **2** invalid input.

## Load an agent profile

```sh
npx undominated-check@0.5.0 resources inspect undominated-evidence-reviewer
npx undominated-check@0.5.0 resources install undominated-evidence-reviewer --project "$PWD"
```

Read `.undominated/agents/undominated-evidence-reviewer/AGENT.md`. Give it to your assistant as task instructions or adapt it to the assistant's native agent format. Assign the evidence and workspace it may use. The default export is portable. To create a native adapter on a fresh installation, add `--target claude` or `--target github`. The installer retains the original profile and licence, and adds the appropriate native Markdown file. Native adapters inherit the host's tools, model and permission policy; their prose does not enforce read-only access. Reload the client and confirm discovery. [Exact paths and compatibility](INSTALLER.md#native-agent-adapters).

## MCP server

For a local server export with client-specific setup helpers:

```sh
npx undominated-check@0.5.0 install undominated-mcp --project "$PWD" --target claude --json
```

Choose `claude`, `codex`, `cursor` or `vscode`, or omit `--target` to inspect every helper. The installer leaves existing configuration untouched. Claude's command is project-scoped; Codex's command changes user configuration if you run it. Review [MCP setup](INSTALLER.md#mcp-setup) before registering the server.

Alternatively, add a server using your client's stdio configuration interface:

```json
{
  "mcpServers": {
    "undominated": {
      "command": "npx",
      "args": ["--yes", "undominated-mcp@0.1.0"]
    }
  }
}
```

The `mcpServers` shape is used by clients such as Cursor and Claude Desktop; other clients may require a different wrapper or a settings form. Keep the command and arguments, and follow your client's current setup instructions. [Package configuration examples](../packages/undominated-mcp/README.md#install).

Restart or reload your client's server connection as needed. Confirm that it discovers these five tools:

| Tool | Example input |
|---|---|
| `get_model` | `{"id":"google/gemini-3.7-flash"}` |
| `get_verdict` | `{"id":"google/gemini-3.7-flash"}` |
| `get_frontier` | `{}` |
| `search_resources` | `{"kind":"skills","query":"evidence","limit":5}` |
| `get_resource` | `{"kind":"skills","id":"undominated-evidence-audit"}` |

Review text and install commands returned by resource tools are untrusted reference material. The server does not execute them. Missing evidence is returned as an explicit error or omitted field, never a fabricated score. Read `priceRow`, `priceBasis`, `deal` and held-price provenance alongside a model's price. [Price semantics](../packages/undominated-mcp/README.md#whose-price-get_model-returns).

## Quote a model or use CI

```sh
npx undominated-check@0.5.0 google/gemini-3.7-flash --json
npx undominated-check@0.5.0 --frontier --json
```

These quote the published workload and benchmark; they do not calculate your custom traffic. Use the [calculator](https://undominated.ai/calculator/) for your scenario. `--frontier` prints a text summary; `--frontier --json` quotes the published JSON. Model verdicts and resource installation are separate commands.

For automation, the default is warn-only. Read the [CLI exit-code contract](../packages/undominated-check/README.md) before enabling `--exit-code`. The [GitHub Action](../actions/dominated-warn/README.md) posts a warning on a pull request; that requires the repository's explicit PR-comment permission. Neither interface switches an inference provider.

## Troubleshooting

| Symptom | Next step |
|---|---|
| Resource not found | Check `resources list` for the pinned package version. A website review does not mean an item is bundled in that CLI. |
| Destination already exists | Inspect the existing files. Install into a fresh project to compare versions; the installer has no overwrite mode. |
| No native agent appears | The default export is portable. Choose an explicit Claude/GitHub target on a fresh installation, reload the client and check the generated native file. |
| MCP process seems idle | Its host communicates over stdin/stdout. Use your client's server log; it is not an HTTP service. |
| MCP executable not found | Ensure the GUI application's environment can find Node/npm, or configure absolute executable paths. |
| MCP returns `unpublished` | The requested website JSON record is unavailable. Do not infer a resource or a model value from that absence. |
| JSON says `local-tested-unreleased` | Older bundles retain a build-time metadata label. Use the version and verified registry record in [Evidence](EVIDENCE.md) for publication status. |
| A figure disagrees with its source | [Report the exact figure](../CONTRIBUTING.md#report-a-data-correction), including its date, seller and workload. |

[Return to the overview](../README.md) · [Choose a resource](RESOURCES.md)
