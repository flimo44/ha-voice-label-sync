"""Conservative full-inventory assisted migration dry-run; no mutations.

The native registry snapshot must be captured on Home Assistant's event loop.
This helper runs in an executor and only reads protected baseline/current YAML.
Its output intentionally contains no imported Google names, rooms or aliases.
"""

from __future__ import annotations

import copy
import hashlib
from collections.abc import Mapping
from pathlib import Path
from typing import Any

import yaml

from .migration_metadata import (
    MetadataError,
    preview_metadata_overlay,
    read_baseline_metadata,
)
from .migration_stage_executor import MigrationStageError, verify_current_sources
from .migration_stage_plan import StagePlanError, build_reviewed_stage_plan

_ALLOWED_DOMAINS = frozenset({
    "light", "switch", "lock", "cover", "climate", "fan",
    "scene", "script", "media_player", "vacuum", "sensor",
    "binary_sensor", "input_boolean", "input_number", "button",
})
_ALLOWED_EXPOSURE = frozenset({"exposed", "not_exposed", "unknown"})
_LOCAL_STAGE_BLOCKERS = frozenset({
    "metadata_preservation_not_yet_implemented",
    "metadata_decision_required",
})


class CutoverReviewError(ValueError):
    """Machine-readable failure: never log or return private YAML or aliases."""


def _simulate_candidate(
    registries: Mapping[str, Any],
    decisions: Mapping[str, Any],
    registry_facts: Mapping[str, Any],
    *,
    configured_label: str,
    domains: frozenset[str],
) -> tuple[str, dict[str, list[str]], list[str], str]:
    """Add hypothetical labels ONLY to a private copied HA registry snapshot."""
    from hvls.backends.google import render_google_assistant
    from hvls.engine import select_entities
    from hvls.models import GenerationRequest
    from hvls.registry import get_registry_items

    from .entity_catalog import build_entity_catalog
    from .label_update import resolve_unique_label_id

    if not isinstance(registries, Mapping):
        raise CutoverReviewError("registries_invalid")
    if (
        not isinstance(domains, frozenset)
        or not domains
        or any(domain not in _ALLOWED_DOMAINS for domain in domains)
        or not isinstance(configured_label, str)
        or not configured_label
    ):
        raise CutoverReviewError("label_or_domains_invalid")

    try:
        candidate = copy.deepcopy(dict(registries))
        labels = get_registry_items(candidate["label_registry"], "labels")
        label_id = resolve_unique_label_id(labels, configured_label)
        catalog = build_entity_catalog(candidate, configured_label, domains)
        native = get_registry_items(candidate["entity_registry"], "entities")
    except (KeyError, AttributeError, TypeError, ValueError) as exc:
        raise CutoverReviewError("registry_snapshot_unavailable") from exc

    eligible = {row["entity_id"]: row["eligible"] for row in catalog["entities"]}
    by_id: dict[str, dict[str, Any]] = {}
    for entry in native:
        entity_id = entry.get("entity_id")
        if not isinstance(entity_id, str) or entity_id in by_id:
            raise CutoverReviewError("registry_snapshot_ambiguous")
        by_id[entity_id] = entry

    anomalies: dict[str, list[str]] = {}
    simulated: list[str] = []
    for entity_id, choice in sorted(decisions.items()):
        if not isinstance(choice, Mapping) or choice.get("action") != "import":
            continue
        problems = []
        entry = by_id.get(entity_id)
        fact = registry_facts.get(entity_id)
        if entry is None or eligible.get(entity_id) is not True:
            problems.append("entity_not_eligible_or_unregistered")
        if not isinstance(fact, Mapping) or fact.get("eligible") is not True:
            problems.append("native_registry_identity_unverified")
        elif (
            not isinstance(fact.get("registry_id"), str)
            or not fact["registry_id"]
            or type(fact.get("label_present")) is not bool
        ):
            problems.append("native_registry_identity_unverified")

        original_labels = None
        if entry is not None:
            labels_raw = entry.get("labels")
            if (
                not isinstance(labels_raw, (list, set, tuple, frozenset))
                or any(not isinstance(v, str) for v in labels_raw)
            ):
                problems.append("registry_labels_invalid")
            else:
                original_labels = set(labels_raw)

        if (
            original_labels is not None
            and isinstance(fact, Mapping)
            and type(fact.get("label_present")) is bool
            and fact["label_present"] != (label_id in original_labels)
        ):
            problems.append("label_membership_snapshot_drift")
        if problems:
            anomalies[entity_id] = list(dict.fromkeys(problems))
            continue
        if label_id not in original_labels:
            entry["labels"] = sorted(original_labels | {label_id})
            simulated.append(entity_id)

    try:
        request = GenerationRequest(
            label=configured_label,
            domains=domains,
            output_path=Path("migration_preview_never_written.yaml"),
            dry_run=True,
        )
        selection = select_entities(
            request=request,
            entity_registry=candidate["entity_registry"],
            device_registry=candidate["device_registry"],
            area_registry=candidate["area_registry"],
            label_registry=candidate["label_registry"],
        )
        generated = render_google_assistant(selection).content
    except (KeyError, AttributeError, TypeError, ValueError) as exc:
        raise CutoverReviewError("candidate_generation_unavailable") from exc

    return generated, anomalies, simulated, label_id


