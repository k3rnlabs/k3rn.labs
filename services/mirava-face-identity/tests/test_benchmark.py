from __future__ import annotations

from collections import deque

import pytest

from app.benchmark import (
    BENCHMARK_SCHEMA,
    CANONICAL_SCENARIO_COHORTS,
    _canonical_json,
    _coverage_report,
    _partition_digest,
    run_benchmark,
)
from app.engine import FaceObservation
from app.face_geometry import MEASUREMENT_CONTRACT
from app.cohort_thresholds import MEASURED_COHORT_VALUES


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


def face(embedding: tuple[float, ...]) -> FaceObservation:
    return FaceObservation(
        confidence=0.99,
        box=(10.0, 20.0, 110.0, 140.0),
        embedding=embedding,
        landmarks=(
            (87.2340425532, 87.2340425532),
            (112.7659574468, 87.2340425532),
            (100.0, 100.0),
            (89.5833333333, 112.5),
            (110.4166666667, 112.5),
        ),
        image_size=(200, 200),
    )


def case(case_id: str, expected: bool) -> dict:
    return {
        "caseId": case_id,
        "candidateSubjectKey": (
            "subject-pseudonym" if expected else "impostor-pseudonym"
        ),
        "referenceSubjectKey": "subject-pseudonym",
        "expectedIdentityMatch": expected,
        "candidatePath": f"{case_id}-candidate",
        "referencePaths": ["front", "angle", "profile"],
        "scenario": {
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
        },
    }


def spec() -> dict:
    coverage_axes = {
        key: [value]
        for key, value in case("coverage", True)["scenario"].items()
    }
    cases = [
        case("genuine", True),
        case("impostor", False),
    ]
    subjects = {
        item[field]
        for item in cases
        for field in ("candidateSubjectKey", "referenceSubjectKey")
    }
    return {
        "schemaVersion": BENCHMARK_SCHEMA,
        "datasetVersion": "private-dataset-v1",
        "datasetSplit": "calibration",
        "subjectKeyScheme": "hmac-sha256/v1",
        "subjectKeyKeyId": "sha256:test-pseudonym-key-fingerprint",
        "subjectPartitionDigest": "sha256:" + _partition_digest(subjects),
        "commit": "deadbeef",
        "coverageContract": {
            "profile": "diagnostic-custom-v1",
            "minimumGenuineCasesPerValue": 1,
            "minimumImpostorCasesPerValue": 1,
            "axes": coverage_axes,
        },
        "measurementContract": MEASUREMENT_CONTRACT,
        "threshold": 0.8,
        "landmarkThreshold": 0.25,
        "cohortThresholds": cohort_thresholds(0.8, 0.25),
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
        "cases": cases,
    }


def refresh_partition(value: dict) -> None:
    value["subjectPartitionDigest"] = "sha256:" + _partition_digest(
        {
            item[field]
            for item in value["cases"]
            for field in ("candidateSubjectKey", "referenceSubjectKey")
        }
    )


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
    assert report["acceptanceStatus"] == "FAIL"
    assert report["coverage"]["status"] == "PASS"
    assert len(report["artifactDigest"]) == 64
    assert "embedding" not in str(report).lower()
    assert "candidatePath" not in str(report)


def test_benchmark_applies_the_strictest_measured_cohort_threshold() -> None:
    value = spec()
    value["cohortThresholds"]["axes"]["yaw"]["frontal"][
        "similarityMin"
    ] = 1.0
    report = run_benchmark(
        value,
        FakeEngine(
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
        ),
        read_bytes=lambda path: path.encode("utf-8"),
    )

    assert report["rows"][0]["decision"] == "FAIL"
    assert report["rows"][0]["appliedThresholds"]["similarityMin"] == 1.0
    assert report["metrics"]["falseRejectRate"] == 1.0


def test_coverage_uses_measured_geometry_instead_of_declared_boundary_labels() -> None:
    value = spec()
    value["coverageContract"]["axes"]["yaw"] = [
        "profile-left",
        "three-quarter-left",
    ]
    row = {
        "expectedIdentityMatch": True,
        "status": "UNSCORABLE",
        "reasonCode": "REFERENCE_FACE_INVALID",
        "scenario": case("boundary", True)["scenario"],
        "candidateGeometry": {
            "measuredCohorts": {
                "yaw": "three-quarter-left",
                "pitch": "neutral",
                "roll": "neutral",
                "faceScale": "close-portrait",
            }
        },
    }
    row["scenario"]["yaw"] = "profile-left"
    coverage = _coverage_report(value, [row])

    assert coverage["axes"]["yaw"]["profile-left"]["scorableGenuineCount"] == 0
    assert coverage["axes"]["yaw"]["profile-left"]["genuineCount"] == 0
    assert coverage["axes"]["yaw"]["three-quarter-left"]["genuineCount"] == 1


