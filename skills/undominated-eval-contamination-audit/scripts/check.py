#!/usr/bin/env python3
"""Local deterministic check for benchmark evaluation contamination and judge skew.
Python 3 standard library only; zero external dependencies.
Audits n-gram containment, verbatim memorization, judge position bias, and length skew.
"""
import argparse
import json
import math
import re
import sys
from datetime import date
from pathlib import Path


def safe_float(value, label: str, min_val: float = 0.0, max_val: float = 1.0) -> float:
    if isinstance(value, bool):
        raise ValueError(f"{label} cannot be a boolean")
    if not isinstance(value, (int, float)):
        raise ValueError(f"{label} must be a number, got {type(value).__name__}")
    val = float(value)
    if not math.isfinite(val) or val < min_val or val > max_val:
        raise ValueError(f"{label} must be a finite number between {min_val} and {max_val}, got {val}")
    return val


def safe_int(value, label: str, min_val: int = 1) -> int:
    if isinstance(value, bool):
        raise ValueError(f"{label} cannot be a boolean")
    if not isinstance(value, int):
        raise ValueError(f"{label} must be an integer, got {type(value).__name__}")
    if value < min_val:
        raise ValueError(f"{label} must be >= {min_val}, got {value}")
    return value


def verify_path_security(path: Path, label: str):
    if path.is_symlink():
        raise ValueError(f"{label} symlinks are strictly forbidden: {path}")
    for parent in path.parents:
        if parent.is_symlink():
            raise ValueError(f"{label} parent directory symlinks are strictly forbidden: {parent}")


def tokenize(text: str) -> list[str]:
    return re.findall(r"\b\w+\b", text.lower())


def get_ngrams(tokens: list[str], n: int) -> set[tuple[str, ...]]:
    if not tokens:
        return set()
    if len(tokens) < n:
        return {tuple(tokens)}
    return {tuple(tokens[i : i + n]) for i in range(len(tokens) - n + 1)}


def longest_common_word_sequence(a: list[str], b: list[str]) -> int:
    """Finds the longest contiguous matching sequence of tokens between two token lists."""
    if not a or not b:
        return 0
    # Dynamic programming for longest common substring of words
    dp = [0] * (len(b) + 1)
    max_len = 0
    for w_a in a:
        prev = 0
        for j, w_b in enumerate(b):
            curr = dp[j + 1]
            if w_a == w_b:
                dp[j + 1] = prev + 1
                if dp[j + 1] > max_len:
                    max_len = dp[j + 1]
            else:
                dp[j + 1] = 0
            prev = curr
    return max_len


def pearson_correlation(x: list[float], y: list[float]) -> float | None:
    if len(x) != len(y) or len(x) < 3:
        return None
    scale_x, scale_y = max(map(abs, x)), max(map(abs, y))
    if not scale_x or not scale_y:
        return None
    norm_x = [v / scale_x for v in x]
    norm_y = [v / scale_y for v in y]
    mx = math.fsum(norm_x) / len(norm_x)
    my = math.fsum(norm_y) / len(norm_y)
    dx = [v - mx for v in norm_x]
    dy = [v - my for v in norm_y]
    denom = math.sqrt(math.fsum(v * v for v in dx)) * math.sqrt(math.fsum(v * v for v in dy))
    if not denom:
        return None
    corr = math.fsum(a * b for a, b in zip(dx, dy)) / denom
    return max(-1.0, min(1.0, corr))


