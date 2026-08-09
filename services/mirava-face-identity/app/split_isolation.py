from __future__ import annotations

import argparse
import hashlib
import hmac
import json
import os
from pathlib import Path
from typing import Any

from .benchmark import BENCHMARK_SCHEMA, _canonical_json, _partition_digest
from .calibration_report import benchmark_artifact_digest


SUBJECT_KEY_SCHEME = "hmac-sha256/v1"
SPLIT_ISOLATION_SCHEMA = "mirava-face-identity-split-isolation/v1"


def _hmac_key_id(pseudonym_key: bytes) -> str:
    if len(pseudonym_key) < 32:
        raise ValueError("Pseudonym HMAC key must contain at least 32 bytes")
    return "sha256:" + hashlib.sha256(pseudonym_key).hexdigest()


def _subject_key(pseudonym_key: bytes, subject_id: str) -> str:
    normalized = subject_id.strip()
    if not normalized:
        raise ValueError("Private subject IDs must be non-empty strings")
    return hmac.new(
        pseudonym_key,
        normalized.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def _private_subject_ids(value: object, expected_split: str) -> list[str]:
    if not isinstance(value, dict) or value.get("datasetSplit") != expected_split:
        raise ValueError(f"Expected the private {expected_split} subject inventory")
    subject_ids = value.get("subjectIds")
    if (
        not isinstance(subject_ids, list)
        or not subject_ids
        or not all(isinstance(subject_id, str) and subject_id.strip() for subject_id in subject_ids)
    ):
        raise ValueError("Private subject inventory is invalid")
    normalized = [subject_id.strip() for subject_id in subject_ids]
    if len(set(normalized)) != len(normalized):
        raise ValueError("Private subject inventory contains duplicates")
    return normalized


def _verified_report(value: object, expected_split: str) -> dict[str, Any]:
    if not isinstance(value, dict) or value.get("schemaVersion") != BENCHMARK_SCHEMA:
        raise ValueError("Benchmark report schema is invalid")
    if value.get("datasetSplit") != expected_split:
        raise ValueError(f"Expected the {expected_split} dataset split")
    artifact_digest = value.get("artifactDigest")
    if artifact_digest != benchmark_artifact_digest(value):
        raise ValueError("Benchmark artifact digest does not match")
    scheme = value.get("subjectKeyScheme")
    if not isinstance(scheme, str) or not scheme.strip():
        raise ValueError("subjectKeyScheme is required")
    key_id = value.get("subjectKeyKeyId")
    if not isinstance(key_id, str) or not key_id.strip():
        raise ValueError("subjectKeyKeyId is required")
    rows = value.get("rows")
    if not isinstance(rows, list) or not rows:
        raise ValueError("Benchmark rows are required")
    if any(
        not isinstance(row, dict)
        or any(
            not isinstance(row.get(field), str) or not row[field].strip()
            for field in ("candidateSubjectKey", "referenceSubjectKey")
        )
        for row in rows
    ):
        raise ValueError("Benchmark subject keys are invalid")
    subject_keys = {
        row[field]
        for row in rows
        for field in ("candidateSubjectKey", "referenceSubjectKey")
    }
    expected_partition = "sha256:" + _partition_digest(subject_keys)
    if value.get("subjectPartitionDigest") != expected_partition:
        raise ValueError("Benchmark subject partition digest does not match")
    return value


def split_isolation_artifact_digest(evidence: dict[str, Any]) -> str:
    content = dict(evidence)
    content.pop("artifactDigest", None)
    return hashlib.sha256(_canonical_json(content).encode("utf-8")).hexdigest()


def verify_split_isolation(
    calibration: object,
    test: object,
    *,
    pseudonym_key: bytes,
    calibration_subject_inventory: object,
    test_subject_inventory: object,
) -> dict[str, Any]:
    calibration_report = _verified_report(calibration, "calibration")
    test_report = _verified_report(test, "test")
    if (
        calibration_report["subjectKeyScheme"] != SUBJECT_KEY_SCHEME
        or test_report["subjectKeyScheme"] != SUBJECT_KEY_SCHEME
    ):
        raise ValueError("Benchmark subject key scheme is not supported")
    if calibration_report["subjectKeyKeyId"] != test_report["subjectKeyKeyId"]:
        raise ValueError("Calibration and test subject HMAC key IDs differ")
    actual_key_id = _hmac_key_id(pseudonym_key)
    if calibration_report["subjectKeyKeyId"] != actual_key_id:
        raise ValueError("Benchmark subject HMAC key ID does not match the supplied key")

    calibration_source_ids = _private_subject_ids(
        calibration_subject_inventory,
        "calibration",
    )
    test_source_ids = _private_subject_ids(test_subject_inventory, "test")
    if set(calibration_source_ids) & set(test_source_ids):
        raise ValueError("Calibration and test private subject inventories overlap")

    calibration_subjects = {
        row[field]
        for row in calibration_report["rows"]
        for field in ("candidateSubjectKey", "referenceSubjectKey")
    }
    test_subjects = {
        row[field]
        for row in test_report["rows"]
        for field in ("candidateSubjectKey", "referenceSubjectKey")
    }
    expected_calibration_subjects = {
        _subject_key(pseudonym_key, subject_id)
        for subject_id in calibration_source_ids
    }
    expected_test_subjects = {
        _subject_key(pseudonym_key, subject_id)
        for subject_id in test_source_ids
    }
    if calibration_subjects != expected_calibration_subjects:
        raise ValueError("Calibration subject keys do not match the private inventory")
    if test_subjects != expected_test_subjects:
        raise ValueError("Test subject keys do not match the private inventory")
    overlap = calibration_subjects & test_subjects
    if overlap:
        raise ValueError("Calibration and test subject partitions overlap")

    evidence = {
        "schemaVersion": SPLIT_ISOLATION_SCHEMA,
        "subjectKeyScheme": calibration_report["subjectKeyScheme"],
        "subjectKeyKeyId": calibration_report["subjectKeyKeyId"],
        "calibrationArtifactDigest": "sha256:" + calibration_report["artifactDigest"],
        "testArtifactDigest": "sha256:" + test_report["artifactDigest"],
        "calibrationPartitionDigest": calibration_report["subjectPartitionDigest"],
        "testPartitionDigest": test_report["subjectPartitionDigest"],
        "calibrationSubjectCount": len(calibration_subjects),
        "testSubjectCount": len(test_subjects),
        "status": "PASS",
    }
    evidence["artifactDigest"] = split_isolation_artifact_digest(evidence)
    return evidence


def load_and_verify_split_isolation_report(
    path: Path,
    *,
    expected_digest: str,
    calibration_report: dict[str, Any],
    test_report: dict[str, Any],
) -> dict[str, str]:
    try:
        evidence = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise RuntimeError("Split isolation evidence is missing or invalid") from exc
    if (
        not isinstance(evidence, dict)
        or evidence.get("schemaVersion") != SPLIT_ISOLATION_SCHEMA
    ):
        raise RuntimeError("Split isolation evidence schema is invalid")
    actual_digest = split_isolation_artifact_digest(evidence)
    if evidence.get("artifactDigest") != actual_digest:
        raise RuntimeError("Split isolation artifact digest does not match")
    if expected_digest != f"sha256:{actual_digest}":
        raise RuntimeError("Configured split isolation digest does not match evidence")
    if evidence.get("status") != "PASS":
        raise RuntimeError("Split isolation evidence is not accepted")

    if calibration_report.get("datasetSplit") != "calibration":
        raise RuntimeError("Verified calibration metadata is invalid")
    if test_report.get("datasetSplit") != "test":
        raise RuntimeError("Verified test metadata is invalid")
    if calibration_report.get("status") != "PASS":
        raise RuntimeError("Calibration benchmark is not accepted")
    if test_report.get("status") != "PASS":
        raise RuntimeError("Held-out test benchmark is not accepted")
    if calibration_report.get("commit") != test_report.get("commit"):
        raise RuntimeError("Calibration and test benchmark commits differ")
    if (
        calibration_report.get("subjectKeyScheme") != SUBJECT_KEY_SCHEME
        or test_report.get("subjectKeyScheme") != SUBJECT_KEY_SCHEME
    ):
        raise RuntimeError("Benchmark subject key scheme is not supported")
    if calibration_report.get("subjectKeyKeyId") != test_report.get(
        "subjectKeyKeyId"
    ):
        raise RuntimeError("Calibration and test subject HMAC key IDs differ")
    calibration_subjects = calibration_report.get("subjectKeys")
    test_subjects = test_report.get("subjectKeys")
    if not isinstance(calibration_subjects, frozenset) or not isinstance(
        test_subjects, frozenset
    ):
        raise RuntimeError("Verified benchmark subject evidence is invalid")
    if calibration_subjects & test_subjects:
        raise RuntimeError("Calibration and test subject partitions overlap")
    if calibration_report.get("calibrationVersion") != test_report.get(
        "calibrationVersion"
    ):
        raise RuntimeError("Calibration and test threshold versions differ")
    if calibration_report.get("acceptanceContractDigest") != test_report.get(
        "acceptanceContractDigest"
    ):
        raise RuntimeError("Calibration and test acceptance contracts differ")
    if calibration_report.get("coverageContractDigest") != test_report.get(
        "coverageContractDigest"
    ):
        raise RuntimeError("Calibration and test coverage contracts differ")
    if calibration_report.get("measurementContractDigest") != test_report.get(
        "measurementContractDigest"
    ):
        raise RuntimeError("Calibration and test measurement contracts differ")
    if calibration_report.get("cohortThresholdsDigest") != test_report.get(
        "cohortThresholdsDigest"
    ):
        raise RuntimeError("Calibration and test cohort threshold contracts differ")

    expected_fields = {
        "subjectKeyScheme": calibration_report.get("subjectKeyScheme"),
        "subjectKeyKeyId": calibration_report.get("subjectKeyKeyId"),
        "calibrationArtifactDigest": calibration_report.get("artifactDigest"),
        "testArtifactDigest": test_report.get("artifactDigest"),
        "calibrationPartitionDigest": calibration_report.get(
            "subjectPartitionDigest"
        ),
        "testPartitionDigest": test_report.get("subjectPartitionDigest"),
        "calibrationSubjectCount": calibration_report.get("subjectCount"),
        "testSubjectCount": test_report.get("subjectCount"),
    }
    if any(evidence.get(key) != value for key, value in expected_fields.items()):
        raise RuntimeError("Split isolation evidence does not match benchmark reports")
    return {
        "splitIsolationDigest": expected_digest,
        "splitIsolationStatus": "PASS",
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Verify MIRAVA calibration/test subject isolation"
    )
    parser.add_argument("--calibration", required=True)
    parser.add_argument("--test", required=True)
    parser.add_argument("--calibration-subjects", required=True)
    parser.add_argument("--test-subjects", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    pseudonym_key = os.environ.get("MIRAVA_BENCHMARK_PSEUDONYM_KEY", "").encode(
        "utf-8"
    )
    if not pseudonym_key:
        raise RuntimeError("MIRAVA_BENCHMARK_PSEUDONYM_KEY is required")
    calibration = json.loads(Path(args.calibration).read_text(encoding="utf-8"))
    test = json.loads(Path(args.test).read_text(encoding="utf-8"))
    calibration_subject_inventory = json.loads(
        Path(args.calibration_subjects).read_text(encoding="utf-8")
    )
    test_subject_inventory = json.loads(
        Path(args.test_subjects).read_text(encoding="utf-8")
    )
    evidence = verify_split_isolation(
        calibration,
        test,
        pseudonym_key=pseudonym_key,
        calibration_subject_inventory=calibration_subject_inventory,
        test_subject_inventory=test_subject_inventory,
    )
    Path(args.output).write_text(
        json.dumps(evidence, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
