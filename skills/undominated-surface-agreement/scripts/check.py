#!/usr/bin/env python3
"""Local deterministic check. Python 3 standard library; no network or writes."""
import argparse
import json
import re
import sys
from decimal import Decimal
from pathlib import Path


def value_of(raw, field, side, issues, present):
    """Return (Decimal | None, form). A missing key is absent. A present null is null."""
    if not present:
        return None, "absent"
    if raw is None:
        return None, "null"
    if isinstance(raw, bool) or isinstance(raw, (int, float)):
        issues.append(f"{field} is a JSON number on the {side} surface, not a decimal string")
        return Decimal(str(raw)), "number"
    if not isinstance(raw, str) or not re.fullmatch(r"(?:0|[1-9]\d*)(?:\.\d+)?", raw):
        raise ValueError(f"{side}.{field} must be a non-negative decimal string or null")
    return Decimal(raw), "decimal"


def compare(left, left_form, right, right_form):
    """Exact-decimal equality, with a stated reason for every non-agreement."""
    if left_form == "null" and right_form == "null":
        return True, "both surfaces state null; nothing is stated, which establishes no value"
    if left_form == "absent" and right_form == "absent":
        return True, "field is absent from both surfaces; nothing is stated, which is not a verified value"
    if {left_form, right_form} == {"null", "absent"}:
        stated, omitted = ("published", "rendered") if left_form == "null" else ("rendered", "published")
        return False, f"the {stated} surface states null and the {omitted} surface omits the field; a stated null and a missing key are not the same"
    if left_form in ("absent", "null"):
        return False, "the published surface states nothing for this field and the rendered surface states a value; a dropped or nulled field is not an agreement"
    if right_form in ("absent", "null"):
        return False, "the rendered surface states nothing for this field and the published surface states a value; a dropped or nulled field is not an agreement"
    if left_form == "number" and right_form == "number":
        return False, "both surfaces state a JSON number; agreement on a float is not evidence of the published value"
    if left_form != right_form:
        numeric, textual = ("published", "rendered") if left_form == "number" else ("rendered", "published")
        return False, f"{numeric} states a JSON number and {textual} a decimal string; the forms are not comparable"
    if left != right:
        return False, f"published {format(left, 'f')} does not equal rendered {format(right, 'f')}"
    return True, None


def check(data):
    if not isinstance(data.get("surface"), str) or not data["surface"].strip():
        raise ValueError("surface must be non-empty text")
    published = data.get("published")
    rendered = data.get("rendered")
    if not isinstance(published, dict) or not isinstance(rendered, dict):
        raise ValueError("published and rendered must both be objects")

    issues = []
    missing_rendered = sorted(set(published) - set(rendered))
    missing_published = sorted(set(rendered) - set(published))
    for field in missing_rendered:
        issues.append(f"{field} is published but absent from the rendered surface")
    for field in missing_published:
        issues.append(f"{field} is rendered but absent from the published payload")

    fields, agreements, disagreements = [], 0, 0
    for field in sorted(set(published) | set(rendered)):
        left, left_form = value_of(published.get(field), field, "published", issues, field in published)
        right, right_form = value_of(rendered.get(field), field, "rendered", issues, field in rendered)
        agrees, reason = compare(left, left_form, right, right_form)
        if not agrees and field in published and field in rendered:
            # Both sides state the field, so a non-agreement is a value or form
            # disagreement and has to reach the issues list; a key missing from one
            # side is already an issue of its own above. Without this a stated null
            # beside a value would agree, which is the failure being checked for.
            issues.append(f"{field} disagrees between the surface and the payload: {reason}")
        agreements += 1 if agrees else 0
        disagreements += 0 if agrees else 1
        fields.append({
            "field": field,
            "published": published[field] if field in published else None,
            "rendered": rendered[field] if field in rendered else None,
            "publishedForm": left_form,
            "renderedForm": right_form,
            "agrees": agrees,
            "reason": reason,
        })

    if not fields:
        issues.append("no fields were supplied; an empty comparison proves nothing")
    elif not any(row["agrees"] and row["reason"] is None for row in fields):
        issues.append("no field states a comparable value on both surfaces; null agreement establishes nothing")

    return {
        "status": "review" if issues else "pass",
        "surface": data["surface"],
        "fields": fields,
        "agreements": agreements,
        "disagreements": disagreements,
        "missingFromRendered": missing_rendered,
        "missingFromPublished": missing_published,
        "issues": issues,
        "scope": "one surface against one payload, exact decimal equality per field; two nulls agree that nothing is stated, which establishes no value",
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