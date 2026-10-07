# Install into your coding assistant

`undominated-check@0.4.0` adds a short `install` command, explicit client targets, native agent adapters and MCP setup helpers. It keeps the same eleven skills, six profiles and read-only MCP server as `0.3.1`, including the corrected checkers. It does not change the website catalogue or bundle the later source-only resources.

You need Node.js 22.12+, npm and an existing project directory. Offline skill checks also need Python 3.10+. Replace `/absolute/path/to/project` in these commands with that project's path.

## Choose a destination

```sh
npx --yes undominated-check@0.4.0 resources list
npx --yes undominated-check@0.4.0 resources inspect undominated-evidence-audit
npx --yes undominated-check@0.4.0 install undominated-evidence-audit --project /absolute/path/to/project --target codex --dry-run
```

Remove `--dry-run` after checking the destination. `resources install` remains available, and `--project=/absolute/path/to/project` and `--target=codex` are equivalent forms. `--json` returns structured results.

| Kind | Target | Output |
|---|---|---|
| Skill | `universal` (default), `codex` | `.agents/skills/<id>/` |
| Skill | `claude` | `.claude/skills/<id>/` |
| Skill | `github` | `.github/skills/<id>/` |
| Skill | `undominated` | `.undominated/skills/<id>/`; manual loading |
| Profile | `universal` (default), `undominated` | `.undominated/agents/<id>/`; portable instructions |
| Profile | `claude` | Portable export plus `.claude/agents/<id>.md` |
| Profile | `github` | Portable export plus `.github/agents/<id>.agent.md` |
| MCP | `universal` (default), `undominated` | Server export and all supported setup helpers |
| MCP | `claude`, `codex`, `cursor`, `vscode` | Same server export; only the selected client's helper |

Unsupported combinations fail explicitly. There is no Codex-native agent adapter in this release. Use the portable profile as task instructions there.

Default destinations are unchanged from `0.3.1`. Existing destinations are refused, including empty directories and native adapter files. To compare an update, install into a fresh project and review the difference. There is no overwrite or automatic migration mode.

## Native agent adapters

```sh
npx --yes undominated-check@0.4.0 install undominated-evidence-reviewer --project /absolute/path/to/project --target claude
npx --yes undominated-check@0.4.0 install undominated-comparison-editor --project /absolute/path/to/project --target github
```

These explicit targets write the host's native Markdown filename and `name`/`description` frontmatter. The original profile and MIT licence stay in `.undominated/agents/<id>/`. The generated adapter retains the profile body and records its source. Reload the client and confirm discovery before selecting it.

The adapter inherits the host's model, available tools and permission policy. It supplies no permission bypass. The profile's instructions are not enforced filesystem permissions or a read-only sandbox. The installer does not invoke the agent or start an inference request. The default portable export creates no native adapter.

## MCP setup

```sh
npx --yes undominated-check@0.4.0 install undominated-mcp --project /absolute/path/to/project --target claude --json
```

The server is copied to `.undominated/mcp/undominated-mcp/`. `mcp-config.json` contains the absolute Node executable and server path. JSON output includes `helpers.clients`, with separate command/argument values, configuration snippets and scope. Review the helper before running or importing it.

| Client | Helper behaviour |
|---|---|
| Claude Code | `claude mcp add` with explicit project scope; run from the reported project directory |
| Codex | `codex mcp add`; **running it changes user configuration**, not only this project |
| Cursor | Merge the `mcpServers` snippet into `.cursor/mcp.json` |
| VS Code | Merge the portable `mcpServers` snippet into `.mcp.json`; JSON also includes the legacy `.vscode/mcp.json` `servers` form |

The installer leaves existing client configuration untouched. Merge the selected server entry; do not replace an entire existing file. Client registration commands may start the server when you run them. Node and server paths must remain valid on that machine.

Commands are provided separately for POSIX shells and PowerShell. They quote every argument, including spaces and single quotes; PowerShell commands are not `cmd.exe` commands. MCP paths containing `${…}` are refused because client configuration interpolation could resolve a different path. Control characters, traversal, symlinks and existing destinations are also rejected.

After registration, confirm the client sees `get_model`, `get_verdict`, `get_frontier`, `search_resources` and `get_resource`. These tools retrieve public Undominated evidence; they do not route inference, install resources or execute returned commands.

## Compatibility evidence

The release verification distinguishes a documented format, local discovery and a live MCP handshake. Discovery does not prove that an agent will perform every task correctly. See the [release evidence](EVIDENCE.md) for measured client versions and package identity.

Measured on 2026-10-07 with isolated project/configuration directories and **zero model turns**:

| Client | Observed result |
|---|---|
| Claude Code 2.1.292 | All 11 installed skills and all six native adapters discovered; generated project-scoped MCP registration preserved exact executable/arguments |
| Codex 0.160.1 | All 11 skills discovered through the app-server; generated MCP registration and five-tool handshake passed |
| GitHub Copilot CLI 1.0.73 | All 11 skills and all six native adapters discovered; portable MCP project configuration loaded |
| Cursor agent 2026.09.28-64d2043 | Project MCP configuration loaded; five tools discovered after explicit approval in the isolated test configuration |
| VS Code Insiders 1.140.0 | Native CLI registration verified in an isolated user profile; the project file shapes were checked against official documentation |

These observations cover local discovery and configuration. They do not establish inference quality, cloud-agent activation or VS Code project-file discovery. Copilot cloud agents additionally require the relevant files in the target repository's default branch and that product's setup. Client trust and approval controls still apply.

Primary client documentation: [Codex skills](https://learn.chatgpt.com/docs/build-skills), [Claude Code subagents](https://code.claude.com/docs/en/sub-agents), [Claude Code MCP](https://code.claude.com/docs/en/mcp), [GitHub custom agents](https://docs.github.com/en/copilot/reference/custom-agents-configuration), [Cursor MCP](https://cursor.com/docs/mcp) and [VS Code MCP](https://code.visualstudio.com/docs/agent-customization/mcp-servers).

[Get started](GETTING-STARTED.md) · [Resource library](RESOURCES.md) · [CLI reference](../packages/undominated-check/README.md)
