# PR #113 — One-entity journaled label staging, dormant

The single-entity staging entry point is
`migration_stage_executor.stage_one_approved_label`. **No Home Assistant
WebSocket, service, background task, frontend, startup callback or ordinary
V1 operation invokes it.** No migration occurs just by installing HVLS.
This is a *low-level building block*, not a complete safe migration.

## Explicit review requirements

A future admin-only UI is responsible for authenticating and confirming
the administrator's decision. The input flag `admin_approved=True` is a
caller assertion, **not a security boundary** and must never be exposed as
a user-controlled bypass. The caller supplies:

- one selected `entity_id` with the complete decision map;
- `expected_review_token_sha256` from a separately reviewed PR #112
  preflight; a fresh PR #110 diagnostic and native registry catalog
  must reproduce exactly the same plan token;
- verified protected baseline manifest digest from PR #111;
- CAS journal revision and unique operation ID;
- configured HVLS label (resolved again to one native HA label ID).

The journal must already have been intentionally moved to
`labels_staging` by a separate reviewed, admin-authorized workflow.
This PR **does not initialize the baseline, initialize the journal, move
its phases, or authorize staging**. Those remain separate future steps.

## Order of one operation

1. Serialize with the shared in-process HVLS workflow lock.
2. Re-read Google Assistant disk+loaded-runtime diagnostic, registry entry
   IDs, native label state and eligibility.
3. Re-run the reviewed per-entity planner; compare the exact plan SHA.
   Unknown metadata, exclusions, unsupported categories and local errors
   never yield a proposal.
4. In an executor, verify the protected baseline against its requested
   digest, inventory and every current original YAML file.
5. Verify journal revision and staging phase; refuse any second operation
   for an entity with any existing journal operation.
6. Persist a **durable `intent`**, including the native registry entry
   ID, before making any HA label change.
7. Rehash all original YAML after intent persistence. If changed, stop;
   do not mutate labels; the pending intent requires manual recovery.
8. Back on the HA event loop, without an `await`, resolve label ID and
   recheck native entity identity, label membership, eligibility and exact
   delta. Add **only** the selected HVLS label to the existing label set.
   Verify the returned native registry state.
9. Persist the post-write `applied` journal state. A failure here
   intentionally leaves the intent **unconfirmed**, not automatically
   retried or rolled back.

The result deliberately has
`cutover_allowed:false`, `metadata_preservation_verified:false` and
`google_home_state_verified:false`. HA entity registry writes schedule
storage persistence according to Home Assistant's own behavior: a returned
write is not a claim of durable Google Home sync or configuration cutover.

## Safety boundaries

- Only positive proposed additions may be staged. No automatic removal,
  destructive Keep/Disable/Remove, or imported name/room/aliases changes.
- A custom Google name, room or alias requires a separate metadata writer
  and a verified effective-exposure diff **before** later cutover.
- No edits to `configuration.yaml`, includes, production HVLS generated
  output, `google_assistant.reload`, or other entity labels.
- The helper refuses source drift, a different baseline, stale review token,
  stale journal revision, duplicate entity operation, HA identity change,
  eligibility drift, or unexpected native label membership.
- A failed entity does not implicitly delete unrelated entities. A
  pending intent remains visible for subsequent administrator review.
- Source rehashes narrow the race with manual YAML edits but do not
  provide an OS-level lock against external editors between hash and
  registry mutation. A later manual cutover still needs fresh CAS.
- The existing HVLS per-entity WebSocket action does not use this journal
  and remains unchanged. The final UI must coordinate with it or recheck
  the native CAS so concurrent edits cannot silently be overwritten.
- Approvals and backend input shapes must come from trusted admin-only
  controls, not arbitrary WebSocket fields. This helper alone does not
  authenticate a user.

## What the tests establish

Regression and failure-injection checks cover intent-before-write,
source changes before and after intent, stale plan, corrupt/missing baseline,
registry identity/label conflicts, explicit exclusions, metadata, pending
operations after acknowledgement failure, and preservation of unrelated
labels. Fake HA objects are used in unit tests; **this is not yet certified
against an isolated real Home Assistant instance**.

Before enabling UI: prove the HA native registry APIs across supported HA
versions, bind explicit authorization to the reviewed plan and journal
phase transitions, implement metadata preservation, reconcile interrupted
operations, verify generated YAML semantics, manual cutover and rollback,
then inspect Google Home devices, names, rooms and routines.

Refs #103, #110, #111, #112.
