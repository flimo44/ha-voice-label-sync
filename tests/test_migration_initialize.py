"""Regression suite for one-use, explicit migration baseline initialization."""

from __future__ import annotations

import ast
import asyncio
import importlib.util
import json
import sys
from pathlib import Path
from types import ModuleType, SimpleNamespace
from unittest.mock import Mock

import pytest

COMPONENT = (
    Path(__file__).resolve().parents[1] / "custom_components" / "ha_voice_label_sync"
)
MAIN = b"""# Preserve original comments and byte layout.
google_assistant:
  project_id: PRIVATE_PROJECT_789
  secure_devices_pin: !secret private_pin
  expose_by_default: false
  entity_config: !include ga_entities.yaml
"""
ENTITIES = b"""light.salon:
  expose: true
  name: "PRIVACY: Maison # 1"
  room: "Cuisine"
  aliases: ["Oui", "Lumiere"]
lock.door:
  expose: false
"""


@pytest.fixture
def setup_modules(monkeypatch):
    prefix = "_test_hvls_init_explicit"
    package = ModuleType(prefix)
    package.__path__ = [str(COMPONENT)]
    monkeypatch.setitem(sys.modules, prefix, package)
    const = ModuleType(f"{prefix}.const")
    const.DOMAIN = "ha_voice_label_sync"
    monkeypatch.setitem(sys.modules, const.__name__, const)
    workflow = ModuleType(f"{prefix}.workflow_lock")
    def get_lock(hass):
        return hass.data.setdefault("_test", {}).setdefault(
            "workflow_lock", asyncio.Lock()
        )
    workflow.get_workflow_lock = get_lock
    monkeypatch.setitem(sys.modules, workflow.__name__, workflow)

    loaded = {}
    for stem in (
        "migration_discovery", "migration_baseline", "migration_journal",
        "migration_initialize",
    ):
        fullname = f"{prefix}.{stem}"
        spec = importlib.util.spec_from_file_location(
            fullname, COMPONENT / f"{stem}.py"
        )
        assert spec is not None and spec.loader is not None
        module = importlib.util.module_from_spec(spec)
        monkeypatch.setitem(sys.modules, fullname, module)
        spec.loader.exec_module(module)
        loaded[stem] = module
    return loaded


def _config(tmp_path, *, main=MAIN, entities=ENTITIES):
    (tmp_path / "configuration.yaml").write_bytes(main)
    (tmp_path / "ga_entities.yaml").write_bytes(entities)


def _hass(tmp_path):
    async def executor_job(func, *args):
        return func(*args)

    return SimpleNamespace(
        data={},
        config=SimpleNamespace(config_dir=str(tmp_path)),
        config_entries=SimpleNamespace(
            async_entries=Mock(return_value=[SimpleNamespace(entry_id="one")])
        ),
        async_add_executor_job=executor_job,
    )


async def _prepare(module, hass, admin="admin-a"):
    return await module.prepare_admin_baseline(hass, user_id=admin)


async def _initialize(module, hass, token, *, admin="admin-a", accepted=True):
    return await module.initialize_admin_baseline(
        hass, user_id=admin, confirmation_token=token, confirmed=accepted
    )


def test_prepare_does_not_touch_any_disk_file(tmp_path, setup_modules):
    _config(tmp_path)
    module = setup_modules["migration_initialize"]
    hass = _hass(tmp_path)
    before = {
        p.name: p.read_bytes() for p in tmp_path.iterdir() if p.is_file()
    }
    prepared = asyncio.run(_prepare(module, hass))
    assert prepared["status"] == "awaiting_explicit_confirmation"
    assert prepared["source_files"] == 2
    assert prepared["explicit_entities"] == 2
    assert prepared["baseline_status"] == "not_verified"
    assert prepared["cutover_allowed"] is False
    assert prepared["apply_allowed"] is False
    assert prepared["labels_changed"] is False
    assert not (tmp_path / ".storage").exists()
    assert before == {
        p.name: p.read_bytes() for p in tmp_path.iterdir() if p.is_file()
    }
    private = json.dumps(prepared)
    for secret in ("PRIVATE_PROJECT_789", "PRIVACY:", "Lumiere"):
        assert secret not in private


