---
name: undominated-marginal-not-whole
description: Refuse a marginal-block bill. A whole request uses the rate of the rung that contains its input length. This checker does not price either mode.
license: MIT
metadata:
  author: Undominated.ai
  version: "1.0.0"
---

# A marginal block is not priced

Use when a context-tier bill is about to split a request into a base block and a dearer tail. The whole request uses the rate of the rung that contains its input length. This checker does not model the other shape.

1. `billing` is `whole-request` or `marginal`.
2. `marginal` is a review. `whole-request` can pass.
3. `priced` is false in both results. No amount is read, and no length is a field.

## Input contract

`billing` is one of those two words. A boolean or a number is invalid.

## Deliverable and limits

Return the billing mode. A pass does not select a rung and does not compute a bill. Rung-select still owns the length. Context-tier still owns the multiple.

`examples/synthetic.json` passes on `whole-request`. The marginal example requires review.

## Run the local check

Resolve paths relative to this skill directory:

```sh
python3 scripts/check.py examples/synthetic.json
python3 scripts/check.py /absolute/path/to/your-input.json
```

The examples are **synthetic**, not a vendor quote or a live page. Python 3.10+; standard library only. The script reads one explicit UTF-8 JSON file, prints JSON and makes no network requests or file writes.

Exit codes: `0` consistency check passed, `1` review required, `2` invalid input. CLI argument and malformed-input errors return structured JSON; `--help` displays usage text. Unknown or duplicate JSON fields, non-JSON constants and invalid types are rejected. Files are limited to 1 MiB.

This source-only skill is **not included in undominated-check@0.4.0**. Keep `SKILL.md`, the checker, examples and MIT licence together. A pass validates the bounded supplied-input contract, not production suitability or permission to publish. The skill does not authorize external actions.
