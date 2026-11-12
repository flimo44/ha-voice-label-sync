"""Read-only evaluation of HVLS output ownership.

This module does not authorize writes. Ownership evidence must be
persisted and authenticated by a trusted HVLS workflow before use.
"""

from __future__ import annotations

import hashlib
import hmac
from collections.abc import Mapping
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class OwnershipResult:
    status: str
    write_allowed: bool
    reason: str


def evaluate_output_ownership(
    output_path: Path,
    evidence: Mapping[str, Any] | None = None,
) -> OwnershipResult:
    """Evaluate an output file without modifying it.

    write_allowed is a preliminary eligibility result, not permission
    to write. The caller must validate evidence provenance and perform
    final checks immediately before any replacement.
    """
    path = Path(output_path)

    try:
        if path.is_symlink():
            return OwnershipResult(
                "unknown", False, "Output is a symbolic link."
            )

        # Reject symbolic-link ancestors too.
        current = path.absolute().parent
        while current != current.parent:
            if current.is_symlink():
                return OwnershipResult(
                    "unknown", False, "Output parent is a symbolic link."
                )
            current = current.parent

        resolved = path.resolve(strict=False)

        if not path.exists():
            if evidence is not None:
                return OwnershipResult(
                    "unknown", False, "Previously managed file is missing."
                )
            return OwnershipResult("new", True, "Output does not exist.")

        if not path.is_file():
            return OwnershipResult(
                "unknown", False, "Output is not a regular file."
            )

        if not isinstance(evidence, Mapping):
            return OwnershipResult(
                "unmanaged", False, "No ownership evidence."
            )

        if (
            evidence.get("source") != "hvls_generation"
            or evidence.get("path") != str(resolved)
        ):
            return OwnershipResult(
                "unknown", False, "Ownership evidence is invalid."
            )

        expected_digest = evidence.get("sha256")
        if (
            not isinstance(expected_digest, str)
            or len(expected_digest) != 64
            or any(c not in "0123456789abcdef" for c in expected_digest)
        ):
            return OwnershipResult(
                "unknown", False, "Missing or invalid file digest."
            )

        digest = hashlib.sha256()
        with path.open("rb") as stream:
            for chunk in iter(lambda: stream.read(65536), b""):
                digest.update(chunk)

        if not hmac.compare_digest(digest.hexdigest(), expected_digest):
            return OwnershipResult(
                "changed", False, "File changed since recorded generation."
            )

        return OwnershipResult(
            "managed", True, "File matches supplied ownership evidence."
        )

    except (OSError, ValueError, RuntimeError):
        return OwnershipResult(
            "unknown", False, "Unable to verify output safely."
        )
