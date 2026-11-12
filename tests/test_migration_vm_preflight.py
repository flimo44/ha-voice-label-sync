"""Test-VM migration preflight never emits private configuration or grants stages.

These tests do NOT run the user's legacy 0.2.0 VM or production clone. They
exercise a synthetic, representative YAML topology and all refusal paths.
"""

from __future__ import annotations

import importlib.util
import json
import shutil
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
MODULE = ROOT / "tools" / "migration_vm_preflight.py"
SPEC = importlib.util.spec_from_file_location("_vm_beta_probe", MODULE)
assert SPEC is not None and SPEC.loader is not None
PROBE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(PROBE)

PRIVATE_PROJECT = "VERY_PRIVATE_PROD_PROJECT_123"
PRIVATE_ALIAS = "Salon secret de production"
PRIVATE_ENTITY = "light.very_private_living_room"


def _representative_config(root: Path) -> None:
    """Synthetic production-like manual GA source with local per-entity fault."""
    root.mkdir(parents=True, exist_ok=True)
    (root / ".HA_VERSION").write_text("2026.11.0", encoding="utf-8")
    (root / ".storage").mkdir()
    (root / ".storage" / "core.config_entries").write_text(
        '{"contains": "PRIVATE_REAL_CONFIG_ENTRY_DO_NOT_REVEAL"}',
        encoding="utf-8",
    )
    (root / "secrets.yaml").write_text(
        "project: REAL_PRIVATE_GOOGLE_TOKEN_NEVER_PRINT",
        encoding="utf-8",
    )
    (root / "configuration.yaml").write_text(
        "homeassistant:\n"
        "  packages: !include_dir_named packages\n"
        "google_assistant:\n"
        "  project_id: !secret project\n"
        f"  service_account: {PRIVATE_PROJECT}\n"
        "  expose_by_default: false\n"
        "  entity_config: !include ga_entities.yaml\n"
        "automation: !include automations.yaml\n"
        "mqtt:\n"
        "  broker: private_infrastructure.example.invalid\n"
        "rest_command:\n"
        "  notify_prod: https://prod-private.example.invalid\n",
        encoding="utf-8",
    )
    (root / "ga_entities.yaml").write_text(
        f"{PRIVATE_ENTITY}:\n"
        f"  name: {PRIVATE_ALIAS}\n"
        "  room: Bureau privé\n"
        "  aliases: [Lumière bureau privé]\n"
        "switch.old_excluded:\n"
        "  expose: false\n"
        "light.invalid_options:\n"
        "  room: [must, be, scalar]\n",
        encoding="utf-8",
    )


def _probe(root: Path, expected: str | None = None):
    return PROBE.inspect_vm_configuration(
        root, expected_source_sha256=expected
    )


def _never_authorized(result):
    assert result["read_only"] is True
    assert result["vm_identity_verified"] is False
    assert result["vm_network_isolation_verified"] is False
    assert result["vm_restore_test_verified"] is False
    assert result["external_integrations_isolated"] is False
    assert result["runtime_storage_integrations_inspected"] is False
    assert result["historical_v020_upgrade_verified"] is False
    assert result["production_runtime_touched"] is False
    assert result["migration_execution_authorized"] is False
    assert result["stage_allowed"] is False
    assert result["apply_allowed"] is False
    assert result["cutover_allowed"] is False
    assert result["google_home_state_verified"] is False
    assert result["external_effects_verified"] is False
    assert result["human_vm_isolation_check_required"] is True
    assert result["human_restore_drill_required"] is True
    assert result["contains_private_configuration_in_output"] is False


