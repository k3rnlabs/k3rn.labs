from __future__ import annotations

from collections import deque
import hashlib
import json
import os
from pathlib import Path

from fastapi.testclient import TestClient
import pytest

from app.calibration_report import benchmark_artifact_digest, canonical_json
from app.benchmark import (
    CANONICAL_SCENARIO_COHORTS,
    _coverage_report,
    _partition_digest,
)
from app.engine import FaceObservation
from app.face_geometry import MEASUREMENT_CONTRACT, geometry_payload, FaceGeometry
from app.cohort_thresholds import (
    MEASURED_COHORT_VALUES,
    resolve_cohort_thresholds,
)
from app.main import create_app
from app.split_isolation import (
    _hmac_key_id,
    _subject_key,
    verify_split_isolation,
)


PSEUDONYM_KEY = b"mirava-contract-pseudonym-key-32-bytes-minimum"


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
            roll={
                "neutral": 0.0,
                "tilted-left": -15.0,
                "tilted-right": 15.0,
            }[scenario["roll"]],
            face_area_ratio={
                "close-portrait": 0.1,
                "half-body": 0.04,
                "full-body": 0.01,
            }[scenario["faceScale"]],
            normalized_reprojection_error=0.01,
        )
    )


class FakeEngine:
    def __init__(self, observations: list[list[FaceObservation]]) -> None:
        self._observations = deque(observations)

    def observe(self, encoded_image: bytes) -> list[FaceObservation]:
        assert encoded_image == b"image"
        return self._observations.popleft()


def face(
    embedding: tuple[float, ...],
    mouth_scale: float = 1.0,
) -> FaceObservation:
    return FaceObservation(
        confidence=0.99,
        box=(10.0, 20.0, 110.0, 140.0),
        embedding=embedding,
        landmarks=(
            (87.2340425532, 87.2340425532),
            (112.7659574468, 87.2340425532),
            (100.0, 100.0),
            (89.5833333333 / mouth_scale, 112.5),
            (110.4166666667 * mouth_scale, 112.5),
        ),
        image_size=(200, 200),
    )


