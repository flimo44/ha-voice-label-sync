"""Safety rules for HVLS output ownership."""

from pathlib import Path

import pytest


@pytest.fixture
def ownership():
    from hvls.output_ownership import evaluate_output_ownership
    return evaluate_output_ownership


def test_new_output_allowed(ownership, tmp_path):
    output = tmp_path / "generated.yaml"

    result = ownership(output, evidence=None)

    assert result.status == "new"
    assert result.write_allowed is True


def test_manual_file_protected(ownership, tmp_path):
    output = tmp_path / "google.yaml"
    original = "light.salon:\n  expose: false\n"
    output.write_text(original, encoding="utf-8")

    result = ownership(output, evidence=None)

    assert result.status == "unmanaged"
    assert result.write_allowed is False
    assert output.read_text() == original


def test_matching_ownership_allows_write(ownership, tmp_path):
    import hashlib

    output = tmp_path / "generated.yaml"
    content = "# Fichier généré automatiquement.\n"
    output.write_text(content, encoding="utf-8")

    evidence = {
        "path": str(output.resolve()),
        "sha256": hashlib.sha256(content.encode()).hexdigest(),
        "source": "hvls_generation",
    }

    result = ownership(output, evidence=evidence)

    assert result.status == "managed"
    assert result.write_allowed is True


def test_modified_managed_file_protected(ownership, tmp_path):
    import hashlib

    output = tmp_path / "generated.yaml"
    original = "# Fichier généré automatiquement.\n"
    output.write_text(original, encoding="utf-8")

    evidence = {
        "path": str(output.resolve()),
        "sha256": hashlib.sha256(original.encode()).hexdigest(),
        "source": "hvls_generation",
    }

    output.write_text("light.modified: {}\n", encoding="utf-8")

    result = ownership(output, evidence=evidence)

    assert result.status == "changed"
    assert result.write_allowed is False
    assert output.read_text() == "light.modified: {}\n"


def test_symbolic_link_refused(ownership, tmp_path):
    real_file = tmp_path / "real.yaml"
    real_file.write_text("light.test: {}\n", encoding="utf-8")

    link = tmp_path / "generated.yaml"
    link.symlink_to(real_file)

    result = ownership(link, evidence=None)

    assert result.status == "unknown"
    assert result.write_allowed is False


def test_wrong_file_path_refused(ownership, tmp_path):
    import hashlib

    output = tmp_path / "generated.yaml"
    content = "light.test: {}\n"
    output.write_text(content, encoding="utf-8")

    evidence = {
        "path": str(tmp_path / "another.yaml"),
        "sha256": hashlib.sha256(content.encode()).hexdigest(),
        "source": "hvls_generation",
    }

    result = ownership(output, evidence=evidence)

    assert result.status == "unknown"
    assert result.write_allowed is False


def test_missing_previously_managed_file_refused(ownership, tmp_path):
    output = tmp_path / "generated.yaml"

    evidence = {
        "path": str(output),
        "sha256": "0" * 64,
        "source": "hvls_generation",
    }

    result = ownership(output, evidence=evidence)

    assert result.status == "unknown"
    assert result.write_allowed is False


def test_invalid_digest_refused(ownership, tmp_path):
    output = tmp_path / "generated.yaml"
    output.write_text("light.test: {}\n", encoding="utf-8")

    evidence = {
        "path": str(output),
        "sha256": "invalid",
        "source": "hvls_generation",
    }

    result = ownership(output, evidence=evidence)

    assert result.status == "unknown"
    assert result.write_allowed is False
