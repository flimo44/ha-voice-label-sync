"""Conservative migration scan of indirect HVLS label side effects."""

from __future__ import annotations

import importlib.util
import json
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
MODULE = (
    ROOT / "custom_components" / "ha_voice_label_sync"
    / "migration_consumer_audit.py"
)


@pytest.fixture
def audit():
    spec = importlib.util.spec_from_file_location(
        "_test_hvls_indirect_consumers", MODULE
    )
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def _check(audit, tmp_path, sources=None, output="ga_generated.yaml",
           service=True):
    return audit.audit_indirect_label_consumers(
        tmp_path,
        original_sources=(
            sources if sources is not None
            else [{"path": "google_entities.yaml", "digest_sha256": "a" * 64}]
        ),
        configured_output=output,
        generate_service_registered=service,
    )


def test_no_reference_never_proves_external_consumers_safe(
    audit, tmp_path
):
    (tmp_path / "configuration.yaml").write_text(
        "homeassistant:\n  name: Test\n"
    )
    report = _check(audit, tmp_path, service=False)
    assert report["status"] == "indirect_effects_unverified"
    assert report["reference_counts"]["explicit_hvls_generate_references"] == 0
    assert report["observed_standard_yaml_files"] == 1
    assert "external_automation_and_registry_listeners_unverified" in (
        report["reason_codes"]
    )
    assert report["stage_allowed"] is False
    assert report["apply_allowed"] is False
    assert report["cutover_allowed"] is False
    assert report["all_live_listeners_inspected"] is False


def test_legacy_writer_reference_and_label_trigger_are_reported(
    audit, tmp_path
):
    (tmp_path / "configuration.yaml").write_text("homeassistant: {}\n")
    (tmp_path / "automations.yaml").write_text(
        "- alias: Call HVLS when registry changes\n"
        "  trigger:\n"
        "    - platform: event\n"
        "      event_type: entity_registry_updated\n"
        "  condition:\n"
        "    - condition: template\n"
        "      value_template: '{{ label_entities(\"google_assistant\") }}'\n"
        "  action:\n"
        "    - service: ha_voice_label_sync.generate\n"
    )
    report = _check(audit, tmp_path)
    counts = report["reference_counts"]
    assert counts["explicit_hvls_generate_references"] == 1
    assert counts["registry_event_references"] == 1
    assert counts["label_template_references"] == 1
    assert "hvls_generate_referenced_in_standard_yaml" in report["reason_codes"]
    assert "registry_or_label_dependent_yaml_found" in report["reason_codes"]
    assert report["stage_allowed"] is False


def test_comments_are_not_considered_executing_automations(
    audit, tmp_path
):
    (tmp_path / "configuration.yaml").write_text(
        "homeassistant: {}\n"
        "# ha_voice_label_sync.generate\n"
        "# entity_registry_updated\n"
        "# {{ label_entities('google_assistant') }}\n"
    )
    report = _check(audit, tmp_path, service=False)
    assert all(value == 0 for value in report["reference_counts"].values())


def test_unresolved_includes_are_explicitly_uncertain(audit, tmp_path):
    (tmp_path / "configuration.yaml").write_text(
        "automation: !include hidden_automations.yaml\n"
    )
    (tmp_path / "hidden_automations.yaml").write_text(
        "- action: ha_voice_label_sync.generate\n"
    )
    report = _check(audit, tmp_path)
    assert report["reference_counts"]["explicit_hvls_generate_references"] == 0
    assert "unresolved_yaml_include_targets" in report["reason_codes"]
    assert report["stage_allowed"] is False


def test_packages_are_scanned_without_returning_paths_or_aliases(
    audit, tmp_path
):
    (tmp_path / "configuration.yaml").write_text("homeassistant: {}\n")
    path = tmp_path / "packages" / "example"
    path.mkdir(parents=True)
    (path / "script.yaml").write_text(
        "unrelated:\n"
        "  alias: 'PRIVATE PERSON ADDRESS SECRET'\n"
        "  sequence:\n"
        "    - action: button.press\n"
        "      target:\n"
        "        entity_id: button.hvls_generate\n"
    )
    result = _check(audit, tmp_path)
    assert result["reference_counts"]["button_press_references"] == 1
    assert "button_press_target_not_resolved" in result["reason_codes"]
    raw = json.dumps(result)
    for private in (
        "PRIVATE PERSON ADDRESS SECRET", "script.yaml",
        "example", "button.hvls_generate",
    ):
        assert private not in raw


def test_jinja_dynamic_service_is_reported_as_unknown(audit, tmp_path):
    (tmp_path / "configuration.yaml").write_text(
        "script:\n  test:\n"
        "    sequence:\n"
        "      - service_template: \"{{ states('input_text.action') }}\"\n"
    )
    result = _check(audit, tmp_path)
    assert result["reference_counts"]["dynamic_service_templates"] == 1
    assert "dynamic_service_target_not_resolved" in result["reason_codes"]


def test_original_yaml_overlap_identified_without_touching_it(
    audit, tmp_path
):
    original = b"# protected original\nmanual: true\n"
    (tmp_path / "configuration.yaml").write_text("homeassistant: {}\n")
    (tmp_path / "google_entities.yaml").write_bytes(original)
    report = _check(audit, tmp_path, output="google_entities.yaml")
    assert report["original_google_source_overlap"] is True
    assert "hvls_output_overlaps_manual_google_source" in report["reason_codes"]
    assert (tmp_path / "google_entities.yaml").read_bytes() == original
    assert report["cutover_allowed"] is False


def test_no_overlap_is_not_proof_of_no_side_effects(audit, tmp_path):
    (tmp_path / "configuration.yaml").write_text("homeassistant: {}\n")
    result = _check(audit, tmp_path, output="other.yaml", service=False)
    assert result["original_google_source_overlap"] is False
    assert result["status"] == "indirect_effects_unverified"
    assert result["external_consumers_verified"] is False


