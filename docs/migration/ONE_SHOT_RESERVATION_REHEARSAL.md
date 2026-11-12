# PR #133 — Durable one-shot reservation/consumption rehearsal

After #132's **non-executable** human approval-intent audit, this PR
builds a **second independent, durable rehearsal** of the one-shot
transaction boundary. It is NOT an execution authorization, does NOT
issue an executable token and does NOT stage a label.

This step deliberately models a critical real-world failure mode:
**an interrupted operation must never be automatically replayed just
because the recorded intent still looks pending**.

## Distinct concepts, no privilege promotion

1. **Review attestation (#119)**: confirms an administrator saw risks,
   never executable.
2. **Investigation history (#127)**: records uncertain crash investigation,
   never executable.
3. **Approval-intent history (#132)**: records a human's stated intent,
   never executable.
4. **One-shot REHEARSAL (#133)**: records a synthetic reservation and its
   irreversible synthetic "burn", never executable.

There is **no automatic conversion from items 1–4 into staging rights**.
None is imported or consumed by the dormant stage executor. The
`admin_approved` boolean in that low-level writer remains unsuitable as
a public authorization protocol.

## Admin-only WebSockets (no stage)

- `get_migration_one_shot_rehearsal_history`: read-only, full-chain verified.
- `prepare_migration_one_shot_rehearsal`: prepare an ephemeral admin-bound
  challenge; **no disk changes**.
- `confirm_migration_one_shot_rehearsal`: explicit confirmation writes
  exactly one durable `reserve_non_authorizing` event.
- `burn_migration_one_shot_rehearsal`: explicit human acknowledgement
  irreversibly writes exactly one `burn_without_execution` event,
  **without** invoking HA entity updates, journal ACK, migration retries,
  rollbacks, cutover or any external service.

Only `stage_one_label_addition` for one validated entity is accepted as
a *rehearsal action identifier*, NOT as permission to carry it out.

### Preparation and confirmation

The server obtains an entirely server-owned #130 admission review (fresh
YAML/baseline, saved draft, attestation, journal, native HA registry,
loaded Google Assistant policy and indirect consumers). A review must
report `hypothetical_prerequisites_consistent_no_permission`.

A separate protected disk read verifies:
- current journal/draft SHA,
- independent approval-intent ledger (#132) with a *matching* full
  admission SHA for the entity and fixed one-label action,
- the one-shot ledger head and event count.

The #132 record is **context only**, not execution authority. Its digest
being present never removes any authorization blocker.

The server immediately repeats the full #130 preview. If changed, it
refuses. The 180-second random challenge is bound to authenticated admin,
entity, action and the complete protected evidence/head. A competing
preparation for the same entity supersedes the old one.

The confirmation must set both `confirmed=true` and
`acknowledge_external_uncertainty=true`. A correctly authenticated
challenge is consumed **before** the evidence is rebuilt. Drift,
tampering, expiry or HA restart requires a fresh preparation; nothing
is automatically replayed.

The only disk side effect is a **reserve event**. The disk writer holds
HVLS's existing cross-process lock, rehashes the protected journal,
checks original YAML bytes and saved draft, validates approval-intent
context and compares the exact expected one-shot ledger head/count.
An already-active reservation for the entity blocks a second one.

### Burning the receipt

To burn a receipt, the admin explicitly confirms again with current
HA/disk evidence. The disk writer rechecks under the cross-process lock
that the receipt exists, is owned by the same hashed admin, is within
its **600-second lifetime**, matches entity/action/journal/draft/admission
and approval-intent hashes, has never been burned, and is the exact
snapshot expected by the caller.

It then appends `burn_without_execution`. The burned receipt remains
in immutable history; a second burn, another admin, an expired receipt
or a stale disk head is refused. **Even successful burning executes
NOTHING.** It only proves that an irreversible, single-use bookkeeping
barrier can be persisted safely.

Expiry is based on the host's wall-clock time. It is NOT a security-proof
monotonic time source across restarts or manual clock changes; it is
sufficient only for this nonauthorizing rehearsal. Never use its
expiration alone as a real execution authorization.

## Storage consistency / crash handling

Path:
`.storage/hvls_migration/execution-one-shot-rehearsal/`

- Strict `0700` directory, `0600` files, `O_EXCL` create-only, no
  symlinks, explicit fsync of each event and directory.
- Immutable numbered events linked by SHA-256, fixed schema, fixed
  action and purpose, hashed admin identity (never raw IDs or secrets).
- Separate `head.json` anchored by total event count, last event hash,
  and protected baseline. The HEAD is published only **after** the new
  event is fsynced.
- Every read checks the FULL chain plus HEAD and event transitions:
  reservations must be unique, burns must reference one existing,
  not-previously-burned reservation, preserve its scope/evidence, and
  occur within the recorded lifetime.
- An interrupted event, unexpected temp file, deleted last event, bad
  link, widened permissions or other corruption fails closed on both
  reading and writing. **No auto-repair or deletion**.
- Only the last 50 receipts are presented via the admin API (up to
  2,000 event records). Older receipts remain verified but cannot be
  burned using that bounded public listing. This is a deliberate
  conservatism rather than silently bypassing review.

**Limitations:** SHA chaining plus a head is NOT a digital signature.
An actor with unrestricted filesystem write access may rewrite all
records and the head; deleting the entire rehearsal directory can
also remove its internal anchor. A production authorization system
needs separately protected keys, rollback resistance, external backup
or other independent trust anchors. An in-process HA lock and an HVLS
cross-process disk lock do not make external subscribers/Google Home
atomic, nor eliminate ABA changes between observations.

## Proving the negative boundary

All successful responses have:

```json
{
  "only_a_non_executing_rehearsal": true,
  "approval_intent_is_not_execution_authorization": true,
  "receipt_is_not_execution_capability": true,
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

The native HA registry, original handwritten Google YAML and migration
transaction journal are not modified by this feature. There is NO
staging service/button/startup hook.

## Tests

- Real disk-backed private baseline, approval-intent audit and synthetic
  draft: persist reserve, persist burn, restart-style reload, reject
  replay, other administrator, active duplicate and stale ledger head.
- Corrupt independent head, delete last record, truncate another record,
  symlink, unexpected temp file, uncommitted next event, unsafe
  permissions, missing sequence; deny all reads/writes.
- Source YAML drift, changed journal/draft or changed approval context;
  refuse burn. Expired receipts never burn.
- Admin-only two-phase API: fresh server evidence, full digest, TTL,
  forged/cross-admin/reused challenges, changed native labels, changed
  review policy, concurrent head and invalid actions.
- Official Home Assistant Core 2026.11 sandbox: synthetic audit, actual
  protected on-disk journal + actual native HA registry, durably reserve
  and burn, reject repeat burn; source YAML, labels and journal remain
  exactly as they were.

The isolated HA Core storage test **substitutes a synthetic saved draft
and evidence fingerprint**. It proves no side effects and the durability
of the bookkeeping mechanism, not complete real Google Home admission.

### Beta gate still to clear

Before even a private beta may perform a real label stage, separately
prove an authenticated, revocable, one-entity execution permission with
a truly protected monotonic replay barrier, atomic operation admission
at the journal intent point, write-time native CAS and rigorous crash /
external event reconciliation. The #133 synthetic receipt is expressly
**forbidden** as that permission.

Follows #103, #111, #113, #119, #123–#132.
