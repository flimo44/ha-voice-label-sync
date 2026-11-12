# PR #125 — Recovery investigation scenarios, simulation only

This PR follows the administrator-only recovery view (#124) and the real
Home Assistant Core 2026.11 crash/restart tests (#123).

An interrupted label mutation can leave a durable journal `intent` with a
label either *present* or *absent* in the native registry. Neither observation
establishes whether notifications, automations, other integration callbacks
or Google Home have observed an operation, or whether it is safe to repeat it.

This change provides **per-entity investigation hypotheses** from the
existing trusted read-only recovery report, **never executable options**.

## Behavior

The admin-only `get_migration_recovery_status` response gains:

- `resolution_scenarios.status`: `investigation_required`,
  `observations_only`, `phase_review_required`, `not_initialized` or
  `unavailable`.
- Per-entity `scenario`, `category`, expected before/after label
  membership, currently observed membership and sanitized reason codes.
- Anomalies are **isolated by entity**: a bad/deleted/renamed entity does
  not hide the observations for other entities.
- **Global cautions** (e.g., original Google YAML changed since the
  protected baseline) remain visible without inventing resolutions.
- The panel shows these scenarios **alongside** the established read-only
  recovery status; no new action button is added.

### How to interpret the output

| Journal and current evidence | Hypothesis | What a human must investigate |
| --- | --- | --- |
| `intent`, desired label membership visible, identity intact | `intent_desired_membership_observed` | Possible write happened; effects outside registry and journal ACK remain **unknown** |
| `intent`, original label membership visible, identity intact | `intent_original_membership_observed` | Write not visible *now*; cannot infer it was never issued or whether notifications fired |
| Entity ID replaced or removed; registered label missing; membership not observable | `identity_or_membership_unknown` | **Quarantine this entity**; do not assume recovery conditions |
| `applied` or `rolled_back` and state matches journal | `applied_record_matches_observation` / `rollback_record_matches_observation` | Local state consistent, but not proof of Google Home parity or other side effects |
| `applied` / `rolled_back`, membership drifted | `recorded_state_no_longer_matches` | Investigate registry drift; do not blindly change label |
| Journal/registry mismatch or missing evidence | `inconsistent_journal_observation` or `unavailable` | Stop and examine the protected evidence |

A **source-integrity failure** is a separate global caution. The report
still displays individual hypotheses, but none can be used to authorize a
journal transition, a retry, a rollback, or a Google cutover.

The simulation also handles a reverse label intent
(`expected_before=true`, `expected_after=false`), rather than assuming
every future journal operation is an import-only addition.

## Hard boundaries

The scenario builder is a **pure function** of the sanitized recovery report.
It never reads or changes the HA registries, files, backup or journal.
No `resolve`, `mark_applied`, `rollback`, `retry`, `staging` or
`cutover` WebSocket, service or button exists.

The complete response unconditionally specifies:

```json
{
  "purpose": "human_investigation_not_reconciliation",
  "evidence_is_not_execution_authorization": true,
  "automatic_recovery_allowed": false,
  "journal_ack_allowed": false,
  "retry_allowed": false,
  "rollback_allowed": false,
  "stage_allowed": false,
  "apply_allowed": false,
  "cutover_allowed": false,
  "google_home_state_verified": false,
  "read_only": true
}
```

The inherited recovery snapshot is not atomic across processes. A newer
journal, changed YAML or native registry requires a fresh report. These
hypotheses are **not durable approvals**, and storing or copying one must
never be accepted as authorization by a future execution endpoint.

## Regression

- Both interruption boundaries, including the actual second HA Core
  interpreter (#123): label present/absent with unresolved intent.
- Reverse expected-before/after label membership; recorded applied
  and membership drift; missing label and changed entity identities.
- Mixed healthy/unhealthy rows, drift of original YAML and concurrent
  journal revisions, missing/corrupt protected baseline or journal.
- UI explicitly says *simulation only*, displays reason codes,
  remains bounded, and rejects forged `journal_ack_allowed`,
  `retry_allowed` or `resolution_authorized` flags.

Before any actual recovery action can be offered, its independent design
must incorporate a new manual authorization, fresh native CAS, durable
separate recovery evidence, audit trail, per-entity isolation,
rollback safety and external side-effect review. The existing
`mark_label_applied` is **not** a suitable automatic crash-recovery
shortcut: it requires proof from a newly performed and verified toggle,
not mere label presence after a restart.

Tracks #103; follows #111, #113, #119–#124.