def test_prod_like_manual_yaml_preflight_is_local_sanitized_and_nonexecuting(
    tmp_path,
):
    root = tmp_path / "vm"
    _representative_config(root)
    summary = _probe(root)
    _never_authorized(summary)
    assert summary["status"] == "human_isolation_review_required"
    assert summary["ha_version_marker_present"] is True
    assert summary["storage_directory_present"] is True
    assert summary["source"]["mode"] == "assisted_migration"
    assert summary["source"]["status"] == "resolved"
    assert summary["source"]["explicit_entity_count"] == 3
    assert summary["source"]["explicit_exclusion_count"] == 1
    assert summary["source"]["entries_requiring_review_count"] == 2
    assert summary["source"]["source_file_count"] == 2
    assert summary["source"]["global_blockers"] == []
    assert len(summary["source"]["fingerprint_sha256"]) == 64
    assert "google_assistant_cloud_effects" in (
        summary["potential_side_effect_categories"]
    )
    assert "mqtt_external_messages" in (
        summary["potential_side_effect_categories"]
    )
    assert "automations_can_operate_real_equipment" in (
        summary["potential_side_effect_categories"]
    )
    assert "http_external_commands" in (
        summary["potential_side_effect_categories"]
    )
    serialized = json.dumps(summary, ensure_ascii=False)
    for secret in (
        PRIVATE_PROJECT, PRIVATE_ALIAS, PRIVATE_ENTITY,
        "REAL_PRIVATE_GOOGLE_TOKEN_NEVER_PRINT",
        "PRIVATE_REAL_CONFIG_ENTRY_DO_NOT_REVEAL",
        "private_infrastructure.example.invalid",
        str(root), "ga_entities.yaml", "secrets.yaml",
    ):
        assert secret not in serialized


def test_source_fingerprint_stable_across_offline_copies_and_expected_check(
    tmp_path,
):
    original = tmp_path / "one"
    clone = tmp_path / "two"
    _representative_config(original)
    shutil.copytree(original, clone)
    baseline = _probe(original)
    fingerprint = baseline["source"]["fingerprint_sha256"]
    match = _probe(clone, fingerprint)
    _never_authorized(match)
    assert match["status"] == "human_isolation_review_required"
    assert match["source"]["fingerprint_sha256"] == fingerprint
    assert _probe(original, fingerprint)["source"]["fingerprint_sha256"] == (
        fingerprint
    )


def test_change_to_override_invalidates_protected_source_fingerprint(tmp_path):
    root = tmp_path / "vm"
    _representative_config(root)
    expected = _probe(root)["source"]["fingerprint_sha256"]
    entity_file = root / "ga_entities.yaml"
    entity_file.write_text(
        entity_file.read_text(encoding="utf-8")
        + "light.new_private_entity:\n"
        + "  expose: false\n",
        encoding="utf-8",
    )
    result = _probe(root, expected)
    _never_authorized(result)
    assert result["status"] == "manual_yaml_changed_since_reference"
    assert result["source"]["fingerprint_sha256"] != expected
    assert result["source"]["explicit_entity_count"] == 4


def test_unrelated_registry_changes_not_misrepresented_as_yaml_changes(
    tmp_path,
):
    root = tmp_path / "vm"
    _representative_config(root)
    original = _probe(root)
    (root / ".storage" / "core.config_entries").write_text(
        '{"changed": "OTHER_PRIVATE_CREDENTIAL"}', encoding="utf-8",
    )
    result = _probe(root, original["source"]["fingerprint_sha256"])
    assert result["status"] == "human_isolation_review_required"
    assert result["runtime_storage_integrations_inspected"] is False
    assert result["vm_network_isolation_verified"] is False
    assert result["source"]["fingerprint_sha256"] == (
        original["source"]["fingerprint_sha256"]
    )


@pytest.mark.parametrize("defect", [
    "missing_include", "duplicate_mapping_key", "malformed_yaml",
])
def test_ambiguous_sources_block_preflight_but_do_not_print_contents(
    tmp_path, defect,
):
    root = tmp_path / "vm"
    _representative_config(root)
    config = root / "configuration.yaml"
    if defect == "missing_include":
        (root / "ga_entities.yaml").unlink()
    elif defect == "duplicate_mapping_key":
        config.write_text(
            config.read_text(encoding="utf-8")
            + "google_assistant:\n  expose_by_default: false\n",
            encoding="utf-8",
        )
    else:
        config.write_text(
            "google_assistant: [not a mapping\n"
            + PRIVATE_PROJECT,
            encoding="utf-8",
        )
    result = _probe(root)
    _never_authorized(result)
    assert result["status"] == "manual_yaml_discovery_blocked"
    assert result["source"]["global_blockers"]
    assert PRIVATE_PROJECT not in json.dumps(result)


