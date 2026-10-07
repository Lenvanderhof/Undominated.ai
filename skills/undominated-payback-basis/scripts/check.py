#!/usr/bin/env python3
"""Check one explicit local JSON input; standard library, no network or writes."""
import argparse
import json
import re
import sys
from fractions import Fraction
from pathlib import Path


def fields(data, required, optional=()):
    if not isinstance(data, dict):
        raise ValueError("input must be a JSON object")
    missing = set(required) - data.keys()
    unknown = data.keys() - set(required) - set(optional)
    if missing or unknown:
        raise ValueError("fields mismatch: missing=" + repr(sorted(missing)) + "; unknown=" + repr(sorted(unknown)))


def identity(value, label):
    if not isinstance(value, str) or not value or value != value.strip() or len(value) > 512 or any(ord(c) < 32 or ord(c) == 127 for c in value):
        raise ValueError(label + " must be non-empty text without surrounding whitespace or control characters, at most 512 characters")
    return value


def decimal(value, label, nullable=False):
    if nullable and value is None:
        return None
    if not isinstance(value, str) or len(value) > 1000 or not re.fullmatch(r"(?:0|[1-9][0-9]*)(?:\.[0-9]+)?", value):
        raise ValueError(label + " must be a non-negative ASCII decimal string, at most 1000 characters" + (" or null" if nullable else ""))
    return Fraction(value)


def unique_object(pairs):
    out = {}
    for key, value in pairs:
        if key in out:
            raise ValueError("duplicate JSON key: " + key)
        out[key] = value
    return out


def reject_constant(value):
    raise ValueError("non-JSON numeric constant: " + value)


class Parser(argparse.ArgumentParser):
    def error(self, message):
        raise ValueError(message)


def main():
    try:
        parser = Parser(description=__doc__)
        parser.add_argument("input")
        args = parser.parse_args()
        with Path(args.input).open("rb") as handle:
            raw = handle.read(1048577)
        if len(raw) > 1048576:
            raise ValueError("input exceeds 1 MiB")
        data = json.loads(raw.decode("utf-8"), object_pairs_hook=unique_object, parse_constant=reject_constant)
        result = check(data)
        print(json.dumps(result, indent=2, allow_nan=False))
        return 0 if result["status"] == "pass" else 1
    except (ValueError, TypeError, OSError, ArithmeticError, RecursionError) as exc:
        print(json.dumps({"status": "invalid", "error": str(exc)}))
        return 2


def exact_decimal(value):
    # A reduced rational terminates in base ten only when its denominator contains 2s and 5s.
    denominator, twos, fives = value.denominator, 0, 0
    while denominator % 2 == 0:
        denominator //= 2
        twos += 1
    while denominator % 5 == 0:
        denominator //= 5
        fives += 1
    if denominator != 1:
        return None
    places = max(twos, fives)
    digits = str(value.numerator * 2 ** (places - twos) * 5 ** (places - fives))
    if not places:
        return digits
    digits = digits.zfill(places + 1)
    return (digits[:-places] + "." + digits[-places:]).rstrip("0").rstrip(".")


def check(data):
    fields(data, ("currency", "switchingCost", "savingPerPeriod", "claimedPeriods"), ("wholeBill",))
    currency = data["currency"]
    if not isinstance(currency, str) or not re.fullmatch(r"[A-Z]{3}", currency):
        raise ValueError("currency must be an explicit three-uppercase-letter code; format only")
    cost = decimal(data["switchingCost"], "switchingCost")
    saving = decimal(data["savingPerPeriod"], "savingPerPeriod")
    claimed = decimal(data["claimedPeriods"], "claimedPeriods", nullable=True)
    bill = decimal(data.get("wholeBill"), "wholeBill", nullable=True)
    issues, ratio = [], None
    if saving == 0:
        issues.append("a zero saving makes payback undefined")
    else:
        ratio = cost / saving
        if claimed is None:
            issues.append("claimed periods are unknown")
        elif ratio != claimed:
            issues.append("claimed periods do not exactly match switching cost divided by the saving")
    if bill is not None and bill != 0 and claimed is not None and claimed == cost / bill and saving != bill and claimed != ratio:
        issues.append("claimed periods match cost divided by the whole bill, not by the saving")
    return {"status": "review" if issues else "pass", "currency": currency,
            "recomputedPeriods": None if ratio is None else exact_decimal(ratio),
            "exactRatio": None if ratio is None else {"numerator": str(ratio.numerator), "denominator": str(ratio.denominator)},
            "claimedPeriods": data["claimedPeriods"], "issues": issues,
            "scope": "exact saving-based payback for supplied amounts in one currency and a common period; no discounting, tax, FX, timing or source validation"}


if __name__ == "__main__":
    sys.exit(main())
