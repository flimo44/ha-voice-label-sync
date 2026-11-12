"""Sandbox-only real HA 2026.11 event, automation and crash-boundary contract.

Uses ONLY temporary HA and original YAML. No staging executor invocation,
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
from types import ModuleType

from homeassistant.config_entries import ConfigEntries
from homeassistant.core import HomeAssistant
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers import label_registry as lr

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
            "restarted_process_scenarios": outcomes,
            "native_registry_and_journal_persisted": True,
            "source_yaml_unchanged": True,
            "stage_allowed": False,
            "cutover_allowed": False,
        }, sort_keys=True))


if __name__ == "__main__":
    asyncio.run(main())
