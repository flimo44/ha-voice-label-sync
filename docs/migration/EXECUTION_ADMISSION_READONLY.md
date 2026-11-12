# PR #130 — Read-only execution admission contract and proof inventory

After #129's journaled, full native-label-set CAS, the next problem is NOT
how to call that dormant writer: it is proving that an individual stage
invocation has a **new, independent, explicit execution authorization**.

Existing artifacts serve different roles:

- A **saved draft** records decisions but is *unapproved* (#118).
- A **review attestation** records that risks were read, not permission to
  execute (#119).
- An **investigation ledger entry** records recovery investigation, not
  stage/retry/ACK/rollback authority (#127).
- A native **CAS capture** checks current HA facts, but is not a credential
  or guarantee about external events (#128–#129).
- A **journal intent** records a transaction boundary, not permission to
  replay after interruption (#111, #123).

**This PR does not implement execution authorization or staging access.**
It defines a read-only admission diagnostic that can never return a grant.

## New admin-only WebSocket

`ha_voice_label_sync/get_migration_execution_admission_preview` with a
single `entity_id` argument, available only to a Home Assistant admin.

The server builds its own evidence; browser-supplied plans, draft content,
baseline hashes, and "I approve" booleans are NOT accepted:

1. Load the protected saved draft and verified journal from disk.
2. Recompute the full server-side admin review from fresh HA registries,
   loaded manual Google Assistant policy, the staged-label projection and
   indirect-consumer audit.
3. Load the review attestation against this **new** review evidence.
4. Verify the immutable YAML baseline and original source bytes.
5. Capture the native entity's stable identity and complete label set on
   the Home Assistant event loop, using #128's read-only CAS guard.
6. Re-read the journal and draft. Fail shut if either changed.
7. Reassess native label membership after disk I/O; a change also fails.
8. Produce **only sanitized per-entity reason codes and explicit missing
   independent authorizations**.

No original Google YAML, aliases, names, rooms, PINs, project IDs, raw
exception details, review draft choices for other entities or credentials
appear in the response.

The scan is **not atomic across independent processes** and can never
guarantee the absence of an ABA change. Future write-time admission must
repeat every relevant comparison at its actual journal/native update point.

## Two deliberately separate classes of blockers

The report has:

- `technical_blockers`: specific observations for this entity and
  protected baseline/draft/review/attestation/journal agreement.
  Examples: unverified source, stale draft, changed loaded Google policy,
  inconsistent label identity, prior journal operation for this entity.
- `authorization_blockers`: **permanent in this PR**, even when all
  current technical evidence looks coherent:
  - `independent_execution_authorization_not_implemented`
  - `write_time_disk_and_native_transaction_not_proven`
  - `external_event_aba_and_google_side_effects_unverified`

A purely hypothetical "technically consistent" report has status
`hypothetical_prerequisites_consistent_no_permission`, never
`ready_to_execute`. In all situations:

```json
{
  "read_only": true,
  "technical_prerequisites_consistent": false,
  "review_history_is_not_authorization": true,
  "attestation_is_not_authorization": true,
  "investigation_ledger_is_not_authorization": true,
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

`technical_prerequisites_consistent` may be `true` **in the testable
hypothetical case**, but all authorization and execution booleans remain
`false`. A clean history record can neither remove technical errors nor
satisfy an authorization condition. An invalid history can add a diagnostic
reason but cannot elevate permissions.

If an entity has a local problem, its specific reasons are reported
without automatically assuming other entities are unusable. However,
unsafe global Google policy/source changes remain explicit blockers.

## Regression

The tests exercise:

- A technically coherent synthetic review where the result still forbids
  execution and never returns an execution token.
- Expired draft, changed review token or journal phase/revision, changed
  source/baseline, conflicting policy, duplicate/missing proposal, stale
  attestation, native entity/label mismatch and malformed evidence.
- An investigation ledger that fraudulently claims to authorize an
  operation; no permission is ever issued.
- Multiple entities, including an unrelated faulty choice that should
  not hide valid local evidence.
- Server orchestration with a **second read** of journal/draft and
  post-read native assessment. Injected changes are refused.
- The official HA Core 2026.11 isolated sandbox also feeds the policy the
  genuine native HA registry and protected on-disk journal following the
  #129 test interruption. The unresolved operation is explicitly denied.
  That sandbox scenario uses an intentionally incomplete synthetic review
  envelope: it is not a complete live production admission proof.
- Static route tests confirm the new WebSocket is admin-only and contains
  no call to the dormant stage executor.

## Still required before ANY real execution

A separately designed and reviewed approval mechanism must bind a single
admin action to one candidate, one latest server-controlled reviewed plan,
the protected baseline/journal, scope, a single-use expiring authorization
and durable audit trace. It must then validate this authority **without
TOCTOU gaps** at the actual intent-before-write/native-CAS boundaries,
including crash and external-event ambiguity. Merely passing this
diagnostic must never be accepted by a future write-capable service.

The dormant `stage_one_approved_label` remains unreachable from
WebSockets, services, startup hooks and the UI. Its existing
`admin_approved=True` internal parameter **is not** an audited,
admin-identity-bound authorization protocol.

Follows #103, #111, #113, #118–#129.
