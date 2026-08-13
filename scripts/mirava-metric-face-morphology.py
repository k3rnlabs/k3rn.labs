#!/usr/bin/env python3

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path
from statistics import median
from typing import Any

import numpy as np


SCHEMA_VERSION = "metric-face-morphology/v1"
ALIGNMENT_CONTRACT = "center-rms-scale-proper-kabsch/v1"

VERTEX_COUNT = 468
TRIANGLE_COUNT = 898
VERTEX_STRIDE = 5
INDEX_COUNT = TRIANGLE_COUNT * 3
UV_TOLERANCE = 1e-9

REGION_SOURCE_PACKAGE = "@mediapipe/tasks-vision"
REGION_SOURCE_VERSION = "1.0.1"
REGION_ALIGNMENT_POLICY = "single-global-468-alignment/v1"

FACE_OVAL = (
    10, 21, 54, 58, 67, 93, 103, 109, 127, 132, 136, 148,
    149, 150, 152, 162, 172, 176, 234, 251, 284, 288, 297,
    323, 332, 338, 356, 361, 365, 377, 378, 379, 389, 397,
    400, 454,
)

LIPS = (
    0, 13, 14, 17, 37, 39, 40, 61, 78, 80, 81, 82, 84,
    87, 88, 91, 95, 146, 178, 181, 185, 191, 267, 269,
    270, 291, 308, 310, 311, 312, 314, 317, 318, 321,
    324, 375, 402, 405, 409, 415,
)

LEFT_EYE = (
    249, 263, 362, 373, 374, 380, 381, 382,
    384, 385, 386, 387, 388, 390, 398, 466,
)

RIGHT_EYE = (
    7, 33, 133, 144, 145, 153, 154, 155,
    157, 158, 159, 160, 161, 163, 173, 246,
)

LEFT_EYEBROW = (
    276, 282, 283, 285, 293,
    295, 296, 300, 334, 336,
)

RIGHT_EYEBROW = (
    46, 52, 53, 55, 63,
    65, 66, 70, 105, 107,
)

EYES = tuple(
    sorted(
        set(LEFT_EYE)
        | set(RIGHT_EYE)
    )
)

EYEBROWS = tuple(
    sorted(
        set(LEFT_EYEBROW)
        | set(RIGHT_EYEBROW)
    )
)

_STABLE_CORE_EXCLUDED = (
    set(LIPS)
    | set(EYES)
    | set(EYEBROWS)
)

STABLE_CORE = tuple(
    index
    for index in range(VERTEX_COUNT)
    if index not in _STABLE_CORE_EXCLUDED
)

REGIONS = {
    "stableCore": STABLE_CORE,
    "faceOval": FACE_OVAL,
    "eyebrows": EYEBROWS,
    "eyes": EYES,
    "lips": LIPS,
}


def canonical_json(value: object) -> str:
    return json.dumps(
        value,
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    )


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def artifact_digest(value: dict[str, Any]) -> str:
    content = {
        key: item
        for key, item in value.items()
        if key != "artifactDigest"
    }
    return (
        "sha256:"
        + sha256_bytes(
            canonical_json(content).encode("utf-8")
        )
    )


def require_finite_number(
    value: object,
    label: str,
) -> float:
    if (
        isinstance(value, bool)
        or not isinstance(value, (int, float))
    ):
        raise ValueError(
            f"{label} must be numeric"
        )

    result = float(value)

    if not math.isfinite(result):
        raise ValueError(
            f"{label} must be finite"
        )

    return result


def decode_index(
    value: object,
    label: str,
) -> int:
    number = require_finite_number(
        value,
        label,
    )

    if not number.is_integer():
        raise ValueError(
            f"{label} must be an integer"
        )

    result = int(number)

    if result < 0 or result >= VERTEX_COUNT:
        raise ValueError(
            f"{label} is outside the mesh"
        )

    return result