def test_explicit_confirmation_creates_exact_protected_copy_and_journal(
    tmp_path, setup_modules
):
    _config(tmp_path)
    module = setup_modules["migration_initialize"]
    hass = _hass(tmp_path)

    async def run():
        challenge = await _prepare(module, hass)
        assert not (tmp_path / ".storage").exists()
        created = await _initialize(
            module, hass, challenge["confirmation_token"]
        )
        with pytest.raises(
            module.MigrationInitializationError,
            match="confirmation_expired_or_invalid"
        ):
            await _initialize(
                module, hass, challenge["confirmation_token"]
            )
        return created

    created = asyncio.run(run())
    assert created["status"] == "baseline_and_journal_verified"
    assert created["baseline_verified"] is True
    assert created["journal_phase"] == "baseline_ready"
    assert created["journal_revision"] == 0
    assert created["cutover_allowed"] is False
    baseline = tmp_path / ".storage" / "hvls_migration" / "baseline"
    assert (baseline / "files" / "configuration.yaml").read_bytes() == MAIN
    assert (baseline / "files" / "ga_entities.yaml").read_bytes() == ENTITIES
    assert (tmp_path / "configuration.yaml").read_bytes() == MAIN
    assert (tmp_path / "ga_entities.yaml").read_bytes() == ENTITIES
    assert (
        setup_modules["migration_journal"].read_journal(tmp_path)["operations"]
        == []
    )
    assert not (tmp_path / ".storage" / "hvls_migration" / ".mutation.lock").exists()
    assert "PRIVACY:" not in json.dumps(created)


def test_repeated_explicit_preflight_is_idempotent_no_journal_reset(
    tmp_path, setup_modules
):
    _config(tmp_path)
    module = setup_modules["migration_initialize"]
    hass = _hass(tmp_path)
    journal = setup_modules["migration_journal"]

    async def run():
        first = await _prepare(module, hass)
        initial = await _initialize(module, hass, first["confirmation_token"])
        assert initial["journal_revision"] == 0
        journal.advance_phase(
            tmp_path, "labels_staging", expected_revision=0
        )
        again = await _prepare(module, hass)
        assert again["baseline_status"] == "verified"
        assert again["journal_phase"] == "labels_staging"
        return await _initialize(module, hass, again["confirmation_token"])

    result = asyncio.run(run())
    assert result["journal_phase"] == "labels_staging"
    assert result["journal_revision"] == 1
    assert result["needs_manual_review"] is True


def test_stale_token_rejected_without_backup(tmp_path, setup_modules):
    _config(tmp_path)
    module = setup_modules["migration_initialize"]
    hass = _hass(tmp_path)
    now = [1000.0]
    module.time.monotonic = lambda: now[0]

    async def run():
        prepared = await _prepare(module, hass)
        now[0] += 301
        with pytest.raises(
            module.MigrationInitializationError,
            match="confirmation_expired_or_invalid",
        ):
            await _initialize(module, hass, prepared["confirmation_token"])

    asyncio.run(run())
    assert not (tmp_path / ".storage").exists()


def test_token_bound_to_administrator_and_new_prepare_invalidates_old(
    tmp_path, setup_modules
):
    _config(tmp_path)
    module = setup_modules["migration_initialize"]
    hass = _hass(tmp_path)

    async def run():
        first = await _prepare(module, hass, admin="admin-a")
        with pytest.raises(module.MigrationInitializationError):
            await _initialize(
                module, hass, first["confirmation_token"], admin="admin-b"
            )
        second = await _prepare(module, hass, admin="admin-a")
        with pytest.raises(module.MigrationInitializationError):
            await _initialize(
                module, hass, first["confirmation_token"], admin="admin-a"
            )
        result = await _initialize(
            module, hass, second["confirmation_token"], admin="admin-a"
        )
        return result

    assert asyncio.run(run())["baseline_verified"] is True


def test_missing_confirmation_does_not_consume_token_or_write(
    tmp_path, setup_modules
):
    _config(tmp_path)
    module = setup_modules["migration_initialize"]
    hass = _hass(tmp_path)

    async def run():
        prepared = await _prepare(module, hass)
        with pytest.raises(
            module.MigrationInitializationError,
            match="explicit_confirmation_required",
        ):
            await _initialize(
                module, hass, prepared["confirmation_token"], accepted=False
            )
        assert not (tmp_path / ".storage").exists()
        return await _initialize(module, hass, prepared["confirmation_token"])

    assert asyncio.run(run())["baseline_verified"] is True


def test_source_change_after_review_blocks_capture_and_consumes_token(
    tmp_path, setup_modules
):
    _config(tmp_path)
    module = setup_modules["migration_initialize"]
    hass = _hass(tmp_path)

    async def run():
        reviewed = await _prepare(module, hass)
        (tmp_path / "ga_entities.yaml").write_bytes(
            ENTITIES + b"light.injected:\n  expose: true\n"
        )
        with pytest.raises(
            module.MigrationInitializationError,
            match="source_changed_since_confirmation",
        ):
            await _initialize(module, hass, reviewed["confirmation_token"])
        with pytest.raises(module.MigrationInitializationError):
            await _initialize(module, hass, reviewed["confirmation_token"])

    asyncio.run(run())
    assert not (tmp_path / ".storage").exists()


@pytest.mark.parametrize("invalid", [
    b"google_assistant:\n  expose_by_default: true\n"
    b"  expose_by_default: false\n",
    b"google_assistant: [broken yaml\n",
    b"homeassistant:\n  packages: !include_dir_named packages\n"
    b"google_assistant: {}\n",
])
def test_global_discovery_issue_blocks_preparation(
    tmp_path, setup_modules, invalid
):
    _config(tmp_path, main=invalid)
    module = setup_modules["migration_initialize"]
    hass = _hass(tmp_path)
    with pytest.raises(
        module.MigrationInitializationError,
        match="manual_source_not_resolved",
    ):
        asyncio.run(_prepare(module, hass))
    assert not (tmp_path / ".storage").exists()


