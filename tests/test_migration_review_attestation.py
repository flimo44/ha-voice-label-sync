"""Review attestation is durable, CAS-protected, and never executable."""

from __future__ import annotations

import ast
import hashlib
import importlib.util
import json
import sys
from pathlib import Path
from types import ModuleType

import pytest

ROOT = (
    Path(__file__).resolve().parents[1]
    / "custom_components" / "ha_voice_label_sync"
)
MAIN = b"""# Original source is never rewritten.
google_assistant:
  project_id: SECRET_GOOGLE_PROJECT
  expose_by_default: false
  entity_config: !include google_entries.yaml
"""
ENTITIES = b"""light.good:
  expose: true
  name: "PRIVATE ALIAS NAME"
light.problem:
  expose: true
  room: [invalid, shape]
lock.excluded:
  expose: false
"""


@pytest.fixture
def components(monkeypatch):
    prefix = "_test_hvls_review_attestation"
    pkg = ModuleType(prefix)
    pkg.__path__ = [str(ROOT)]
    monkeypatch.setitem(sys.modules, prefix, pkg)
    loaded = {}
    for name in (
        "migration_discovery", "migration_baseline", "migration_journal",
        "migration_stage_plan", "migration_stage_executor",
        "migration_decision_draft", "migration_review_attestation",
    ):
        full = f"{prefix}.{name}"
        spec = importlib.util.spec_from_file_location(
            full, ROOT / f"{name}.py"
        )
        assert spec and spec.loader
        mod = importlib.util.module_from_spec(spec)
        monkeypatch.setitem(sys.modules, full, mod)
        spec.loader.exec_module(mod)
        loaded[name] = mod
    return loaded


def prepare(tmp_path, components):
    (tmp_path / "configuration.yaml").write_bytes(MAIN)
    (tmp_path / "google_entries.yaml").write_bytes(ENTITIES)
    source = components["migration_discovery"].discover_google_assistant(
        tmp_path
    )
    assert source["source"]["status"] == "resolved"
    baseline = components["migration_baseline"].capture_baseline(
        tmp_path, source
    )
    journal = components["migration_journal"].initialize_journal(tmp_path)
    sha = "f" * 64
    components["migration_decision_draft"].save_review_draft(
        tmp_path,
        decisions={
            "light.good": {"action": "import"},
            "light.problem": {"action": "keep"},
        },
        allowed_entity_ids={"light.good", "light.problem", "lock.excluded"},
        source_locations=source["source"]["locations"],
        source_evidence_sha256=components[
            "migration_stage_plan"
        ]._source_token(source),
        fresh_review_token_sha256=sha,
        expected_review_token_sha256=sha,
        expected_baseline_manifest_sha256=baseline["manifest_sha256"],
        expected_journal_revision=0,
        expected_draft_revision=-1,
        administrator_id="admin-one",
    )
    return {
        "baseline": baseline["manifest_sha256"],
        "journal": journal["revision"],
        "locations": source["source"]["locations"],
        "plan_sha": sha,
    }


def report(*, problems=False, token="f" * 64):
    return {
        "protected_baseline_status": "verified",
        "diagnostic": {
            "schema_version": 1, "read_only": True,
            "entities": [
                {"entity_id": "light.good"},
                {"entity_id": "light.problem"},
            ],
        },
        "preflight": {
            "read_only": True, "cutover_allowed": False,
            "review_token_sha256": token,
            "global_blockers": [],
            "summary": {"needs_review": 1 if problems else 0},
        },
        "indirect_consumer_audit": {
            "read_only": True,
            "stage_allowed": False,
            "cutover_allowed": False,
            "external_consumers_verified": False,
            "status": "indirect_effects_unverified",
            "reason_codes": [],
            "reference_counts": {
                "explicit_hvls_generate_references": 0,
                "label_template_references": 0,
            },
        },
        "pre_stage_impact": {
            "read_only": True,
            "stage_allowed": False,
            "cutover_allowed": False,
            "other_label_consumers_verified": False,
            "google_home_state_verified": False,
            "status": "no_manual_policy_delta_detected",
            "global_blockers": [],
            "summary": {"needs_review": 0},
            "entities": [
                {"entity_id": "light.good", "status": "no_manual_policy_delta_detected"}
            ],
        },
        "simulation": {
            "read_only": True, "cutover_allowed": False,
            "stage_review_token_sha256": token,
            "status": (
                "local_review_pending" if problems
                else "hypothetical_preview_consistent"
            ),
            "candidate_yaml_sha256": "c" * 64,
            "global_blockers": [],
            "summary": {"considered": 2, "needs_review": 1 if problems else 0},
            "entities": [
                {"entity_id": "light.good", "status": "preview_consistent"},
                {
                    "entity_id": "light.problem",
                    "status": "needs_review" if problems
                    else "preview_consistent",
                },
            ],
        },
    }


