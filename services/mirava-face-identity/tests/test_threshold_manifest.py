from __future__ import annotations

from copy import deepcopy
from hashlib import sha256

import pytest

from app.benchmark import BENCHMARK_SCHEMA, _partition_digest
from app.calibration_report import benchmark_artifact_digest
from app.cohort_thresholds import MEASURED_COHORT_VALUES
from app.face_geometry import MEASUREMENT_CONTRACT
from app.identity_scoring import identity_scoring_contract
from app.threshold_calibration import calibration_proposal_digest
from app.threshold_manifest import build_thresholded_manifest


def policy() -> dict:
    return {
        "schemaVersion": "mirava-face-cohort-thresholds/v1",
        "selectionStrategy": "strictest-applicable/v1",
        "global": {"similarityMin": 0.8, "landmarkResidualMax": 0.2},
        "axes": {
            axis: {
                cohort: {"similarityMin": 0.8, "landmarkResidualMax": 0.2}
                for cohort in values
            }
            for axis, values in MEASURED_COHORT_VALUES.items()
        },
    }


def raw_manifest() -> dict:
    scenario = {
        "yaw": "frontal",
        "pitch": "neutral",
        "roll": "neutral",
        "expression": "neutral",
        "gaze": "camera",
        "faceScale": "close-portrait",
        "light": "soft-frontal",
        "occlusion": "none",
        "styling": "natural",
        "context": "studio",
    }
    cases = [
        {
            "caseId": "genuine",
            "candidateSubjectKey": "subject-a",
            "referenceSubjectKey": "subject-a",
            "expectedIdentityMatch": True,
            "candidatePath": "private-genuine.png",
            "referencePaths": [
                "private-front.png",
                "private-angle.png",
                "private-profile.png",
            ],
            "scenario": scenario,
        },
        {
            "caseId": "impostor",
            "candidateSubjectKey": "subject-b",
            "referenceSubjectKey": "subject-a",
            "expectedIdentityMatch": False,
            "candidatePath": "private-impostor.png",
            "referencePaths": [
                "private-front.png",
                "private-angle.png",
                "private-profile.png",
            ],
            "scenario": scenario,
        },
    ]
    return {
        "schemaVersion": BENCHMARK_SCHEMA,
        "datasetVersion": "private-consented-calibration-v1",
        "datasetSplit": "calibration",
        "subjectKeyScheme": "hmac-sha256/v1",
        "subjectKeyKeyId": "sha256:test-pseudonym-key-fingerprint",
        "subjectPartitionDigest": "sha256:"
        + _partition_digest({"subject-a", "subject-b"}),
        "commit": "deadbeef",
        "coverageContract": {
            "profile": "diagnostic-custom-v1",
            "minimumGenuineCasesPerValue": 1,
            "minimumImpostorCasesPerValue": 1,
            "axes": {key: [value] for key, value in scenario.items()},
        },
        "measurementContract": MEASUREMENT_CONTRACT,
        "identityScoringContract": identity_scoring_contract(),
        "threshold": None,
        "landmarkThreshold": None,
        "cohortThresholds": None,
        "thresholdProvenance": None,
        "calibrationVersion": None,
        "acceptance": None,
        "evaluator": {
            "name": "auraface",
            "version": "model-v1",
            "weightsDigest": "sha256:model",
            "preprocessingVersion": "align-v1",
        },
        "cases": cases,
    }


def proposal(source_digest: str = "sha256:" + "a" * 64) -> dict:
    value = {
        "schemaVersion": "mirava-face-threshold-calibration/v1",
        "calibrationVersion": "consented-cohorts-v1",
        "source": {
            "benchmarkArtifactDigest": source_digest,
            "datasetVersion": "private-consented-calibration-v1",
            "datasetSplit": "calibration",
        },
        "requirements": {
            "maxFalseAcceptRate": 0.01,
            "maxFalseRejectRate": 0.05,
            "maxUnscorableRate": 0.01,
            "minimumGenuineCases": 10,
            "minimumImpostorCases": 10,
        },
        "cohortThresholds": policy(),
        "effectiveMetrics": {},
    }
    value["artifactDigest"] = calibration_proposal_digest(value)
    return value


