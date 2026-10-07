#!/usr/bin/env python3
"""Local deterministic check. Python 3 standard library; no network or writes."""
import argparse
import json
import sys
from pathlib import Path

import re
from datetime import date
from decimal import Decimal
from urllib.parse import urlparse


def rate(value):
    if isinstance(value, bool):
        raise ValueError("boolean is not a rate")
    result = Decimal(str(value))
    if not result.is_finite() or result < 0:
        raise ValueError("rates must be finite and non-negative")
    return result


def check(data):
    workload, quotes = data["workload"], data["quotes"]
    inp, out = workload["inputTokens"], workload["outputTokens"]
    if any(type(n) is not int or n < 0 for n in (inp, out)) or inp + out == 0:
        raise ValueError("workload tokens must be non-negative integers and not both zero")
    if not isinstance(quotes, list) or len(quotes) < 2:
        raise ValueError("at least two quotes are required")
    scope, sellers, rows = None, {}, []
    for quote in quotes:
        for key in ("seller", "model", "precision", "currency", "serviceTier"):
            if not isinstance(quote.get(key), str) or not quote[key].strip():
                raise ValueError(f"{key} must be non-empty text")
        if quote["precision"].strip().casefold() in ("unknown", "unspecified"):
            raise ValueError("unknown precision is not evidence of equivalent precision")
        if not re.fullmatch(r"[A-Z]{3}", quote["currency"]):
            raise ValueError("currency must be an explicit three-letter code")
        url = urlparse(quote["sourceUrl"])
        if url.scheme != "https" or not url.netloc:
            raise ValueError("sourceUrl must be HTTPS")
        date.fromisoformat(quote["observedAt"])
        current = tuple(quote[k] for k in ("model", "precision", "currency", "serviceTier"))
        if scope is not None and current != scope:
            raise ValueError("quotes have incompatible model/precision/currency/serviceTier")
        scope = current
        tiers, previous, selected = quote["tiers"], 0, None
        if not isinstance(tiers, list) or not tiers:
            raise ValueError("tiers must be a non-empty list")
        for index, tier in enumerate(tiers):
            boundary = tier["maxInputTokens"]
            if boundary is None:
                if index != len(tiers) - 1:
                    raise ValueError("unbounded tier must be last")
            elif type(boundary) is not int or boundary <= previous:
                raise ValueError("tier boundaries must be positive and strictly ascending")
            else:
                previous = boundary
            in_rate, out_rate = rate(tier["inputPerMillion"]), rate(tier["outputPerMillion"])
            if selected is None and (boundary is None or inp <= boundary):
                selected = (in_rate, out_rate, boundary)
        if tiers[-1]["maxInputTokens"] is not None:
            raise ValueError("tier ladder must include a final unbounded tier")
        cost = (Decimal(inp) * selected[0] + Decimal(out) * selected[1]) / 1000000
        seller = quote["seller"].strip().casefold()
        row = {"seller": quote["seller"], "cost": str(cost), "maxInputTokens": selected[2], "sourceUrl": quote["sourceUrl"], "observedAt": quote["observedAt"]}
        rows.append(row)
        if seller not in sellers or cost < sellers[seller][0]:
            sellers[seller] = (cost, row)
    if len(sellers) < 2:
        raise ValueError("comparison requires distinct sellers, not service-tier rows")
    ordered = sorted(sellers.values(), key=lambda pair: (pair[0], pair[1]["seller"]))
    low, high = ordered[0][0], ordered[-1][0]
    return {"status": "pass", "currency": scope[2], "model": scope[0], "distinctSellers": len(sellers), "sellerQuotes": [x[1] for x in ordered], "allQuotes": rows, "spreadRatio": str(high / low) if low else None, "scope": "uncached input and billed output; excludes taxes and other fees"}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", help="JSON input path; no network fetches")
    args = parser.parse_args()
    try:
        data = json.loads(Path(args.input).read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            raise ValueError("input must be a JSON object")
        result = check(data)
        print(json.dumps(result, indent=2, allow_nan=False))
        return 0 if result["status"] == "pass" else 1
    except (ValueError, KeyError, TypeError, OSError, ArithmeticError, AttributeError, IndexError) as exc:
        print(json.dumps({"status": "invalid", "error": str(exc)}))
        return 2

if __name__ == "__main__":
    sys.exit(main())
