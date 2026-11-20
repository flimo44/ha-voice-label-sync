"""Google Assistant domains enabled by HVLS and the doorbell event rule."""

import importlib.util
from pathlib import Path

import pytest
from test_live_registries import make_registries

from hvls import GenerationRequest, select_entities
from hvls.backends.google import render_google_assistant
from hvls.cli import DEFAULT_DOMAINS as CLI_DOMAINS

ROOT = Path(__file__).resolve().parents[1] / "custom_components/ha_voice_label_sync"

# Domains documented by the Home Assistant Google Assistant integration.
GOOGLE_DOMAINS = frozenset({
    "alarm_control_panel", "binary_sensor", "button", "camera", "climate",
    "cover", "event", "fan", "group", "humidifier", "input_boolean",
    "input_button", "input_select", "lawn_mower", "light", "lock",
    "media_player", "scene", "script", "select", "sensor", "switch",
    "vacuum", "valve", "water_heater",
})


def _services_domains():
    source = (ROOT / "services.py").read_text(encoding="utf-8")
    start = source.index("DEFAULT_DOMAINS = frozenset(")
    block = source[start:source.index("\n)\n", start)]
    return frozenset(
        part.split('"')[1] for part in block.splitlines() if '"' in part
    )


def test_integration_enables_every_google_assistant_domain():
    assert _services_domains() == GOOGLE_DOMAINS


def test_cli_enables_the_same_domains_except_sensors():
    assert set(CLI_DOMAINS) == GOOGLE_DOMAINS - {"sensor", "binary_sensor"}


@pytest.mark.parametrize(
    "device_class,expected",
    [("doorbell", True), ("button", False), ("motion", False), (None, False)],
)
def test_only_doorbell_events_are_selected(tmp_path, device_class, expected):
    registries = make_registries()
    registries["entity_registry"]["data"]["entities"].append({
        "entity_id": "event.porte",
        "name": "Sonnette",
        "labels": ["google_assistant"],
        "device_class": device_class,
    })
    request = GenerationRequest(
        label="google_assistant",
        domains=frozenset({"switch", "event"}),
        output_path=tmp_path / "output.yaml",
        dry_run=True,
    )
    result = select_entities(
        request,
        registries["entity_registry"],
        registries["device_registry"],
        registries["area_registry"],
        registries["label_registry"],
    )
    identifiers = {entity.entity_id for entity in result.entities}
    assert ("event.porte" in identifiers) is expected
    generated = render_google_assistant(result)
    assert ("event.porte:" in generated.content) is expected


def _load(name):
    spec = importlib.util.spec_from_file_location(
        f"hvls_{name}_domains_test", ROOT / f"{name}.py"
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_catalog_and_exclusions_explain_non_doorbell_events():
    registries = {
        "label_registry": {"data": {"labels": [
            {"label_id": "hvls", "name": "HVLS"}]}},
        "area_registry": {"data": {"areas": []}},
        "device_registry": {"data": {"devices": []}},
        "entity_registry": {"data": {"entities": [
            {"entity_id": "event.sonnette", "labels": ["hvls"],
             "device_class": "doorbell"},
            {"entity_id": "event.bouton", "labels": ["hvls"],
             "device_class": "button"},
            {"entity_id": "button.redemarrer", "labels": ["hvls"]},
        ]}},
    }
    catalog = _load("entity_catalog").build_entity_catalog(
        registries, "HVLS", GOOGLE_DOMAINS
    )
    entities = {item["entity_id"]: item for item in catalog["entities"]}
    assert entities["event.sonnette"]["eligible"] is True
    assert entities["event.bouton"]["exclusion_reason"] == (
        "unsupported_device_class"
    )
    assert entities["event.bouton"]["device_class"] == "button"
    assert entities["button.redemarrer"]["eligible"] is True


def test_preview_exclusions_explain_non_doorbell_events():
    registries = {
        "label_registry": {"data": {"labels": [
            {"label_id": "hvls", "name": "HVLS"}]}},
        "entity_registry": {"data": {"entities": [
            {"entity_id": "event.sonnette", "labels": ["hvls"],
             "device_class": "doorbell"},
            {"entity_id": "event.bouton", "labels": ["hvls"],
             "device_class": "button"},
        ]}},
    }
    excluded = _load("preview_exclusions").analyze_exclusions(
        registries, "HVLS", GOOGLE_DOMAINS
    )
    assert [(item["entity_id"], item["reason"]) for item in excluded] == [
        ("event.bouton", "unsupported_device_class"),
    ]
    assert excluded[0]["detail"] == "Unsupported event class: button"
