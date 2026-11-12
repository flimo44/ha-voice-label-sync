"""Sandbox-only real HA 2026.11 event, automation and crash-boundary contract.

Uses ONLY temporary HA and original YAML. No staging workflow invocation,
Google Home connection, existing user config or production integration reload.
"""

from __future__ import annotations

import asyncio
import importlib.util
import json
import subprocess
import sys
from pathlib import Path
from tempfile import TemporaryDirectory
from types import ModuleType, SimpleNamespace

from homeassistant import loader
from homeassistant.config_entries import ConfigEntries
from homeassistant.core import HomeAssistant
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers import label_registry as lr
from homeassistant.helpers import trigger as trigger_helper

COMPONENT = (
    Path(__file__).resolve().parents[1]
    / "custom_components" / "ha_voice_label_sync"
)
SOURCE = b"""# Byte-exact manually maintained Google Assistant source
google_assistant:
  expose_by_default: false
  entity_config:
    light.safe:
      expose: true
      name: "PRIVATE NAME"
"""
PREFIX = "_sandbox_hvls_faults"


def module(name: str):
    if PREFIX not in sys.modules:
        pkg = ModuleType(PREFIX)
        pkg.__path__ = [str(COMPONENT)]
        sys.modules[PREFIX] = pkg
    fullname = f"{PREFIX}.{name}"
    if fullname in sys.modules:
        return sys.modules[fullname]
    spec = importlib.util.spec_from_file_location(fullname, COMPONENT / f"{name}.py")
    assert spec is not None and spec.loader is not None
    loaded = importlib.util.module_from_spec(spec)
    sys.modules[fullname] = loaded
    spec.loader.exec_module(loaded)
    return loaded


async def boot(root: Path) -> HomeAssistant:
    hass = HomeAssistant(str(root))
    loader.async_setup(hass)
    hass.config_entries = ConfigEntries(hass, {})
    await hass.config_entries.async_initialize()
    await lr.async_load(hass)
    dr.async_setup(hass)
    await dr.async_load(hass)
    await er.async_load(hass)
    return hass


def current_facts(hass: HomeAssistant, entity_id: str, label_id: str) -> dict:
    entry = er.async_get(hass).async_get(entity_id)
    return {
        entity_id: {
            "registry_id": entry.id,
            "has_label": label_id in entry.labels,
        }
    }


async def make_entities(hass: HomeAssistant):
    labels = lr.async_get(hass)
    selected = labels.async_create("Google Assistant")
    other = labels.async_create("Unrelated label")
    registry = er.async_get(hass)
    item = registry.async_get_or_create(
        "light", "hvls_fault_sandbox", "safe",
        suggested_object_id="safe",
    )
    registry.async_update_entity(item.entity_id, labels={other.label_id})
    await hass.async_block_till_done()
    return item.entity_id, selected.label_id, other.label_id


async def test_real_automation_event(hass, entity_id, label_id, other_label):
    """A real HA automation should call only the harmless sandbox spy."""
    from homeassistant.setup import async_setup_component

    observed = []

    async def record_action(call):
        observed.append(call.data.get("marker", "observed"))

    # In the intentionally minimal HA bootstrap, trigger platforms must
    # be explicitly registered before loading the automation component.
    await trigger_helper.async_setup(hass)
    hass.services.async_register("hvls_sandbox", "record", record_action)
    config = {
        "automation": [
            {
                "id": "hvls_real_event_sandbox",
                "alias": "Native entity registry label update listener",
                "trigger": {
                    "platform": "event",
                    "event_type": "entity_registry_updated",
                    "event_data": {"action": "update", "entity_id": entity_id},
                },
                "action": {
                    "action": "hvls_sandbox.record",
                    "data": {"marker": "registry_update"},
                },
            }
        ]
    }
    assert await async_setup_component(hass, "automation", config), (
        "native HA automation setup failed"
    )
    await hass.async_start()
    await hass.async_block_till_done()

    writer = module("entity_label_writer")
    change = writer.update_entity_label(
        hass, entity_id, "Google Assistant", True, False
    )
    await hass.async_block_till_done()
    assert change["changed"] is True
    assert observed == ["registry_update"], observed
    assert er.async_get(hass).async_get(entity_id).labels == {
        other_label, label_id
    }

    writer.update_entity_label(hass, entity_id, "Google Assistant", True, True)
    await hass.async_block_till_done()
    assert observed == ["registry_update"], observed
    return {"actual_automation_service_calls": len(observed)}


