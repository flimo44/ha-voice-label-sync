"""Isolated HA Core 2026.11 runtime contract for HVLS migration.

RUN ONLY in an ephemeral Home Assistant container with an empty, temporary
/config directory. This is intentionally *not* imported by the ordinary
Python 3.12 unit-test suite, which uses isolated HA boundary fakes.

No network service, Google Home account, real user configuration or label
staging operation is used. Actual HA registry events and the real manual
GoogleConfig.should_expose() implementation are exercised.
"""

from __future__ import annotations

import asyncio
import importlib.util
import json
import sys
from pathlib import Path
from tempfile import TemporaryDirectory
from types import ModuleType, SimpleNamespace
from typing import Any

from homeassistant.components.google_assistant.const import (
    CONF_ENTITY_CONFIG,
    CONF_EXPOSE_BY_DEFAULT,
    CONF_EXPOSED_DOMAINS,
)
from homeassistant.components.google_assistant.http import GoogleConfig
from homeassistant.config_entries import SOURCE_IMPORT
from homeassistant.const import EntityCategory
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers import label_registry as lr

COMPONENT = (
    Path(__file__).resolve().parents[1]
    / "custom_components" / "ha_voice_label_sync"
)
GOOGLE_SOURCE = b"""# Protected handwritten source. Bytes must never change.
google_assistant:
  expose_by_default: false
  entity_config:
    light.safe:
      expose: true
      name: "PRIVATE_CAFETERIA_NAME"
    light.excluded:
      expose: false
"""


def load_component(name: str) -> Any:
    """Load real HVLS module without bootstrapping the HA frontend panel."""
    prefix = "_sandbox_hvls"
    if prefix not in sys.modules:
        package = ModuleType(prefix)
        package.__path__ = [str(COMPONENT)]
        sys.modules[prefix] = package
    full_name = f"{prefix}.{name}"
    if full_name in sys.modules:
        return sys.modules[full_name]
    spec = importlib.util.spec_from_file_location(
        full_name, COMPONENT / f"{name}.py"
    )
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[full_name] = module
    spec.loader.exec_module(module)
    return module


