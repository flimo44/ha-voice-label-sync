"""Tests for the HVLS exclusion diagnostics."""

import importlib.util
from pathlib import Path


def load_module():
    path = (
        Path(__file__).resolve().parents[1]
        / "custom_components/ha_voice_label_sync/preview_exclusions.py"
    )
    spec = importlib.util.spec_from_file_location("_test_preview_exclusions", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def make_registries():
    return {
        "entity_registry": {
            "data": {
                "entities": [
                    {
                        "entity_id": "switch.pompe",
                        "name": "Pompe",
                        "labels": ["google_assistant"],
                    },
                    {
                        "entity_id": "binary_sensor.fenetre",
                        "name": "Fenêtre séjour",
                        "labels": ["google_assistant"],
                    },
                    {
                        "entity_id": "switch.desactive",
                        "labels": ["google_assistant"],
                        "disabled_by": "user",
                    },
                    {
                        "entity_id": "switch.sans_label",
                        "labels": [],
                    },
                ]
            }
        },
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
    }


def test_reports_unsupported_domain():
    result = load_module().analyze_exclusions(
        make_registries(),
        "google_assistant",
        frozenset({"switch"}),
    )

    assert result[0]["entity_id"] == "binary_sensor.fenetre"
    assert result[0]["reason"] == "domain_not_enabled"
    assert result[0]["name"] == "Fenêtre séjour"


def test_reports_disabled_entity():
    result = load_module().analyze_exclusions(
        make_registries(),
        "google_assistant",
        frozenset({"switch"}),
    )

    disabled = next(item for item in result if item["entity_id"] == "switch.desactive")
    assert disabled["reason"] == "disabled"


def test_ignores_unlabeled_and_selected_entities():
    result = load_module().analyze_exclusions(
        make_registries(),
        "google_assistant",
        frozenset({"switch"}),
    )

    identifiers = {item["entity_id"] for item in result}

    assert identifiers == {
        "binary_sensor.fenetre",
        "switch.desactive",
    }


def test_unsupported_binary_sensor_class():
    registries = make_registries()
    registries["entity_registry"]["data"]["entities"].append(
        {
            "entity_id": "binary_sensor.mouvement",
            "labels": ["google_assistant"],
            "device_class": "motion",
        }
    )

    result = load_module().analyze_exclusions(
        registries,
        "google_assistant",
        frozenset({"switch", "binary_sensor"}),
    )

    excluded = {item["entity_id"]: item for item in result}

    assert excluded["binary_sensor.mouvement"]["reason"] == ("unsupported_device_class")
    assert excluded["binary_sensor.fenetre"]["reason"] == ("unsupported_device_class")


def test_compatible_binary_sensor_not_excluded():
    registries = make_registries()

    for entity in registries["entity_registry"]["data"]["entities"]:
        if entity["entity_id"] == "binary_sensor.fenetre":
            entity["device_class"] = "opening"

    result = load_module().analyze_exclusions(
        registries,
        "google_assistant",
        frozenset({"switch", "binary_sensor"}),
    )

    excluded_ids = {item["entity_id"] for item in result}

    assert "binary_sensor.fenetre" not in excluded_ids
    assert "switch.desactive" in excluded_ids


def test_disabled_compatible_binary_sensor():
    registries = make_registries()
    registries["entity_registry"]["data"]["entities"].append(
        {
            "entity_id": "binary_sensor.fenetre_desactivee",
            "labels": ["google_assistant"],
            "device_class": "opening",
            "disabled_by": "user",
        }
    )

    result = load_module().analyze_exclusions(
        registries,
        "google_assistant",
        frozenset({"switch", "binary_sensor"}),
    )

    excluded = {item["entity_id"]: item for item in result}

    assert excluded["binary_sensor.fenetre_desactivee"]["reason"] == "disabled"
