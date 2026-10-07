---
name: undominated-alias-resolution
description: Resolve an explicitly supplied alias to one distinct concrete target, refusing unresolved or conflicting candidate evidence. Use before treating a latest-style pointer as a concrete model ID.
license: MIT
metadata:
  author: Undominated.ai
  version: "1.0.1"
---

# Alias resolution

Collect the complete candidate set for one alias before resolving it. Never select the first matching row. The caller classifies concrete IDs; this checker does not infer pointer syntax from names.

## Input contract

`alias` is required exact non-empty text. `targets` is a required array of objects with exactly `id` (exact non-empty text) and `concrete` (boolean).

The IDs are case-sensitive. Identical duplicate records count once. Contradictory `concrete` declarations for the same ID require review. A self-target, any unresolved/non-concrete candidate, zero distinct concrete IDs or multiple distinct concrete IDs requires review. An unresolved candidate is not silently ignored merely because another candidate is concrete.

## Deliverable and limits

Return the distinct concrete candidates, unresolved identities, conflicting declarations and reasons for review. Pass means one supplied distinct target is consistently declared concrete with no competing unresolved evidence. It does not prove the target exists, that the alias is current or that the supplied set is complete. No recursive pointer traversal or catalogue fetch is performed.

`examples/unresolved.json` requires review despite containing one concrete target. The original conflict example includes a self-target.

## Run the local check

Resolve paths relative to this skill directory:

```sh
python3 scripts/check.py examples/synthetic.json
python3 scripts/check.py /absolute/path/to/your-input.json
```

The examples are **synthetic**, not market measurements. Python 3.10+; standard library only. The script reads one explicit UTF-8 JSON file, prints JSON and makes no network requests or file writes.

Exit codes: `0` consistency check passed, `1` review required, `2` invalid input. CLI argument and malformed-input errors return structured JSON; `--help` displays usage text. Unknown or duplicate JSON fields, non-JSON constants and invalid types are rejected. Files are limited to 1 MiB; decimal strings to 1000 characters; identity/field names to 512 characters, with no surrounding whitespace or ASCII control characters.

This source-only skill is **not included in undominated-check@0.4.0**. Keep `SKILL.md`, the checker, examples and MIT licence together. A pass validates the bounded supplied-input contract, not production suitability or permission to publish. The skill does not authorize external actions.
