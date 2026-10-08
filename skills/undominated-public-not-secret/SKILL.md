---
name: undominated-public-not-secret
description: Refuse a provider token in a PUBLIC_ variable or in browser code. A server environment is outside this refusal and is not approved by a pass.
license: MIT
metadata:
  author: Undominated.ai
  version: "1.0.0"
---

# A token is not PUBLIC_

Use when a provider token is about to be exposed to the page.

1. Read only the fields this checker names.
2. A review is a refusal. A pass stays inside the scope line.
3. Examples are synthetic. They are not a vendor quote, a rank, or a live page.

## Deliverable and limits

A server environment can pass. A pass does not approve the file the token lives in.

`examples/synthetic.json` passes. The other examples are a refusal and invalid input.

## Run the local check

Resolve paths relative to this skill directory:

```sh
python3 scripts/check.py examples/synthetic.json
python3 scripts/check.py /absolute/path/to/your-input.json
```

The examples are **synthetic**, not a vendor quote or a live page. Python 3.10+; standard library only. The script reads one explicit UTF-8 JSON file, prints JSON and makes no network requests or file writes.

Exit codes: `0` consistency check passed, `1` review required, `2` invalid input. CLI argument and malformed-input errors return structured JSON; `--help` displays usage text. Unknown or duplicate JSON fields, non-JSON constants and invalid types are rejected. Files are limited to 1 MiB.

This source-only skill is **not included in undominated-check@0.4.0**. Keep `SKILL.md`, the checker, examples and MIT licence together. A pass validates the bounded supplied-input contract, not production suitability or permission to publish. The skill does not authorize external actions.
