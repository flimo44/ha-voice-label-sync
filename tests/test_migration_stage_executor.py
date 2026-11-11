"""Failure-injection tests for dormant single-entity migration staging."""

from __future__ import annotations

import asyncio
import hashlib
import importlib.util
import json
import sys
from pathlib import Path
from types import ModuleType, SimpleNamespace

import pytest

COMPONENT = (
    Path(__file__).resolve().parents[1] / "custom_components" / "ha_voice_label_sync"
)
SOURCE = b"""# Preserve original YAML bytes
google_assistant:
  expose_by_default: false
  entity_config:
    light.good:
      expose: true
"""


@pytest.fixture
def modules(monkeypatch):
    prefix = "_test_hvls_single_stage"
    package = ModuleType(prefix)
    package.__path__ = [str(COMPONENT)]
    monkeypatch.setitem(sys.modules, prefix, package)
    loaded = {}
    for stem in (
        "migration_discovery", "migration_baseline", "migration_journal",
        "migration_stage_plan", "label_update", "migration_stage_executor",
    ):
        name = f"{prefix}.{stem}"
        spec = importlib.util.spec_from_file_location(
            name, COMPONENT / f"{stem}.py"
        )
        assert spec and spec.loader
        module = importlib.util.module_from_spec(spec)
        monkeypatch.setitem(sys.modules, name, module)
        spec.loader.exec_module(module)
        loaded[stem] = module

    diag = ModuleType(f"{prefix}.migration_diagnostic")
    monkeypatch.setitem(sys.modules, diag.__name__, diag)
    lock = ModuleType(f"{prefix}.workflow_lock")
    lock.get_workflow_lock = lambda hass: hass.lock
    monkeypatch.setitem(sys.modules, lock.__name__, lock)
    return loaded, diag


def _diagnostic(tmp_path, modules):
    source = modules["migration_discovery"].discover_google_assistant(tmp_path)
    return {
        "schema_version": 1,
        "read_only": True,
        "mode": "assisted_migration",
        "source": source["source"],
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
        "entities": [{
            "entity_id": "light.good",
            "category": "candidate_for_review",
            "disk_ha_sync_projection": "exposed",
            "yaml_exposure_intent": "expose",
            "customization_fields_present": [],
            "reasons": ["explicitly_exposed"],
        }],
    }, source


def _setup(tmp_path, modules, diag_module, monkeypatch):
    (tmp_path / "configuration.yaml").write_bytes(SOURCE)
    diagnostic, discovery = _diagnostic(tmp_path, modules)
    baseline = modules["migration_baseline"].capture_baseline(
        tmp_path, discovery
    )
    journal = modules["migration_journal"]
    journal.initialize_journal(tmp_path)
    journal.advance_phase(tmp_path, "labels_staging", expected_revision=0)

    hass = SimpleNamespace(
        config=SimpleNamespace(config_dir=str(tmp_path)),
        lock=asyncio.Lock(),
        entity_id="light.good",
        registry_id="registry_01",
        label_present=False,
        eligible=True,
        writes=[],
        executor_calls=[],
    )

    async def executor(fn, *args):
        hass.executor_calls.append(getattr(fn, "__name__", "lambda"))
        return fn(*args)

    async def get_diagnostic(_hass):
        return diagnostic

    hass.async_add_executor_job = executor
    diag_module.build_admin_migration_diagnostic = get_diagnostic
    stage = modules["migration_stage_executor"]

    def catalog(_hass, configured_label, entity_ids):
        assert configured_label == "Google Assistant"
        if "light.good" not in entity_ids:
            return "google_assistant", {}
        return "google_assistant", {
            "light.good": {
                "registry_id": hass.registry_id,
                "label_present": hass.label_present,
                "eligible": hass.eligible,
            }
        }

    def write(_hass, **kw):
        assert kw["entity_id"] == "light.good"
        assert kw["expected_registry_id"] == hass.registry_id
        assert not hass.label_present
        # The durable intent must exist BEFORE the native label write.
        pending = journal.read_journal(tmp_path)
        assert pending["operations"][0]["status"] == "intent"
        hass.writes.append("light.good")
        hass.label_present = True

    monkeypatch.setattr(stage, "_current_catalog", catalog)
    monkeypatch.setattr(stage, "_write_one_ha_label", write)
    decisions = {"light.good": {"action": "import"}}
    plan = modules["migration_stage_plan"].build_reviewed_stage_plan(
        diagnostic, decisions,
        catalog(hass, "Google Assistant", ["light.good"])[1],
        label_id="google_assistant",
    )
    parameters = {
        "entity_id": "light.good",
        "decisions": decisions,
        "expected_review_token_sha256": plan["review_token_sha256"],
        "expected_baseline_manifest_sha256": baseline["manifest_sha256"],
        "expected_journal_revision": 1,
        "operation_id": "op_01",
        "configured_label": "Google Assistant",
        "admin_approved": True,
    }
    return hass, stage, journal, parameters


