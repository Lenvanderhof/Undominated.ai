#!/usr/bin/env python3
"""Local deterministic check. Python 3 standard library; no network or writes."""
import argparse
import json
import sys
from pathlib import Path

# Explicit units only. "per M" is absent on purpose: M is not expanded to million.
UNITS = {
    "per_million_tokens",
    "per_thousand_tokens",
    "per_token",
    "per_second",
    "per_megapixel",
    "per_hour",
}


def text(value, label):
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{label} must be non-empty text")
    return value


def check(data):
    label = text(data.get("label"), "label")
    rows = data.get("rows")
    notes = data.get("notes")
    if not isinstance(rows, list) or not rows:
        raise ValueError("at least one row is required")
    if not isinstance(notes, list) or not notes:
        raise ValueError("at least one note is required")
    parsed_notes = []
    seen_notes = set()
    for index, note in enumerate(notes):
        if not isinstance(note, dict):
            raise ValueError("each note must be an object")
        ident = text(note.get("id"), f"notes[{index}].id")
        if ident in seen_notes:
            raise ValueError("each note id must be unique")
        seen_notes.add(ident)
        applies = note.get("appliesTo")
        if not isinstance(applies, list) or not applies or not all(isinstance(item, str) and item.strip() for item in applies):
            raise ValueError(f"notes[{index}].appliesTo must be a non-empty list of meter names")
        if len(set(applies)) != len(applies):
            raise ValueError(f"notes[{index}].appliesTo contains a duplicate meter")
        unit = note.get("invoiceUnit")
        if unit not in UNITS:
            raise ValueError(f"notes[{index}].invoiceUnit is not an allowlisted unit")
        parsed_notes.append({"id": ident, "appliesTo": applies, "invoiceUnit": unit})
    parsed_rows = []
    seen_rows = set()
    meters = set()
    for index, row in enumerate(rows):
        if not isinstance(row, dict):
            raise ValueError("each row must be an object")
        ident = text(row.get("id"), f"rows[{index}].id")
        if ident in seen_rows:
            raise ValueError("each row id must be unique")
        seen_rows.add(ident)
        meter = text(row.get("meter"), f"rows[{index}].meter")
        claimed = row.get("claimedUnit")
        if claimed not in UNITS:
            raise ValueError(f"rows[{index}].claimedUnit is not an allowlisted unit")
        meters.add(meter)
        parsed_rows.append({"id": ident, "meter": meter, "claimedUnit": claimed})
    issues = []
    out_rows = []
    for row in parsed_rows:
        named = [note for note in parsed_notes if row["meter"] in note["appliesTo"]]
        units = {note["invoiceUnit"] for note in named}
        supported = next(iter(units)) if len(units) == 1 else None
        row_issues = []
        if not named:
            row_issues.append(f"{row['id']} claims {row['claimedUnit']} and no note names meter {row['meter']}")
        elif supported is None:
            row_issues.append(f"{row['id']} is named by notes that disagree on invoiceUnit")
        elif supported != row["claimedUnit"]:
            row_issues.append(
                f"{row['id']} claims {row['claimedUnit']} but the notes that name {row['meter']} state {supported}"
            )
        issues.extend(row_issues)
        out_rows.append({
            "id": row["id"],
            "meter": row["meter"],
            "claimedUnit": row["claimedUnit"],
            "noteIds": [note["id"] for note in named],
            "supportedUnit": supported,
            "form": "matched" if supported == row["claimedUnit"] else "unsupported",
        })
    dangling = [note["id"] for note in parsed_notes if not any(meter in meters for meter in note["appliesTo"])]
    for ident in dangling:
        issues.append(f"note {ident} names no supplied meter")
    return {
        "status": "review" if issues else "pass",
        "label": label,
        "rows": out_rows,
        "issues": issues,
        "scope": "a unit claim is supported only by a note whose appliesTo names that row's meter; no amount is read and no unit is converted",
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
