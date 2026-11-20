"""Sandbox-only real HA 2026.11 automation contract for HVLS label writes.

A real Home Assistant automation listening to entity registry updates must
fire once when HVLS adds its label, and not again for a no-op. Uses ONLY a
temporary HA and an original YAML; no Google Home connection or user config.
"""

from __future__ import annotations

import asyncio
import importlib.util
import json
import sys
from pathlib import Path
from tempfile import TemporaryDirectory
from types import ModuleType

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


async def main():
    assert len(sys.argv) == 1
    with TemporaryDirectory(prefix="hvls-automation-") as tmp:
        root = Path(tmp)
        (root / "configuration.yaml").write_bytes(SOURCE)
        hass = await boot(root)
        entity_id, label_id, other_label = await make_entities(hass)
        automation_result = await test_real_automation_event(
            hass, entity_id, label_id, other_label
        )
        assert (root / "configuration.yaml").read_bytes() == SOURCE
        await hass.async_stop()
        print("HVLS_NATIVE_AUTOMATION_PASS", json.dumps({
            "core": "2026.11.0",
            "real_automation": automation_result,
            "source_yaml_unchanged": True,
        }, sort_keys=True))


if __name__ == "__main__":
    asyncio.run(main())