def test_output_outside_ha_root_fails_closed(audit, tmp_path):
    (tmp_path / "configuration.yaml").write_text("homeassistant: {}\n")
    result = _check(audit, tmp_path, output="../somewhere/secret.yaml")
    assert "hvls_output_outside_config_directory" in result["reason_codes"]
    assert result["stage_allowed"] is False
    assert "../somewhere" not in json.dumps(result)


def test_secrets_file_not_read_and_not_reported(
    audit, tmp_path
):
    (tmp_path / "configuration.yaml").write_text(
        "token: !secret sensitive_password\n"
    )
    (tmp_path / "secrets.yaml").write_text(
        "sensitive_password: PRIVATE_VALUE\n"
        "test: ha_voice_label_sync.generate\n"
    )
    result = _check(audit, tmp_path)
    assert result["observed_standard_yaml_files"] == 1
    assert result["reference_counts"]["explicit_hvls_generate_references"] == 0
    assert "PRIVATE_VALUE" not in json.dumps(result)


def test_malformed_yaml_is_warned_but_not_block_entire_report(
    audit, tmp_path
):
    (tmp_path / "configuration.yaml").write_text(
        "broken: [ invalid\n"
    )
    (tmp_path / "scripts.yaml").write_text(
        "generate:\n  sequence:\n    - action: ha_voice_label_sync.generate\n"
    )
    result = _check(audit, tmp_path)
    assert "yaml_not_parsed" in result["reason_codes"]
    assert result["reference_counts"]["explicit_hvls_generate_references"] == 1
    assert result["stage_allowed"] is False


def test_oversized_yaml_file_cannot_hide_unverified_coverage(
    audit, tmp_path
):
    (tmp_path / "configuration.yaml").write_bytes(
        b"a: " + b"X" * (1024 * 1024 + 10)
    )
    result = _check(audit, tmp_path)
    assert "yaml_file_size_limit" in result["reason_codes"]
    assert result["stage_allowed"] is False


def test_symlink_standard_automation_not_followed(audit, tmp_path):
    (tmp_path / "configuration.yaml").write_text("homeassistant: {}\n")
    outside = tmp_path.parent / "outside_auto.yaml"
    outside.write_text("service: ha_voice_label_sync.generate\n")
    (tmp_path / "automations.yaml").symlink_to(outside)
    result = _check(audit, tmp_path)
    assert "symlink_standard_yaml_unscanned" in result["reason_codes"]
    assert result["reference_counts"]["explicit_hvls_generate_references"] == 0


def test_no_services_runtime_available_is_unverified(audit, tmp_path):
    (tmp_path / "configuration.yaml").write_text("homeassistant: {}\n")
    result = _check(audit, tmp_path, service=None)
    assert "legacy_generate_service_may_be_invoked" in result["reason_codes"]
    assert result["legacy_generate_service_registered"] is None
    assert result["read_only"] is True


def test_normal_readonly_audit_never_creates_files(audit, tmp_path):
    (tmp_path / "configuration.yaml").write_text("homeassistant: {}\n")
    before = {
        item.name: item.read_bytes()
        for item in tmp_path.iterdir() if item.is_file()
    }
    _check(audit, tmp_path)
    after = {
        item.name: item.read_bytes()
        for item in tmp_path.iterdir() if item.is_file()
    }
    assert before == after
    assert not (tmp_path / ".storage").exists()


def test_event_listener_simulation_demonstrates_unbounded_risk(
    audit, tmp_path
):
    # This is an OFFLINE threat-model rehearsal, not a mutation on HA.
    # A registry event triggers an arbitrary user callback to regenerate
    # the output. The audit must flag that such callbacks are possible.
    (tmp_path / "configuration.yaml").write_text("homeassistant: {}\n")
    (tmp_path / "automations.yaml").write_text(
        "- trigger:\n"
        "    - platform: event\n"
        "      event_type: entity_registry_updated\n"
        "  action:\n"
        "    - service: ha_voice_label_sync.generate\n"
    )
    original_labels = {"owner"}
    callbacks = []

    def user_callback_on_registry_event(event):
        if event == "entity_registry_updated":
            callbacks.append("possible_legacy_generator")

    after = original_labels | {"google_assistant"}
    user_callback_on_registry_event("entity_registry_updated")
    assert after == {"owner", "google_assistant"}
    assert callbacks == ["possible_legacy_generator"]
    observed = _check(audit, tmp_path)
    assert observed["reference_counts"]["registry_event_references"] == 1
    assert observed["reference_counts"]["explicit_hvls_generate_references"] == 1
    assert observed["stage_allowed"] is False


def test_v1_code_has_no_automatic_label_event_to_generate_wiring():
    # Regression contract on the precise V1 integration wiring inspected
    # during #121. This is code evidence, not an assertion about plugins.
    setup = (
        ROOT / "custom_components" / "ha_voice_label_sync" / "__init__.py"
    ).read_text(encoding="utf-8")
    assert "EVENT_ENTITY_REGISTRY_UPDATED" not in setup
    assert "async_listen" not in setup
    assert "async_track" not in setup
    assert "async_run_workflow" not in setup
    services = (
        ROOT / "custom_components" / "ha_voice_label_sync" / "services.py"
    ).read_text(encoding="utf-8")
    buttons = (
        ROOT / "custom_components" / "ha_voice_label_sync" / "button.py"
    ).read_text(encoding="utf-8")
    assert "SERVICE_GENERATE" in services
    assert "dry_run=False" in services
    assert "dry_run=False" in buttons
    assert "async_update_entity" not in setup
