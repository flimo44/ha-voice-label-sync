"""End-to-end inert assisted migration comparison and failure regressions."""

from __future__ import annotations

import copy
import importlib.util
import json
import sys
from pathlib import Path
from types import ModuleType

import pytest

COMPONENT = (
    Path(__file__).resolve().parents[1] / "custom_components" / "ha_voice_label_sync"
)
HEADER = b"""# No write should ever touch this comment.
google_assistant:
  project_id: PRIVATE_PROJECT_123
  secure_devices_pin: !secret private_pin
  expose_by_default: false
  entity_config: !include entity_manual.yaml
"""
MANUAL = b"""light.good:
  expose: true
light.custom:
  expose: true
  name: "PERSONAL NAME"
  room: "Chambre # 2"
  aliases: ["Ma lampe", "On"]
lock.excluded:
  expose: false
light.bad:
  expose: true
  device_type: unsupported
"""


@pytest.fixture
def modules(monkeypatch):
    prefix = "_test_full_migration_review"
    package = ModuleType(prefix)
    package.__path__ = [str(COMPONENT)]
    monkeypatch.setitem(sys.modules, prefix, package)
    result = {}
    for stem in (
        "migration_discovery", "migration_baseline", "migration_journal",
        "migration_metadata", "migration_stage_plan",
        "migration_stage_executor", "entity_catalog", "label_update",
        "migration_cutover_review",
    ):
        name = f"{prefix}.{stem}"
        spec = importlib.util.spec_from_file_location(
            name, COMPONENT / f"{stem}.py"
        )
        assert spec is not None and spec.loader is not None
        module = importlib.util.module_from_spec(spec)
        monkeypatch.setitem(sys.modules, name, module)
        spec.loader.exec_module(module)
        result[stem] = module
    return result


def _row(entity_id, *, before="exposed", intent="expose", fields=(),
         category="candidate_for_review", reasons=()):
    return {
        "entity_id": entity_id,
        "category": category,
        "disk_ha_sync_projection": before,
        "yaml_exposure_intent": intent,
        "reasons": list(reasons),
        "customization_fields_present": list(fields),
        "loaded_policy_difference": None,
    }


def _registries(*entities, labeled=()):
    labels = set(labeled)
    return {
        "entity_registry": {
            "data": {
                "entities": [{
                    "entity_id": entity_id,
                    "name": f"HA {entity_id}",
                    "original_name": None,
                    "device_id": None,
                    "area_id": None,
                    "labels": (
                        ["other_label", "google_assistant"]
                        if entity_id in labels else ["other_label"]
                    ),
                    "disabled_by": None,
                    "hidden_by": None,
                    "entity_category": None,
                    "device_class": None,
                } for entity_id in entities]
            }
        },
        "label_registry": {
            "data": {"labels": [
                {"label_id": "google_assistant", "name": "Google Assistant"},
                {"label_id": "other_label", "name": "Other"},
            ]}
        },
        "area_registry": {"data": {"areas": []}},
        "device_registry": {"data": {"devices": []}},
    }


def _facts(*entities, labeled=()):
    return {
        entity_id: {
            "registry_id": "registry_" + entity_id.replace(".", "_"),
            "label_present": entity_id in labeled,
            "eligible": True,
        }
        for entity_id in entities
    }


def _decisions(*entity_ids):
    return {entity_id: {"action": "import"} for entity_id in entity_ids}


def _prepare(tmp_path, modules, rows, *, manual=MANUAL, baseline=True):
    (tmp_path / "configuration.yaml").write_bytes(HEADER)
    (tmp_path / "entity_manual.yaml").write_bytes(manual)
    disk = modules["migration_discovery"].discover_google_assistant(tmp_path)
    assert disk["source"]["status"] == "resolved"
    sha = "f" * 64
    if baseline:
        verified = modules["migration_baseline"].capture_baseline(tmp_path, disk)
        sha = verified["manifest_sha256"]
    diagnostic = {
        "schema_version": 1,
        "mode": "assisted_migration",
        "read_only": True,
        "source": disk["source"],
        "global_blockers": [],
        "runtime_snapshot": {"status": "complete"},
        "disk_projection": {
            "status": "read_only_projection",
            "basis": "disk_yaml_only",
            "active_runtime_policy_certified": False,
        },
        "loaded_policy": {
            "status": "match_compared_fields",
            "rule_changes": [],
            "differences": [],
        },
        "entities": list(rows),
    }
    return diagnostic, sha


def _review(
    tmp_path, modules, diagnostic, sha, choices, registries, facts,
):
    return modules["migration_cutover_review"].build_readonly_migration_review(
        tmp_path,
        diagnostic,
        choices,
        facts,
        registries,
        configured_label="Google Assistant",
        domains=frozenset({"light", "lock", "switch"}),
        expected_baseline_manifest_sha256=sha,
    )


