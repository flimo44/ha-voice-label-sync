"""Fail-closed native registry write-point CAS rehearsal; NO production writes."""

from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path
from types import ModuleType, SimpleNamespace

import pytest

ROOT = (
    Path(__file__).resolve().parents[1]
    / "custom_components" / "ha_voice_label_sync"
)


@pytest.fixture
def boundary(monkeypatch):
    prefix = "_test_hvls_cas_no_writes"
    package = ModuleType(prefix)
    package.__path__ = [str(ROOT)]
    monkeypatch.setitem(sys.modules, prefix, package)
    modules = {}
    for stem in ("label_update", "migration_write_boundary"):
        fullname = f"{prefix}.{stem}"
        spec = importlib.util.spec_from_file_location(
            fullname, ROOT / f"{stem}.py"
        )
        assert spec is not None and spec.loader is not None
        loaded = importlib.util.module_from_spec(spec)
        monkeypatch.setitem(sys.modules, fullname, loaded)
        spec.loader.exec_module(loaded)
        modules[stem] = loaded

    native = {
        "light.good": SimpleNamespace(
            id="native_01", labels={"unrelated"},
            disabled_by=None, hidden_by=None,
        ),
        "light.other": SimpleNamespace(
            id="native_02", labels={"separate"},
            disabled_by=None, hidden_by=None,
        ),
    }
    labels = {
        "google_assistant": SimpleNamespace(
            label_id="google_assistant", name="Google Assistant"
        ),
        "unrelated": SimpleNamespace(
            label_id="unrelated", name="Unrelated"
        ),
        "separate": SimpleNamespace(
            label_id="separate", name="Separate"
        ),
        "third": SimpleNamespace(
            label_id="third", name="Third"
        ),
    }
    writes = []
    guard = modules["migration_write_boundary"]
    def fetch(_hass, *, entity_id, configured_label):
        assert configured_label == "Google Assistant"
        return "google_assistant", native.get(entity_id), labels
    monkeypatch.setattr(guard, "_native", fetch)
    return SimpleNamespace(guard=guard, native=native, labels=labels,
                           writes=writes)


def _capture(env, entity="light.good", desired=True):
    return env.guard.capture_native_boundary(
        object(), entity_id=entity, configured_label="Google Assistant",
        desired_present=desired,
    )


def _check(env, saved):
    return env.guard.assess_native_boundary(object(), capture=saved)


def test_add_simulation_matches_exact_all_labels_without_writing(boundary):
    saved = _capture(boundary)
    assert saved["status"] == "captured"
    assert saved["read_only"] is True
    assert saved["stage_allowed"] is False
    assert saved["execution_authorized"] is False
    assert saved["snapshot"]["before_labels"] == ["unrelated"]
    assert len(saved["snapshot_sha256"]) == 64
    result = _check(boundary, saved)
    assert result["status"] == "matched"
    assert result["native_identity_and_all_labels_consistent"] is True
    assert result["proposed_delta"] == "add_one_label"
    assert result["unrelated_labels_preserved_in_projection"] is True
    assert result["stage_allowed"] is False
    assert result["execution_authorized"] is False
    assert result["journal_ack_allowed"] is False
    assert result["google_home_state_verified"] is False
    assert boundary.native["light.good"].labels == {"unrelated"}
    assert boundary.writes == []


@pytest.mark.parametrize(
    ("change", "expected_reason"),
    [
        ("target_label_added", "native_full_label_set_changed"),
        ("unrelated_label_added", "native_full_label_set_changed"),
        ("unrelated_label_removed", "native_full_label_set_changed"),
        ("native_uuid_replaced", "registry_identity_changed"),
        ("native_entity_deleted", "entity_missing"),
        ("label_id_deleted", "native_label_identity_missing"),
        ("native_disabled", "native_entity_disabled"),
        ("native_hidden", "native_entity_hidden"),
        ("target_label_id_reassigned", "label_identity_changed"),
    ],
)
def test_any_change_between_capture_and_boundary_refuses_without_write(
    boundary, change, expected_reason,
):
    saved = _capture(boundary)
    if change == "target_label_added":
        boundary.native["light.good"].labels.add("google_assistant")
    elif change == "unrelated_label_added":
        boundary.native["light.good"].labels.add("third")
    elif change == "unrelated_label_removed":
        boundary.native["light.good"].labels.clear()
    elif change == "native_uuid_replaced":
        boundary.native["light.good"].id = "new-native-uuid"
    elif change == "native_entity_deleted":
        del boundary.native["light.good"]
    elif change == "label_id_deleted":
        del boundary.labels["unrelated"]
    elif change == "native_disabled":
        boundary.native["light.good"].disabled_by = "integration"
    elif change == "native_hidden":
        boundary.native["light.good"].hidden_by = "user"
    elif change == "target_label_id_reassigned":
        original = boundary.guard._native

        def altered(*args, **kwargs):
            _, entity, labels = original(*args, **kwargs)
            return "other_google", entity, labels

        boundary.guard._native = altered
    result = _check(boundary, saved)
    assert result["status"] == "refused"
    assert result["reason"] == expected_reason
    assert result["stage_allowed"] is False
    assert result["execution_authorized"] is False
    assert result["native_identity_and_all_labels_consistent"] is False
    assert boundary.writes == []


