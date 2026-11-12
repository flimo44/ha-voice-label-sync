# PR #131 — Independent, single-use execution approval rehearsal

This change follows the server-only, read-only technical admission inventory
(#130) and the still-dormant intent-before-write native CAS staging code
(#129). It introduces a **two-phase human approval protocol rehearsal**.

**This is NOT a production authorization protocol and NOT a stage feature.**
It does not persist or issue an authorization for executing any operation.
It does not change HA labels, migration journal, YAML, Google Assistant,
an existing review attestation or the investigation ledger.

## Narrow approval scope

The ONLY accepted action identifier is
`stage_one_label_addition`, and it must target **one exact entity ID**.

The WebSocket API is administrative-only:
- `ha_voice_label_sync/prepare_migration_execution_approval_dryrun`
- `ha_voice_label_sync/confirm_migration_execution_approval_dryrun`

The browser supplies only the entity ID and the fixed action identifier
for preparation. The server **recomputes the complete admission review**,
including the saved unapproved draft, HA native registry, Google policy
checks, original YAML integrity, transaction journal and the independent
review attestation. It rejects everything except the status
`hypothetical_prerequisites_consistent_no_permission` with no technical
blockers and the mandatory permanent authorization blockers from #130.

No supplied approval, stage plan, journal digest, YAML hash, state, scope,
review evidence or technical result from the client is trusted.

## Two-phase protocol

**Prepare:**
- Under the single HA migration workflow lock, recompute the entire private
  read-only server admission preview.
- Bind a cryptographically random 256-bit token to:
  authenticated **admin ID**, entity ID, the one allowed action,
  SHA-256 of **all server-only evidence** (draft, journal, review, attestation,
  original source verification, native capture), and monotonic expiry
  **180 seconds** from preparation.
- Store it in **volatile HA memory only**, not in the journal or an
  authorization file. A new preparation for the same entity supersedes the
  previous challenge, including one prepared by another admin.
- Return only this non-executing confirmation challenge and the opaque
  digest; no private YAML or aliases.

**Confirm:**
- Require the exact admin, entity, action, one-time token,
  `confirmed=true`, and `acknowledge_external_uncertainty=true`.
- Under the same workflow lock, consume an authenticated challenge
  **before recomputing server evidence**. A stale confirmation loses its
  token permanently and must be prepared again.
- Repeat the entire trusted admission check, including twice reading
  journal, draft and sources, plus the final native CAS observation.
- Recompute the SHA-256 of the complete server-controlled review and reject
  any change. This captures changes that might not affect a high-level
  readiness status, including unrelated label/state or review detail.
- Return only
  `simulated_execution_approval_confirmed_no_execution` with explicit
  **NO execution authority**.

An incorrect token or another admin does not consume the rightful user's
challenge. A correctly authenticated but mismatched action/scope, changed
evidence, or unavailable proof consumes it and refuses the confirmation.

A process restart clears pending challenges. The protocol never
automatically retries, resumes or acknowledges an interrupted stage.

## Immutable non-execution contract

Both successful prepare and confirm responses contain:

```json
{
  "purpose": "execution_approval_protocol_rehearsal_only",
  "simulated_confirmation_only": true,
  "decision_not_durably_saved": true,
  "no_action_was_performed": true,
  "execution_authorized": false,
  "journal_ack_allowed": false,
  "retry_allowed": false,
  "rollback_allowed": false,
  "stage_allowed": false,
  "apply_allowed": false,
  "cutover_allowed": false,
  "google_home_state_verified": false,
  "external_consumers_verified": false,
  "observation_atomic_across_processes": false
}
```

The SHA-256 evidence fingerprint is not authenticated with a persistent
secret and **must never be interpreted as a capability**. Even an apparently
successful full simulation remains unsafe for real execution. The native
CAS, disks and external events cannot be made atomically consistent
across independent processes using this handshake alone. An ABA change
may have caused irreversible third-party effects.

## Test matrix

The tests assert:
- fresh prepare+confirm, 180s lifetime, one-use token, no-stage result;
- replay, expired token, forged token, cross-admin attempt, second admin
  superseding the challenge, wrong entity, invalid action (retry/ACK/
  rollback/cutover), missing explicit confirmation or uncertainty consent;
- selected evidence changed after preparation: full native-label snapshot,
  journal revision, loaded Google policy, saved draft, source inventory,
  independent attestation;
- pending token disappears on process restart;
- the WebSocket callbacks are `require_admin` and have **no stage writer,
  journal mutation, HA registry update or audit-ledger append call**;
- the server admission facade now returns a fingerprint of the **entire**
  full review without revealing any private source content.

No frontend execution button is added in this PR. HA Core 2026.11 native
sandbox tests from #123–#130 remain required. The technical-admission
snapshot used by the rehearsal tests is synthetic; no actual Google Home
instance or real user's configuration has been exercised as an approval.

## Still missing before execution

Production approval would need a *distinct*, explicitly designed,
durable audit trail of confirmed execution intent; per-admin permission,
server-generated single-use grants scoped to one journal intent; binding to
the complete plan and baseline; transactional CAS immediately at both
durable journal intent and native HA write; replay-safe crash semantics;
verification of external consumers, and an explicit cutover protocol.

**Never connect the simulated token or hash returned here to the existing
dormant `stage_one_approved_label`.** It still accepts a low-level
`admin_approved` boolean and does not implement such authorization.
Historical investigation records (#127) and attestations (#119)
also remain permanently non-authorizing.

Refs #103, #111, #113, #118–#130.