def _run(stage, hass, parameters):
    return asyncio.run(stage.stage_one_approved_label(hass, **parameters))


def test_verified_single_import_commits_intent_before_one_label_update(
    tmp_path, modules, monkeypatch
):
    group, diag = modules
    hass, stage, journal, request = _setup(
        tmp_path, group, diag, monkeypatch
    )
    result = _run(stage, hass, request)
    assert result["status"] == "label_staged"
    assert result["journal_revision"] == 3
    assert result["cutover_allowed"] is False
    assert result["metadata_preservation_verified"] is False
    assert result["google_home_state_verified"] is False
    assert hass.writes == ["light.good"]
    assert hass.label_present is True
    assert journal.read_journal(tmp_path)["operations"][0]["status"] == "applied"
    assert (tmp_path / "configuration.yaml").read_bytes() == SOURCE
    assert sum(c == "verify_current_sources" for c in hass.executor_calls) == 2


def test_explicit_approval_required_before_any_write(
    tmp_path, modules, monkeypatch
):
    group, diag = modules
    hass, stage, journal, request = _setup(
        tmp_path, group, diag, monkeypatch
    )
    request["admin_approved"] = False
    with pytest.raises(stage.MigrationStageError, match="explicit_admin"):
        _run(stage, hass, request)
    assert hass.writes == []
    assert journal.read_journal(tmp_path)["operations"] == []


def test_stale_approval_token_refused_before_journal(
    tmp_path, modules, monkeypatch
):
    group, diag = modules
    hass, stage, journal, request = _setup(
        tmp_path, group, diag, monkeypatch
    )
    request["expected_review_token_sha256"] = "b" * 64
    with pytest.raises(stage.MigrationStageError, match="review_expired"):
        _run(stage, hass, request)
    assert not journal.read_journal(tmp_path)["operations"]
    assert not hass.writes


def test_changed_original_yaml_refuses_intent_and_write(
    tmp_path, modules, monkeypatch
):
    group, diag = modules
    hass, stage, journal, request = _setup(
        tmp_path, group, diag, monkeypatch
    )
    (tmp_path / "configuration.yaml").write_bytes(SOURCE + b"# modification\n")
    with pytest.raises(stage.MigrationStageError, match="source_or_baseline"):
        _run(stage, hass, request)
    assert not journal.read_journal(tmp_path)["operations"]
    assert hass.writes == []


def test_edited_source_after_intent_stops_before_registry_mutation(
    tmp_path, modules, monkeypatch
):
    group, diag = modules
    hass, stage, journal, request = _setup(
        tmp_path, group, diag, monkeypatch
    )
    original_executor = hass.async_add_executor_job

    async def executor(fn, *args):
        if getattr(fn, "__name__", "") == "verify_current_sources":
            if journal.read_journal(tmp_path)["operations"]:
                (tmp_path / "configuration.yaml").write_bytes(
                    SOURCE + b"# edited after intent\n"
                )
        return await original_executor(fn, *args)

    hass.async_add_executor_job = executor
    with pytest.raises(stage.MigrationStageError, match="source_or_baseline"):
        _run(stage, hass, request)
    assert hass.writes == []
    assert journal.read_journal(tmp_path)["operations"][0]["status"] == "intent"


def test_label_changed_after_intent_is_never_overwritten(
    tmp_path, modules, monkeypatch
):
    group, diag = modules
    hass, stage, journal, request = _setup(
        tmp_path, group, diag, monkeypatch
    )
    original_write = stage._write_one_ha_label

    def conflicting_write(_hass, **kw):
        hass.label_present = True
        if hass.label_present:
            raise stage.MigrationStageError("registry_prewrite_conflict")
        original_write(_hass, **kw)

    monkeypatch.setattr(stage, "_write_one_ha_label", conflicting_write)
    with pytest.raises(stage.MigrationStageError, match="registry_prewrite"):
        _run(stage, hass, request)
    assert hass.writes == []
    assert journal.read_journal(tmp_path)["operations"][0]["status"] == "intent"


