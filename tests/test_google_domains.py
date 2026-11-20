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


def test_restore_plan_handles_new_domains_and_doorbell_rule(tmp_path):
    """A backup with new-domain entities restores like any other domain."""
    import pytest as _pytest
    from test_backup_restore import backup_module as fixture

    monkeypatch = _pytest.MonkeyPatch()
    try:
        restore = fixture.__wrapped__(monkeypatch)
        output = tmp_path / "google_entities.yaml"
        output.write_text(
            "switch.a:\n  expose: true\n  name: A\n"
            "button.restart:\n  expose: true\n  name: Restart\n",
            encoding="utf-8",
        )
        (tmp_path / ".hvls_backups").mkdir()
        backup_id = "google_entities.yaml.20261120-100000.bak"
        (tmp_path / ".hvls_backups" / backup_id).write_text(
            "switch.a:\n  expose: true\n  name: A\n"
            "button.ring:\n  expose: true\n  name: Ring\n"
            "event.sonnette:\n  expose: true\n  name: Sonnette\n"
            "event.bouton:\n  expose: true\n  name: Bouton\n",
            encoding="utf-8",
        )

        def entity(entity_id, name, labels, device_class=None):
            return {
                "entity_id": entity_id, "name": name, "labels": labels,
                "area_id": None, "device_id": None, "disabled_by": None,
                "hidden_by": None, "entity_category": None,
                "device_class": device_class,
            }

        registries = {
            "entity_registry": {"data": {"entities": [
                entity("switch.a", "A", ["hvls"]),
                entity("button.restart", "Restart", ["hvls"]),
                entity("button.ring", "Ring", []),
                entity("event.sonnette", "Sonnette", [], "doorbell"),
                entity("event.bouton", "Bouton", [], "button"),
            ]}},
            "device_registry": {"data": {"devices": []}},
            "area_registry": {"data": {"areas": []}},
            "label_registry": {"data": {"labels": [
                {"label_id": "hvls", "name": "HVLS"}]}},
        }
        catalog = restore.build_entity_catalog(
            registries, "HVLS", GOOGLE_DOMAINS
        )
        review = restore.review_backup(output, backup_id)
        result = restore.prepare_backup_preview(
            output, backup_id, review["backup_sha256"],
            review["production_sha256"], catalog,
            registries=registries, label="HVLS", domains=GOOGLE_DOMAINS,
        )
        cases = {row["entity_id"]: row["case"] for row in result["restore_rows"]}
        assert cases == {
            "switch.a": "unchanged",
            "button.ring": "added",
            "event.sonnette": "added",
            "event.bouton": "impossible",
            "button.restart": "removed",
        }
        assert result["label_plan"]["add"] == ["button.ring", "event.sonnette"]
        assert result["label_plan"]["remove"] == ["button.restart"]
        assert result["label_plan"]["review"] == [
            {"entity_id": "event.bouton", "reason": "unsupported_device_class"}
        ]
        # Not restoring the non-doorbell event makes the projection exact.
        ignored = restore.prepare_backup_preview(
            output, backup_id, review["backup_sha256"],
            review["production_sha256"], catalog,
            registries=registries, label="HVLS", domains=GOOGLE_DOMAINS,
            ignored_entities=["event.bouton"],
        )
        assert ignored["projection"]["ready"] is True
        # What HA labels would generate matches the restored YAML exactly,
        # doorbell event included.
        assert ignored["projection"]["comparison"]["identical_entities"] is True
        assert "event.sonnette" in ignored["label_plan"]["add"]
    finally:
        monkeypatch.undo()
