"""Behavioral tests for read-only Google Assistant migration discovery.

These tests exercise the real analyzer. They intentionally do not certify
Home Assistant runtime exposure semantics or any migration Apply behavior.
"""

from __future__ import annotations

import importlib.util
import json
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
MODULE = (
    ROOT / "custom_components" / "ha_voice_label_sync" / "migration_discovery.py"
)
spec = importlib.util.spec_from_file_location("hvls_migration_discovery", MODULE)
assert spec is not None and spec.loader is not None
discovery = importlib.util.module_from_spec(spec)
spec.loader.exec_module(discovery)

FIXTURES = json.loads(
    (ROOT / "tests/fixtures/migration/contract_cases.json").read_text(
        encoding="utf-8"
    )
)
CASES = {case["id"]: case for case in FIXTURES["cases"]}


def prepare_case(tmp_path: Path, case_id: str) -> Path:
    for name, content in CASES[case_id]["files"].items():
        destination = tmp_path / name
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(content, encoding="utf-8")
    return tmp_path


@pytest.mark.parametrize(
    ("case_id", "rule", "count"),
    [
        ("S02", "explicit_only", 2),
        ("S03", "explicit_only", 1),
        ("S04", "default_all_supported", 1),
        ("S05", "domain_limited", 1),
        ("S06", "explicit_only", 2),
        ("S09", "explicit_only", 1),
        ("S13", "explicit_only", 2),
        ("S14", "explicit_only", 1),
        ("S15", "domain_limited", 0),
        ("S16", "explicit_only", 1),
        ("S19", "domain_limited", 1),
        ("S20", "explicit_only", 0),
    ],
)
def test_supported_discovery_fixture(
    tmp_path: Path, case_id: str, rule: str, count: int
) -> None:
    prepare_case(tmp_path, case_id)
    result = discovery.discover_google_assistant(tmp_path)
    assert result["mode"] == "assisted_migration"
    assert result["source"]["status"] == "resolved"
    assert result["global_blockers"] == []
    assert result["cutover_status"] == "pending_review"
    assert result["rules"]["rule_type"] == rule
    assert result["counts"]["explicit_entries"] == count
    # Never assert actual Google exposure without a Home Assistant oracle.
    assert result["counts"]["currently_exposed_known"] == 0
    assert all(
        row["before"]["exposure"] == "unknown" for row in result["entities"]
    )


def test_new_installation_without_manual_ga(tmp_path: Path) -> None:
    prepare_case(tmp_path, "S01")
    result = discovery.discover_google_assistant(tmp_path)
    assert result["mode"] == "new_configuration"
    assert result["cutover_status"] == "not_applicable"
    assert result["entities"] == []


def test_include_provenance_and_explicit_exclusion(tmp_path: Path) -> None:
    prepare_case(tmp_path, "S02")
    result = discovery.discover_google_assistant(tmp_path)
    assert [src["path"] for src in result["source"]["locations"]] == [
        "configuration.yaml",
        "ga_entities.yaml",
    ]
    assert all(len(src["digest_sha256"]) == 64 for src in result["source"]["locations"])
    excluded = next(x for x in result["entities"] if x["entity_id"] == "switch.ancien")
    assert excluded["category"] == "explicitly_excluded"
    assert excluded["yaml_exposure_intent"] == "exclude"
    assert excluded["source_path"] == "ga_entities.yaml"


def test_inline_custom_overrides_are_visible_without_guessing(tmp_path: Path) -> None:
    prepare_case(tmp_path, "S03")
    result = discovery.discover_google_assistant(tmp_path)
    entry = result["entities"][0]
    assert entry["before"]["name"] == "Bureau pro"
    assert entry["before"]["room"] == "Bureau"
    assert entry["before"]["aliases"] == ["Éclairage travail"]
    assert "inline_entity_config" in result["source"]["warnings"]
    assert entry["source_line"] > 1


def test_implicit_exposure_default_is_true_when_setting_missing(
    tmp_path: Path,
) -> None:
    prepare_case(tmp_path, "S04")
    result = discovery.discover_google_assistant(tmp_path)
    assert result["rules"]["expose_by_default"] == "true"
    assert result["rules"]["implicit_exposure_may_change_with_new_entities"]
    assert "implicit_exposure_enabled" in result["source"]["warnings"]


def test_exposed_domains_inactive_under_default_deny(tmp_path: Path) -> None:
    prepare_case(tmp_path, "S06")
    result = discovery.discover_google_assistant(tmp_path)
    assert result["rules"]["expose_by_default"] == "false"
    assert not result["rules"]["implicit_exposure_may_change_with_new_entities"]
    assert "exposed_domains_inactive" in result["source"]["warnings"]


@pytest.mark.parametrize(
    ("case_id", "expected_blocker"),
    [
        ("S07", "yaml_syntax_error"),
        ("S08", "duplicate_mapping_key"),
        ("S11", "include_missing"),
        ("S12", "include_outside_config"),
        ("S17", "duplicate_mapping_key"),
        ("S18", "cloud_not_manual_ga"),
    ],
)
def test_unsafe_fixture_fails_closed(
    tmp_path: Path, case_id: str, expected_blocker: str
) -> None:
    prepare_case(tmp_path, case_id)
    result = discovery.discover_google_assistant(tmp_path)
    assert expected_blocker in result["global_blockers"]
    assert result["cutover_status"] == "blocked"


def test_package_configuration_is_detected_but_not_resolved(
    tmp_path: Path,
) -> None:
    prepare_case(tmp_path, "S10")
    result = discovery.discover_google_assistant(tmp_path)
    assert "packages_not_yet_supported" in result["global_blockers"]
    assert result["cutover_status"] == "blocked"
    assert [s["path"] for s in result["source"]["locations"]] == [
        "configuration.yaml"
    ]