def _by_id(result, entity):
    return next(x for x in result["entities"] if x["entity_id"] == entity)


def test_full_import_preview_preserves_effective_exposures(
    tmp_path, modules
):
    manual = b"light.good:\n  expose: true\nlock.excluded:\n  expose: false\n"
    diag, sha = _prepare(
        tmp_path, modules,
        [_row("light.good"), _row(
            "lock.excluded", before="not_exposed", intent="exclude",
            category="explicitly_excluded",
            reasons=("explicitly_excluded",),
        )],
        manual=manual,
    )
    original = _registries("light.good", "lock.excluded")
    before = copy.deepcopy(original)
    result = _review(
        tmp_path, modules, diag, sha,
        _decisions("light.good"), original, _facts("light.good", "lock.excluded"),
    )
    assert result["status"] == "hypothetical_preview_consistent"
    assert result["source_and_baseline_verified_at_review"] is True
    assert result["global_blockers"] == []
    assert result["summary"] == {
        "considered": 2,
        "hypothetically_labelled": 1,
        "stage_label_additions_proposed": 1,
        "needs_review": 0,
        "preview_consistent": 2,
    }
    assert _by_id(result, "light.good")["hypothetical_after"] == "exposed"
    assert _by_id(result, "lock.excluded")["hypothetical_after"] == (
        "not_exposed"
    )
    assert result["candidate_yaml_sha256"]
    assert result["read_only"] is True
    assert result["apply_allowed"] is False
    assert result["cutover_allowed"] is False
    assert original == before
    assert (tmp_path / "configuration.yaml").read_bytes() == HEADER
    assert (tmp_path / "entity_manual.yaml").read_bytes() == manual
    assert not (tmp_path / ".storage" / "hvls_migration" / "journal.json").exists()


def test_custom_google_metadata_preserved_but_staging_still_blocked(
    tmp_path, modules
):
    diag, sha = _prepare(tmp_path, modules, [
        _row("light.good"),
        _row(
            "light.custom", category="needs_review",
            fields=("name", "room", "aliases"),
        ),
        _row(
            "lock.excluded", before="not_exposed", intent="exclude",
            category="explicitly_excluded",
            reasons=("explicitly_excluded",),
        ),
        _row("light.bad", before="unknown", category="needs_review",
             reasons=("unhandled_entity_option",)),
    ])
    registries = _registries(
        "light.good", "light.custom", "light.bad", "lock.excluded"
    )
    before = copy.deepcopy(registries)
    result = _review(
        tmp_path, modules, diag, sha,
        _decisions("light.good", "light.custom"),
        registries,
        _facts("light.good", "light.custom", "light.bad", "lock.excluded"),
    )
    assert result["status"] == "local_review_pending"
    assert result["metadata_preview_summary"]["metadata_fields_preserved"] == 3
    assert result["metadata_preview_summary"]["needs_review"] == 0
    assert result["summary"]["stage_label_additions_proposed"] == 1
    assert result["summary"]["hypothetically_labelled"] == 2
    assert _by_id(result, "light.custom")["hypothetical_after"] == "exposed"
    assert "label_staging_not_yet_authorized" in (
        _by_id(result, "light.custom")["reasons"]
    )
    assert _by_id(result, "light.bad")["status"] == "needs_review"
    assert _by_id(result, "lock.excluded")["status"] == "preview_consistent"
    serialized = json.dumps(result)
    for private in (
        "PERSONAL NAME", "Ma lampe", "Chambre # 2", "PRIVATE_PROJECT_123",
    ):
        assert private not in serialized
    assert "aliases" in serialized
    assert registries == before


def test_unsupported_local_entity_keeps_other_preview_rows(
    tmp_path, modules
):
    diag, sha = _prepare(tmp_path, modules, [
        _row("light.good"),
        _row("light.bad", before="unknown", category="needs_review",
             reasons=("unhandled_entity_option",)),
    ])
    result = _review(
        tmp_path, modules, diag, sha,
        _decisions("light.good", "light.bad"),
        _registries("light.good", "light.bad"),
        _facts("light.good", "light.bad"),
    )
    assert result["status"] == "local_review_pending"
    assert result["metadata_preview_summary"]["preview_entities"] == 1
    assert result["metadata_preview_summary"]["needs_review"] == 1
    assert _by_id(result, "light.good")["status"] == "preview_consistent"
    assert "original_exposure_unknown" in _by_id(
        result, "light.bad"
    )["reasons"]


