"""Durable non-authorizing migration decision draft storage regressions."""

from __future__ import annotations

import ast
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
MAIN = b"""# Original handwritten Google Assistant configuration.
google_assistant:
  project_id: SECRET_PROJECT_IDENTIFIER
  expose_by_default: false
  entity_config: !include ga_entities.yaml
"""
ENTITIES = b"""light.safe:
  expose: true
  name: "PRIVATE KITCHEN"
  aliases: ["Lamp cafe"]
light.bad:
  expose: true
  room: [unknown, shape]
lock.front:
  expose: false
"""


@pytest.fixture
def modules(monkeypatch):
    prefix = "_test_hvls_decision_draft"
    package = ModuleType(prefix)
    package.__path__ = [str(COMPONENT)]
    monkeypatch.setitem(sys.modules, prefix, package)
    loaded = {}
    for stem in (
        "migration_discovery", "migration_baseline", "migration_journal",
        "migration_stage_plan", "migration_stage_executor",
        "migration_decision_draft",
    ):
        name = f"{prefix}.{stem}"
        spec = importlib.util.spec_from_file_location(
            name, COMPONENT / f"{stem}.py"
        )
        assert spec is not None and spec.loader is not None
        module = importlib.util.module_from_spec(spec)
        monkeypatch.setitem(sys.modules, name, module)
        spec.loader.exec_module(module)
        loaded[stem] = module
    return loaded


def _config(tmp_path):
    (tmp_path / "configuration.yaml").write_bytes(MAIN)
    (tmp_path / "ga_entities.yaml").write_bytes(ENTITIES)


def _setup(tmp_path, modules):
    _config(tmp_path)
    discovery = modules["migration_discovery"].discover_google_assistant(
        tmp_path
    )
    assert discovery["source"]["status"] == "resolved"
    base = modules["migration_baseline"].capture_baseline(
        tmp_path, discovery
    )
    journal = modules["migration_journal"].initialize_journal(tmp_path)
    source = modules["migration_stage_plan"]._source_token(discovery)
    assert source
    return {
        "manifest": base["manifest_sha256"],
        "journal": journal["revision"],
        "source": source,
        "locations": discovery["source"]["locations"],
    }


def _save(tmp_path, modules, info, *, decisions=None, revision=-1,
          journal_revision=0, token="c" * 64, expected_token=None,
          allowed=None):
    if decisions is None:
        decisions = {
            "light.safe": {
                "action": "import",
                "metadata_policy": "retain_manual_yaml",
            },
            "light.bad": {"action": "keep"},
        }
    return modules["migration_decision_draft"].save_review_draft(
        tmp_path,
        decisions=decisions,
        allowed_entity_ids=(
            allowed if allowed is not None
            else {"light.safe", "light.bad", "lock.front"}
        ),
        source_locations=info["locations"],
        source_evidence_sha256=info["source"],
        fresh_review_token_sha256=token,
        expected_review_token_sha256=(
            expected_token if expected_token is not None else token
        ),
        expected_baseline_manifest_sha256=info["manifest"],
        expected_journal_revision=journal_revision,
        expected_draft_revision=revision,
        administrator_id="ha-admin-17",
    )


def _raw(tmp_path):
    return (
        tmp_path / ".storage" / "hvls_migration" / "review-draft.json"
    )


def test_preexisting_baseline_and_journal_required(tmp_path, modules):
    _config(tmp_path)
    with pytest.raises(modules["migration_decision_draft"].DecisionDraftError):
        _save(tmp_path, modules, {
            "locations": [], "source": "a" * 64, "manifest": "b" * 64
        })
    assert not _raw(tmp_path).exists()


def test_missing_draft_can_be_read_without_creating_one(tmp_path, modules):
    _setup(tmp_path, modules)
    result = modules["migration_decision_draft"].load_review_draft(tmp_path)
    assert result["status"] == "not_saved"
    assert result["draft_revision"] == -1
    assert result["decisions"] == {}
    assert result["cutover_allowed"] is False
    assert not _raw(tmp_path).exists()