def path(tmp_path):
    return (
        tmp_path / ".storage" / "hvls_migration" / "review-attestation.json"
    )


def submit(tmp_path, components, data, *, prior=-1,
           acknowledge=False, confirmed=True, expected=None):
    attest = components["migration_review_attestation"]
    evidence = attest.review_evidence(data)
    return attest.attest_review(
        tmp_path,
        expected_attestation_revision=prior,
        expected_draft_revision=0,
        expected_baseline_manifest_sha256=components[
            "migration_baseline"
        ].verify_baseline(tmp_path)["manifest_sha256"],
        expected_journal_revision=0,
        source_locations=components[
            "migration_discovery"
        ].discover_google_assistant(tmp_path)["source"]["locations"],
        current_evidence=data,
        expected_review_evidence_sha256=(
            expected if expected is not None
            else evidence["review_evidence_sha256"]
        ),
        administrator_id="ha-admin-one",
        confirmed=confirmed,
        acknowledge_issues=acknowledge,
    )


def test_no_attestation_is_readonly(tmp_path, components):
    prepare(tmp_path, components)
    attest = components["migration_review_attestation"]
    state = attest.load_attestation(tmp_path)
    assert state["status"] == "not_attested"
    assert state["attestation_revision"] == -1
    assert state["cutover_allowed"] is False
    assert not path(tmp_path).exists()


def test_saved_draft_alone_is_not_review_attestation(
    tmp_path, components
):
    prepare(tmp_path, components)
    assert not path(tmp_path).exists()
    attest = components["migration_review_attestation"]
    state = attest.load_attestation(tmp_path)
    assert state["review_is_not_execution_authorization"] is True


def test_explicit_attestation_records_review_without_changing_yaml(
    tmp_path, components
):
    prepare(tmp_path, components)
    data = report()
    attest = components["migration_review_attestation"]
    recorded = submit(tmp_path, components, data)
    assert recorded["status"] == "reviewed_without_detected_issues"
    assert recorded["attestation_revision"] == 0
    assert recorded["apply_allowed"] is False
    assert recorded["cutover_allowed"] is False
    assert recorded["google_home_state_verified"] is False
    assert attest.load_attestation(
        tmp_path, current_evidence=attest.review_evidence(data)
    )["status"] == "reviewed_without_detected_issues"
    assert (tmp_path / "configuration.yaml").read_bytes() == MAIN
    assert (tmp_path / "google_entries.yaml").read_bytes() == ENTITIES
    assert components["migration_journal"].read_journal(
        tmp_path
    )["phase"] == "baseline_ready"
    assert path(tmp_path).stat().st_mode & 0o077 == 0
    stored = path(tmp_path).read_text()
    assert "SECRET_GOOGLE_PROJECT" not in stored
    assert "PRIVATE ALIAS NAME" not in stored
    assert "ha-admin-one" not in stored
    assert json.loads(stored)["reviewed_by_sha256"] == hashlib.sha256(
        b"ha-admin-one"
    ).hexdigest()


def test_open_issues_require_separate_acknowledgement(
    tmp_path, components
):
    prepare(tmp_path, components)
    data = report(problems=True)
    error = components["migration_review_attestation"].AttestationError
    with pytest.raises(error, match="explicit_review_confirmation_required"):
        submit(tmp_path, components, data, acknowledge=False)
    assert not path(tmp_path).exists()
    result = submit(tmp_path, components, data, acknowledge=True)
    assert result["status"] == "reviewed_with_open_issues"
    assert result["observed_issues"] is True
    assert not result["cutover_allowed"]
    assert not result["apply_allowed"]


def test_no_explicit_confirmation_no_file(tmp_path, components):
    prepare(tmp_path, components)
    with pytest.raises(components["migration_review_attestation"].AttestationError):
        submit(tmp_path, components, report(), confirmed=False)
    assert not path(tmp_path).exists()


def test_only_approved_diagnostic_shape_can_be_attested(
    tmp_path, components
):
    prepare(tmp_path, components)
    data = report()
    data["simulation"]["cutover_allowed"] = True
    with pytest.raises(
        components["migration_review_attestation"].AttestationError,
        match="complete_readonly_review_required",
    ):
        submit(tmp_path, components, data)
    assert not path(tmp_path).exists()


def test_mismatched_preview_token_refused(
    tmp_path, components
):
    prepare(tmp_path, components)
    with pytest.raises(
        components["migration_review_attestation"].AttestationError,
        match="draft_changed_or_not_saved",
    ):
        submit(tmp_path, components, report(token="e" * 64))
    assert not path(tmp_path).exists()


