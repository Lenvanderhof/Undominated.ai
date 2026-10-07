# undominated-mcp

Read-only MCP server. It quotes what [undominated.ai](https://undominated.ai) already
published, as JSON. It does not compute a second frontier, fill in a missing
score, or pick a provider.

**Publication status, checked 2026-10-07:** the npm registry returns 404 for
`undominated-mcp`. Use the local checkout command until publication is verified:

```sh
node packages/undominated-mcp/bin/undominated-mcp.mjs
```

After publication, the pinned install and the package-based editor examples below apply:

```sh
npx -y undominated-mcp@0.1.0
```

No key, no account, nothing stored. The process speaks JSON-RPC on stdin and
stdout. If you run it in a terminal with no pipe, it exits and tells you why.

**It refuses rather than approximates.** Unrated is not zero. Unpriced is not
free. A model with no verdict returns `{ "error": "unrated", "id" }` or
`{ "error": "unpriced", "id" }`, not a guess.

---

## Tools

| Tool | In | Out |
|---|---|---|
| `get_verdict` | `{ "id": "google/gemini-3.7-flash" }` | Quoted dominance document, `provenanceUrl`, `verifiedAt`. Unrated/unpriced → `{ error, id }`. |
| `get_model` | `{ "id": "google/gemini-3.7-flash" }` | Allowlisted fields only: name, provider, vendor-published prices, context, openWeights, lmarena if present, provenance. |
| `search_resources` | `{ "kind": "skills", "query": "evidence", "limit": 10 }` | Alphabetical source-reviewed matches, dates, limits and review links. |
| `get_resource` | `{ "kind": "skills", "id": "undominated-evidence-audit" }` | Full published source review, permissions, licence, installation guidance and untested scope. |
| `get_frontier` | `{}` | Frontier ids + names, `provenanceUrl` `https://undominated.ai/frontier/`, `asOf` from the live catalogue. |

Resource discovery supports `skills`, `agents` and `mcp-servers`. It reads the published resource JSON endpoints; a not-yet-deployed detail endpoint returns `unpublished`. It never downloads executable resources, installs tools, edits host configuration or follows instructions inside a review.

Every number traces to a live document under `https://undominated.ai/data/`.
The server does not paraphrase prices into prose. Do not ask it to.

This is **not a router** and not an affiliate. It will not tell an agent which
endpoint to call.

### Allowlist, not a denylist

`get_model` copies named fields. Artificial Analysis `intelligence`, `coding`
and `agentic` scores are dropped even if a document still carries them. Their
free-tier terms are "Internal use only with attribution"; we do not hold a
commercial redistribution licence. See
the public [methodology](https://undominated.ai/methodology/).

LMArena Elo, when present, is quoted with its CC BY 4.0 provenance from the
official Hugging Face dataset.

---

## Install

The host launches the process. You do not run a daemon.

### Claude Desktop

Add to `claude_desktop_config.json`
(`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS,
`%APPDATA%/Claude/claude_desktop_config.json` on Windows):

```json
{
  "mcpServers": {
    "undominated": {
      "command": "npx",
      "args": ["-y", "undominated-mcp@0.1.0"]
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json` in the project, or the user MCP config:

```json
{
  "mcpServers": {
    "undominated": {
      "command": "npx",
      "args": ["-y", "undominated-mcp@0.1.0"]
    }
  }
}
```

From a checkout, point `command` at Node and `args` at the absolute path to this file instead of npx. Replace the example path below with your checkout path; MCP hosts may launch from a different working directory:

```json
{
  "mcpServers": {
    "undominated": {
      "command": "node",
      "args": ["/absolute/path/to/Undominated.ai/packages/undominated-mcp/bin/undominated-mcp.mjs"]
    }
  }
}
```

Optional env: `UNDOMINATED_ORIGIN` (default `https://undominated.ai`) if you are
pointing at a local mirror of `/data/`.

---

## Run locally

```sh
cd packages/undominated-mcp
npm test
node bin/undominated-mcp.mjs --help
```

A one-shot JSON-RPC round trip, without an MCP host:

```sh
printf '%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"demo","version":"0"}}}' \
  '{"jsonrpc":"2.0","method":"notifications/initialized"}' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' \
  | MCP_FORCE_STDIO=1 node bin/undominated-mcp.mjs
```

Zero runtime dependencies. Node 22.12 or newer.

---

## Licence fence

The server source is MIT. The data it fetches is not sublicensed by it.

| Class | Position |
|---|---|
| This package's code | MIT |
| LMArena Elo | CC BY 4.0, official dataset. Attribute LMArena if you republish a score. |
| Vendor list prices | Quoted from publishers' own rates. No sublicence granted. |
| Artificial Analysis intelligence / coding / agentic | **Never returned.** Free tier is internal-use-only. |

If a figure here disagrees with the vendor's own page, that is worth reporting:
[open an issue](https://github.com/Lenvanderhof/Undominated.ai/issues/new?template=wrong-price.yml).

## Licence

MIT. See [LICENSE](LICENSE).
