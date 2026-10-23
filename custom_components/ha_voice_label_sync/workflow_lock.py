"""Shared lock for HVLS workflow operations."""

from __future__ import annotations

import asyncio

from homeassistant.core import HomeAssistant

from .const import DOMAIN

LOCK_KEY = "_workflow_lock"


def get_workflow_lock(hass: HomeAssistant) -> asyncio.Lock:
    """Return the shared workflow lock for this HA instance.

    Must be called from the Home Assistant event-loop thread.
    """
    data = hass.data.setdefault(DOMAIN, {})

    lock = data.get(LOCK_KEY)
    if lock is None:
        lock = asyncio.Lock()
        data[LOCK_KEY] = lock

    return lock
