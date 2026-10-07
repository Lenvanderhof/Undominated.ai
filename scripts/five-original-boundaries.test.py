#!/usr/bin/env python3
"""Exercise the five source-only checkers through their real CLI entrypoints."""
import json
import pathlib
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
CASES = json.loads((ROOT / 'scripts/fixtures/five-original-boundaries.json').read_text())['cases']
STATUS = {'pass': 0, 'review': 1, 'invalid': 2}


def subset(actual, expected):
    if isinstance(expected, dict):
        return isinstance(actual, dict) and all(k in actual and subset(actual[k], v) for k, v in expected.items())
    return actual == expected


def main():
    seen, failures = set(), []
    if not CASES:
        raise ValueError('case list cannot be empty')
    with tempfile.TemporaryDirectory(prefix='five skill checks ') as folder:
        fixture = pathlib.Path(folder) / 'supplied input.json'
        for case in CASES:
            key = (case['skill'], case['name'])
            if key in seen:
                raise ValueError('duplicate case ' + repr(key))
            seen.add(key)
            script = ROOT / 'skills' / case['skill'] / 'scripts/check.py'
            if 'hex' in case:
                fixture.write_bytes(bytes.fromhex(case['hex']))
            else:
                fixture.write_text(case.get('raw', json.dumps(case.get('input'))), encoding='utf-8')
            args = case['args'] if 'args' in case else [str(fixture)]
            result = subprocess.run([sys.executable, '-B', str(script), *args], capture_output=True, text=True, timeout=10)
            try:
                parsed = json.loads(result.stdout)
                assert isinstance(parsed, dict), 'output must be an object'
                assert parsed.get('status') == case['status'], repr(parsed)
                assert result.returncode == STATUS[case['status']], 'exit code disagrees with status'
                assert not result.stderr, result.stderr
                assert subset(parsed, case.get('expect', {})), 'observable result mismatch: ' + repr(parsed)
                if case['status'] == 'invalid':
                    assert isinstance(parsed.get('error'), str) and parsed['error'], 'missing invalid reason'
                else:
                    assert isinstance(parsed.get('issues'), list), 'missing issue list'
                    assert bool(parsed['issues']) == (case['status'] == 'review'), 'status/reason disagreement'
            except (AssertionError, ValueError) as error:
                failures.append({'skill': case['skill'], 'name': case['name'], 'error': str(error), 'stdout': result.stdout, 'stderr': result.stderr})
    print(json.dumps({'status': 'FAIL' if failures else 'PASS', 'cases': len(CASES), 'passed': len(CASES) - len(failures), 'failures': failures}, indent=2))
    return bool(failures)


if __name__ == '__main__':
    sys.exit(main())
