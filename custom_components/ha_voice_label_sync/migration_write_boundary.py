"""Read-only native HA entity-label CAS at a hypothetical write boundary.

This is a *rehearsal*, not a migration executor or authorization. The
capture and subsequent assessment are separate synchronous event-loop calls.
No service, WebSocket, journal ACK, file mutation or HA registry update is
performed. A match never grants an execution permission.
"""

from __future__ import annotations

import hashlib
import json
import re
from collections.abc import Mapping
from typing import Any

from .label_update import LabelUpdateError, resolve_unique_label_id

_ENTITY = re.compile(r"^[a-z0-9_]+\.[a-z0-9_]+$")
_LABEL = re.compile(r"^[a-z0-9][a-z0-9_-]{0,127}$")
_REGISTRY_ID = re.compile(r"^[a-zA-Z0-9_.:-]{1,128}$")
_SHA = re.compile(r"^[0-9a-f]{64}$")
_MAX_LABELS = 256


def _base(status: str, reason: str) -> dict[str, Any]:
    return {
        "schema_version": 1,
        "status": status,
        "reason": reason,
        "native_identity_and_all_labels_consistent": status == "matched",
        "observation_atomic_across_processes": False,
        "read_only": True,
        "execution_authorized": False,
        "journal_ack_allowed": False,
        "retry_allowed": False,
        "rollback_allowed": False,
        "stage_allowed": False,
        "apply_allowed": False,
        "cutover_allowed": False,
        "google_home_state_verified": False,
        "external_consumers_verified": False,
    }


def _digest(snapshot: dict[str, Any]) -> str:
    return hashlib.sha256(
        json.dumps(snapshot, sort_keys=True, separators=(",", ":"),
                   ensure_ascii=False, allow_nan=False).encode("utf-8")
    ).hexdigest()


def _valid_labelset(value: Any) -> bool:
    return (
        isinstance(value, list)
        and len(value) <= _MAX_LABELS
        and all(isinstance(x, str) and _LABEL.fullmatch(x) for x in value)
        and value == sorted(set(value))
    )


def _native(hass: Any, *, entity_id: str, configured_label: str) -> tuple:
    """Read all live HA facts synchronously; never await or touch storage."""
    from homeassistant.helpers import entity_registry as er
    from homeassistant.helpers import label_registry as lr

    labels = lr.async_get(hass).labels
    observed = [
        {"label_id": x.label_id, "name": x.name}
        for x in labels.values()
    ]
    label_id = resolve_unique_label_id(observed, configured_label)
    registry = er.async_get(hass)
    entry = registry.async_get(entity_id)
    return label_id, entry, labels


def capture_native_boundary(
    hass: Any, *, entity_id: str, configured_label: str,
    desired_present: bool,
) -> dict[str, Any]:
    """Capture full exact native-label state BEFORE a hypothetical operation.

    The returned SHA protects accidental changes to a stored snapshot, not
    malicious re-signing. It is explicitly not an authorization token.
    """
    invalid = _base("refused", "invalid_boundary_request")
    if (
        not isinstance(entity_id, str) or len(entity_id) > 255
        or not _ENTITY.fullmatch(entity_id)
        or not isinstance(configured_label, str)
        or not 0 < len(configured_label) <= 128
        or type(desired_present) is not bool
    ):
        return invalid
    try:
        label_id, entry, known_labels = _native(
            hass, entity_id=entity_id, configured_label=configured_label
        )
    except (ImportError, AttributeError, KeyError, TypeError, ValueError,
            RuntimeError, LabelUpdateError):
        return _base("refused", "native_label_resolution_unavailable")
    if entry is None:
        return _base("refused", "entity_missing")
    before = sorted(set(entry.labels))
    if (
        not isinstance(entry.id, str)
        or not _REGISTRY_ID.fullmatch(entry.id)
        or not isinstance(label_id, str) or not _LABEL.fullmatch(label_id)
        or not _valid_labelset(before)
    ):
        return _base("refused", "invalid_native_snapshot")
    if any(label not in known_labels for label in before):
        return _base("refused", "native_label_identity_missing")
    if getattr(entry, "disabled_by", None) is not None:
        return _base("refused", "native_entity_disabled")
    if getattr(entry, "hidden_by", None) is not None:
        return _base("refused", "native_entity_hidden")
    before_present = label_id in before
    if before_present == desired_present:
        return _base("refused", "no_label_delta_to_simulate")
    state = {
        "entity_id": entity_id,
        "configured_label": configured_label,
        "registry_id": entry.id,
        "label_id": label_id,
        "before_labels": before,
        "before_label_present": before_present,
        "desired_label_present": desired_present,
    }
    return {
        **_base("captured", "hypothetical_boundary_only"),
        "snapshot": state,
        "snapshot_sha256": _digest(state),
    }


