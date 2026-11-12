"""Read-only recovery triage: test pending intents with real protected files.

The HA registry boundary is explicitly mocked here; the separate Core
2026.11 sandbox tests the real native registry after a process restart.
"""

from __future__ import annotations

import asyncio
import importlib.util
import sys
from pathlib import Path
from types import ModuleType, SimpleNamespace

import pytest

ROOT = (
    Path(__file__).resolve().parents[1]
    / "custom_components" / "ha_voice_label_sync"
)
SOURCE = b"""google_assistant:
  expose_by_default: false
  entity_config: !include google_entities.yaml
# PRIVATE_PROJECT_ID_NEVER_EXPOSE
"""
ENTITIES = b"""light.first:
  expose: true
  name: "PRIVATE ENTITY NAME"
light.second:
  expose: false
"""


@pytest.fixture
def setup(monkeypatch, tmp_path):
    prefix = "_test_hvls_recovery_observation"
    pkg = ModuleType(prefix)
    pkg.__path__ = [str(ROOT)]
    monkeypatch.setitem(sys.modules, prefix, pkg)
    const = ModuleType(f"{prefix}.const")
    const.DOMAIN = "ha_voice_label_sync"
    monkeypatch.setitem(sys.modules, const.__name__, const)
    locks = {}
    lock_mod = ModuleType(f"{prefix}.workflow_lock")
    lock_mod.get_workflow_lock = lambda hass: locks.setdefault(
        id(hass), asyncio.Lock()
    )
    monkeypatch.setitem(sys.modules, lock_mod.__name__, lock_mod)
    loaded = {}
    for stem in (
        "migration_discovery", "migration_baseline", "migration_journal",
        "migration_resolution_scenarios", "migration_recovery_view",
        "migration_recovery_confirmation",
        "migration_recovery_records", "migration_recovery_records_api",
    ):
        name = f"{prefix}.{stem}"
        spec = importlib.util.spec_from_file_location(
            name, ROOT / f"{stem}.py"
        )
        assert spec and spec.loader
        module = importlib.util.module_from_spec(spec)
        monkeypatch.setitem(sys.modules, name, module)
        spec.loader.exec_module(module)
        loaded[stem] = module

    (tmp_path / "configuration.yaml").write_bytes(SOURCE)
    (tmp_path / "google_entities.yaml").write_bytes(ENTITIES)

    entries = {
        "light.first": SimpleNamespace(
            id="entity_native_first", labels=frozenset()
        ),
        "light.second": SimpleNamespace(
            id="entity_native_second", labels=frozenset()
        ),
    }
    label_data = {
        "google_assistant": SimpleNamespace(name="Google Assistant")
    }
    registry = SimpleNamespace(async_get=lambda entity: entries.get(entity))
    labels = SimpleNamespace(labels=label_data)
    home = ModuleType("homeassistant")
    helpers = ModuleType("homeassistant.helpers")
    entities_mod = ModuleType("homeassistant.helpers.entity_registry")
    labels_mod = ModuleType("homeassistant.helpers.label_registry")
    entities_mod.async_get = lambda hass: registry
    labels_mod.async_get = lambda hass: labels
    home.helpers = helpers
    helpers.entity_registry = entities_mod
    helpers.label_registry = labels_mod
    for item in (home, helpers, entities_mod, labels_mod):
        monkeypatch.setitem(sys.modules, item.__name__, item)

    hass = SimpleNamespace(
        config=SimpleNamespace(config_dir=str(tmp_path)),
        config_entries=SimpleNamespace(
            async_entries=lambda domain: [object()] if domain == const.DOMAIN else []
        ),
        data={},
    )

    async def async_executor(func, *args):
        return func(*args)

    hass.async_add_executor_job = async_executor
    return SimpleNamespace(
        tmp=tmp_path, hass=hass, modules=loaded,
        entries=entries, labels=label_data,
    )


def _ready(env):
    files = env.modules["migration_discovery"].discover_google_assistant(
        env.tmp
    )
    assert files["source"]["status"] == "resolved"
    env.modules["migration_baseline"].capture_baseline(env.tmp, files)
    journal = env.modules["migration_journal"].initialize_journal(env.tmp)
    return journal


def _intent(env, entity="light.first", *,
            operation="op_first", registry="entity_native_first",
            revision=1):
    journal = env.modules["migration_journal"]
    return journal.record_label_intent(
        env.tmp,
        operation_id=operation,
        entity_id=entity,
        registry_id=registry,
        label_id="google_assistant",
        expected_before=False,
        expected_after=True,
        expected_revision=revision,
    )


def _check(env):
    return asyncio.run(
        env.modules["migration_recovery_view"].async_get_admin_migration_recovery(
            env.hass
        )
    )


def test_missing_journal_read_does_not_create_any_storage(setup):
    before = {p.name: p.read_bytes() for p in setup.tmp.iterdir()}
    observed = _check(setup)
    assert observed["status"] == "not_initialized"
    assert observed["cutover_allowed"] is False
    assert observed["automatic_recovery_allowed"] is False
    assert not (setup.tmp / ".storage").exists()
    assert {p.name: p.read_bytes() for p in setup.tmp.iterdir()} == before


def test_clean_baseline_has_no_pending_but_is_never_authorization(setup):
    _ready(setup)
    observed = _check(setup)
    assert observed["status"] == "observed_no_pending"
    assert observed["journal_revision"] == 0
    assert observed["source_integrity"] == "verified_unchanged"
    assert observed["needs_review"] is False
    assert observed["operations"] == []
    assert observed["stage_allowed"] is False
    assert observed["cutover_allowed"] is False
    assert observed["google_home_state_verified"] is False


