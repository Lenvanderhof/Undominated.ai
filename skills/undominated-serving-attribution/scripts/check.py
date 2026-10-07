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


def check(data):
    fields(data, ("model", "servingMode", "claimSubject", "modelScore", "modeScore", "claimedScore"))
    model = identity(data["model"], "model")
    mode = None if data["servingMode"] is None else identity(data["servingMode"], "servingMode")
    subject = data["claimSubject"]
    if subject not in ("model", "mode"):
        raise ValueError("claimSubject must be model or mode")
    model_score = decimal(data["modelScore"], "modelScore", nullable=True)
    mode_score = decimal(data["modeScore"], "modeScore", nullable=True)
    claimed = decimal(data["claimedScore"], "claimedScore", nullable=True)
    expected = model_score if subject == "model" else mode_score
    issues = []
    if mode_score is not None and mode is None:
        issues.append("a supplied mode score has no serving-mode identity")
    if subject == "mode" and mode is None:
        issues.append("mode claim has no serving-mode identity")
    if expected is None:
        issues.append(subject + " claim has no score for its named subject")
    if claimed is None:
        issues.append("claimed score is unknown")
    elif expected is not None and claimed != expected:
        issues.append("claimed score does not match the named subject's score")
    return {"status": "review" if issues else "pass", "model": model, "servingMode": mode,
            "claimSubject": subject, "modelScore": data["modelScore"], "modeScore": data["modeScore"],
            "claimedScore": data["claimedScore"], "expectedScore": data["modelScore"] if subject == "model" else data["modeScore"],
            "issues": issues, "scope": "supplied subject identity and exact score equality only; source attribution is not independently verified"}


if __name__ == "__main__":
    sys.exit(main())
