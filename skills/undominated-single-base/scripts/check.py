#!/usr/bin/env python3
"""Local deterministic check. Python 3 standard library; no network or writes."""
import argparse
import json
import re
import sys
from pathlib import Path

ROLES = ("single-base", "component")
# "peak" inside "off-peak" is removed before the peak test.
OFF_PEAK = re.compile(r"off-peak|off peak|空闲时段|闲时", re.IGNORECASE)
PEAK = re.compile(r"\bpeak\b|高峰时段|忙时", re.IGNORECASE)
HIT = re.compile(r"cache[ -]?hit|cached input|缓存命中", re.IGNORECASE)
MISS = re.compile(r"cache[ -]?miss|缓存未命中", re.IGNORECASE)
CACHED_WORD = re.compile(r"\bcached\b", re.IGNORECASE)
UNCACHED_WORD = re.compile(r"\buncached\b", re.IGNORECASE)
SCOPE = (
    "a single-base claim is unsupported when the excerpt names both sides of a cache split "
    "or both sides of a peak split; amounts are not read"
)


def text(value, label):
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{label} must be non-empty text")
    return value


def splits_in(excerpt):
    found = []
    cache = (HIT.search(excerpt) and MISS.search(excerpt)) or (
        CACHED_WORD.search(excerpt) and UNCACHED_WORD.search(excerpt)
    )
    if cache:
        found.append("cache")
    without_off_peak = OFF_PEAK.sub(" ", excerpt)
    if OFF_PEAK.search(excerpt) and PEAK.search(without_off_peak):
        found.append("schedule")
    return found


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
            raise ValueError(f"claims[{index}].role is not single-base or component")
        excerpt = claim.get("excerpt")
        if not isinstance(excerpt, str) or not excerpt.strip():
            raise ValueError(f"claims[{index}].excerpt must be non-empty text")
        parsed.append({"id": ident, "role": role, "excerpt": excerpt})
    issues = []
    out = []
    for claim in parsed:
        found = splits_in(claim["excerpt"])
        if claim["role"] == "component":
            form = "not-claimed"
        elif found:
            form = "split"
            issues.append(
                f"{claim['id']} claims a single base and the excerpt names the {', '.join(found)} split"
            )
        else:
            form = "unsplit"
        out.append({"id": claim["id"], "role": claim["role"], "form": form, "splits": found})
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
