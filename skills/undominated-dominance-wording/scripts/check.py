#!/usr/bin/env python3
"""Local deterministic check. Python 3 standard library; no network or writes."""
import argparse
import json
import math
import re
import sys
from decimal import Decimal
from pathlib import Path


CLAIMS = {
    "both-better-and-cheaper", "cheaper-at-equal-score", "better-at-equal-cost", "weak-pareto",
    "tradeoff", "candidate-dominated", "tie", "incomparable", "capability-loss",
}
PARETO = {"both-better-and-cheaper", "cheaper-at-equal-score", "better-at-equal-cost"}


def cost(value):
    if value is None:
        return None
    if isinstance(value, bool) or not isinstance(value, str) or not re.fullmatch(r"(?:0|[1-9]\d*)(?:\.\d+)?", value):
        raise ValueError("cost must be a non-negative decimal string or null")
    return Decimal(value)


def score(value):
    if value is None:
        return None
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        raise ValueError("score must be a finite number or null")
    return value


def side(value, label):
    if not isinstance(value, dict):
        raise ValueError(f"{label} must be an object")
    if not isinstance(value.get("id"), str) or not value["id"].strip():
        raise ValueError(f"{label}.id must be non-empty text")
    caps = value.get("capabilities")
    if not isinstance(caps, dict):
        raise ValueError(f"{label}.capabilities must be an object")
    return {"id": value["id"], "score": score(value.get("score")), "cost": cost(value.get("cost")), "capabilities": caps}


def capability(required, baseline, candidate):
    lost, unknown = [], []
    for name in required:
        left, right = baseline["capabilities"].get(name, None), candidate["capabilities"].get(name, None)
        if name not in baseline["capabilities"] or name not in candidate["capabilities"] or left is None or right is None:
            unknown.append(name)
            continue
        if isinstance(left, bool) or isinstance(right, bool):
            if not isinstance(left, bool) or not isinstance(right, bool):
                raise ValueError(f"{name} must be boolean on both sides")
            if left and not right:
                lost.append(name)
            continue
        if type(left) is not int or type(right) is not int or left < 0 or right < 0:
            raise ValueError(f"{name} must be a non-negative integer or null")
        if right < left:
            lost.append(name)
    if lost:
        return "lost", lost, unknown
    if unknown:
        return "unknown", lost, unknown
    return "preserved", lost, unknown


def axes(baseline, candidate):
    if baseline["score"] is None or candidate["score"] is None or baseline["cost"] is None or candidate["cost"] is None:
        return "incomparable"
    score_delta = (candidate["score"] > baseline["score"]) - (candidate["score"] < baseline["score"])
    cost_delta = (candidate["cost"] < baseline["cost"]) - (candidate["cost"] > baseline["cost"])
    if score_delta > 0 and cost_delta > 0:
        return "both-better-and-cheaper"
    if score_delta == 0 and cost_delta > 0:
        return "cheaper-at-equal-score"
    if score_delta > 0 and cost_delta == 0:
        return "better-at-equal-cost"
    if score_delta == 0 and cost_delta == 0:
        return "tie"
    if score_delta <= 0 and cost_delta <= 0:
        return "candidate-dominated"
    return "tradeoff"


def check(data):
    claim = data.get("claim")
    if claim not in CLAIMS:
        raise ValueError("claim is not a recognised comparison wording")
    required = data.get("required")
    if not isinstance(required, list) or not required or any(not isinstance(name, str) or not name.strip() for name in required):
        raise ValueError("required capabilities must be a non-empty list of names")
    if len(set(required)) != len(required):
        raise ValueError("required capabilities must be unique")
    baseline, candidate = side(data.get("baseline"), "baseline"), side(data.get("candidate"), "candidate")
    if baseline["id"] == candidate["id"]:
        raise ValueError("baseline and candidate ids must differ")
    state, lost, unknown = capability(required, baseline, candidate)
    verdict = "capability-loss" if state == "lost" else "incomparable" if state == "unknown" else axes(baseline, candidate)
    matched = claim == verdict or (claim == "weak-pareto" and verdict in PARETO)
    return {
        "status": "pass" if matched else "review",
        "claim": claim,
        "verdict": verdict,
        "capabilities": state,
        "lost": lost,
        "unknown": unknown,
        "issues": [] if matched else [f"claim {claim} does not match verdict {verdict}"],
        "scope": "one supplied pair and the listed requirements only",
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
