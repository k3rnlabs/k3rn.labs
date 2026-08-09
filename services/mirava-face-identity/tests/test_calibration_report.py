from __future__ import annotations

import json
from pathlib import Path

import pytest

from app.calibration_report import (
    benchmark_artifact_digest,
    canonical_json,
    load_and_verify_benchmark_report,
    load_and_verify_calibration_report,
)
import hashlib
from app.benchmark import (
    CANONICAL_SCENARIO_COHORTS,
    _coverage_report,
    _partition_digest,
)
from app.face_geometry import MEASUREMENT_CONTRACT, FaceGeometry, geometry_payload
from app.cohort_thresholds import (
    MEASURED_COHORT_VALUES,
    resolve_cohort_thresholds,
)


def cohort_thresholds(similarity: float, residual: float) -> dict:
    similarity = float(similarity)
    residual = float(residual)
    return {
        "schemaVersion": "mirava-face-cohort-thresholds/v1",
        "selectionStrategy": "strictest-applicable/v1",
        "global": {
            "similarityMin": similarity,
            "landmarkResidualMax": residual,
        },
        "axes": {
            axis: {
                cohort: {
                    "similarityMin": similarity,
                    "landmarkResidualMax": residual,
                }
                for cohort in values
            }
            for axis, values in MEASURED_COHORT_VALUES.items()
        },
    }


def candidate_geometry(scenario: dict[str, str]) -> dict:
    return geometry_payload(
        FaceGeometry(
            yaw={
                "frontal": 0.0,
                "three-quarter-left": -25.0,
                "three-quarter-right": 25.0,
                "profile-left": -60.0,
                "profile-right": 60.0,
            }[scenario["yaw"]],
            pitch={"down": -20.0, "neutral": 0.0, "up": 20.0}[
                scenario["pitch"]
            ],
            roll={"neutral": 0.0, "tilted-left": -15.0, "tilted-right": 15.0}[
                scenario["roll"]
            ],
            face_area_ratio={
                "close-portrait": 0.1,
                "half-body": 0.04,
                "full-body": 0.01,
            }[scenario["faceScale"]],
            normalized_reprojection_error=0.01,
        )
    )


def _report() -> dict:
    evaluator = {
        "name": "auraface",
        "version": "model-v1",
        "weightsDigest": "sha256:model",
        "preprocessingVersion": "align-v1",
    }
    coverage_contract = {
        "profile": "canonical-v1",
        "minimumGenuineCasesPerValue": 1,
        "minimumImpostorCasesPerValue": 1,
        "axes": {
            axis: list(values)
            for axis, values in CANONICAL_SCENARIO_COHORTS.items()
        },
    }
    threshold_policy = cohort_thresholds(0.8, 0.2)
    rows = []
    for index in range(5):
        scenario = {
            axis: values[index % len(values)]
            for axis, values in CANONICAL_SCENARIO_COHORTS.items()
        }
        for expected in (True, False):
            score = 0.9 if expected else 0.1
            geometry = candidate_geometry(scenario)
            rows.append({
                "caseId": f"{'genuine' if expected else 'impostor'}-{index}",
                "candidateSubjectKey": "subject-a" if expected else "subject-b",
                "referenceSubjectKey": "subject-a",
                "expectedIdentityMatch": expected,
                "scenario": scenario,
                "candidateContentSha256": ("a" if expected else "c") * 64,
                "referenceContentSha256": [("b" if expected else "d") * 64] * 3,
                "status": "SCORABLE",
                "reasonCode": "MEASURED",
                "aggregateSimilarity": score,
                "perReferenceSimilarity": [score] * 3,
                "landmarkResidual": 0.1,
                "perReferenceLandmarkResidual": [0.1] * 3,
                "decision": "PASS" if expected else "FAIL",
                "candidateGeometry": geometry,
                "appliedThresholds": resolve_cohort_thresholds(
                    threshold_policy,
                    geometry["measuredCohorts"],
                ),
            })
    value = {
        "schemaVersion": "mirava-face-identity-benchmark/v4",
        "datasetVersion": "private-v1",
        "datasetSplit": "calibration",
        "subjectKeyScheme": "hmac-sha256/v1",
        "subjectKeyKeyId": "sha256:test-pseudonym-key-fingerprint",
        "subjectPartitionDigest": "sha256:" + _partition_digest({"subject-a", "subject-b"}),
        "commit": "deadbeef",
        "calibrationVersion": "calibration-v1",
        "measurementContract": MEASUREMENT_CONTRACT,
        "configurationDigest": "",
        "evaluator": evaluator,
        "threshold": 0.8,
        "landmarkThreshold": 0.2,
        "cohortThresholds": threshold_policy,
        "acceptance": {
            "maxFalseAcceptRate": 0.0,
            "maxFalseRejectRate": 0.0,
            "maxUnscorableRate": 0.0,
            "minimumGenuineCases": 1,
            "minimumImpostorCases": 1,
        },
        "acceptanceStatus": "PASS",
        "rows": rows,
        "metrics": {
            "caseCount": 10,
            "scorableCount": 10,
            "unscorableCount": 0,
            "genuineCount": 5,
            "impostorCount": 5,
            "scorableGenuineCount": 5,
            "scorableImpostorCount": 5,
            "falseRejectRate": 0.0,
            "falseAcceptRate": 0.0,
            "unscorableRate": 0.0,
        },
    }
    value["coverage"] = _coverage_report(
        {"coverageContract": coverage_contract}, value["rows"]
    )
    value["configurationDigest"] = hashlib.sha256(
        canonical_json(
            {
                "datasetVersion": value["datasetVersion"],
                "datasetSplit": value["datasetSplit"],
                "subjectKeyScheme": value["subjectKeyScheme"],
                "subjectKeyKeyId": value["subjectKeyKeyId"],
                "subjectPartitionDigest": value["subjectPartitionDigest"],
                "coverageContract": coverage_contract,
                "measurementContract": MEASUREMENT_CONTRACT,
                "evaluator": evaluator,
                "threshold": 0.8,
                "landmarkThreshold": 0.2,
                "cohortThresholds": threshold_policy,
            }
        ).encode("utf-8")
    ).hexdigest()
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