def decode_metric_mesh(
    observation: object,
    label: str,
) -> tuple[
    np.ndarray,
    np.ndarray,
    tuple[int, ...],
]:
    if not isinstance(observation, dict):
        raise ValueError(
            f"{label}: observation must be an object"
        )

    raw = observation.get(
        "rawFaceGeometry"
    )

    if (
        not isinstance(raw, list)
        or len(raw) != 2
    ):
        raise ValueError(
            f"{label}: rawFaceGeometry is invalid"
        )

    mesh = raw[0]

    if (
        not isinstance(mesh, list)
        or len(mesh) != 4
    ):
        raise ValueError(
            f"{label}: raw metric mesh is invalid"
        )

    vertex_buffer = mesh[2]
    index_buffer = mesh[3]

    if (
        not isinstance(vertex_buffer, list)
        or len(vertex_buffer)
        != VERTEX_COUNT * VERTEX_STRIDE
    ):
        raise ValueError(
            f"{label}: expected "
            f"{VERTEX_COUNT} XYZUV vertices"
        )

    if (
        not isinstance(index_buffer, list)
        or len(index_buffer) != INDEX_COUNT
    ):
        raise ValueError(
            f"{label}: expected "
            f"{TRIANGLE_COUNT} triangles"
        )

    numeric = np.asarray(
        [
            require_finite_number(
                value,
                f"{label}.vertex[{index}]",
            )
            for index, value
            in enumerate(vertex_buffer)
        ],
        dtype=np.float64,
    ).reshape(
        VERTEX_COUNT,
        VERTEX_STRIDE,
    )

    xyz = numeric[:, :3]
    uv = numeric[:, 3:5]

    indices = tuple(
        decode_index(
            value,
            f"{label}.index[{index}]",
        )
        for index, value
        in enumerate(index_buffer)
    )

    if np.linalg.matrix_rank(
        xyz - xyz.mean(axis=0)
    ) < 3:
        raise ValueError(
            f"{label}: metric mesh is degenerate"
        )

    return xyz, uv, indices


def residual_summary(
    residuals: np.ndarray,
) -> dict[str, float]:
    if (
        residuals.ndim != 1
        or residuals.size == 0
    ):
        raise ValueError(
            "Residual vector is invalid"
        )

    return {
        "rms": float(
            math.sqrt(
                float(
                    np.mean(
                        residuals
                        * residuals
                    )
                )
            )
        ),
        "p95": float(
            np.percentile(
                residuals,
                95,
            )
        ),
        "max": float(
            np.max(
                residuals
            )
        ),
    }


def globally_aligned_residuals(
    source: np.ndarray,
    target: np.ndarray,
) -> np.ndarray:
    if (
        source.shape != (VERTEX_COUNT, 3)
        or target.shape != (VERTEX_COUNT, 3)
    ):
        raise ValueError(
            "Procrustes requires corresponding 468x3 meshes"
        )

    source_centered = (
        source - source.mean(axis=0)
    )
    target_centered = (
        target - target.mean(axis=0)
    )

    source_scale = math.sqrt(
        float(
            np.mean(
                np.sum(
                    source_centered
                    * source_centered,
                    axis=1,
                )
            )
        )
    )

    target_scale = math.sqrt(
        float(
            np.mean(
                np.sum(
                    target_centered
                    * target_centered,
                    axis=1,
                )
            )
        )
    )

    if (
        source_scale <= 0.0
        or target_scale <= 0.0
    ):
        raise ValueError(
            "Metric mesh has zero RMS scale"
        )

    source_normalized = (
        source_centered / source_scale
    )
    target_normalized = (
        target_centered / target_scale
    )

    covariance = (
        source_normalized.T
        @ target_normalized
    )

    u, _, vt = np.linalg.svd(
        covariance
    )

    rotation = u @ vt

    if np.linalg.det(rotation) < 0.0:
        u = u.copy()
        u[:, -1] *= -1.0
        rotation = u @ vt

    if np.linalg.det(rotation) <= 0.0:
        raise ValueError(
            "Proper Kabsch rotation could not be recovered"
        )

    aligned = (
        source_normalized @ rotation
    )

    return np.linalg.norm(
        aligned - target_normalized,
        axis=1,
    )


def proper_procrustes(
    source: np.ndarray,
    target: np.ndarray,
) -> dict[str, Any]:
    residuals = (
        globally_aligned_residuals(
            source,
            target,
        )
    )

    result: dict[str, Any] = {
        **residual_summary(
            residuals
        ),
        "regions": {},
    }

    for region_name, indices in (
        REGIONS.items()
    ):
        region_residuals = residuals[
            np.asarray(
                indices,
                dtype=np.int64,
            )
        ]

        result["regions"][
            region_name
        ] = residual_summary(
            region_residuals
        )

    return result


