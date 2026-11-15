"""Fail-closed validation of the configured HVLS production file path.

Keep the *configured spelling* intact: ownership records and approvals refer to
that path. Resolve only for safety checks, including installations where /config
is an alias of /homeassistant.
"""

from __future__ import annotations

import stat
from pathlib import Path


class UnsafeOutputPath(ValueError):
    """A configured output could escape or alias an unsafe filesystem path."""


def resolve_output_path(config_dir: str | Path, value: str | Path) -> Path:
    """Return an absolute, safe output path without changing its spelling.

    The root itself may be a symlink (HA OS uses configuration path aliases).
    Links *inside* the configuration tree, including output files, are refused.
    Does not create directories, modify files or grant ownership.
    """
    if not isinstance(value, (str, Path)) or not str(value).strip():
        raise UnsafeOutputPath("Output path is missing.")

    requested = Path(value)
    if ".." in requested.parts:
        raise UnsafeOutputPath("Parent traversal is not allowed in output paths.")

    configured_root = Path(config_dir)
    output = requested if requested.is_absolute() else configured_root / requested

    try:
        root = configured_root.resolve(strict=False)
        resolved = output.resolve(strict=False)
        relative = resolved.relative_to(root)
        if not relative.parts:
            raise UnsafeOutputPath("Output must be a file inside HA config.")

        # Locate the outermost alias of the configuration root, if any.
        # This permits /config -> /homeassistant but never links beneath it.
        alias_root = next(
            (
                parent for parent in reversed(output.parents)
                if parent.resolve(strict=False) == root
            ),
            None,
        )
        if alias_root is None:
            raise UnsafeOutputPath("Output must remain inside HA config.")

        current = alias_root
        for part in output.relative_to(alias_root).parts:
            current = current / part
            if current.is_symlink():
                raise UnsafeOutputPath("Symlink in output path is not allowed.")

        # Existing outputs must be regular files, not directories, devices
        # or named pipes. A missing file remains valid for first creation.
        try:
            metadata = output.lstat()
        except FileNotFoundError:
            pass
        else:
            if not stat.S_ISREG(metadata.st_mode):
                raise UnsafeOutputPath("Output path is not a regular YAML file.")
    except (OSError, RuntimeError, ValueError) as exc:
        if isinstance(exc, UnsafeOutputPath):
            raise
        raise UnsafeOutputPath(
            "Output path is unsafe or outside the HA config directory."
        ) from exc

    return output
