---
name: undominated-withheld-provider
description: Refuse publication of the literal provider names FakeProvider and Stealth. Any other name is outside this withhold, and a pass does not approve it.
license: MIT
metadata:
  author: Undominated.ai
  version: "1.0.0"
---

# Withheld provider names

Use before a provider registry row is marked publishable. Two literal names stay unpublished: `FakeProvider` and `Stealth`.

1. Compare the name exactly. `stealth` and `Fakeprovider` are not those names.
2. A withheld name with `publishable` true is a review.
3. A withheld name with `publishable` false passes.
4. Any other name passes this checker whether or not it is marked publishable. That pass does not approve the provider, its prices, or its privacy policy.

## Input contract

`name` is non-empty text without surrounding whitespace or ASCII control characters, at most 512 characters. `publishable` is a boolean. The JSON number 1 is not true.

## Deliverable and limits

Return the name, whether it is one of the two withheld literals, and the boolean you supplied. This checker does not fetch a registry or read a price.

`examples/synthetic.json` passes for `Stealth` left unpublished. The publish examples require review.

## Run the local check

Resolve paths relative to this skill directory:

```sh
python3 scripts/check.py examples/synthetic.json
python3 scripts/check.py /absolute/path/to/your-input.json
```

The examples are **synthetic**, not a provider catalogue. Python 3.10+; standard library only. The script reads one explicit UTF-8 JSON file, prints JSON and makes no network requests or file writes.

Exit codes: `0` consistency check passed, `1` review required, `2` invalid input. CLI argument and malformed-input errors return structured JSON; `--help` displays usage text. Unknown or duplicate JSON fields, non-JSON constants and invalid types are rejected. Files are limited to 1 MiB.

This source-only skill is **not included in undominated-check@0.4.0**. Keep `SKILL.md`, the checker, examples and MIT licence together. A pass validates the bounded supplied-input contract, not production suitability or permission to publish. The skill does not authorize external actions.
