"""Prototype durable registry for HVLS output ownership.

This module implements persistence and state transitions only.
It does NOT establish provenance or authorize production writes.
"""

from __future__ import annotations

import fcntl
import json
import os
import re
import tempfile
from functools import wraps
from pathlib import Path

_SHA256 = re.compile(r"[0-9a-f]{64}\Z")



def _serialized_mutation(method):
    """Protect a complete registry mutation with a Linux file lock."""

    @wraps(method)
    def guarded(self, *args, **kwargs):
        import stat

        lock_path = self.path.with_name(self.path.name + ".lock")
        lock_path.parent.mkdir(parents=True, exist_ok=True)

        flags = os.O_RDWR | os.O_CREAT
        flags |= getattr(os, "O_CLOEXEC", 0)
        flags |= getattr(os, "O_NOFOLLOW", 0)

        try:
            fd = os.open(lock_path, flags, 0o600)
        except OSError as exc:
            raise ValueError("Cannot open registry lock") from exc

        try:
            if not stat.S_ISREG(os.fstat(fd).st_mode):
                raise ValueError("Registry lock is not a regular file")

            fcntl.flock(fd, fcntl.LOCK_EX)
            try:
                return method(self, *args, **kwargs)
            finally:
                fcntl.flock(fd, fcntl.LOCK_UN)
        finally:
            os.close(fd)

    return guarded


