from __future__ import annotations

from collections import deque

import pytest

from app.benchmark import BENCHMARK_SCHEMA, _canonical_json, run_benchmark
from app.engine import FaceObservation


class FakeEngine:
    def __init__(self, observations: list[list[FaceObservation]]) -> None:
        self._observations = deque(observations)

    def observe(self, encoded_image: bytes) -> list[FaceObservation]:
        assert encoded_image
        return self._observations.popleft()


def canonical_report_json(report: dict) -> str:
    return _canonical_json(
        {
            "threshold": report["threshold"],
            "landmarkThreshold": report["landmarkThreshold"],
        }
    )


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
        "calibrationVersion": "calibration-v1",
        "acceptance": {
            "maxFalseAcceptRate": 0.0,
            "maxFalseRejectRate": 0.0,
            "maxUnscorableRate": 0.0,
            "minimumGenuineCases": 1,
            "minimumImpostorCases": 1,
        },
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
    assert report["acceptanceStatus"] == "PASS"
    assert len(report["artifactDigest"]) == 64
    assert "embedding" not in str(report).lower()
    assert "candidatePath" not in str(report)


def test_benchmark_normalizes_integer_thresholds_for_runtime_replay() -> None:
    value = spec()
    value["threshold"] = 1
    value["landmarkThreshold"] = 1
    report = run_benchmark(
        value,
        FakeEngine(
            [
                [face((1.0, 0.0))],
                [face((1.0, 0.0))],
                [face((1.0, 0.0))],
                [face((1.0, 0.0))],
                [face((0.0, 1.0))],
                [face((1.0, 0.0))],
                [face((1.0, 0.0))],
                [face((1.0, 0.0))],
            ]
        ),
        read_bytes=lambda path: path.encode("utf-8"),
    )

    assert report["threshold"] == 1.0
    assert report["landmarkThreshold"] == 1.0
    assert '"threshold":1.0' in canonical_report_json(report)


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
    assert report["metrics"]["genuineCount"] == 1
    assert report["metrics"]["scorableGenuineCount"] == 0
    assert report["metrics"]["falseRejectRate"] == 1
    assert report["acceptanceStatus"] == "FAIL"
    assert report["rows"][0]["decision"] == "UNSCORABLE"


def test_benchmark_counts_unscorable_genuine_delivery_as_a_rejection() -> None:
    value = spec()
    value["cases"] = [
        case("genuine-pass", True),
        case("genuine-unscorable", True),
    ]
    report = run_benchmark(
        value,
        FakeEngine(
            [
                [face((1.0, 0.0))],
                [face((1.0, 0.0))],
                [face((0.9, 0.1))],
                [face((0.8, 0.2))],
                [],
            ]
        ),
        read_bytes=lambda path: path.encode("utf-8"),
    )

    assert report["metrics"]["genuineCount"] == 2
    assert report["metrics"]["scorableCount"] == 1
    assert report["metrics"]["unscorableCount"] == 1
    assert report["metrics"]["falseRejectRate"] == 0.5


def test_benchmark_rejects_an_all_unscorable_impostor_cohort() -> None:
    value = spec()
    value["acceptance"]["maxUnscorableRate"] = 0.5
    report = run_benchmark(
        value,
        FakeEngine(
            [
                [face((1.0, 0.0))],
                [face((1.0, 0.0))],
                [face((0.9, 0.1))],
                [face((0.8, 0.2))],
                [],
            ]
        ),
        read_bytes=lambda path: path.encode("utf-8"),
    )

    assert report["metrics"]["impostorCount"] == 1
    assert report["metrics"]["scorableImpostorCount"] == 0
    assert report["metrics"]["falseAcceptRate"] is None
    assert report["acceptanceStatus"] == "FAIL"


def test_benchmark_requires_every_scenario_axis() -> None:
    value = spec()
    del value["cases"][0]["scenario"]["light"]

    with pytest.raises(ValueError, match="every scenario axis"):
        run_benchmark(value, FakeEngine([]))


def test_benchmark_rejects_non_string_scenario_evidence() -> None:
    value = spec()
    value["cases"][0]["scenario"]["yaw"] = 123

    with pytest.raises(ValueError, match="every scenario axis"):
        run_benchmark(value, FakeEngine([]))


@pytest.mark.parametrize(
    ("path", "value", "message"),
    [
        (("datasetVersion",), 1, "datasetVersion"),
        (("evaluator", "version"), 1, "evaluator.version"),
        (("cases", 0, "caseId"), 1, "caseId"),
        (("cases", 0, "referencePaths"), ["front", 2, "profile"], "references"),
    ],
)
def test_benchmark_rejects_non_string_replay_fields(
    path: tuple[str | int, ...], value: object, message: str
) -> None:
    benchmark = spec()
    target: object = benchmark
    for key in path[:-1]:
        target = target[key]  # type: ignore[index]
    target[path[-1]] = value  # type: ignore[index]

    with pytest.raises(ValueError, match=message):
        run_benchmark(benchmark, FakeEngine([]))


@pytest.mark.parametrize("value", [float("nan"), float("inf"), float("-inf")])
@pytest.mark.parametrize(
    "key",
    ["maxFalseAcceptRate", "maxFalseRejectRate", "maxUnscorableRate"],
)
def test_benchmark_rejects_non_finite_acceptance_rates(
    key: str, value: float
) -> None:
    benchmark = spec()
    benchmark["acceptance"][key] = value

    with pytest.raises(ValueError, match=f"acceptance.{key}"):
        run_benchmark(benchmark, FakeEngine([]))


@pytest.mark.parametrize(
    ("key", "value", "message"),
    [
        ("threshold", float("nan"), "threshold"),
        ("threshold", True, "threshold"),
        ("landmarkThreshold", float("inf"), "landmarkThreshold"),
        ("landmarkThreshold", True, "landmarkThreshold"),
    ],
)
def test_benchmark_rejects_invalid_runtime_thresholds(
    key: str, value: float | bool, message: str
) -> None:
    benchmark = spec()
    benchmark[key] = value

    with pytest.raises(ValueError, match=message):
        run_benchmark(benchmark, FakeEngine([]))
