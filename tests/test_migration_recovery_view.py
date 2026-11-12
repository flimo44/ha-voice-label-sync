"""Read-only recovery triage: test pending intents with real protected files.

The HA registry boundary is explicitly mocked here; the separate Core
2026.11 sandbox tests the real native registry after a process restart.
"""

from __future__ import annotations

import asyncio
import importlib.util
import sys
from pathlib import Path
from types import ModuleType, SimpleNamespace

import pytest

ROOT = (
    Path(__file__).resolve().parents[1]
    / "custom_components" / "ha_voice_label_sync"
)
SOURCE = b"""google_assistant:
  expose_by_default: false
  entity_config: !include google_entities.yaml
# PRIVATE_PROJECT_ID_NEVER_EXPOSE
"""
ENTITIES = b"""light.first:
  expose: true
  name: "PRIVATE ENTITY NAME"
light.second:
  expose: false
"""


@pytest.fixture
def setup(monkeypatch, tmp_path):
    prefix = "_test_hvls_recovery_observation"
    pkg = ModuleType(prefix)
    pkg.__path__ = [str(ROOT)]
    monkeypatch.setitem(sys.modules, prefix, pkg)
    const = ModuleType(f"{prefix}.const")
    const.DOMAIN = "ha_voice_label_sync"
    monkeypatch.setitem(sys.modules, const.__name__, const)
    locks = {}
    lock_mod = ModuleType(f"{prefix}.workflow_lock")
    lock_mod.get_workflow_lock = lambda hass: locks.setdefault(
        id(hass), asyncio.Lock()
    )
    monkeypatch.setitem(sys.modules, lock_mod.__name__, lock_mod)
    loaded = {}
    for stem in (
        "migration_discovery", "migration_baseline", "migration_journal",
        "migration_recovery_view",
    ):
        name = f"{prefix}.{stem}"
        spec = importlib.util.spec_from_file_location(
            name, ROOT / f"{stem}.py"
        )
        assert spec and spec.loader
        module = importlib.util.module_from_spec(spec)
        monkeypatch.setitem(sys.modules, name, module)
        spec.loader.exec_module(module)
        loaded[stem] = module

    (tmp_path / "configuration.yaml").write_bytes(SOURCE)
    (tmp_path / "google_entities.yaml").write_bytes(ENTITIES)

    entries = {
        "light.first": SimpleNamespace(
            id="entity_native_first", labels=frozenset()
        ),
        "light.second": SimpleNamespace(
            id="entity_native_second", labels=frozenset()
        ),
    }
    label_data = {
        "google_assistant": SimpleNamespace(name="Google Assistant")
    }
    registry = SimpleNamespace(async_get=lambda entity: entries.get(entity))
    labels = SimpleNamespace(labels=label_data)
    home = ModuleType("homeassistant")
    helpers = ModuleType("homeassistant.helpers")
    entities_mod = ModuleType("homeassistant.helpers.entity_registry")
    labels_mod = ModuleType("homeassistant.helpers.label_registry")
    entities_mod.async_get = lambda hass: registry
    labels_mod.async_get = lambda hass: labels
    home.helpers = helpers
    helpers.entity_registry = entities_mod
    helpers.label_registry = labels_mod
    for item in (home, helpers, entities_mod, labels_mod):
        monkeypatch.setitem(sys.modules, item.__name__, item)

    hass = SimpleNamespace(
        config=SimpleNamespace(config_dir=str(tmp_path)),
        config_entries=SimpleNamespace(
            async_entries=lambda domain: [object()] if domain == const.DOMAIN else []
        ),
        data={},
    )

    async def async_executor(func, *args):
        return func(*args)

    hass.async_add_executor_job = async_executor
    return SimpleNamespace(
        tmp=tmp_path, hass=hass, modules=loaded,
        entries=entries, labels=label_data,
    )


def _ready(env):
    files = env.modules["migration_discovery"].discover_google_assistant(
        env.tmp
    )
    assert files["source"]["status"] == "resolved"
    env.modules["migration_baseline"].capture_baseline(env.tmp, files)
    journal = env.modules["migration_journal"].initialize_journal(env.tmp)
    return journal


