"""Tests for the shared HVLS workflow lock."""

import asyncio
import importlib.util
import sys
from pathlib import Path
from types import ModuleType, SimpleNamespace

import pytest


@pytest.fixture
def lock_module(monkeypatch):
    prefix = "_test_hvls_lock"
    package = ModuleType(prefix)
    package.__path__ = []
    monkeypatch.setitem(sys.modules, prefix, package)

    core = ModuleType("homeassistant.core")
    core.HomeAssistant = object
    monkeypatch.setitem(sys.modules, "homeassistant.core", core)

    const = ModuleType(f"{prefix}.const")
    const.DOMAIN = "ha_voice_label_sync"
    monkeypatch.setitem(sys.modules, f"{prefix}.const", const)

    path = (
        Path(__file__).resolve().parents[1]
        / "custom_components/ha_voice_label_sync/workflow_lock.py"
    )
    spec = importlib.util.spec_from_file_location(f"{prefix}.workflow_lock", path)
    module = importlib.util.module_from_spec(spec)
    monkeypatch.setitem(sys.modules, spec.name, module)
    spec.loader.exec_module(module)

    return module


def test_same_instance_uses_same_lock(lock_module):
    hass = SimpleNamespace(data={})

    first = lock_module.get_workflow_lock(hass)
    second = lock_module.get_workflow_lock(hass)

    assert first is second
    assert isinstance(first, asyncio.Lock)


def test_different_instances_use_different_locks(lock_module):
    hass1 = SimpleNamespace(data={})
    hass2 = SimpleNamespace(data={})

    assert lock_module.get_workflow_lock(hass1) is not (
        lock_module.get_workflow_lock(hass2)
    )


def test_concurrent_operations_are_serialized(lock_module):
    async def scenario():
        hass = SimpleNamespace(data={})
        lock = lock_module.get_workflow_lock(hass)

        first_started = asyncio.Event()
        release_first = asyncio.Event()
        second_started = asyncio.Event()
        sequence = []

        async def first():
            async with lock:
                sequence.append("first_start")
                first_started.set()
                await release_first.wait()
                sequence.append("first_end")

        async def second():
            async with lock:
                sequence.append("second_start")
                second_started.set()

        first_task = asyncio.create_task(first())
        await first_started.wait()

        second_task = asyncio.create_task(second())

        # Give the second task a chance to attempt acquiring the lock.
        await asyncio.sleep(0)

        assert not second_started.is_set()

        release_first.set()
        await asyncio.gather(first_task, second_task)

        assert sequence == [
            "first_start",
            "first_end",
            "second_start",
        ]

    asyncio.run(scenario())
