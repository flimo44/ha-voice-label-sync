"""Two-step, administrator-confirmed initialization of a protected baseline.

Only the explicit commit function can create private migration files. Neither
entrypoint changes HA labels, production YAML, loaded Google Assistant or
the V1 workflow. Prepare returns a short-lived one-use challenge tied to the
HA administrator and exact discovered YAML source bytes.
"""

from __future__ import annotations

import hashlib
import json
import secrets
import time
from collections.abc import Mapping
from functools import partial
from typing import Any

from .const import DOMAIN
from .migration_baseline import BaselineError, capture_baseline, verify_baseline
from .migration_discovery import discover_google_assistant
from .migration_journal import JournalError, initialize_journal, read_journal
from .workflow_lock import get_workflow_lock

_PENDING_KEY = "_migration_baseline_pending"
_CHALLENGE_TTL = 300
_SHA = 64


class MigrationInitializationError(ValueError):
    """Sanitized code; never include private HA YAML or credential data."""


def _valid_user_id(user_id: Any) -> bool:
    return isinstance(user_id, str) and 0 < len(user_id) <= 128


def _valid_discovery(discovery: Any) -> dict[str, Any]:
    if not isinstance(discovery, dict):
        raise MigrationInitializationError("manual_source_not_resolved")
    if (
        discovery.get("mode") != "assisted_migration"
        or discovery.get("source", {}).get("status") != "resolved"
        or discovery.get("global_blockers")
    ):
        raise MigrationInitializationError("manual_source_not_resolved")
    locations = discovery["source"].get("locations")
    if (
        not isinstance(locations, list)
        or not 1 <= len(locations) <= 8
        or any(
            not isinstance(location, dict)
            or not isinstance(location.get("path"), str)
            or not isinstance(location.get("digest_sha256"), str)
            or len(location["digest_sha256"]) != _SHA
            for location in locations
        )
    ):
        raise MigrationInitializationError("manual_source_inventory_invalid")
    return discovery


def _discovery_identity(discovery: Mapping[str, Any]) -> str:
    """Bind review to the exact on-disk source inventory and exposure rules."""
    payload = {
        "locations": discovery["source"]["locations"],
        "rules": discovery["rules"],
        "entity_ids": [
            row["entity_id"] for row in discovery["entities"]
        ],
    }
    encoded = json.dumps(
        payload, sort_keys=True, ensure_ascii=False, separators=(",", ":")
    ).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def _prepare_disk(config_dir: str) -> dict[str, Any]:
    discovery = _valid_discovery(discover_google_assistant(config_dir))
    identity = _discovery_identity(discovery)
    baseline_status = "not_verified"
    journal_phase = None
    try:
        verify_baseline(config_dir)
    except (BaselineError, OSError, ValueError):
        # Never infer that a corrupted baseline is absent/re-creatable.
        # capture_baseline() refuses to overwrite an existing baseline.
        pass
    else:
        baseline_status = "verified"
        try:
            journal_phase = read_journal(config_dir)["phase"]
        except (JournalError, BaselineError, OSError, ValueError):
            journal_phase = "unavailable_or_not_initialized"
    return {
        "discovery": discovery,
        "source_identity_sha256": identity,
        "source_files": len(discovery["source"]["locations"]),
        "explicit_entities": len(discovery["entities"]),
        "baseline_status": baseline_status,
        "journal_phase": journal_phase,
        "implicit_exposure_warning": (
            discovery.get("rules", {}).get(
                "implicit_exposure_may_change_with_new_entities"
            ) is True
        ),
    }


