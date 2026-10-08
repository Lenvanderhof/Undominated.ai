---
name: undominated-ladder-not-flattened
description: Refuse a published context-tier ladder whose rung count differs from the source. Dropping a rung flattens the ladder. Adding a rung invents one. Prices and boundaries are not read.
license: MIT
metadata:
  author: Undominated.ai
  version: "1.0.0"
---

# Keep every ladder rung

Use when a context-tier ladder is about to be published. The source count and the published count have to be the same integer. A shorter published ladder is the failure that flattened a tier boundary. A longer one invents a rung.

1. Compare the two counts. Do not read a price, a token boundary, or a multiple.
2. A smaller published count is a review. A larger published count is a different review.
3. Context-tier still owns the multiple. Rung-select still owns which rung contains a length. This checker does neither.

## Input contract

`sourceRungs` and `publishedRungs` are integers of at least 1. A boolean is not an integer.

## Deliverable and limits

Return both counts and whether a rung was dropped or added. A pass means the counts match. It does not say the boundaries are right, and it does not price a request.

`examples/synthetic.json` passes on three source rungs published as three. The other examples are a dropped rung, an added rung, and a zero count.

## Run the local check

Resolve paths relative to this skill directory:

```sh
python3 scripts/check.py examples/synthetic.json
python3 scripts/check.py /absolute/path/to/your-input.json
```

The examples are **synthetic**, not a vendor quote or a live page. Python 3.10+; standard library only. The script reads one explicit UTF-8 JSON file, prints JSON and makes no network requests or file writes.

Exit codes: `0` consistency check passed, `1` review required, `2` invalid input. CLI argument and malformed-input errors return structured JSON; `--help` displays usage text. Unknown or duplicate JSON fields, non-JSON constants and invalid types are rejected. Files are limited to 1 MiB.

This source-only skill is **not included in undominated-check@0.4.0**. Keep `SKILL.md`, the checker, examples and MIT licence together. A pass validates the bounded supplied-input contract, not production suitability or permission to publish. The skill does not authorize external actions.
