#!/usr/bin/env python3
"""Local deterministic check. Python 3 standard library; no network or writes."""
import argparse
import json
import re
import sys
from decimal import Decimal
from pathlib import Path


def score_of(value, label):
    if value is None:
        return None
    if isinstance(value, bool) or not isinstance(value, str) or not re.fullmatch(r"(?:0|[1-9]\d*)(?:\.\d+)?", value):
        raise ValueError(f"{label} must be a non-negative decimal string or null")
    return Decimal(value)


def check(data):
    label = data.get("label")
    if not isinstance(label, str) or not label.strip():
        raise ValueError("label must be non-empty text")
    rows = data.get("rows")
    ranked_ids = data.get("rankedIds")
    if not isinstance(rows, list) or not rows:
        raise ValueError("at least one row is required")
    if not isinstance(ranked_ids, list):
        raise ValueError("rankedIds must be an array")
    parsed, seen = [], set()
    for index, row in enumerate(rows):
        if not isinstance(row, dict):
            raise ValueError("each row must be an object")
        if "score" not in row:
            raise ValueError(f"rows[{index}].score must be a decimal string or null")
        ident = row.get("id")
        if not isinstance(ident, str) or not ident.strip() or ident in seen:
            raise ValueError("each row id must be unique non-empty text")
        seen.add(ident)
        parsed.append({"id": ident, "score": score_of(row.get("score"), f"rows[{index}].score")})
    if any(not isinstance(ident, str) or not ident.strip() for ident in ranked_ids) or len(ranked_ids) != len(set(ranked_ids)):
        raise ValueError("rankedIds must be unique non-empty text")
    by_id = {row["id"]: row for row in parsed}
    issues = []
    for ident in ranked_ids:
        row = by_id.get(ident)
        if row is None:
            issues.append(f"{ident} is ranked but is not in the table")
        elif row["score"] is None:
            issues.append(f"{ident} is unrated and was placed in the ranked list")
    for row in parsed:
        if row["score"] is not None and row["id"] not in ranked_ids:
            issues.append(f"{row['id']} has a score and was dropped from the ranked list")
    unrated = [row["id"] for row in parsed if row["score"] is None]
    ranked = None
    if not issues:
        ranked = [{"id": ident, "score": format(by_id[ident]["score"], "f")} for ident in ranked_ids]
    return {
        "status": "review" if issues else "pass",
        "label": label,
        "ranked": ranked,
        "unrated": unrated,
        "issues": issues,
        "scope": "one supplied table; a null score stays unrated and is not zero",
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
