#!/usr/bin/env python3
"""Local deterministic check. Python 3 standard library; no network or writes."""
import argparse
import json
import re
import sys
from decimal import Decimal
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
    tokens = data.get("inputTokens")
    if isinstance(tokens, bool) or not isinstance(tokens, int) or tokens < 0:
        raise ValueError("inputTokens must be a non-negative integer")
    billing = data.get("billing", "whole-request")
    if billing not in ("whole-request", "marginal"):
        raise ValueError("billing must be whole-request or marginal")
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
        parsed.append({
            "maxInputTokens": cap,
            "inputPerMillion": money(rung.get("inputPerMillion"), "inputPerMillion"),
            "outputPerMillion": money(rung.get("outputPerMillion"), "outputPerMillion"),
        })
    issues, selected = [], None
    if billing == "marginal":
        issues.append("marginal block pricing is outside this checker")
    else:
        chosen = len(parsed) - 1
        for index, rung in enumerate(parsed[:-1]):
            if tokens <= rung["maxInputTokens"]:
                chosen = index
                break
        rung = parsed[chosen]
        selected = {
            "rungIndex": chosen,
            "maxInputTokens": rung["maxInputTokens"],
            "inputPerMillion": format(rung["inputPerMillion"], "f"),
            "outputPerMillion": format(rung["outputPerMillion"], "f"),
            "billing": "whole-request",
        }
    return {
        "status": "review" if issues else "pass",
        "model": data["model"],
        "currency": data["currency"],
        "inputTokens": tokens,
        "selected": selected,
        "issues": issues,
        "scope": "one whole-request rung for one input length; selected rates are the supplied rung, not a new vendor quote",
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
