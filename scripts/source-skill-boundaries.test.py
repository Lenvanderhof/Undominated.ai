#!/usr/bin/env python3
"""Independent CLI boundary/control regressions for source-only skill checkers.

Uses Python standard library, temporary input files and actual CLI exit statuses.
Synthetic prices and model identities are test inputs, never market observations.
"""
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


ROOT = Path(__file__).resolve().parent.parent
CASES = json.loads((ROOT / "scripts/fixtures/source-skill-boundaries.json").read_text())["cases"]
if not isinstance(CASES, list) or not CASES:
    raise ValueError("Source boundary cases must be a non-empty array")
if len({case["id"] for case in CASES}) != len(CASES):
    raise ValueError("Source boundary case IDs must be unique")
EXIT_CODES = {"pass": 0, "review": 1, "invalid": 2}


def field(value, dotted_path):
    for segment in dotted_path.split("."):
        try:
            value = value[int(segment)] if isinstance(value, list) else value[segment]
        except (KeyError, IndexError, TypeError) as exc:
            raise AssertionError(f"Required output field is absent: {dotted_path}") from exc
    return value


class SourceSkillBoundary(unittest.TestCase):
    def __init__(self, case):
        super().__init__()
        self.case = case

    def shortDescription(self):
        return self.case["id"] + ": " + self.case["why"]

    def runTest(self):
        case = self.case
        with tempfile.TemporaryDirectory(prefix="undominated-boundary-") as directory:
            directory = Path(directory)
            path = directory / "input.json"
            path.write_text(json.dumps(case["input"]))
            for name, contents in case.get("auxiliaryFiles", {}).items():
                auxiliary = directory / name
                self.assertEqual(auxiliary.parent, directory)
                auxiliary.write_text(json.dumps(contents))
            process = subprocess.run(
                [sys.executable, "-B", str(ROOT / "skills" / case["skill"] / "scripts/check.py"), str(path)],
                cwd=directory, text=True, capture_output=True, timeout=10,
                env={**os.environ, "PYTHONDONTWRITEBYTECODE": "1"},
            )
        self.assertEqual(process.stderr, "", process.stderr)
        result = json.loads(process.stdout)
        self.assertIn(result["status"], case["expectedStatuses"], result)
        self.assertEqual(process.returncode, EXIT_CODES[result["status"]], result)
        for name, expected in case.get("expectedFields", {}).items():
            self.assertEqual(field(result, name), expected, (name, result))
        for name, expected in case.get("expectedCounts", {}).items():
            self.assertEqual(len(field(result, name)), expected, (name, result))


if __name__ == "__main__":
    result = unittest.TextTestRunner(verbosity=2).run(
        unittest.TestSuite(SourceSkillBoundary(case) for case in CASES)
    )
    sys.exit(0 if result.wasSuccessful() else 1)
