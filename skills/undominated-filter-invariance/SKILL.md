---
name: undominated-filter-invariance
description: Check that filtering preserves the relative order of retained IDs. Use for search or facet behavior that is intended to hide rows without re-sorting them.
license: MIT
metadata:
  author: Undominated.ai
  version: "1.0.1"
---

# Filter invariance

Compare the filtered list with the full list from the same snapshot. Filtering may remove any rows, including all of them; every remaining ID must have existed before filtering and retain its relative order.

## Input contract

`unfiltered` and `filtered` are required arrays of exact non-empty ID strings. Either array may be empty. Duplicate IDs within either array are invalid. IDs are case-sensitive; normalize identity upstream only when the source contract warrants it.

## Deliverable and limits

Return list sizes, IDs absent from the full population and any order mismatch. The empty list is a valid subsequence, including when both arrays are empty. A nonempty filtered list against an empty population requires review.

This checks **relative order only**. It does not establish that scores, displayed numeric ranks, frontier membership or dominance labels remained unchanged; test those separately. Pass the complete intended population, not a filtered sample that hides an ordering error.

`examples/empty.json` passes. The conflict example reverses retained IDs and requires review.

## Run the local check

Resolve paths relative to this skill directory:

```sh
python3 scripts/check.py examples/synthetic.json
python3 scripts/check.py /absolute/path/to/your-input.json
```

The examples are **synthetic**, not market measurements. Python 3.10+; standard library only. The script reads one explicit UTF-8 JSON file, prints JSON and makes no network requests or file writes.

Exit codes: `0` consistency check passed, `1` review required, `2` invalid input. CLI argument and malformed-input errors return structured JSON; `--help` displays usage text. Unknown or duplicate JSON fields, non-JSON constants and invalid types are rejected. Files are limited to 1 MiB; decimal strings to 1000 characters; identity/field names to 512 characters, with no surrounding whitespace or ASCII control characters.

This source-only skill is **not included in undominated-check@0.4.0**. Keep `SKILL.md`, the checker, examples and MIT licence together. A pass validates the bounded supplied-input contract, not production suitability or permission to publish. The skill does not authorize external actions.
