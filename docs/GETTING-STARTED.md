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

Run from the project where you want the skill:

```sh
npx --yes skills@1.7.1 add Lenvanderhof/Undominated.ai --list
npx --yes skills@1.7.1 add Lenvanderhof/Undominated.ai --skill undominated-evidence-audit
```

Follow the installer prompts for your assistant and installation scope. For an explicit Codex project copy, add `--agent codex --copy --yes`. This selects a client and accepts installer prompts; it does not verify the resource's suitability for your task.

To pin the corrected source verified on 2026-10-07 instead of following `main`:

```sh
npx --yes skills@1.7.1 add https://github.com/Lenvanderhof/Undominated.ai/tree/bf1c18ed2468d1015c727909806937b4aeb60412/skills --skill undominated-evidence-audit --agent codex --copy --yes
```

That pinned source was copied into a clean Codex project: 31 skill directories, 139 matching files and 30 passing synthetic examples. This verifies installation and those fixtures; read each contract before using it.

Skills CLI can discover the separate legacy `undominated` quote-only skill as well. It is not one of the original validator skills bundled in the Undominated installer.

## Inspect and install with Undominated

The `0.3.1` commands below use the verified eleven-skill/six-profile release. Work from an existing project directory:

```sh
npx --yes undominated-check@0.3.1 resources list
npx --yes undominated-check@0.3.1 resources inspect undominated-evidence-audit
npx --yes undominated-check@0.3.1 resources install undominated-evidence-audit --project "$PWD" --dry-run
npx --yes undominated-check@0.3.1 resources install undominated-evidence-audit --project "$PWD"
```

`$PWD` is a POSIX-shell example. In PowerShell or another shell, pass your project's absolute path explicitly. The project must already exist and must not be a symlink.

| Resource | Default destination | What happens next |
|---|---|---|
| Skill | `.agents/skills/<id>/` | Load it in a compatible assistant; run its local check when needed |
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
npx --yes undominated-check@0.3.1 resources inspect undominated-evidence-reviewer
npx --yes undominated-check@0.3.1 resources install undominated-evidence-reviewer --project "$PWD"
```

Read `.undominated/agents/undominated-evidence-reviewer/AGENT.md`. Give it to your assistant as task instructions or adapt it to the assistant's native agent format. Assign the evidence and workspace it may use. The profile itself grants no tools, permissions or automatic model selection.

## MCP server

Add a server using your client's stdio configuration interface:

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
npx --yes undominated-check@0.3.1 google/gemini-3.7-flash --json
npx --yes undominated-check@0.3.1 --frontier --json
```

These quote the published workload and benchmark; they do not calculate your custom traffic. Use the [calculator](https://undominated.ai/calculator/) for your scenario. `--frontier` prints a text summary; `--frontier --json` quotes the published JSON. Model verdicts and resource installation are separate commands.

For automation, the default is warn-only. Read the [CLI exit-code contract](../packages/undominated-check/README.md) before enabling `--exit-code`. The [GitHub Action](../actions/dominated-warn/README.md) posts a warning on a pull request; that requires the repository's explicit PR-comment permission. Neither interface switches an inference provider.

## Troubleshooting

| Symptom | Next step |
|---|---|
| Resource not found | Check `resources list` for the pinned package version. A website review does not mean an item is bundled in that CLI. |
| Destination already exists | Inspect the existing files. Install into a fresh project to compare versions; the installer has no overwrite mode. |
| No native agent appears | Profiles are portable Markdown instructions. Follow your host's agent registration process. |
| MCP process seems idle | Its host communicates over stdin/stdout. Use your client's server log; it is not an HTTP service. |
| MCP executable not found | Ensure the GUI application's environment can find Node/npm, or configure absolute executable paths. |
| MCP returns `unpublished` | The requested website JSON record is unavailable. Do not infer a resource or a model value from that absence. |
| JSON says `local-tested-unreleased` | Older bundles retain a build-time metadata label. Use the version and verified registry record in [Evidence](EVIDENCE.md) for publication status. |
| A figure disagrees with its source | [Report the exact figure](../CONTRIBUTING.md#report-a-data-correction), including its date, seller and workload. |

[Return to the overview](../README.md) · [Choose a resource](RESOURCES.md)
