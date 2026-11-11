"""Conservative reviewed migration decisions and label staging *preflight*.

Pure planner: no filesystem, HA registry, Google configuration, or journal I/O.
The output describes possible label operations, NOT permission to execute.
An independent future writer must validate approval, source hashes, baseline,
loaded Google policy, HA registry identity, membership and journal state.
"""

from __future__ import annotations

import hashlib
import json
import re
from collections.abc import Mapping
from typing import Any

MAX_ENTITIES = 20_000
_ENTITY_ID = re.compile(r"^[a-z0-9_]+\.[a-z0-9_]+$")
_TOKEN = re.compile(r"^[a-zA-Z0-9_.:-]{1,128}$")
_SHA = re.compile(r"^[0-9a-f]{64}$")
_ACTIONS = frozenset({"import", "keep", "disable", "remove"})
_METADATA = frozenset({"retain_manual_yaml", "discard_after_review"})
_SENSITIVE_DOMAINS = frozenset({"lock", "alarm_control_panel", "cover"})
_LOCAL_EXPOSURES = frozenset({"exposed", "not_exposed", "unknown"})
_COMPARISON_STATES = frozenset({
    "match_compared_fields", "partial_unknown", "drift_detected"
})


class StagePlanError(ValueError):
    """Safe diagnostic error code; never includes custom settings or credentials."""


def _valid_entity_id(value: Any) -> bool:
    return isinstance(value, str) and bool(_ENTITY_ID.fullmatch(value))


def _valid_token(value: Any) -> bool:
    return isinstance(value, str) and bool(_TOKEN.fullmatch(value))


def _safe_codes(raw: Any) -> list[str]:
    if not isinstance(raw, (list, tuple)):
        return ["invalid_reasons"]
    return [
        code if isinstance(code, str) and re.fullmatch(r"[a-z0-9_]{1,80}", code)
        else "unknown_reason"
        for code in raw
    ]


def _source_token(diagnostic: Mapping[str, Any]) -> str | None:
    locations = diagnostic.get("source", {}).get("locations")
    if not isinstance(locations, list) or not locations:
        return None
    source: list[tuple[str, str]] = []
    for loc in locations:
        if not isinstance(loc, Mapping):
            return None
        path = loc.get("path")
        digest = loc.get("digest_sha256")
        if (
            not isinstance(path, str)
            or not path
            or path.startswith("/")
            or ".." in path.split("/")
            or not isinstance(digest, str)
            or not _SHA.fullmatch(digest)
        ):
            return None
        source.append((path, digest))
    if len({p for p, _ in source}) != len(source):
        return None
    return hashlib.sha256(
        json.dumps(sorted(source), separators=(",", ":")).encode()
    ).hexdigest()


def _validate_inputs(
    diagnostic: Mapping[str, Any],
    decisions: Mapping[str, Any],
    registry_facts: Mapping[str, Any],
    label_id: str,
) -> tuple[list[Mapping[str, Any]], dict[str, Any]]:
    if not isinstance(diagnostic, Mapping) or diagnostic.get("schema_version") != 1:
        raise StagePlanError("diagnostic_schema_unsupported")
    if diagnostic.get("read_only") is not True:
        raise StagePlanError("diagnostic_not_read_only")
    if not isinstance(decisions, Mapping) or not isinstance(registry_facts, Mapping):
        raise StagePlanError("invalid_decision_or_registry_map")
    if not _valid_token(label_id):
        raise StagePlanError("invalid_label_id")
    rows = diagnostic.get("entities")
    if not isinstance(rows, list) or len(rows) > MAX_ENTITIES:
        raise StagePlanError("invalid_diagnostic_entities")
    if len(decisions) > MAX_ENTITIES or len(registry_facts) > MAX_ENTITIES:
        raise StagePlanError("too_many_decisions")
    entries: dict[str, Any] = {}
    for row in rows:
        if not isinstance(row, Mapping) or not _valid_entity_id(row.get("entity_id")):
            raise StagePlanError("invalid_diagnostic_entity")
        entity_id = row["entity_id"]
        if entity_id in entries:
            raise StagePlanError("duplicate_diagnostic_entity")
        if row.get("disk_ha_sync_projection") not in _LOCAL_EXPOSURES:
            raise StagePlanError("invalid_projection_value")
        entries[entity_id] = row
    if any(not _valid_entity_id(entity_id) for entity_id in decisions):
        raise StagePlanError("invalid_decision_entity_id")
    if set(decisions) - entries.keys():
        raise StagePlanError("decision_for_unknown_entity")
    if any(not _valid_entity_id(entity_id) for entity_id in registry_facts):
        raise StagePlanError("invalid_registry_entity_id")
    return rows, entries