@pytest.mark.parametrize("written", [False, True])
def test_unconfirmed_intent_remains_unconfirmed_for_either_ha_state(
    setup, written
):
    _ready(setup)
    journal = setup.modules["migration_journal"]
    journal.advance_phase(setup.tmp, "labels_staging", expected_revision=0)
    _intent(setup)
    if written:
        setup.entries["light.first"].labels = {"google_assistant"}
    before = journal.read_journal(setup.tmp)
    result = _check(setup)
    assert result["status"] == "review_required"
    assert result["summary"]["unconfirmed"] == 1
    assert result["operations"][0]["observed_status"] == "unconfirmed_intent"
    assert result["operations"][0]["membership"] == (
        "present" if written else "absent"
    )
    assert result["operations"][0]["needs_review"] is True
    assert result["automatic_recovery_allowed"] is False
    assert result["cutover_allowed"] is False
    assert journal.read_journal(setup.tmp) == before
    assert (setup.tmp / "configuration.yaml").read_bytes() == SOURCE


def test_applied_verified_is_observation_not_approval(setup):
    _ready(setup)
    journal = setup.modules["migration_journal"]
    journal.advance_phase(setup.tmp, "labels_staging", expected_revision=0)
    _intent(setup)
    journal.mark_label_applied(
        setup.tmp, "op_first",
        registry_id="entity_native_first",
        current_membership=True, expected_revision=2,
    )
    setup.entries["light.first"].labels = {"google_assistant"}
    report = _check(setup)
    assert report["operations"][0]["observed_status"] == "applied_verified"
    assert report["operations"][0]["needs_review"] is False
    assert report["status"] == "review_required"  # phase is still staging
    assert report["cutover_allowed"] is False


def test_multiple_entity_failures_do_not_hide_healthy_observations(setup):
    _ready(setup)
    journal = setup.modules["migration_journal"]
    journal.advance_phase(setup.tmp, "labels_staging", expected_revision=0)
    _intent(setup)
    _intent(
        setup, entity="light.second", operation="op_second",
        registry="entity_native_second", revision=2,
    )
    setup.entries["light.first"].labels = {"google_assistant"}
    del setup.entries["light.second"]
    report = _check(setup)
    assert [x["observed_status"] for x in report["operations"]] == [
        "unconfirmed_intent", "entity_unavailable",
    ]
    assert [x["membership"] for x in report["operations"]] == [
        "present", "unknown",
    ]
    assert report["summary"]["unconfirmed"] == 2
    assert report["needs_review"] is True


def test_missing_label_identity_is_local_issue_not_a_global_crash(setup):
    _ready(setup)
    journal = setup.modules["migration_journal"]
    journal.advance_phase(setup.tmp, "labels_staging", expected_revision=0)
    _intent(setup)
    setup.labels.clear()
    report = _check(setup)
    assert report["operations"][0]["observed_status"] == "label_identity_missing"
    assert report["operations"][0]["label_identity_exists"] is False
    assert report["operations"][0]["needs_review"] is True
    assert report["status"] == "review_required"


def test_registry_identity_changed_never_counted_as_verified(setup):
    _ready(setup)
    journal = setup.modules["migration_journal"]
    journal.advance_phase(setup.tmp, "labels_staging", expected_revision=0)
    _intent(setup)
    setup.entries["light.first"].id = "replacement_registry_id"
    result = _check(setup)
    assert result["operations"][0]["observed_status"] == "registry_identity_changed"
    assert result["operations"][0]["registry_identity_matches"] is False
    assert result["needs_review"] is True


def test_source_drift_blocks_clean_observation_but_never_writes(setup):
    _ready(setup)
    (setup.tmp / "google_entities.yaml").write_bytes(ENTITIES + b"# changed\n")
    current = (setup.tmp / "google_entities.yaml").read_bytes()
    result = _check(setup)
    assert result["status"] == "review_required"
    assert result["source_integrity"] == "changed_or_unavailable"
    assert result["cutover_allowed"] is False
    assert (setup.tmp / "google_entities.yaml").read_bytes() == current


def test_corrupt_journal_returns_sanitized_unavailable(setup):
    _ready(setup)
    target = setup.tmp / ".storage" / "hvls_migration" / "journal.json"
    target.write_text("{sensitive_secret_CORRUPT")
    observed = _check(setup)
    assert observed["status"] == "unavailable"
    assert observed["operations"] == []
    assert "sensitive_secret" not in str(observed)
    assert observed["reason"] == "protected_journal_or_baseline_invalid"
    assert target.read_text() == "{sensitive_secret_CORRUPT"


def test_concurrent_disk_mutation_is_not_reported_as_consistent(setup):
    _ready(setup)
    journal = setup.modules["migration_journal"]
    original = setup.hass.async_add_executor_job
    calls = 0

    async def injected(func, *args):
        nonlocal calls
        calls += 1
        if calls == 2:
            journal.advance_phase(
                setup.tmp, "labels_staging", expected_revision=0
            )
        return await original(func, *args)

    setup.hass.async_add_executor_job = injected
    result = _check(setup)
    assert result["status"] == "snapshot_changed"
    assert result["needs_review"] is True
    assert result["operations"] == []
    assert result["cutover_allowed"] is False