async def test_real_registry_write_boundary(hass, label_id, other_label):
    """Real Core guard: exact native set and identity, zero guard writes."""
    guard = module("migration_write_boundary")
    registry = er.async_get(hass)
    row = registry.async_get_or_create(
        "light", "hvls_fault_sandbox", "boundary",
        suggested_object_id="cas_guard",
    )
    entity_id = row.entity_id
    registry.async_update_entity(entity_id, labels={other_label})
    await hass.async_block_till_done()
    captured = guard.capture_native_boundary(
        hass, entity_id=entity_id, configured_label="Google Assistant",
        desired_present=True,
    )
    assert captured["status"] == "captured", captured
    assert captured["snapshot"]["registry_id"] == row.id
    assert captured["snapshot"]["before_labels"] == [other_label]
    result = guard.assess_native_boundary(hass, capture=captured)
    assert result["status"] == "matched", result
    assert result["execution_authorized"] is False
    assert result["stage_allowed"] is False
    assert registry.async_get(entity_id).labels == {other_label}

    # An unrelated HA label arrives before a hypothetical write.
    # No guard action may silently overwrite or drop that label.
    unrelated = lr.async_get(hass).async_create("Concurrent label")
    registry.async_update_entity(
        entity_id, labels={other_label, unrelated.label_id}
    )
    await hass.async_block_till_done()
    stale = guard.assess_native_boundary(hass, capture=captured)
    assert stale["status"] == "refused", stale
    assert stale["reason"] == "native_full_label_set_changed"
    assert registry.async_get(entity_id).labels == {
        other_label, unrelated.label_id
    }

    # Even after a restored local state, the external side effects are
    # unknown: a matching snapshot NEVER authorizes a retry.
    registry.async_update_entity(entity_id, labels={other_label})
    await hass.async_block_till_done()
    restored = guard.assess_native_boundary(hass, capture=captured)
    assert restored["status"] == "matched"
    assert restored["external_consumers_verified"] is False
    assert restored["execution_authorized"] is False

    # Another actor adds the target label. The captured addition is stale.
    registry.async_update_entity(
        entity_id, labels={other_label, label_id}
    )
    await hass.async_block_till_done()
    assert guard.assess_native_boundary(
        hass, capture=captured
    )["status"] == "refused"

    # Test opposite desired direction without ever writing from the guard.
    removal = guard.capture_native_boundary(
        hass, entity_id=entity_id, configured_label="Google Assistant",
        desired_present=False,
    )
    assert removal["status"] == "captured"
    checked = guard.assess_native_boundary(hass, capture=removal)
    assert checked["status"] == "matched"
    assert checked["proposed_delta"] == "remove_one_label"
    assert registry.async_get(entity_id).labels == {
        other_label, label_id
    }
    return {
        "native_labels_set_cas": True,
        "unrelated_label_race_rejected": True,
        "target_membership_race_rejected": True,
        "recovery_not_authorized": True,
    }


