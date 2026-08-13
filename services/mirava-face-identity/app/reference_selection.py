from __future__ import annotations

from dataclasses import dataclass
import math

from .face_geometry import (
    FaceGeometry,
    measured_cohorts,
)


REFERENCE_SELECTION_STRATEGY = (
    "pose-compatible-cohort/v1"
)


@dataclass(frozen=True)
class ReferenceSelection:
    strategy: str
    selected_indices: tuple[int, ...]
    angular_distances: tuple[float, ...]
    candidate_cohorts: dict[str, str]
    reference_cohorts: tuple[dict[str, str], ...]


def _angular_distance(
    candidate: FaceGeometry,
    reference: FaceGeometry,
) -> float:
    return math.sqrt(
        (candidate.yaw - reference.yaw) ** 2
        + (candidate.pitch - reference.pitch) ** 2
        + (candidate.roll - reference.roll) ** 2
    )


def select_pose_compatible_references(
    candidate: FaceGeometry,
    references: list[FaceGeometry]
    | tuple[FaceGeometry, ...],
) -> ReferenceSelection:
    if not references:
        raise ValueError(
            "At least one reference geometry is required"
        )

    candidate_cohorts = measured_cohorts(candidate)

    reference_cohorts = tuple(
        measured_cohorts(reference)
        for reference in references
    )

    distances = tuple(
        _angular_distance(
            candidate,
            reference,
        )
        for reference in references
    )

    all_indices = list(
        range(len(references))
    )

    same_yaw = [
        index
        for index in all_indices
        if reference_cohorts[index]["yaw"]
        == candidate_cohorts["yaw"]
    ]

    if not same_yaw:
        minimum = min(distances)

        selected = tuple(
            index
            for index, distance in enumerate(distances)
            if math.isclose(
                distance,
                minimum,
                rel_tol=0.0,
                abs_tol=1e-12,
            )
        )

        return ReferenceSelection(
            strategy=REFERENCE_SELECTION_STRATEGY,
            selected_indices=selected,
            angular_distances=distances,
            candidate_cohorts=candidate_cohorts,
            reference_cohorts=reference_cohorts,
        )

    pool = same_yaw

    same_pitch = [
        index
        for index in pool
        if reference_cohorts[index]["pitch"]
        == candidate_cohorts["pitch"]
    ]

    if same_pitch:
        pool = same_pitch

    same_roll = [
        index
        for index in pool
        if reference_cohorts[index]["roll"]
        == candidate_cohorts["roll"]
    ]

    if same_roll:
        pool = same_roll

    return ReferenceSelection(
        strategy=REFERENCE_SELECTION_STRATEGY,
        selected_indices=tuple(pool),
        angular_distances=distances,
        candidate_cohorts=candidate_cohorts,
        reference_cohorts=reference_cohorts,
    )