def test_native_registry_unavailable_is_non_authorizing(setup):
    _ready(setup)
    setup.hass.config_entries.async_entries = lambda _: [object()]
    import sys

    original = sys.modules["homeassistant.helpers.entity_registry"].async_get

    def failed(_hass):
        raise RuntimeError("sensitive internal HA path")

    sys.modules["homeassistant.helpers.entity_registry"].async_get = failed
    try:
        result = _check(setup)
    finally:
        sys.modules["homeassistant.helpers.entity_registry"].async_get = original
    assert result["status"] == "unavailable"
    assert result["reason"] == "native_registries_unavailable"
    assert "sensitive" not in str(result)
    assert result["cutover_allowed"] is False


def test_requires_unique_config_entry(setup):
    setup.hass.config_entries.async_entries = lambda _: []
    with pytest.raises(
        setup.modules["migration_recovery_view"].RecoveryViewError,
        match="integration_not_uniquely_configured",
    ):
        _check(setup)


def test_websocket_only_reads_and_requires_admin():
    import ast

    tree = ast.parse((ROOT / "websocket.py").read_text(encoding="utf-8"))
    name = "websocket_get_migration_recovery_status"
    node = next(
        n for n in tree.body
        if isinstance(n, ast.AsyncFunctionDef) and n.name == name
    )
    assert any(
        isinstance(d, ast.Attribute) and d.attr == "require_admin"
        for d in node.decorator_list
    )
    body = ast.unparse(node)
    assert "async_get_admin_migration_recovery" in body
    assert "record_label_intent" not in body
    assert "mark_label_applied" not in body
    assert "stage_one_approved_label" not in body
    assert "update_entity_label" not in body
    assert "restore" not in body
    register = next(
        n for n in tree.body
        if isinstance(n, ast.FunctionDef)
        and n.name == "async_register_websocket_api"
    )
    assert name in ast.unparse(register)



def test_pending_intent_present_produces_nonauthorizing_observation(setup):
    _ready(setup)
    j = setup.modules["migration_journal"]
    j.advance_phase(setup.tmp, "labels_staging", expected_revision=0)
    _intent(setup)
    setup.entries["light.first"].labels = {"google_assistant"}
    before = j.read_journal(setup.tmp)
    result = _check(setup)
    scenarios = result["resolution_scenarios"]
    assert scenarios["status"] == "investigation_required"
    assert scenarios["operations"][0]["scenario"] == (
        "intent_desired_membership_observed"
    )
    assert scenarios["operations"][0]["resolution_authorized"] is False
    assert scenarios["operations"][0]["human_investigation_required"] is True
    assert "journal_intent_still_unconfirmed" in (
        scenarios["operations"][0]["reason_codes"]
    )
    assert scenarios["automatic_recovery_allowed"] is False
    assert scenarios["journal_ack_allowed"] is False
    assert scenarios["retry_allowed"] is False
    assert scenarios["rollback_allowed"] is False
    assert j.read_journal(setup.tmp) == before


def test_pending_intent_absent_is_not_permission_to_retry(setup):
    _ready(setup)
    j = setup.modules["migration_journal"]
    j.advance_phase(setup.tmp, "labels_staging", expected_revision=0)
    _intent(setup)
    result = _check(setup)
    scenario = result["resolution_scenarios"]["operations"][0]
    assert scenario["scenario"] == "intent_original_membership_observed"
    assert scenario["current_membership"] == "absent"
    assert scenario["resolution_authorized"] is False
    assert result["resolution_scenarios"]["retry_allowed"] is False


def test_reverse_expected_membership_intent_classifies_correctly(setup):
    _ready(setup)
    j = setup.modules["migration_journal"]
    j.advance_phase(setup.tmp, "labels_staging", expected_revision=0)
    j.record_label_intent(
        setup.tmp, operation_id="reverse",
        entity_id="light.first", registry_id="entity_native_first",
        label_id="google_assistant", expected_before=True,
        expected_after=False, expected_revision=1,
    )
    result = _check(setup)
    hypothesis = result["resolution_scenarios"]["operations"][0]
    assert hypothesis["expected_before"] is True
    assert hypothesis["expected_after"] is False
    assert hypothesis["scenario"] == "intent_desired_membership_observed"
    assert hypothesis["resolution_authorized"] is False


def test_label_identity_or_entity_identity_missing_is_quarantined(setup):
    _ready(setup)
    j = setup.modules["migration_journal"]
    j.advance_phase(setup.tmp, "labels_staging", expected_revision=0)
    _intent(setup)
    setup.labels.clear()
    scenario = _check(setup)["resolution_scenarios"]["operations"][0]
    assert scenario["category"] == "quarantine"
    assert scenario["scenario"] == "identity_or_membership_unknown"
    assert "label_identity_missing" in scenario["reason_codes"]
    setup.labels["google_assistant"] = object()
    setup.entries["light.first"].id = "recreated_entity"
    scenario = _check(setup)["resolution_scenarios"]["operations"][0]
    assert "registry_identity_missing_or_changed" in scenario["reason_codes"]
    assert scenario["resolution_authorized"] is False


def test_source_drift_keeps_entity_specific_hypotheses_visible(setup):
    _ready(setup)
    j = setup.modules["migration_journal"]
    j.advance_phase(setup.tmp, "labels_staging", expected_revision=0)
    _intent(setup)
    (setup.tmp / "google_entities.yaml").write_bytes(ENTITIES + b"# changed\n")
    result = _check(setup)["resolution_scenarios"]
    assert result["status"] == "investigation_required"
    assert result["global_cautions"] == ["source_integrity_not_verified"]
    assert result["operations"][0]["scenario"] == (
        "intent_original_membership_observed"
    )
    assert "global_review_required_before_any_resolution" in (
        result["operations"][0]["reason_codes"]
    )
    assert result["journal_ack_allowed"] is False


