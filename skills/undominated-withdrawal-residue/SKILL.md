---
name: undominated-withdrawal-residue
description: Check an explicitly observed withdrawn numeric field and its named dependents for leftover values. Use after a source value has been removed from a snapshot.
license: MIT
metadata:
  author: Undominated.ai
  version: "1.0.1"
---

# Withdrawal residue

Obtain the post-withdrawal snapshot first. Name the field that was withdrawn and the numeric fields that depend on it. Preserve unknown values as `null`; zero is still a value and must not stand in for absence.

## Input contract

- `withdrawnField`: required exact non-empty field name.
- `withdrawnValue`: required observed value, represented as `null` or a non-negative decimal string.
- `dependents`: required object mapping exact non-empty names to `null` or non-negative decimal strings. Do not list the withdrawn field as its own dependent.

All fields must be supplied explicitly. A non-null withdrawn value requires review. Every named dependent must be null to pass; `"0"` and `"0.00"` are residue. An empty dependent object requires review because no dependency coverage has been supplied.

## Deliverable and limits

Return the observed withdrawn value, the number of dependents checked and each remaining value's field name. The checker trusts the caller's supplied snapshot and dependency list; it cannot establish that withdrawal actually occurred, discover missing dependents or inspect public pages. Textual labels and non-numeric dependent values are outside this contract.

`examples/zero-residue.json` requires review. The synthetic passing example contains a null withdrawn value and two named null dependents.

## Run the local check

Resolve paths relative to this skill directory:

```sh
python3 scripts/check.py examples/synthetic.json
python3 scripts/check.py /absolute/path/to/your-input.json
```

The examples are **synthetic**, not market measurements. Python 3.10+; standard library only. The script reads one explicit UTF-8 JSON file, prints JSON and makes no network requests or file writes.

Exit codes: `0` consistency check passed, `1` review required, `2` invalid input. CLI argument and malformed-input errors return structured JSON; `--help` displays usage text. Unknown or duplicate JSON fields, non-JSON constants and invalid types are rejected. Files are limited to 1 MiB; decimal strings to 1000 characters; identity/field names to 512 characters, with no surrounding whitespace or ASCII control characters.

This source-only skill is **not included in undominated-check@0.4.0**. Keep `SKILL.md`, the checker, examples and MIT licence together. A pass validates the bounded supplied-input contract, not production suitability or permission to publish. The skill does not authorize external actions.