async def test_real_dormant_staging_native_cas(hass, label_id, other_label):
    """Actual dormant native writer, isolated HA, durable intent left pending.

    This deliberately invokes ONLY the private low-level writer on synthetic
    test entities, never the stage executor workflow or a production API.
    """
    stage = module("migration_stage_executor")
    guard = module("migration_write_boundary")
    baseline = module("migration_baseline")
    discovery = module("migration_discovery")
    journal = module("migration_journal")
    registry = er.async_get(hass)
    root = Path(hass.config.config_dir)

    inventory = discovery.discover_google_assistant(root)
    assert inventory["source"]["status"] == "resolved"
    assert baseline.capture_baseline(root, inventory)["verified"] is True
    assert journal.initialize_journal(root)["revision"] == 0
    assert journal.advance_phase(
        root, "labels_staging", expected_revision=0
    )["revision"] == 1

    async def one_entity(unique_id: str):
        entry = registry.async_get_or_create(
            "light", "hvls_fault_sandbox", unique_id,
            suggested_object_id=unique_id,
        )
        registry.async_update_entity(
            entry.entity_id, labels={other_label}
        )
        await hass.async_block_till_done()
        capture = guard.capture_native_boundary(
            hass, entity_id=entry.entity_id,
            configured_label="Google Assistant",
            desired_present=True,
        )
        assert capture["status"] == "captured", capture
        assert capture["snapshot"]["before_labels"] == [other_label]
        return entry, capture

    original_catalog = stage._current_catalog

    def sandbox_catalog(_hass, configured_label, ids):
        assert configured_label == "Google Assistant"
        return label_id, {
            eid: {
                "registry_id": entry.id,
                "eligible": True,  # deterministic synthetic test eligibility
                "label_present": label_id in entry.labels,
            }
            for eid in ids
            if (entry := registry.async_get(eid)) is not None
        }

    stage._current_catalog = sandbox_catalog
    try:
        good, capture = await one_entity("stage_cas_good")
        intent = journal.record_label_intent(
            root, operation_id="stage_cas_good_intent",
            entity_id=good.entity_id, registry_id=good.id,
            label_id=label_id, expected_before=False,
            expected_after=True, expected_revision=1,
        )
        assert intent["revision"] == 2
        stage._write_one_ha_label(
            hass, entity_id=good.entity_id,
            expected_registry_id=good.id,
            label_id=label_id,
            configured_label="Google Assistant",
            expected_boundary_capture=capture,
        )
        await hass.async_block_till_done()
        assert registry.async_get(good.entity_id).labels == {
            other_label, label_id
        }
        # Low-level native mutation is not journal confirmation.
        assert journal.read_journal(root)["operations"][0]["status"] == "intent"

        raced, stale_capture = await one_entity("stage_cas_race")
        next_intent = journal.record_label_intent(
            root, operation_id="stage_cas_race_intent",
            entity_id=raced.entity_id, registry_id=raced.id,
            label_id=label_id, expected_before=False,
            expected_after=True, expected_revision=2,
        )
        assert next_intent["revision"] == 3
        third = lr.async_get(hass).async_create("Concurrent stage test label")
        registry.async_update_entity(
            raced.entity_id, labels={other_label, third.label_id}
        )
        await hass.async_block_till_done()
        try:
            stage._write_one_ha_label(
                hass, entity_id=raced.entity_id,
                expected_registry_id=raced.id,
                label_id=label_id,
                configured_label="Google Assistant",
                expected_boundary_capture=stale_capture,
            )
        except stage.MigrationStageError as exc:
            assert str(exc) == "native_full_label_set_changed"
        else:
            raise AssertionError("native CAS allowed a stale third-party label")

        assert registry.async_get(raced.entity_id).labels == {
            other_label, third.label_id
        }
        assert [op["status"] for op in journal.read_journal(root)["operations"]] == [
            "intent", "intent"
        ]
        assert (root / "configuration.yaml").read_bytes() == SOURCE

        # Admission is a separate, read-only diagnostic from the real
        # persisted journal and this real native HA registry observation.
        # The review envelope below is deliberately incomplete: it cannot
        # ever become an authorization or a bypass for an unresolved intent.
        gate = module("migration_execution_admission")
        real_native = guard.capture_native_boundary(
            hass, entity_id=raced.entity_id,
            configured_label="Google Assistant", desired_present=True,
        )
        assert real_native["status"] == "captured", real_native
        manifest = baseline.verify_baseline(root)
        sources = stage.verify_current_sources(
            root, inventory["source"]["locations"],
            manifest["manifest_sha256"],
        )
        gate_result = gate.assess_stage_admission(
            entity_id=raced.entity_id,
            saved_draft={
                "status": "not_saved", "decisions": {},
                "baseline_manifest_sha256": manifest["manifest_sha256"],
                "journal_revision": 3, "journal_phase": "labels_staging",
            },
            review={}, attestation={},
            journal=journal.read_journal(root),
            sources_verified=sources,
            native_capture=real_native,
        )
        assert "journal_phase_or_entity_operation_not_safe" in (
            gate_result["technical_blockers"]
        )
        assert gate_result["execution_authorized"] is False
        assert gate_result["journal_ack_allowed"] is False
        assert gate_result["stage_allowed"] is False
        assert gate_result["cutover_allowed"] is False
        # The real protected journal contains unresolved intents. Even if
        # an opaque digest is supplied, an independent approval rehearsal
        # may not promote this incomplete admission to a confirmation.
        approval = module("migration_execution_approval_dryrun")
        gate_result["server_evidence_sha256"] = "a" * 64
        try:
            approval._trusted_preview(gate_result, raced.entity_id)
        except approval.ApprovalDryRunError as exc:
            assert str(exc) == "technical_admission_not_consistent"
        else:
            raise AssertionError("pending HA intent promoted to approval")
        return {
            "approval_rehearsal_refused_pending_intent": True,
            "execution_admission_rejected_pending_intent": True,
            "native_private_writer_checked": True,
            "third_party_label_race_refused": True,
            "both_intents_unconfirmed": True,
            "yaml_unchanged": True,
            "staging_endpoint_added": False,
        }
    finally:
        stage._current_catalog = original_catalog


