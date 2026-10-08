---
name: undominated-load-not-catalogue
description: Refuse a load() return labelled catalogue. The catalogue is imported by the page. Putting it in the load return inlines it into every prerendered page.
license: MIT
metadata:
  author: Undominated.ai
  version: "1.0.0"
---

# A load return is not the catalogue

Use when a prerendered page is about to return the shared catalogue from `load()`. That return is copied into every page. The catalogue is imported by the component instead.

1. `returned` is `page`, `empty`, or `catalogue`.
2. `catalogue` is a review. `page` and `empty` can pass.
3. The result does not copy a payload. This checker fetches no page.

## Input contract

`returned` is one of those three words. A boolean is invalid.

## Deliverable and limits

Return the label and whether it inlines the catalogue. A pass means the supplied label was `page` or `empty`. It does not inspect the document, and a wrong label can hide a real inline.

`examples/synthetic.json` passes on `page`. The catalogue example requires review.

## Run the local check

Resolve paths relative to this skill directory:

```sh
python3 scripts/check.py examples/synthetic.json
python3 scripts/check.py /absolute/path/to/your-input.json
```

The examples are **synthetic**, not a vendor quote or a live page. Python 3.10+; standard library only. The script reads one explicit UTF-8 JSON file, prints JSON and makes no network requests or file writes.

Exit codes: `0` consistency check passed, `1` review required, `2` invalid input. CLI argument and malformed-input errors return structured JSON; `--help` displays usage text. Unknown or duplicate JSON fields, non-JSON constants and invalid types are rejected. Files are limited to 1 MiB.

This source-only skill is **not included in undominated-check@0.4.0**. Keep `SKILL.md`, the checker, examples and MIT licence together. A pass validates the bounded supplied-input contract, not production suitability or permission to publish. The skill does not authorize external actions.
