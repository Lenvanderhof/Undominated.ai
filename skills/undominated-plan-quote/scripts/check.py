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


def amount(value):
    if isinstance(value, bool) or not isinstance(value, str) or not re.fullmatch(r"(?:0|[1-9]\d*)(?:\.\d+)?", value):
        raise ValueError("amount must be a non-negative decimal string")
    return Decimal(value)


def check(data):
    plans, included = data.get("plans"), data.get("includedPlanIds")
    ceiling = amount(data.get("monthlyCeilingUsd")) if "monthlyCeilingUsd" in data else None
    if ceiling is None:
        raise ValueError("monthlyCeilingUsd is required")
    if not isinstance(plans, list) or not plans:
        raise ValueError("plans must be a non-empty array")
    if not isinstance(included, list) or any(not isinstance(item, str) or not item.strip() for item in included):
        raise ValueError("includedPlanIds must be an array of ids")
    if len(set(included)) != len(included):
        raise ValueError("included plan ids must be unique")
    known, issues, excluded = {}, [], []
    for plan in plans:
        ident = plan.get("id")
        if not isinstance(ident, str) or not ident.strip() or ident in known:
            raise ValueError("plan ids must be unique non-empty strings")
        if not isinstance(plan.get("verifiedUsd"), bool):
            raise ValueError("verifiedUsd must be a boolean")
        url = urlparse(plan.get("sourceUrl", ""))
        if url.scheme != "https" or not url.netloc:
            raise ValueError("sourceUrl must be HTTPS")
        date.fromisoformat(plan["observedAt"])
        if plan["verifiedUsd"]:
            if plan.get("recordedQuote") is not None:
                raise ValueError("a verified USD plan cannot also carry a recorded quote")
            known[ident] = amount(plan.get("amount"))
        else:
            if plan.get("amount") is not None:
                raise ValueError("an unverified plan cannot carry a USD amount")
            quote = plan.get("recordedQuote")
            if not isinstance(quote, str) or not quote.strip():
                raise ValueError("an unverified plan needs its recorded source quote")
            known[ident] = None
            excluded.append(ident)
    missing = [ident for ident in included if ident not in known]
    if missing:
        raise ValueError("included plan id is not in the plan list")
    prose = [ident for ident in included if known[ident] is None]
    if prose:
        issues.append("monthly ceiling includes a plan that is not verified USD")
    total = sum((known[ident] for ident in included if known[ident] is not None), Decimal(0))
    if total != ceiling:
        issues.append("monthly ceiling does not equal the sum of included verified amounts")
    return {
        "status": "review" if issues else "pass",
        "monthlyCeilingUsd": format(ceiling, "f"),
        "recomputedUsd": format(total, "f"),
        "includedPlanIds": included,
        "excludedUnverified": excluded,
        "issues": issues,
        "scope": "USD ceiling over verified plan rows only; recorded quotes are not parsed",
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
