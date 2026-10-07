#!/usr/bin/env python3
"""Local deterministic check. Python 3 standard library; no network or writes."""
import argparse
import json
import sys
from pathlib import Path


def flag(value, label):
    if not isinstance(value, bool):
        raise ValueError(f"{label} must be a boolean")
    return value


def check(data):
    label = data.get("label")
    population = data.get("statedPopulation")
    if not isinstance(label, str) or not label.strip():
        raise ValueError("label must be non-empty text")
    if not isinstance(population, str) or not population.strip():
        raise ValueError("statedPopulation must be non-empty text")
    claimed = data.get("claimedCount")
    if isinstance(claimed, bool) or not isinstance(claimed, int) or claimed < 0:
        raise ValueError("claimedCount must be a non-negative integer")
    rows = data.get("rows")
    if not isinstance(rows, list) or not rows:
        raise ValueError("at least one row is required")
    parsed, seen = [], set()
    for index, row in enumerate(rows):
        if not isinstance(row, dict):
            raise ValueError("each row must be an object")
        ident = row.get("id")
        if not isinstance(ident, str) or not ident.strip() or ident in seen:
            raise ValueError("each row id must be unique non-empty text")
        seen.add(ident)
        parsed.append({
            "id": ident,
            "stated": flag(row.get("inStatedPopulation"), f"rows[{index}].inStatedPopulation"),
            "computed": flag(row.get("inComputedPopulation"), f"rows[{index}].inComputedPopulation"),
        })
    stated_ids = [row["id"] for row in parsed if row["stated"]]
    computed_ids = [row["id"] for row in parsed if row["computed"]]
    outside = [row["id"] for row in parsed if row["computed"] and not row["stated"]]
    omitted = [row["id"] for row in parsed if row["stated"] and not row["computed"]]
    issues = []
    if claimed != len(computed_ids):
        issues.append("claimed count does not equal the computed population")
    if omitted:
        issues.append("computed population is a smaller subset of the stated population")
    if outside:
        issues.append("computed population includes rows outside the stated population")
    counts = None
    if not issues:
        counts = {"stated": len(stated_ids), "computed": len(computed_ids), "claimed": claimed}
    return {
        "status": "review" if issues else "pass",
        "label": label,
        "statedPopulation": population,
        "counts": counts,
        "omittedFromComputed": omitted,
        "outsideStated": outside,
        "issues": issues,
        "scope": "set equality of one stated population and one computed population; no correlation is calculated",
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
