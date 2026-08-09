from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import shutil
import tempfile
from urllib.parse import quote
from urllib.request import Request, urlopen

from app.model_manifest import (
    RUNTIME_MANIFEST_NAME,
    canonical_manifest_bytes,
    file_sha256,
    load_and_verify_model_manifest,
    manifest_digest,
    validate_manifest_contract,
)


SOURCE_MANIFEST = Path(__file__).with_name("model-source-manifest.json")


def _download(url: str, destination: Path, expected_bytes: int) -> None:
    request = Request(url, headers={"User-Agent": "mirava-model-provisioner/1"})
    with urlopen(request, timeout=120) as response, destination.open("wb") as out:
        shutil.copyfileobj(response, out, length=1024 * 1024)
    if destination.stat().st_size != expected_bytes:
        raise RuntimeError("Downloaded face model artifact size does not match")


def provision(destination: Path) -> str:
    manifest = validate_manifest_contract(
        json.loads(SOURCE_MANIFEST.read_text(encoding="utf-8"))
    )
    destination.parent.mkdir(parents=True, exist_ok=True)
    if destination.exists() and not destination.is_symlink():
        raise RuntimeError(
            "Face model destination must be absent or a provisioner-managed symlink"
        )
    active_model_dir = (
        destination.resolve(strict=True) if destination.is_symlink() else None
    )
    if active_model_dir is not None and not active_model_dir.is_dir():
        raise RuntimeError("Active face model symlink target must be a directory")
    repository = quote(manifest["repository"], safe="/")
    revision = quote(manifest["revision"], safe="")
    expected_digest = manifest_digest(manifest)
    versions_root = destination.parent / f".{destination.name}.versions"
    versions_root.mkdir(mode=0o755, exist_ok=True)
    os.chmod(versions_root, 0o755)
    staging = Path(
        tempfile.mkdtemp(
            prefix=".staging-", dir=versions_root
        )
    )
    os.chmod(staging, 0o755)
    temporary_link: Path | None = None
    try:
        for artifact in manifest["artifacts"]:
            target = staging / artifact["name"]
            existing = (
                active_model_dir / artifact["name"]
                if active_model_dir is not None
                else None
            )
            if (
                existing is not None
                and existing.is_file()
                and existing.stat().st_size == artifact["bytes"]
                and file_sha256(existing) == artifact["sha256"]
            ):
                shutil.copyfile(existing, target)
            else:
                url = (
                    f"https://huggingface.co/{repository}/resolve/"
                    f"{revision}/{quote(artifact['name'], safe='')}?download=true"
                )
                _download(url, target, artifact["bytes"])
                if file_sha256(target) != artifact["sha256"]:
                    raise RuntimeError(
                        "Downloaded face model artifact digest does not match: "
                        f"{artifact['name']}"
                    )
            os.chmod(target, 0o644)

        runtime_manifest = staging / RUNTIME_MANIFEST_NAME
        runtime_manifest.write_bytes(canonical_manifest_bytes(manifest) + b"\n")
        os.chmod(runtime_manifest, 0o644)
        load_and_verify_model_manifest(
            staging,
            expected_model_name=manifest["modelName"],
            expected_digest=expected_digest,
        )

        version_dir = versions_root / expected_digest.removeprefix("sha256:")
        if version_dir.exists():
            load_and_verify_model_manifest(
                version_dir,
                expected_model_name=manifest["modelName"],
                expected_digest=expected_digest,
            )
            shutil.rmtree(staging)
        else:
            os.replace(staging, version_dir)

        descriptor, temporary_name = tempfile.mkstemp(
            prefix=f".{destination.name}.link-", dir=destination.parent
        )
        os.close(descriptor)
        temporary_link = Path(temporary_name)
        temporary_link.unlink()
        temporary_link.symlink_to(
            os.path.relpath(version_dir, destination.parent),
            target_is_directory=True,
        )
        os.replace(temporary_link, destination)
        return expected_digest
    finally:
        if staging.exists():
            shutil.rmtree(staging, ignore_errors=True)
        if temporary_link is not None:
            temporary_link.unlink(missing_ok=True)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Provision the pinned MIRAVA face model without floating revisions."
    )
    parser.add_argument(
        "--destination",
        type=Path,
        required=True,
        help="Exact /models/models/<model-name> destination.",
    )
    args = parser.parse_args()
    print(provision(args.destination))


if __name__ == "__main__":
    main()