async def prepare_crash_boundary(
    root: Path, *, mutate_after_intent: bool
) -> dict:
    root.mkdir()
    (root / "configuration.yaml").write_bytes(SOURCE)
    hass = await boot(root)
    entity_id, label_id, other_label = await make_entities(hass)
    discovery = module("migration_discovery")
    baseline = module("migration_baseline")
    journal = module("migration_journal")
    stage = module("migration_stage_executor")

    raw = discovery.discover_google_assistant(root)
    assert raw["source"]["status"] == "resolved", raw["source"]
    saved = baseline.capture_baseline(root, raw)
    assert saved["verified"] is True
    initialized = journal.initialize_journal(root)
    assert initialized["revision"] == 0
    started = journal.advance_phase(root, "labels_staging", expected_revision=0)
    assert started["revision"] == 1

    entity = er.async_get(hass).async_get(entity_id)
    intent = journal.record_label_intent(
        root,
        operation_id="one_sandbox_operation",
        entity_id=entity_id,
        registry_id=entity.id,
        label_id=label_id,
        expected_before=False,
        expected_after=True,
        expected_revision=1,
    )
    assert intent["revision"] == 2
    assert intent["operations"][0]["status"] == "intent"

    if mutate_after_intent:
        result = module("entity_label_writer").update_entity_label(
            hass, entity_id, "Google Assistant", True, False
        )
        assert result["changed"] is True

    # Simulate power loss after an intent record; no ack is written.
    # Explicitly flush the actual HA registry to reproduce the
    # persisted membership at the crash boundary.
    registry = er.async_get(hass)
    await registry._store.async_save(registry._data_to_save())
    labels = lr.async_get(hass)
    await labels._store.async_save(labels._data_to_save())
    await hass.async_block_till_done()
    facts = current_facts(hass, entity_id, label_id)
    before = journal.recovery_report(root, facts)
    assert before["operations"][0]["status"] == "unconfirmed_intent"
    assert before["needs_review"] is True
    assert before["cutover_allowed"] is False
    try:
        stage._check_pending(journal.read_journal(root), expected_revision=2,
                             entity_id=entity_id)
    except stage.MigrationStageError as exc:
        assert str(exc) == "entity_already_has_migration_operation"
    else:
        raise AssertionError("duplicate mutation not blocked")
    assert (root / "configuration.yaml").read_bytes() == SOURCE
    assert er.async_get(hass).async_get(entity_id).labels == (
        {other_label, label_id} if mutate_after_intent else {other_label}
    )
    return {
        "entity_id": entity_id, "label_id": label_id,
        "should_have_label": mutate_after_intent,
    }