def test_current_label_not_approved_blocks_entire_candidate(
    tmp_path, modules
):
    manual = b"light.good:\n  expose: true\n"
    diag, sha = _prepare(tmp_path, modules, [
        _row("light.good"),
        _row("switch.rogue", before="not_exposed", intent="not_configured",
             category="runtime_without_yaml_entry"),
    ], manual=manual)
    registries = _registries("light.good", "switch.rogue",
                            labeled=("switch.rogue",))
    result = _review(
        tmp_path, modules, diag, sha,
        _decisions("light.good"), registries,
        _facts("light.good", "switch.rogue", labeled=("switch.rogue",)),
    )
    assert result["status"] == "global_review_blocked"
    assert "candidate_yaml_not_complete" in result["global_blockers"]
    assert "unapproved_generated_exposure" in result["global_blockers"]
    assert result["candidate_yaml_sha256"] is None
    assert result["metadata_preview_summary"]["unreviewed_generated_entities"] == 1
    assert result["cutover_allowed"] is False


def test_keep_exposed_entity_would_lose_exposure(
    tmp_path, modules
):
    manual = b"light.keep:\n  expose: true\nlight.good:\n  expose: true\n"
    diag, sha = _prepare(
        tmp_path, modules,
        [_row("light.keep"), _row("light.good")], manual=manual
    )
    result = _review(
        tmp_path, modules, diag, sha,
        {"light.keep": {"action": "keep"}, **_decisions("light.good")},
        _registries("light.keep", "light.good"),
        _facts("light.keep", "light.good"),
    )
    entry = _by_id(result, "light.keep")
    assert entry["hypothetical_after"] == "not_exposed"
    assert "projected_exposure_would_be_lost" in entry["reasons"]
    assert "keep_would_not_preserve_exposure" in entry["reasons"]
    assert result["cutover_allowed"] is False


def test_explicitly_excluded_import_never_appears_in_preview(
    tmp_path, modules
):
    manual = b"light.good:\n  expose: true\nlock.excluded:\n  expose: false\n"
    diag, sha = _prepare(
        tmp_path, modules,
        [
            _row("light.good"),
            _row("lock.excluded", before="not_exposed", intent="exclude",
                 category="explicitly_excluded",
                 reasons=("explicitly_excluded",)),
        ], manual=manual,
    )
    result = _review(
        tmp_path, modules, diag, sha,
        _decisions("light.good", "lock.excluded"),
        _registries("light.good", "lock.excluded"),
        _facts("light.good", "lock.excluded"),
    )
    excluded = _by_id(result, "lock.excluded")
    assert excluded["hypothetical_after"] == "not_exposed"
    assert "explicitly_excluded" in excluded["reasons"]
    assert "label_staging_not_yet_authorized" in excluded["reasons"]
    assert result["metadata_preview_summary"]["needs_review"] == 1


@pytest.mark.parametrize("decision", ["disable", "remove"])
def test_destructive_decision_never_implicitly_authorized(
    tmp_path, modules, decision
):
    manual = b"light.good:\n  expose: true\nlight.keep:\n  expose: true\n"
    diag, sha = _prepare(
        tmp_path, modules,
        [_row("light.good"), _row("light.keep")], manual=manual
    )
    result = _review(
        tmp_path, modules, diag, sha,
        {"light.keep": {
            "action": decision, "acknowledge_change": True,
        }, **_decisions("light.good")},
        _registries("light.good", "light.keep"),
        _facts("light.good", "light.keep"),
    )
    assert "destructive_decision_not_implemented" in (
        _by_id(result, "light.keep")["reasons"]
    )
    assert result["apply_allowed"] is False


def test_missing_protected_baseline_never_silently_accepted(
    tmp_path, modules
):
    manual = b"light.good:\n  expose: true\n"
    diag, sha = _prepare(
        tmp_path, modules, [_row("light.good")],
        manual=manual, baseline=False
    )
    result = _review(
        tmp_path, modules, diag, sha,
        _decisions("light.good"),
        _registries("light.good"),
        _facts("light.good"),
    )
    assert "protected_source_or_metadata_unavailable" in result[
        "global_blockers"
    ]
    assert result["source_and_baseline_verified_at_review"] is False
    assert result["candidate_yaml_sha256"] is None
    assert result["cutover_allowed"] is False


def test_source_modified_after_baseline_blocks_preflight(
    tmp_path, modules
):
    manual = b"light.good:\n  expose: true\n"
    diag, sha = _prepare(
        tmp_path, modules, [_row("light.good")], manual=manual
    )
    (tmp_path / "entity_manual.yaml").write_bytes(
        manual + b"# manual edit after baseline\n"
    )
    result = _review(
        tmp_path, modules, diag, sha,
        _decisions("light.good"),
        _registries("light.good"),
        _facts("light.good"),
    )
    assert result["status"] == "global_review_blocked"
    assert not result["source_and_baseline_verified_at_review"]
    assert result["cutover_allowed"] is False


