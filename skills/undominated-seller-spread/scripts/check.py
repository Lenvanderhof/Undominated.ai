#!/usr/bin/env python3
"""Local deterministic check. Python 3 standard library; no network or writes."""
import argparse
import json
import re
import sys
from datetime import date
from decimal import Decimal
from pathlib import Path
from urllib.parse import urlparse


def money(value, label):
    if isinstance(value, bool) or not isinstance(value, str) or not re.fullmatch(r"(?:0|[1-9]\d*)(?:\.\d+)?", value):
        raise ValueError(f"{label} must be a non-negative decimal string")
    return Decimal(value)


def check(data):
    if not isinstance(data.get("model"), str) or not data["model"].strip():
        raise ValueError("model must be non-empty text")
    if not re.fullmatch(r"[A-Z]{3}", data.get("currency", "")):
        raise ValueError("currency must be an explicit three-letter code")
    if data.get("rate") not in ("inputPerMillion", "outputPerMillion"):
        raise ValueError("rate must be inputPerMillion or outputPerMillion")
    claimed = money(data.get("claimedMultiple"), "claimedMultiple")
    rows = data.get("rows")
    if not isinstance(rows, list) or len(rows) < 2:
        raise ValueError("at least two price rows are required")
    rate_key = data["rate"]
    grouped, seen_tiers = {}, {}
    issues, parsed = [], []
    for row in rows:
        for key in ("seller", "sellerOwner", "serviceTier"):
            if not isinstance(row.get(key), str) or not row[key].strip():
                raise ValueError(f"{key} must be non-empty text")
        url = urlparse(row.get("sourceUrl", ""))
        if url.scheme != "https" or not url.netloc:
            raise ValueError("sourceUrl must be HTTPS")
        date.fromisoformat(row["observedAt"])
        amount = money(row.get(rate_key), rate_key)
        owner = row["sellerOwner"].strip().casefold()
        tier = row["serviceTier"].strip().casefold()
        slot = (owner, tier)
        if slot in seen_tiers and seen_tiers[slot] != amount:
            issues.append("conflicting rates for one seller owner and service tier")
        seen_tiers[slot] = amount
        grouped.setdefault(owner, []).append(amount)
        parsed.append(amount)
    owner_prices = {owner: min(amounts) for owner, amounts in grouped.items()}
    ordered = sorted(owner_prices.values())
    low, high = ordered[0], ordered[-1]
    row_low, row_high = min(parsed), max(parsed)
    owner_multiple = row_multiple = None
    if len(owner_prices) < 2:
        issues.append("only one seller owner; service tiers are not competition")
    elif low == 0:
        issues.append("a zero owner rate makes a competition multiple undefined")
    else:
        owner_multiple = high / low
        if owner_multiple != claimed:
            issues.append("claimed multiple does not match the distinct-owner multiple")
    if row_low == 0:
        issues.append("a zero row rate makes the row-level multiple undefined")
    else:
        row_multiple = row_high / row_low
    return {
        "status": "review" if issues else "pass",
        "model": data["model"],
        "currency": data["currency"],
        "rate": rate_key,
        "sellerOwners": len(owner_prices),
        "rows": len(parsed),
        "ownerMultiple": None if owner_multiple is None else format(owner_multiple, "f"),
        "rowMultiple": None if row_multiple is None else format(row_multiple, "f"),
        "claimedMultiple": format(claimed, "f"),
        "issues": issues,
        "scope": "one rate across caller-supplied seller owners; same-owner service tiers are not competitors",
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
