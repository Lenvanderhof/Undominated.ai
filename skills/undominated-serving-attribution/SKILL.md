---
name: undominated-serving-attribution
description: Check that an explicit claimed score belongs to its named model or serving mode. Use when a model headline may have inherited a mode-specific score.
license: MIT
metadata:
  author: Undominated.ai
  version: "1.0.1"
---

# Serving-mode attribution

Keep model and serving-mode observations separate. Compare the actual `claimedScore` with the score for `claimSubject`; the presence of some score is insufficient. A mode score needs a named mode, including when the main claim concerns the model. Equality of numbers does not establish shared provenance.

## Input contract

Required fields:

- `model`: exact non-empty model identity.
- `servingMode`: exact non-empty mode identity or `null` when unknown.
- `claimSubject`: `model` or `mode`.
- `modelScore`, `modeScore`, `claimedScore`: non-negative decimal strings or `null`; never JSON numbers.

All fields must be supplied explicitly. A missing selected score or unknown claimed score requires review. A mode claim or supplied mode score without a named mode also requires review; a model-only claim may leave both mode fields null. Decimal equality is exact: `"100"` and `"100.00"` are equal; an additional decimal tail is preserved. There is no automatic substitution from the other score field.

## Deliverable and limits

Return the selected `expectedScore`, supplied claim, identities and any discrepancy. A pass establishes only consistency of the supplied identity and numeric fields. It does not show that a benchmark scored the named object or that two observations share conditions. Inspect the underlying source before making that attribution.

`examples/missing-mode.json` requires review. The conflict example uses a mode score while the model score is absent.

## Run the local check

Resolve paths relative to this skill directory:

```sh
python3 scripts/check.py examples/synthetic.json
python3 scripts/check.py /absolute/path/to/your-input.json
```

The examples are **synthetic**, not market measurements. Python 3.10+; standard library only. The script reads one explicit UTF-8 JSON file, prints JSON and makes no network requests or file writes.

Exit codes: `0` consistency check passed, `1` review required, `2` invalid input. CLI argument and malformed-input errors return structured JSON; `--help` displays usage text. Unknown or duplicate JSON fields, non-JSON constants and invalid types are rejected. Files are limited to 1 MiB; decimal strings to 1000 characters; identity/field names to 512 characters, with no surrounding whitespace or ASCII control characters.

This source-only skill is **not included in undominated-check@0.4.0**. Keep `SKILL.md`, the checker, examples and MIT licence together. A pass validates the bounded supplied-input contract, not production suitability or permission to publish. The skill does not authorize external actions.
