from __future__ import annotations

import hashlib
import json
import math
from typing import Any


COHORT_THRESHOLD_SCHEMA = "mirava-face-cohort-thresholds/v1"
MEASURED_COHORT_VALUES = {
    "yaw": (
        "frontal",
        "three-quarter-left",
        "three-quarter-right",
        "profile-left",
        "profile-right",
    ),
    "pitch": ("down", "neutral", "up"),
    "roll": ("neutral", "tilted-left", "tilted-right"),
    "faceScale": ("close-portrait", "half-body", "full-body"),
}


def _valid_similarity(value: object) -> bool:
    return (
        isinstance(value, (int, float))
        and not isinstance(value, bool)
        and math.isfinite(value)
        and -1 <= value <= 1
    )


def _valid_residual(value: object) -> bool:
    return (
        isinstance(value, (int, float))
        and not isinstance(value, bool)
        and math.isfinite(value)
        and 0 < value <= 2
    )


def validate_cohort_thresholds(
    value: object,
    *,
    global_similarity: float,
    global_landmark_residual: float,
) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ValueError("cohortThresholds is required for thresholded runs")
    if set(value) != {"schemaVersion", "selectionStrategy", "global", "axes"}:
        raise ValueError("cohortThresholds fields are invalid")
    if value.get("schemaVersion") != COHORT_THRESHOLD_SCHEMA:
        raise ValueError("cohortThresholds schema is invalid")
    if value.get("selectionStrategy") != "strictest-applicable/v1":
        raise ValueError("cohortThresholds selection strategy is invalid")
    supplied_global = value.get("global")
    if (
        not isinstance(supplied_global, dict)
        or set(supplied_global) != {"similarityMin", "landmarkResidualMax"}
        or not _valid_similarity(supplied_global.get("similarityMin"))
        or not _valid_residual(supplied_global.get("landmarkResidualMax"))
        or float(supplied_global["similarityMin"]) != float(global_similarity)
        or float(supplied_global["landmarkResidualMax"])
        != float(global_landmark_residual)
    ):
        raise ValueError("cohortThresholds global thresholds do not match runtime")
    axes = value.get("axes")
    if not isinstance(axes, dict) or set(axes) != set(MEASURED_COHORT_VALUES):
        raise ValueError("cohortThresholds must declare every measured axis")
    normalized_axes: dict[str, dict[str, dict[str, float]]] = {}
    for axis, expected_values in MEASURED_COHORT_VALUES.items():
        entries = axes.get(axis)
        if not isinstance(entries, dict) or set(entries) != set(expected_values):
            raise ValueError(f"cohortThresholds.axes.{axis} is incomplete")
        normalized_entries: dict[str, dict[str, float]] = {}
        for cohort in expected_values:
            thresholds = entries.get(cohort)
            if (
                not isinstance(thresholds, dict)
                or set(thresholds) != {"similarityMin", "landmarkResidualMax"}
                or not _valid_similarity(thresholds.get("similarityMin"))
                or not _valid_residual(thresholds.get("landmarkResidualMax"))
            ):
                raise ValueError(
                    f"cohortThresholds.axes.{axis}.{cohort} is invalid"
                )
            normalized_entries[cohort] = {
                "similarityMin": float(thresholds["similarityMin"]),
                "landmarkResidualMax": float(thresholds["landmarkResidualMax"]),
            }
        normalized_axes[axis] = normalized_entries
    return {
        "schemaVersion": COHORT_THRESHOLD_SCHEMA,
        "selectionStrategy": "strictest-applicable/v1",
        "global": {
            "similarityMin": float(global_similarity),
            "landmarkResidualMax": float(global_landmark_residual),
        },
        "axes": normalized_axes,
    }


def resolve_cohort_thresholds(
    policy: dict[str, Any],
    cohorts: dict[str, str],
) -> dict[str, Any]:
    selected = []
    for axis in MEASURED_COHORT_VALUES:
        cohort = cohorts.get(axis)
        if cohort not in MEASURED_COHORT_VALUES[axis]:
            raise ValueError("Measured cohort is outside the threshold policy")
        selected.append(policy["axes"][axis][cohort])
    global_thresholds = policy["global"]
    return {
        "strategy": policy["selectionStrategy"],
        "similarityMin": max(
            float(global_thresholds["similarityMin"]),
            *(float(item["similarityMin"]) for item in selected),
        ),
        "landmarkResidualMax": min(
            float(global_thresholds["landmarkResidualMax"]),
            *(float(item["landmarkResidualMax"]) for item in selected),
        ),
        "cohorts": {axis: cohorts[axis] for axis in MEASURED_COHORT_VALUES},
    }


def cohort_thresholds_digest(policy: dict[str, Any]) -> str:
    canonical = json.dumps(
        policy,
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    )
    return "sha256:" + hashlib.sha256(canonical.encode("utf-8")).hexdigest()