def test_recorded_applied_remains_observation_not_correction(setup):
    _ready(setup)
    j = setup.modules["migration_journal"]
    j.advance_phase(setup.tmp, "labels_staging", expected_revision=0)
    _intent(setup)
    j.mark_label_applied(
        setup.tmp, "op_first", registry_id="entity_native_first",
        current_membership=True, expected_revision=2,
    )
    setup.entries["light.first"].labels = {"google_assistant"}
    result = _check(setup)
    scenario = result["resolution_scenarios"]["operations"][0]
    assert scenario["scenario"] == "applied_record_matches_observation"
    assert scenario["category"] == "observation_only"
    assert scenario["resolution_authorized"] is False
    assert result["resolution_scenarios"]["status"] == "observations_only"
    setup.entries["light.first"].labels = frozenset()
    mismatch = _check(setup)["resolution_scenarios"]["operations"][0]
    assert mismatch["scenario"] == "recorded_state_no_longer_matches"
    assert mismatch["category"] == "investigation"


def test_pending_and_corrupt_records_remain_non_authorizing(setup):
    scenario_module = setup.modules["migration_resolution_scenarios"]
    assert scenario_module.build_resolution_scenarios({
        "status": "unavailable", "read_only": True,
        "automatic_recovery_allowed": False,
        "stage_allowed": False, "cutover_allowed": False,
    })["status"] == "unavailable"
    assert scenario_module.build_resolution_scenarios({
        "status": "review_required", "read_only": True,
        "automatic_recovery_allowed": False,
        "stage_allowed": False, "cutover_allowed": False,
        "phase": "labels_staging", "journal_revision": 2,
        "source_integrity": "verified_unchanged",
        "operations": [{"entity_id": "light.secret\nprivate"}],
    })["status"] == "unavailable"


def test_multiple_rows_one_corrupt_row_fails_closed_without_data_leak(setup):
    _ready(setup)
    j = setup.modules["migration_journal"]
    j.advance_phase(setup.tmp, "labels_staging", expected_revision=0)
    _intent(setup)
    _intent(
        setup, entity="light.second", operation="second",
        registry="entity_native_second", revision=2,
    )
    result = _check(setup)["resolution_scenarios"]
    assert result["summary"]["unconfirmed"] == 2
    assert len(result["operations"]) == 2
    assert result["summary"]["requires_investigation"] == 2
    assert all(
        row["resolution_authorized"] is False for row in result["operations"]
    )


def test_uninitialized_storage_has_no_fake_resolution_scenarios(setup):
    result = _check(setup)
    assert result["resolution_scenarios"]["status"] == "not_initialized"
    assert result["resolution_scenarios"]["operations"] == []
    assert result["resolution_scenarios"]["cutover_allowed"] is False
    assert not (setup.tmp / ".storage").exists()


def test_concurrent_revision_change_invalidates_all_investigation_rows(setup):
    _ready(setup)
    j = setup.modules["migration_journal"]
    old = setup.hass.async_add_executor_job
    calls = 0

    async def concurrent(fn, *args):
        nonlocal calls
        calls += 1
        if calls == 2:
            j.advance_phase(
                setup.tmp, "labels_staging", expected_revision=0
            )
        return await old(fn, *args)
    setup.hass.async_add_executor_job = concurrent
    result = _check(setup)
    assert result["status"] == "snapshot_changed"
    assert result["resolution_scenarios"]["status"] == "unavailable"
    assert result["resolution_scenarios"]["operations"] == []



def _prepare_dryrun(
    env, *,
    administrator="admin_1", entity_id="light.first",
    disposition="inspect_external_effects",
):
    return asyncio.run(
        env.modules[
            "migration_recovery_confirmation"
        ].prepare_admin_recovery_decision(
            env.hass, administrator_id=administrator,
            entity_id=entity_id, disposition=disposition,
        )
    )


def _confirm_dryrun(
    env, prepared, *,
    administrator="admin_1", entity_id="light.first",
    disposition="inspect_external_effects",
    confirmed=True, acknowledge=True,
):
    return asyncio.run(
        env.modules[
            "migration_recovery_confirmation"
        ].confirm_admin_recovery_decision(
            env.hass, administrator_id=administrator,
            entity_id=entity_id, disposition=disposition,
            confirmation_token=prepared["confirmation_token"],
            confirmed=confirmed,
            acknowledge_external_uncertainty=acknowledge,
        )
    )


def _make_pending(env):
    _ready(env)
    journal = env.modules["migration_journal"]
    journal.advance_phase(
        env.tmp, "labels_staging", expected_revision=0
    )
    _intent(env)