def test_invalid_entity_option_is_local_not_global(
    tmp_path: Path,
) -> None:
    prepare_case(tmp_path, "S13")
    result = discovery.discover_google_assistant(tmp_path)
    assert result["global_blockers"] == []
    assert result["counts"]["explicit_entries"] == 2
    assert result["cutover_status"] == "pending_review"
    bad = next(e for e in result["entities"] if e["entity_id"] == "light.bad")
    assert "invalid_room_option" in bad["reasons"]


def test_secrets_are_never_read_or_echoed(tmp_path: Path) -> None:
    prepare_case(tmp_path, "S16")
    # Do not create credential or secret files: reader must never try them.
    report = discovery.discover_google_assistant(tmp_path)
    text = json.dumps(report)
    assert report["source"]["status"] == "resolved"
    assert "google_pin" not in text
    assert "credentials.json" not in text
    assert "service_account" not in text
    assert "secure_devices_pin" not in text


def test_discovery_never_writes_files_or_labels(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    prepare_case(tmp_path, "S02")

    def forbid_write(*args, **kwargs):
        raise AssertionError("Discovery attempted a write")

    monkeypatch.setattr(Path, "write_text", forbid_write)
    monkeypatch.setattr(Path, "write_bytes", forbid_write)
    result = discovery.discover_google_assistant(tmp_path)
    assert result["counts"]["explicit_entries"] == 2


def test_nested_include_stays_within_configuration_directory(
    tmp_path: Path,
) -> None:
    prepare_case(tmp_path, "S09")
    result = discovery.discover_google_assistant(tmp_path)
    assert [s["path"] for s in result["source"]["locations"]] == [
        "configuration.yaml",
        "google_assistant.yaml",
        "ga_entities.yaml",
    ]


def test_symlink_outside_config_is_rejected(tmp_path: Path) -> None:
    home = tmp_path / "config"
    home.mkdir()
    outside = tmp_path / "outside.yaml"
    outside.write_text("light.private:\n  expose: true\n", encoding="utf-8")
    (home / "configuration.yaml").write_text(
        "google_assistant:\n"
        "  expose_by_default: false\n"
        "  entity_config: !include external.yaml\n",
        encoding="utf-8",
    )
    (home / "external.yaml").symlink_to(outside)
    result = discovery.discover_google_assistant(home)
    assert "include_outside_config" in result["global_blockers"]
    assert all(s["path"] != "external.yaml" for s in result["source"]["locations"])


def test_cyclic_alias_is_refused(tmp_path: Path) -> None:
    (tmp_path / "configuration.yaml").write_text(
        "google_assistant: &loop\n  nested: *loop\n", encoding="utf-8"
    )
    result = discovery.discover_google_assistant(tmp_path)
    assert "cyclic_yaml_alias" in result["global_blockers"]


def test_missing_config_is_not_silently_treated_as_new(tmp_path: Path) -> None:
    result = discovery.discover_google_assistant(tmp_path)
    assert result["cutover_status"] == "blocked"
    assert "include_missing" in result["global_blockers"]


def test_empty_exposed_domains_does_not_mean_all_domains(
    tmp_path: Path,
) -> None:
    (tmp_path / "configuration.yaml").write_text(
        "google_assistant:\n"
        "  expose_by_default: true\n"
        "  exposed_domains: []\n",
        encoding="utf-8",
    )
    result = discovery.discover_google_assistant(tmp_path)
    assert result["rules"]["rule_type"] == "domain_limited"
    assert result["rules"]["exposed_domains"] == []
    assert not result["rules"]["implicit_exposure_may_change_with_new_entities"]


def test_secret_include_path_is_refused_without_reading(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    (tmp_path / "configuration.yaml").write_text(
        "google_assistant:\n"
        "  entity_config: !include secrets.yaml\n",
        encoding="utf-8",
    )
    (tmp_path / "secrets.yaml").write_text(
        "password: never-read-this\n", encoding="utf-8"
    )
    original = Path.read_bytes

    def guarded_read(path: Path):
        if path.name == "secrets.yaml":
            raise AssertionError("Attempted to read secrets.yaml")
        return original(path)

    monkeypatch.setattr(Path, "read_bytes", guarded_read)
    result = discovery.discover_google_assistant(tmp_path)
    assert "sensitive_file_reference" in result["global_blockers"]
    assert "never-read-this" not in json.dumps(result)


def test_unknown_expose_value_is_a_local_anomaly(tmp_path: Path) -> None:
    (tmp_path / "configuration.yaml").write_text(
        "google_assistant:\n"
        "  expose_by_default: false\n"
        "  entity_config:\n"
        "    switch.valid:\n"
        "      expose: true\n"
        "    switch.invalid:\n"
        "      expose: certainly\n",
        encoding="utf-8",
    )
    result = discovery.discover_google_assistant(tmp_path)
    assert result["cutover_status"] == "pending_review"
    assert result["global_blockers"] == []
    invalid = next(x for x in result["entities"] if x["entity_id"] == "switch.invalid")
    assert invalid["yaml_exposure_intent"] == "unknown"
    assert "invalid_expose_value" in invalid["reasons"]


def test_unresolved_default_exposure_is_a_global_blocker(tmp_path: Path) -> None:
    (tmp_path / "configuration.yaml").write_text(
        "google_assistant:\n"
        "  expose_by_default: !secret default_exposure\n"
        "  entity_config:\n"
        "    light.salon:\n"
        "      expose: true\n",
        encoding="utf-8",
    )
    result = discovery.discover_google_assistant(tmp_path)
    assert "invalid_expose_by_default" in result["global_blockers"]
    assert "default_exposure" not in json.dumps(result)