def _global_reasons(diagnostic: Mapping[str, Any]) -> list[str]:
    reasons: list[str] = []
    source = diagnostic.get("source", {})
    runtime = diagnostic.get("runtime_snapshot", {})
    loaded = diagnostic.get("loaded_policy", {})
    projection = diagnostic.get("disk_projection", {})
    if diagnostic.get("mode") != "assisted_migration":
        reasons.append("manual_migration_source_required")
    if not isinstance(source, Mapping) or source.get("status") != "resolved":
        reasons.append("source_not_resolved")
    if diagnostic.get("global_blockers"):
        reasons.append("source_global_blockers")
    if not isinstance(runtime, Mapping) or runtime.get("status") not in (
        "complete", "partial"
    ):
        reasons.append("ha_runtime_unavailable")
    if (
        not isinstance(projection, Mapping)
        or projection.get("status") != "read_only_projection"
        or projection.get("basis") != "disk_yaml_only"
        or projection.get("active_runtime_policy_certified") is not False
    ):
        reasons.append("projection_not_trustworthy")
    if (
        not isinstance(loaded, Mapping)
        or not isinstance(loaded.get("status"), str)
        or loaded["status"] not in _COMPARISON_STATES
    ):
        reasons.append("loaded_policy_unavailable")
    elif loaded.get("rule_changes"):
        reasons.append("global_exposure_rules_differ")
    if _source_token(diagnostic) is None:
        reasons.append("source_hashes_missing")
    # A full loaded-policy match is never Google Home parity or fresh proof.
    return list(dict.fromkeys(reasons))


def _decision_data(value: Any) -> tuple[str | None, str | None, bool, bool]:
    """Local bad decisions do not hide valid unrelated rows."""
    if value is None:
        return None, None, False, False
    if not isinstance(value, Mapping):
        return "invalid", None, False, False
    if set(value) - {
        "action", "metadata_policy", "acknowledge_change",
        "acknowledge_sensitive_exposure"
    }:
        return "invalid", None, False, False
    action = value.get("action")
    metadata = value.get("metadata_policy")
    ack = value.get("acknowledge_change", False)
    sensitive = value.get("acknowledge_sensitive_exposure", False)
    if (
        not isinstance(action, str)
        or action not in _ACTIONS
        or (metadata is not None and (
            not isinstance(metadata, str) or metadata not in _METADATA
        ))
        or type(ack) is not bool
        or type(sensitive) is not bool
    ):
        return "invalid", None, False, False
    return action, metadata, ack, sensitive


def _registry_info(value: Any) -> tuple[str | None, bool | None, bool | None]:
    if not isinstance(value, Mapping):
        return None, None, None
    identity = value.get("registry_id")
    present = value.get("label_present")
    eligible = value.get("eligible")
    return (
        identity if _valid_token(identity) else None,
        present if type(present) is bool else None,
        eligible if type(eligible) is bool else None,
    )


