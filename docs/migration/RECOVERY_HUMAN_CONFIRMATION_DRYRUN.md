# PR #126 — Human recovery decision confirmation protocol, simulation only

This PR follows #125's **non-authorizing investigation hypotheses**. It
models the human decision/confirmation protocol before any write-capable
recovery feature is considered. **A successful simulated confirmation
authorizes NOTHING, performs NO operation, and is NOT persistently stored.**

## Two-phase administrator flow

The existing Migration tab now offers a small choice control for each
**unresolved** recovery case with a verified original source and journal in
the `labels_staging` phase. The permitted intentions are:

- `inspect_external_effects` — investigate callbacks/automations that may
  have observed the label change;
- `quarantine_for_investigation` — isolate the entity for manual analysis;
- `defer_until_further_evidence` — defer the human assessment.

These are **investigation dispositions only**, not methods for acknowledging
an intent, retrying a label, deleting a label, restarting Google Assistant or
cutting over. An apparently correct membership **never** clears the journal.

1. `ha_voice_label_sync/prepare_migration_recovery_decision`, **admin-only**,
   reads a new protected baseline, complete validated journal, native entity
   and label registries, and original YAML source integrity using the same
   shared HA workflow lock. It rejects unavailable records, changed source
   files, wrong phase, already-settled rows and unexpected authorization flags.
   Unrelated faulty entities are preserved in the report but **do not block**
   investigation of a separately valid row.
2. If eligible, the server creates a cryptographically random **one-use
   180-second** challenge in volatile Home Assistant memory, keyed to the
   specific admin, entity ID, chosen investigation disposition and SHA-256 of
   the **entire** sanitized recovery report.
3. The browser presents an explicit *simulation only* confirmation, including
   the unresolved external/Google Home effects. Canceling sends no confirm.
4. `ha_voice_label_sync/confirm_migration_recovery_decision`, also admin-only,
   requires `confirmed=true`, `acknowledge_external_uncertainty=true`, the
   exact same administrator, entity, choice and one-use token. A valid token
   is **consumed before rereading anything**, even when the subsequent review
   fails. The server rebuilds the whole trusted recovery report from disk and
   real HA registries, recomputes the digest and rejects any difference.
5. On a valid fresh match, the result is ONLY
   `simulated_review_confirmation_no_execution`, with no persistent record,
   no label update, no journal mutation and no Google action. The UI presents
   the outcome as a **non-executing test**, never as completion.

All errors return fixed, sanitized codes. No YAML, aliases, rooms, PINs,
tokens, user IDs or file paths are logged or echoed as raw error text.

## Stronger journal comparison

`get_migration_recovery_status` now includes an administrator-only
`journal_evidence_sha256` for the **full validated journal structure**,
including operation IDs, registry identities, labels, revision, phase and
expected membership flags. A matching revision number alone is insufficient
if the underlying journal contents changed. The challenge hashes the entire
read-only recovery report, which includes the complete journal fingerprint,
source integrity, individual membership observations and scenario outcomes.

A changed membership, entity/label identity, new pending operation, altered
journal, modified protected YAML source or missing baseline invalidates the
prepared challenge. A different admin, wrong choice, expired token, reused
token or absent confirmation is refused.

The shared in-process lock avoids local HVLS operations racing with this
review. It **does not** lock independent processes, external integrations,
or changes made after confirmation: the report explicitly sets
`observation_atomic_across_processes=false`. Since this PR performs no
mutation, it makes no claim to provide an atomic execution transaction.

## Immutable safety contract

Every successful prepare/confirm response says:

```json
{
  "simulated_confirmation_only": true,
  "decision_not_durably_saved": true,
  "execution_authorized": false,
  "automatic_recovery_allowed": false,
  "journal_ack_allowed": false,
  "retry_allowed": false,
  "rollback_allowed": false,
  "stage_allowed": false,
  "apply_allowed": false,
  "cutover_allowed": false,
  "google_home_state_verified": false,
  "observation_atomic_across_processes": false,
  "read_only": true
}
```

**No real recovery authorization, persistence, execution token, rollback
endpoint, stage endpoint or Google write is introduced.** Future real
resolution must use a separately designed, persistent/immutable audit
trail, immediate write-time registry CAS, explicit user consent, external
side-effect review and evidence of Google parity appropriate to the action.
An ephemeral successful simulation must NEVER be accepted by such a future
executor as proof of authority or a past journal acknowledgment.

## Regression and real Home Assistant test

- One-use, TTL expiry, repeated and wrong-user challenges; wrong entity and
  disposition, canceled confirmation and unacknowledged external uncertainty.
- Changes between prepare and confirm: live label, HA entity identity, label
  identity, journal operation/revision and original YAML source bytes.
- Broken/missing baseline, clean/applied rows ineligible for crash recovery,
  invalid operation choices and faulty second entities isolated by row.
- Tests prove no journal, YAML or native registry writes and no elevation of
  any stage/apply/cutover permission.
- Browser tests confirm exactly two *non-mutating* WebSocket calls after
  human confirmation, cancellation after preparation and refusal of forged
  success/authority flags.
- Extend the **real HA Core 2026.11 sandbox (#123)**: the second process
  reloads the native HA registry from disk and executes prepare+confirm in
  the same temporary Home Assistant environment for both crash boundaries.

A full live Google Home installation, third-party automations and a real
crash during this exact two-phase handshake remain **unverified**. This is
a protocol rehearsal, not a production recovery procedure.

Tracking #103. Follows #111, #113, #119–#125.
