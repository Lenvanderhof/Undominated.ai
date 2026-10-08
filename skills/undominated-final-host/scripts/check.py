#!/usr/bin/env python3
"""Local deterministic check. Python 3 standard library; no network or writes."""
import argparse
import json
import re
import sys
from pathlib import Path

# Exact host match after lowercase and a trailing-dot strip. "www" is not removed.
HOST = re.compile(
    r"^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$"
)
SCOPE = (
    "a fetched page supports a vendor only when the final host you supply equals the requested host; "
    "www is not stripped and no request is sent"
)


def hostname(value, label):
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{label} must be non-empty text")
    if "://" in value or "/" in value or " " in value or "@" in value:
        raise ValueError(f"{label} must be a hostname, not a URL")
    host = value.strip().lower()
    if host.endswith("."):
        host = host[:-1]
    if not HOST.fullmatch(host):
        raise ValueError(f"{label} is not a hostname")
    return host


def text(value, label):
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{label} must be non-empty text")
    return value


def check(data):
    label = text(data.get("label"), "label")
    responses = data.get("responses")
    if not isinstance(responses, list) or not responses:
        raise ValueError("at least one response is required")
    parsed = []
    seen = set()
    for index, item in enumerate(responses):
        if not isinstance(item, dict):
            raise ValueError("each response must be an object")
        if "amount" in item or "price" in item:
            raise ValueError(f"responses[{index}] must not include an amount or a price")
        ident = text(item.get("id"), f"responses[{index}].id")
        if ident in seen:
            raise ValueError("each response id must be unique")
        seen.add(ident)
        if "requestedHost" not in item or "finalHost" not in item:
            raise ValueError(f"responses[{index}] needs requestedHost and finalHost")
        parsed.append(
            {
                "id": ident,
                "requestedHost": hostname(item.get("requestedHost"), f"responses[{index}].requestedHost"),
                "finalHost": hostname(item.get("finalHost"), f"responses[{index}].finalHost"),
            }
        )
    issues = []
    out = []
    for item in parsed:
        same = item["requestedHost"] == item["finalHost"]
        if not same:
            issues.append(
                f"{item['id']} final host {item['finalHost']} is not the requested host {item['requestedHost']}"
            )
        out.append(
            {
                "id": item["id"],
                "form": "same" if same else "redirected",
                "requestedHost": item["requestedHost"],
                "finalHost": item["finalHost"],
            }
        )
    return {
        "status": "pass" if not issues else "review",
        "label": label,
        "responses": out,
        "issues": issues,
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
