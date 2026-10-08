#!/usr/bin/env python3
"""Local deterministic check. Python 3 standard library; no network or writes."""
import argparse
import json
import sys
from pathlib import Path

UNSTATED = {"", "unknown", "unspecified", "not-stated"}


def check(data):
    label = data.get("label")
    if not isinstance(label, str) or not label.strip():
        raise ValueError("label must be non-empty text")
    source = data.get("sourceLabel")
    published = data.get("publishedLabel")
    if source is not None and not isinstance(source, str):
        raise ValueError("sourceLabel must be text or null")
    if not isinstance(published, str) or not published.strip():
        raise ValueError("publishedLabel must be non-empty text")
    source_text = "" if source is None else source.strip()
    issues = []
    emitted = None
    if source_text.casefold() in UNSTATED:
        if published != "unknown":
            issues.append("a missing quantisation was published as something other than unknown")
        else:
            emitted = "unknown"
    elif published == source:
        emitted = published
    elif published.casefold() == source.casefold():
        issues.append("quantisation label differs by case; folding is not a match")
    else:
        issues.append("published quantisation does not repeat the source label; aliases are not translated")
    return {
        "status": "review" if issues else "pass",
        "label": label,
        "sourceLabel": source if isinstance(source, str) else None,
        "publishedLabel": published,
        "emitted": emitted,
        "issues": issues,
        "scope": "label equality only; unknown stays unknown and no weight format is inferred",
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
