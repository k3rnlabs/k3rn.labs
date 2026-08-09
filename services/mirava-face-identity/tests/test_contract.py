from __future__ import annotations

from collections import deque
import hashlib
import json
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
from app.main import create_app


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
            (30.0, 40.0),
            (70.0, 40.0),
            (50.0, 62.0),
            (38.0 / mouth_scale, 82.0),
            (62.0 * mouth_scale, 82.0),
        ),
    )


def configure(
    monkeypatch,
    tmp_path: Path,
    *,
    acceptance_status: str = "PASS",
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
    minimum_genuine = 6 if acceptance_status == "FAIL" else 1
    coverage_contract = {
        "profile": "canonical-v1",
        "minimumGenuineCasesPerValue": 1,
        "minimumImpostorCasesPerValue": 1,
        "axes": {
            axis: list(values)
            for axis, values in CANONICAL_SCENARIO_COHORTS.items()
        },
    }
    rows = []
    for index in range(5):
        scenario = {
            axis: values[index % len(values)]
            for axis, values in CANONICAL_SCENARIO_COHORTS.items()
        }
        for expected in (True, False):
            score = 0.9 if expected else 0.1
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
            })
    report = {
        "schemaVersion": "mirava-face-identity-benchmark/v2",
        "datasetVersion": "private-test-v1",
        "datasetSplit": "calibration",
        "subjectKeyScheme": "hmac-sha256/v1",
        "subjectKeyKeyId": "sha256:test-pseudonym-key-fingerprint",
        "subjectPartitionDigest": "sha256:" + _partition_digest({"subject-a", "subject-b"}),
        "commit": "test-commit",
        "calibrationVersion": "calibration-v1",
        "configurationDigest": "",
        "evaluator": evaluator,
        "threshold": 0.8,
        "landmarkThreshold": 0.25,
        "acceptance": {
            "maxFalseAcceptRate": 0.0,
            "maxFalseRejectRate": 0.0,
            "maxUnscorableRate": 0.0,
            "minimumGenuineCases": minimum_genuine,
            "minimumImpostorCases": 1,
        },
        "acceptanceStatus": acceptance_status,
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
                "evaluator": evaluator,
                "threshold": 0.8,
                "landmarkThreshold": 0.25,
            }
        ).encode("utf-8")
    ).hexdigest()
    report["artifactDigest"] = benchmark_artifact_digest(report)
    report_path = tmp_path / "calibration-report.json"
    report_path.write_text(json.dumps(report), encoding="utf-8")
    monkeypatch.setenv("MIRAVA_FACE_CALIBRATION_REPORT", str(report_path))
    monkeypatch.setenv(
        "MIRAVA_FACE_CALIBRATION_DIGEST",
        "sha256:" + report["artifactDigest"],
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
    assert body["decision"] == "PASS"
    assert body["candidateFace"]["count"] == 1
    assert body["evaluator"]["calibrationVersion"] == "calibration-v1"
    assert body["evaluator"]["calibrationStatus"] == "PASS"
    assert "embedding" not in str(body).lower()


def test_service_refuses_missing_calibration_report(
    monkeypatch, tmp_path: Path
) -> None:
    configure(monkeypatch, tmp_path)
    monkeypatch.delenv("MIRAVA_FACE_CALIBRATION_REPORT")

    with pytest.raises(RuntimeError, match="MIRAVA_FACE_CALIBRATION_REPORT"):
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
            [face((1.0, 0.0), mouth_scale=2.0)],
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


def test_failed_calibration_can_never_issue_pass(
    monkeypatch, tmp_path: Path
) -> None:
    configure(monkeypatch, tmp_path, acceptance_status="FAIL")
    engine = FakeEngine(
        [
            [face((1.0, 0.0))],
            [face((1.0, 0.0))],
            [face((1.0, 0.0))],
            [face((1.0, 0.0))],
        ]
    )
    with TestClient(create_app(engine)) as client:
        response = request(client)

    assert response.status_code == 200
    assert response.json()["decision"] == "FAIL"
    assert response.json()["reasonCode"] == "CALIBRATION_NOT_ACCEPTED"
