#!/usr/bin/env python3
"""Local deterministic check. Python 3 standard library; no network or writes."""
import argparse
import json
import re
import sys
from decimal import Decimal
from fractions import Fraction
from pathlib import Path


def money(value, label):
    if isinstance(value, bool) or not isinstance(value, str) or not re.fullmatch(r"(?:0|[1-9]\d*)(?:\.\d+)?", value):
        raise ValueError(f"{label} must be a non-negative decimal string")
    return Decimal(value)


def check(data):
    if not isinstance(data.get("model"), str) or not data["model"].strip():
        raise ValueError("model must be non-empty text")
    if not re.fullmatch(r"[A-Z]{3}", data.get("currency", "")):
        raise ValueError("currency must be an explicit three-letter code")
    if data.get("side") not in ("input", "output"):
        raise ValueError("side must be input or output")
    claim = data.get("claim")
    if not isinstance(claim, dict):
        raise ValueError("claim must be an object")
    past = claim.get("pastTokens")
    if isinstance(past, bool) or not isinstance(past, int) or past < 1:
        raise ValueError("claim.pastTokens must be a positive integer")
    claimed = money(claim.get("multiple"), "claim.multiple")
    rungs = data.get("rungs")
    if not isinstance(rungs, list) or not rungs:
        raise ValueError("at least one rung is required")
    parsed, previous = [], 0
    for index, rung in enumerate(rungs):
        if not isinstance(rung, dict):
            raise ValueError("each rung must be an object")
        if "maxInputTokens" not in rung:
            raise ValueError("each rung must explicitly state maxInputTokens; null means unbounded")
        cap = rung["maxInputTokens"]
        if index == len(rungs) - 1:
            if cap is not None:
                raise ValueError("the final rung must be unbounded")
        elif isinstance(cap, bool) or not isinstance(cap, int) or cap <= previous:
            raise ValueError("finite rung caps must be strictly increasing positive integers")
        else:
            previous = cap
        parsed.append((cap, {key: money(rung.get(key), key) for key in ("inputPerMillion", "outputPerMillion")}))
    rate_key = "inputPerMillion" if data["side"] == "input" else "outputPerMillion"
    base = parsed[0][1][rate_key]
    issues, boundaries = [], []
    if len(parsed) < 2:
        issues.append("ladder has no pricing boundary")
    elif base == 0:
        issues.append("a zero base rate makes a past-boundary multiple undefined")
    else:
        for index, (cap, _prices) in enumerate(parsed[:-1]):
            nxt = parsed[index + 1][1][rate_key]
            boundaries.append({"pastTokens": cap, "rate": format(nxt, "f"), "multiple": format(nxt / base, "f")})
        match = next((item for item in boundaries if item["pastTokens"] == past), None)
        if match is None:
            issues.append("claimed boundary is not a rung in this ladder")
        elif Fraction(Decimal(match["rate"])) != Fraction(claimed) * Fraction(base):
            issues.append("claimed multiple does not match the base-relative multiple at that boundary")
    return {
        "status": "review" if issues else "pass",
        "model": data["model"],
        "currency": data["currency"],
        "side": data["side"],
        "baseRate": format(base, "f"),
        "boundaries": boundaries,
        "claimedPastTokens": past,
        "claimedMultiple": format(claimed, "f"),
        "issues": issues,
        "scope": "one side, whole-request rungs, each past-boundary multiple versus the first rung",
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
