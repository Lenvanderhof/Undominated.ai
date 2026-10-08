---
name: undominated-rollback-not-baseline
description: Refuse to record a rolled-back or unproven deploy as the accepted baseline. The baseline advances only after a deploy has proven good.
license: MIT
metadata:
  author: Undominated.ai
  version: "1.0.0"
---

# A rollback is not the baseline

Use when a deploy result is about to move the upstream baseline. A rolled-back deploy must not be recorded as accepted. An unproven deploy must not be recorded as accepted. Recording nothing can pass.

1. `outcome` is `proven`, `rolled-back`, or `unproven`.
2. `recordBaseline` true is a review unless the supplied outcome is `proven`.
3. `eligible` is true only for that proven recording. This checker does not contact a host.

## Input contract

`outcome` is one of those three words. `recordBaseline` is a boolean. A JSON number is not a boolean.

## Deliverable and limits

Return the supplied outcome and whether that pair is eligible to record. A pass on `proven` does not prove the deploy. A pass on a rollback that is not recorded does not say the rollback succeeded.

`examples/synthetic.json` passes on a rolled-back deploy that is not recorded. The recording examples cover a rollback and a proven deploy.

## Run the local check

Resolve paths relative to this skill directory:

```sh
python3 scripts/check.py examples/synthetic.json
python3 scripts/check.py /absolute/path/to/your-input.json
```

The examples are **synthetic**, not a vendor quote or a live page. Python 3.10+; standard library only. The script reads one explicit UTF-8 JSON file, prints JSON and makes no network requests or file writes.

Exit codes: `0` consistency check passed, `1` review required, `2` invalid input. CLI argument and malformed-input errors return structured JSON; `--help` displays usage text. Unknown or duplicate JSON fields, non-JSON constants and invalid types are rejected. Files are limited to 1 MiB.

This source-only skill is **not included in undominated-check@0.4.0**. Keep `SKILL.md`, the checker, examples and MIT licence together. A pass validates the bounded supplied-input contract, not production suitability or permission to publish. The skill does not authorize external actions.