def check(data: dict) -> dict:
    if not isinstance(data.get("evalSuite"), str) or not data["evalSuite"].strip():
        raise ValueError("evalSuite must be non-empty text")
    if not isinstance(data.get("version"), str) or not data["version"].strip():
        raise ValueError("version must be non-empty text")

    observed_at = data.get("observedAt")
    if observed_at:
        try:
            date.fromisoformat(observed_at)
        except ValueError:
            raise ValueError("observedAt must be a valid ISO-8601 date (YYYY-MM-DD)")

    canary = data.get("canaryGuid")
    if canary is not None:
        if not isinstance(canary, str) or not canary.strip():
            raise ValueError("canaryGuid must be non-empty string when provided")

    ngram_size = safe_int(data.get("ngramSize", 8), "ngramSize", min_val=2)
    max_contamination = safe_float(
        data.get("maxAllowedContaminationRatio", 0.15),
        "maxAllowedContaminationRatio",
        min_val=0.0,
        max_val=1.0,
    )

    samples = data.get("samples")
    if not isinstance(samples, list) or not samples:
        raise ValueError("samples must be a non-empty array of evaluation test cases")

    issues = []
    audited_samples = []

    for idx, s in enumerate(samples):
        if not isinstance(s, dict):
            raise ValueError(f"samples[{idx}] must be an object")
        sample_id = s.get("id", f"sample-{idx+1}")
        eval_text = s.get("evalText")
        ref_text = s.get("referenceCorpusExcerpt")

        if not isinstance(eval_text, str) or not eval_text.strip():
            raise ValueError(f"samples[{idx}].evalText must be non-empty text")
        if ref_text is not None and not isinstance(ref_text, str):
            raise ValueError(f"samples[{idx}].referenceCorpusExcerpt must be a string or null")

        eval_tokens = tokenize(eval_text)
        eval_ngrams = get_ngrams(eval_tokens, ngram_size)

        containment = 0.0
        longest_seq = 0
        if ref_text:
            ref_tokens = tokenize(ref_text)
            ref_ngrams = get_ngrams(ref_tokens, ngram_size)
            if eval_ngrams:
                overlap = eval_ngrams & ref_ngrams
                containment = len(overlap) / len(eval_ngrams)
            longest_seq = longest_common_word_sequence(eval_tokens, ref_tokens)

        # Flag contamination breaches
        if containment > max_contamination:
            issues.append(
                f"[{sample_id}] High {ngram_size}-gram contamination: {containment*100:.1f}% overlaps reference corpus (allowed limit: {max_contamination*100:.1f}%)"
            )
        if longest_seq >= 13:
            issues.append(
                f"[{sample_id}] Verbatim memorization risk: {longest_seq} consecutive identical words with training/reference text"
            )

        audited_samples.append({
            "id": sample_id,
            "evalTokenCount": len(eval_tokens),
            "containmentRatio": round(containment, 4),
            "longestVerbatimSequence": longest_seq,
            "passedContamination": containment <= max_contamination and longest_seq < 13,
        })

    # Judge audit section
    judge_result = None
    judge_data = data.get("judgeAudit")
    if judge_data:
        if not isinstance(judge_data, dict):
            raise ValueError("judgeAudit must be an object")

        judge_model = judge_data.get("judgeModel", "unspecified-judge")
        max_inconsistency = safe_float(
            judge_data.get("maxAllowedPositionInconsistency", 0.15),
            "judgeAudit.maxAllowedPositionInconsistency",
            min_val=0.0,
            max_val=1.0,
        )
        max_verbosity_corr = safe_float(
            judge_data.get("maxAllowedVerbosityCorrelation", 0.60),
            "judgeAudit.maxAllowedVerbosityCorrelation",
            min_val=-1.0,
            max_val=1.0,
        )

        pos_tests = judge_data.get("pairwisePositionTests", [])
        if not isinstance(pos_tests, list):
            raise ValueError("judgeAudit.pairwisePositionTests must be an array")

        inconsistent_count = 0
        for p_idx, pt in enumerate(pos_tests):
            if not isinstance(pt, dict):
                raise ValueError(f"judgeAudit.pairwisePositionTests[{p_idx}] must be an object")
            std_win = pt.get("standardWinner")
            swp_win = pt.get("swappedWinner")
            if std_win not in ("A", "B", "tie") or swp_win not in ("A", "B", "tie"):
                raise ValueError(f"judge winners must be 'A', 'B', or 'tie', got ({std_win}, {swp_win})")
            if std_win != swp_win:
                inconsistent_count += 1

        inconsistency_rate = (inconsistent_count / len(pos_tests)) if pos_tests else 0.0
        if pos_tests and inconsistency_rate > max_inconsistency:
            issues.append(
                f"[{judge_model}] Severe position bias: {inconsistency_rate*100:.1f}% judgments flipped upon swapping candidate positions (threshold: {max_inconsistency*100:.1f}%)"
            )

        # Verbosity correlation
        v_samples = judge_data.get("verbositySamples", [])
        if not isinstance(v_samples, list):
            raise ValueError("judgeAudit.verbositySamples must be an array")

        lens = []
        scores = []
        for v_idx, vs in enumerate(v_samples):
            if not isinstance(vs, dict):
                raise ValueError(f"judgeAudit.verbositySamples[{v_idx}] must be an object")
            rlen = safe_int(vs.get("responseLengthTokens"), f"verbositySamples[{v_idx}].responseLengthTokens", min_val=1)
            rscore = safe_float(vs.get("score"), f"verbositySamples[{v_idx}].score", min_val=0.0, max_val=100.0)
            lens.append(float(rlen))
            scores.append(float(rscore))

        v_corr = pearson_correlation(lens, scores) if len(lens) >= 3 else None
        if v_corr is not None and v_corr > max_verbosity_corr:
            issues.append(
                f"[{judge_model}] Significant verbosity skew: Pearson correlation r={v_corr:.2f} between response length and score (threshold: {max_verbosity_corr:.2f})"
            )

        judge_result = {
            "judgeModel": judge_model,
            "totalPositionTests": len(pos_tests),
            "inconsistentPositionCount": inconsistent_count,
            "positionInconsistencyRate": round(inconsistency_rate, 4),
            "positionBiasPassed": inconsistency_rate <= max_inconsistency,
            "verbositySampleCount": len(v_samples),
            "verbosityScoreCorrelation": round(v_corr, 4) if v_corr is not None else None,
            "verbosityBiasPassed": v_corr is None or v_corr <= max_verbosity_corr,
        }

    return {
        "status": "review" if issues else "pass",
        "evalSuite": data["evalSuite"],
        "version": data["version"],
        "canaryVerified": canary is not None,
        "totalSamplesAudited": len(audited_samples),
        "auditedSamples": audited_samples,
        "judgeAudit": judge_result,
        "issues": issues,
        "scope": "n-gram contamination detection, verbatim memorization check, and LLM judge bias verification",
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", help="JSON input path; no network fetches")
    args = parser.parse_args()

    try:
        input_path = Path(args.input)
        verify_path_security(input_path, "input path")
        if not input_path.is_file():
            raise ValueError(f"input file does not exist or is not a regular file: {args.input}")

        data = json.loads(input_path.read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            raise ValueError("input JSON must be an object")

        result = check(data)
        print(json.dumps(result, indent=2))
        return 0 if result["status"] == "pass" else 1

    except (ValueError, KeyError, TypeError, OSError, ArithmeticError, AttributeError, IndexError) as exc:
        print(json.dumps({"status": "invalid", "error": str(exc)}, indent=2))
        return 2


if __name__ == "__main__":
    sys.exit(main())
