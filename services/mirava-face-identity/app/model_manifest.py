from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any


MODEL_MANIFEST_SCHEMA = "mirava-face-model-source/v1"
RUNTIME_MANIFEST_NAME = "mirava-model-manifest.json"
REQUIRED_ARTIFACT_ROLES = {"detection", "recognition", "license"}


def canonical_manifest_bytes(manifest: dict[str, Any]) -> bytes:
    return json.dumps(
        manifest,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=True,
    ).encode("utf-8")


def manifest_digest(manifest: dict[str, Any]) -> str:
    return "sha256:" + hashlib.sha256(
        canonical_manifest_bytes(manifest)
    ).hexdigest()


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def validate_manifest_contract(manifest: object) -> dict[str, Any]:
    if not isinstance(manifest, dict):
        raise RuntimeError("Face model manifest must be an object")
    if manifest.get("schemaVersion") != MODEL_MANIFEST_SCHEMA:
        raise RuntimeError("Unsupported face model manifest schema")

    for key in ("modelName", "repository", "revision", "license"):
        value = manifest.get(key)
        if not isinstance(value, str) or not value.strip():
            raise RuntimeError(f"Face model manifest field is invalid: {key}")

    artifacts = manifest.get("artifacts")
    if not isinstance(artifacts, list) or len(artifacts) != 3:
        raise RuntimeError("Face model manifest artifacts are invalid")

    roles: set[str] = set()
    names: set[str] = set()
    for artifact in artifacts:
        if not isinstance(artifact, dict):
            raise RuntimeError("Face model artifact must be an object")
        role = artifact.get("role")
        name = artifact.get("name")
        sha256 = artifact.get("sha256")
        size = artifact.get("bytes")
        if role not in REQUIRED_ARTIFACT_ROLES or role in roles:
            raise RuntimeError("Face model artifact role is invalid")
        if (
            not isinstance(name, str)
            or Path(name).name != name
            or name in names
        ):
            raise RuntimeError("Face model artifact name is invalid")
        if (
            not isinstance(sha256, str)
            or len(sha256) != 64
            or any(character not in "0123456789abcdef" for character in sha256)
        ):
            raise RuntimeError("Face model artifact digest is invalid")
        if not isinstance(size, int) or isinstance(size, bool) or size <= 0:
            raise RuntimeError("Face model artifact size is invalid")
        roles.add(role)
        names.add(name)

    if roles != REQUIRED_ARTIFACT_ROLES:
        raise RuntimeError("Face model manifest is incomplete")
    return manifest


def load_and_verify_model_manifest(
    model_dir: Path,
    *,
    expected_model_name: str,
    expected_digest: str,
) -> dict[str, Any]:
    manifest_path = model_dir / RUNTIME_MANIFEST_NAME
    try:
        manifest = validate_manifest_contract(
            json.loads(manifest_path.read_text(encoding="utf-8"))
        )
    except (OSError, json.JSONDecodeError) as exc:
        raise RuntimeError("Pinned face model manifest is missing or invalid") from exc

    if manifest["modelName"] != expected_model_name:
        raise RuntimeError("Pinned face model name does not match configuration")
    if manifest_digest(manifest) != expected_digest:
        raise RuntimeError("Pinned face model manifest digest does not match")

    listed_onnx = {
        artifact["name"]
        for artifact in manifest["artifacts"]
        if artifact["name"].endswith(".onnx")
    }
    present_onnx = {path.name for path in model_dir.glob("*.onnx")}
    if present_onnx != listed_onnx:
        raise RuntimeError("Pinned face model directory contains unlisted ONNX files")

    for artifact in manifest["artifacts"]:
        artifact_path = model_dir / artifact["name"]
        try:
            size = artifact_path.stat().st_size
        except OSError as exc:
            raise RuntimeError(
                f"Pinned face model artifact is missing: {artifact['name']}"
            ) from exc
        if size != artifact["bytes"]:
            raise RuntimeError(
                f"Pinned face model artifact size does not match: {artifact['name']}"
            )
        if file_sha256(artifact_path) != artifact["sha256"]:
            raise RuntimeError(
                f"Pinned face model artifact digest does not match: {artifact['name']}"
            )
    return manifest
