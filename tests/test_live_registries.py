"""Regression tests for disk and live registry workflows."""

import json

import pytest

from hvls import GenerationRequest, WorkflowError, run_google_assistant_workflow


def make_registries():
    return {
        "entity_registry": {
            "data": {
                "entities": [
                    {
                        "entity_id": "switch.test_lamp",
                        "name": "Test Lamp",
                        "labels": ["google_assistant"],
                        "area_id": "salon",
                        "device_id": None,
                        "disabled_by": None,
                        "hidden_by": None,
                        "entity_category": None,
                    }
                ]
            }
        },
        "device_registry": {"data": {"devices": []}},
        "area_registry": {
            "data": {"areas": [{"area_id": "salon", "name": "Salon"}]}
        },
        "label_registry": {
            "data": {
                "labels": [
                    {"label_id": "google_assistant", "name": "Google Assistant"}
                ]
            }
        },
    }


def make_request(tmp_path):
    return GenerationRequest(
        label="google_assistant",
        domains=frozenset({"switch"}),
        output_path=tmp_path / "google_assistant_entities.yaml",
        dry_run=True,
    )


def test_live_and_storage_produce_same_output(tmp_path):
    registries = make_registries()
    request = make_request(tmp_path)

    storage_path = tmp_path / ".storage"
    storage_path.mkdir()

    filenames = {
        "entity_registry": "core.entity_registry",
        "device_registry": "core.device_registry",
        "area_registry": "core.area_registry",
        "label_registry": "core.label_registry",
    }

    for key, filename in filenames.items():
        (storage_path / filename).write_text(
            json.dumps(registries[key]),
            encoding="utf-8",
        )

    live_result = run_google_assistant_workflow(
        request=request,
        registries=registries,
    )

    disk_result = run_google_assistant_workflow(
        request=request,
        storage_path=storage_path,
    )

    assert live_result.generation.content == disk_result.generation.content
    assert live_result.entity_count == 1
    assert live_result.dry_run
    assert live_result.write_result is None
    assert not request.output_path.exists()


def test_workflow_requires_registry_source(tmp_path):
    with pytest.raises(WorkflowError, match="Either storage_path or registries"):
        run_google_assistant_workflow(request=make_request(tmp_path))