async def verify_after_process_restart(root: Path, *, should_have_label: bool):
    """A second Python process reads the persisted real HA registry + journal."""
    hass = await boot(root)
    baseline = module("migration_baseline")
    journal = module("migration_journal")
    stage = module("migration_stage_executor")
    entity_id = "light.safe"
    label_id = "google_assistant"
    entry = er.async_get(hass).async_get(entity_id)
    assert entry is not None, "real HA registry did not persist"
    assert (label_id in entry.labels) is should_have_label
    assert baseline.verify_baseline(root)["verified"] is True
    prior = journal.read_journal(root)
    assert prior["phase"] == "labels_staging"
    assert prior["revision"] == 2
    assert prior["operations"][0]["status"] == "intent"
    facts = current_facts(hass, entity_id, label_id)
    recovery = journal.recovery_report(root, facts)
    # The administrator recovery API's read-only helpers must classify
    # exactly the same live HA registry + protected journal after a genuine
    # second interpreter started and loaded the persisted HA data.
    recovery_view = module("migration_recovery_view")
    disk = recovery_view._read_disk_snapshot(str(root))
    assert disk["status"] == "loaded"
    native, labels_exist = recovery_view._native_observations(
        hass, disk["journal"]["operations"]
    )
    reviewed = recovery_view._finalize_disk_snapshot(
        str(root), disk, native, labels_exist
    )
    assert reviewed["status"] == "review_required", reviewed
    assert reviewed["operations"][0]["observed_status"] == "unconfirmed_intent"
    assert reviewed["operations"][0]["membership"] == (
        "present" if should_have_label else "absent"
    )
    assert reviewed["source_integrity"] == "verified_unchanged"
    hypotheses = reviewed["resolution_scenarios"]
    assert hypotheses["status"] == "investigation_required"
    assert hypotheses["summary"]["unconfirmed"] == 1
    assert hypotheses["operations"][0]["scenario"] == (
        "intent_desired_membership_observed" if should_have_label
        else "intent_original_membership_observed"
    )
    assert hypotheses["operations"][0]["resolution_authorized"] is False
    assert hypotheses["journal_ack_allowed"] is False
    assert hypotheses["retry_allowed"] is False
    assert hypotheses["rollback_allowed"] is False
    assert reviewed["automatic_recovery_allowed"] is False
    assert len(reviewed["journal_evidence_sha256"]) == 64
    # The two-phase human confirmation runs against real persisted HA data
    # loaded by this SECOND interpreter, never against a user installation.
    # Supply only the one synthetic HVLS entry; no actual integration setup
    # or external Google Assistant is started in this sandbox.
    hass.config_entries = SimpleNamespace(
        async_entries=lambda domain: (
            [SimpleNamespace(entry_id="sandbox_only")]
            if domain == "ha_voice_label_sync" else []
        )
    )
    dryrun = module("migration_recovery_confirmation")
    prepared = await dryrun.prepare_admin_recovery_decision(
        hass, administrator_id="synthetic_admin",
        entity_id=entity_id,
        disposition="inspect_external_effects",
    )
    assert prepared["status"] == "awaiting_simulated_human_confirmation"
    assert prepared["journal_evidence_sha256"] == (
        reviewed["journal_evidence_sha256"]
    )
    confirmed = await dryrun.confirm_admin_recovery_decision(
        hass, administrator_id="synthetic_admin",
        entity_id=entity_id,
        disposition="inspect_external_effects",
        confirmation_token=prepared["confirmation_token"],
        confirmed=True, acknowledge_external_uncertainty=True,
    )
    assert confirmed["status"] == "simulated_review_confirmation_no_execution"
    assert confirmed["fresh_evidence_rechecked"] is True
    assert confirmed["no_action_was_performed"] is True
    assert confirmed["execution_authorized"] is False
    assert confirmed["journal_ack_allowed"] is False
    assert confirmed["retry_allowed"] is False
    assert confirmed["rollback_allowed"] is False
    assert confirmed["cutover_allowed"] is False
    # Verify a real disk-backed record can be appended and reloaded after
    # this separate Python interpreter loaded the native HA registries.
    durable = module("migration_recovery_records_api")
    durable_store = module("migration_recovery_records")
    prepared_record = await durable.async_prepare_investigation_record(
        hass, administrator_id="synthetic_admin",
        entity_id=entity_id, disposition="inspect_external_effects",
    )
    assert prepared_record["status"] == (
        "awaiting_durable_investigation_confirmation"
    )
    written = await durable.async_confirm_investigation_record(
        hass, administrator_id="synthetic_admin",
        entity_id=entity_id, disposition="inspect_external_effects",
        confirmation_token=prepared_record["confirmation_token"],
        confirmed=True, acknowledge_external_uncertainty=True,
    )
    assert written["status"] == "durable_investigation_recorded_no_execution"
    assert written["record_count"] == 1
    assert written["record_fsync_completed"] is True
    assert written["journal_ack_allowed"] is False
    verified_history = durable_store.load_investigation_ledger(str(root))
    assert verified_history["record_count"] == 1
    assert verified_history["records"][0]["record_is_not_execution_authorization"]
    assert verified_history["records"][0]["execution_authorized"] is False
    assert (root / "configuration.yaml").read_bytes() == SOURCE
    assert reviewed["stage_allowed"] is False
    assert reviewed["cutover_allowed"] is False
    assert recovery["operations"][0]["status"] == "unconfirmed_intent"
    assert recovery["needs_review"] is True
    assert recovery["cutover_allowed"] is False
    try:
        stage._check_pending(prior, expected_revision=2, entity_id=entity_id)
    except stage.MigrationStageError as exc:
        assert str(exc) == "entity_already_has_migration_operation"
    else:
        raise AssertionError("a pending intent allowed a second stage operation")
    assert journal.read_journal(root) == prior
    assert (root / "configuration.yaml").read_bytes() == SOURCE
    return {"restarted_process": True, "unconfirmed_intent": True,
            "membership_present": should_have_label,
            "automatic_resume": False, "cutover_allowed": False}