def _intent(env, entity="light.first", *,
            operation="op_first", registry="entity_native_first",
            revision=1):
    journal = env.modules["migration_journal"]
    return journal.record_label_intent(
        env.tmp,
        operation_id=operation,
        entity_id=entity,
        registry_id=registry,
        label_id="google_assistant",
        expected_before=False,
        expected_after=True,
        expected_revision=revision,
    )


def _check(env):
    return asyncio.run(
        env.modules["migration_recovery_view"].async_get_admin_migration_recovery(
            env.hass
        )
    )


def test_missing_journal_read_does_not_create_any_storage(setup):
    before = {p.name: p.read_bytes() for p in setup.tmp.iterdir()}
    observed = _check(setup)
    assert observed["status"] == "not_initialized"
    assert observed["cutover_allowed"] is False
    assert observed["automatic_recovery_allowed"] is False
    assert not (setup.tmp / ".storage").exists()
    assert {p.name: p.read_bytes() for p in setup.tmp.iterdir()} == before


def test_clean_baseline_has_no_pending_but_is_never_authorization(setup):
    _ready(setup)
    observed = _check(setup)
    assert observed["status"] == "observed_no_pending"
    assert observed["journal_revision"] == 0
    assert observed["source_integrity"] == "verified_unchanged"
    assert observed["needs_review"] is False
    assert observed["operations"] == []
    assert observed["stage_allowed"] is False
    assert observed["cutover_allowed"] is False
    assert observed["google_home_state_verified"] is False


@pytest.mark.parametrize("written", [False, True])
def test_unconfirmed_intent_remains_unconfirmed_for_either_ha_state(
    setup, written
):
    _ready(setup)
    journal = setup.modules["migration_journal"]
    journal.advance_phase(setup.tmp, "labels_staging", expected_revision=0)
    _intent(setup)
    if written:
        setup.entries["light.first"].labels = {"google_assistant"}
    before = journal.read_journal(setup.tmp)
    result = _check(setup)
    assert result["status"] == "review_required"
    assert result["summary"]["unconfirmed"] == 1
    assert result["operations"][0]["observed_status"] == "unconfirmed_intent"
    assert result["operations"][0]["membership"] == (
        "present" if written else "absent"
    )
    assert result["operations"][0]["needs_review"] is True
    assert result["automatic_recovery_allowed"] is False
    assert result["cutover_allowed"] is False
    assert journal.read_journal(setup.tmp) == before
    assert (setup.tmp / "configuration.yaml").read_bytes() == SOURCE


def test_applied_verified_is_observation_not_approval(setup):
    _ready(setup)
    journal = setup.modules["migration_journal"]
    journal.advance_phase(setup.tmp, "labels_staging", expected_revision=0)
    _intent(setup)
    journal.mark_label_applied(
        setup.tmp, "op_first",
        registry_id="entity_native_first",
        current_membership=True, expected_revision=2,
    )
    setup.entries["light.first"].labels = {"google_assistant"}
    report = _check(setup)
    assert report["operations"][0]["observed_status"] == "applied_verified"
    assert report["operations"][0]["needs_review"] is False
    assert report["status"] == "review_required"  # phase is still staging
    assert report["cutover_allowed"] is False


def test_multiple_entity_failures_do_not_hide_healthy_observations(setup):
    _ready(setup)
    journal = setup.modules["migration_journal"]
    journal.advance_phase(setup.tmp, "labels_staging", expected_revision=0)
    _intent(setup)
    _intent(
        setup, entity="light.second", operation="op_second",
        registry="entity_native_second", revision=2,
    )
    setup.entries["light.first"].labels = {"google_assistant"}
    del setup.entries["light.second"]
    report = _check(setup)
    assert [x["observed_status"] for x in report["operations"]] == [
        "unconfirmed_intent", "unconfirmed_intent",
    ]
    assert [x["membership"] for x in report["operations"]] == [
        "present", "unknown",
    ]
    assert report["summary"]["unconfirmed"] == 2
    assert report["needs_review"] is True


def test_missing_label_identity_is_local_issue_not_a_global_crash(setup):
    _ready(setup)
    journal = setup.modules["migration_journal"]
    journal.advance_phase(setup.tmp, "labels_staging", expected_revision=0)
    _intent(setup)
    setup.labels.clear()
    report = _check(setup)
    assert report["operations"][0]["observed_status"] == "label_identity_missing"
    assert report["operations"][0]["label_identity_exists"] is False
    assert report["operations"][0]["needs_review"] is True
    assert report["status"] == "review_required"