def test_acknowledgement_failed_after_label_write_preserves_pending_intent(
    tmp_path, modules, monkeypatch
):
    group, diag = modules
    hass, stage, journal, request = _setup(
        tmp_path, group, diag, monkeypatch
    )

    def simulate_disk_failure(*_args, **_kwargs):
        raise OSError("simulated ack failure")

    monkeypatch.setattr(stage, "mark_label_applied", simulate_disk_failure)
    with pytest.raises(OSError, match="simulated ack failure"):
        _run(stage, hass, request)
    assert hass.writes == ["light.good"]
    assert journal.read_journal(tmp_path)["operations"][0]["status"] == "intent"
    recovery = journal.recovery_report(
        tmp_path,
        {"light.good": {
            "registry_id": hass.registry_id,
            "has_label": True,
        }},
    )
    assert recovery["operations"][0]["status"] == "unconfirmed_intent"
    assert recovery["needs_review"] is True


def test_existing_entity_operation_is_not_replayed(
    tmp_path, modules, monkeypatch
):
    group, diag = modules
    hass, stage, journal, request = _setup(
        tmp_path, group, diag, monkeypatch
    )
    journal.record_label_intent(
        tmp_path,
        operation_id="older_op",
        entity_id="light.good",
        registry_id="registry_01",
        label_id="google_assistant",
        expected_before=False,
        expected_after=True,
        expected_revision=1,
    )
    request["expected_journal_revision"] = 2
    with pytest.raises(
        stage.MigrationStageError, match="entity_already_has_migration"
    ):
        _run(stage, hass, request)
    assert hass.writes == []
    assert len(journal.read_journal(tmp_path)["operations"]) == 1


def test_stale_journal_revision_refused_before_intent(
    tmp_path, modules, monkeypatch
):
    group, diag = modules
    hass, stage, journal, request = _setup(
        tmp_path, group, diag, monkeypatch
    )
    request["expected_journal_revision"] = 99
    with pytest.raises(stage.MigrationStageError, match="journal_revision_changed"):
        _run(stage, hass, request)
    assert hass.writes == []


def test_corrupt_baseline_or_wrong_manifest_fails_closed(
    tmp_path, modules, monkeypatch
):
    group, diag = modules
    hass, stage, journal, request = _setup(
        tmp_path, group, diag, monkeypatch
    )
    request["expected_baseline_manifest_sha256"] = "f" * 64
    with pytest.raises(stage.MigrationStageError, match="baseline_confirmation"):
        _run(stage, hass, request)
    assert journal.read_journal(tmp_path)["operations"] == []
    assert hass.writes == []


def test_metadata_or_explicit_exclusion_never_stageable(
    tmp_path, modules, monkeypatch
):
    group, diag = modules
    hass, stage, journal, request = _setup(
        tmp_path, group, diag, monkeypatch
    )
    stage_plan = group["migration_stage_plan"]
    original = group["migration_diagnostic"].build_admin_migration_diagnostic if (
        "migration_diagnostic" in group
    ) else diag.build_admin_migration_diagnostic

    for category, custom, intent in (
        ("needs_review", ["name"], "expose"),
        ("explicitly_excluded", [], "exclude"),
    ):
        state = (tmp_path / "configuration.yaml").read_bytes()
        assert state == SOURCE
        async def modified(_hass, *, _c=category, _m=custom, _i=intent):
            result = await original(_hass)
            changed = json.loads(json.dumps(result))
            entry = changed["entities"][0]
            entry["category"] = _c
            entry["customization_fields_present"] = _m
            entry["yaml_exposure_intent"] = _i
            return changed
        diag.build_admin_migration_diagnostic = modified
        report = asyncio.run(modified(hass))
        token = stage_plan.build_reviewed_stage_plan(
            report,
            request["decisions"],
            {"light.good": {
                "registry_id": hass.registry_id,
                "label_present": False,
                "eligible": True,
            }},
            label_id="google_assistant",
        )["review_token_sha256"]
        request["expected_review_token_sha256"] = token
        with pytest.raises(
            stage.MigrationStageError, match="entity_not_approved_for_import"
        ):
            _run(stage, hass, request)
    assert journal.read_journal(tmp_path)["operations"] == []
    assert hass.writes == []


