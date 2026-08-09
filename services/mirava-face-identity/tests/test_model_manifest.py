from __future__ import annotations

import hashlib
import json
from pathlib import Path

import pytest
import provision_model

from app.model_manifest import (
    RUNTIME_MANIFEST_NAME,
    canonical_manifest_bytes,
    load_and_verify_model_manifest,
    manifest_digest,
    validate_manifest_contract,
)


def _artifact(role: str, name: str, payload: bytes) -> dict:
    return {
        "role": role,
        "name": name,
        "sha256": hashlib.sha256(payload).hexdigest(),
        "bytes": len(payload),
    }


def _write_fixture(model_dir: Path) -> dict:
    payloads = {
        "detector.onnx": b"detector",
        "recognizer.onnx": b"recognizer",
        "LICENSE.md": b"license",
    }
    manifest = {
        "schemaVersion": "mirava-face-model-source/v1",
        "modelName": "auraface",
        "repository": "fal/AuraFace-v1",
        "revision": "pinned-commit",
        "license": "Apache-2.0",
        "artifacts": [
            _artifact("detection", "detector.onnx", payloads["detector.onnx"]),
            _artifact(
                "recognition", "recognizer.onnx", payloads["recognizer.onnx"]
            ),
            _artifact("license", "LICENSE.md", payloads["LICENSE.md"]),
        ],
    }
    model_dir.mkdir()
    for name, payload in payloads.items():
        (model_dir / name).write_bytes(payload)
    (model_dir / RUNTIME_MANIFEST_NAME).write_bytes(
        canonical_manifest_bytes(manifest) + b"\n"
    )
    return manifest


def test_verifies_manifest_and_every_artifact(tmp_path: Path) -> None:
    model_dir = tmp_path / "auraface"
    manifest = _write_fixture(model_dir)

    verified = load_and_verify_model_manifest(
        model_dir,
        expected_model_name="auraface",
        expected_digest=manifest_digest(manifest),
    )

    assert verified["revision"] == "pinned-commit"


def test_committed_source_manifest_pins_license_revision_and_artifacts() -> None:
    source = (
        Path(__file__).parents[1] / "model-source-manifest.json"
    )
    manifest = validate_manifest_contract(
        json.loads(source.read_text(encoding="utf-8"))
    )

    assert manifest["repository"] == "fal/AuraFace-v1"
    assert manifest["revision"] == (
        "af6d057c9b0ec4071d4c49c80e3539258798b609"
    )
    assert manifest["license"] == "Apache-2.0"
    assert {artifact["role"] for artifact in manifest["artifacts"]} == {
        "detection",
        "recognition",
        "license",
    }


def test_rejects_tampered_weights(tmp_path: Path) -> None:
    model_dir = tmp_path / "auraface"
    manifest = _write_fixture(model_dir)
    (model_dir / "recognizer.onnx").write_bytes(b"tampered!!")

    with pytest.raises(RuntimeError, match="digest does not match"):
        load_and_verify_model_manifest(
            model_dir,
            expected_model_name="auraface",
            expected_digest=manifest_digest(manifest),
        )


def test_rejects_manifest_digest_mismatch(tmp_path: Path) -> None:
    model_dir = tmp_path / "auraface"
    _write_fixture(model_dir)

    with pytest.raises(RuntimeError, match="manifest digest does not match"):
        load_and_verify_model_manifest(
            model_dir,
            expected_model_name="auraface",
            expected_digest="sha256:" + "0" * 64,
        )


def test_rejects_unlisted_onnx_before_runtime_initialization(
    tmp_path: Path,
) -> None:
    model_dir = tmp_path / "auraface"
    manifest = _write_fixture(model_dir)
    (model_dir / "00-injected.onnx").write_bytes(b"injected")

    with pytest.raises(RuntimeError, match="unlisted ONNX"):
        load_and_verify_model_manifest(
            model_dir,
            expected_model_name="auraface",
            expected_digest=manifest_digest(manifest),
        )


def test_provisioned_artifacts_are_readable_by_the_runtime_user(
    tmp_path: Path, monkeypatch
) -> None:
    payloads = {
        "detector.onnx": b"detector",
        "recognizer.onnx": b"recognizer",
        "LICENSE.md": b"license",
    }
    manifest = {
        "schemaVersion": "mirava-face-model-source/v1",
        "modelName": "auraface",
        "repository": "fal/AuraFace-v1",
        "revision": "pinned-commit",
        "license": "Apache-2.0",
        "artifacts": [
            _artifact("detection", "detector.onnx", payloads["detector.onnx"]),
            _artifact(
                "recognition", "recognizer.onnx", payloads["recognizer.onnx"]
            ),
            _artifact("license", "LICENSE.md", payloads["LICENSE.md"]),
        ],
    }
    source = tmp_path / "source.json"
    source.write_text(json.dumps(manifest), encoding="utf-8")
    monkeypatch.setattr(provision_model, "SOURCE_MANIFEST", source)

    def fake_download(_url: str, destination: Path, _expected: int) -> None:
        name = next(name for name in payloads if name in destination.name)
        destination.write_bytes(payloads[name])

    monkeypatch.setattr(provision_model, "_download", fake_download)
    destination = tmp_path / "models" / "auraface"
    digest = provision_model.provision(destination)

    assert digest == manifest_digest(manifest)
    assert destination.is_symlink()
    assert destination.stat().st_mode & 0o555 == 0o555
    for name in (*payloads, RUNTIME_MANIFEST_NAME):
        assert (destination / name).stat().st_mode & 0o444 == 0o444


