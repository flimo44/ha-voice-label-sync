"""Crash and concurrency regression tests for the dormant migration baseline/journal."""

from __future__ import annotations

import hashlib
import importlib.util
import json
import os
import sys
from pathlib import Path
from types import ModuleType

import pytest

COMPONENT = (
    Path(__file__).resolve().parents[1] / "custom_components" / "ha_voice_label_sync"
)
SOURCE = b"""# Keep this comment and byte formatting intact
google_assistant:
  project_id: demo-private
  secure_devices_pin: !secret pin
  expose_by_default: false
  entity_config: !include google_entity.yaml
"""
INCLUDED = b"""light.kitchen:
  expose: true
  name: Custom private name
lock.front:
  expose: false
"""


@pytest.fixture
def modules(monkeypatch):
    prefix = "_test_hvls_migration_recovery"
    package = ModuleType(prefix)
    package.__path__ = [str(COMPONENT)]
    monkeypatch.setitem(sys.modules, prefix, package)
    loaded = {}
    for stem in ("migration_discovery", "migration_baseline", "migration_journal"):
        name = f"{prefix}.{stem}"
        spec = importlib.util.spec_from_file_location(name, COMPONENT / f"{stem}.py")
        assert spec is not None and spec.loader is not None
        module = importlib.util.module_from_spec(spec)
        monkeypatch.setitem(sys.modules, name, module)
        spec.loader.exec_module(module)
        loaded[stem] = module
    return loaded


def _prepare(tmp_path, modules, *, include=True):
    (tmp_path / "configuration.yaml").write_bytes(SOURCE if include else b"google_assistant:\n  expose_by_default: false\n")
    if include:
        (tmp_path / "google_entity.yaml").write_bytes(INCLUDED)
    report = modules["migration_discovery"].discover_google_assistant(tmp_path)
    assert report["mode"] == "assisted_migration"
    assert report["source"]["status"] == "resolved"
    return report


def _ready(tmp_path, modules):
    report = _prepare(tmp_path, modules)
    baseline = modules["migration_baseline"].capture_baseline(tmp_path, report)
    journal = modules["migration_journal"].initialize_journal(tmp_path)
    assert baseline["verified"] is True
    assert journal["phase"] == "baseline_ready"
    return report, baseline, journal


def _intent(journal, tmp_path, *, revision):
    return journal.record_label_intent(
        tmp_path,
        operation_id="op_01",
        entity_id="light.kitchen",
        registry_id="registry_01",
        label_id="google_assistant",
        expected_before=False,
        expected_after=True,
        expected_revision=revision,
    )


def test_exact_raw_yaml_snapshot_and_idempotence(tmp_path, modules):
    discovery = _prepare(tmp_path, modules)
    base = modules["migration_baseline"]
    first = base.capture_baseline(tmp_path, discovery)
    again = base.capture_baseline(tmp_path, discovery)

    assert first == again
    assert first["verified"]
    assert len(first["files"]) == 2
    storage = tmp_path / ".storage" / "hvls_migration"
    assert (storage / "baseline" / "files" / "configuration.yaml").read_bytes() == SOURCE
    assert (storage / "baseline" / "files" / "google_entity.yaml").read_bytes() == INCLUDED
    assert os.stat(storage).st_mode & 0o077 == 0
    assert os.stat(storage / "baseline" / "files" / "configuration.yaml").st_mode & 0o077 == 0
    assert first["manifest_sha256"] == hashlib.sha256(
        (storage / "baseline" / "manifest.json").read_bytes()
    ).hexdigest()
    assert "demo-private" not in json.dumps(first)
    assert "Custom private name" not in json.dumps(first)


def test_snapshot_protects_original_after_changes(tmp_path, modules):
    discovery = _prepare(tmp_path, modules)
    baseline = modules["migration_baseline"]
    saved = baseline.capture_baseline(tmp_path, discovery)
    (tmp_path / "google_entity.yaml").write_text("light.other: {}\n")
    assert baseline.verify_baseline(tmp_path) == saved
    with pytest.raises(baseline.BaselineError, match="baseline_already_exists"):
        baseline.capture_baseline(tmp_path, modules["migration_discovery"].discover_google_assistant(tmp_path))
    with pytest.raises(baseline.BaselineError, match="source_changed_since_discovery"):
        baseline.capture_baseline(tmp_path, discovery)


def test_source_changed_before_first_copy_refused(tmp_path, modules):
    discovery = _prepare(tmp_path, modules)
    (tmp_path / "google_entity.yaml").write_text("light.changed: {}\n")
    with pytest.raises(
        modules["migration_baseline"].BaselineError,
        match="source_changed_since_discovery",
    ):
        modules["migration_baseline"].capture_baseline(tmp_path, discovery)
    assert not (tmp_path / ".storage" / "hvls_migration" / "baseline").exists()


