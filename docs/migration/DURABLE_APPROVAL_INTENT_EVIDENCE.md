# PR #132 — Durable administrator approval-intent EVIDENCE (not authority)

PR #131 simulated a single-use administrator approval handshake entirely
in memory. This PR adds a **separate durable historical audit trail** for
a human's explicit, confirmed intention to approve the ONE action
`stage_one_label_addition` for ONE entity.

**The only new operation that writes is APPENDING AN AUDIT RECORD.**
It does not grant staging permission; it does not call
`stage_one_approved_label` or the native writer, acknowledge a migration
journal operation, replay, retry, rollback, cutover, or change YAML.

## Explicit two-phase admin-only audit operation

WebSockets (all `require_admin`):
- `prepare_migration_durable_approval_intent`: no disk write
- `confirm_migration_durable_approval_intent`: append exactly one audit
  entry, after fresh evidence checks
- `get_migration_durable_approval_intent_history`: read-only protected
  chain inspection, last 50 entries

**Prepare** requires all the technical prerequisites of #130 to be
hypothetically coherent; recomputes the entire server-built admission
evidence (not client-supplied), reads the private journal, saved choices,
and approval history head, recomputes the full admission a second time,
and denies inconsistent evidence.

The 180-second cryptographically random challenge is volatile and bound
to the authenticated administrator ID, exact entity ID, fixed action,
SHA-256 of the entire server-collected admission review, journal SHA,
saved draft SHA, and the audit history's expected head/count.

A second preparation for the SAME entity revokes its previous challenge.
A different admin cannot reuse the challenge. HA restart invalidates all
pending challenges.

**Confirm** requires `confirmed=true`,
`acknowledge_external_uncertainty=true`, identical admin, entity, action
and challenge. An authenticated challenge is consumed irrevocably **before**
the expensive fresh read. A changed HA native label, external policy
diagnostic, draft, journal, YAML, source integrity, or audit ledger head
rejects confirmation. A failure leaves no automatic retries.

The *only* approved side effect after these checks is appending one
private evidence file; no other migration operation is allowed.

## Independent private audit history with anchored head

Path: `.storage/hvls_migration/execution-approval-intent-evidence/`

The investigation ledger from #127 is NOT reused. A separate chain
ensures investigation and execution-intent discussions can never be
silently conflated.

- Directory `0700`, record files `0600`, created exclusively with
  `O_CREAT|O_EXCL|O_NOFOLLOW`, each file fsynced.
- Every record is **immutable, append-only**, numbered by sequence. It
  binds its predecessor SHA and its own SHA, protected baseline manifest,
  full journal SHA+revision, saved draft SHA, full HA admission SHA,
  target entity, fixed one-action identifier, hashed admin ID and UTC
  timestamp.
- An independent `head.json` stores the confirmed count, last SHA and
  baseline ID. It is published only AFTER the record has been written
  and fsynced, using a private temporary file and `os.replace` with
  directory fsync.
- Every read verifies: exact file schema, private permissions, all record
  hashes and links, sequential filenames, head count and anchored SHA,
  expected baseline, and absence of unexpected temporary files.
- If power is lost between writing the record and publishing the head,
  the mismatch is a **hard refusal**. There is NO automatic repair,
  deletion or inferred success. The operator must investigate.
- If the final record disappears, the independent head/count detects
  that truncation, unlike a purely self-contained chain.
- A malicious privileged writer able to rewrite **all** storage including
  the head can still forge SHA-256 hashes. This ledger is **not** a
  digital signature, third-party timestamp or immutability guarantee
  against root-level tampering. Offsite append-only backups would be
  required for that threat model.

The disk append also holds the existing **cross-process HVLS storage
lock** and rechecks protected baseline and YAML bytes, journal digest,
journal revision, phase, absence of a prior operation for the selected
entity, saved draft digest, imported choice, expected history length and
head. An unrelated entity's pending intent does not automatically block
one safe local historical audit entry.

The raw admin ID, credential, confirmation token, original YAML content,
Google service-account details, aliases and exposure names are NOT stored
in the audit record. Only a SHA-256 admin reference is kept.

## Reading history does NOT revalidate live HA

History returns the last 50 (max 1,000 total), verifies the complete
on-disk chain and explicitly sets
`historical_evidence_not_revalidated_against_live_ha:true`.
A historically correct record can be stale; the HA native registry can
change later or change and return to the same value (ABA). Neither is
an execution grant, and neither implies Google Home parity.

## Mandatory negative contract

Every successful audit response includes:
```json
{
  "approval_intent_is_not_execution_authorization": true,
  "independent_execution_authorization_not_implemented": true,
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

The previous #131 volatile rehearsal remains separate and non-persistent.

No executor imports or consumes this module. Even presenting an existing
confirmed audit record to a future stage endpoint **must never** be
interpreted as an authorization. A *future, separately reviewed* stage
transaction must define its own scoped, durable, single-use execution
capability, a write-time native/production YAML CAS, and explicit crash
reconciliation including external side effects.

## Regression coverage

- Real protected baseline+journal and private audit files, sequence,
  immutable prior records, exact permissions, SHA chain and independent
  head; verify original YAML, journal and native labels remain unchanged.
- Delete the last record, corrupt the anchored head, corrupt a record,
  swap in a symlink, create an interrupted next file, leave a pending
  head temp, widen file/directory permissions; all are refused.
- Two admins with the same old head: only the first append succeeds.
- Change journal phase/revision, introduce same-entity pending intent,
  change source YAML bytes, change saved choices; no audit write.
- Another entity's pending journal intent does not block an otherwise
  eligible, independently verified local audit.
- Two-phase admin-only façade: one-use token, expiry, theft, replay,
  superseding admin, canceled confirmation, evidence/ledger drift.
- Real Home Assistant Core 2026.11 sandbox: write and reload the audit
  alongside actual protected YAML, journal and HA native registry, then
  verify no side effects. The sandbox substitutes a **synthetic saved
  draft** for this storage-only exercise and does not claim a full
  production admission handshake.

There is no new frontend execution button. Stage/cutover remain dormant.
The new API is admin-only and intentionally audit-only.

Follows #103, #111, #113, #118–#131.