async def exercise_ha_core_native_contract() -> dict[str, Any]:
    """Test actual registry events, Google policy and V1 label writer."""
    with TemporaryDirectory(prefix="hvls-ha-core-sandbox-") as temporary:
        base = Path(temporary)
        config = base / "configuration.yaml"
        config.write_bytes(GOOGLE_SOURCE)
        hass = HomeAssistant(str(base))
        # Core requires the device registry to be initialized before
        # loading the entity registry. Match its real bootstrap order.
        await lr.async_load(hass, load_empty=True)
        dr.async_setup(hass)
        await dr.async_load(hass, load_empty=True)
        await er.async_load(hass, load_empty=True)

        labels = lr.async_get(hass)
        entity_registry = er.async_get(hass)
        target = labels.async_create("Google Assistant")
        unrelated = labels.async_create("Unrelated Label")

        entries = {}
        for name, hidden, category in (
            ("safe", None, None),
            ("excluded", None, None),
            ("auxiliary", None, EntityCategory.DIAGNOSTIC),
        ):
            entries[name] = entity_registry.async_get_or_create(
                "light", "hvls_sandbox", name,
                suggested_object_id=name,
                entity_category=category,
                hidden_by=hidden,
            )
        for entry in entries.values():
            entity_registry.async_update_entity(
                entry.entity_id, labels={unrelated.label_id}
            )
        await hass.async_block_till_done()

        safe = entries["safe"].entity_id
        excluded = entries["excluded"].entity_id
        auxiliary = entries["auxiliary"].entity_id

        manual_config = {
            CONF_EXPOSE_BY_DEFAULT: True,
            CONF_EXPOSED_DOMAINS: ["light"],
            CONF_ENTITY_CONFIG: {
                safe: {"expose": True, "name": "PRIVATE NAME"},
                excluded: {"expose": False},
            },
        }
        google = GoogleConfig(hass, manual_config)
        # A controlled imported entry is enough for the PR #120 observer.
        # No real Google login, OAuth token or network call is involved.
        hass.config_entries = SimpleNamespace(
            async_entries=lambda domain: (
                [SimpleNamespace(source=SOURCE_IMPORT, runtime_data=google)]
                if domain == "google_assistant" else []
            )
        )
        exposed_before = {
            key: google.should_expose(entry.entity_id)
            for key, entry in entries.items()
        }
        assert exposed_before == {
            "safe": True, "excluded": False, "auxiliary": False
        }, exposed_before

        audit = load_component("migration_staging_impact")
        initial = audit.capture_loaded_ga_label_impact(
            hass, [safe, excluded, auxiliary]
        )
        assert initial["status"] == "captured", initial
        assert all(
            row["status"] == "captured"
            for row in initial["observations"].values()
        ), initial

        events = []
        potential_external_calls = []
        @callback
        def native_registry_listener(event):
            if event.data.get("entity_id") == safe:
                events.append(event.data.get("action"))
                # Model an arbitrary external observer; don't call V1
                # generator and do not modify any YAML.
                potential_external_calls.append("outside_consumer_notified")

        unsubscribe = hass.bus.async_listen(
            er.EVENT_ENTITY_REGISTRY_UPDATED, native_registry_listener
        )
        writer = load_component("entity_label_writer")
        try:
            result = writer.update_entity_label(
                hass, safe, target.name, True, False
            )
            await hass.async_block_till_done()
            assert result["changed"] is True, result
            assert entity_registry.async_get(safe).labels == {
                unrelated.label_id, target.label_id
            }
            assert events == ["update"], events
            assert potential_external_calls == [
                "outside_consumer_notified"
            ], potential_external_calls

            # Native manual Google exposure must remain identical after
            # changing ONLY the HVLS label.
            exposed_after = {
                key: google.should_expose(entry.entity_id)
                for key, entry in entries.items()
            }
            assert exposed_after == exposed_before
            after = audit.capture_loaded_ga_label_impact(
                hass, [safe, excluded, auxiliary]
            )
            assert after["status"] == "captured", after
            assert {
                entity_id: row["native_before"]
                for entity_id, row in after["observations"].items()
            } == {
                entity_id: row["native_before"]
                for entity_id, row in initial["observations"].items()
            }

            # Repeat the same desired operation with expected_enabled=True:
            # this is a no-op, so no extra registry event or callback.
            same = writer.update_entity_label(
                hass, safe, target.name, True, True
            )
            await hass.async_block_till_done()
            assert same["changed"] is False
            assert events == ["update"]

            # Concurrent-label drift must be rejected before any write.
            try:
                writer.update_entity_label(
                    hass, safe, target.name, True, False
                )
            except ValueError:
                pass
            else:
                raise AssertionError("stale label CAS was accepted")
            assert events == ["update"]
            assert config.read_bytes() == GOOGLE_SOURCE

            # The independent PR #120 evaluator still never authorizes
            # staging or claims Google Home is verified.
            diag = {
                "entities": [
                    {"entity_id": item} for item in [safe, excluded, auxiliary]
                ],
                "loaded_policy": {"status": "match_compared_fields"},
                "runtime_snapshot": {"status": "complete"},
            }
            plan = {
                "label_additions_proposed": [
                    {"entity_id": item} for item in [safe, excluded, auxiliary]
                ],
                "global_blockers": [],
            }
            assessment = audit.assess_label_staging_impact(
                diag, plan, after
            )
            assert assessment["status"] == "no_manual_policy_delta_detected"
            assert assessment["stage_allowed"] is False
            assert assessment["cutover_allowed"] is False
            assert assessment["google_home_state_verified"] is False

            # The V1 source must remain byte-identical throughout these
            # native operations.
            assert config.read_bytes() == GOOGLE_SOURCE
            return {
                "home_assistant_core": "2026.11.0",
                "native_entity_registry_event": events,
                "external_listener_would_receive_event": True,
                "unrelated_labels_preserved": True,
                "manual_google_exposure_before_after_equal": True,
                "source_yaml_unchanged": True,
                "write_was_sandbox_only": True,
                "stage_allowed": False,
                "cutover_allowed": False,
                "google_home_state_verified": False,
            }
        finally:
            unsubscribe()


def main() -> None:
    assert sys.version_info >= (3, 14, 2), (
        "This smoke contract needs Home Assistant 2026.11's Python 3.14.2+"
    )
    result = asyncio.run(exercise_ha_core_native_contract())
    print("HVLS_NATIVE_HA_CORE_SANDBOX_PASS", json.dumps(result, sort_keys=True))


if __name__ == "__main__":
    main()
