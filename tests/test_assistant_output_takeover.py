"""Backup-first existing YAML takeover: no implicit Apply or file replacement."""

from __future__ import annotations

import hashlib
import importlib.util
import sys
from pathlib import Path
from types import ModuleType

import pytest

from hvls.output_ownership_registry import OwnershipRegistry

COMPONENT = (
    Path(__file__).resolve().parents[1] / "custom_components" / "ha_voice_label_sync"
)


@pytest.fixture
def takeover(monkeypatch):
    prefix = "_test_existing_output_takeover"
    package = ModuleType(prefix)
    package.__path__ = [str(COMPONENT)]
    monkeypatch.setitem(sys.modules, prefix, package)
    for stem in (
        "migration_discovery", "assistant_entity_file",
        "preview_compare", "assistant_output_takeover",
    ):
        spec = importlib.util.spec_from_file_location(
            f"{prefix}.{stem}", COMPONENT / f"{stem}.py"
        )
        assert spec and spec.loader
        module = importlib.util.module_from_spec(spec)
        monkeypatch.setitem(sys.modules, f"{prefix}.{stem}", module)
        spec.loader.exec_module(module)
    return sys.modules[f"{prefix}.assistant_output_takeover"]


@pytest.fixture
def files(tmp_path):
    output = tmp_path / "google_assistant_entities.yaml"
    output.write_text(
        "switch.pump:\n  expose: true\n  name: Pompe\n  room: Piscine\n",
        encoding="utf-8",
    )
    preview = tmp_path / ".hvls" / "preview.yaml"
    preview.parent.mkdir()
    preview.write_text(
        "switch.pump:\n  expose: true\n  name: Pompe\n  room: Piscine\n"
        "switch.extra:\n  expose: true\n",
        encoding="utf-8",
    )
    return {
        "config_dir": tmp_path, "output_path": output,
        "preview_path": preview,
        "registry_path": tmp_path / ".hvls" / "ownership.json",
        "entry_id": "installation-A",
        "selected_relative_path": output.name,
    }


def test_preparation_is_read_only_and_shows_diff(takeover, files):
    original = files["output_path"].read_bytes()
    result = takeover.prepare_existing_output_takeover(**files)
    assert result["eligible"] is True
    assert result["entities"] == 1
    assert result["issues"] == 0
    assert result["changes"] == {"added": 1, "removed": 0, "modified": 0}
    assert result["production_sha256"] == hashlib.sha256(original).hexdigest()
    assert result["selected_path"] == files["selected_relative_path"]
    assert "output" not in result and "registry" not in result
    assert files["output_path"].read_bytes() == original
    assert not files["registry_path"].exists()
    assert not (files["config_dir"] / ".hvls_backups").exists()


def test_confirm_preserves_production_and_requires_mandatory_backup(takeover, files):
    original = files["output_path"].read_bytes()
    review = takeover.prepare_existing_output_takeover(**files)
    result = takeover.confirm_existing_output_takeover(
        **files, production_sha256=review["production_sha256"],
        preview_sha256=review["preview_sha256"], confirmed=True,
    )
    assert result["taken_over"] is True
    assert result["apply_performed"] is False
    assert result["production_unchanged"] is True
    assert files["output_path"].read_bytes() == original
    backup = files["config_dir"] / ".hvls_backups" / result["backup_name"]
    assert backup.read_bytes() == original
    assert OwnershipRegistry(files["registry_path"]).get_record(
        "installation-A"
    ) == {
        "state": "managed",
        "output_path": str(files["output_path"]),
        "sha256": hashlib.sha256(original).hexdigest(),
    }
    with pytest.raises(takeover.ExistingOutputTakeoverError):
        takeover.prepare_existing_output_takeover(**files)


def test_stale_source_or_preview_never_registers_ownership(takeover, files):
    review = takeover.prepare_existing_output_takeover(**files)
    for changed in ("output_path", "preview_path"):
        original = files[changed].read_bytes()
        files[changed].write_bytes(original + b"# changed\n")
        with pytest.raises(takeover.ExistingOutputTakeoverError):
            takeover.confirm_existing_output_takeover(
                **files, production_sha256=review["production_sha256"],
                preview_sha256=review["preview_sha256"], confirmed=True,
            )
        assert not files["registry_path"].exists()
        files[changed].write_bytes(original)


@pytest.mark.parametrize("confirmed,sha", [
    (False, "a" * 64), (None, "a" * 64), (True, "invalid"),
])
def test_missing_confirmation_or_invalid_digest_refused(
    takeover, files, confirmed, sha
):
    review = takeover.prepare_existing_output_takeover(**files)
    with pytest.raises(takeover.ExistingOutputTakeoverError):
        takeover.confirm_existing_output_takeover(
            **files, production_sha256=sha,
            preview_sha256=review["preview_sha256"], confirmed=confirmed,
        )
    assert not files["registry_path"].exists()


def test_wrong_path_and_other_owner_cannot_take_over(takeover, files):
    wrong = {**files, "selected_relative_path": "another.yaml"}
    with pytest.raises(takeover.ExistingOutputTakeoverError):
        takeover.prepare_existing_output_takeover(**wrong)
    original = files["output_path"].read_bytes()
    OwnershipRegistry(files["registry_path"]).record_generation(
        entry_id="other-installation",
        output_path=str(files["output_path"]),
        sha256=hashlib.sha256(original).hexdigest(),
    )
    with pytest.raises(takeover.ExistingOutputTakeoverError):
        takeover.prepare_existing_output_takeover(**files)
    assert files["output_path"].read_bytes() == original


def test_backup_failure_preserves_original_and_cannot_claim(
    takeover, files, monkeypatch
):
    review = takeover.prepare_existing_output_takeover(**files)
    original = files["output_path"].read_bytes()

    def broken_backup(*args):
        raise OSError("backup unavailable")

    monkeypatch.setattr(takeover, "_create_unique_safety_backup", broken_backup)
    with pytest.raises(OSError):
        takeover.confirm_existing_output_takeover(
            **files, production_sha256=review["production_sha256"],
            preview_sha256=review["preview_sha256"], confirmed=True,
        )
    assert files["output_path"].read_bytes() == original
    assert not files["registry_path"].exists()


def test_symlink_or_invalid_yaml_cannot_be_claimed(takeover, files):
    output = files["output_path"]
    original = output.read_bytes()
    target = files["config_dir"] / "actual.yaml"
    target.write_bytes(original)
    output.unlink()
    output.symlink_to(target)
    with pytest.raises(Exception):
        takeover.prepare_existing_output_takeover(**files)
    output.unlink()
    output.write_text("invalid: [yaml", encoding="utf-8")
    with pytest.raises(takeover.ExistingOutputTakeoverError):
        takeover.prepare_existing_output_takeover(**files)