@pytest.mark.parametrize("membership", [False, True])
def test_recovery_dryrun_confirmation_never_writes_or_authorizes(
    setup, membership
):
    _make_pending(setup)
    if membership:
        setup.entries["light.first"].labels = {"google_assistant"}
    before = setup.modules["migration_journal"].read_journal(setup.tmp)
    yaml_before = (setup.tmp / "configuration.yaml").read_bytes()
    source_before = (setup.tmp / "google_entities.yaml").read_bytes()
    prepared = _prepare_dryrun(setup)
    assert prepared["status"] == "awaiting_simulated_human_confirmation"
    assert prepared["expires_in_seconds"] == 180
    assert prepared["journal_revision"] == 2
    assert len(prepared["journal_evidence_sha256"]) == 64
    assert prepared["execution_authorized"] is False
    assert prepared["journal_ack_allowed"] is False
    assert prepared["retry_allowed"] is False
    assert prepared["rollback_allowed"] is False
    assert prepared["cutover_allowed"] is False
    done = _confirm_dryrun(setup, prepared)
    assert done["status"] == "simulated_review_confirmation_no_execution"
    assert done["human_confirmation_received"] is True
    assert done["fresh_evidence_rechecked"] is True
    assert done["no_action_was_performed"] is True
    assert done["decision_not_durably_saved"] is True
    assert done["execution_authorized"] is False
    assert done["journal_ack_allowed"] is False
    assert done["retry_allowed"] is False
    assert done["rollback_allowed"] is False
    assert done["stage_allowed"] is False
    assert done["apply_allowed"] is False
    assert done["cutover_allowed"] is False
    assert setup.modules["migration_journal"].read_journal(setup.tmp) == before
    assert (setup.tmp / "configuration.yaml").read_bytes() == yaml_before
    assert (setup.tmp / "google_entities.yaml").read_bytes() == source_before
    assert setup.entries["light.first"].labels == (
        {"google_assistant"} if membership else frozenset()
    )


@pytest.mark.parametrize("changed", [
    "membership", "journal", "source", "entity_identity", "label_identity"
])
def test_dryrun_rejects_any_changes_between_prepare_confirm(
    setup, changed
):
    _make_pending(setup)
    prepared = _prepare_dryrun(setup)
    j = setup.modules["migration_journal"]
    if changed == "membership":
        setup.entries["light.first"].labels = {"google_assistant"}
    elif changed == "journal":
        j.record_label_intent(
            setup.tmp, operation_id="second",
            entity_id="light.second", registry_id="entity_native_second",
            label_id="google_assistant", expected_before=False,
            expected_after=True, expected_revision=2,
        )
    elif changed == "source":
        (setup.tmp / "google_entities.yaml").write_bytes(
            ENTITIES + b"# drift\n"
        )
    elif changed == "entity_identity":
        setup.entries["light.first"].id = "recreated_entity"
    elif changed == "label_identity":
        setup.labels.clear()
    with pytest.raises(
        setup.modules["migration_recovery_confirmation"].RecoveryConfirmationError
    ):
        _confirm_dryrun(setup, prepared)
    assert setup.hass.data[
        "ha_voice_label_sync"
    ]["_migration_recovery_dryrun_pending"] == {}
    # Replaying the same valid token cannot succeed after a failed attempt.
    with pytest.raises(
        setup.modules["migration_recovery_confirmation"].RecoveryConfirmationError,
        match="challenge_expired_or_invalid",
    ):
        _confirm_dryrun(setup, prepared)


def test_confirmation_is_one_use_and_other_admin_cannot_steal_it(setup):
    _make_pending(setup)
    prepared = _prepare_dryrun(setup)
    mod = setup.modules["migration_recovery_confirmation"]
    with pytest.raises(mod.RecoveryConfirmationError,
                       match="challenge_expired_or_invalid"):
        _confirm_dryrun(setup, prepared, administrator="admin_2")
    assert _confirm_dryrun(
        setup, prepared
    )["status"] == "simulated_review_confirmation_no_execution"
    with pytest.raises(mod.RecoveryConfirmationError,
                       match="challenge_expired_or_invalid"):
        _confirm_dryrun(setup, prepared)


def test_confirmation_fails_closed_when_user_does_not_acknowledge_unknowns(
    setup,
):
    _make_pending(setup)
    prepared = _prepare_dryrun(setup)
    mod = setup.modules["migration_recovery_confirmation"]
    with pytest.raises(mod.RecoveryConfirmationError,
                       match="explicit_confirmation_required"):
        _confirm_dryrun(setup, prepared, acknowledge=False)
    with pytest.raises(mod.RecoveryConfirmationError,
                       match="explicit_confirmation_required"):
        _confirm_dryrun(setup, prepared, confirmed=False)
    assert _confirm_dryrun(
        setup, prepared
    )["status"] == "simulated_review_confirmation_no_execution"


def test_challenge_wrong_entity_or_disposition_consumes_one_use_token(setup):
    _make_pending(setup)
    prepared = _prepare_dryrun(setup)
    mod = setup.modules["migration_recovery_confirmation"]
    with pytest.raises(mod.RecoveryConfirmationError,
                       match="challenge_scope_mismatch"):
        _confirm_dryrun(setup, prepared, disposition="defer_until_further_evidence")
    with pytest.raises(mod.RecoveryConfirmationError,
                       match="challenge_expired_or_invalid"):
        _confirm_dryrun(setup, prepared)


def test_prepare_replaces_previous_user_challenge_without_cross_user_damage(
    setup,
):
    _make_pending(setup)
    first = _prepare_dryrun(setup)
    other = _prepare_dryrun(setup, administrator="admin_2")
    latest = _prepare_dryrun(
        setup, disposition="quarantine_for_investigation"
    )
    mod = setup.modules["migration_recovery_confirmation"]
    with pytest.raises(mod.RecoveryConfirmationError,
                       match="challenge_expired_or_invalid"):
        _confirm_dryrun(setup, first)
    assert _confirm_dryrun(
        setup, latest, disposition="quarantine_for_investigation"
    )["status"] == "simulated_review_confirmation_no_execution"
    assert _confirm_dryrun(
        setup, other, administrator="admin_2"
    )["status"] == "simulated_review_confirmation_no_execution"