def configure(
    monkeypatch,
    tmp_path: Path,
    *,
    acceptance_status: str = "PASS",
    test_acceptance_status: str = "PASS",
    frontal_similarity_min: float = 0.8,
) -> None:
    monkeypatch.setenv("MIRAVA_FACE_GATE_THRESHOLD", "0.8")
    monkeypatch.setenv("MIRAVA_FACE_LANDMARK_RESIDUAL_MAX", "0.25")
    monkeypatch.setenv("MIRAVA_FACE_SERVICE_TOKEN", "secret")
    monkeypatch.setenv("MIRAVA_FACE_MODEL_VERSION", "1.0")
    monkeypatch.setenv("MIRAVA_FACE_MODEL_DIGEST", "sha256:test")
    monkeypatch.setenv(
        "MIRAVA_FACE_PREPROCESSING_VERSION", "mirava-auraface-align-v1"
    )
    evaluator = {
        "name": "auraface",
        "version": "1.0",
        "weightsDigest": "sha256:test",
        "preprocessingVersion": "mirava-auraface-align-v1",
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
    threshold_policy = cohort_thresholds(0.8, 0.25)
    threshold_policy["axes"]["yaw"]["frontal"]["similarityMin"] = (
        frontal_similarity_min
    )
    def build_report(
        split: str,
        subject_ids: list[str],
        status: str,
    ) -> dict:
        reference_key = _subject_key(PSEUDONYM_KEY, subject_ids[0])
        impostor_key = _subject_key(PSEUDONYM_KEY, subject_ids[1])
        rows = []
        for index in range(5):
            scenario = {
                axis: values[index % len(values)]
                for axis, values in CANONICAL_SCENARIO_COHORTS.items()
            }
            for expected in (True, False):
                score = 0.9 if expected else 0.1
                geometry = candidate_geometry(scenario)
                rows.append(
                    {
                        "caseId": f"{split}-{'genuine' if expected else 'impostor'}-{index}",
                        "candidateSubjectKey": (
                            reference_key if expected else impostor_key
                        ),
                        "referenceSubjectKey": reference_key,
                        "expectedIdentityMatch": expected,
                        "scenario": scenario,
                        "candidateContentSha256": ("a" if expected else "c") * 64,
                        "referenceContentSha256": [
                            ("b" if expected else "d") * 64
                        ] * 3,
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
                    }
                )
        report = {
            "schemaVersion": "mirava-face-identity-benchmark/v5",
            "datasetVersion": f"private-{split}-v1",
            "datasetSplit": split,
            "subjectKeyScheme": "hmac-sha256/v1",
            "subjectKeyKeyId": _hmac_key_id(PSEUDONYM_KEY),
            "subjectPartitionDigest": "sha256:"
            + _partition_digest({reference_key, impostor_key}),
            "commit": "test-commit",
            "calibrationVersion": "calibration-v1",
            "measurementContract": MEASUREMENT_CONTRACT,
            "configurationDigest": "",
            "evaluator": evaluator,
            "threshold": 0.8,
            "landmarkThreshold": 0.25,
            "cohortThresholds": threshold_policy,
            "thresholdProvenance": {
                "schemaVersion": "mirava-face-threshold-provenance/v1",
                "proposalArtifactDigest": "sha256:" + "a" * 64,
                "sourceBenchmarkArtifactDigest": "sha256:" + "b" * 64,
            },
            "acceptance": {
                "maxFalseAcceptRate": 0.0,
                "maxFalseRejectRate": 0.0,
                "maxUnscorableRate": 0.0,
                "minimumGenuineCases": 6 if status == "FAIL" else 1,
                "minimumImpostorCases": 1,
            },
            "acceptanceStatus": status,
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
        report["coverage"] = _coverage_report(
            {"coverageContract": coverage_contract}, report["rows"]
        )
        report["configurationDigest"] = hashlib.sha256(
            canonical_json(
                {
                    "datasetVersion": report["datasetVersion"],
                    "datasetSplit": report["datasetSplit"],
                    "subjectKeyScheme": report["subjectKeyScheme"],
                    "subjectKeyKeyId": report["subjectKeyKeyId"],
                    "subjectPartitionDigest": report["subjectPartitionDigest"],
                    "coverageContract": coverage_contract,
                    "measurementContract": MEASUREMENT_CONTRACT,
                    "evaluator": evaluator,
                    "threshold": 0.8,
                    "landmarkThreshold": 0.25,
                    "cohortThresholds": threshold_policy,
                    "thresholdProvenance": report["thresholdProvenance"],
                }
            ).encode("utf-8")
        ).hexdigest()
        report["artifactDigest"] = benchmark_artifact_digest(report)
        return report

    calibration_subjects = ["calibration-subject-a", "calibration-subject-b"]
    test_subjects = ["test-subject-a", "test-subject-b"]
    calibration_report = build_report(
        "calibration", calibration_subjects, acceptance_status
    )
    test_report = build_report("test", test_subjects, test_acceptance_status)
    calibration_path = tmp_path / "calibration-report.json"
    test_path = tmp_path / "test-report.json"
    calibration_path.write_text(json.dumps(calibration_report), encoding="utf-8")
    test_path.write_text(json.dumps(test_report), encoding="utf-8")
    isolation = verify_split_isolation(
        calibration_report,
        test_report,
        pseudonym_key=PSEUDONYM_KEY,
        calibration_subject_inventory={
            "datasetSplit": "calibration",
            "subjectIds": calibration_subjects,
        },
        test_subject_inventory={
            "datasetSplit": "test",
            "subjectIds": test_subjects,
        },
    )
    isolation_path = tmp_path / "split-isolation.json"
    isolation_path.write_text(json.dumps(isolation), encoding="utf-8")
    monkeypatch.setenv("MIRAVA_FACE_CALIBRATION_REPORT", str(calibration_path))
    monkeypatch.setenv(
        "MIRAVA_FACE_CALIBRATION_DIGEST",
        "sha256:" + calibration_report["artifactDigest"],
    )
    monkeypatch.setenv("MIRAVA_FACE_TEST_REPORT", str(test_path))
    monkeypatch.setenv(
        "MIRAVA_FACE_TEST_DIGEST",
        "sha256:" + test_report["artifactDigest"],
    )
    monkeypatch.setenv("MIRAVA_FACE_SPLIT_ISOLATION_REPORT", str(isolation_path))
    monkeypatch.setenv(
        "MIRAVA_FACE_SPLIT_ISOLATION_DIGEST",
        "sha256:" + isolation["artifactDigest"],
    )


def request(client: TestClient, token: str = "secret"):
    return client.post(
        "/v1/evaluate",
        headers={"Authorization": f"Bearer {token}"},
        data={
            "identityManifestVersion": "manifest-1",
            "requestId": "request-1",
        },
        files=[
            ("candidate", ("candidate.png", b"image", "image/png")),
            ("references", ("front.png", b"image", "image/png")),
            ("references", ("angle.png", b"image", "image/png")),
            ("references", ("profile.png", b"image", "image/png")),
        ],
    )


def test_calibrated_pass_returns_no_embedding(monkeypatch, tmp_path: Path) -> None:
    configure(monkeypatch, tmp_path)
    engine = FakeEngine(
        [
            [face((1.0, 0.0))],
            [face((1.0, 0.0))],
            [face((0.9, 0.1))],
            [face((0.8, 0.2))],
        ]
    )
    with TestClient(create_app(engine)) as client:
        response = request(client)

    assert response.status_code == 200
    body = response.json()
    assert body["schemaVersion"] == "mirava-face-identity-gate/v7"
    assert body["decision"] == "PASS"
    assert body["candidateFace"]["count"] == 1
    assert body["candidateFace"]["poseEstimatorVersion"] == "mirava-five-point-sqpnp-v1"
    assert body["candidateFace"]["measuredCohorts"]["yaw"] == "frontal"
    assert body["evaluator"]["calibrationVersion"] == "calibration-v1"
    assert body["evaluator"]["calibrationStatus"] == "PASS"
    assert body["evaluator"]["testStatus"] == "PASS"
    assert body["evaluator"]["splitIsolationStatus"] == "PASS"
    assert body["evaluator"]["cohortThresholdsDigest"].startswith("sha256:")
    assert body["evaluator"]["thresholdProposalDigest"].startswith("sha256:")
    assert "embedding" not in str(body).lower()


def test_runtime_applies_the_strictest_measured_cohort_threshold(
    monkeypatch,
    tmp_path: Path,
) -> None:
    configure(monkeypatch, tmp_path, frontal_similarity_min=0.85)
    engine = FakeEngine(
        [
            [face((1.0, 0.0))],
            [face((1.0, 0.0))],
            [face((0.9, 0.1))],
            [face((0.8, 0.2))],
        ]
    )
    with TestClient(create_app(engine)) as client:
        response = request(client)

    assert response.status_code == 200
    assert response.json()["threshold"] == 0.85
    assert response.json()["decision"] == "PASS"


def test_service_refuses_missing_calibration_report(
    monkeypatch, tmp_path: Path
) -> None:
    configure(monkeypatch, tmp_path)
    monkeypatch.delenv("MIRAVA_FACE_CALIBRATION_REPORT")

    with pytest.raises(RuntimeError, match="MIRAVA_FACE_CALIBRATION_REPORT"):
        with TestClient(create_app(FakeEngine([]))):
            pass


def test_service_refuses_missing_held_out_test_report(
    monkeypatch, tmp_path: Path
) -> None:
    configure(monkeypatch, tmp_path)
    monkeypatch.delenv("MIRAVA_FACE_TEST_REPORT")

    with pytest.raises(RuntimeError, match="MIRAVA_FACE_TEST_REPORT"):
        with TestClient(create_app(FakeEngine([]))):
            pass


def test_service_refuses_missing_split_isolation_evidence(
    monkeypatch, tmp_path: Path
) -> None:
    configure(monkeypatch, tmp_path)
    monkeypatch.delenv("MIRAVA_FACE_SPLIT_ISOLATION_REPORT")

    with pytest.raises(RuntimeError, match="MIRAVA_FACE_SPLIT_ISOLATION_REPORT"):
        with TestClient(create_app(FakeEngine([]))):
            pass


@pytest.mark.parametrize(
    ("name", "value"),
    [
        ("MIRAVA_FACE_GATE_THRESHOLD", "nan"),
        ("MIRAVA_FACE_GATE_THRESHOLD", "inf"),
        ("MIRAVA_FACE_LANDMARK_RESIDUAL_MAX", "nan"),
        ("MIRAVA_FACE_LANDMARK_RESIDUAL_MAX", "-inf"),
    ],
)
def test_service_refuses_non_finite_runtime_thresholds(
    monkeypatch, tmp_path: Path, name: str, value: str
) -> None:
    configure(monkeypatch, tmp_path)
    monkeypatch.setenv(name, value)

    with pytest.raises(RuntimeError, match="out of range"):
        with TestClient(create_app(FakeEngine([]))):
            pass


def test_landmark_drift_fails_even_when_embedding_passes(
    monkeypatch, tmp_path: Path
) -> None:
    configure(monkeypatch, tmp_path)
    engine = FakeEngine(
        [
            [face((1.0, 0.0), mouth_scale=1.2)],
            [face((1.0, 0.0))],
            [face((1.0, 0.0))],
            [face((1.0, 0.0))],
        ]
    )
    with TestClient(create_app(engine)) as client:
        response = request(client)

    assert response.status_code == 200
    assert response.json()["decision"] == "FAIL"
    assert response.json()["reasonCode"] == "LANDMARK_DRIFT"
    assert response.json()["aggregateSimilarity"] == 1.0


def test_multiple_candidate_faces_are_unscorable(
    monkeypatch, tmp_path: Path
) -> None:
    configure(monkeypatch, tmp_path)
    engine = FakeEngine([[face((1.0, 0.0)), face((0.0, 1.0))]])
    with TestClient(create_app(engine)) as client:
        response = request(client)

    assert response.status_code == 200
    assert response.json()["decision"] == "UNSCORABLE"
    assert response.json()["reasonCode"] == "CANDIDATE_MULTIPLE_FACES"


def test_invalid_token_is_rejected_before_inference(
    monkeypatch, tmp_path: Path
) -> None:
    configure(monkeypatch, tmp_path)
    engine = FakeEngine([])
    with TestClient(create_app(engine)) as client:
        response = request(client, token="wrong")

    assert response.status_code == 401


def test_service_refuses_a_failed_calibration_benchmark(
    monkeypatch, tmp_path: Path
) -> None:
    configure(monkeypatch, tmp_path, acceptance_status="FAIL")

    with pytest.raises(RuntimeError, match="Calibration benchmark is not accepted"):
        with TestClient(create_app(FakeEngine([]))):
            pass


def test_service_refuses_a_failed_held_out_test_benchmark(
    monkeypatch, tmp_path: Path
) -> None:
    configure(monkeypatch, tmp_path, test_acceptance_status="FAIL")

    with pytest.raises(RuntimeError, match="Held-out test benchmark is not accepted"):
        with TestClient(create_app(FakeEngine([]))):
            pass


def test_service_refuses_tampered_split_isolation_evidence(
    monkeypatch, tmp_path: Path
) -> None:
    configure(monkeypatch, tmp_path)
    isolation_path = Path(
        str(os.environ["MIRAVA_FACE_SPLIT_ISOLATION_REPORT"])
    )
    evidence = json.loads(isolation_path.read_text(encoding="utf-8"))
    evidence["testPartitionDigest"] = "sha256:" + "0" * 64
    isolation_path.write_text(json.dumps(evidence), encoding="utf-8")

    with pytest.raises(RuntimeError, match="artifact digest does not match"):
        with TestClient(create_app(FakeEngine([]))):
            pass
