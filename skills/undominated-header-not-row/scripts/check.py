#!/usr/bin/env python3
"""Local deterministic check. Python 3 standard library; no network or writes."""
import argparse
import json
import sys
from pathlib import Path

# The display header is never a row's invoice unit. per M is not on this list.
UNITS = {
    "per_million_tokens",
    "per_thousand_tokens",
    "per_token",
    "per_second",
    "per_megapixel",
    "per_hour",
}
SCOPE = (
    "a unit claim is supported only by the unit on that row; "
    "a display header is ignored and amounts are not read"
)


def text(value, label):
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{label} must be non-empty text")
    return value


def unit(value, label):
    if not isinstance(value, str) or value not in UNITS:
        raise ValueError(f"{label} must be an allowlisted unit")
    return value


def check(data):
    if "amount" in data or "price" in data:
        raise ValueError("input must not include an amount or a price")
    label = text(data.get("label"), "label")
    if "headerUnit" not in data:
        raise ValueError("headerUnit is required")
    header = unit(data.get("headerUnit"), "headerUnit")
    rows = data.get("rows")
    if not isinstance(rows, list) or not rows:
        raise ValueError("at least one row is required")
    parsed = []
    seen = set()
    for index, item in enumerate(rows):
        if not isinstance(item, dict):
            raise ValueError("each row must be an object")
        if "amount" in item or "price" in item:
            raise ValueError(f"rows[{index}] must not include an amount or a price")
        ident = text(item.get("id"), f"rows[{index}].id")
        if ident in seen:
            raise ValueError("each row id must be unique")
        seen.add(ident)
        if "claimedUnit" not in item or "rowUnit" not in item:
            raise ValueError(f"rows[{index}] needs claimedUnit and rowUnit")
        claimed = unit(item.get("claimedUnit"), f"rows[{index}].claimedUnit")
        row_unit = item.get("rowUnit")
        if row_unit is not None:
            row_unit = unit(row_unit, f"rows[{index}].rowUnit")
        parsed.append({"id": ident, "claimedUnit": claimed, "rowUnit": row_unit})
    issues = []
    out = []
    for item in parsed:
        if item["rowUnit"] is None:
            form = "borrowed"
            issues.append(f"{item['id']} has no row unit, so the header {header} cannot fill it")
            supported = None
        elif item["claimedUnit"] == item["rowUnit"]:
            form = "row"
            supported = item["rowUnit"]
        else:
            form = "mismatch"
            supported = None
            issues.append(
                f"{item['id']} claims {item['claimedUnit']} but the row unit is {item['rowUnit']}"
            )
        out.append(
            {
                "id": item["id"],
                "form": form,
                "claimedUnit": item["claimedUnit"],
                "rowUnit": item["rowUnit"],
                "supportedUnit": supported,
            }
        )
    return {
        "status": "pass" if not issues else "review",
        "label": label,
        "headerUnit": header,
        "headerIgnored": True,
        "rows": out,
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
