from __future__ import annotations

import argparse
from copy import deepcopy
from hashlib import sha256
import json
import math
from pathlib import Path
from typing import Any, Callable

from .benchmark import BENCHMARK_SCHEMA, _validate_spec
from .calibration_report import benchmark_artifact_digest
from .cohort_thresholds import validate_cohort_thresholds
from .threshold_calibration import (
    CALIBRATION_PROPOSAL_SCHEMA,
    calibration_proposal_digest,
)
from .threshold_provenance import (
    THRESHOLD_PROVENANCE_SCHEMA,
    validate_threshold_provenance,
)


def _rate(value: object, name: str) -> float:
    if (
        not isinstance(value, (int, float))
        or isinstance(value, bool)
        or not math.isfinite(value)
        or value < 0
        or value > 1
    ):
        raise ValueError(f"{name} must be between 0 and 1")
    return float(value)


def _minimum(value: object, name: str) -> int:
    if not isinstance(value, int) or isinstance(value, bool) or value <= 0:
        raise ValueError(f"{name} must be a positive integer")
    return value


def _content_digest(read_bytes: Callable[[str], bytes], path: str) -> str:
    try:
        content = read_bytes(path)
    except OSError as exc:
        raise ValueError("Calibration source content could not be read") from exc
    if not isinstance(content, bytes):
        raise ValueError("Calibration source reader must return bytes")
    return sha256(content).hexdigest()


def _verify_source_report_binding(
    manifest: dict[str, Any],
    proposal_source: dict[str, Any],
    source_report: dict[str, Any],
    read_bytes: Callable[[str], bytes],
) -> None:
    if (
        source_report.get("schemaVersion") != BENCHMARK_SCHEMA
        or source_report.get("datasetSplit") != "calibration"
    ):
        raise ValueError("Calibration source report is invalid")

    source_artifact_digest = source_report.get("artifactDigest")
    if (
        not isinstance(source_artifact_digest, str)
        or source_artifact_digest != benchmark_artifact_digest(source_report)
        or proposal_source.get("benchmarkArtifactDigest")
        != "sha256:" + source_artifact_digest
    ):
        raise ValueError("Calibration source report digest does not match the proposal")

    metadata_pairs = (
        ("datasetVersion", "datasetVersion"),
        ("datasetSplit", "datasetSplit"),
        ("subjectKeyScheme", "subjectKeyScheme"),
        ("subjectKeyKeyId", "subjectKeyKeyId"),
        ("subjectPartitionDigest", "subjectPartitionDigest"),
        ("commit", "commit"),
        ("measurementContract", "measurementContract"),
        ("evaluator", "evaluator"),
    )
    if any(
        source_report.get(report_key) != manifest.get(manifest_key)
        for report_key, manifest_key in metadata_pairs
    ):
        raise ValueError(
            "Calibration source report metadata does not match the manifest"
        )

    coverage = source_report.get("coverage")
    if (
        not isinstance(coverage, dict)
        or coverage.get("contract") != manifest.get("coverageContract")
    ):
        raise ValueError("Calibration source coverage does not match the manifest")

    if any(
        source_report.get(key) is not None
        for key in (
            "threshold",
            "landmarkThreshold",
            "cohortThresholds",
            "thresholdProvenance",
        )
    ):
        raise ValueError("Calibration source report must be unthresholded")

    cases = manifest.get("cases")
    rows = source_report.get("rows")
    if (
        not isinstance(cases, list)
        or not isinstance(rows, list)
        or len(rows) != len(cases)
    ):
        raise ValueError("Calibration source cases do not match the manifest")

    rows_by_case_id = {
        row.get("caseId"): row
        for row in rows
        if isinstance(row, dict) and isinstance(row.get("caseId"), str)
    }
    if len(rows_by_case_id) != len(rows):
        raise ValueError("Calibration source case IDs are invalid")

    for case in cases:
        row = rows_by_case_id.get(case.get("caseId"))
        if not isinstance(row, dict) or row.get("status") != "SCORABLE":
            raise ValueError("Calibration source report must be fully scorable")

        for field in (
            "candidateSubjectKey",
            "referenceSubjectKey",
            "expectedIdentityMatch",
            "scenario",
        ):
            if row.get(field) != case.get(field):
                raise ValueError(
                    "Calibration source case evidence does not match the manifest"
                )

        candidate_path = case.get("candidatePath")
        reference_paths = case.get("referencePaths")
        if not isinstance(candidate_path, str) or not isinstance(
            reference_paths, list
        ):
            raise ValueError("Calibration manifest paths are invalid")

        if row.get("candidateContentSha256") != _content_digest(
            read_bytes, candidate_path
        ):
            raise ValueError(
                "Calibration candidate content does not match the source report"
            )

        reference_digests = [
            _content_digest(read_bytes, path)
            for path in reference_paths
            if isinstance(path, str)
        ]
        if (
            len(reference_digests) != len(reference_paths)
            or row.get("referenceContentSha256") != reference_digests
        ):
            raise ValueError(
                "Calibration reference content does not match the source report"
            )