def _compare_entities(
    diagnostic: Mapping[str, Any],
    decisions: Mapping[str, Any],
    stage_plan: Mapping[str, Any],
    overlay: Mapping[str, Any] | None,
    anomalies: Mapping[str, list[str]],
) -> list[dict[str, Any]]:
    """Compare projected before and hypothetical target, no value disclosures."""
    stage_by_id = {row["entity_id"]: row for row in stage_plan["entities"]}
    overlay_by_id: dict[str, list[str]] = {}
    target: set[str] | None = None
    if overlay is not None:
        for row in overlay["entities"]:
            overlay_by_id.setdefault(row["entity_id"], []).extend(row["reasons"])
        if overlay["content"] is not None:
            # Already parsed and verified by PR #114; reparse internal copy
            # only to obtain exposed entity IDs, never return field values.
            raw = yaml.safe_load(overlay["content"])
            target = set(raw)

    results = []
    for item in diagnostic["entities"]:
        entity_id = item["entity_id"]
        original = item["disk_ha_sync_projection"]
        if original not in _ALLOWED_EXPOSURE:
            original = "unknown"
        action = stage_by_id[entity_id]["decision"]
        after = (
            "unknown" if target is None else
            "exposed" if entity_id in target else "not_exposed"
        )
        reasons = list(anomalies.get(entity_id, ()))
        reasons.extend(overlay_by_id.get(entity_id, ()))
        if original == "unknown":
            reasons.append("original_exposure_unknown")
        elif after == "unknown":
            reasons.append("target_exposure_unverified")
        elif original != after:
            if original == "exposed":
                reasons.append("projected_exposure_would_be_lost")
            else:
                reasons.append("projected_new_exposure")
        if item.get("loaded_policy_difference"):
            reasons.append("loaded_policy_entity_drift")
        if action in {"disable", "remove"}:
            reasons.append("destructive_decision_not_implemented")
        if action == "import":
            stage_row = stage_by_id[entity_id]
            # The PR #112 stage guard still blocks customized entities,
            # even when this preview proves their metadata can be rendered.
            if stage_row["status"] not in {
                "proposed_label_addition", "already_labeled"
            }:
                reasons.append("label_staging_not_yet_authorized")
        if action == "keep" and original == "exposed" and after != "exposed":
            reasons.append("keep_would_not_preserve_exposure")
        results.append({
            "entity_id": entity_id,
            "decision": action,
            "projected_before": original,
            "hypothetical_after": after,
            "metadata_fields_present": list(
                item.get("customization_fields_present", [])
            ),
            "reasons": sorted(set(reasons)),
            "status": "needs_review" if reasons else "preview_consistent",
            "google_home_state": "unknown",
        })
    return results