def test_save_and_restore_exact_decisions_with_private_safe_response(
    tmp_path, modules
):
    info = _setup(tmp_path, modules)
    saved = _save(tmp_path, modules, info)
    assert saved["status"] == "saved_unapproved_draft"
    assert saved["draft_revision"] == 0
    assert saved["saved_decision_count"] == 2
    assert saved["cutover_allowed"] is False
    assert saved["apply_allowed"] is False
    assert "decisions" not in saved
    loaded = modules["migration_decision_draft"].load_review_draft(tmp_path)
    assert loaded["decisions"] == {
        "light.bad": {"action": "keep"},
        "light.safe": {
            "action": "import",
            "metadata_policy": "retain_manual_yaml",
        },
    }
    assert _raw(tmp_path).stat().st_mode & 0o077 == 0
    assert (tmp_path / "configuration.yaml").read_bytes() == MAIN
    assert (tmp_path / "ga_entities.yaml").read_bytes() == ENTITIES
    content = json.dumps(loaded) + _raw(tmp_path).read_text()
    for private in ("SECRET_PROJECT_IDENTIFIER", "PRIVATE KITCHEN", "Lamp cafe"):
        assert private not in content
    assert _raw(tmp_path).exists()
    assert not (
        tmp_path / ".storage" / "hvls_migration" / ".mutation.lock"
    ).exists()


def test_draft_revision_compare_and_swap_prevents_lost_updates(
    tmp_path, modules
):
    info = _setup(tmp_path, modules)
    first = _save(tmp_path, modules, info)
    assert first["draft_revision"] == 0
    second = _save(
        tmp_path, modules, info, revision=0,
        decisions={"light.safe": {"action": "keep"}}
    )
    assert second["draft_revision"] == 1
    with pytest.raises(
        modules["migration_decision_draft"].DecisionDraftError,
        match="draft_revision_conflict"
    ):
        _save(
            tmp_path, modules, info, revision=0,
            decisions={"light.bad": {"action": "remove"}},
        )
    loaded = modules["migration_decision_draft"].load_review_draft(tmp_path)
    assert loaded["draft_revision"] == 1
    assert loaded["decisions"] == {"light.safe": {"action": "keep"}}


def test_new_draft_does_not_replace_existing_file(tmp_path, modules):
    info = _setup(tmp_path, modules)
    _save(tmp_path, modules, info)
    original = _raw(tmp_path).read_bytes()
    with pytest.raises(
        modules["migration_decision_draft"].DecisionDraftError,
        match="draft_revision_conflict"
    ):
        _save(tmp_path, modules, info, revision=-1)
    assert _raw(tmp_path).read_bytes() == original


def test_fresh_server_plan_token_required(tmp_path, modules):
    info = _setup(tmp_path, modules)
    with pytest.raises(
        modules["migration_decision_draft"].DecisionDraftError,
        match="stale_or_invalid_review_confirmation",
    ):
        _save(
            tmp_path, modules, info,
            expected_token="f" * 64,
        )
    assert not _raw(tmp_path).exists()


def test_original_source_change_blocks_draft_save(tmp_path, modules):
    info = _setup(tmp_path, modules)
    (tmp_path / "ga_entities.yaml").write_bytes(
        ENTITIES + b"# externally modified\n"
    )
    with pytest.raises(
        modules["migration_decision_draft"].DecisionDraftError,
        match="original_sources_changed",
    ):
        _save(tmp_path, modules, info)
    assert not _raw(tmp_path).exists()


def test_journal_transition_blocks_new_saved_choices(tmp_path, modules):
    info = _setup(tmp_path, modules)
    journal = modules["migration_journal"]
    journal.advance_phase(
        tmp_path, "labels_staging", expected_revision=0
    )
    with pytest.raises(
        modules["migration_decision_draft"].DecisionDraftError,
        match="journal_changed_or_not_ready",
    ):
        _save(tmp_path, modules, info)
    assert not _raw(tmp_path).exists()