def source_report(manifest: dict) -> dict:
    rows = []
    for case in manifest["cases"]:
        rows.append(
            {
                "caseId": case["caseId"],
                "candidateSubjectKey": case["candidateSubjectKey"],
                "referenceSubjectKey": case["referenceSubjectKey"],
                "expectedIdentityMatch": case["expectedIdentityMatch"],
                "scenario": case["scenario"],
                "candidateContentSha256": sha256(
                    case["candidatePath"].encode()
                ).hexdigest(),
                "referenceContentSha256": [
                    sha256(path.encode()).hexdigest()
                    for path in case["referencePaths"]
                ],
                "status": "SCORABLE",
            }
        )

    value = {
        "schemaVersion": BENCHMARK_SCHEMA,
        "datasetVersion": manifest["datasetVersion"],
        "datasetSplit": manifest["datasetSplit"],
        "subjectKeyScheme": manifest["subjectKeyScheme"],
        "subjectKeyKeyId": manifest["subjectKeyKeyId"],
        "subjectPartitionDigest": manifest["subjectPartitionDigest"],
        "commit": manifest["commit"],
        "measurementContract": manifest["measurementContract"],
        "identityScoringContract": manifest["identityScoringContract"],
        "evaluator": manifest["evaluator"],
        "threshold": None,
        "landmarkThreshold": None,
        "cohortThresholds": None,
        "thresholdProvenance": None,
        "coverage": {"contract": manifest["coverageContract"]},
        "rows": rows,
    }
    value["artifactDigest"] = benchmark_artifact_digest(value)
    return value


def bound_inputs() -> tuple[dict, dict, dict]:
    manifest = raw_manifest()
    report = source_report(manifest)
    candidate = proposal("sha256:" + report["artifactDigest"])
    return manifest, candidate, report


def acceptance() -> dict:
    return {
        "maxFalseAcceptRate": 0.01,
        "maxFalseRejectRate": 0.05,
        "maxUnscorableRate": 0.01,
        "minimumGenuineCases": 10,
        "minimumImpostorCases": 10,
    }


def test_builds_a_thresholded_manifest_without_manual_policy_copying() -> None:
    manifest, candidate, report = bound_inputs()
    output = build_thresholded_manifest(
        manifest,
        candidate,
        source_report=report,
        expected_proposal_digest="sha256:" + candidate["artifactDigest"],
        acceptance=acceptance(),
        read_bytes=lambda path: path.encode(),
    )

    assert output["threshold"] == 0.8
    assert output["cohortThresholds"] == candidate["cohortThresholds"]
    assert output["thresholdProvenance"] == {
        "schemaVersion": "mirava-face-threshold-provenance/v1",
        "proposalArtifactDigest": "sha256:" + candidate["artifactDigest"],
        "sourceBenchmarkArtifactDigest": candidate["source"]["benchmarkArtifactDigest"],
    }


def test_refuses_an_unpinned_or_tampered_proposal() -> None:
    manifest, candidate, report = bound_inputs()
    candidate["requirements"]["minimumGenuineCases"] = 9

    with pytest.raises(ValueError, match="artifact digest"):
        build_thresholded_manifest(
            manifest,
            candidate,
            source_report=report,
            expected_proposal_digest="sha256:" + candidate["artifactDigest"],
            acceptance=acceptance(),
            read_bytes=lambda path: path.encode(),
        )


def test_refuses_an_acceptance_contract_weaker_than_the_proposal() -> None:
    manifest, candidate, report = bound_inputs()
    weaker = deepcopy(acceptance())
    weaker["maxFalseAcceptRate"] = 0.02

    with pytest.raises(ValueError, match="may not weaken"):
        build_thresholded_manifest(
            manifest,
            candidate,
            source_report=report,
            expected_proposal_digest="sha256:" + candidate["artifactDigest"],
            acceptance=weaker,
            read_bytes=lambda path: path.encode(),
        )


def test_refuses_a_weaker_unscorable_tolerance_than_the_proposal() -> None:
    manifest, candidate, report = bound_inputs()
    weaker = deepcopy(acceptance())
    weaker["maxUnscorableRate"] = 0.02

    with pytest.raises(ValueError, match="may not weaken"):
        build_thresholded_manifest(
            manifest,
            candidate,
            source_report=report,
            expected_proposal_digest="sha256:" + candidate["artifactDigest"],
            acceptance=weaker,
            read_bytes=lambda path: path.encode(),
        )


def test_refuses_a_manifest_that_already_has_thresholds() -> None:
    manifest, candidate, report = bound_inputs()
    manifest["threshold"] = 0.8

    with pytest.raises(ValueError, match="unthresholded manifest"):
        build_thresholded_manifest(
            manifest,
            candidate,
            source_report=report,
            expected_proposal_digest="sha256:" + candidate["artifactDigest"],
            acceptance=acceptance(),
            read_bytes=lambda path: path.encode(),
        )


def test_refuses_a_manifest_whose_content_differs_from_the_source_report() -> None:
    manifest, candidate, report = bound_inputs()

    def read_bytes(path: str) -> bytes:
        if path == "private-genuine.png":
            return b"changed-content"
        return path.encode()

    with pytest.raises(ValueError, match="candidate content"):
        build_thresholded_manifest(
            manifest,
            candidate,
            source_report=report,
            expected_proposal_digest="sha256:" + candidate["artifactDigest"],
            acceptance=acceptance(),
            read_bytes=read_bytes,
        )
