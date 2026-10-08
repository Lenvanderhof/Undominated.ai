---
name: undominated-announced-not-safe
description: Refuse a safety claim built from none-announced, unknown, or unrated. Those labels do not establish that a subject is safe.
license: MIT
metadata:
  author: Undominated.ai
  version: "1.0.0"
---

# A missing announcement is not safe

Use when a safety sentence is about to treat a missing announcement as a favourable verdict.

1. The only labels this checker reads are `none-announced`, `unknown`, and `unrated`. Any other label is invalid here.
2. `claimedSafe` true is a review. The result never sets `established` to true.
3. `claimedSafe` false or null can pass, and `established` stays false. A denial is not rewritten into a safety verdict, and a null is not a verdict either.
4. No source is fetched. The label you supply is the whole input.

## Input contract

`label` is one of the three words above. `claimedSafe` is true, false, or null. A string and the JSON number 1 are invalid.

## Deliverable and limits

Return the label, the claim you supplied, and `established: false`. A pass does not certify safety. It records that this label was not promoted to safe.

`examples/synthetic.json` passes with `none-announced` and a null claim. The true-claim example requires review.

## Run the local check

Resolve paths relative to this skill directory:

```sh
python3 scripts/check.py examples/synthetic.json
python3 scripts/check.py /absolute/path/to/your-input.json
```

The examples are **synthetic**, not a safety evaluation. Python 3.10+; standard library only. The script reads one explicit UTF-8 JSON file, prints JSON and makes no network requests or file writes.

Exit codes: `0` consistency check passed, `1` review required, `2` invalid input. CLI argument and malformed-input errors return structured JSON; `--help` displays usage text. Unknown or duplicate JSON fields, non-JSON constants and invalid types are rejected. Files are limited to 1 MiB.

This source-only skill is **not included in undominated-check@0.4.0**. Keep `SKILL.md`, the checker, examples and MIT licence together. A pass validates the bounded supplied-input contract, not production suitability or permission to publish. The skill does not authorize external actions.
