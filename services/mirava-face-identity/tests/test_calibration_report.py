from __future__ import annotations

import json
from pathlib import Path

import pytest

from app.calibration_report import (
    benchmark_artifact_digest,
    canonical_json,
    load_and_verify_calibration_report,
)
import hashlib


def _report() -> dict:
    evaluator = {
        "name": "auraface",
        "version": "model-v1",
        "weightsDigest": "sha256:model",
        "preprocessingVersion": "align-v1",
    }
    scenario = {
        "yaw": "frontal",
        "pitch": "neutral",
        "roll": "neutral",
        "expression": "neutral",
        "gaze": "camera",
        "faceScale": "portrait",
        "light": "soft",
        "occlusion": "none",
        "styling": "natural",
        "context": "studio",
    }
    value = {
        "schemaVersion": "mirava-face-identity-benchmark/v1",
        "datasetVersion": "private-v1",
        "commit": "deadbeef",
        "calibrationVersion": "calibration-v1",
        "configurationDigest": hashlib.sha256(
            canonical_json(
                {
                    "datasetVersion": "private-v1",
                    "evaluator": evaluator,
                    "threshold": 0.8,
                    "landmarkThreshold": 0.2,
                }
            ).encode("utf-8")
        ).hexdigest(),
        "evaluator": evaluator,
        "threshold": 0.8,
        "landmarkThreshold": 0.2,
        "acceptance": {
            "maxFalseAcceptRate": 0.0,
            "maxFalseRejectRate": 0.0,
            "maxUnscorableRate": 0.0,
            "minimumGenuineCases": 1,
            "minimumImpostorCases": 1,
        },
        "acceptanceStatus": "PASS",
        "rows": [
            {
                "caseId": "genuine",
                "subjectKey": "subject-a",
                "expectedIdentityMatch": True,
                "scenario": scenario,
                "candidateContentSha256": "a" * 64,
                "referenceContentSha256": ["b" * 64] * 3,
                "status": "SCORABLE",
                "reasonCode": "MEASURED",
                "aggregateSimilarity": 0.9,
                "perReferenceSimilarity": [0.9] * 3,
                "landmarkResidual": 0.1,
                "perReferenceLandmarkResidual": [0.1] * 3,
                "decision": "PASS",
            },
            {
                "caseId": "impostor",
                "subjectKey": "subject-b",
                "expectedIdentityMatch": False,
                "scenario": scenario,
                "candidateContentSha256": "c" * 64,
                "referenceContentSha256": ["d" * 64] * 3,
                "status": "SCORABLE",
                "reasonCode": "MEASURED",
                "aggregateSimilarity": 0.1,
                "perReferenceSimilarity": [0.1] * 3,
                "landmarkResidual": 0.1,
                "perReferenceLandmarkResidual": [0.1] * 3,
                "decision": "FAIL",
            },
        ],
        "metrics": {
            "caseCount": 2,
            "scorableCount": 2,
            "unscorableCount": 0,
            "genuineCount": 1,
            "impostorCount": 1,
            "scorableGenuineCount": 1,
            "scorableImpostorCount": 1,
            "falseRejectRate": 0.0,
            "falseAcceptRate": 0.0,
            "unscorableRate": 0.0,
        },
    }
    value["artifactDigest"] = benchmark_artifact_digest(value)
    return value


def _write(tmp_path: Path, report: dict) -> Path:
    path = tmp_path / "calibration.json"
    path.write_text(json.dumps(report), encoding="utf-8")
    return path


def _verify(path: Path, digest: str) -> dict[str, str]:
    return load_and_verify_calibration_report(
        path,
        expected_digest="sha256:" + digest,
        expected_model_name="auraface",
        expected_model_version="model-v1",
        expected_model_digest="sha256:model",
        expected_preprocessing_version="align-v1",
        expected_threshold=0.8,
        expected_landmark_threshold=0.2,
    )


def test_verifies_replayable_calibration_report(tmp_path: Path) -> None:
    report = _report()
    result = _verify(_write(tmp_path, report), report["artifactDigest"])

    assert result == {
        "calibrationVersion": "calibration-v1",
        "calibrationDigest": "sha256:" + report["artifactDigest"],
        "calibrationStatus": "PASS",
    }


def test_rejects_tampered_calibration_report(tmp_path: Path) -> None:
    report = _report()
    digest = report["artifactDigest"]
    report["threshold"] = 0.1

    with pytest.raises(RuntimeError, match="artifact digest does not match"):
        _verify(_write(tmp_path, report), digest)


def test_rejects_calibration_for_different_runtime_thresholds(
    tmp_path: Path,
) -> None:
    report = _report()
    report["threshold"] = 0.7
    report["artifactDigest"] = benchmark_artifact_digest(report)

    with pytest.raises(RuntimeError, match="thresholds do not match runtime"):
        _verify(_write(tmp_path, report), report["artifactDigest"])


def test_rejects_forged_acceptance_status(tmp_path: Path) -> None:
    report = _report()
    report["acceptance"]["minimumGenuineCases"] = 2
    report["artifactDigest"] = benchmark_artifact_digest(report)

    with pytest.raises(
        RuntimeError, match="acceptance status does not match evidence"
    ):
        _verify(_write(tmp_path, report), report["artifactDigest"])


def test_replays_integer_json_thresholds_as_runtime_floats(tmp_path: Path) -> None:
    report = _report()
    report["threshold"] = 1
    report["landmarkThreshold"] = 1
    report["rows"][0]["aggregateSimilarity"] = 1.0
    report["rows"][0]["perReferenceSimilarity"] = [1.0] * 3
    report["configurationDigest"] = hashlib.sha256(
        canonical_json(
            {
                "datasetVersion": report["datasetVersion"],
                "evaluator": report["evaluator"],
                "threshold": 1.0,
                "landmarkThreshold": 1.0,
            }
        ).encode("utf-8")
    ).hexdigest()
    report["artifactDigest"] = benchmark_artifact_digest(report)

    result = load_and_verify_calibration_report(
        _write(tmp_path, report),
        expected_digest="sha256:" + report["artifactDigest"],
        expected_model_name="auraface",
        expected_model_version="model-v1",
        expected_model_digest="sha256:model",
        expected_preprocessing_version="align-v1",
        expected_threshold=1.0,
        expected_landmark_threshold=1.0,
    )

    assert result["calibrationStatus"] == "PASS"


def test_rejects_forged_row_aggregates(tmp_path: Path) -> None:
    report = _report()
    report["rows"][0]["perReferenceSimilarity"] = [0.1, 0.2, 0.3]
    report["artifactDigest"] = benchmark_artifact_digest(report)

    with pytest.raises(RuntimeError, match="aggregates do not match"):
        _verify(_write(tmp_path, report), report["artifactDigest"])