def test_bad_and_unresolved_source_cannot_create_baseline(tmp_path, modules):
    report = _prepare(tmp_path, modules)
    report["global_blockers"] = ["duplicate_mapping_key"]
    baseline = modules["migration_baseline"]
    with pytest.raises(baseline.BaselineError, match="discovery_not_eligible"):
        baseline.capture_baseline(tmp_path, report)
    assert not (tmp_path / ".storage").exists()


@pytest.mark.parametrize("unsafe", ["../secrets.yaml", "/tmp/out.yaml", "a\\b.yaml", "a//b.yaml"])
def test_path_traversal_refused(tmp_path, modules, unsafe):
    discovery = _prepare(tmp_path, modules)
    discovery["source"]["locations"][0]["path"] = unsafe
    with pytest.raises(modules["migration_baseline"].BaselineError):
        modules["migration_baseline"].capture_baseline(tmp_path, discovery)


def test_symlink_source_and_storage_refused(tmp_path, modules):
    discovery = _prepare(tmp_path, modules)
    original = tmp_path / "google_entity.yaml"
    original.rename(tmp_path / "good.yaml")
    original.symlink_to(tmp_path / "good.yaml")
    with pytest.raises(
        modules["migration_baseline"].BaselineError, match="source_symlink"
    ):
        modules["migration_baseline"].capture_baseline(tmp_path, discovery)

    original.unlink()
    (tmp_path / "good.yaml").rename(original)
    (tmp_path / ".storage").symlink_to(tmp_path / "good.yaml")
    with pytest.raises(
        modules["migration_baseline"].BaselineError, match="ha_storage_unavailable"
    ):
        modules["migration_baseline"].capture_baseline(tmp_path, discovery)


def test_baseline_corruption_detected(tmp_path, modules):
    discovery = _prepare(tmp_path, modules)
    baseline = modules["migration_baseline"]
    baseline.capture_baseline(tmp_path, discovery)
    saved = tmp_path / ".storage" / "hvls_migration" / "baseline"
    (saved / "files" / "google_entity.yaml").write_text("corrupted\n")
    with pytest.raises(baseline.BaselineError, match="baseline_corrupt"):
        baseline.verify_baseline(tmp_path)


def test_interrupted_publish_does_not_expose_partial_baseline(
    tmp_path, modules, monkeypatch
):
    discovery = _prepare(tmp_path, modules)
    baseline = modules["migration_baseline"]

    def crash(*_args, **_kwargs):
        raise OSError("simulated crash before publish")

    monkeypatch.setattr(baseline.os, "rename", crash)
    with pytest.raises(OSError, match="simulated crash"):
        baseline.capture_baseline(tmp_path, discovery)
    storage = tmp_path / ".storage" / "hvls_migration"
    assert not (storage / "baseline").exists()
    assert not list(storage.glob(".baseline-pending-*"))
    assert not (storage / ".mutation.lock").exists()


def test_stale_lock_and_staging_require_manual_intervention(tmp_path, modules):
    discovery = _prepare(tmp_path, modules)
    baseline = modules["migration_baseline"]
    storage = baseline.storage_directory(tmp_path, create=True)
    lock = storage / ".mutation.lock"
    lock.write_text("incomplete")
    with pytest.raises(baseline.BaselineError, match="mutation_lock_unavailable"):
        baseline.capture_baseline(tmp_path, discovery)
    lock.unlink()
    (storage / ".baseline-pending-crash").mkdir()
    with pytest.raises(baseline.BaselineError, match="interrupted_baseline_staging"):
        baseline.capture_baseline(tmp_path, discovery)


def test_journal_lifecycle_and_revision_cas(tmp_path, modules):
    _ready(tmp_path, modules)
    journal = modules["migration_journal"]
    first = journal.advance_phase(tmp_path, "labels_staging", expected_revision=0)
    assert first["revision"] == 1
    intent = _intent(journal, tmp_path, revision=1)
    assert intent["operations"][0]["status"] == "intent"
    assert intent["revision"] == 2
    with pytest.raises(journal.JournalError, match="journal_revision_conflict"):
        _intent(journal, tmp_path, revision=1)
    with pytest.raises(journal.JournalError, match="unresolved_label_intents"):
        journal.advance_phase(tmp_path, "labels_staged", expected_revision=2)

    applied = journal.mark_label_applied(
        tmp_path, "op_01", registry_id="registry_01",
        current_membership=True, expected_revision=2,
    )
    assert applied["operations"][0]["status"] == "applied"
    assert applied["revision"] == 3
    assert journal.advance_phase(
        tmp_path, "labels_staged", expected_revision=3
    )["phase"] == "labels_staged"