def build_thresholded_manifest(
    manifest: dict[str, Any],
    proposal: dict[str, Any],
    *,
    source_report: dict[str, Any],
    expected_proposal_digest: str,
    acceptance: dict[str, Any],
    read_bytes: Callable[[str], bytes] | None = None,
) -> dict[str, Any]:
    if proposal.get("schemaVersion") != CALIBRATION_PROPOSAL_SCHEMA:
        raise ValueError("Threshold proposal schema is invalid")
    artifact_digest = proposal.get("artifactDigest")
    if not isinstance(artifact_digest, str) or artifact_digest != calibration_proposal_digest(
        proposal
    ):
        raise ValueError("Threshold proposal artifact digest is invalid")
    actual_proposal_digest = "sha256:" + artifact_digest
    if expected_proposal_digest != actual_proposal_digest:
        raise ValueError("Expected proposal digest does not match the threshold proposal")
    if manifest.get("datasetSplit") != "calibration":
        raise ValueError("Thresholded manifests must start from the calibration split")
    if any(
        manifest.get(key) is not None
        for key in (
            "threshold",
            "landmarkThreshold",
            "cohortThresholds",
            "calibrationVersion",
            "acceptance",
            "thresholdProvenance",
        )
    ):
        raise ValueError("Thresholded manifest input must be an unthresholded manifest")
    _validate_spec(manifest)
    source = proposal.get("source")
    requirements = proposal.get("requirements")
    if not isinstance(source, dict) or not isinstance(requirements, dict):
        raise ValueError("Threshold proposal provenance is invalid")
    if (
        source.get("datasetSplit") != "calibration"
        or source.get("datasetVersion") != manifest.get("datasetVersion")
    ):
        raise ValueError("Threshold proposal does not belong to this calibration manifest")
    _verify_source_report_binding(
        manifest,
        source,
        source_report,
        read_bytes or (lambda path: Path(path).read_bytes()),
    )
    policy = proposal.get("cohortThresholds")
    if not isinstance(policy, dict) or not isinstance(policy.get("global"), dict):
        raise ValueError("Threshold proposal cohort policy is invalid")
    global_thresholds = policy["global"]
    normalized_policy = validate_cohort_thresholds(
        policy,
        global_similarity=float(global_thresholds.get("similarityMin")),
        global_landmark_residual=float(global_thresholds.get("landmarkResidualMax")),
    )
    max_false_accept_rate = _rate(
        acceptance.get("maxFalseAcceptRate"), "acceptance.maxFalseAcceptRate"
    )
    max_false_reject_rate = _rate(
        acceptance.get("maxFalseRejectRate"), "acceptance.maxFalseRejectRate"
    )
    max_unscorable_rate = _rate(
        acceptance.get("maxUnscorableRate"), "acceptance.maxUnscorableRate"
    )
    minimum_genuine_cases = _minimum(
        acceptance.get("minimumGenuineCases"), "acceptance.minimumGenuineCases"
    )
    minimum_impostor_cases = _minimum(
        acceptance.get("minimumImpostorCases"), "acceptance.minimumImpostorCases"
    )
    if (
        max_false_accept_rate > _rate(
            requirements.get("maxFalseAcceptRate"), "requirements.maxFalseAcceptRate"
        )
        or max_false_reject_rate > _rate(
            requirements.get("maxFalseRejectRate"), "requirements.maxFalseRejectRate"
        )
        or max_unscorable_rate > _rate(
            requirements.get("maxUnscorableRate"), "requirements.maxUnscorableRate"
        )
        or minimum_genuine_cases < _minimum(
            requirements.get("minimumGenuineCases"),
            "requirements.minimumGenuineCases",
        )
        or minimum_impostor_cases < _minimum(
            requirements.get("minimumImpostorCases"),
            "requirements.minimumImpostorCases",
        )
    ):
        raise ValueError("Manifest acceptance may not weaken the proposal requirements")
    output = deepcopy(manifest)
    output.update(
        {
            "threshold": normalized_policy["global"]["similarityMin"],
            "landmarkThreshold": normalized_policy["global"]["landmarkResidualMax"],
            "cohortThresholds": normalized_policy,
            "calibrationVersion": proposal.get("calibrationVersion"),
            "acceptance": {
                "maxFalseAcceptRate": max_false_accept_rate,
                "maxFalseRejectRate": max_false_reject_rate,
                "maxUnscorableRate": max_unscorable_rate,
                "minimumGenuineCases": minimum_genuine_cases,
                "minimumImpostorCases": minimum_impostor_cases,
            },
            "thresholdProvenance": validate_threshold_provenance(
                {
                    "schemaVersion": THRESHOLD_PROVENANCE_SCHEMA,
                    "proposalArtifactDigest": actual_proposal_digest,
                    "sourceBenchmarkArtifactDigest": source.get(
                        "benchmarkArtifactDigest"
                    ),
                }
            ),
        }
    )
    _validate_spec(output)
    return output


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Build a thresholded MIRAVA calibration manifest from an approved proposal"
    )
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--proposal", required=True)
    parser.add_argument("--source-report", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--expected-proposal-digest", required=True)
    parser.add_argument("--max-false-accept-rate", required=True, type=float)
    parser.add_argument("--max-false-reject-rate", required=True, type=float)
    parser.add_argument("--max-unscorable-rate", required=True, type=float)
    parser.add_argument("--minimum-genuine-cases", required=True, type=int)
    parser.add_argument("--minimum-impostor-cases", required=True, type=int)
    args = parser.parse_args()
    manifest = json.loads(Path(args.manifest).read_text(encoding="utf-8"))
    proposal = json.loads(Path(args.proposal).read_text(encoding="utf-8"))
    source_report = json.loads(Path(args.source_report).read_text(encoding="utf-8"))
    output = build_thresholded_manifest(
        manifest,
        proposal,
        source_report=source_report,
        expected_proposal_digest=args.expected_proposal_digest,
        acceptance={
            "maxFalseAcceptRate": args.max_false_accept_rate,
            "maxFalseRejectRate": args.max_false_reject_rate,
            "maxUnscorableRate": args.max_unscorable_rate,
            "minimumGenuineCases": args.minimum_genuine_cases,
            "minimumImpostorCases": args.minimum_impostor_cases,
        },
    )
    Path(args.output).write_text(
        json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


if __name__ == "__main__":
    main()
