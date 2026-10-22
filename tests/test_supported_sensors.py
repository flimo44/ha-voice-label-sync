"""Google Assistant supported sensor selection."""

from pathlib import Path

from hvls.engine import select_entities, supported_sensor_class
from hvls.models import GenerationRequest


def test_sensor_class_allowlist():
    assert supported_sensor_class({"device_class": "temperature"})
    assert supported_sensor_class({"device_class": "humidity"})
    assert not supported_sensor_class({"device_class": "power"})
    assert not supported_sensor_class({"device_class": None})


def test_select_labeled_temperature_sensor():
    request = GenerationRequest(
        label="google_assistant",
        domains=frozenset({"sensor"}),
        output_path=Path("/tmp/hvls-test.yaml"),
        dry_run=True,
    )

    entities = {
        "data": {
            "entities": [
                {
                    "entity_id": "sensor.piscine_temperature",
                    "device_class": "temperature",
                    "labels": ["google_assistant"],
                },
                {
                    "entity_id": "sensor.piscine_power",
                    "device_class": "power",
                    "labels": ["google_assistant"],
                },
            ]
        }
    }

    result = select_entities(
        request,
        entities,
        {"data": {"devices": []}},
        {"data": {"areas": []}},
        {
            "data": {
                "labels": [
                    {
                        "label_id": "google_assistant",
                        "name": "google_assistant",
                    }
                ]
            }
        },
    )

    assert [item.entity_id for item in result.entities] == [
        "sensor.piscine_temperature"
    ]
