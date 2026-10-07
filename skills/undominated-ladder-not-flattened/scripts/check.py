#!/usr/bin/env python3
"""Check one explicit local JSON input; standard library, no network or writes."""
import argparse
import json
import re
import sys
from fractions import Fraction
from pathlib import Path


def fields(data, required, optional=()):
    if not isinstance(data, dict):
        raise ValueError("input must be a JSON object")
    missing = set(required) - data.keys()
    unknown = data.keys() - set(required) - set(optional)
    if missing or unknown:
        raise ValueError("fields mismatch: missing=" + repr(sorted(missing)) + "; unknown=" + repr(sorted(unknown)))


def identity(value, label):
    if not isinstance(value, str) or not value or value != value.strip() or len(value) > 512 or any(ord(c) < 32 or ord(c) == 127 for c in value):
        raise ValueError(label + " must be non-empty text without surrounding whitespace or control characters, at most 512 characters")
    return value


def decimal(value, label, nullable=False):
    if nullable and value is None:
        return None
    if not isinstance(value, str) or len(value) > 1000 or not re.fullmatch(r"(?:0|[1-9][0-9]*)(?:\.[0-9]+)?", value):
        raise ValueError(label + " must be a non-negative ASCII decimal string, at most 1000 characters" + (" or null" if nullable else ""))
    return Fraction(value)


def unique_object(pairs):
    out = {}
    for key, value in pairs:
        if key in out:
            raise ValueError("duplicate JSON key: " + key)
        out[key] = value
    return out


def reject_constant(value):
    raise ValueError("non-JSON numeric constant: " + value)


class Parser(argparse.ArgumentParser):
    def error(self, message):
        raise ValueError(message)


def main():
    try:
        parser = Parser(description=__doc__)
        parser.add_argument("input")
        args = parser.parse_args()
        with Path(args.input).open("rb") as handle:
            raw = handle.read(1048577)
        if len(raw) > 1048576:
            raise ValueError("input exceeds 1 MiB")
        data = json.loads(raw.decode("utf-8"), object_pairs_hook=unique_object, parse_constant=reject_constant)
        result = check(data)
        print(json.dumps(result, indent=2, allow_nan=False))
        return 0 if result["status"] == "pass" else 1
    except (ValueError, TypeError, OSError, ArithmeticError, RecursionError) as exc:
        print(json.dumps({"status": "invalid", "error": str(exc)}))
        return 2


def count(value, label):
    if isinstance(value, bool) or not isinstance(value, int) or value < 1:
        raise ValueError(label + " must be an integer of at least 1")
    return value


def check(data):
    fields(data, ("sourceRungs", "publishedRungs"))
    source = count(data["sourceRungs"], "sourceRungs")
    published = count(data["publishedRungs"], "publishedRungs")
    issues = []
    if published < source:
        issues.append("a context-tier ladder keeps every rung")
    elif published > source:
        issues.append("a published ladder does not add a rung the source did not state")
    return {
        "status": "review" if issues else "pass",
        "sourceRungs": source,
        "publishedRungs": published,
        "dropped": published < source,
        "added": published > source,
        "issues": issues,
        "scope": "a published context-tier ladder has the same rung count as its source; prices and boundaries are not read",
    }


if __name__ == "__main__":
    sys.exit(main())
