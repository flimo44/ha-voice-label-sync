"""Safety checks before applying a reviewed HVLS preview."""

from __future__ import annotations

import hashlib


class PreviewChangedError(Exception):
    """The configuration no longer matches the reviewed preview."""


def preview_digest(content: str) -> str:
    """Return the SHA-256 digest of a generated configuration."""
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def validate_preview_content(
    reviewed_content: str,
    generated_content: str,
) -> None:
    """Reject any difference between reviewed and generated YAML."""
    if reviewed_content != generated_content:
        raise PreviewChangedError(
            "Configuration changed since Preview. "
            "Generate a new Preview before applying."
        )


def production_digest(path):
    """Return the digest of a production file, or None if missing."""
    try:
        content = path.read_bytes()
    except FileNotFoundError:
        return None

    return hashlib.sha256(content).hexdigest()


def validate_production_unchanged(path, expected_digest):
    """Reject changes to production since the Preview was reviewed."""
    import hmac

    current_digest = production_digest(path)

    if current_digest is None or expected_digest is None:
        if current_digest != expected_digest:
            raise PreviewChangedError(
                "Production changed since Preview. Review it again."
            )
        return

    if not hmac.compare_digest(current_digest, expected_digest):
        raise PreviewChangedError("Production changed since Preview. Review it again.")