def test_journal_never_guesses_unconfirmed_intent(tmp_path, modules):
    _ready(tmp_path, modules)
    journal = modules["migration_journal"]
    journal.advance_phase(tmp_path, "labels_staging", expected_revision=0)
    _intent(journal, tmp_path, revision=1)
    for current in (True, False):
        report = journal.recovery_report(
            tmp_path,
            {"light.kitchen": {
                "registry_id": "registry_01", "has_label": current
            }},
        )
        assert report["operations"][0]["status"] == "unconfirmed_intent"
        assert report["needs_review"]
        assert report["cutover_allowed"] is False
    with pytest.raises(journal.JournalError, match="label_apply_conflict"):
        journal.mark_label_applied(
            tmp_path, "op_01", registry_id="different",
            current_membership=True, expected_revision=2,
        )


def test_rollback_records_only_exact_expected_membership(tmp_path, modules):
    _ready(tmp_path, modules)
    journal = modules["migration_journal"]
    journal.advance_phase(tmp_path, "labels_staging", expected_revision=0)
    _intent(journal, tmp_path, revision=1)
    journal.mark_label_applied(
        tmp_path, "op_01", registry_id="registry_01",
        current_membership=True, expected_revision=2,
    )
    journal.advance_phase(tmp_path, "rollback_pending", expected_revision=3)
    report = journal.recovery_report(
        tmp_path,
        {"light.kitchen": {"registry_id": "registry_01", "has_label": True}},
    )
    assert report["operations"][0]["status"] == "applied_verified"
    with pytest.raises(journal.JournalError, match="label_rollback_conflict"):
        journal.mark_label_rolled_back(
            tmp_path, "op_01", registry_id="registry_01",
            current_membership=True, expected_revision=4,
        )
    rolled = journal.mark_label_rolled_back(
        tmp_path, "op_01", registry_id="registry_01",
        current_membership=False, expected_revision=4,
    )
    assert rolled["operations"][0]["status"] == "rolled_back"
    final = journal.advance_phase(tmp_path, "rolled_back", expected_revision=5)
    assert final["phase"] == "rolled_back"
    assert journal.recovery_report(
        tmp_path,
        {"light.kitchen": {"registry_id": "registry_01", "has_label": False}},
    )["needs_review"] is False


def test_journal_corruption_not_reinitialized(tmp_path, modules):
    _ready(tmp_path, modules)
    journal = modules["migration_journal"]
    target = tmp_path / ".storage" / "hvls_migration" / "journal.json"
    target.write_text("{ broken")
    with pytest.raises(journal.JournalError, match="journal_unavailable"):
        journal.read_journal(tmp_path)
    with pytest.raises(journal.JournalError, match="journal_unavailable"):
        journal.initialize_journal(tmp_path)


def test_journal_write_failure_preserves_previous_committed_record(
    tmp_path, modules, monkeypatch
):
    _ready(tmp_path, modules)
    journal = modules["migration_journal"]
    before = journal.read_journal(tmp_path)

    def refused(*_args, **_kwargs):
        raise OSError("disk full on atomic replace")

    monkeypatch.setattr(journal.os, "replace", refused)
    with pytest.raises(OSError, match="disk full"):
        journal.advance_phase(tmp_path, "labels_staging", expected_revision=0)
    assert journal.read_journal(tmp_path) == before
    assert not list(
        (tmp_path / ".storage" / "hvls_migration").glob(".journal-pending-*")
    )


def test_no_yaml_or_registry_write_during_baseline_and_journal(
    tmp_path, modules, monkeypatch
):
    discovery = _prepare(tmp_path, modules)
    original_main = (tmp_path / "configuration.yaml").read_bytes()
    original_include = (tmp_path / "google_entity.yaml").read_bytes()

    def forbidden(*_args, **_kwargs):
        raise AssertionError("Unexpected user YAML / HA registry mutation")

    # Our migration modules use strict private os.open() + fsync writes.
    monkeypatch.setattr(Path, "write_text", forbidden)
    monkeypatch.setattr(Path, "write_bytes", forbidden)
    modules["migration_baseline"].capture_baseline(tmp_path, discovery)
    modules["migration_journal"].initialize_journal(tmp_path)
    assert (tmp_path / "configuration.yaml").read_bytes() == original_main
    assert (tmp_path / "google_entity.yaml").read_bytes() == original_include
    assert modules["migration_journal"].read_journal(tmp_path)["revision"] == 0