async def main():
    if len(sys.argv) == 4 and sys.argv[1] == "--verify":
        details = await verify_after_process_restart(
            Path(sys.argv[2]), should_have_label=sys.argv[3] == "1"
        )
        print("HVLS_REAL_HA_RECOVERY_RESTART_PASS", json.dumps(details, sort_keys=True))
        return

    assert len(sys.argv) == 1
    with TemporaryDirectory(prefix="hvls-faults-") as tmp:
        base = Path(tmp)
        automation_root = base / "automation"
        automation_root.mkdir()
        (automation_root / "configuration.yaml").write_bytes(SOURCE)
        hass = await boot(automation_root)
        entity_id, label_id, other_label = await make_entities(hass)
        automation_result = await test_real_automation_event(
            hass, entity_id, label_id, other_label
        )
        boundary_result = await test_real_registry_write_boundary(
            hass, label_id, other_label
        )
        stage_result = await test_real_dormant_staging_native_cas(
            hass, label_id, other_label
        )
        assert (automation_root / "configuration.yaml").read_bytes() == SOURCE

        outcomes = []
        for after in (False, True):
            root = base / ("crash_after_write" if after else "crash_before_write")
            await prepare_crash_boundary(root, mutate_after_intent=after)
            run = subprocess.run(
                [sys.executable, str(Path(__file__).resolve()),
                 "--verify", str(root), "1" if after else "0"],
                capture_output=True, text=True, timeout=40, check=False,
            )
            assert run.returncode == 0, (
                "restarted HA verification failed (sanitized): "
                + run.stderr[-1400:]
            )
            assert "HVLS_REAL_HA_RECOVERY_RESTART_PASS" in run.stdout
            outcomes.append("after_write" if after else "before_write")

        assert outcomes == ["before_write", "after_write"]
        print("HVLS_NATIVE_AUTOMATION_AND_CRASH_PASS", json.dumps({
            "core": "2026.11.0",
            "real_automation": automation_result,
            "native_write_boundary": boundary_result,
            "dormant_writer_native_cas": stage_result,
            "restarted_process_scenarios": outcomes,
            "native_registry_and_journal_persisted": True,
            "source_yaml_unchanged": True,
            "stage_allowed": False,
            "cutover_allowed": False,
        }, sort_keys=True))


if __name__ == "__main__":
    asyncio.run(main())