def test_prior_saved_draft_is_stale_when_journal_changes(
    tmp_path, modules
):
    info = _setup(tmp_path, modules)
    _save(tmp_path, modules, info)
    modules["migration_journal"].advance_phase(
        tmp_path, "labels_staging", expected_revision=0
    )
    loaded = modules["migration_decision_draft"].load_review_draft(tmp_path)
    assert loaded["status"] == "stale_journal"
    assert loaded["cutover_allowed"] is False


def test_baseline_corruption_blocks_load_and_future_save(
    tmp_path, modules
):
    info = _setup(tmp_path, modules)
    _save(tmp_path, modules, info)
    original = _raw(tmp_path).read_bytes()
    protected = (
        tmp_path / ".storage" / "hvls_migration" / "baseline"
        / "files" / "ga_entities.yaml"
    )
    protected.write_bytes(b"CORRUPTED")
    with pytest.raises(modules["migration_decision_draft"].DecisionDraftError):
        modules["migration_decision_draft"].load_review_draft(tmp_path)
    with pytest.raises(modules["migration_decision_draft"].DecisionDraftError):
        _save(tmp_path, modules, info, revision=0)
    assert _raw(tmp_path).read_bytes() == original


def test_corrupt_or_permissive_draft_not_overwritten(
    tmp_path, modules
):
    info = _setup(tmp_path, modules)
    _save(tmp_path, modules, info)
    original = _raw(tmp_path).read_bytes()
    _raw(tmp_path).write_text("{broken")
    with pytest.raises(
        modules["migration_decision_draft"].DecisionDraftError,
        match="draft_unavailable_or_corrupt"
    ):
        _save(tmp_path, modules, info, revision=0)
    assert _raw(tmp_path).read_text() == "{broken"
    _raw(tmp_path).write_bytes(original)
    _raw(tmp_path).chmod(0o644)
    with pytest.raises(
        modules["migration_decision_draft"].DecisionDraftError,
        match="draft_invalid_file"
    ):
        _save(tmp_path, modules, info, revision=0)
    assert _raw(tmp_path).read_bytes() == original


def test_symlink_draft_refuses_to_follow_or_replace(
    tmp_path, modules
):
    info = _setup(tmp_path, modules)
    outside = tmp_path / "external_sensitive.json"
    outside.write_text("external")
    _raw(tmp_path).symlink_to(outside)
    with pytest.raises(
        modules["migration_decision_draft"].DecisionDraftError,
        match="draft_invalid_file",
    ):
        _save(tmp_path, modules, info)
    assert outside.read_text() == "external"


def test_invalid_entity_choice_and_unknown_id_rejected_before_write(
    tmp_path, modules
):
    info = _setup(tmp_path, modules)
    errors = modules["migration_decision_draft"].DecisionDraftError
    with pytest.raises(errors, match="invalid_entity_decision"):
        _save(
            tmp_path, modules, info,
            decisions={"light.safe": {"action": "explode"}}
        )
    with pytest.raises(errors, match="decision_for_unknown_entity"):
        _save(
            tmp_path, modules, info,
            decisions={"light.unreviewed": {"action": "keep"}}
        )
    assert not _raw(tmp_path).exists()


def test_local_invalid_google_metadata_does_not_block_draft(
    tmp_path, modules
):
    info = _setup(tmp_path, modules)
    # The original Google YAML has one invalid room list (light.bad).
    saved = _save(
        tmp_path, modules, info,
        decisions={
            "light.safe": {"action": "import"},
            "light.bad": {"action": "keep"},
        }
    )
    assert saved["saved_decision_count"] == 2
    assert saved["cutover_allowed"] is False


