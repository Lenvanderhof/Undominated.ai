#!/usr/bin/env python3
"""Local deterministic check. Python 3 standard library; no network or writes."""
import argparse
import json
import re
import sys
from decimal import Decimal, InvalidOperation
from pathlib import Path

DECIMAL_STRING = re.compile(r"(?:0|[1-9]\d*)(?:\.\d+)?")


def identity(value, label):
    if isinstance(value, bool) or not isinstance(value, str) or not value.strip():
        raise ValueError(f"{label} must be non-empty text")
    return " ".join(value.split()).casefold()


def price_of(row, label):
    """Absent price is absence, never zero. Present price must be a decimal string."""
    if "price" not in row:
        return None
    raw = row["price"]
    if isinstance(raw, bool) or not isinstance(raw, str) or not DECIMAL_STRING.fullmatch(raw):
        raise ValueError(f"{label} price must be a non-negative decimal string")
    try:
        return Decimal(raw)
    except InvalidOperation as exc:
        raise ValueError(f"{label} price is not a parseable decimal") from exc


def check(data):
    unit = data.get("unit")
    if unit not in ("model", "seller"):
        raise ValueError("unit must be model or seller")
    rows = data.get("rows")
    if not isinstance(rows, list) or not rows:
        raise ValueError("rows must be a non-empty list")

    groups, order, issues, conflicts = {}, [], [], []
    for index, row in enumerate(rows):
        if not isinstance(row, dict):
            raise ValueError(f"rows[{index}] must be an object")
        key = identity(row.get("id"), f"rows[{index}].id")
        price = price_of(row, f"rows[{index}]")
        if key not in groups:
            groups[key] = []
            order.append(key)
        groups[key].append((index, price))
        if unit == "seller":
            # A second seller identity is checked across rows below; here we only
            # require that every seller row carries a comparable seller name.
            identity(row.get("seller"), f"rows[{index}].seller")

    if unit == "seller":
        sellers = {}
        for index, row in enumerate(rows):
            key = identity(row.get("seller"), f"rows[{index}].seller")
            sellers.setdefault(key, []).append(index)
        for key in sorted(sellers):
            indices = sellers[key]
            if len(indices) > 1:
                issues.append(f"seller {key!r} appears on rows {indices}, so one seller occupies several entries")

    duplicate_groups, conflicting_groups = [], []
    for key in order:
        members = groups[key]
        if len(members) < 2:
            continue
        indices = [index for index, _ in members]
        group = {"identity": key, "rows": indices, "dropped": len(indices) - 1}
        duplicate_groups.append(group)
        issues.append(f"identity {key!r} appears {len(indices)} times, on rows {indices}")
        prices = [price for _, price in members if price is not None]
        distinct = {format(value, "f") for value in prices}
        if len(distinct) > 1:
            conflicting_groups.append({"identity": key, "rows": indices, "prices": sorted(distinct)})
            issues.append(
                f"identity {key!r} carries conflicting prices {sorted(distinct)} on rows {indices}"
            )

    dropped = sum(group["dropped"] for group in duplicate_groups)
    return {
        "status": "review" if issues else "pass",
        "unit": unit,
        "rows": len(rows),
        "uniqueIdentities": len(groups),
        "rowsDropped": dropped,
        "duplicateGroups": duplicate_groups,
        "conflictingGroups": conflicting_groups,
        "issues": issues,
        "scope": f"identity uniqueness and price agreement across {len(rows)} rows as {unit} identities, one normalisation pass, no external lookup",
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