def test_registry_identity_changed_never_counted_as_verified(setup):
    _ready(setup)
    journal = setup.modules["migration_journal"]
    journal.advance_phase(setup.tmp, "labels_staging", expected_revision=0)
    _intent(setup)
    setup.entries["light.first"].id = "replacement_registry_id"
    result = _check(setup)
    assert result["operations"][0]["observed_status"] == "unconfirmed_intent"
    assert result["operations"][0]["registry_identity_matches"] is False
    assert result["needs_review"] is True


def test_source_drift_blocks_clean_observation_but_never_writes(setup):
    _ready(setup)
    (setup.tmp / "google_entities.yaml").write_bytes(ENTITIES + b"# changed\n")
    current = (setup.tmp / "google_entities.yaml").read_bytes()
    result = _check(setup)
    assert result["status"] == "review_required"
    assert result["source_integrity"] == "changed_or_unavailable"
    assert result["cutover_allowed"] is False
    assert (setup.tmp / "google_entities.yaml").read_bytes() == current


def test_corrupt_journal_returns_sanitized_unavailable(setup):
    _ready(setup)
    target = setup.tmp / ".storage" / "hvls_migration" / "journal.json"
    target.write_text("{sensitive_secret_CORRUPT")
    observed = _check(setup)
    assert observed["status"] == "unavailable"
    assert observed["operations"] == []
    assert "sensitive_secret" not in str(observed)
    assert observed["reason"] == "protected_journal_or_baseline_invalid"
    assert target.read_text() == "{sensitive_secret_CORRUPT"


def test_concurrent_disk_mutation_is_not_reported_as_consistent(setup):
    _ready(setup)
    journal = setup.modules["migration_journal"]
    original = setup.hass.async_add_executor_job
    calls = 0

    async def injected(func, *args):
        nonlocal calls
        calls += 1
        if calls == 2:
            journal.advance_phase(
                setup.tmp, "labels_staging", expected_revision=0
            )
        return await original(func, *args)

    setup.hass.async_add_executor_job = injected
    result = _check(setup)
    assert result["status"] == "snapshot_changed"
    assert result["needs_review"] is True
    assert result["operations"] == []
    assert result["cutover_allowed"] is False


def test_native_registry_unavailable_is_non_authorizing(setup):
    _ready(setup)
    setup.hass.config_entries.async_entries = lambda _: [object()]
    import sys

    original = sys.modules["homeassistant.helpers.entity_registry"].async_get

    def failed(_hass):
        raise RuntimeError("sensitive internal HA path")

    sys.modules["homeassistant.helpers.entity_registry"].async_get = failed
    try:
        result = _check(setup)
    finally:
        sys.modules["homeassistant.helpers.entity_registry"].async_get = original
    assert result["status"] == "unavailable"
    assert result["reason"] == "native_registries_unavailable"
    assert "sensitive" not in str(result)
    assert result["cutover_allowed"] is False


def test_requires_unique_config_entry(setup):
    setup.hass.config_entries.async_entries = lambda _: []
    with pytest.raises(
        setup.modules["migration_recovery_view"].RecoveryViewError,
        match="integration_not_uniquely_configured",
    ):
        _check(setup)


def test_websocket_only_reads_and_requires_admin():
    import ast

    tree = ast.parse((ROOT / "websocket.py").read_text(encoding="utf-8"))
    name = "websocket_get_migration_recovery_status"
    node = next(
        n for n in tree.body
        if isinstance(n, ast.AsyncFunctionDef) and n.name == name
    )
    assert any(
        isinstance(d, ast.Attribute) and d.attr == "require_admin"
        for d in node.decorator_list
    )
    body = ast.unparse(node)
    assert "async_get_admin_migration_recovery" in body
    assert "record_label_intent" not in body
    assert "mark_label_applied" not in body
    assert "stage_one_approved_label" not in body
    assert "update_entity_label" not in body
    assert "restore" not in body
    register = next(
        n for n in tree.body
        if isinstance(n, ast.FunctionDef)
        and n.name == "async_register_websocket_api"
    )
    assert name in ast.unparse(register)
