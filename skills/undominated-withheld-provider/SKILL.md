---
name: undominated-withheld-provider
description: Check a supplied publication denylist by exact provider-name matching. A pass does not approve a provider or establish that the supplied list is complete.
license: MIT
metadata:
  author: Undominated.ai
  version: "1.0.0"
---

# Withheld provider names

Use before a provider registry row is marked publishable. Supply the current authoritative denylist as `withheldNames` in a private local input file; the published examples use invented names only.

1. Compare the name exactly against the supplied list. Matching is case-sensitive.
2. A listed name with `publishable` true requires review.
3. A listed name with `publishable` false passes.
4. Any unlisted name passes this bounded check whether or not it is marked publishable. That pass does not approve the provider, its prices, or its privacy policy.

## Input contract

`name` is non-empty text without surrounding whitespace or ASCII control characters, at most 512 characters. `publishable` is a boolean. The JSON number 1 is not true. `withheldNames` is a required array of 1 to 1024 unique names obeying the same text rules. Missing or empty lists are invalid.

## Deliverable and limits

Return the name, whether it belongs to the supplied list, and the boolean you supplied. This checker does not fetch a registry, read a price, load the site's private policy, or establish that the list is complete or authoritative. Obtain and validate the relevant policy before using the result.

`examples/synthetic.json` passes for the invented `ExampleWithheldB` left unpublished. The synthetic publish example requires review.

## Run the local check

Resolve paths relative to this skill directory:

```sh
python3 scripts/check.py examples/synthetic.json
python3 scripts/check.py /absolute/path/to/your-input.json
```

The examples are **synthetic**, not a provider catalogue. Python 3.10+; standard library only. The script reads one explicit UTF-8 JSON file, prints JSON and makes no network requests or file writes.

Exit codes: `0` consistency check passed, `1` review required, `2` invalid input. CLI argument and malformed-input errors return structured JSON; `--help` displays usage text. Unknown or duplicate JSON fields, non-JSON constants and invalid types are rejected. Files are limited to 1 MiB.

This source-only skill is **not included in undominated-check@0.4.0**. Keep `SKILL.md`, the checker, examples and MIT licence together. A pass validates the bounded supplied-input contract, not production suitability or permission to publish. The skill does not authorize external actions.