def test_recovery_simulation_expires_and_does_not_allow_replay(
    setup, monkeypatch
):
    _make_pending(setup)
    mod = setup.modules["migration_recovery_confirmation"]
    now = [1000.0]
    monkeypatch.setattr(mod.time, "monotonic", lambda: now[0])
    prepared = _prepare_dryrun(setup)
    now[0] += 181.0
    with pytest.raises(mod.RecoveryConfirmationError,
                       match="challenge_expired_or_invalid"):
        _confirm_dryrun(setup, prepared)
    assert _check(setup)["operations"][0]["observed_status"] == (
        "unconfirmed_intent"
    )


def test_clean_applied_or_baseline_state_cannot_be_simulated_as_crash(
    setup,
):
    _ready(setup)
    mod = setup.modules["migration_recovery_confirmation"]
    with pytest.raises(mod.RecoveryConfirmationError):
        _prepare_dryrun(setup)
    journal = setup.modules["migration_journal"]
    journal.advance_phase(setup.tmp, "labels_staging", expected_revision=0)
    _intent(setup)
    journal.mark_label_applied(
        setup.tmp, "op_first", registry_id="entity_native_first",
        current_membership=True, expected_revision=2,
    )
    setup.entries["light.first"].labels = {"google_assistant"}
    with pytest.raises(mod.RecoveryConfirmationError):
        _prepare_dryrun(setup)


def test_faulty_second_entity_does_not_block_healthy_pending_entity(setup):
    _ready(setup)
    journal = setup.modules["migration_journal"]
    journal.advance_phase(setup.tmp, "labels_staging", expected_revision=0)
    _intent(setup)
    _intent(
        setup, entity="light.second", operation="second",
        registry="entity_native_second", revision=2,
    )
    del setup.entries["light.second"]
    prepared = _prepare_dryrun(setup)
    assert prepared["entity_id"] == "light.first"
    assert _confirm_dryrun(
        setup, prepared
    )["status"] == "simulated_review_confirmation_no_execution"
    quarantined = _prepare_dryrun(
        setup, entity_id="light.second",
        disposition="quarantine_for_investigation",
    )
    assert quarantined["category"] == "quarantine"
    assert _confirm_dryrun(
        setup, quarantined, entity_id="light.second",
        disposition="quarantine_for_investigation"
    )["execution_authorized"] is False


def test_invalid_disposition_and_entity_are_denied_without_writes(setup):
    _make_pending(setup)
    mod = setup.modules["migration_recovery_confirmation"]
    for entity, disposition in [
        ("light.first", "acknowledge_as_applied"),
        ("light.first", "retry_label_update"),
        ("light.first", "rollback"),
        ("light.first", "cutover"),
        ("light.first", ""),
        ("light.first\nprivate", "inspect_external_effects"),
    ]:
        with pytest.raises(mod.RecoveryConfirmationError,
                           match="invalid_investigation_choice"):
            _prepare_dryrun(
                setup, entity_id=entity, disposition=disposition
            )
    assert setup.hass.data.get("ha_voice_label_sync", {}).get(
        "_migration_recovery_dryrun_pending", {}
    ) == {}


def test_websocket_dryrun_endpoints_require_admin_and_no_mutators():
    import ast

    tree = ast.parse((ROOT / "websocket.py").read_text(encoding="utf-8"))
    funcs = [
        "websocket_prepare_migration_recovery_decision",
        "websocket_confirm_migration_recovery_decision",
    ]
    for name in funcs:
        node = next(
            n for n in tree.body
            if isinstance(n, ast.AsyncFunctionDef) and n.name == name
        )
        assert any(
            isinstance(d, ast.Attribute) and d.attr == "require_admin"
            for d in node.decorator_list
        )
        source = ast.unparse(node)
        assert "stage_one_approved_label" not in source
        assert "mark_label_applied" not in source
        assert "update_entity_label" not in source
        assert "record_label_intent" not in source
        assert "restore_reviewed_backup" not in source
    register = next(
        n for n in tree.body
        if isinstance(n, ast.FunctionDef)
        and n.name == "async_register_websocket_api"
    )
    for name in funcs:
        assert name in ast.unparse(register)



def _prepare_history(
    env, *,
    admin="admin_1", entity_id="light.first",
    disposition="inspect_external_effects",
):
    return asyncio.run(
        env.modules[
            "migration_recovery_records_api"
        ].async_prepare_investigation_record(
            env.hass, administrator_id=admin,
            entity_id=entity_id, disposition=disposition,
        )
    )


def _confirm_history(
    env, challenge, *,
    admin="admin_1", entity_id="light.first",
    disposition="inspect_external_effects",
    acknowledged=True,
):
    return asyncio.run(
        env.modules[
            "migration_recovery_records_api"
        ].async_confirm_investigation_record(
            env.hass, administrator_id=admin, entity_id=entity_id,
            disposition=disposition,
            confirmation_token=challenge["confirmation_token"],
            confirmed=True,
            acknowledge_external_uncertainty=acknowledged,
        )
    )


def _read_history(env):
    return asyncio.run(
        env.modules[
            "migration_recovery_records_api"
        ].async_get_investigation_records(env.hass)
    )