def test_local_invalid_metadata_does_not_block_original_backup(
    tmp_path, setup_modules
):
    entries = ENTITIES + b"light.local_bad:\n  room: [invalid, list]\n"
    _config(tmp_path, entities=entries)
    module = setup_modules["migration_initialize"]
    hass = _hass(tmp_path)

    async def run():
        prepared = await _prepare(module, hass)
        assert prepared["explicit_entities"] == 3
        return await _initialize(module, hass, prepared["confirmation_token"])

    result = asyncio.run(run())
    assert result["baseline_verified"] is True
    copy = (
        tmp_path / ".storage" / "hvls_migration" / "baseline"
        / "files" / "ga_entities.yaml"
    )
    assert copy.read_bytes() == entries


def test_existing_corrupt_baseline_is_never_overwritten(
    tmp_path, setup_modules
):
    _config(tmp_path)
    module = setup_modules["migration_initialize"]
    hass = _hass(tmp_path)

    async def first():
        p = await _prepare(module, hass)
        return await _initialize(module, hass, p["confirmation_token"])
    asyncio.run(first())

    protected = (
        tmp_path / ".storage" / "hvls_migration" / "baseline"
        / "files" / "ga_entities.yaml"
    )
    protected.write_bytes(b"corrupted")
    original = protected.read_bytes()

    async def second():
        p = await _prepare(module, hass)
        assert p["baseline_status"] == "not_verified"
        with pytest.raises(setup_modules["migration_baseline"].BaselineError):
            await _initialize(module, hass, p["confirmation_token"])
    asyncio.run(second())
    assert protected.read_bytes() == original


def test_journal_failure_keeps_verifiable_baseline_for_recovery(
    tmp_path, setup_modules, monkeypatch
):
    _config(tmp_path)
    module = setup_modules["migration_initialize"]
    hass = _hass(tmp_path)
    actual = module.initialize_journal

    def broken(_config):
        raise setup_modules["migration_journal"].JournalError(
            "simulated_journal_unavailable"
        )
    monkeypatch.setattr(module, "initialize_journal", broken)

    async def first():
        p = await _prepare(module, hass)
        return await _initialize(module, hass, p["confirmation_token"])
    result = asyncio.run(first())
    assert result["status"] == "baseline_verified_journal_unavailable"
    assert result["needs_manual_review"] is True
    assert result["cutover_allowed"] is False
    assert setup_modules["migration_baseline"].verify_baseline(tmp_path)[
        "verified"
    ] is True
    assert not (
        tmp_path / ".storage" / "hvls_migration" / "journal.json"
    ).exists()

    monkeypatch.setattr(module, "initialize_journal", actual)

    async def retry():
        p = await _prepare(module, hass)
        return await _initialize(module, hass, p["confirmation_token"])

    assert asyncio.run(retry())["status"] == (
        "baseline_and_journal_verified"
    )


def test_missing_user_or_duplicate_entries_fail_before_filesystem(
    tmp_path, setup_modules
):
    _config(tmp_path)
    module = setup_modules["migration_initialize"]
    hass = _hass(tmp_path)
    with pytest.raises(module.MigrationInitializationError):
        asyncio.run(_prepare(module, hass, admin=""))
    hass.config_entries.async_entries.return_value = [object(), object()]
    with pytest.raises(
        module.MigrationInitializationError,
        match="integration_not_uniquely_configured",
    ):
        asyncio.run(_prepare(module, hass))
    assert not (tmp_path / ".storage").exists()


def test_websocket_prepare_commit_admin_only_and_registered():
    source = (COMPONENT / "websocket.py").read_text(encoding="utf-8")
    tree = ast.parse(source)
    for name in (
        "websocket_prepare_migration_baseline",
        "websocket_initialize_migration_baseline",
    ):
        handler = next(
            node for node in tree.body
            if isinstance(node, ast.AsyncFunctionDef) and node.name == name
        )
        assert any(
            isinstance(decorator, ast.Attribute)
            and decorator.attr == "require_admin"
            for decorator in handler.decorator_list
        )
        contents = ast.get_source_segment(source, handler)
        assert "connection.user.id" in contents
        assert "capture_baseline" not in contents
        assert "stage_one_approved_label" not in contents
        assert "apply_reviewed_preview" not in contents
    registration = next(
        node for node in tree.body
        if isinstance(node, ast.FunctionDef)
        and node.name == "async_register_websocket_api"
    )
    for name in (
        "websocket_prepare_migration_baseline",
        "websocket_initialize_migration_baseline",
    ):
        assert name in ast.unparse(registration)