def test_local_label_membership_drift_is_visible_not_coerced(
    tmp_path, modules
):
    manual = b"light.good:\n  expose: true\nlight.other:\n  expose: true\n"
    diag, sha = _prepare(
        tmp_path, modules,
        [_row("light.good"), _row("light.other")],
        manual=manual,
    )
    result = _review(
        tmp_path, modules, diag, sha,
        _decisions("light.good", "light.other"),
        _registries("light.good", "light.other"),
        _facts("light.good", "light.other", labeled=("light.other",)),
    )
    assert result["status"] == "local_review_pending"
    assert "label_membership_snapshot_drift" in (
        _by_id(result, "light.other")["reasons"]
    )
    assert _by_id(result, "light.good")["status"] == "preview_consistent"


def test_70_safe_10_unsupported_entity_options_are_isolated(
    tmp_path, modules
):
    good = [f"light.good_{i}" for i in range(70)]
    bad = [f"light.bad_{i}" for i in range(10)]
    manual = "".join(
        f"{name}:\n  expose: true\n" for name in good
    ) + "".join(
        f"{name}:\n  expose: true\n  unknown_option: not_supported\n"
        for name in bad
    )
    rows = [
        _row(name, reasons=("explicitly_exposed",))
        for name in good
    ] + [
        _row(name, before="unknown", category="needs_review",
             reasons=("unhandled_entity_option",))
        for name in bad
    ]
    diag, sha = _prepare(
        tmp_path, modules, rows, manual=manual.encode()
    )
    all_names = good + bad
    result = _review(
        tmp_path, modules, diag, sha,
        _decisions(*all_names),
        _registries(*all_names),
        _facts(*all_names),
    )
    assert result["status"] == "local_review_pending"
    assert result["metadata_preview_summary"]["preview_entities"] == 70
    assert result["metadata_preview_summary"]["needs_review"] == 10
    assert result["summary"]["stage_label_additions_proposed"] == 70
    assert result["summary"]["needs_review"] == 10
    assert result["summary"]["preview_consistent"] == 70


def test_unknown_before_exposure_blocks_consistency(
    tmp_path, modules
):
    manual = b"light.good:\n  expose: true\n"
    diag, sha = _prepare(
        tmp_path, modules,
        [_row("light.good", before="unknown", category="needs_review")],
        manual=manual,
    )
    result = _review(
        tmp_path, modules, diag, sha,
        _decisions("light.good"),
        _registries("light.good"),
        _facts("light.good"),
    )
    assert "original_exposure_unknown" in (
        _by_id(result, "light.good")["reasons"]
    )
    assert result["cutover_allowed"] is False


def test_preexisting_label_with_explicit_import_can_be_reused(
    tmp_path, modules
):
    manual = b"light.good:\n  expose: true\n"
    diag, sha = _prepare(
        tmp_path, modules, [_row("light.good")], manual=manual
    )
    result = _review(
        tmp_path, modules, diag, sha,
        _decisions("light.good"),
        _registries("light.good", labeled=("light.good",)),
        _facts("light.good", labeled=("light.good",)),
    )
    assert result["status"] == "hypothetical_preview_consistent"
    assert result["summary"]["hypothetically_labelled"] == 0
    assert result["summary"]["stage_label_additions_proposed"] == 0


def test_global_rule_drift_retains_global_blocker(
    tmp_path, modules
):
    manual = b"light.good:\n  expose: true\n"
    diag, sha = _prepare(
        tmp_path, modules, [_row("light.good")], manual=manual
    )
    diag["loaded_policy"]["rule_changes"] = ["expose_by_default"]
    result = _review(
        tmp_path, modules, diag, sha,
        _decisions("light.good"),
        _registries("light.good"),
        _facts("light.good"),
    )
    assert "global_exposure_rules_differ" in result["global_blockers"]
    assert result["status"] == "global_review_blocked"


def test_diagnostic_duplicate_entities_fail_closed(
    tmp_path, modules
):
    manual = b"light.good:\n  expose: true\n"
    diag, sha = _prepare(
        tmp_path, modules, [_row("light.good"), _row("light.good")],
        manual=manual
    )
    with pytest.raises(
        modules["migration_cutover_review"].CutoverReviewError,
        match="staging_plan_unavailable"
    ):
        _review(
            tmp_path, modules, diag, sha,
            _decisions("light.good"),
            _registries("light.good"),
            _facts("light.good"),
        )
