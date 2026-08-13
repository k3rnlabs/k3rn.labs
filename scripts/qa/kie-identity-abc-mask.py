from pathlib import Path
import argparse
import hashlib

import cv2
import numpy as np


DEFAULT_YUNET = Path(
    "/tmp/mirava-sface/face_detection_yunet_2023mar.onnx"
)

EXPECTED_YUNET_SHA256 = (
    "8f2383e4dd3cfbb4553ea8718107fc0423210dc964f9f4280604804ed2552fa4"
)


def sha256(path: Path) -> str:
    h = hashlib.sha256()

    with path.open("rb") as handle:
        for chunk in iter(
            lambda: handle.read(1024 * 1024),
            b"",
        ):
            h.update(chunk)

    return h.hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser()

    parser.add_argument(
        "--input",
        required=True,
    )

    parser.add_argument(
        "--output",
        required=True,
    )

    parser.add_argument(
        "--yunet",
        default=str(DEFAULT_YUNET),
    )

    args = parser.parse_args()

    source = Path(args.input)
    output = Path(args.output)
    yunet = Path(args.yunet)

    if not source.is_file():
        raise SystemExit(
            f"MISSING_INPUT: {source}"
        )

    if not yunet.is_file():
        raise SystemExit(
            f"MISSING_YUNET: {yunet}"
        )

    digest = sha256(yunet)

    if digest != EXPECTED_YUNET_SHA256:
        raise SystemExit(
            "YUNET_DIGEST_MISMATCH "
            f"expected={EXPECTED_YUNET_SHA256} "
            f"actual={digest}"
        )

    image = cv2.imread(
        str(source),
        cv2.IMREAD_COLOR,
    )

    if image is None:
        raise SystemExit(
            f"IMAGE_READ_FAILED: {source}"
        )

    original_h, original_w = (
        image.shape[:2]
    )

    max_edge = max(
        original_w,
        original_h,
    )

    scale = min(
        1.0,
        1600.0 / max_edge,
    )

    if scale < 1.0:
        detect_image = cv2.resize(
            image,
            (
                int(round(original_w * scale)),
                int(round(original_h * scale)),
            ),
            interpolation=cv2.INTER_AREA,
        )
    else:
        detect_image = image

    detect_h, detect_w = (
        detect_image.shape[:2]
    )

    detector = cv2.FaceDetectorYN.create(
        str(yunet),
        "",
        (detect_w, detect_h),
        0.60,
        0.30,
        5000,
    )

    _, faces = detector.detect(
        detect_image
    )

    if (
        faces is None
        or len(faces) == 0
    ):
        raise SystemExit(
            f"NO_FACE_DETECTED: {source}"
        )

    faces = np.asarray(
        faces,
        dtype=np.float32,
    )

    best_index = int(
        np.argmax(
            faces[:, -1]
        )
    )

    face = faces[
        best_index
    ].copy()

    confidence = float(
        face[-1]
    )

    if scale != 1.0:
        face[:14] /= scale

    x, y, w, h = [
        float(v)
        for v in face[:4]
    ]

    #
    # Remove usable internal face identity while preserving:
    # - head silhouette
    # - hair
    # - global pose
    # - lighting
    # - body / wardrobe / environment
    #
    # A very strong low-frequency blur is applied through a
    # feathered ellipse covering the facial interior.
    #
    cx = int(
        round(
            x + w * 0.50
        )
    )

    cy = int(
        round(
            y + h * 0.52
        )
    )

    axis_x = max(
        1,
        int(
            round(
                w * 0.47
            )
        ),
    )

    axis_y = max(
        1,
        int(
            round(
                h * 0.52
            )
        ),
    )

    mask = np.zeros(
        (
            original_h,
            original_w,
        ),
        dtype=np.uint8,
    )

    cv2.ellipse(
        mask,
        (cx, cy),
        (axis_x, axis_y),
        0,
        0,
        360,
        255,
        -1,
    )

    feather_sigma = max(
        3.0,
        min(
            w,
            h,
        ) * 0.045,
    )

    mask = cv2.GaussianBlur(
        mask,
        (0, 0),
        feather_sigma,
    )

    identity_blur_sigma = max(
        16.0,
        min(
            w,
            h,
        ) * 0.26,
    )

    blurred = cv2.GaussianBlur(
        image,
        (0, 0),
        identity_blur_sigma,
    )

    alpha = (
        mask.astype(
            np.float32
        ) /
        255.0
    )[..., None]

    result = (
        image.astype(np.float32)
        * (1.0 - alpha)
        +
        blurred.astype(np.float32)
        * alpha
    )

    result = np.clip(
        result,
        0,
        255,
    ).astype(
        np.uint8
    )

    output.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    suffix = (
        output.suffix.lower()
    )

    if suffix in (
        ".jpg",
        ".jpeg",
    ):
        ok = cv2.imwrite(
            str(output),
            result,
            [
                cv2.IMWRITE_JPEG_QUALITY,
                96,
            ],
        )
    else:
        ok = cv2.imwrite(
            str(output),
            result,
        )

    if not ok:
        raise SystemExit(
            f"IMAGE_WRITE_FAILED: {output}"
        )

    print(
        "MASKED:",
        source.name,
        "->",
        output.name,
        f"confidence={confidence:.6f}",
        f"bbox={x:.1f},{y:.1f},{w:.1f},{h:.1f}",
    )


if __name__ == "__main__":
    main()