def test_implicit_default_exposure_is_flagged_as_risk_not_readiness(tmp_path):
    root = tmp_path / "vm"
    root.mkdir()
    (root / "configuration.yaml").write_text(
        "google_assistant:\n  project_id: !secret id\n"
        "  entity_config:\n    light.unknown:\n"
        "      name: Private Name\n",
        encoding="utf-8",
    )
    result = _probe(root)
    _never_authorized(result)
    assert result["status"] == "human_isolation_review_required"
    assert result["source"]["implicitly_exposed_entities_possible"] is True
    assert "implicit_exposure_enabled" in result["source"]["warning_codes"]


def test_plain_new_installation_is_distinguished_from_assisted_migration(
    tmp_path,
):
    root = tmp_path / "empty"
    root.mkdir()
    (root / "configuration.yaml").write_text(
        "homeassistant:\n  name: Private HA test\n", encoding="utf-8"
    )
    result = _probe(root)
    _never_authorized(result)
    assert result["source"]["mode"] == "new_configuration"
    assert result["source"]["explicit_entity_count"] == 0
    assert result["status"] == "human_isolation_review_required"


def test_invalid_root_link_and_fingerprint_refuse_without_disclosing_path(
    tmp_path,
):
    root = tmp_path / "vm"
    _representative_config(root)
    alias = tmp_path / "symlink_to_live_vm"
    alias.symlink_to(root, target_is_directory=True)
    for bad in (
        _probe(alias),
        _probe(tmp_path / "does_not_exist"),
        _probe(root, "not_hex"),
    ):
        _never_authorized(bad)
        assert bad["status"] != "human_isolation_review_required"
        assert str(root) not in json.dumps(bad)
    config_path = root / "configuration.yaml"
    config_path.unlink()
    config_path.symlink_to(root / "secrets.yaml")
    linked = _probe(root)
    assert linked["status"] == "configuration_yaml_linked"
    _never_authorized(linked)


def test_probe_never_reads_secrets_or_storage_config_entry_contents(
    tmp_path, monkeypatch,
):
    root = tmp_path / "vm"
    _representative_config(root)
    read = Path.read_bytes

    def forbid_sensitive_read(path):
        if path.name in ("secrets.yaml", "core.config_entries"):
            raise AssertionError("private non-Google file was read")
        return read(path)

    monkeypatch.setattr(Path, "read_bytes", forbid_sensitive_read)
    result = _probe(root)
    assert result["status"] == "human_isolation_review_required"


def test_source_probe_does_not_mutate_vm_root(tmp_path, monkeypatch):
    root = tmp_path / "vm"
    _representative_config(root)
    def forbid_write(*_args, **_kwargs):
        raise AssertionError("VM preflight attempted disk mutation")

    for name in (
        "write_bytes", "write_text", "mkdir", "unlink", "rmdir", "rename",
        "replace", "touch", "chmod",
    ):
        monkeypatch.setattr(Path, name, forbid_write)
    result = _probe(root)
    _never_authorized(result)
    assert result["status"] == "human_isolation_review_required"


def test_cli_emits_only_sanitized_json_and_exit_codes(tmp_path, capsys):
    root = tmp_path / "vm"
    _representative_config(root)
    assert PROBE.main(["--config-dir", str(root)]) == 0
    output = capsys.readouterr().out
    parsed = json.loads(output)
    _never_authorized(parsed)
    assert str(root) not in output
    assert PRIVATE_PROJECT not in output
    assert PRIVATE_ALIAS not in output
    assert PROBE.main([
        "--config-dir", str(root),
        "--expected-source-sha256", "e" * 64,
    ]) == 2
    changed = json.loads(capsys.readouterr().out)
    assert changed["status"] == "manual_yaml_changed_since_reference"


def test_probe_has_no_network_or_ha_mutation_calls():
    source = MODULE.read_text(encoding="utf-8")
    for forbidden in (
        "requests.", "httpx.", "urllib.request.", "socket.socket(",
        "async_update_entity(", "record_label_intent(",
        "mark_label_applied(", "stage_one_approved_label(",
        "subprocess.run(", "os.system(",
    ):
        assert forbidden not in source