def test_provision_replaces_stale_model_directory_as_one_verified_unit(
    tmp_path: Path, monkeypatch
) -> None:
    destination = tmp_path / "models" / "auraface"
    versions_root = destination.parent / ".auraface.versions"
    versions_root.mkdir(parents=True)
    previous = versions_root / "previous"
    manifest = _write_fixture(previous)
    (previous / "stale-revision.onnx").write_bytes(b"stale")
    destination.symlink_to(previous.relative_to(destination.parent))
    source = tmp_path / "source.json"
    source.write_text(json.dumps(manifest), encoding="utf-8")
    monkeypatch.setattr(provision_model, "SOURCE_MANIFEST", source)

    digest = provision_model.provision(destination)

    assert digest == manifest_digest(manifest)
    assert not (destination / "stale-revision.onnx").exists()
    load_and_verify_model_manifest(
        destination,
        expected_model_name="auraface",
        expected_digest=digest,
    )


def test_failed_reprovision_preserves_previous_verified_directory(
    tmp_path: Path, monkeypatch
) -> None:
    destination = tmp_path / "models" / "auraface"
    versions_root = destination.parent / ".auraface.versions"
    versions_root.mkdir(parents=True)
    previous = versions_root / "previous"
    previous_manifest = _write_fixture(previous)
    destination.symlink_to(previous.relative_to(destination.parent))
    new_payloads = {
        "detector.onnx": b"new-detector",
        "recognizer.onnx": b"new-recognizer",
        "LICENSE.md": b"new-license",
    }
    new_manifest = {
        **previous_manifest,
        "revision": "next-pinned-commit",
        "artifacts": [
            _artifact("detection", "detector.onnx", new_payloads["detector.onnx"]),
            _artifact(
                "recognition", "recognizer.onnx", new_payloads["recognizer.onnx"]
            ),
            _artifact("license", "LICENSE.md", new_payloads["LICENSE.md"]),
        ],
    }
    source = tmp_path / "source.json"
    source.write_text(json.dumps(new_manifest), encoding="utf-8")
    monkeypatch.setattr(provision_model, "SOURCE_MANIFEST", source)
    calls = 0

    def interrupted_download(
        _url: str, target: Path, _expected_bytes: int
    ) -> None:
        nonlocal calls
        calls += 1
        if calls == 2:
            raise OSError("simulated interrupted download")
        name = next(name for name in new_payloads if name in target.name)
        target.write_bytes(new_payloads[name])

    monkeypatch.setattr(provision_model, "_download", interrupted_download)

    with pytest.raises(OSError, match="interrupted"):
        provision_model.provision(destination)

    load_and_verify_model_manifest(
        destination,
        expected_model_name="auraface",
        expected_digest=manifest_digest(previous_manifest),
    )
    assert not list(versions_root.glob(".staging-*"))


def test_interrupted_atomic_link_swap_keeps_previous_model_active(
    tmp_path: Path, monkeypatch
) -> None:
    destination = tmp_path / "models" / "auraface"
    versions_root = destination.parent / ".auraface.versions"
    versions_root.mkdir(parents=True)
    previous = versions_root / "previous"
    previous_manifest = _write_fixture(previous)
    destination.symlink_to(previous.relative_to(destination.parent))
    new_payloads = {
        "detector.onnx": b"next-detector",
        "recognizer.onnx": b"next-recognizer",
        "LICENSE.md": b"next-license",
    }
    new_manifest = {
        **previous_manifest,
        "revision": "next-pinned-commit",
        "artifacts": [
            _artifact("detection", "detector.onnx", new_payloads["detector.onnx"]),
            _artifact(
                "recognition", "recognizer.onnx", new_payloads["recognizer.onnx"]
            ),
            _artifact("license", "LICENSE.md", new_payloads["LICENSE.md"]),
        ],
    }
    source = tmp_path / "source.json"
    source.write_text(json.dumps(new_manifest), encoding="utf-8")
    monkeypatch.setattr(provision_model, "SOURCE_MANIFEST", source)

    def fake_download(_url: str, target: Path, _expected: int) -> None:
        target.write_bytes(new_payloads[target.name])

    monkeypatch.setattr(provision_model, "_download", fake_download)
    replace = provision_model.os.replace

    def interrupt_link_swap(source_path, target_path) -> None:
        if Path(source_path).is_symlink():
            raise KeyboardInterrupt("simulated termination before atomic swap")
        replace(source_path, target_path)

    monkeypatch.setattr(provision_model.os, "replace", interrupt_link_swap)

    with pytest.raises(KeyboardInterrupt, match="atomic swap"):
        provision_model.provision(destination)

    assert destination.resolve() == previous.resolve()
    load_and_verify_model_manifest(
        destination,
        expected_model_name="auraface",
        expected_digest=manifest_digest(previous_manifest),
    )
