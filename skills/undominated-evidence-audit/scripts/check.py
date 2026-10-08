#!/usr/bin/env python3
"""Local deterministic check. Python 3 standard library; no network or writes."""
import argparse
import json
import sys
from pathlib import Path

import hashlib
import re
from datetime import date
from decimal import Decimal
from urllib.parse import urlparse


def decimal(value):
    if isinstance(value, bool):
        raise ValueError("boolean is not a number")
    number = Decimal(str(value))
    if not number.is_finite():
        raise ValueError("numbers must be finite")
    return number


def read_local(base, value):
    if not isinstance(value, str) or not value:
        raise ValueError("evidence path must be a non-empty relative string")
    path = Path(value)
    if path.is_absolute() or ".." in path.parts:
        raise ValueError("evidence path must stay inside the input directory")
    current = base
    for part in path.parts:
        current = current / part
        if current.is_symlink():
            raise ValueError("evidence symlinks are not allowed")
    if not current.resolve().is_relative_to(base.resolve()):
        raise ValueError("evidence path escapes the input directory")
    return current.read_bytes()


def check(data):
    issues = []
    for key in ("claim", "population", "excerpt"):
        if not isinstance(data.get(key), str) or not data[key].strip():
            raise ValueError(f"{key} must be non-empty text")
    url = urlparse(data["sourceUrl"])
    if url.scheme != "https" or not url.netloc:
        raise ValueError("sourceUrl must be HTTPS")
    date.fromisoformat(data["observedAt"])
    if not re.fullmatch(r"[a-fA-F0-9]{64}", data["sha256"]):
        raise ValueError("sha256 must be 64 hexadecimal characters")
    evidence = read_local(Path(sys.argv[1]).resolve().parent, data["evidenceFile"])
    digest = hashlib.sha256(evidence).hexdigest()
    if digest != data["sha256"].lower():
        issues.append("evidence hash mismatch")
    if data["excerpt"] not in evidence.decode("utf-8"):
        issues.append("excerpt is absent from evidence")
    operation = data["operation"]
    if operation == "count":
        items = data["items"]
        if not isinstance(items, list) or any(not isinstance(x, str) or not x.strip() for x in items):
            raise ValueError("items must be a list of non-empty strings")
        actual = Decimal(len(set(items)))
        if len(items) != len(set(items)):
            issues.append("duplicate population identifiers")
    elif operation in ("ratio", "percent"):
        numerator, denominator = decimal(data["numerator"]), decimal(data["denominator"])
        if numerator < 0 or denominator <= 0:
            raise ValueError("numerator must be non-negative and denominator positive")
        actual = numerator / denominator * (100 if operation == "percent" else 1)
    else:
        raise ValueError("operation must be ratio, percent, or count")
    expected, tolerance = decimal(data["expected"]), decimal(data["tolerance"])
    if tolerance < 0:
        raise ValueError("tolerance must be non-negative")
    if abs(actual - expected) > tolerance:
        issues.append("recomputed value exceeds the declared tolerance")
    return {"status": "review" if issues else "pass", "claim": data["claim"], "population": data["population"], "actual": str(actual), "expected": str(expected), "sha256": digest, "issues": issues, "scope": "arithmetic and evidence identity; entailment needs review"}


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