def build_reviewed_stage_plan(
    diagnostic: Mapping[str, Any],
    decisions: Mapping[str, Any],
    registry_facts: Mapping[str, Any],
    *,
    label_id: str,
) -> dict[str, Any]:
    """Propose only safe, explicitly requested label additions (dry-run).

    Never propose deletion of an existing HVLS label or implicit exposure
    changes from Keep/Disable/Remove. All those need manual cutover review.
    Raw YAML metadata stays in the protected baseline and must be reproduced
    by a *future* metadata writer before any cutover.
    """
    rows, _ = _validate_inputs(diagnostic, decisions, registry_facts, label_id)
    blockers = _global_reasons(diagnostic)
    loaded = diagnostic.get("loaded_policy", {})
    differences = loaded.get("differences", []) if isinstance(loaded, Mapping) else []
    if not isinstance(differences, list):
        raise StagePlanError("loaded_policy_diff_invalid")
    mismatched: set[str] = set()
    for item in differences:
        if not isinstance(item, Mapping) or not _valid_entity_id(item.get("entity_id")):
            raise StagePlanError("loaded_policy_diff_invalid")
        mismatched.add(item["entity_id"])

    results: list[dict[str, Any]] = []
    proposals: list[dict[str, str | bool]] = []
    for row in sorted(rows, key=lambda r: r["entity_id"]):
        entity_id = row["entity_id"]
        action, metadata_policy, ack, sensitive_ack = _decision_data(
            decisions.get(entity_id)
        )
        is_explicit_exclusion = row.get("yaml_exposure_intent") == "exclude"
        defaulted = False
        if action is None and is_explicit_exclusion:
            action = "keep"
            defaulted = True
        flags: list[str] = []
        custom_fields = row.get("customization_fields_present")
        if (
            not isinstance(custom_fields, list)
            or any(
                not isinstance(field, str)
                or field not in {"name", "room", "aliases"}
                for field in custom_fields
            )
        ):
            custom_fields = []
            flags.append("metadata_evidence_invalid")
        projected = row["disk_ha_sync_projection"]
        registry_id, label_present, eligible = _registry_info(
            registry_facts.get(entity_id)
        )
        if blockers:
            flags.append("global_preflight_blocked")
        if action is None:
            flags.append("decision_required")
        elif action == "invalid":
            flags.append("decision_invalid")
        elif action in {"disable", "remove"}:
            if not ack:
                flags.append("destructive_choice_needs_acknowledgement")
            # These decisions require explicit exclusion/YAML cutover logic,
            # which is not implemented in this preflight.
            flags.append("manual_cutover_policy_required")
        elif action == "keep":
            # Keep must preserve effective policy and original overrides,
            # not merely keep an archived copy of the old YAML.
            if projected == "exposed":
                flags.append("effective_exposure_preservation_not_proven")
        elif action == "import":
            if is_explicit_exclusion:
                flags.append("explicit_exclusion_must_be_preserved")
            if projected != "exposed":
                flags.append("currently_exposed_state_not_proven")
            if entity_id in mismatched:
                flags.append("loaded_policy_entity_mismatch")
            if row.get("category") not in (
                "candidate_for_review", "implicitly_exposed"
            ):
                flags.append("diagnostic_category_not_eligible")
            safe_reasons = {
                "explicitly_exposed", "implicitly_exposed",
                "registry_and_runtime_not_yet_checked",
            }
            if any(
                code not in safe_reasons
                for code in _safe_codes(row.get("reasons", []))
            ):
                flags.append("local_entity_anomaly")
            if custom_fields:
                if metadata_policy not in _METADATA:
                    flags.append("metadata_decision_required")
                elif metadata_policy == "discard_after_review" and not ack:
                    flags.append("metadata_loss_needs_acknowledgement")
                # No metadata conversion/override writer exists in PR #112.
                flags.append("metadata_preservation_not_yet_implemented")
            if entity_id.split(".", 1)[0] in _SENSITIVE_DOMAINS:
                if not sensitive_ack:
                    flags.append("sensitive_exposure_needs_acknowledgement")
            if registry_id is None or label_present is None or eligible is None:
                flags.append("registry_membership_not_verified")
            elif eligible is not True:
                flags.append("entity_not_eligible_for_hvls")
            if not flags and label_present is True:
                flags.append("already_has_label")

        # Never emit an operation unless *every* local and global check passed.
        if action == "import" and not flags:
            proposals.append(
                {
                    "entity_id": entity_id,
                    "registry_id": registry_id,
                    "label_id": label_id,
                    "expected_before": False,
                    "expected_after": True,
                }
            )
            status = "proposed_label_addition"
        elif flags == ["already_has_label"]:
            status = "already_labeled"
        elif action == "keep" and not flags:
            status = "keep_no_label_change"
        else:
            status = "needs_review"

        results.append(
            {
                "entity_id": entity_id,
                "decision": action,
                "decision_defaulted": defaulted,
                "status": status,
                "reasons": list(dict.fromkeys(flags)),
                "projected_before": projected,
                "projected_after": "unknown",
                "customization_fields_present": custom_fields,
                "metadata_policy": metadata_policy,
                "google_home_state": "unknown",
            }
        )

    summary = {
        "considered": len(results),
        "proposed_label_additions": len(proposals),
        "needs_review": sum(item["status"] == "needs_review" for item in results),
        "already_labeled": sum(item["status"] == "already_labeled" for item in results),
        "keep_no_label_change": sum(
            item["status"] == "keep_no_label_change" for item in results
        ),
    }
    # Evidence token for comparison only, never a write capability or approval.
    token = hashlib.sha256(
        json.dumps(
            {
                "source": _source_token(diagnostic),
                "rows": results,
                "proposals": proposals,
            },
            sort_keys=True, separators=(",", ":"),
        ).encode()
    ).hexdigest()
    return {
        "schema_version": 1,
        "status": "read_only_stage_preflight",
        "global_blockers": blockers,
        "source_evidence_sha256": _source_token(diagnostic),
        "review_token_sha256": token,
        "entities": results,
        "label_additions_proposed": proposals,
        "summary": summary,
        "data_freshness_verified_at_write": False,
        "metadata_preservation_verified": False,
        "source_policy_verified_at_write": False,
        "google_home_state_verified": False,
        "read_only": True,
        "apply_allowed": False,
        "cutover_allowed": False,
    }