def test_changed_review_digest_refuses_stale_browser(
    tmp_path, components
):
    prepare(tmp_path, components)
    with pytest.raises(
        components["migration_review_attestation"].AttestationError,
        match="explicit_review_confirmation_required",
    ):
        submit(
            tmp_path, components, report(), expected="a" * 64
        )
    assert not path(tmp_path).exists()


def test_attestation_requires_fresh_evidence_after_restart(
    tmp_path, components
):
    prepare(tmp_path, components)
    submit(tmp_path, components, report())
    attest = components["migration_review_attestation"]
    assert attest.load_attestation(tmp_path)[
        "status"
    ] == "stale_review_attestation"
    assert attest.load_attestation(
        tmp_path, current_evidence=attest.review_evidence(
            report(problems=True)
        ),
    )["status"] == "stale_review_attestation"
    assert attest.load_attestation(
        tmp_path, current_evidence=attest.review_evidence(
            report()
        ),
    )["status"] == "reviewed_without_detected_issues"


def test_draft_update_invalidates_prior_review(
    tmp_path, components
):
    info = prepare(tmp_path, components)
    submit(tmp_path, components, report())
    draft = components["migration_decision_draft"]
    draft.save_review_draft(
        tmp_path,
        decisions={"light.good": {"action": "keep"}},
        allowed_entity_ids={"light.good"},
        source_locations=info["locations"],
        source_evidence_sha256=components[
            "migration_stage_plan"
        ]._source_token(components[
            "migration_discovery"
        ].discover_google_assistant(tmp_path)),
        fresh_review_token_sha256="d" * 64,
        expected_review_token_sha256="d" * 64,
        expected_baseline_manifest_sha256=info["baseline"],
        expected_journal_revision=0,
        expected_draft_revision=0,
        administrator_id="ha-admin-two",
    )
    attest = components["migration_review_attestation"]
    assert attest.load_attestation(
        tmp_path, current_evidence=attest.review_evidence(report())
    )["status"] == "stale_review_attestation"


def test_journal_phase_change_invalidates_attestation(
    tmp_path, components
):
    prepare(tmp_path, components)
    submit(tmp_path, components, report())
    components["migration_journal"].advance_phase(
        tmp_path, "labels_staging", expected_revision=0
    )
    attest = components["migration_review_attestation"]
    assert attest.load_attestation(
        tmp_path, current_evidence=attest.review_evidence(report())
    )["status"] == "stale_review_attestation"


def test_concurrent_reviewer_cas_cannot_overwrite(
    tmp_path, components
):
    prepare(tmp_path, components)
    submit(tmp_path, components, report())
    previous = path(tmp_path).read_bytes()
    with pytest.raises(
        components["migration_review_attestation"].AttestationError,
        match="attestation_revision_conflict",
    ):
        submit(tmp_path, components, report(), prior=-1)
    assert path(tmp_path).read_bytes() == previous
    updated = submit(tmp_path, components, report(), prior=0)
    assert updated["attestation_revision"] == 1


def test_original_yaml_edit_refuses_new_attestation(
    tmp_path, components
):
    info = prepare(tmp_path, components)
    (tmp_path / "google_entries.yaml").write_bytes(
        ENTITIES + b"\n# source drift\n"
    )
    attest = components["migration_review_attestation"]
    with pytest.raises(attest.AttestationError, match="original_sources_changed"):
        attest.attest_review(
            tmp_path,
            expected_attestation_revision=-1,
            expected_draft_revision=0,
            expected_baseline_manifest_sha256=info["baseline"],
            expected_journal_revision=0,
            source_locations=info["locations"],
            current_evidence=report(),
            expected_review_evidence_sha256=attest.review_evidence(
                report()
            )["review_evidence_sha256"],
            administrator_id="admin-one",
            confirmed=True,
            acknowledge_issues=False,
        )
    assert not path(tmp_path).exists()


def test_corrupt_attestation_rejected_not_overwritten(
    tmp_path, components
):
    prepare(tmp_path, components)
    submit(tmp_path, components, report())
    path(tmp_path).write_text("{invalid-json")
    error = components["migration_review_attestation"].AttestationError
    with pytest.raises(error, match="attestation_unreadable"):
        submit(tmp_path, components, report(), prior=0)
    assert path(tmp_path).read_text() == "{invalid-json"


def test_symlink_attestation_refused(tmp_path, components):
    prepare(tmp_path, components)
    outside = tmp_path / "external-record.json"
    outside.write_text("private")
    path(tmp_path).symlink_to(outside)
    error = components["migration_review_attestation"].AttestationError
    with pytest.raises(error, match="attestation_invalid_file"):
        submit(tmp_path, components, report())
    assert outside.read_text() == "private"