def test_crash_during_atomic_replace_preserves_older_snapshot(
    tmp_path, modules, monkeypatch
):
    info = _setup(tmp_path, modules)
    _save(tmp_path, modules, info)
    prior = _raw(tmp_path).read_bytes()
    draft = modules["migration_decision_draft"]
    def break_commit(*_args):
        raise OSError("disk full: internal-only")
    monkeypatch.setattr(draft.os, "replace", break_commit)
    with pytest.raises(draft.DecisionDraftError):
        _save(
            tmp_path, modules, info, revision=0,
            decisions={"light.safe": {"action": "keep"}}
        )
    assert _raw(tmp_path).read_bytes() == prior
    assert not list(
        _raw(tmp_path).parent.glob(".review-draft-pending-*")
    )


def test_draft_staging_lock_and_pending_file_require_review(
    tmp_path, modules
):
    info = _setup(tmp_path, modules)
    storage = _raw(tmp_path).parent
    pending = storage / ".review-draft-pending-stale"
    pending.write_bytes(b"INCOMPLETE")
    with pytest.raises(
        modules["migration_decision_draft"].DecisionDraftError,
        match="interrupted_draft_write",
    ):
        _save(tmp_path, modules, info)
    assert not _raw(tmp_path).exists()
    pending.unlink()
    lock = storage / ".mutation.lock"
    lock.write_bytes(b"INCOMPLETE")
    with pytest.raises(modules["migration_decision_draft"].DecisionDraftError):
        _save(tmp_path, modules, info)
    lock.unlink()


def test_admin_identity_is_only_hashed_in_draft(tmp_path, modules):
    info = _setup(tmp_path, modules)
    _save(tmp_path, modules, info)
    document = json.loads(_raw(tmp_path).read_text())
    assert document["reviewed_by_sha256"] == hashlib.sha256(
        b"ha-admin-17"
    ).hexdigest()
    assert "ha-admin-17" not in _raw(tmp_path).read_text()
    assert document["purpose"] == "admin_review_draft_non_authorizing"
    assert "approved" not in document
    assert document["journal_revision_at_review"] == 0


def test_admin_only_websocket_actions_do_not_call_mutation_apis():
    source = (COMPONENT / "websocket.py").read_text(encoding="utf-8")
    tree = ast.parse(source)
    for name in (
        "websocket_get_migration_decision_draft",
        "websocket_save_migration_decision_draft",
    ):
        handler = next(
            n for n in tree.body
            if isinstance(n, ast.AsyncFunctionDef) and n.name == name
        )
        decorators = [
            d.attr for d in handler.decorator_list
            if isinstance(d, ast.Attribute)
        ]
        assert "require_admin" in decorators
        fragment = ast.get_source_segment(source, handler)
        assert "stage_one_approved_label" not in fragment
        assert "apply_reviewed_preview" not in fragment
        assert "capture_baseline" not in fragment
    register = next(
        n for n in tree.body
        if isinstance(n, ast.FunctionDef)
        and n.name == "async_register_websocket_api"
    )
    assert "websocket_save_migration_decision_draft" in ast.unparse(register)



def test_recovered_draft_marks_original_source_change_stale(
    tmp_path, modules
):
    info = _setup(tmp_path, modules)
    _save(tmp_path, modules, info)
    (tmp_path / "ga_entities.yaml").write_bytes(
        ENTITIES + b"\n# post-review source edit\n"
    )
    recovered = modules["migration_decision_draft"].load_review_draft(
        tmp_path
    )
    assert recovered["status"] == "stale_source"
    assert recovered["decisions"]["light.safe"]["action"] == "import"
    assert recovered["apply_allowed"] is False
    assert recovered["cutover_allowed"] is False


def test_saved_draft_refuses_unexpected_extra_fields_after_restart(
    tmp_path, modules
):
    info = _setup(tmp_path, modules)
    _save(tmp_path, modules, info)
    original = json.loads(_raw(tmp_path).read_text())
    original["cutover_allowed"] = True
    _raw(tmp_path).write_text(json.dumps(original))
    with pytest.raises(
        modules["migration_decision_draft"].DecisionDraftError,
        match="draft_invalid_document",
    ):
        modules["migration_decision_draft"].load_review_draft(tmp_path)