class OwnershipRegistry:
    """File-backed ownership state machine for isolated testing."""

    def __init__(self, path: str | Path):
        self.path = Path(path)

    def _load(self) -> dict:
        if not self.path.exists():
            return {"version": 1, "revision": 0, "records": {}}

        try:
            data = json.loads(self.path.read_text(encoding="utf-8"))
        except (OSError, UnicodeError, ValueError) as exc:
            raise ValueError("Ownership registry cannot be read") from exc

        if (
            not isinstance(data, dict)
            or data.get("version") != 1
            or not isinstance(data.get("records"), dict)
        ):
            raise ValueError("Invalid ownership registry structure")

        # Compatibility with prototype registries without a revision.
        revision = data.get("revision", 0)

        if type(revision) is not int or revision < 0:
            raise ValueError("Invalid registry revision")

        data["revision"] = revision

        for entry_id, record in data["records"].items():
            if not isinstance(entry_id, str) or not isinstance(record, dict):
                raise ValueError("Invalid ownership record")
            if record.get("state") not in {
                "managed", "pending", "pending_create"
            }:
                raise ValueError("Invalid ownership state")
            if not isinstance(record.get("output_path"), str):
                raise ValueError("Invalid output path")
            if record["state"] == "managed":
                self._validate_sha(record.get("sha256"))
            elif record["state"] == "pending":
                self._validate_sha(record.get("expected_sha256"))
                self._validate_sha(record.get("next_sha256"))
            else:
                self._validate_sha(record.get("next_sha256"))

        return data

    @staticmethod
    def _validate_sha(value: str) -> None:
        if not isinstance(value, str) or not _SHA256.fullmatch(value):
            raise ValueError("Invalid SHA-256 digest")

    @staticmethod
    def _validate_entry(entry_id: str, output_path: str) -> None:
        if not isinstance(entry_id, str) or not entry_id.strip():
            raise ValueError("Invalid installation ID")
        if not isinstance(output_path, str) or not output_path.strip():
            raise ValueError("Invalid output path")
        if not Path(output_path).is_absolute():
            raise ValueError("Output path must be absolute")

    def _save(self, data: dict) -> None:
        """Reject stale revisions before atomically saving the registry."""
        expected_revision = data.get("revision")

        if (
            type(expected_revision) is not int
            or expected_revision < 0
        ):
            raise ValueError("Invalid expected registry revision")

        current = self._load()

        if current["revision"] != expected_revision:
            raise ValueError(
                "Concurrent registry update detected: stale revision"
            )

        saved_data = {
            **data,
            "revision": expected_revision + 1,
        }

        self.path.parent.mkdir(parents=True, exist_ok=True)

        temporary_path = None
        try:
            with tempfile.NamedTemporaryFile(
                mode="w",
                encoding="utf-8",
                dir=self.path.parent,
                prefix=f".{self.path.name}.",
                suffix=".tmp",
                delete=False,
            ) as stream:
                temporary_path = Path(stream.name)
                json.dump(saved_data, stream, indent=2, sort_keys=True)
                stream.write("\n")
                stream.flush()
                os.fsync(stream.fileno())

            os.replace(temporary_path, self.path)

            # Persist the directory entry where supported.
            if hasattr(os, "O_DIRECTORY"):
                fd = os.open(self.path.parent, os.O_RDONLY | os.O_DIRECTORY)
                try:
                    os.fsync(fd)
                finally:
                    os.close(fd)

        finally:
            if temporary_path is not None:
                temporary_path.unlink(missing_ok=True)

    def get_record(self, entry_id: str) -> dict | None:
        """Return a copy of the record, or fail on corruption."""
        record = self._load()["records"].get(entry_id)
        return dict(record) if record is not None else None

    def can_write(self, entry_id: str) -> bool:
        """State-only check; NEVER a standalone write authorization."""
        try:
            record = self.get_record(entry_id)
            return record is not None and record["state"] == "managed"
        except (OSError, ValueError):
            return False

    def _ensure_path_not_claimed(
        self, records: dict, entry_id: str, output_path: str
    ) -> None:
        for owner, record in records.items():
            if owner != entry_id and record["output_path"] == output_path:
                raise ValueError("Output already claimed by another entry")

    @_serialized_mutation
    def record_generation(
        self, *, entry_id: str, output_path: str, sha256: str
    ) -> None:
        """Seed a managed record in tests; NOT an adoption API."""
        self._validate_entry(entry_id, output_path)
        self._validate_sha(sha256)

        data = self._load()
        self._ensure_path_not_claimed(data["records"], entry_id, output_path)

        existing = data["records"].get(entry_id)
        if existing is not None:
            raise ValueError("Cannot replace existing ownership record")

        data["records"][entry_id] = {
            "output_path": output_path,
            "sha256": sha256,
            "state": "managed",
        }
        self._save(data)

    @_serialized_mutation
    def begin_create(
        self,
        *,
        entry_id: str,
        output_path: str,
        next_sha256: str,
    ) -> None:
        """Prepare a first creation without modifying the output.

        This is a reservation only, never authorization to overwrite.
        The actual writer must use exclusive file creation.
        """
        self._validate_entry(entry_id, output_path)
        self._validate_sha(next_sha256)

        output = Path(output_path)

        # Reject symbolic links, including parent components.
        current = output
        while True:
            if current.is_symlink():
                raise ValueError("Symbolic link in output path")
            if current == current.parent:
                break
            current = current.parent

        # A pre-existing file, directory or dangling symlink
        # must never be adopted through first creation.
        if output.exists() or output.is_symlink():
            raise ValueError("Output already exists")

        data = self._load()
        records = data["records"]

        if entry_id in records:
            raise ValueError("Installation already has an ownership record")

        self._ensure_path_not_claimed(
            records,
            entry_id,
            output_path,
        )

        records[entry_id] = {
            "output_path": output_path,
            "next_sha256": next_sha256,
            "state": "pending_create",
        }

        self._save(data)

    @_serialized_mutation
    def begin_write(
        self,
        *,
        entry_id: str,
        output_path: str,
        expected_sha256: str,
        next_sha256: str,
    ) -> None:
        """Record an intended write; authorization is external."""
        self._validate_entry(entry_id, output_path)
        self._validate_sha(expected_sha256)
        self._validate_sha(next_sha256)

        data = self._load()
        self._ensure_path_not_claimed(data["records"], entry_id, output_path)

        existing = data["records"].get(entry_id)

        # An update requires a pre-existing ownership record.
        # First creation and explicit adoption will have separate APIs.
        if existing is None:
            raise ValueError("No ownership record for this output")

        if (
            existing["state"] != "managed"
            or existing["output_path"] != output_path
            or existing["sha256"] != expected_sha256
        ):
            raise ValueError("Previous ownership state does not match")

        # Never rely on the recorded hash alone.
        # Verify the actual file immediately before preparing the write.
        import hashlib
        import hmac
        import stat

        output = Path(output_path)

        try:
            current = output
            while True:
                if current.is_symlink():
                    raise ValueError("Symbolic link in output path")
                if current == current.parent:
                    break
                current = current.parent

            with output.open("rb") as stream:
                if not stat.S_ISREG(os.fstat(stream.fileno()).st_mode):
                    raise ValueError("Output is not a regular file")

                digest = hashlib.sha256()
                for chunk in iter(lambda: stream.read(65536), b""):
                    digest.update(chunk)

        except OSError as exc:
            raise ValueError("Unable to verify existing output") from exc

        if not hmac.compare_digest(
            digest.hexdigest(), expected_sha256
        ):
            raise ValueError("Output changed since last HVLS generation")

        data["records"][entry_id] = {
            "output_path": output_path,
            "expected_sha256": expected_sha256,
            "next_sha256": next_sha256,
            "state": "pending",
        }
        self._save(data)

    def complete_create(self, *, entry_id: str) -> None:
        """Standalone confirmation cannot establish file provenance."""
        raise ValueError(
            "Standalone creation confirmation is forbidden. "
            "Use create_reserved_output."
        )

    @_serialized_mutation
    def create_reserved_output(
        self, *, entry_id: str, content: bytes
    ) -> None:
        """Exclusively create and verify a previously reserved output.

        Prototype only: callers must still establish installation
        authorization, and registry operations need concurrency control.
        """
        import hashlib
        import hmac
        import stat

        if not isinstance(content, bytes):
            raise ValueError("Content must be bytes")

        data = self._load()
        record = data["records"].get(entry_id)

        if record is None or record["state"] != "pending_create":
            raise ValueError("No pending creation")

        expected = record["next_sha256"]
        if not hmac.compare_digest(
            hashlib.sha256(content).hexdigest(), expected
        ):
            raise ValueError("Content differs from reserved generation")

        output = Path(record["output_path"])
        if not output.is_absolute():
            raise ValueError("Output path must be absolute")

        current = output
        while True:
            if current.is_symlink():
                raise ValueError("Symbolic link in output path")
            if current == current.parent:
                break
            current = current.parent

        flags = os.O_RDWR | os.O_CREAT | os.O_EXCL
        flags |= getattr(os, "O_NOFOLLOW", 0)

        try:
            fd = os.open(output, flags, 0o600)
        except FileExistsError as exc:
            raise ValueError(
                "Output already exists; creation refused"
            ) from exc
        except OSError as exc:
            raise ValueError("Exclusive creation failed") from exc

        # Never remove a partially written file automatically:
        # recovery must examine it while the registry stays pending.
        try:
            with os.fdopen(fd, "w+b") as stream:
                stream.write(content)
                stream.flush()
                os.fsync(stream.fileno())

                stream.seek(0)
                actual = hashlib.sha256(stream.read()).hexdigest()
                created_stat = os.fstat(stream.fileno())

                if not stat.S_ISREG(created_stat.st_mode):
                    raise ValueError("Created output is not a regular file")

            if not hmac.compare_digest(actual, expected):
                raise ValueError("Created output digest mismatch")

            # Ensure that the destination still references the inode
            # created by this operation before recording ownership.
            current_stat = output.lstat()
            if (
                not stat.S_ISREG(current_stat.st_mode)
                or current_stat.st_dev != created_stat.st_dev
                or current_stat.st_ino != created_stat.st_ino
            ):
                raise ValueError("Created output was replaced")

            # Persist the created directory entry.
            directory_fd = os.open(
                output.parent,
                os.O_RDONLY | getattr(os, "O_DIRECTORY", 0),
            )
            try:
                os.fsync(directory_fd)
            finally:
                os.close(directory_fd)

            data["records"][entry_id] = {
                "output_path": str(output),
                "sha256": actual,
                "state": "managed",
            }
            self._save(data)

        except (OSError, ValueError) as exc:
            raise ValueError(
                "Creation incomplete; pending state requires recovery"
            ) from exc

    @_serialized_mutation
    def complete_write(
        self, *, entry_id: str, actual_sha256: str
    ) -> None:
        """Complete a pending transition if its digest matches."""
        self._validate_sha(actual_sha256)

        data = self._load()
        record = data["records"].get(entry_id)

        if record is None or record["state"] != "pending":
            raise ValueError("No pending write")

        if record["next_sha256"] != actual_sha256:
            raise ValueError("Final digest does not match pending write")

        # Verify the actual destination, not only the caller's claim.
        import hashlib
        import hmac
        import stat

        output = Path(record["output_path"])

        try:
            # Refuse symlinks in the destination and its ancestors.
            current = output
            while True:
                if current.is_symlink():
                    raise ValueError("Symbolic link in output path")
                if current == current.parent:
                    break
                current = current.parent

            with output.open("rb") as stream:
                if not stat.S_ISREG(os.fstat(stream.fileno()).st_mode):
                    raise ValueError("Output is not a regular file")

                digest = hashlib.sha256()
                for chunk in iter(lambda: stream.read(65536), b""):
                    digest.update(chunk)

        except (OSError, RuntimeError) as exc:
            raise ValueError("Unable to verify output file") from exc

        if not hmac.compare_digest(
            digest.hexdigest(), record["next_sha256"]
        ):
            raise ValueError("Output content does not match pending write")

        data["records"][entry_id] = {
            "output_path": record["output_path"],
            "sha256": actual_sha256,
            "state": "managed",
        }
        self._save(data)
