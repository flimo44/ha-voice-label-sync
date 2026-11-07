"""Tests for the read-only HVLS entity catalog."""

import importlib.util
from pathlib import Path

MODULE_PATH = (
    Path(__file__).resolve().parents[1]
    / "custom_components"
    / "ha_voice_label_sync"
    / "entity_catalog.py"
)

spec = importlib.util.spec_from_file_location(
    "hvls_entity_catalog_test", MODULE_PATH
)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

build_entity_catalog = module.build_entity_catalog


def test_catalog_resolves_labels_and_areas():
    registries = {
        "label_registry": {
            "data": {
                "labels": [
                    {
                        "label_id": "google_assistant",
                        "name": "Google Assistant",
                    }
                ]
            }
        },
        "area_registry": {
            "data": {
                "areas": [
                    {"area_id": "sejour", "name": "Séjour"},
                    {"area_id": "bureau", "name": "Bureau"},
                ]
            }
        },
        "device_registry": {
            "data": {
                "devices": [
                    {"id": "device_1", "area_id": "bureau"}
                ]
            }
        },
        "entity_registry": {
            "data": {
                "entities": [
                    {
                        "entity_id": "switch.lampe",
                        "name": "Lampe",
                        "labels": ["google_assistant"],
                        "area_id": "sejour",
                    },
                    {
                        "entity_id": "climate.bureau",
                        "original_name": "Thermostat",
                        "labels": [],
                        "device_id": "device_1",
                    },
                    {
                        "entity_id": "sensor.cache",
                        "labels": ["google_assistant"],
                        "disabled_by": "user",
                    },
                ]
            }
        },
    }

    result = build_entity_catalog(
        registries, "Google Assistant"
    )

    assert result["total"] == 3
    assert result["labeled"] == 2

    items = {
        item["entity_id"]: item
        for item in result["entities"]
    }

    assert items["switch.lampe"]["has_label"] is True
    assert items["switch.lampe"]["room"] == "Séjour"

    assert items["climate.bureau"]["has_label"] is False
    assert items["climate.bureau"]["room"] == "Bureau"

    assert items["sensor.cache"]["has_label"] is True
    assert items["sensor.cache"]["disabled"] is True


def test_catalog_with_unknown_label():
    registries = {
        "label_registry": {"data": {"labels": []}},
        "area_registry": {"data": {"areas": []}},
        "device_registry": {"data": {"devices": []}},
        "entity_registry": {
            "data": {
                "entities": [
                    {"entity_id": "switch.test", "labels": []}
                ]
            }
        },
    }

    result = build_entity_catalog(
        registries, "unknown_label"
    )

    assert result["total"] == 1
    assert result["labeled"] == 0
    assert result["entities"][0]["has_label"] is False
    assert result["warnings"]


def test_catalog_eligibility():
    registries = {
        "label_registry": {
            "data": {
                "labels": [
                    {"label_id": "hvls", "name": "HVLS"}
                ]
            }
        },
        "area_registry": {"data": {"areas": []}},
        "device_registry": {"data": {"devices": []}},
        "entity_registry": {
            "data": {
                "entities": [
                    {
                        "entity_id": "switch.ok",
                        "labels": ["hvls"],
                    },
                    {
                        "entity_id": "switch.disabled",
                        "labels": ["hvls"],
                        "disabled_by": "user",
                    },
                    {
                        "entity_id": "counter.unsupported",
                        "labels": ["hvls"],
                    },
                    {
                        "entity_id": "light.no_label",
                        "labels": [],
                    },
                ]
            }
        },
    }

    result = build_entity_catalog(
        registries,
        "HVLS",
        frozenset({"switch", "light"}),
    )

    entities = {
        entity["entity_id"]: entity
        for entity in result["entities"]
    }

    assert result["supported_domains"] == ["light", "switch"]

    assert entities["switch.ok"]["eligible"] is True
    assert entities["switch.ok"]["has_label"] is True

    assert entities["switch.disabled"]["eligible"] is False
    assert entities["switch.disabled"]["exclusion_reason"] == "disabled"

    assert entities["counter.unsupported"]["eligible"] is False
    assert (
        entities["counter.unsupported"]["exclusion_reason"]
        == "domain_not_enabled"
    )

    assert entities["light.no_label"]["eligible"] is True
    assert entities["light.no_label"]["has_label"] is False
