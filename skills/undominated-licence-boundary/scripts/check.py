#!/usr/bin/env python3
"""Local deterministic check. Python 3 standard library; no network or writes."""
import argparse
import json
import sys
from pathlib import Path
from urllib.parse import urlparse


CLAIMS = {"redistributable", "not-redistributable", "internal-use-only", "unknown"}
EVIDENCE = {"explicit-grant", "explicit-denial", "not-stated"}


def https(value, label):
    if not isinstance(value, str):
        raise ValueError(f"{label} must be an HTTPS URL")
    url = urlparse(value)
    if url.scheme != "https" or not url.netloc:
        raise ValueError(f"{label} must be an HTTPS URL")


def evidence_quote(value, label):
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{label} is required for an explicit evidence position")
    if len(value) > 400:
        raise ValueError(f"{label} must stay within 400 characters")


def check(data):
    claim, evidence = data.get("claim"), data.get("redistributionEvidence")
    internal = data.get("internalUseEvidence", "not-stated")
    if claim not in CLAIMS:
        raise ValueError("claim is not a recognised redistribution wording")
    if evidence not in EVIDENCE or internal not in EVIDENCE:
        raise ValueError("evidence must be explicit-grant, explicit-denial or not-stated")
    if not isinstance(data.get("publicPageTreatedAsLicence"), bool):
        raise ValueError("publicPageTreatedAsLicence must be a boolean")
    if not isinstance(data.get("work"), str) or not data["work"].strip():
        raise ValueError("work must be non-empty text")
    https(data.get("publicUrl"), "publicUrl")
    issues = []
    if data["publicPageTreatedAsLicence"]:
        issues.append("a public page was treated as a licence")
    if evidence == "not-stated" and internal == "not-stated":
        for key in ("licenceName", "licenceUrl"):
            if data.get(key) is not None:
                raise ValueError(f"{key} must be null when neither permission is stated")
    else:
        if not isinstance(data.get("licenceName"), str) or not data["licenceName"].strip():
            raise ValueError("licenceName is required when evidence states a position")
        https(data.get("licenceUrl"), "licenceUrl")
    for position, key in ((evidence, "evidenceQuote"), (internal, "internalUseQuote")):
        if position == "not-stated":
            if data.get(key) is not None:
                raise ValueError(f"{key} must be null when that permission is not stated")
        else:
            evidence_quote(data.get(key), key)
    if evidence == "not-stated":
        for key in ("attributionRequired", "attributionPresent"):
            if data.get(key) is not None:
                raise ValueError(f"{key} must be null when redistribution is not stated")
        if claim != "unknown":
            issues.append("unstated redistribution cannot support a favourable or negative claim")
    elif evidence == "explicit-denial":
        # Denial of one permission is not evidence granting a different permission.
        if claim == "internal-use-only":
            if internal != "explicit-grant":
                issues.append("internal-use-only requires a separately recorded explicit internal-use grant")
        elif claim != "not-redistributable":
            issues.append("an explicit redistribution denial supports not-redistributable")
    else:
        if not isinstance(data.get("attributionRequired"), bool) or not isinstance(data.get("attributionPresent"), bool):
            raise ValueError("attribution flags must be booleans for an explicit grant")
        if claim != "redistributable":
            issues.append("an explicit grant was not claimed as redistributable")
        elif data["attributionRequired"] and not data["attributionPresent"]:
            issues.append("the grant requires attribution and the copy does not include it")
    return {
        "status": "review" if issues else "pass",
        "work": data["work"],
        "claim": claim,
        "redistributionEvidence": evidence,
        "internalUseEvidence": internal,
        "issues": issues,
        "scope": "consistency of a filled licence note; redistribution denial does not grant internal use",
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