def assess_native_boundary(
    hass: Any, *, capture: Mapping[str, Any],
) -> dict[str, Any]:
    """CAS simulation: compare ALL labels + identities at one HA loop point.

    No await occurs between native observations and verdict. There is no
    write after the check. Never treat a positive verdict as permission to
    invoke a future write-capable method.
    """
    if (
        not isinstance(capture, Mapping)
        or capture.get("status") != "captured"
        or capture.get("read_only") is not True
        or capture.get("execution_authorized") is not False
        or capture.get("stage_allowed") is not False
        or capture.get("cutover_allowed") is not False
        or not isinstance(capture.get("snapshot"), dict)
        or not isinstance(capture.get("snapshot_sha256"), str)
        or not _SHA.fullmatch(capture["snapshot_sha256"])
    ):
        return _base("refused", "invalid_boundary_snapshot")
    snapshot = capture["snapshot"]
    if set(snapshot) != {
        "entity_id", "configured_label", "registry_id", "label_id",
        "before_labels", "before_label_present", "desired_label_present",
    }:
        return _base("refused", "invalid_boundary_snapshot")
    try:
        if (
            not isinstance(snapshot["entity_id"], str)
            or len(snapshot["entity_id"]) > 255
            or not _ENTITY.fullmatch(snapshot["entity_id"])
            or not isinstance(snapshot["configured_label"], str)
            or not 0 < len(snapshot["configured_label"]) <= 128
            or not isinstance(snapshot["registry_id"], str)
            or not _REGISTRY_ID.fullmatch(snapshot["registry_id"])
            or not isinstance(snapshot["label_id"], str)
            or not _LABEL.fullmatch(snapshot["label_id"])
            or not _valid_labelset(snapshot["before_labels"])
            or type(snapshot["before_label_present"]) is not bool
            or type(snapshot["desired_label_present"]) is not bool
            or (snapshot["label_id"] in snapshot["before_labels"])
            != snapshot["before_label_present"]
            or snapshot["desired_label_present"]
            == snapshot["before_label_present"]
            or _digest(snapshot) != capture["snapshot_sha256"]
        ):
            return _base("refused", "invalid_boundary_snapshot")
    except (TypeError, ValueError, UnicodeError):
        return _base("refused", "invalid_boundary_snapshot")
    try:
        actual_label, entry, known_labels = _native(
            hass,
            entity_id=snapshot["entity_id"],
            configured_label=snapshot["configured_label"],
        )
    except (ImportError, AttributeError, KeyError, TypeError, ValueError,
            RuntimeError, LabelUpdateError):
        return _base("refused", "native_label_resolution_unavailable")
    if actual_label != snapshot["label_id"] or actual_label not in known_labels:
        return _base("refused", "label_identity_changed")
    if entry is None:
        return _base("refused", "entity_missing")
    if entry.id != snapshot["registry_id"]:
        return _base("refused", "registry_identity_changed")
    if getattr(entry, "disabled_by", None) is not None:
        return _base("refused", "native_entity_disabled")
    if getattr(entry, "hidden_by", None) is not None:
        return _base("refused", "native_entity_hidden")
    now = set(entry.labels)
    if now != set(snapshot["before_labels"]):
        return _base("refused", "native_full_label_set_changed")
    if any(label not in known_labels for label in now):
        return _base("refused", "native_label_identity_missing")
    proposed = (
        now | {snapshot["label_id"]}
        if snapshot["desired_label_present"]
        else now - {snapshot["label_id"]}
    )
    if len(now ^ proposed) != 1:
        return _base("refused", "unexpected_target_delta")
    return {
        **_base("matched", "read_only_cas_simulation"),
        "entity_id": snapshot["entity_id"],
        "snapshot_sha256": capture["snapshot_sha256"],
        "proposed_delta": (
            "add_one_label"
            if snapshot["desired_label_present"] else "remove_one_label"
        ),
        "unrelated_labels_preserved_in_projection": True,
    }