@pytest.mark.parametrize("membership", [False, True])
def test_durable_investigation_writes_only_private_audit_not_source_or_journal(
    setup, membership,
):
    _make_pending(setup)
    if membership:
        setup.entries["light.first"].labels = {"google_assistant"}
    migration_before = setup.modules["migration_journal"].read_journal(setup.tmp)
    yaml_before = (setup.tmp / "configuration.yaml").read_bytes()
    included_before = (setup.tmp / "google_entities.yaml").read_bytes()
    target = (
        setup.tmp / ".storage" / "hvls_migration"
        / "recovery-investigation-records"
    )
    prepared = _prepare_history(setup)
    assert prepared["status"] == "awaiting_durable_investigation_confirmation"
    assert not target.exists()  # Prepare never creates a record or directory.
    assert prepared["expected_record_count"] == 0
    assert prepared["execution_authorized"] is False
    assert prepared["journal_ack_allowed"] is False
    written = _confirm_history(setup, prepared)
    assert written["status"] == "durable_investigation_recorded_no_execution"
    assert written["record_fsync_completed"] is True
    assert written["execution_authorized"] is False
    assert written["journal_ack_allowed"] is False
    assert written["retry_allowed"] is False
    assert written["rollback_allowed"] is False
    assert written["stage_allowed"] is False
    assert written["cutover_allowed"] is False
    assert written["label_changed"] is False
    assert written["journal_changed"] is False
    assert written["production_yaml_changed"] is False
    assert written["record"]["sequence"] == 1
    assert (target.stat().st_mode & 0o077) == 0
    record_path = target / "000001.json"
    assert record_path.is_file()
    assert (record_path.stat().st_mode & 0o077) == 0
    saved = record_path.read_bytes()
    assert b"admin_1" not in saved
    assert b"PRIVATE ENTITY NAME" not in saved
    assert b"PRIVATE_PROJECT_ID_NEVER_EXPOSE" not in saved
    assert b"record_is_not_execution_authorization" not in saved
    assert setup.modules["migration_journal"].read_journal(setup.tmp) == migration_before
    assert (setup.tmp / "configuration.yaml").read_bytes() == yaml_before
    assert (setup.tmp / "google_entities.yaml").read_bytes() == included_before
    assert setup.entries["light.first"].labels == (
        {"google_assistant"} if membership else frozenset()
    )
    hist = _read_history(setup)
    assert hist["status"] == "verified_investigation_history"
    assert hist["record_count"] == 1
    assert hist["records"][0]["evidence_relation"] == (
        "matching_current_observation"
    )
    assert hist["execution_authorized"] is False


def test_durable_audit_history_is_append_only_and_chained(setup):
    _make_pending(setup)
    old = _prepare_history(setup)
    first = _confirm_history(setup, old)
    folder = (
        setup.tmp / ".storage" / "hvls_migration"
        / "recovery-investigation-records"
    )
    original = (folder / "000001.json").read_bytes()
    next_step = _prepare_history(
        setup, disposition="defer_until_further_evidence"
    )
    second = _confirm_history(
        setup, next_step, disposition="defer_until_further_evidence"
    )
    assert (folder / "000001.json").read_bytes() == original
    second_record = __import__("json").loads(
        (folder / "000002.json").read_bytes()
    )
    assert second_record["previous_sha256"] == first["record"]["record_sha256"]
    assert second_record["record_sha256"] == second["record"]["record_sha256"]
    history = _read_history(setup)
    assert history["record_count"] == 2
    assert [row["sequence"] for row in history["records"]] == [1, 2]
    assert history["history_read_only"] is True


@pytest.mark.parametrize("tamper", [
    "bad_json", "changed_record", "missing_first", "unexpected_file",
    "symlink_record", "permissive_record", "permissive_directory",
])
def test_durable_history_corruption_or_crash_fails_closed(setup, tamper):
    _make_pending(setup)
    _confirm_history(setup, _prepare_history(setup))
    folder = (
        setup.tmp / ".storage" / "hvls_migration"
        / "recovery-investigation-records"
    )
    rec = folder / "000001.json"
    if tamper == "bad_json":
        rec.write_text("{CORRUPT_PRIVATE_SECRET", encoding="utf-8")
    elif tamper == "changed_record":
        raw = __import__("json").loads(rec.read_bytes())
        raw["disposition"] = "defer_until_further_evidence"
        rec.write_text(__import__("json").dumps(raw), encoding="utf-8")
    elif tamper == "missing_first":
        rec.rename(folder / "000002.json")
    elif tamper == "unexpected_file":
        (folder / ".pending-crash").write_text("intentionally interrupted")
    elif tamper == "symlink_record":
        rec.unlink()
        rec.symlink_to(setup.tmp / "configuration.yaml")
    elif tamper == "permissive_record":
        rec.chmod(0o644)
    elif tamper == "permissive_directory":
        folder.chmod(0o755)
    with pytest.raises(
        setup.modules["migration_recovery_records"].RecoveryLedgerError
    ):
        _read_history(setup)
    with pytest.raises(
        setup.modules["migration_recovery_records"].RecoveryLedgerError
    ):
        _prepare_history(setup)
    assert setup.modules["migration_journal"].read_journal(setup.tmp)[
        "operations"
    ][0]["status"] == "intent"


