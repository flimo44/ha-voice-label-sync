"""Tests for safe Preview validation."""

import importlib.util
from pathlib import Path

import pytest

MODULE = (
    Path(__file__).resolve().parents[1]
    / "custom_components/ha_voice_label_sync/preview_guard.py"
)

spec = importlib.util.spec_from_file_location("hvls_preview_guard", MODULE)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def test_identical_preview_is_accepted():
    content = "switch.pompe:\n  expose: true\n"
    module.validate_preview_content(content, content)


def test_changed_preview_is_rejected():
    preview = "switch.pompe:\n  expose: true\n"
    generated = "switch.pompe:\n  expose: false\n"

    with pytest.raises(module.PreviewChangedError):
        module.validate_preview_content(preview, generated)


def test_digest_is_stable_and_detects_changes():
    first = "switch.pompe:\n  expose: true\n"
    second = "switch.pompe:\n  expose: false\n"

    assert module.preview_digest(first) == module.preview_digest(first)
    assert module.preview_digest(first) != module.preview_digest(second)


def test_production_digest_and_unchanged(tmp_path):
    output = tmp_path / "production.yaml"
    output.write_text("ancienne configuration\n", encoding="utf-8")

    digest = module.production_digest(output)

    module.validate_production_unchanged(output, digest)


def test_production_changed_is_rejected(tmp_path):
    output = tmp_path / "production.yaml"
    output.write_text("ancienne configuration\n", encoding="utf-8")

    digest = module.production_digest(output)
    output.write_text("configuration modifiée\n", encoding="utf-8")

    with pytest.raises(module.PreviewChangedError):
        module.validate_production_unchanged(output, digest)


def test_missing_production_is_supported(tmp_path):
    output = tmp_path / "production.yaml"

    assert module.production_digest(output) is None
    module.validate_production_unchanged(output, None)

    output.write_text("nouvelle configuration\n", encoding="utf-8")

    with pytest.raises(module.PreviewChangedError):
        module.validate_production_unchanged(output, None)


def test_deleted_production_is_rejected(tmp_path):
    output = tmp_path / "production.yaml"
    output.write_text("ancienne configuration\n", encoding="utf-8")

    digest = module.production_digest(output)
    output.unlink()

    with pytest.raises(module.PreviewChangedError):
        module.validate_production_unchanged(output, digest)


def test_production_digest_preserves_crlf(tmp_path):
    import hashlib

    output = tmp_path / "production.yaml"
    content = b"switch.pompe:\r\n  expose: true\r\n"
    output.write_bytes(content)

    assert module.production_digest(output) == hashlib.sha256(content).hexdigest()


def test_production_created_after_review_is_rejected(tmp_path):
    """A production file created after review must not be overwritten."""
    output = tmp_path / "production.yaml"

    assert module.production_digest(output) is None

    # Another process creates the production file after review.
    original = b"switch.existant:\n  expose: true\n"
    output.write_bytes(original)

    try:
        module.validate_production_unchanged(output, None)
    except module.PreviewChangedError:
        pass
    else:
        raise AssertionError(
            "Production created after review was incorrectly accepted."
        )

    # Validation must leave the existing file untouched.
    assert output.read_bytes() == original


def test_production_removed_after_review_is_rejected(tmp_path):
    """A deleted production file must not be silently recreated."""
    output = tmp_path / "production.yaml"
    output.write_bytes(b"configuration initiale\n")

    expected = module.production_digest(output)
    output.unlink()

    try:
        module.validate_production_unchanged(output, expected)
    except module.PreviewChangedError:
        pass
    else:
        raise AssertionError(
            "Production deleted after review was incorrectly accepted."
        )

    assert not output.exists()
