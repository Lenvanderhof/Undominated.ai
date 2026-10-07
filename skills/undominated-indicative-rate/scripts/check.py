#!/usr/bin/env python3
"""Local deterministic check. Python 3 standard library; no network or writes."""
import argparse
import json
import re
import sys
from pathlib import Path

ROLES = ("global", "component")
# "up to" is intentionally absent: it usually names a context length, not a price floor.
PLAIN = re.compile(
    r"\bindicative\b|"
    r"var(?:y|ies) by (?:country|region)|"
    r"depending on (?:your )?(?:country|region)|"
    r"start(?:s|ing)? at|"
    r"as low as|"
    r"仅供参考|因地区而异|各地不同",
    re.IGNORECASE,
)
LIST_PRICE = re.compile(r"list price|刊例价", re.IGNORECASE)
PROMO = re.compile(r"\bfree\b|\bcredit\b|\bpromotional\b|免费|新用户|赠送", re.IGNORECASE)
SCOPE = (
    "a global-rate claim is unsupported when the excerpt qualifies the figure as indicative, "
    "regional, a floor, or a list price beside a promotion; amounts are not read"
)


def text(value, label):
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{label} must be non-empty text")
    return value


def qualified(excerpt):
    if PLAIN.search(excerpt):
        return True
    return LIST_PRICE.search(excerpt) is not None and PROMO.search(excerpt) is not None


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
            raise ValueError(f"claims[{index}].role is not global or component")
        excerpt = claim.get("excerpt")
        if not isinstance(excerpt, str) or not excerpt.strip():
            raise ValueError(f"claims[{index}].excerpt must be non-empty text")
        parsed.append({"id": ident, "role": role, "excerpt": excerpt})
    issues = []
    out = []
    for claim in parsed:
        found = qualified(claim["excerpt"])
        if claim["role"] == "component":
            form = "not-claimed"
        elif found:
            form = "qualified"
            issues.append(f"{claim['id']} claims one global rate and the excerpt qualifies it")
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
