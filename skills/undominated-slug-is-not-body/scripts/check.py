#!/usr/bin/env python3
"""Local deterministic check. Python 3 standard library; no network or writes."""
import argparse
import json
import re
import sys
from pathlib import Path

# A locator is never searched. "$", "1M", "usd" in a slug, and "元" are not words.
ASSERTS = ("currency", "quantity", "both")
CURRENCY = re.compile(r"\bUSD\b|\bEUR\b|\bGBP\b|\bCNY\b|人民币")
QUANTITY = re.compile(r"\bmillion\b|百万|\bthousand\b|千\s*tokens?", re.IGNORECASE)
SCOPE = (
    "a currency or quantity claim is supported only by those words in the excerpt; "
    "a locator, a URL, or a slug is ignored"
)


def text(value, label):
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{label} must be non-empty text")
    return value


def check(data):
    label = text(data.get("label"), "label")
    claims = data.get("claims")
    if not isinstance(claims, list) or not claims:
        raise ValueError("at least one claim is required")
    parsed = []
    seen = set()
    for index, claim in enumerate(claims):
        if not isinstance(claim, dict):
            raise ValueError("each claim must be an object")
        if "amount" in claim or "price" in claim:
            raise ValueError(f"claims[{index}] must not include an amount or a price")
        ident = text(claim.get("id"), f"claims[{index}].id")
        if ident in seen:
            raise ValueError("each claim id must be unique")
        seen.add(ident)
        asserts = claim.get("asserts")
        if asserts not in ASSERTS:
            raise ValueError(f"claims[{index}].asserts is not currency, quantity, or both")
        excerpt = claim.get("excerpt")
        if not isinstance(excerpt, str) or not excerpt.strip():
            raise ValueError(f"claims[{index}].excerpt must be non-empty text")
        if "locator" in claim and not isinstance(claim.get("locator"), str):
            raise ValueError(f"claims[{index}].locator must be text")
        parsed.append({"id": ident, "asserts": asserts, "excerpt": excerpt})
    issues = []
    out = []
    for claim in parsed:
        currency = CURRENCY.search(claim["excerpt"]) is not None
        quantity = QUANTITY.search(claim["excerpt"]) is not None
        need_currency = claim["asserts"] in ("currency", "both")
        need_quantity = claim["asserts"] in ("quantity", "both")
        ok = (not need_currency or currency) and (not need_quantity or quantity)
        if not ok:
            issues.append(
                f"{claim['id']} asserts {claim['asserts']} in the body, and the excerpt does not spell it"
            )
        out.append(
            {
                "id": claim["id"],
                "asserts": claim["asserts"],
                "form": "body" if ok else "unsupported",
                "currencyForm": "spelled" if currency else "absent",
                "quantityForm": "spelled" if quantity else "absent",
                "locatorIgnored": True,
            }
        )
    return {
        "status": "pass" if not issues else "review",
        "label": label,
        "claims": out,
        "issues": issues,
        "scope": SCOPE,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", help="JSON input path; no network fetches")
    args = parser.parse_args()
    try:
        data = json.loads(Path(args.input).read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            raise ValueError("input must be a JSON object")
        result = check(data)
        print(json.dumps(result, indent=2))
        return 0 if result["status"] == "pass" else 1
    except (ValueError, KeyError, TypeError, OSError, ArithmeticError, AttributeError) as exc:
        print(json.dumps({"status": "invalid", "error": str(exc)}))
        return 2


if __name__ == "__main__":
    sys.exit(main())
