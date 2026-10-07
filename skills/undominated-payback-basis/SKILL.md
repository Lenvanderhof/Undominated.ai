---
name: undominated-payback-basis
description: Check switching-cost payback against savings per period using exact arithmetic. Use when a migration claims to pay back in a stated number of periods.
license: MIT
metadata:
  author: Undominated.ai
  version: "1.0.1"
---

# Payback basis

Payback is switching cost divided by savings per period. Dividing by the whole bill answers a different question. Establish that the supplied amounts have the same currency and that the saving and optional whole bill use one common period before running the check.

## Input contract

- `currency`: required three uppercase ASCII letters. The checker validates the format, not membership in a currency registry or conversion accuracy.
- `switchingCost` and `savingPerPeriod`: required non-negative decimal strings.
- `claimedPeriods`: required non-negative decimal string, or `null` for an unknown claim.
- `wholeBill`: optional non-negative decimal string or `null`; used only to diagnose a mistaken denominator.

JSON numbers, exponents, signs and non-finite values are invalid. Negative savings are outside this non-negative payback contract; do not turn a cost increase into a saving.

## Deliverable and limits

Return `exactRatio` as reduced numerator/denominator strings. `recomputedPeriods` is an exact decimal only when that fraction terminates; otherwise it is `null`. No default Decimal precision or floating-point tolerance is used. A rounded decimal claim of one third requires review; the exact ratio remains `1/3`. A zero saving makes payback undefined, including when switching cost is zero. Zero switching cost with positive savings gives exact zero payback.

This contract compares exact claims. If a product needs rounded or ceiling periods, define and test that separate display rule rather than presenting its rounded value as an exact equality. The checker does not verify source truth, period alignment, taxes, discounting, exchange rates or payment timing.

`examples/repeating.json` and `examples/precision-tail.json` both require review. The original conflict example divides by the whole bill.

## Run the local check

Resolve paths relative to this skill directory:

```sh
python3 scripts/check.py examples/synthetic.json
python3 scripts/check.py /absolute/path/to/your-input.json
```

The examples are **synthetic**, not market measurements. Python 3.10+; standard library only. The script reads one explicit UTF-8 JSON file, prints JSON and makes no network requests or file writes.

Exit codes: `0` consistency check passed, `1` review required, `2` invalid input. CLI argument and malformed-input errors return structured JSON; `--help` displays usage text. Unknown or duplicate JSON fields, non-JSON constants and invalid types are rejected. Files are limited to 1 MiB; decimal strings to 1000 characters; identity/field names to 512 characters, with no surrounding whitespace or ASCII control characters.

This source-only skill is **not included in undominated-check@0.4.0**. Keep `SKILL.md`, the checker, examples and MIT licence together. A pass validates the bounded supplied-input contract, not production suitability or permission to publish. The skill does not authorize external actions.
