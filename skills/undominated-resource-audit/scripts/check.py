#!/usr/bin/env python3
"""Local deterministic check. Python 3 standard library; no network or writes."""
import argparse
import json
import sys
from pathlib import Path

import re
from datetime import date
from urllib.parse import urlparse


def check(data):
    resource, issues = data["resource"], []
    if resource["kind"] not in ("skill", "agent", "mcp-server"):
        raise ValueError("unsupported resource kind")
    if not isinstance(resource["id"], str) or not resource["id"].strip():
        raise ValueError("resource id is required")
    url = urlparse(resource["sourceUrl"])
    if url.scheme != "https" or not url.netloc:
        raise ValueError("sourceUrl must be HTTPS")
    if not re.fullmatch(r"[a-fA-F0-9]{40}", resource["commit"]):
        raise ValueError("commit must be a full 40-character revision")
    date.fromisoformat(resource["reviewedAt"])
    license_id = resource["license"]
    if not isinstance(license_id, str) or not license_id.strip() or license_id.strip().casefold() in ("unknown", "none", "unlicensed"):
        issues.append("license absent or unresolved")
    for key, values in (("permissions", resource["permissions"]), ("allowedPermissions", data["allowedPermissions"])):
        if not isinstance(values, list) or any(not isinstance(x, str) or not x.strip() for x in values) or len(set(values)) != len(values):
            raise ValueError(f"{key} must be unique permission strings")
    for permission in sorted(set(resource["permissions"]) - set(data["allowedPermissions"])):
        issues.append(f"permission exceeds task scope: {permission}")
    for name in ("sourceIdentity", "licenseReviewed", "permissionsReviewed", "installReviewed", "functionalTest"):
        row = data["checks"].get(name, {})
        passed, evidence = row.get("passed"), row.get("evidence")
        if passed is not None and type(passed) is not bool:
            raise ValueError(f"{name}.passed must be boolean or null")
        if passed is not True or not isinstance(evidence, str) or not evidence.strip():
            issues.append(f"missing affirmative evidence: {name}")
    return {"status": "review" if issues else "pass", "id": resource["id"], "commit": resource["commit"], "issues": issues, "scope": "completeness and declared permission checks; not a security certification"}


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
