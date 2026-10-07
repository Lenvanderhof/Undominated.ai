#!/usr/bin/env python3
"""Local deterministic check. Python 3 standard library; no network or writes."""
import argparse
import json
import re
import sys
from datetime import date
from pathlib import Path

ISO_DATE = re.compile(r"[0-9]{4}-[0-9]{2}-[0-9]{2}")
CONTENT_HASH = re.compile(r"[0-9a-fA-F]{6,}")


def iso_date(value, label):
    if not isinstance(value, str) or not ISO_DATE.fullmatch(value):
        raise ValueError(f"{label} must be an ISO date string YYYY-MM-DD")
    try:
        return date.fromisoformat(value)
    except ValueError as exc:
        raise ValueError(f"{label} is not a real calendar date: {value}") from exc


def check(data):
    evaluated = iso_date(data.get("evaluatedAt"), "evaluatedAt")
    sources = data.get("sources")
    if not isinstance(sources, list) or not sources:
        raise ValueError("at least one source is required")
    issues, rows = [], []
    counts = {"fresh": 0, "stale": 0, "unverifiable": 0}
    for index, source in enumerate(sources):
        if not isinstance(source, dict):
            raise ValueError("each source must be an object")
        ident = source.get("id")
        if not isinstance(ident, str) or not ident.strip():
            raise ValueError(f"sources[{index}].id must be non-empty text")
        budget = source.get("budgetDays")
        if isinstance(budget, bool) or not isinstance(budget, int) or budget < 0:
            raise ValueError(f"sources[{index}].budgetDays must be a non-negative integer")
        observed = source.get("observed")
        if observed is not None:
            if not isinstance(observed, list) or len(observed) != 2:
                raise ValueError(f"sources[{index}].observed must be null or [beforeHash, afterHash]")
            for value in observed:
                if not isinstance(value, str) or not CONTENT_HASH.fullmatch(value):
                    raise ValueError(f"sources[{index}].observed hashes must be hex strings")
        fetched = source.get("fetchedAt")
        row = {"id": ident, "ageDays": None, "budgetDays": budget, "state": None, "refetched": None}
        if fetched is None:
            state = "unverifiable"
            issues.append(f"{ident}: no fetch date recorded, so freshness cannot be established")
        else:
            age = (evaluated - iso_date(fetched, f"sources[{index}].fetchedAt")).days
            row["ageDays"] = age
            if age < 0:
                state = "unverifiable"
                issues.append(f"{ident}: fetchedAt is after evaluatedAt, so the fetch date is not usable")
            elif age <= budget:
                state = "fresh"
            else:
                state = "stale"
                issues.append(f"{ident}: {age}d old against a declared {budget}d budget")
        row["state"] = state
        if observed is not None:
            row["refetched"] = observed[0] != observed[1]
            if not row["refetched"]:
                issues.append(f"{ident}: identical refetch is not a measurement")
        counts[state] += 1
        rows.append(row)
    return {
        "status": "review" if issues else "pass",
        "evaluatedAt": data["evaluatedAt"],
        "sources": rows,
        "counts": counts,
        "issues": issues,
        "scope": "each source against its own declared staleness budget, whole days, refetch compared by content hash",
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