def test_no_unrelated_entities_or_extra_fields_in_stage_result(
    tmp_path, modules, monkeypatch
):
    group, diag = modules
    hass, stage, _, request = _setup(
        tmp_path, group, diag, monkeypatch
    )
    result = _run(stage, hass, request)
    assert set(result) == {
        "entity_id", "operation_id", "journal_revision", "status",
        "cutover_allowed", "metadata_preservation_verified",
        "google_home_state_verified",
    }
    assert "secure_devices_pin" not in json.dumps(result)


def test_native_registry_identity_check_preserves_other_labels(
    modules, monkeypatch
):
    group, _ = modules
    stage = group["migration_stage_executor"]
    entity = SimpleNamespace(
        id="native_01", labels={"other_label"}, entity_id="light.good"
    )

    class FakeRegistry:
        def __init__(self):
            self.entries = {"light.good": entity}
            self.writes = []

        def async_get(self, identifier):
            return self.entries.get(identifier)

        def async_update_entity(self, identifier, *, labels):
            self.writes.append((identifier, set(labels)))
            self.entries[identifier].labels = set(labels)

    registry = FakeRegistry()
    helpers = ModuleType("homeassistant.helpers")
    fake_er = ModuleType("homeassistant.helpers.entity_registry")
    fake_er.async_get = lambda hass: registry
    helpers.entity_registry = fake_er
    homeassistant = ModuleType("homeassistant")
    homeassistant.__path__ = []
    homeassistant.helpers = helpers
    monkeypatch.setitem(sys.modules, "homeassistant", homeassistant)
    monkeypatch.setitem(sys.modules, "homeassistant.helpers", helpers)
    monkeypatch.setitem(
        sys.modules, "homeassistant.helpers.entity_registry", fake_er
    )

    def current(_hass, _configured, _identifiers):
        return "google_assistant", {
            "light.good": {
                "registry_id": entity.id,
                "eligible": True,
                "label_present": "google_assistant" in entity.labels,
            }
        }

    monkeypatch.setattr(stage, "_current_catalog", current)
    stage._write_one_ha_label(
        object(),
        entity_id="light.good",
        expected_registry_id="native_01",
        label_id="google_assistant",
        configured_label="Google Assistant",
    )
    assert registry.writes == [(
        "light.good", {"other_label", "google_assistant"}
    )]
    assert entity.labels == {"other_label", "google_assistant"}


@pytest.mark.parametrize("change", ["identity", "membership", "eligibility"])
def test_native_registry_refuses_stale_or_ineligible_entity(
    modules, monkeypatch, change
):
    group, _ = modules
    stage = group["migration_stage_executor"]
    entity = SimpleNamespace(id="native_01", labels=set())
    if change == "identity":
        entity.id = "replacement_02"
    if change == "membership":
        entity.labels = {"google_assistant"}

    class FakeRegistry:
        def __init__(self):
            self.writes = []

        def async_get(self, _entity_id):
            return entity

        def async_update_entity(self, entity_id, *, labels):
            self.writes.append((entity_id, labels))

    fake_er = ModuleType("homeassistant.helpers.entity_registry")
    fake_er.async_get = lambda hass: FakeRegistry()
    helpers = ModuleType("homeassistant.helpers")
    helpers.entity_registry = fake_er
    ha = ModuleType("homeassistant")
    ha.__path__ = []
    ha.helpers = helpers
    monkeypatch.setitem(sys.modules, "homeassistant", ha)
    monkeypatch.setitem(sys.modules, "homeassistant.helpers", helpers)
    monkeypatch.setitem(
        sys.modules, "homeassistant.helpers.entity_registry", fake_er
    )

    monkeypatch.setattr(
        stage, "_current_catalog",
        lambda _hass, _label, _ids: (
            "google_assistant",
            {"light.good": {
                "registry_id": entity.id,
                "eligible": change != "eligibility",
                "label_present": "google_assistant" in entity.labels,
            }},
        ),
    )
    with pytest.raises(stage.MigrationStageError, match="registry_prewrite"):
        stage._write_one_ha_label(
            object(), entity_id="light.good",
            expected_registry_id="native_01",
            label_id="google_assistant",
            configured_label="Google Assistant",
        )
