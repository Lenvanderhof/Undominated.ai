#!/usr/bin/env python3
"""Local deterministic check. Python 3 standard library; no network or writes."""
import argparse
import json
import re
import sys
from decimal import Decimal
from pathlib import Path

# Multiplier that turns one explicit unit into a per-million figure in the same currency.
# cents_per_token -> currency units per million tokens is cents * 1_000_000 / 100.
SCALES = {
    "per_million_tokens": Decimal(1),
    "per_thousand_tokens": Decimal(1000),
    "per_token": Decimal(1000000),
    "cents_per_token": Decimal(10000),
}


def money(value, label):
    if isinstance(value, bool) or not isinstance(value, str) or not re.fullmatch(r"(?:0|[1-9]\d*)(?:\.\d+)?", value):
        raise ValueError(f"{label} must be a non-negative decimal string")
    return Decimal(value)


def check(data):
    label = data.get("label")
    if not isinstance(label, str) or not label.strip():
        raise ValueError("label must be non-empty text")
    quotes = data.get("quotes")
    if not isinstance(quotes, list) or not quotes:
        raise ValueError("at least one quote is required")
    parsed = []
    seen = set()
    for index, quote in enumerate(quotes):
        if not isinstance(quote, dict):
            raise ValueError("each quote must be an object")
        ident = quote.get("id")
        if not isinstance(ident, str) or not ident.strip() or ident in seen:
            raise ValueError("each quote id must be unique non-empty text")
        seen.add(ident)
        parsed.append({
            "id": ident,
            "input": money(quote.get("input"), f"quotes[{index}].input"),
            "output": money(quote.get("output"), f"quotes[{index}].output"),
        })
    currency = data.get("currency")
    unit = data.get("unit")
    issues = []
    if not isinstance(currency, str) or not re.fullmatch(r"[A-Z]{3}", currency):
        issues.append("currency is not an explicit three-letter code")
    if unit not in SCALES:
        issues.append("unit is not an explicit auditable token unit")
    scaled = None
    scale = None
    if not issues:
        scale = SCALES[unit]
        scaled = [{
            "id": quote["id"],
            "inputPerMillion": format(quote["input"] * scale, "f"),
            "outputPerMillion": format(quote["output"] * scale, "f"),
        } for quote in parsed]
    return {
        "status": "review" if issues else "pass",
        "label": label,
        "currency": currency if isinstance(currency, str) else None,
        "unit": unit if isinstance(unit, str) else None,
        "scaleToPerMillion": format(scale, "f") if scale is not None else None,
        "scaled": scaled,
        "issues": issues,
        "scope": "explicit currency and one allowlisted token unit, then a decimal scale to per million; scaled strings are not a new vendor quote",
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
