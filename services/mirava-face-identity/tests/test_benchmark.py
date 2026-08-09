from __future__ import annotations

from collections import deque

import pytest

from app.benchmark import BENCHMARK_SCHEMA, run_benchmark
from app.engine import FaceObservation


class FakeEngine:
    def __init__(self, observations: list[list[FaceObservation]]) -> None:
        self._observations = deque(observations)

    def observe(self, encoded_image: bytes) -> list[FaceObservation]:
        assert encoded_image
        return self._observations.popleft()


def face(embedding: tuple[float, ...]) -> FaceObservation:
    return FaceObservation(
        confidence=0.99,
        box=(10.0, 20.0, 110.0, 140.0),
        embedding=embedding,
        landmarks=(
            (30.0, 40.0),
            (70.0, 40.0),
            (50.0, 62.0),
            (38.0, 82.0),
            (62.0, 82.0),
        ),
    )


def case(case_id: str, expected: bool) -> dict:
    return {
        "caseId": case_id,
        "subjectKey": "subject-pseudonym",
        "expectedIdentityMatch": expected,
        "candidatePath": f"{case_id}-candidate",
        "referencePaths": ["front", "angle", "profile"],
        "scenario": {
            "yaw": "frontal",
            "pitch": "neutral",
            "roll": "neutral",
            "expression": "neutral",
            "gaze": "camera",
            "faceScale": "portrait",
            "light": "soft-frontal",
            "occlusion": "none",
            "styling": "natural",
            "context": "studio",
        },
    }


def spec() -> dict:
    return {
        "schemaVersion": BENCHMARK_SCHEMA,
        "datasetVersion": "private-dataset-v1",
        "commit": "deadbeef",
        "threshold": 0.8,
        "landmarkThreshold": 0.25,
        "evaluator": {
            "name": "fake",
            "version": "1",
            "weightsDigest": "sha256:test",
            "preprocessingVersion": "test-v1",
        },
        "cases": [
            case("genuine", True),
            case("impostor", False),
        ],
    }


def test_benchmark_reports_genuine_and_impostor_metrics_without_embeddings() -> None:
    engine = FakeEngine(
        [
            [face((1.0, 0.0))],
            [face((1.0, 0.0))],
            [face((0.9, 0.1))],
            [face((0.8, 0.2))],
            [face((0.0, 1.0))],
            [face((1.0, 0.0))],
            [face((0.9, 0.1))],
            [face((0.8, 0.2))],
        ]
    )
    report = run_benchmark(
        spec(),
        engine,
        read_bytes=lambda path: path.encode("utf-8"),
    )

    assert report["metrics"]["falseRejectRate"] == 0
    assert report["metrics"]["falseAcceptRate"] == 0
    assert len(report["artifactDigest"]) == 64
    assert "embedding" not in str(report).lower()
    assert "candidatePath" not in str(report)


def test_benchmark_keeps_unscorable_rows_in_the_denominator() -> None:
    value = spec()
    value["cases"] = [case("missing-face", True)]
    report = run_benchmark(
        value,
        FakeEngine([[]]),
        read_bytes=lambda path: path.encode("utf-8"),
    )

    assert report["metrics"]["caseCount"] == 1
    assert report["metrics"]["unscorableCount"] == 1
    assert report["rows"][0]["decision"] == "UNSCORABLE"


def test_benchmark_requires_every_scenario_axis() -> None:
    value = spec()
    del value["cases"][0]["scenario"]["light"]

    with pytest.raises(ValueError, match="every scenario axis"):
        run_benchmark(value, FakeEngine([]))
