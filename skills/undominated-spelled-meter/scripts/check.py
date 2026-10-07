#!/usr/bin/env python3
"""Local deterministic check. Python 3 standard library; no network or writes."""
import argparse
import json
import re
import sys
from pathlib import Path

# Symbols and abbreviations are absent on purpose.
# "$" is not USD. "1M" and "per 1M" are not million. "元" is not CNY.
CURRENCIES = ("USD", "EUR", "GBP", "CNY")
UNITS = ("million", "thousand")
CURRENCY_WORD = {
    "USD": re.compile(r"\bUSD\b"),
    "EUR": re.compile(r"\bEUR\b"),
    "GBP": re.compile(r"\bGBP\b"),
    "CNY": re.compile(r"\bCNY\b|人民币"),
}
UNIT_WORD = {
    "million": re.compile(r"\bmillion\b|百万", re.IGNORECASE),
    "thousand": re.compile(r"\bthousand\b|千\s*tokens?", re.IGNORECASE),
}
SCOPE = (
    "a currency code and a quantity word are supported only by those words in the excerpt you supply; "
    "symbols, 1M, and the character 元 are not expanded"
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
        currency = claim.get("currency")
        if currency not in CURRENCIES:
            raise ValueError(f"claims[{index}].currency is not an allowlisted code")
        unit = claim.get("unit")
        if unit not in UNITS:
            raise ValueError(f"claims[{index}].unit is not an allowlisted word")
        excerpt = claim.get("excerpt")
        if not isinstance(excerpt, str) or not excerpt.strip():
            raise ValueError(f"claims[{index}].excerpt must be non-empty text")
        parsed.append({"id": ident, "currency": currency, "unit": unit, "excerpt": excerpt})
    issues = []
    out = []
    for claim in parsed:
        currency_spelled = CURRENCY_WORD[claim["currency"]].search(claim["excerpt"]) is not None
        unit_spelled = UNIT_WORD[claim["unit"]].search(claim["excerpt"]) is not None
        row_issues = []
        if not currency_spelled:
            row_issues.append(f"{claim['id']} claims {claim['currency']} and the excerpt does not spell that code")
        if not unit_spelled:
            row_issues.append(f"{claim['id']} claims {claim['unit']} and the excerpt does not spell that word")
        issues.extend(row_issues)
        out.append({
            "id": claim["id"],
            "currency": claim["currency"],
            "unit": claim["unit"],
            "currencyForm": "spelled" if currency_spelled else "absent",
            "unitForm": "spelled" if unit_spelled else "absent",
            "form": "matched" if not row_issues else "unsupported",
        })
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
