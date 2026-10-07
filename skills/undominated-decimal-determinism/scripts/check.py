#!/usr/bin/env python3
"""Local deterministic check. Python 3 standard library; no network or writes."""
import argparse
import json
import re
import sys
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from pathlib import Path

DECIMAL_STRING = re.compile(r"(?:0|[1-9]\d*)(?:\.\d+)?")


def money(value, label):
    """Decimal strings only. A JSON number is already an IEEE-754 value by the time we see it."""
    if isinstance(value, bool) or not isinstance(value, str) or not DECIMAL_STRING.fullmatch(value):
        raise ValueError(f"{label} must be a non-negative decimal string")
    try:
        return Decimal(value)
    except InvalidOperation as exc:
        raise ValueError(f"{label} is not a parseable decimal") from exc


def float_artefact(unit_text, quantity, billed):
    """True when the billed value reproduces a binary-float product rounded to its own scale.

    Reproduces the real defect: the rate went through a double, then a display or currency
    formatter rounded it. The decimal product is what the pipeline should have carried.
    """
    try:
        product = float(unit_text) * float(format(quantity, "f"))
    except (ValueError, OverflowError):
        return False
    exponent = billed.as_tuple().exponent
    places = -exponent if isinstance(exponent, int) and exponent < 0 else 0
    scale = Decimal(1).scaleb(-places)
    try:
        return Decimal(product).quantize(scale, rounding=ROUND_HALF_UP) == billed
    except (InvalidOperation, ValueError):
        return False


def positive_money(value, label):
    if isinstance(value, bool) or not isinstance(value, str) or not re.fullmatch(r"(?:0|[1-9]\d*)(?:\.\d+)?", value) or Decimal(value) == 0:
        raise ValueError(f"{label} must be a positive decimal string")
    return Decimal(value)


def check(data):
    if not re.fullmatch(r"[A-Z]{3}", data.get("currency", "")):
        raise ValueError("currency must be an explicit three-letter code")
    quantity = positive_money(data.get("quantity"), "quantity")
    rates = data.get("rates")
    billed = data.get("billed")
    if not isinstance(rates, dict) or not rates:
        raise ValueError("rates must be a non-empty object of decimal strings")
    if not isinstance(billed, dict):
        raise ValueError("billed must be an object of decimal strings")

    issues, entries = [], []
    for name in sorted(rates):
        raw = rates[name]
        entry = {"rate": name, "unitRate": None, "recomputed": None, "billed": None, "agrees": None, "difference": None}
        if isinstance(raw, bool) or not isinstance(raw, str):
            issues.append(f"rates[{name!r}] is a JSON number, not a decimal string; the input is already binary")
            entries.append(entry)
            continue
        if not DECIMAL_STRING.fullmatch(raw):
            issues.append(f"rates[{name!r}] is not a non-negative decimal string")
            entries.append(entry)
            continue
        unit = money(raw, f"rates[{name!r}]")
        recomputed = unit * quantity
        entry["unitRate"] = format(unit, "f")
        entry["recomputed"] = format(recomputed, "f")
        if name not in billed:
            issues.append(f"rates[{name!r}] has no billed value to compare")
            entries.append(entry)
            continue
        claim = billed[name]
        if isinstance(claim, bool) or not isinstance(claim, str) or not DECIMAL_STRING.fullmatch(claim):
            issues.append(f"billed[{name!r}] is not a non-negative decimal string")
            entries.append(entry)
            continue
        claimed = money(claim, f"billed[{name!r}]")
        entry["billed"] = format(claimed, "f")
        if claimed == recomputed:
            entry["agrees"] = True
        else:
            entry["agrees"] = False
            entry["difference"] = format(claimed - recomputed, "f")
            issues.append(
                f"billed[{name!r}] differs from the decimal product of unit rate and quantity"
            )
            if float_artefact(raw, quantity, claimed):
                issues.append(
                    f"billed[{name!r}] matches a binary-float-rounded product, not the decimal product"
                )
        entries.append(entry)

    for name in sorted(billed):
        if name not in rates:
            issues.append(f"billed[{name!r}] has no matching rate")

    return {
        "status": "review" if issues else "pass",
        "currency": data["currency"],
        "quantity": format(quantity, "f"),
        "rates": entries,
        "issues": issues,
        "scope": "exact decimal rate x quantity versus one billed value per rate, in one currency, with no display rounding applied",
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