def test_removal_direction_is_simulated_without_removing_label(boundary):
    boundary.native["light.good"].labels.add("google_assistant")
    saved = _capture(boundary, desired=False)
    assert saved["snapshot"]["before_label_present"] is True
    result = _check(boundary, saved)
    assert result["status"] == "matched"
    assert result["proposed_delta"] == "remove_one_label"
    assert boundary.native["light.good"].labels == {
        "unrelated", "google_assistant"
    }


def test_replay_after_original_entity_changes_is_rejected(boundary):
    prior = _capture(boundary)
    boundary.native["light.good"].labels.add("google_assistant")
    assert _check(boundary, prior)["status"] == "refused"
    boundary.native["light.good"].labels.remove("google_assistant")
    # The original membership is restored; this is still NOT a guarantee
    # that external subscribers were unaffected by the transient event.
    again = _check(boundary, prior)
    assert again["status"] == "matched"
    assert again["external_consumers_verified"] is False
    assert again["execution_authorized"] is False


def test_unrelated_faulty_entity_isolated_by_exact_entity_id(boundary):
    first = _capture(boundary, entity="light.good")
    second = _capture(boundary, entity="light.other")
    assert second["status"] == "captured"
    boundary.native["light.other"].id = "replaced"
    assert _check(boundary, second)["status"] == "refused"
    assert _check(boundary, first)["status"] == "matched"


@pytest.mark.parametrize("value", [
    "", "invalid", "light.bad\nkey", "light.bad/../x",
    "light." + "a" * 4096,
])
def test_invalid_entity_id_refused_with_fixed_reason(boundary, value):
    result = _capture(boundary, entity=value)
    assert result["status"] == "refused"
    assert result["reason"] == "invalid_boundary_request"
    assert "secrets" not in json.dumps(result)


@pytest.mark.parametrize("tamper", [
    "snapshot_hash", "before_labels", "registry_id",
    "desired_label_present", "snapshot_extra_field",
    "stage_authorized", "invalid_boolean", "duplicate_labels",
])
def test_forged_or_corrupted_snapshot_fails_closed(boundary, tamper):
    saved = json.loads(json.dumps(_capture(boundary)))
    snapshot = saved["snapshot"]
    if tamper == "snapshot_hash":
        saved["snapshot_sha256"] = "a" * 64
    elif tamper == "before_labels":
        snapshot["before_labels"] = ["third", "unrelated"]
    elif tamper == "registry_id":
        snapshot["registry_id"] = "fake_id"
    elif tamper == "desired_label_present":
        snapshot["desired_label_present"] = False
    elif tamper == "snapshot_extra_field":
        snapshot["secret"] = "not part of schema"
    elif tamper == "stage_authorized":
        saved["stage_allowed"] = True
    elif tamper == "invalid_boolean":
        snapshot["before_label_present"] = 0
    elif tamper == "duplicate_labels":
        snapshot["before_labels"] = ["unrelated", "unrelated"]
    result = _check(boundary, saved)
    assert result["status"] == "refused"
    assert result["stage_allowed"] is False
    assert result["execution_authorized"] is False


def test_missing_target_label_or_ambiguous_name_refused_safely(
    boundary, monkeypatch,
):
    error = boundary.guard
    def failed(*_args, **_kwargs):
        raise error.LabelUpdateError("sensitive internal HA state")
    monkeypatch.setattr(error, "_native", failed)
    denied = _capture(boundary)
    assert denied["status"] == "refused"
    assert denied["reason"] == "native_label_resolution_unavailable"
    assert "sensitive" not in json.dumps(denied)


def test_existing_target_membership_is_not_a_pending_addition(boundary):
    boundary.native["light.good"].labels.add("google_assistant")
    denied = _capture(boundary, desired=True)
    assert denied["status"] == "refused"
    assert denied["reason"] == "no_label_delta_to_simulate"
    assert denied["journal_ack_allowed"] is False


def test_boundary_module_has_no_mutation_calls_or_websocket_registration():
    source = (ROOT / "migration_write_boundary.py").read_text()
    forbidden = [
        "async_update_entity(", "async_fire(", "record_label_intent(",
        "mark_label_applied(", "append_investigation_record(",
        "async_register_command(", "os.open(", "open(", "write_bytes(",
    ]
    for name in forbidden:
        assert name not in source
    ws = (ROOT / "websocket.py").read_text()
    assert "migration_write_boundary" not in ws
    stage = (ROOT / "migration_stage_executor.py").read_text()
    assert "migration_write_boundary" in stage
    assert "capture_native_boundary(" in stage
    assert "assess_native_boundary(" in stage
    assert "expected_boundary_capture=boundary_capture" in stage