def test_unknown_approval_field_in_record_is_rejected(
    tmp_path, components
):
    prepare(tmp_path, components)
    submit(tmp_path, components, report())
    data = json.loads(path(tmp_path).read_text())
    data["authorize_cutover"] = True
    path(tmp_path).write_text(json.dumps(data))
    error = components["migration_review_attestation"].AttestationError
    with pytest.raises(error, match="attestation_invalid_document"):
        components["migration_review_attestation"].load_attestation(tmp_path)


def test_no_execution_api_wiring_in_review_websocket():
    tree = ast.parse((ROOT / "websocket.py").read_text(encoding="utf-8"))
    for name in (
        "websocket_get_migration_review_attestation",
        "websocket_attest_migration_review",
    ):
        node = next(
            n for n in tree.body
            if isinstance(n, ast.AsyncFunctionDef) and n.name == name
        )
        assert any(
            isinstance(d, ast.Attribute) and d.attr == "require_admin"
            for d in node.decorator_list
        )
        code = ast.unparse(node)
        assert "stage_one_approved_label" not in code
        assert "apply_reviewed_preview" not in code
        assert "capture_baseline" not in code
    handler = next(
        n for n in tree.body
        if isinstance(n, ast.FunctionDef)
        and n.name == "async_register_websocket_api"
    )
    assert "websocket_attest_migration_review" in ast.unparse(handler)



def test_changed_label_impact_invalidates_human_attestation(
    tmp_path, components
):
    prepare(tmp_path, components)
    initial = report()
    submit(tmp_path, components, initial)
    reviewed = components["migration_review_attestation"]
    assert reviewed.load_attestation(
        tmp_path, current_evidence=reviewed.review_evidence(initial)
    )["status"] == "reviewed_without_detected_issues"
    changed = report()
    changed["pre_stage_impact"]["status"] = "local_review_pending"
    changed["pre_stage_impact"]["summary"]["needs_review"] = 1
    changed["pre_stage_impact"]["entities"][0]["status"] = "needs_review"
    assert reviewed.load_attestation(
        tmp_path, current_evidence=reviewed.review_evidence(changed)
    )["status"] == "stale_review_attestation"


def test_missing_loaded_impact_evidence_fails_closed(
    tmp_path, components
):
    prepare(tmp_path, components)
    incomplete = report()
    del incomplete["pre_stage_impact"]
    with pytest.raises(
        components["migration_review_attestation"].AttestationError,
        match="complete_readonly_review_required",
    ):
        submit(tmp_path, components, incomplete)
    assert not path(tmp_path).exists()


def test_loaded_impact_anomalies_require_explicit_acknowledgment(
    tmp_path, components
):
    prepare(tmp_path, components)
    changed = report()
    changed["pre_stage_impact"]["status"] = "local_review_pending"
    changed["pre_stage_impact"]["summary"]["needs_review"] = 1
    reviewed = components["migration_review_attestation"]
    with pytest.raises(reviewed.AttestationError):
        submit(tmp_path, components, changed, acknowledge=False)
    result = submit(tmp_path, components, changed, acknowledge=True)
    assert result["status"] == "reviewed_with_open_issues"
    assert result["cutover_allowed"] is False



def test_indirect_label_consumer_audit_change_invalidates_review(
    tmp_path, components
):
    prepare(tmp_path, components)
    initial = report()
    attest = components["migration_review_attestation"]
    submit(tmp_path, components, initial)
    assert attest.load_attestation(
        tmp_path, current_evidence=attest.review_evidence(initial)
    )["status"] == "reviewed_without_detected_issues"
    changed = report()
    changed["indirect_consumer_audit"]["reason_codes"] = [
        "hvls_generate_referenced_in_standard_yaml"
    ]
    changed["indirect_consumer_audit"]["reference_counts"][
        "explicit_hvls_generate_references"
    ] = 1
    assert attest.load_attestation(
        tmp_path, current_evidence=attest.review_evidence(changed)
    )["status"] == "stale_review_attestation"


def test_review_of_unknown_external_consumers_requires_acknowledgement(
    tmp_path, components
):
    prepare(tmp_path, components)
    report_with_risk = report()
    report_with_risk["indirect_consumer_audit"]["reason_codes"] = [
        "external_automation_and_registry_listeners_unverified"
    ]
    attest = components["migration_review_attestation"]
    with pytest.raises(attest.AttestationError):
        submit(tmp_path, components, report_with_risk, acknowledge=False)
    result = submit(tmp_path, components, report_with_risk, acknowledge=True)
    assert result["status"] == "reviewed_with_open_issues"
    assert result["cutover_allowed"] is False