def regional_direction_summary(
    user_distances: list[dict[str, Any]],
    art_distances: list[dict[str, Any]],
) -> dict[str, Any]:
    output: dict[str, Any] = {}

    for region_name in REGIONS:
        users = sorted(
            user_distances,
            key=lambda value: (
                value["regions"][
                    region_name
                ]["rms"],
                value["reference"],
            ),
        )

        arts = sorted(
            art_distances,
            key=lambda value: (
                value["regions"][
                    region_name
                ]["rms"],
                value["reference"],
            ),
        )

        best_user = users[0]
        best_art = arts[0]

        user_rms = float(
            best_user["regions"][
                region_name
            ]["rms"]
        )

        art_rms = float(
            best_art["regions"][
                region_name
            ]["rms"]
        )

        output[region_name] = {
            "bestUserReference":
                best_user["reference"],
            "bestUserRms":
                user_rms,
            "bestArtReference":
                best_art["reference"],
            "bestArtRms":
                art_rms,
            "userAdvantageOverArt":
                art_rms - user_rms,
            "nearestDirection":
                direction_label(
                    user_rms,
                    art_rms,
                ),
        }

    return output

def pair_key(
    first: str,
    second: str,
) -> str:
    return f"{first}::{second}"


def direction_label(
    best_user: float,
    best_art: float,
) -> str:
    delta = best_art - best_user

    if abs(delta) <= 1e-12:
        return "TIE"

    if delta > 0:
        return "USER_IDENTITY"

    return "ART_REFERENCE"