def _initialize_disk(config_dir: str, expected_identity: str) -> dict[str, Any]:
    """Re-discover AFTER confirmation; existing sources and baseline are CAS."""
    discovery = _valid_discovery(discover_google_assistant(config_dir))
    if _discovery_identity(discovery) != expected_identity:
        raise MigrationInitializationError("source_changed_since_confirmation")

    # No mutation of user YAML. Existing baselines are returned only when
    # their verified raw contents exactly match the fresh source hashes.
    baseline = capture_baseline(config_dir, discovery)
    if not baseline.get("verified"):
        raise MigrationInitializationError("baseline_not_verified")

    # A failure here must never erase the successful protected backup.
    # Reopening the page may resume journal setup after manual inspection.
    try:
        journal = initialize_journal(config_dir)
    except (JournalError, BaselineError, OSError, ValueError):
        return {
            "status": "baseline_verified_journal_unavailable",
            "baseline_verified": True,
            "baseline_manifest_sha256": baseline["manifest_sha256"],
            "journal_phase": None,
            "journal_revision": None,
            "needs_manual_review": True,
            "read_only_google_configuration": True,
            "labels_changed": False,
            "production_yaml_changed": False,
            "cutover_allowed": False,
        }
    return {
        "status": "baseline_and_journal_verified",
        "baseline_verified": True,
        "baseline_manifest_sha256": baseline["manifest_sha256"],
        "journal_phase": journal["phase"],
        "journal_revision": journal["revision"],
        "needs_manual_review": journal["phase"] != "baseline_ready",
        "read_only_google_configuration": True,
        "labels_changed": False,
        "production_yaml_changed": False,
        "cutover_allowed": False,
    }


async def prepare_admin_baseline(
    hass: Any, *, user_id: str
) -> dict[str, Any]:
    """Return an expiring challenge. Never create baseline or journal here."""
    if not _valid_user_id(user_id):
        raise MigrationInitializationError("administrator_identity_unavailable")
    if len(hass.config_entries.async_entries(DOMAIN)) != 1:
        raise MigrationInitializationError("integration_not_uniquely_configured")

    async with get_workflow_lock(hass):
        result = await hass.async_add_executor_job(
            _prepare_disk, hass.config.config_dir
        )
        challenge = secrets.token_urlsafe(32)
        owner = hass.data.setdefault(DOMAIN, {}).setdefault(_PENDING_KEY, {})
        # One pending challenge per admin, superseded on every new Prepare.
        # This is volatile HA memory, never persistent browser storage.
        owner[user_id] = {
            "challenge": challenge,
            "identity": result["source_identity_sha256"],
            "expires": time.monotonic() + _CHALLENGE_TTL,
        }
        return {
            "schema_version": 1,
            "status": "awaiting_explicit_confirmation",
            "confirmation_token": challenge,
            "expires_in_seconds": _CHALLENGE_TTL,
            "source_identity_sha256": result["source_identity_sha256"],
            "source_files": result["source_files"],
            "explicit_entities": result["explicit_entities"],
            "implicit_exposure_warning": result["implicit_exposure_warning"],
            "baseline_status": result["baseline_status"],
            "journal_phase": result["journal_phase"],
            "apply_allowed": False,
            "cutover_allowed": False,
            "labels_changed": False,
            "production_yaml_changed": False,
        }


async def initialize_admin_baseline(
    hass: Any, *, user_id: str, confirmation_token: str,
    confirmed: bool,
) -> dict[str, Any]:
    """Consume one-use challenge, then capture baseline and create journal."""
    if not _valid_user_id(user_id):
        raise MigrationInitializationError("administrator_identity_unavailable")
    if (
        confirmed is not True
        or not isinstance(confirmation_token, str)
        or len(confirmation_token) > 256
    ):
        raise MigrationInitializationError("explicit_confirmation_required")

    async with get_workflow_lock(hass):
        pending = hass.data.setdefault(DOMAIN, {}).get(_PENDING_KEY, {})
        proof = pending.pop(user_id, None)
        if (
            not isinstance(proof, dict)
            or not secrets.compare_digest(
                confirmation_token, proof.get("challenge", "")
            )
            or time.monotonic() >= proof.get("expires", 0)
        ):
            raise MigrationInitializationError("confirmation_expired_or_invalid")
        if len(hass.config_entries.async_entries(DOMAIN)) != 1:
            raise MigrationInitializationError("integration_not_uniquely_configured")

        # The confirmation is consumed *before* the filesystem is examined:
        # even a failing attempt cannot be replayed or accidentally retried.
        return await hass.async_add_executor_job(
            partial(
                _initialize_disk,
                hass.config.config_dir,
                proof["identity"],
            )
        )
