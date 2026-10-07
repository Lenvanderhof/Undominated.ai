#!/usr/bin/env python3
"""Local deterministic check. Python 3 standard library; no network or writes."""
import argparse
import json
import re
import sys
from decimal import Decimal, Inexact, localcontext
from pathlib import Path

OPERATIONS = ("sum", "average", "rank")


def money(value, label):
    if isinstance(value, bool) or not isinstance(value, str) or not re.fullmatch(r"(?:0|[1-9]\d*)(?:\.\d+)?", value):
        raise ValueError(f"{label} must be a non-negative decimal string")
    return Decimal(value)


def exact_sum(values):
    exponent = min(value.as_tuple().exponent for value in values)
    digits = max(len(value.as_tuple().digits) + value.as_tuple().exponent - exponent
                 for value in values)
    # Align decimal places, then reserve every possible carry from the number of addends.
    with localcontext() as context:
        context.prec = digits + len(str(len(values)))
        context.traps[Inexact] = True
        return sum(values, Decimal(0))


def exact_average(total, count):
    # A terminating division by count needs fewer than bit_length(count) extra digits.
    # A repeating expansion raises Inexact instead of silently becoming a rounded amount.
    with localcontext() as context:
        context.prec = len(total.as_tuple().digits) + count.bit_length()
        context.traps[Inexact] = True
        return total / Decimal(count)


def check(data):
    label = data.get("label")
    if not isinstance(label, str) or not label.strip():
        raise ValueError("label must be non-empty text")
    operation = data.get("operation")
    if operation not in OPERATIONS:
        raise ValueError("operation must be sum, average or rank")
    amounts = data.get("amounts")
    if not isinstance(amounts, list) or not amounts:
        raise ValueError("at least one amount is required")
    if "fxRate" in data or "exchangeRate" in data:
        fx_present = True
    else:
        fx_present = False
    parsed, seen = [], set()
    for index, row in enumerate(amounts):
        if not isinstance(row, dict):
            raise ValueError("each amount must be an object")
        ident = row.get("id")
        if not isinstance(ident, str) or not ident.strip() or ident in seen:
            raise ValueError("each amount id must be unique non-empty text")
        seen.add(ident)
        currency = row.get("currency")
        parsed.append({
            "id": ident,
            "currency": currency if isinstance(currency, str) else None,
            "amount": money(row.get("amount"), f"amounts[{index}].amount"),
        })
    issues = []
    if fx_present:
        issues.append("an exchange rate was supplied; this checker does not convert")
    codes = []
    for row in parsed:
        if not isinstance(row["currency"], str) or not re.fullmatch(r"[A-Z]{3}", row["currency"]):
            issues.append(f"{row['id']} has no explicit three-letter currency")
        else:
            codes.append(row["currency"])
    if len(set(codes)) > 1:
        issues.append("amounts use more than one currency")
    distinct = sorted(set(codes))
    result = None
    if not issues:
        currency = distinct[0]
        if operation == "sum":
            result = {"currency": currency, "total": format(exact_sum([row["amount"] for row in parsed]), "f")}
        elif operation == "average":
            total = exact_sum([row["amount"] for row in parsed])
            try:
                average = exact_average(total, len(parsed))
            except Inexact:
                issues.append("average has no exact finite decimal within supported arithmetic; no rounding rule was supplied")
            else:
                result = {"currency": currency, "average": format(average, "f")}
        else:
            ordered = sorted(parsed, key=lambda row: row["amount"], reverse=True)
            result = {"currency": currency, "rankedIds": [row["id"] for row in ordered]}
    return {
        "status": "review" if issues else "pass",
        "label": label,
        "operation": operation,
        "currencies": distinct,
        "result": result,
        "issues": issues,
        "scope": "one explicit currency, no conversion; a withheld figure is not a vendor quote",
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