def build_artifact(
    source_path: Path,
    *,
    user_references: list[str],
    candidates: list[str],
    art_references: list[str],
) -> dict[str, Any]:
    source_bytes = source_path.read_bytes()

    root = json.loads(
        source_bytes.decode("utf-8")
    )

    if not isinstance(root, dict):
        raise ValueError(
            "Input artifact must be an object"
        )

    observations = root.get(
        "observations"
    )

    if not isinstance(observations, dict):
        raise ValueError(
            "Input artifact has no observations map"
        )

    if not user_references:
        raise ValueError(
            "At least one user reference is required"
        )

    if not candidates:
        raise ValueError(
            "At least one candidate is required"
        )

    labels = list(
        dict.fromkeys(
            user_references
            + candidates
            + art_references
        )
    )

    missing = [
        label
        for label in labels
        if label not in observations
    ]

    if missing:
        raise ValueError(
            "Missing observations: "
            + ", ".join(missing)
        )

    if (
        set(user_references)
        & set(candidates)
    ):
        raise ValueError(
            "User references and candidates must be distinct"
        )

    if (
        set(art_references)
        & set(candidates)
    ):
        raise ValueError(
            "Art references and candidates must be distinct"
        )

    meshes: dict[str, np.ndarray] = {}
    uvs: dict[str, np.ndarray] = {}
    topologies: dict[
        str,
        tuple[int, ...],
    ] = {}

    for label in labels:
        xyz, uv, topology = decode_metric_mesh(
            observations[label],
            label,
        )

        meshes[label] = xyz
        uvs[label] = uv
        topologies[label] = topology

    baseline_label = labels[0]
    baseline_uv = uvs[baseline_label]
    baseline_topology = topologies[
        baseline_label
    ]

    uv_max_delta = 0.0

    for label in labels[1:]:
        if (
            topologies[label]
            != baseline_topology
        ):
            raise ValueError(
                f"{label}: topology differs from "
                f"{baseline_label}"
            )

        delta = float(
            np.max(
                np.abs(
                    uvs[label]
                    - baseline_uv
                )
            )
        )

        uv_max_delta = max(
            uv_max_delta,
            delta,
        )

        if delta > UV_TOLERANCE:
            raise ValueError(
                f"{label}: UV correspondence differs "
                f"from {baseline_label}"
            )

    pairwise: dict[
        str,
        dict[str, Any],
    ] = {}

    for first_index, first in enumerate(labels):
        for second in labels[
            first_index + 1:
        ]:
            pairwise[
                pair_key(
                    first,
                    second,
                )
            ] = {
                "first": first,
                "second": second,
                **proper_procrustes(
                    meshes[first],
                    meshes[second],
                ),
            }

    def metrics_between(
        first: str,
        second: str,
    ) -> dict[str, float]:
        return proper_procrustes(
            meshes[first],
            meshes[second],
        )

    candidate_results: dict[
        str,
        dict[str, Any],
    ] = {}

    for candidate in candidates:
        user_distances = [
            {
                "reference": reference,
                **metrics_between(
                    candidate,
                    reference,
                ),
            }
            for reference
            in user_references
        ]

        user_distances.sort(
            key=lambda value: (
                value["rms"],
                value["reference"],
            )
        )

        best_user = user_distances[0]

        result: dict[str, Any] = {
            "userReferences":
                user_distances,
            "bestUserReference":
                best_user["reference"],
            "bestUserRms":
                best_user["rms"],
            "medianUserRms":
                float(
                    median(
                        [
                            value["rms"]
                            for value
                            in user_distances
                        ]
                    )
                ),
        }

        if art_references:
            art_distances = [
                {
                    "reference": reference,
                    **metrics_between(
                        candidate,
                        reference,
                    ),
                }
                for reference
                in art_references
            ]

            art_distances.sort(
                key=lambda value: (
                    value["rms"],
                    value["reference"],
                )
            )

            best_art = art_distances[0]

            result.update(
                {
                    "artReferences":
                        art_distances,
                    "bestArtReference":
                        best_art["reference"],
                    "bestArtRms":
                        best_art["rms"],
                    "bestUserAdvantageOverArt":
                        float(
                            best_art["rms"]
                            - best_user["rms"]
                        ),
                    "medianUserAdvantageOverArt":
                        float(
                            best_art["rms"]
                            - result[
                                "medianUserRms"
                            ]
                        ),
                    "nearestDirection":
                        direction_label(
                            best_user["rms"],
                            best_art["rms"],
                        ),
                    "regionalDirection":
                        regional_direction_summary(
                            user_distances,
                            art_distances,
                        ),
                }
            )

        candidate_results[
            candidate
        ] = result

    topology_digest = sha256_bytes(
        canonical_json(
            list(baseline_topology)
        ).encode("utf-8")
    )

    uv_digest = sha256_bytes(
        canonical_json(
            baseline_uv.tolist()
        ).encode("utf-8")
    )

    artifact: dict[str, Any] = {
        "schemaVersion":
            SCHEMA_VERSION,
        "purpose":
            "offline diagnostic facial morphology comparison",
        "decisionSemantics":
            "none",
        "gateEligible":
            False,
        "thresholdEligible":
            False,
        "source": {
            "sha256":
                "sha256:"
                + sha256_bytes(
                    source_bytes
                ),
        },
        "contract": {
            "alignment":
                ALIGNMENT_CONTRACT,
            "vertexLayout":
                "XYZUV",
            "vertexCount":
                VERTEX_COUNT,
            "triangleCount":
                TRIANGLE_COUNT,
            "reflectionAllowed":
                False,
            "uvTolerance":
                UV_TOLERANCE,
            "regionAlignmentPolicy":
                REGION_ALIGNMENT_POLICY,
            "regionDefinitions": {
                "sourcePackage":
                    REGION_SOURCE_PACKAGE,
                "sourceVersion":
                    REGION_SOURCE_VERSION,
                "regions": {
                    name: list(indices)
                    for name, indices
                    in REGIONS.items()
                },
            },
        },
        "roles": {
            "userReferences":
                user_references,
            "candidates":
                candidates,
            "artReferences":
                art_references,
        },
        "meshInvariants": {
            "topologyDigest":
                "sha256:"
                + topology_digest,
            "uvDigest":
                "sha256:"
                + uv_digest,
            "uvMaxAbsDelta":
                uv_max_delta,
            "topologyIdentical":
                True,
        },
        "pairwise":
            pairwise,
        "candidates":
            candidate_results,
    }

    artifact["artifactDigest"] = (
        artifact_digest(
            artifact
        )
    )

    return artifact