def build_readonly_migration_review(
    config_dir: str | Path,
    diagnostic: Mapping[str, Any],
    decisions: Mapping[str, Any],
    registry_facts: Mapping[str, Any],
    registries: Mapping[str, Any],
    *,
    configured_label: str,
    domains: frozenset[str],
    expected_baseline_manifest_sha256: str,
) -> dict[str, Any]:
    """Integrate PR #110–#114 checks into an inert, whole-inventory review.

    This is a low-level helper, not an administrator-authorized endpoint.
    It may be invoked ONLY on a copied native registry snapshot in an
    executor. It neither captures a baseline nor initializes a journal.
    """
    if not isinstance(diagnostic, Mapping) or not isinstance(decisions, Mapping):
        raise CutoverReviewError("invalid_review_arguments")
    if not isinstance(registry_facts, Mapping):
        raise CutoverReviewError("invalid_review_arguments")
    reasons: list[str] = []
    try:
        generated, anomalies, simulated, label_id = _simulate_candidate(
            registries, decisions, registry_facts,
            configured_label=configured_label, domains=domains,
        )
        stage_plan = build_reviewed_stage_plan(
            diagnostic, decisions, registry_facts, label_id=label_id
        )
    except (CutoverReviewError, StagePlanError) as exc:
        code = str(exc)
        if isinstance(exc, StagePlanError):
            code = "staging_plan_unavailable"
        raise CutoverReviewError(code) from exc

    reasons.extend(stage_plan["global_blockers"])
    overlay = None
    baseline_verified = False
    try:
        verify_current_sources(
            config_dir,
            diagnostic["source"]["locations"],
            expected_baseline_manifest_sha256,
        )
        captured = read_baseline_metadata(config_dir)
        if captured["baseline_manifest_sha256"] != expected_baseline_manifest_sha256:
            raise CutoverReviewError("baseline_changed_between_reads")
        baseline_verified = True
        selections = [
            row["entity_id"] for row in stage_plan["entities"]
            if row["decision"] == "import"
        ]
        overlay = preview_metadata_overlay(generated, captured, selections)
    except (KeyError, TypeError, ValueError, MetadataError, MigrationStageError):
        # Baseline snapshot absent, corrupted or stale is a global blocker,
        # but must not suppress unrelated planner findings.
        reasons.append("protected_source_or_metadata_unavailable")

    if overlay is None or overlay.get("content") is None:
        reasons.append("candidate_yaml_not_complete")
    elif overlay["summary"]["unreviewed_generated_entities"]:
        reasons.append("unapproved_generated_exposure")
    if anomalies:
        # Native snapshot drift remains local; never silently coerce.
        # Rows below list the affected entities.
        pass

    rows = _compare_entities(diagnostic, decisions, stage_plan, overlay, anomalies)
    if not rows:
        reasons.append("empty_exposure_inventory")
    count_review = sum(row["status"] == "needs_review" for row in rows)
    if (
        overlay is not None
        and overlay["summary"]["unreviewed_generated_entities"] > 0
    ):
        reasons.append("unapproved_generated_exposure")
    reasons = list(dict.fromkeys(reasons))

    content = overlay.get("content") if overlay else None
    # SHA binds future authorized rendering to these private values without
    # returning any of them. SHA is an evidence fingerprint, not approval.
    sha = hashlib.sha256(content.encode("utf-8")).hexdigest() if content else None
    return {
        "schema_version": 1,
        "status": (
            "global_review_blocked" if reasons else
            "local_review_pending" if count_review else
            "hypothetical_preview_consistent"
        ),
        "global_blockers": reasons,
        "source_and_baseline_verified_at_review": baseline_verified,
        "stage_review_token_sha256": stage_plan["review_token_sha256"],
        "candidate_yaml_sha256": sha,
        "candidate_contains_private_values": content is not None,
        "metadata_preview_summary": (
            overlay["summary"] if overlay is not None else None
        ),
        "summary": {
            "considered": len(rows),
            "hypothetically_labelled": len(simulated),
            "stage_label_additions_proposed": (
                stage_plan["summary"]["proposed_label_additions"]
            ),
            "needs_review": count_review,
            "preview_consistent": len(rows) - count_review,
        },
        "entities": rows,
        "google_home_state_verified": False,
        "source_freshness_verified_at_write": False,
        "read_only": True,
        "apply_allowed": False,
        "cutover_allowed": False,
    }
