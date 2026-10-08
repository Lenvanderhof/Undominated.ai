#!/usr/bin/env python3
"""Local deterministic check. Python 3 standard library; no network or writes."""
import argparse
import json
import re
import sys
from pathlib import Path

ROLES = ("base", "component")
# A word boundary after × misses whitespace and end-of-input because × is not a word character.
# Excluding a following word character handles x and × without matching "2xyz" or "xAI".
# Negation is not parsed: the word "multiplier" is a hit even in a denial.
MULT = re.compile(
    r"\bmultiplier\b|倍率|加成|\btimes the\b|\b\d+(?:\.\d+)?\s*[x×](?!\w)",
    re.IGNORECASE,
)
SCOPE = (
    "a base-rate claim is unsupported when the excerpt names a multiplier; "
    "the number in that wording is not read as a price"
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
        role = claim.get("role")
        if role not in ROLES:
            raise ValueError(f"claims[{index}].role is not base or component")
        excerpt = claim.get("excerpt")
        if not isinstance(excerpt, str) or not excerpt.strip():
            raise ValueError(f"claims[{index}].excerpt must be non-empty text")
        parsed.append({"id": ident, "role": role, "excerpt": excerpt})
    issues = []
    out = []
    for claim in parsed:
        found = MULT.search(claim["excerpt"]) is not None
        if claim["role"] == "component":
            form = "not-claimed"
        elif found:
            form = "multiplied"
            issues.append(f"{claim['id']} claims a base rate and the excerpt names a multiplier")
        else:
            form = "plain"
        out.append({"id": claim["id"], "role": claim["role"], "form": form})
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
