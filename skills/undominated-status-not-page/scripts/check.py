#!/usr/bin/env python3
"""Local deterministic check. Python 3 standard library; no network or writes."""
import argparse
import json
import sys
from pathlib import Path

# A status is the integer you recorded. A string, a boolean, and a float are not coerced.
SCOPE = (
    "only the supplied integer 200 passes this conservative status gate; "
    "no status proves that response content was received or read, a quote is never supported, "
    "and no request is sent"
)


def text(value, label):
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{label} must be non-empty text")
    return value


def status_code(value):
    # bool is a subclass of int. True must not become status 1.
    if isinstance(value, bool) or not isinstance(value, int):
        raise ValueError("status must be an integer")
    if value < 100 or value > 599:
        raise ValueError("status is not an HTTP status")
    return value


def check(data):
    if "amount" in data or "price" in data:
        raise ValueError("input must not include an amount or a price")
    label = text(data.get("label"), "label")
    role = text(data.get("role"), "role")
    if role not in {"page-read", "quote"}:
        raise ValueError("role must be page-read or quote")
    if "status" not in data:
        raise ValueError("status is required")
    code = status_code(data.get("status"))
    if role == "quote":
        return {
            "status": "review",
            "label": label,
            "role": role,
            "httpStatus": code,
            "form": "not-claimed",
            "bodyVerified": False,
            "issues": ["a status code does not support a quote"],
            "scope": SCOPE,
        }
    eligible = code == 200
    return {
        "status": "pass" if eligible else "review",
        "label": label,
        "role": role,
        "httpStatus": code,
        "form": "status-eligible" if eligible else "unverified",
        "bodyVerified": False,
        "issues": [] if eligible else [f"status {code} requires review under this 200-only gate; response content was not verified"],
        "scope": SCOPE,
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
