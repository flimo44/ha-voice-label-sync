"""Selection and YAML generation tests for binary sensors."""

import pytest
from test_live_registries import make_registries

from hvls import GenerationRequest, select_entities
from hvls.backends.google import render_google_assistant


@pytest.mark.parametrize(
    "device_class,expected",
    [
        ("opening", True),
        ("window", True),
        ("door", True),
        ("garage_door", True),
        ("lock", True),
        ("moisture", True),
        ("smoke", True),
        ("carbon_monoxide", True),
        ("motion", False),
        ("occupancy", False),
        (None, False),
    ],
)
def test_binary_sensor_selection(tmp_path, device_class, expected):
    registries = make_registries()
    registries["entity_registry"]["data"]["entities"].append(
        {
            "entity_id": "binary_sensor.fenetre",
            "name": "Fenêtre séjour",
            "labels": ["google_assistant"],
            "area_id": "salon",
            "device_class": device_class,
        }
    )

    request = GenerationRequest(
        label="google_assistant",
        domains=frozenset({"switch", "binary_sensor"}),
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
    assert ("binary_sensor.fenetre" in identifiers) is expected

    generated = render_google_assistant(result)
    assert ("binary_sensor.fenetre:" in generated.content) is expected
    assert "switch.test_lamp:" in generated.content
