#!/usr/bin/env python3
"""Local deterministic check. Python 3 standard library; no network or writes."""
import argparse
import json
import re
import sys
from pathlib import Path

# Schema wording is a field description, not a model rate card. Negation is not parsed.
SCHEMA = re.compile(
    r"pricing[- ]object|values are in|\bthis field\b|\bschema\b|per token/request/unit|\bfield description\b|字段说明",
    re.IGNORECASE,
)
SCOPE = (
    "a model-rate claim is unsupported when the excerpt describes a field or a schema; "
    "amounts are not read and the excerpt is not copied out"
)


def text(value, label):
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{label} must be non-empty text")
    return value


def check(data):
    if "amount" in data or "price" in data:
        raise ValueError("input must not include an amount or a price")
    label = text(data.get("label"), "label")
    role = text(data.get("role"), "role")
    if role not in {"model-rate", "schema"}:
        raise ValueError("role must be model-rate or schema")
    body = data.get("excerpt")
    if not isinstance(body, str) or not body.strip():
        raise ValueError("excerpt must be non-empty text")
    matched = SCHEMA.search(body) is not None
    if role == "schema":
        return {
            "status": "pass",
            "label": label,
            "role": role,
            "form": "not-claimed",
            "schemaWording": matched,
            "issues": [],
            "scope": SCOPE,
        }
    if matched:
        return {
            "status": "review",
            "label": label,
            "role": role,
            "form": "schema",
            "schemaWording": True,
            "issues": ["the excerpt describes a field or a schema"],
            "scope": SCOPE,
        }
    return {
        "status": "pass",
        "label": label,
        "role": role,
        "form": "plain",
        "schemaWording": False,
        "issues": [],
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