def test_verifies_a_held_out_test_report_with_the_same_runtime_contract(
    tmp_path: Path,
) -> None:
    report = _report()
    report["datasetSplit"] = "test"
    report["datasetVersion"] = "private-held-out-v1"
    report["configurationDigest"] = hashlib.sha256(
        canonical_json(
            {
                "datasetVersion": report["datasetVersion"],
                "datasetSplit": report["datasetSplit"],
                "subjectKeyScheme": report["subjectKeyScheme"],
                "subjectKeyKeyId": report["subjectKeyKeyId"],
                "subjectPartitionDigest": report["subjectPartitionDigest"],
                "coverageContract": report["coverage"]["contract"],
                "measurementContract": MEASUREMENT_CONTRACT,
                "evaluator": report["evaluator"],
                "threshold": 0.8,
                "landmarkThreshold": 0.2,
                "cohortThresholds": report["cohortThresholds"],
            }
        ).encode("utf-8")
    ).hexdigest()
    report["artifactDigest"] = benchmark_artifact_digest(report)

    result = load_and_verify_benchmark_report(
        _write(tmp_path, report),
        expected_split="test",
        expected_digest="sha256:" + report["artifactDigest"],
        expected_model_name="auraface",
        expected_model_version="model-v1",
        expected_model_digest="sha256:model",
        expected_preprocessing_version="align-v1",
        expected_threshold=0.8,
        expected_landmark_threshold=0.2,
    )

    assert result["datasetSplit"] == "test"
    assert result["datasetVersion"] == "private-held-out-v1"
    assert result["status"] == "PASS"


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
    report["acceptance"]["minimumGenuineCases"] = 6
    report["artifactDigest"] = benchmark_artifact_digest(report)

    with pytest.raises(
        RuntimeError, match="acceptance status does not match evidence"
    ):
        _verify(_write(tmp_path, report), report["artifactDigest"])


def test_replays_integer_json_thresholds_as_runtime_floats(tmp_path: Path) -> None:
    report = _report()
    report["threshold"] = 1
    report["landmarkThreshold"] = 1
    report["cohortThresholds"] = cohort_thresholds(1, 1)
    for row in report["rows"]:
        row["appliedThresholds"] = resolve_cohort_thresholds(
            report["cohortThresholds"],
            row["candidateGeometry"]["measuredCohorts"],
        )
    for row in report["rows"]:
        if row["expectedIdentityMatch"]:
            row["aggregateSimilarity"] = 1.0
            row["perReferenceSimilarity"] = [1.0] * 3
    report["configurationDigest"] = hashlib.sha256(
        canonical_json(
            {
                "datasetVersion": report["datasetVersion"],
                "datasetSplit": report["datasetSplit"],
                "subjectKeyScheme": report["subjectKeyScheme"],
                "subjectKeyKeyId": report["subjectKeyKeyId"],
                "subjectPartitionDigest": report["subjectPartitionDigest"],
                "coverageContract": report["coverage"]["contract"],
                "measurementContract": MEASUREMENT_CONTRACT,
                "evaluator": report["evaluator"],
                "threshold": 1.0,
                "landmarkThreshold": 1.0,
                "cohortThresholds": report["cohortThresholds"],
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


def test_rejects_forged_applied_cohort_thresholds(tmp_path: Path) -> None:
    report = _report()
    report["rows"][0]["appliedThresholds"]["similarityMin"] = 0.1
    report["artifactDigest"] = benchmark_artifact_digest(report)

    with pytest.raises(RuntimeError, match="applied cohort thresholds are invalid"):
        _verify(_write(tmp_path, report), report["artifactDigest"])


def test_rejects_forged_geometry_that_does_not_match_the_declared_scenario(
    tmp_path: Path,
) -> None:
    report = _report()
    report["rows"][0]["candidateGeometry"] = candidate_geometry(
        {
            **report["rows"][0]["scenario"],
            "yaw": "profile-right",
        }
    )
    report["artifactDigest"] = benchmark_artifact_digest(report)

    with pytest.raises(RuntimeError, match="does not match measurements"):
        _verify(_write(tmp_path, report), report["artifactDigest"])


def test_rejects_an_extra_row_outside_canonical_scenarios(tmp_path: Path) -> None:
    report = _report()
    extra = dict(report["rows"][0])
    extra["caseId"] = "extra-undeclared-scenario"
    extra["scenario"] = dict(extra["scenario"])
    extra["scenario"]["yaw"] = "invented-angle"
    report["rows"].append(extra)
    report["metrics"].update(
        {
            "caseCount": 11,
            "scorableCount": 11,
            "genuineCount": 6,
            "scorableGenuineCount": 6,
        }
    )
    report["coverage"] = _coverage_report(
        {"coverageContract": report["coverage"]["contract"]},
        report["rows"],
    )
    report["artifactDigest"] = benchmark_artifact_digest(report)

    with pytest.raises(RuntimeError, match="outside canonical cohorts"):
        _verify(_write(tmp_path, report), report["artifactDigest"])
