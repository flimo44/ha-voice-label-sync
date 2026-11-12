"""Server-side admission preview: native reads, stale facts and no writes."""

from __future__ import annotations

import asyncio
import importlib.util
import sys
from copy import deepcopy
from pathlib import Path
from types import ModuleType, SimpleNamespace

import pytest

ROOT = (
    Path(__file__).resolve().parents[1]
    / "custom_components" / "ha_voice_label_sync"
)


@pytest.fixture
def app(monkeypatch):
    prefix = "_hvls_stage_admission_api_test"
    pkg = ModuleType(prefix)
    pkg.__path__ = [str(ROOT)]
    monkeypatch.setitem(sys.modules, prefix, pkg)

    state = SimpleNamespace(
        calls=[], journal_reads=0, draft_reads=0,
        drift_journal=False, drift_draft=False,
        native_changed=False, missing_draft=False,
    )
    sha = "b" * 64
    token = "a" * 64
    entity = "light.good"
    state.draft = {
        "status": "saved_unapproved_draft",
        "stored_choices_unapproved": True,
        "draft_revision": 3,
        "baseline_manifest_sha256": sha,
        "source_evidence_sha256": "c" * 64,
        "review_token_sha256": token,
        "journal_revision": 0,
        "journal_phase": "baseline_ready",
        "decisions": {entity: {"action": "import"}},
    }
    state.journal = {
        "phase": "baseline_ready",
        "revision": 0, "operations": [],
        "baseline_manifest_sha256": sha,
    }
    state.review = {
        "read_only": True,
        "protected_baseline_status": "verified",
        "apply_allowed": False, "cutover_allowed": False,
        "diagnostic": {
            "read_only": True, "mode": "assisted_migration",
            "source": {"status": "resolved", "locations": []},
            "global_blockers": [],
            "loaded_policy": {
                "status": "match_compared_fields",
                "differences": [], "rule_changes": [],
            },
        },
        "preflight": {
            "read_only": True, "status": "read_only_stage_preflight",
            "global_blockers": [], "review_token_sha256": token,
            "source_evidence_sha256": "c" * 64,
            "label_additions_proposed": [{
                "entity_id": entity, "registry_id": "uuid-good",
                "label_id": "google_assistant",
            }],
        },
        "pre_stage_impact": {
            "read_only": True, "status": "no_manual_policy_delta_detected",
            "cutover_allowed": False,
            "google_home_state_verified": False, "global_blockers": [],
        },
        "indirect_consumer_audit": {
            "read_only": True, "stage_allowed": False,
            "cutover_allowed": False, "external_consumers_verified": False,
        },
    }
    state.attestation = {
        "status": "reviewed_without_detected_issues",
        "bound_draft_revision": 3,
        "review_is_not_execution_authorization": True,
        "google_home_state_verified": False,
        "cutover_allowed": False,
    }
    state.native = {
        "status": "captured", "read_only": True,
        "execution_authorized": False, "stage_allowed": False,
        "snapshot_sha256": "d" * 64,
        "snapshot": {
            "entity_id": entity, "registry_id": "uuid-good",
            "label_id": "google_assistant",
            "before_labels": ["unrelated"],
            "before_label_present": False,
            "desired_label_present": True,
        },
    }

    def register(name, **symbols):
        mod = ModuleType(f"{prefix}.{name}")
        for key, value in symbols.items():
            setattr(mod, key, value)
        monkeypatch.setitem(sys.modules, mod.__name__, mod)
        return mod

    register(
        "const", CONF_LABEL="configured_label",
        DEFAULT_LABEL="Google Assistant", DOMAIN="hvls",
    )
    spec = importlib.util.spec_from_file_location(
        f"{prefix}.migration_execution_admission",
        ROOT / "migration_execution_admission.py",
    )
    assert spec and spec.loader
    policy = importlib.util.module_from_spec(spec)
    monkeypatch.setitem(sys.modules, spec.name, policy)
    spec.loader.exec_module(policy)

    def load_draft(_dir):
        state.calls.append("read_draft")
        state.draft_reads += 1
        data = deepcopy(state.draft)
        if state.missing_draft:
            data["status"] = "not_saved"
        if state.drift_draft and state.draft_reads > 1:
            data["draft_revision"] = 99
        return data

    def read_journal(_dir):
        state.calls.append("read_journal")
        state.journal_reads += 1
        data = deepcopy(state.journal)
        if state.drift_journal and state.journal_reads > 1:
            data["revision"] += 1
        return data

    async def read_review(_hass, decisions):
        state.calls.append("read_review")
        assert decisions["light.good"]["action"] == "import"
        return deepcopy(state.review)

    def load_attest(_dir, *, current_evidence=None):
        state.calls.append("read_attestation")
        assert current_evidence == {"status": "review_ready"}
        return deepcopy(state.attestation)

    def verify_source(_dir, locations, baseline):
        state.calls.append("read_source")
        assert locations == []
        return {"verified": True, "manifest_sha256": baseline}

    def capture(_hass, **kwargs):
        state.calls.append("capture_native")
        assert kwargs["desired_present"] is True
        return deepcopy(state.native)

    def assess(_hass, **_kwargs):
        state.calls.append("assess_native")
        return {"status": "refused" if state.native_changed else "matched"}

    register("migration_decision_draft", load_review_draft=load_draft)
    register("migration_journal", read_journal=read_journal)
    register("migration_review_api", async_build_admin_review=read_review)
    register(
        "migration_review_attestation", load_attestation=load_attest,
        review_evidence=lambda _: {"status": "review_ready"},
    )
    register("migration_stage_executor", verify_current_sources=verify_source)
    register(
        "migration_write_boundary", capture_native_boundary=capture,
        assess_native_boundary=assess,
    )
    lock = asyncio.Lock()
    register("workflow_lock", get_workflow_lock=lambda _hass: lock)

    spec = importlib.util.spec_from_file_location(
        f"{prefix}.migration_execution_admission_api",
        ROOT / "migration_execution_admission_api.py",
    )
    assert spec and spec.loader
    api = importlib.util.module_from_spec(spec)
    monkeypatch.setitem(sys.modules, spec.name, api)
    spec.loader.exec_module(api)

    hass = SimpleNamespace(
        config=SimpleNamespace(config_dir="/synthetic-private-config"),
        config_entries=SimpleNamespace(async_entries=lambda _: [
            SimpleNamespace(data={}, options={})
        ]),
    )

    async def executor(fn, *args):
        return fn(*args)

    hass.async_add_executor_job = executor
    state.api = api
    state.hass = hass
    return state


