---
name: undominated-unit-not-scaled
description: Refuse a scale factor or a restated invoice unit. A per-thousand row is not turned into a per-million row by multiplying. Amounts are not read.
license: MIT
metadata:
  author: Undominated.ai
  version: "1.0.0"
---

# Do not scale the invoice unit

Use when a display conversion would restate the unit a row already states. A per-thousand invoice does not become per-million because a header, a factor of one thousand, or another sentence uses a different meter.

1. `statedUnit` is one of `per_million_tokens`, `per_thousand_tokens`, `per_token`, `per_second`, `per_megapixel`, or `per_hour`. `per_1m` and `per M` are invalid, and they are not expanded.
2. A `factor`, including zero and one, is a review. The factor is not applied and is not copied into the result.
3. A `scaledUnit` that differs from `statedUnit` is a review. The same unit, or null, can pass when no factor is present.
4. Amounts are not a field of this checker. This checker does not read a price.

## Input contract

`statedUnit` is one allowlisted unit. `scaledUnit` is one allowlisted unit or null. `factor` is a non-negative ASCII decimal string or null. A JSON number is invalid.

## Deliverable and limits

Return the stated unit, the scaled unit you supplied, and whether a factor was refused. A pass does not convert the unit and does not create a vendor quote.

`examples/synthetic.json` passes for a per-thousand unit left as stated. The restatement example requires review.

## Run the local check

Resolve paths relative to this skill directory:

```sh
python3 scripts/check.py examples/synthetic.json
python3 scripts/check.py /absolute/path/to/your-input.json
```

The examples are **synthetic**, not a vendor price. Python 3.10+; standard library only. The script reads one explicit UTF-8 JSON file, prints JSON and makes no network requests or file writes.

Exit codes: `0` consistency check passed, `1` review required, `2` invalid input. CLI argument and malformed-input errors return structured JSON; `--help` displays usage text. Unknown or duplicate JSON fields, non-JSON constants and invalid types are rejected. Files are limited to 1 MiB; decimal strings are limited to 1000 characters.

This source-only skill is **not included in undominated-check@0.4.0**. Keep `SKILL.md`, the checker, examples and MIT licence together. A pass validates the bounded supplied-input contract, not production suitability or permission to publish. The skill does not authorize external actions.
