from __future__ import annotations

from copy import deepcopy

import pytest

from app.benchmark import BENCHMARK_SCHEMA
from app.calibration_report import benchmark_artifact_digest
from app.face_geometry import MEASUREMENT_CONTRACT, FaceGeometry, geometry_payload
from app.identity_scoring import identity_scoring_contract
from app.threshold_calibration import (
    CALIBRATION_PROPOSAL_SCHEMA,
    calibration_proposal_digest,
    derive_cohort_threshold_policy,
)


def geometry(index: int) -> dict:
    return geometry_payload(
        FaceGeometry(
            yaw=(0.0, -25.0, 25.0, -60.0, 60.0)[index],
            pitch=(-20.0, 0.0, 20.0, -20.0, 0.0)[index],
            roll=(0.0, -15.0, 15.0, 0.0, -15.0)[index],
            face_area_ratio=(0.1, 0.04, 0.01, 0.1, 0.04)[index],
            normalized_reprojection_error=0.01,
        )
    )


def source_report() -> dict:
    rows = []
    for index in range(5):
        for genuine in (True, False):
            rows.append(
                {
                    "status": "SCORABLE",
                    "expectedIdentityMatch": genuine,
                    "aggregateSimilarity": 0.9 if genuine else 0.1,
                    "landmarkResidual": 0.1 if genuine else 0.2,
                    "candidateGeometry": geometry(index),
                }
            )
    report = {
        "schemaVersion": BENCHMARK_SCHEMA,
        "datasetVersion": "private-consented-calibration-v1",
        "datasetSplit": "calibration",
        "measurementContract": MEASUREMENT_CONTRACT,
        "identityScoringContract": identity_scoring_contract(),
        "threshold": None,
        "landmarkThreshold": None,
        "cohortThresholds": None,
        "rows": rows,
    }
    report["artifactDigest"] = benchmark_artifact_digest(report)
    return report


def derive(report: dict) -> dict:
    return derive_cohort_threshold_policy(
        report,
        calibration_version="consented-cohorts-v1",
        expected_source_digest="sha256:" + report["artifactDigest"],
        max_false_accept_rate=0.0,
        max_false_reject_rate=0.0,
        max_unscorable_rate=0.0,
        minimum_genuine_cases=1,
        minimum_impostor_cases=1,
    )


def test_derives_a_replayable_policy_from_an_unthresholded_calibration_report() -> None:
    report = source_report()
    proposal = derive(report)

    assert proposal["schemaVersion"] == CALIBRATION_PROPOSAL_SCHEMA
    assert proposal["calibrationVersion"] == "consented-cohorts-v1"
    assert proposal["source"]["benchmarkArtifactDigest"] == "sha256:" + report[
        "artifactDigest"
    ]
    assert proposal["cohortThresholds"]["global"] == {
        "similarityMin": 0.9,
        "landmarkResidualMax": 0.1,
    }
    assert proposal["effectiveMetrics"]["global"]["falseAcceptRate"] == 0.0
    assert proposal["effectiveMetrics"]["yaw:profile-right"]["falseRejectRate"] == 0.0
    assert "candidateSubjectKey" not in str(proposal)
    assert len(calibration_proposal_digest(proposal)) == 64


def test_refuses_noncanonical_identity_scoring_contract() -> None:
    report = source_report()
    report["identityScoringContract"] = {
        **identity_scoring_contract(),
        "aggregationStrategy": "tampered",
    }
    report["artifactDigest"] = benchmark_artifact_digest(report)

    with pytest.raises(
        ValueError,
        match="identity scoring contract",
    ):
        derive(report)


def test_refuses_a_thresholded_source_report() -> None:
    report = source_report()
    report["threshold"] = 0.8
    report["artifactDigest"] = benchmark_artifact_digest(report)

    with pytest.raises(ValueError, match="unthresholded"):
        derive(report)


def test_refuses_a_source_report_with_threshold_provenance() -> None:
    report = source_report()
    report["thresholdProvenance"] = {
        "schemaVersion": "mirava-face-threshold-provenance/v1"
    }
    report["artifactDigest"] = benchmark_artifact_digest(report)

    with pytest.raises(ValueError, match="unthresholded"):
        derive(report)


def test_refuses_when_a_measured_cohort_is_underpowered() -> None:
    report = source_report()
    report["rows"] = [
        row
        for row in report["rows"]
        if row["candidateGeometry"]["measuredCohorts"]["yaw"] != "profile-right"
    ]
    report["artifactDigest"] = benchmark_artifact_digest(report)

    with pytest.raises(ValueError, match="minimum genuine/impostor"):
        derive(report)


def test_refuses_a_tampered_source_artifact() -> None:
    report = deepcopy(source_report())
    report["rows"][0]["aggregateSimilarity"] = 0.2

    with pytest.raises(ValueError, match="artifact digest"):
        derive(report)


def test_requires_a_digest_pinned_outside_the_source_report() -> None:
    report = source_report()

    with pytest.raises(ValueError, match="Expected source digest"):
        derive_cohort_threshold_policy(
            report,
            calibration_version="consented-cohorts-v1",
            expected_source_digest="sha256:" + "0" * 64,
            max_false_accept_rate=0.0,
            max_false_reject_rate=0.0,
            max_unscorable_rate=0.0,
            minimum_genuine_cases=1,
            minimum_impostor_cases=1,
        )


def test_refuses_an_unscorable_genuine_case() -> None:
    report = source_report()
    report["rows"][0]["status"] = "UNSCORABLE"
    report["artifactDigest"] = benchmark_artifact_digest(report)

    with pytest.raises(ValueError, match="fully scorable"):
        derive(report)


def test_derives_a_runtime_valid_positive_residual_ceiling_for_exact_landmarks() -> None:
    report = source_report()
    for row in report["rows"]:
        if row["expectedIdentityMatch"]:
            row["landmarkResidual"] = 0.0
    report["artifactDigest"] = benchmark_artifact_digest(report)

    proposal = derive(report)

    assert proposal["cohortThresholds"]["global"]["landmarkResidualMax"] > 0