def self_test() -> None:
    expected_region_counts = {
        "stableCore": 376,
        "faceOval": 36,
        "eyebrows": 20,
        "eyes": 32,
        "lips": 40,
    }

    actual_region_counts = {
        name: len(indices)
        for name, indices
        in REGIONS.items()
    }

    if (
        actual_region_counts
        != expected_region_counts
    ):
        raise RuntimeError(
            "Self-test failed: canonical "
            "MediaPipe region counts differ"
        )

    rng = np.random.default_rng(
        20260813
    )

    source = rng.normal(
        size=(
            VERTEX_COUNT,
            3,
        )
    )

    theta = math.radians(
        31.0
    )

    rotation = np.array(
        [
            [
                math.cos(theta),
                -math.sin(theta),
                0.0,
            ],
            [
                math.sin(theta),
                math.cos(theta),
                0.0,
            ],
            [0.0, 0.0, 1.0],
        ],
        dtype=np.float64,
    )

    translated_scaled = (
        source @ rotation
        * 3.7
        + np.array(
            [11.0, -7.0, 2.5]
        )
    )

    recovered = proper_procrustes(
        source,
        translated_scaled,
    )

    if recovered["rms"] > 1e-10:
        raise RuntimeError(
            "Self-test failed: similarity "
            "transform was not removed"
        )

    reflected = source.copy()
    reflected[:, 0] *= -1.0

    reflection_result = proper_procrustes(
        source,
        reflected,
    )

    if reflection_result["rms"] <= 1e-3:
        raise RuntimeError(
            "Self-test failed: reflection "
            "was incorrectly accepted"
        )

    print(
        "SELF_TEST_SIMILARITY_RMS="
        f"{recovered['rms']:.12f}"
    )

    print(
        "SELF_TEST_REFLECTION_RMS="
        f"{reflection_result['rms']:.12f}"
    )

    print(
        "METRIC_FACE_MORPHOLOGY_SELF_TEST=PASS"
    )


def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            "Compute diagnostic-only "
            "MediaPipe metric face morphology "
            "comparisons."
        )
    )

    parser.add_argument(
        "--input",
    )

    parser.add_argument(
        "--output",
    )

    parser.add_argument(
        "--user-reference",
        action="append",
        default=[],
    )

    parser.add_argument(
        "--candidate",
        action="append",
        default=[],
    )

    parser.add_argument(
        "--art-reference",
        action="append",
        default=[],
    )

    parser.add_argument(
        "--self-test",
        action="store_true",
    )

    args = parser.parse_args()

    if args.self_test:
        self_test()
        return

    if not args.input or not args.output:
        parser.error(
            "--input and --output are required "
            "outside --self-test"
        )

    artifact = build_artifact(
        Path(args.input),
        user_references=
            args.user_reference,
        candidates=
            args.candidate,
        art_references=
            args.art_reference,
    )

    output = Path(args.output)
    output.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    output.write_text(
        json.dumps(
            artifact,
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )

    print(
        "SCHEMA_VERSION="
        + artifact["schemaVersion"]
    )

    print(
        "DIAGNOSTIC_ONLY=TRUE"
    )

    print(
        "GATE_ELIGIBLE=FALSE"
    )

    print(
        "TOPOLOGY_IDENTICAL="
        + str(
            artifact[
                "meshInvariants"
            ][
                "topologyIdentical"
            ]
        ).upper()
    )

    print(
        "UV_MAX_ABS_DELTA="
        f"{artifact['meshInvariants']['uvMaxAbsDelta']:.12f}"
    )

    for candidate, result in (
        artifact[
            "candidates"
        ].items()
    ):
        print()
        print(
            f"CANDIDATE={candidate}"
        )
        print(
            "BEST_USER_RMS="
            f"{result['bestUserRms']:.9f}"
        )
        print(
            "MEDIAN_USER_RMS="
            f"{result['medianUserRms']:.9f}"
        )

        if "bestArtRms" in result:
            print(
                "BEST_ART_RMS="
                f"{result['bestArtRms']:.9f}"
            )
            print(
                "BEST_USER_ADVANTAGE="
                f"{result['bestUserAdvantageOverArt']:+.9f}"
            )
            print(
                "NEAREST_DIRECTION="
                + result[
                    "nearestDirection"
                ]
            )

            for (
                region_name,
                region_result,
            ) in result[
                "regionalDirection"
            ].items():
                token = "".join(
                    character.upper()
                    if character.islower()
                    else "_"
                    + character
                    for character
                    in region_name
                ).upper()

                print(
                    f"REGION_{token}_BEST_USER_RMS="
                    f"{region_result['bestUserRms']:.9f}"
                )

                print(
                    f"REGION_{token}_BEST_ART_RMS="
                    f"{region_result['bestArtRms']:.9f}"
                )

                print(
                    f"REGION_{token}_USER_ADVANTAGE="
                    f"{region_result['userAdvantageOverArt']:+.9f}"
                )

                print(
                    f"REGION_{token}_DIRECTION="
                    + region_result[
                        "nearestDirection"
                    ]
                )

    print()
    print(
        "ARTIFACT_DIGEST="
        + artifact[
            "artifactDigest"
        ]
    )

    print(
        "OUTPUT="
        + str(output)
    )


if __name__ == "__main__":
    main()
