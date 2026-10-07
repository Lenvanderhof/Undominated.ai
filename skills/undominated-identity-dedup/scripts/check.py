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

    groups, comparisons, issues = {}, {}, []
    for index, row in enumerate(rows):
        if not isinstance(row, dict):
            raise ValueError(f"rows[{index}] must be an object")
        model_id = identity(row.get("id"), f"rows[{index}].id")
        seller = None
        if unit == "seller" or "seller" in row:
            seller = identity(row.get("seller"), f"rows[{index}].seller")
        key = seller if unit == "seller" else model_id
        groups.setdefault(key, []).append(index)
        # Seller counts group by seller; price disagreement additionally needs
        # the same supplied model identity. Distinct sellers are not conflicting
        # quotes for a model, and a seller's distinct models have distinct rates.
        comparison = (key, model_id, seller)
        comparisons.setdefault(comparison, []).append((index, price_of(row, f"rows[{index}]")))

    duplicate_groups, conflicting_groups = [], []
    for key, indices in groups.items():
        if len(indices) < 2:
            continue
        duplicate_groups.append({"identity": key, "rows": indices, "dropped": len(indices) - 1})
        issues.append(f"{unit} identity {key!r} appears {len(indices)} times, on rows {indices}")

    for (key, model_id, seller), members in comparisons.items():
        # Decimal equality/hash preserves supplied digits and equates 1.0 with
        # 1.00. normalize() would silently round under the active context.
        distinct = {price for _, price in members if price is not None}
        if len(distinct) < 2:
            continue
        indices = [index for index, _ in members]
        values = []
        for price in sorted(distinct):
            value = format(price, "f")
            values.append(value.rstrip("0").rstrip(".") if "." in value else value)
        conflicting_groups.append({"identity": key, "model": model_id, "seller": seller, "rows": indices, "prices": values})
        issues.append(f"supplied quote identity {model_id!r} at seller {seller!r} carries different prices {values} on rows {indices}")

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
        "scope": f"identity uniqueness across {len(rows)} rows as {unit} identities; numeric price disagreement only within supplied model/seller identities, no proof of equivalent currency, units or service terms",
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
