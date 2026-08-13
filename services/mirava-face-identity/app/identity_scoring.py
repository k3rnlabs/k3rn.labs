from __future__ import annotations

from dataclasses import dataclass
from statistics import median

from .engine import (
    FaceObservation,
    cosine_similarity,
    landmark_shape_residual,
)
from .face_geometry import (
    POSE_ESTIMATOR_VERSION,
    FaceGeometry,
    estimate_face_geometry,
)
from .reference_selection import (
    REFERENCE_SELECTION_STRATEGY,
    select_pose_compatible_references,
)


IDENTITY_SCORING_SCHEMA = (
    "mirava-face-identity-scoring/v1"
)

IDENTITY_AGGREGATION_STRATEGY = (
    "median-selected-references/v1"
)

IDENTITY_REFERENCE_SCALE_POLICY = (
    "ignore-face-scale-for-selection/v1"
)


def identity_scoring_contract() -> dict[str, str]:
    return {
        "schemaVersion": IDENTITY_SCORING_SCHEMA,
        "referenceSelectionStrategy": (
            REFERENCE_SELECTION_STRATEGY
        ),
        "aggregationStrategy": (
            IDENTITY_AGGREGATION_STRATEGY
        ),
        "poseEstimatorVersion": (
            POSE_ESTIMATOR_VERSION
        ),
        "referenceScalePolicy": (
            IDENTITY_REFERENCE_SCALE_POLICY
        ),
    }


@dataclass(frozen=True)
class IdentityScore:
    selection_strategy: str
    selected_reference_indices: tuple[int, ...]
    candidate_geometry: FaceGeometry
    reference_geometries: tuple[FaceGeometry, ...]
    per_reference_similarity: tuple[float, ...]
    per_reference_landmark_residual: tuple[float, ...]
    aggregate_similarity: float
    aggregate_landmark_residual: float


def score_identity_pose_aware(
    candidate: FaceObservation,
    references: list[FaceObservation]
    | tuple[FaceObservation, ...],
) -> IdentityScore:
    if not references:
        raise ValueError(
            "At least one reference observation is required"
        )

    candidate_geometry = estimate_face_geometry(
        candidate
    )

    reference_geometries = tuple(
        estimate_face_geometry(reference)
        for reference in references
    )

    selection = select_pose_compatible_references(
        candidate_geometry,
        reference_geometries,
    )

    similarities = tuple(
        cosine_similarity(
            candidate.embedding,
            reference.embedding,
        )
        for reference in references
    )

    landmark_residuals = tuple(
        landmark_shape_residual(
            candidate,
            reference,
        )
        for reference in references
    )

    selected_similarities = [
        similarities[index]
        for index in selection.selected_indices
    ]

    selected_landmark_residuals = [
        landmark_residuals[index]
        for index in selection.selected_indices
    ]

    if not selected_similarities:
        raise RuntimeError(
            "Pose-aware reference selection returned no references"
        )

    return IdentityScore(
        selection_strategy=REFERENCE_SELECTION_STRATEGY,
        selected_reference_indices=(
            selection.selected_indices
        ),
        candidate_geometry=candidate_geometry,
        reference_geometries=reference_geometries,
        per_reference_similarity=similarities,
        per_reference_landmark_residual=(
            landmark_residuals
        ),
        aggregate_similarity=float(
            median(selected_similarities)
        ),
        aggregate_landmark_residual=float(
            median(selected_landmark_residuals)
        ),
    )
