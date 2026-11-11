"""Write-once, verifiable baseline of original manual Google Assistant YAML.

Dormant migration infrastructure: NOT connected to HVLS services or WebSocket.
May be called only after a future explicit, reviewed migration workflow.
Never reads !secret targets or any path outside the Home Assistant config root.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import shutil
import stat
import tempfile
from contextlib import contextmanager
from pathlib import Path, PurePosixPath
from typing import Any

MAX_FILE_BYTES = 1024 * 1024
MAX_TOTAL_BYTES = 2 * 1024 * 1024
MAX_FILES = 8
_SHA = re.compile(r"^[0-9a-f]{64}$")
_STORE = ("storage", "hvls_migration")
_BASELINE = "baseline"


class BaselineError(ValueError):
    """Safe machine-readable failure code; do not return raw source content."""


def _json_bytes(value: Any) -> bytes:
    return (json.dumps(value, sort_keys=True, separators=(",", ":")) + "\n").encode(
        "utf-8"
    )


def _sync_dir(path: Path) -> None:
    fd = os.open(path, os.O_RDONLY | getattr(os, "O_DIRECTORY", 0))
    try:
        os.fsync(fd)
    finally:
        os.close(fd)


def _regular_file(path: Path) -> bytes:
    """Reject symlinks and suspicious file types, even during the open."""
    flags = os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0)
    try:
        fd = os.open(path, flags)
    except OSError as exc:
        raise BaselineError("source_unreadable") from exc
    try:
        before = os.fstat(fd)
        if not stat.S_ISREG(before.st_mode) or before.st_size > MAX_FILE_BYTES:
            raise BaselineError("source_invalid")
        with os.fdopen(fd, "rb", closefd=False) as source:
            raw = source.read(MAX_FILE_BYTES + 1)
        after = os.fstat(fd)
        if (
            len(raw) > MAX_FILE_BYTES
            or len(raw) != after.st_size
            or before.st_mtime_ns != after.st_mtime_ns
            or before.st_size != after.st_size
        ):
            raise BaselineError("source_changed_during_read")
        return raw
    finally:
        os.close(fd)


def _relative(value: Any) -> PurePosixPath:
    if (
        not isinstance(value, str)
        or not value
        or "\\" in value
        or ":" in value
        or value.startswith("/")
    ):
        raise BaselineError("invalid_source_path")
    path = PurePosixPath(value)
    if (
        path.is_absolute()
        or any(part in ("", ".", "..") for part in value.split("/"))
        or path.as_posix() != value
        or path.suffix.lower() not in (".yaml", ".yml")
    ):
        raise BaselineError("invalid_source_path")
    return path


def _source_path(root: Path, relative: PurePosixPath) -> Path:
    """Explicitly refuse every symlink within the HA config directory."""
    current = root
    for part in relative.parts:
        current = current / part
        if current.is_symlink():
            raise BaselineError("source_symlink")
    if not current.resolve().is_relative_to(root):
        raise BaselineError("source_outside_config")
    return current


def _private_directory(path: Path, *, create: bool) -> None:
    if create:
        try:
            path.mkdir(mode=0o700)
        except FileExistsError:
            pass
        except OSError as exc:
            raise BaselineError("storage_unavailable") from exc
    try:
        meta = path.lstat()
    except OSError as exc:
        raise BaselineError("storage_unavailable") from exc
    if not stat.S_ISDIR(meta.st_mode):
        raise BaselineError("storage_not_directory")
    if meta.st_mode & 0o077:
        raise BaselineError("storage_permissions_unsafe")


def storage_directory(config_dir: str | Path, *, create: bool = False) -> Path:
    root = Path(config_dir).resolve(strict=True)
    if not root.is_dir():
        raise BaselineError("config_root_invalid")
    ha_storage = root / ".storage"
    if create and not ha_storage.exists():
        try:
            ha_storage.mkdir(mode=0o700)
        except FileExistsError:
            pass
    if ha_storage.is_symlink() or not ha_storage.is_dir():
        raise BaselineError("ha_storage_unavailable")
    target = ha_storage / _STORE[1]
    _private_directory(target, create=create)
    return target


@contextmanager
def migration_lock(storage: Path):
    """Cross-process exclusive lock; stale crash locks must be inspected manually."""
    lock = storage / ".mutation.lock"
    try:
        fd = os.open(
            lock,
            os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_NOFOLLOW", 0),
            0o600,
        )
    except OSError as exc:
        raise BaselineError("mutation_lock_unavailable") from exc
    try:
        os.close(fd)
        _sync_dir(storage)
        yield
    finally:
        lock.unlink()
        _sync_dir(storage)


def _write_new(path: Path, content: bytes) -> None:
    try:
        fd = os.open(
            path,
            os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_NOFOLLOW", 0),
            0o600,
        )
    except OSError as exc:
        raise BaselineError("snapshot_write_failed") from exc
    try:
        with os.fdopen(fd, "wb", closefd=False) as output:
            output.write(content)
            output.flush()
            os.fsync(fd)
    finally:
        os.close(fd)


def _expected_sources(discovery: dict[str, Any]) -> list[tuple[str, str]]:
    if (
        discovery.get("mode") != "assisted_migration"
        or discovery.get("source", {}).get("status") != "resolved"
        or discovery.get("global_blockers")
    ):
        raise BaselineError("discovery_not_eligible")
    locations = discovery["source"].get("locations")
    if not isinstance(locations, list) or not 1 <= len(locations) <= MAX_FILES:
        raise BaselineError("source_inventory_invalid")
    result = []
    seen = set()
    for location in locations:
        if not isinstance(location, dict):
            raise BaselineError("source_inventory_invalid")
        relative = _relative(location.get("path")).as_posix()
        digest = location.get("digest_sha256")
        if relative in seen or not isinstance(digest, str) or not _SHA.fullmatch(digest):
            raise BaselineError("source_inventory_invalid")
        seen.add(relative)
        result.append((relative, digest))
    if "configuration.yaml" not in seen:
        raise BaselineError("configuration_source_missing")
    return sorted(result)


def _capture_sources(
    root: Path, expected: list[tuple[str, str]]
) -> list[tuple[str, bytes, str]]:
    captured = []
    total = 0
    for relative, digest in expected:
        raw = _regular_file(_source_path(root, _relative(relative)))
        total += len(raw)
        if total > MAX_TOTAL_BYTES or hashlib.sha256(raw).hexdigest() != digest:
            raise BaselineError("source_changed_since_discovery")
        captured.append((relative, raw, digest))
    return captured


def _manifest(files: list[tuple[str, bytes, str]]) -> dict[str, Any]:
    return {
        "schema_version": 1,
        "purpose": "manual_ga_pre_migration",
        "files": [
            {"path": name, "size": len(data), "digest_sha256": digest}
            for name, data, digest in files
        ],
    }


def _verified_baseline(storage: Path) -> dict[str, Any]:
    baseline = storage / _BASELINE
    if baseline.is_symlink() or not baseline.is_dir():
        raise BaselineError("baseline_missing_or_invalid")
    _private_directory(baseline, create=False)
    manifest_path = baseline / "manifest.json"
    raw = _regular_file(manifest_path)
    try:
        manifest = json.loads(raw)
    except (ValueError, UnicodeDecodeError) as exc:
        raise BaselineError("baseline_manifest_invalid") from exc
    files = manifest.get("files") if isinstance(manifest, dict) else None
    if (
        manifest.get("schema_version") != 1
        or manifest.get("purpose") != "manual_ga_pre_migration"
        or not isinstance(files, list)
        or not 1 <= len(files) <= MAX_FILES
    ):
        raise BaselineError("baseline_manifest_invalid")
    paths = set()
    total = 0
    for item in files:
        if not isinstance(item, dict):
            raise BaselineError("baseline_manifest_invalid")
        relative = _relative(item.get("path"))
        digest = item.get("digest_sha256")
        size = item.get("size")
        if (
            relative.as_posix() in paths
            or not isinstance(digest, str)
            or not _SHA.fullmatch(digest)
            or type(size) is not int
            or not 0 <= size <= MAX_FILE_BYTES
        ):
            raise BaselineError("baseline_manifest_invalid")
        paths.add(relative.as_posix())
        current = baseline / "files"
        for part in relative.parts:
            current = current / part
            if current.is_symlink():
                raise BaselineError("baseline_file_symlink")
        raw_source = _regular_file(current)
        total += len(raw_source)
        if len(raw_source) != size or hashlib.sha256(raw_source).hexdigest() != digest:
            raise BaselineError("baseline_corrupt")
    if total > MAX_TOTAL_BYTES or "configuration.yaml" not in paths:
        raise BaselineError("baseline_manifest_invalid")
    return {
        "schema_version": 1,
        "files": files,
        "manifest_sha256": hashlib.sha256(raw).hexdigest(),
        "verified": True,
    }


def verify_baseline(config_dir: str | Path) -> dict[str, Any]:
    """Verify immutable source-byte copies; never expose their contents."""
    return _verified_baseline(storage_directory(config_dir))


def capture_baseline(
    config_dir: str | Path, discovery: dict[str, Any]
) -> dict[str, Any]:
    """Capture validated original YAML exactly once; no production modifications.

    A changed discovery or a different baseline is a conflict, not an update.
    Atomic directory publish ensures crashes cannot expose a partial baseline.
    """
    expected = _expected_sources(discovery)
    root = Path(config_dir).resolve(strict=True)
    storage = storage_directory(root, create=True)
    with migration_lock(storage):
        baseline = storage / _BASELINE
        if baseline.exists() or baseline.is_symlink():
            verified = _verified_baseline(storage)
            saved = sorted(
                (item["path"], item["digest_sha256"]) for item in verified["files"]
            )
            if saved != expected:
                raise BaselineError("baseline_already_exists")
            _capture_sources(root, expected)
            return verified

        if any(storage.glob(".baseline-pending-*")):
            raise BaselineError("interrupted_baseline_staging")
        files = _capture_sources(root, expected)
        staging = Path(tempfile.mkdtemp(prefix=".baseline-pending-", dir=storage))
        try:
            file_root = staging / "files"
            file_root.mkdir(mode=0o700)
            for name, raw, _digest in files:
                target = file_root / _relative(name)
                target.parent.mkdir(parents=True, mode=0o700, exist_ok=True)
                _write_new(target, raw)
                _sync_dir(target.parent)
            _write_new(staging / "manifest.json", _json_bytes(_manifest(files)))
            _sync_dir(staging)
            # Avoid a stale baseline when sources change during the copy.
            _capture_sources(root, expected)
            if baseline.exists() or baseline.is_symlink():
                raise BaselineError("baseline_already_exists")
            os.rename(staging, baseline)
            _sync_dir(storage)
        finally:
            if staging.exists():
                shutil.rmtree(staging)
        return _verified_baseline(storage)
