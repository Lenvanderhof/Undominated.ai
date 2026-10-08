#!/usr/bin/env python3
"""Local deterministic check. Python 3 standard library; no network or writes."""
import argparse
import json
import sys
from pathlib import Path

from datetime import date
from urllib.parse import urlparse


def check(data):
    candidate, requirements = data["candidate"], data["requirements"]
    if not all(isinstance(x, str) and x.strip() for x in (data["current"], candidate["id"])):
        raise ValueError("model identities must be non-empty")
    url = urlparse(candidate["sourceUrl"])
    if url.scheme != "https" or not url.netloc:
        raise ValueError("candidate sourceUrl must be HTTPS")
    date.fromisoformat(candidate["observedAt"])
    issues = []
    for key in ("inputModalities", "outputModalities"):
        needed, available = requirements[key], candidate.get(key)
        if not isinstance(needed, list) or any(not isinstance(x, str) or not x.strip() for x in needed):
            raise ValueError(f"requirements.{key} must be a string array")
        if available is None:
            issues.append(f"unknown candidate {key}")
        elif not isinstance(available, list) or any(not isinstance(x, str) or not x.strip() for x in available):
            raise ValueError(f"candidate.{key} must be a string array or null")
        elif missing := sorted(set(needed) - set(available)):
            issues.append(f"missing {key}: {', '.join(missing)}")
    for key in ("contextTokens", "maxOutputTokens"):
        needed, available = requirements[key], candidate.get(key)
        if type(needed) is not int or needed <= 0:
            raise ValueError(f"requirements.{key} must be a positive integer")
        if available is None:
            issues.append(f"unknown candidate {key}")
        elif type(available) is not int or available <= 0:
            raise ValueError(f"candidate.{key} must be a positive integer or null")
        elif available < needed:
            issues.append(f"{key}: requires {needed}, candidate has {available}")
    for key in ("tools", "structuredOutput"):
        if type(requirements[key]) is not bool or (candidate.get(key) is not None and type(candidate[key]) is not bool):
            raise ValueError(f"{key} must be boolean (candidate may be null)")
        if requirements[key] and candidate.get(key) is not True:
            issues.append(f"required {key} is absent or unknown")
    required = requirements["requiredEvalIds"]
    if not isinstance(required, list) or not required or any(not isinstance(x, str) or not x.strip() for x in required) or len(set(required)) != len(required):
        raise ValueError("requiredEvalIds must contain unique non-empty identifiers")
    results = {}
    for evaluation in data["evaluations"]:
        ident, passed = evaluation["id"], evaluation["passed"]
        if not isinstance(ident, str) or not ident.strip() or (passed is not None and type(passed) is not bool):
            raise ValueError("evaluations need string ids and boolean/null results")
        if ident in results:
            raise ValueError(f"duplicate evaluation {ident}")
        results[ident] = passed
    for ident in required:
        if results.get(ident) is not True:
            issues.append(f"evaluation not passed: {ident}")
    return {"status": "review" if issues else "pass", "current": data["current"], "candidate": candidate["id"], "issues": issues, "scope": "declared workload compatibility and supplied evaluation outcomes"}


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