def _request(state, entity_id="light.good"):
    return asyncio.run(state.api.async_get_stage_admission_preview(
        state.hass, entity_id=entity_id
    ))


def test_server_rebuilds_evidence_and_always_returns_non_authorizing(app):
    result = _request(app)
    assert result["status"] == (
        "hypothetical_prerequisites_consistent_no_permission"
    )
    assert result["technical_prerequisites_consistent"] is True
    assert result["execution_authorized"] is False
    assert result["stage_allowed"] is False
    assert result["journal_ack_allowed"] is False
    assert result["investigation_ledger_is_not_authorization"] is True
    assert app.calls == [
        "read_draft", "read_journal", "read_review",
        "read_attestation", "read_source", "capture_native",
        "read_journal", "read_draft", "assess_native",
    ]


@pytest.mark.parametrize(
    ("change", "reason"),
    [
        ("drift_journal", "protected_evidence_changed"),
        ("drift_draft", "protected_evidence_changed"),
        ("native_changed", "native_snapshot_changed"),
        ("missing_draft", "fresh_saved_draft_required"),
    ],
)
def test_change_between_reads_refuses_without_execution(app, change, reason):
    setattr(app, change, True)
    result = _request(app)
    assert result["technical_prerequisites_consistent"] is False
    assert result["technical_blockers"] == [reason]
    assert result["execution_authorized"] is False
    assert result["stage_allowed"] is False


def test_missing_unique_configuration_refuses_without_reading_files(app):
    app.hass.config_entries.async_entries = lambda _: []
    result = _request(app)
    assert result["technical_blockers"] == [
        "integration_not_uniquely_configured"
    ]
    assert app.calls == []


def test_invalid_entity_id_refused_before_any_server_read(app):
    result = _request(app, "light.bad\nprivate-secret")
    assert result["technical_blockers"] == ["invalid_entity_id"]
    assert app.calls == []
    assert "private-secret" not in str(result)
