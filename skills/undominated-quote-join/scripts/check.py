#!/usr/bin/env python3
"""Local deterministic check. Python 3 standard library; no network or writes."""
import argparse
import json
import sys
from pathlib import Path


def text(data, key):
    value = data.get(key)
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{key} must be non-empty text")
    return value


def check(data):
    label = text(data, "label")
    pairs = {
        "provider": (text(data, "catalogueProvider"), text(data, "quoteProvider")),
        "model": (text(data, "catalogueId"), text(data, "quoteId")),
    }
    issues = []
    for name, (left, right) in pairs.items():
        if left == right:
            continue
        if left.casefold() == right.casefold():
            issues.append(f"{name} identity differs by case; folding is not a join")
        else:
            issues.append(f"{name} identity does not match")
    joined = None
    if not issues:
        joined = {"provider": pairs["provider"][0], "model": pairs["model"][0]}
    return {
        "status": "review" if issues else "pass",
        "label": label,
        "catalogueProvider": pairs["provider"][0],
        "quoteProvider": pairs["provider"][1],
        "catalogueId": pairs["model"][0],
        "quoteId": pairs["model"][1],
        "joined": joined,
        "issues": issues,
        "scope": "exact string equality of one provider pair and one model pair; a join is not a quality or price claim",
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
