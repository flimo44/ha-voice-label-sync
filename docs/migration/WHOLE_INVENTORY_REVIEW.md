# PR #115 — Full-inventory hypothetical cutover review (read-only)

This is a **dormant, non-authorizing comparison** of projected original
Google Assistant exposures against a **simulated** label migration and an
exact-value metadata overlay from PR #114. It introduces no WebSocket,
frontend action, service, scheduled job or background task. It changes
neither the live HA registry, nor the original YAML, nor the HVLS V1
generator/preview, nor the PR #111 journal.

## Why another review?

The PR #112 planner proposes safe label additions. PR #113 records actual
single-label staging, under separate explicit authorization and CAS. PR #114
reconstructs original name/room/aliases in a private preview.

These independent parts are not by themselves evidence that changing
`expose_by_default` to `false` and replacing the original manual
`entity_config` will preserve the *complete effective exposed set*.
Existing labels, implicit exposure, exclusions, invalid entities, and
customized names may affect different parts of this set.

The PR #115 helper joins those facts **without authorizing cutover**.

## Review API contract (internal only)

`migration_cutover_review.build_readonly_migration_review(...)` takes:

- a sanitized, previously captured PR #110 diagnostic;
- explicit PR #112 per-entity decisions;
- native entity-registry identity, membership and eligibility observations;
- a copied snapshot of the four HA registries captured on the HA event loop;
- the configured label and **the actual V1 `DEFAULT_DOMAINS`**;
- the exact manifest SHA of the existing PR #111 protected source baseline.

**Call on an executor with copied registries**: no HA registries may be
accessed from a worker thread. This PR does not register that caller. The
inputs must come from the same controlled review request; it is not a trust
boundary or a substitute for an admin-authenticated endpoint.

The helper:

1. Copies the registry data and simulates selected Import label additions
   only in that copy, reporting any eligibility or label-membership drift.
2. Renders normal HVLS V1 selection and YAML into memory from the copy.
3. Executes PR #112's conservative review planner unchanged, including
   its metadata-related staging blocks.
4. Verifies every current original YAML file still matches the protected
   baseline and validates the supplied manifest SHA.
5. Reconstructs original metadata from the protected source, verifies
   that the set of explicit manual entries is identical to the diagnostic
   source inventory, and applies PR #114's internal **private** overlay.
6. Compares *all* diagnostic entities' disk-projected
   `exposed/not_exposed/unknown` before status with whether they appear in
   the hypothetical default-deny target YAML.
7. Signals exposure loss, new exposure, unknown source exposure, exclusions,
   unapproved generated devices, missing Keep behavior, pending destructive
   choices, drift, and customized imports that PR #112 still forbids staging.

The returned report contains **only entity IDs, field names, reason codes,
counts, and a preview SHA**. Raw Google names, aliases, rooms, YAML, service
account and PIN never appear. Raw preview data is held privately in memory
during this helper call and discarded. The preview fingerprint is **not an
authorization token**; it must be freshly verified when cutover is eventually
implemented.

An entity with invalid manual metadata does not hide unaffected
entities from the preview; the affected entity remains `needs_review`.
A missing/corrupt baseline or stale original YAML is a **global blocker**.
An unrelated label that would appear in the generated output without
explicit review blocks the whole candidate: no guessed de-exposure.
Unknown exposure is never silently considered unexposed.

## Interpretation

The strongest successful state is
`hypothetical_preview_consistent`: the current *synthetic comparison*
finds no exposure difference for its inventory and decisions.

It is **not** approval to stage labels, and not proof of true loaded GA
policy, Google Home devices, room assignments, aliases or routines.
`read_only=true`, `apply_allowed=false` and `cutover_allowed=false`
are **unconditional**. Missing metadata, unknown entities and unimplemented
Keep/Disable/Remove semantics still require separate approved work.

As before, no automatically forced YAML edit, reload or backup deletion
is allowed. User-approved manual cutover, current HA config checks, output
protection, runtime validation, rollback and restart recovery are future
PRs. PR #112's customized-entity staging guard remains unchanged.

## Validation

Tests exercise full-inventory parity, explicit exclusions, exact original
names/rooms/aliases (and their non-disclosure), 70 valid / 10 invalid
entities, stale source/baseline, unforeseen existing labels, label drift,
Keep and destructive decisions, unknown before exposure, and zero live
writes. Synthetic HA registry snapshots are not equivalent to actual
HA version compatibility tests. Real isolated HA tests are required
before enabling migration controls.

Tracking #103; follows #110–#114.
