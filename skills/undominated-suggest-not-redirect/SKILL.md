---
name: undominated-suggest-not-redirect
description: Refuse a language redirect, including when Accept-Language is absent. A missing header is not a request for another locale. Suggest, or do nothing.
license: MIT
metadata:
  author: Undominated.ai
  version: "1.0.0"
---

# Suggest, do not redirect

Use when a language choice is about to become an HTTP redirect. Googlebot sends no Accept-Language header. An absent header is not a locale. A present header is still not permission to redirect.

1. `action` is `suggest`, `none`, or `redirect`.
2. `redirect` is always a review. An absent header and a present header are different reasons, and both stay reviews.
3. `location` is required text only when the action is `redirect`. Otherwise it is null.
4. The header value is not copied into the result. This checker sends no request.

## Input contract

`acceptLanguage` is null, an empty string, or header text without surrounding whitespace or ASCII control characters. `action` is one of the three words above. `location` is null, or non-empty text when the action is `redirect`.

## Deliverable and limits

Return the action and whether the header was absent. A pass means the recorded action was `suggest` or `none`. It does not choose a language, write a Vary header, or fetch a page.

`examples/synthetic.json` passes on an absent header and `suggest`. The redirect examples require review.

## Run the local check

Resolve paths relative to this skill directory:

```sh
python3 scripts/check.py examples/synthetic.json
python3 scripts/check.py /absolute/path/to/your-input.json
```

The examples are **synthetic**, not a crawl of a live site. Python 3.10+; standard library only. The script reads one explicit UTF-8 JSON file, prints JSON and makes no network requests or file writes.

Exit codes: `0` consistency check passed, `1` review required, `2` invalid input. CLI argument and malformed-input errors return structured JSON; `--help` displays usage text. Unknown or duplicate JSON fields, non-JSON constants and invalid types are rejected. Files are limited to 1 MiB; identity text is limited to 512 characters, with no surrounding whitespace or ASCII control characters.

This source-only skill is **not included in undominated-check@0.4.0**. Keep `SKILL.md`, the checker, examples and MIT licence together. A pass validates the bounded supplied-input contract, not production suitability or permission to publish. The skill does not authorize external actions.
