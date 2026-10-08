#!/usr/bin/env python3
"""Local deterministic check. Python 3 standard library; no network or writes."""
import argparse
import json
import sys
from pathlib import Path


def numeric(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def severity(value, label, issues):
    if isinstance(value, bool) or not isinstance(value, int) or value < 1:
        issues.append(f"{label}: severity {value!r} is not an integer of at least 1")
        return False
    return True


def check(data):
    issues = []
    sides = {}
    for side in ("baseline", "candidate"):
        rules = data.get(side)
        if not isinstance(rules, dict) or not rules:
            raise ValueError(f"{side} must be a non-empty object of rule severities")
        for name in rules:
            if not isinstance(name, str) or not name.strip():
                raise ValueError(f"{side} rule names must be non-empty text")
        sides[side] = rules
    baseline, candidate = sides["baseline"], sides["candidate"]
    new_rules = data.get("newRules", [])
    if not isinstance(new_rules, list):
        raise ValueError("newRules must be a list of rule names")
    tightened, unchanged, loosened, removed, added = [], [], [], [], []
    for name in sorted(set(baseline) | set(candidate)):
        base_value = baseline.get(name)
        cand_value = candidate.get(name)
        if name not in candidate:
            removed.append({"rule": name, "baseline": base_value})
            issues.append(f"{name}: rule removed (baseline {base_value!r}, candidate absent)")
            continue
        if name not in baseline:
            added.append({"rule": name, "candidate": cand_value})
            severity(cand_value, f"{name} (new rule)", issues)
            continue
        base_valid = severity(base_value, f"{name} (baseline)", issues)
        cand_valid = severity(cand_value, f"{name} (candidate)", issues)
        if not numeric(base_value) or not numeric(cand_value):
            continue
        if cand_value < base_value:
            loosened.append({"rule": name, "baseline": base_value, "candidate": cand_value})
            issues.append(f"{name}: gate loosened from {base_value} to {cand_value}")
        elif cand_value > base_value:
            tightened.append({"rule": name, "baseline": base_value, "candidate": cand_value})
        elif base_valid and cand_valid:
            unchanged.append({"rule": name, "severity": cand_value})
    declared = set()
    for name in new_rules:
        if not isinstance(name, str) or not name.strip():
            raise ValueError("newRules entries must be non-empty text")
        if name in declared:
            issues.append(f"{name}: declared new more than once")
        declared.add(name)
        if name in baseline:
            issues.append(f"{name}: declared new but present in baseline")
        elif name not in candidate:
            issues.append(f"{name}: declared new but absent from candidate")
    return {
        "status": "review" if issues else "pass",
        "tightened": tightened,
        "unchanged": unchanged,
        "loosened": loosened,
        "removed": removed,
        "added": added,
        "issues": issues,
        "scope": "one rule set against another; higher severity is stricter and every move is permitted upwards only",
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