@pytest.mark.parametrize("drift", [
    "membership", "journal", "source", "entity_id", "label_id",
])
def test_durable_record_rejects_any_stale_review_before_write(setup, drift):
    _make_pending(setup)
    prepared = _prepare_history(setup)
    target = (
        setup.tmp / ".storage" / "hvls_migration"
        / "recovery-investigation-records"
    )
    if drift == "membership":
        setup.entries["light.first"].labels = {"google_assistant"}
    elif drift == "journal":
        setup.modules["migration_journal"].record_label_intent(
            setup.tmp, operation_id="op_second",
            entity_id="light.second", registry_id="entity_native_second",
            label_id="google_assistant", expected_before=False,
            expected_after=True, expected_revision=2,
        )
    elif drift == "source":
        (setup.tmp / "google_entities.yaml").write_bytes(
            ENTITIES + b"# altered\n"
        )
    elif drift == "entity_id":
        setup.entries["light.first"].id = "new_native_id"
    elif drift == "label_id":
        setup.labels.clear()
    with pytest.raises(ValueError):
        _confirm_history(setup, prepared)
    assert not target.exists()
    with pytest.raises(ValueError):
        _confirm_history(setup, prepared)


def test_durable_record_two_admins_ledger_head_conflict_is_refused(setup):
    _make_pending(setup)
    first = _prepare_history(setup, admin="admin_1")
    second = _prepare_history(setup, admin="admin_2")
    saved = _confirm_history(setup, second, admin="admin_2")
    assert saved["record_count"] == 1
    with pytest.raises(
        setup.modules["migration_recovery_records"].RecoveryLedgerError,
        match="ledger_changed_since_prepare",
    ):
        _confirm_history(setup, first, admin="admin_1")
    assert _read_history(setup)["record_count"] == 1


def test_wrong_admin_wrong_scope_expiry_and_reuse_denied(setup, monkeypatch):
    _make_pending(setup)
    mod = setup.modules["migration_recovery_records_api"]
    first = _prepare_history(setup)
    with pytest.raises(mod.RecoveryRecordError,
                       match="challenge_expired_or_invalid"):
        _confirm_history(setup, first, admin="admin_2")
    with pytest.raises(mod.RecoveryRecordError,
                       match="challenge_scope_mismatch"):
        _confirm_history(
            setup, first, disposition="defer_until_further_evidence"
        )
    with pytest.raises(mod.RecoveryRecordError,
                       match="challenge_expired_or_invalid"):
        _confirm_history(setup, first)
    clock = [300.0]
    monkeypatch.setattr(mod.time, "monotonic", lambda: clock[0])
    expiring = _prepare_history(setup)
    clock[0] += 181
    with pytest.raises(mod.RecoveryRecordError,
                       match="challenge_expired_or_invalid"):
        _confirm_history(setup, expiring)
    assert _read_history(setup)["record_count"] == 0


def test_durable_history_marks_stale_evidence_without_deleting_entry(setup):
    _make_pending(setup)
    _confirm_history(setup, _prepare_history(setup))
    setup.entries["light.first"].labels = {"google_assistant"}
    report = _read_history(setup)
    assert report["record_count"] == 1
    assert report["records"][0]["evidence_relation"] == (
        "historical_stale_observation"
    )
    assert report["records"][0]["execution_authorized"] is False


def test_external_drift_refused_by_disk_level_compare_and_swap(setup):
    _make_pending(setup)
    good = _prepare_history(setup)
    disk = setup.modules["migration_recovery_records"]
    baseline = setup.modules["migration_baseline"].verify_baseline(setup.tmp)
    with pytest.raises(disk.RecoveryLedgerError,
                       match="ledger_changed_since_prepare"):
        disk.append_investigation_record(
            str(setup.tmp),
            expected_record_count=1,
            expected_last_record_sha256="0" * 64,
            expected_journal_revision=2,
            expected_journal_evidence_sha256=good["journal_evidence_sha256"],
            expected_observed_evidence_sha256=good[
                "recovery_evidence_sha256"
            ],
            entity_id="light.first",
            disposition="inspect_external_effects",
            administrator_id="admin_1",
        )
    assert baseline["verified"] is True
    assert _read_history(setup)["record_count"] == 0


def test_existing_durable_record_is_not_execution_permission(setup):
    _make_pending(setup)
    saved = _confirm_history(setup, _prepare_history(setup))
    assert saved["record"]["record_is_not_execution_authorization"] is True
    from pathlib import Path
    code = (ROOT / "migration_stage_executor.py").read_text()
    assert "migration_recovery_records" not in code
    assert "migration_recovery_records_api" not in code
    assert "investigation_recorded_no_execution" not in code
    assert setup.modules["migration_journal"].read_journal(setup.tmp)[
        "operations"
    ][0]["status"] == "intent"


def test_durable_investigation_ws_is_admin_only_and_has_no_stage_code():
    import ast

    tree = ast.parse((ROOT / "websocket.py").read_text())
    names = [
        "websocket_get_migration_investigation_history",
        "websocket_prepare_migration_investigation_record",
        "websocket_confirm_migration_investigation_record",
    ]
    for name in names:
        fn = next(
            x for x in tree.body if isinstance(x, ast.AsyncFunctionDef)
            and x.name == name
        )
        assert any(
            isinstance(dec, ast.Attribute) and dec.attr == "require_admin"
            for dec in fn.decorator_list
        )
        body = ast.unparse(fn)
        for forbidden in [
            "update_entity_label", "mark_label_applied",
            "stage_one_approved_label", "restore_reviewed_backup",
            "advance_phase", "async_run_workflow",
        ]:
            assert forbidden not in body
    reg = next(
        n for n in tree.body if isinstance(n, ast.FunctionDef)
        and n.name == "async_register_websocket_api"
    )
    for name in names:
        assert name in ast.unparse(reg)