def test_invalid_reference_row_preserves_measured_candidate_geometry() -> None:
    value = spec()
    value["cases"] = [case("invalid-reference", True)]
    refresh_partition(value)
    report = run_benchmark(
        value,
        FakeEngine(
            [
                [face((1.0, 0.0))],
                [],
            ]
        ),
        read_bytes=lambda path: path.encode("utf-8"),
    )

    row = report["rows"][0]
    assert row["reasonCode"] == "REFERENCE_FACE_INVALID"
    assert row["candidateGeometry"]["measuredCohorts"]["yaw"] == "frontal"


def test_benchmark_normalizes_integer_thresholds_for_runtime_replay() -> None:
    value = spec()
    value["threshold"] = 1
    value["landmarkThreshold"] = 1
    value["cohortThresholds"] = cohort_thresholds(1, 1)
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
    refresh_partition(value)
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
    refresh_partition(value)
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


def test_benchmark_marks_declared_pose_that_contradicts_measurement_unscorable() -> None:
    value = spec()
    value["cases"] = [case("wrong-pose", True)]
    value["cases"][0]["scenario"]["yaw"] = "profile-right"
    refresh_partition(value)
    report = run_benchmark(
        value,
        FakeEngine([[face((1.0, 0.0))]]),
        read_bytes=lambda path: path.encode("utf-8"),
    )

    assert report["rows"][0]["status"] == "UNSCORABLE"
    assert report["rows"][0]["reasonCode"] == "SCENARIO_MEASUREMENT_MISMATCH"
    assert report["rows"][0]["candidateGeometry"]["measuredCohorts"]["yaw"] == "frontal"


def test_benchmark_rejects_a_mutable_measurement_contract() -> None:
    value = spec()
    value["measurementContract"] = dict(MEASUREMENT_CONTRACT)
    value["measurementContract"]["maxNormalizedReprojectionError"] = 1.0

    with pytest.raises(ValueError, match="canonical contract"):
        run_benchmark(value, FakeEngine([]))


def test_benchmark_fails_when_a_declared_pose_cohort_is_missing() -> None:
    value = spec()
    value["coverageContract"]["axes"]["yaw"].append("profile")
    report = run_benchmark(
        value,
        FakeEngine(
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
        ),
        read_bytes=lambda path: path.encode("utf-8"),
    )

    assert report["coverage"]["status"] == "FAIL"
    assert {"axis": "yaw", "value": "profile"} in report["coverage"]["missing"]
    assert report["acceptanceStatus"] == "FAIL"


def test_benchmark_rejects_an_incomplete_canonical_matrix() -> None:
    value = spec()
    value["coverageContract"]["profile"] = "canonical-v1"

    with pytest.raises(ValueError, match="canonical cohorts are incomplete"):
        run_benchmark(value, FakeEngine([]))


def test_benchmark_rejects_values_outside_the_canonical_taxonomy() -> None:
    value = spec()
    value["coverageContract"] = {
        "profile": "canonical-v1",
        "minimumGenuineCasesPerValue": 1,
        "minimumImpostorCasesPerValue": 1,
        "axes": {
            axis: list(values)
            for axis, values in CANONICAL_SCENARIO_COHORTS.items()
        },
    }
    value["cases"][0]["scenario"]["yaw"] = "invented-angle"

    with pytest.raises(ValueError, match="outside canonical cohorts"):
        run_benchmark(value, FakeEngine([]))


def test_benchmark_rejects_a_forged_subject_partition_digest() -> None:
    value = spec()
    value["subjectPartitionDigest"] = "sha256:" + "0" * 64

    with pytest.raises(ValueError, match="subjectPartitionDigest"):
        run_benchmark(value, FakeEngine([]))


def test_benchmark_rejects_an_impostor_label_for_the_same_subject() -> None:
    value = spec()
    value["cases"][1]["candidateSubjectKey"] = value["cases"][1][
        "referenceSubjectKey"
    ]
    refresh_partition(value)

    with pytest.raises(ValueError, match="identity label contradicts"):
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
