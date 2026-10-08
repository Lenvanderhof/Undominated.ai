---
name: undominated-tool-allowlist
description: Decide whether a saved MCP permission map fits a task allowlist. A consistent refusal is a pass, not an error to paper over.
license: MIT
metadata:
  author: Undominated.ai
  version: "1.0.0"
---

# Tool allowlist

Use when a task may call tools and you already have an explicit permission map. This checker does not classify tools. Pair it with `undominated-mcp-permission-map` when the map still needs to be built.

1. Save the map as JSON with `tools`: objects of `name` and `permission`. Permissions are only `read`, `write`, `network`, `credential`, `shell`, and `payment`.
2. Record the SHA-256 of that file, the HTTPS source of the map, and the observation date.
3. List the classes this task is allowed to use. The list must be non-empty and unique. Leaving `network` off the list refuses any tool labeled `network`.
4. Set `expectedDecision` to the decision you intend to stand behind. If the map disagrees, the result is `review` rather than a silent overwrite.
5. An empty tool list is `allow`. A refusal that matches `expectedDecision` exits 0. That exit code means the refusal is consistent. It does not mean the task ran.

## Run the local check

```sh
python3 scripts/check.py examples/synthetic.json
python3 scripts/check.py /absolute/path/to/your-input.json
```

The bundled receipt is **synthetic**. The script reads the input directory only, makes no network requests, and writes no files. Python 3.10+; no dependencies.

Exit codes: `0` the decision matches `expectedDecision` and the receipt hash matches; `1` review required; `2` invalid input. Passing does not call any tool.

## Input contract

Required: `task`, `sourceUrl` (HTTPS), `observedAt` (ISO date), `receiptFile`, `sha256`, `allow`, `expectedDecision` (`allow` or `refuse`). Tool names are tokens of at most 120 characters. Duplicate names are invalid input.

## Deliverable and limits

Return the task, the decision, the blocked tool names and classes, and the receipt digest. Keep the JSON with the explanation.

The user retains control over which tools run. This skill does not start a server or widen an allowlist.
