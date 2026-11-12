# PR #119 — Human review attestation, **not** execution approval

This PR adds a narrow third state to the assisted migration sequence:

1. **Choices saved** in the PR #118 protected draft — editable and resumable.
2. **Review attested** — an administrator confirms having examined the saved
   choices and the *current* simulated outcome, including **open anomalies**.
3. **Permission to execute** — **not implemented**, not implied by either
   previous state and never granted by this PR.

The attestation file is **NOT** a deployment token, a release gate, a stage
permission, a rollback permission or a Google Assistant cutover approval.
The dormant PR #113 label executor remains **unconnected**.

## Workflow

The Migration panel now has two separate buttons:

- **Check review status** (read-only): reloads the saved decisions, runs a
  fresh PR #110–#115 analysis with current HA-native registry facts, and
  checks whether a stored attestation still refers to those exact facts.
  The endpoint does not create or modify files.
- **Attest my review**: requires the draft to have been explicitly saved
  and the panel simulation refreshed. The backend independently reloads
  the saved draft and reruns the review; the panel requires the reviewed
  evidence to match what is displayed. A native confirmation then asks
  the administrator to record the review.

If there are unresolved per-entity anomalies, global blockers, missing
effective exposure equivalence, unsafe label staging, or unimplemented
destructive decisions, the confirmation **explicitly states that issues
remain open**. Recording this observation does not make those issues
safe or resolve them. The admin must acknowledge open issues to save
that form of attestation.

The status is either:

- `reviewed_without_detected_issues`: the bounded **hypothetical**
  simulation reported no currently known blocker. It is not proof of
  Google Home parity.
- `reviewed_with_open_issues`: open problems were explicitly examined,
  but they remain open and must still be resolved/re-reviewed separately.
- `stale_review_attestation`: the saved draft revision, observed HA
  review evidence, journal, original YAML, or baseline is no longer
  verifiably the same; the previous attestation does not count as a
  current review.
- `not_attested`: no durable review record exists.

The data file `.storage/hvls_migration/review-attestation.json` is private
(0600), stored with atomic fsync/rename under the PR #111 inter-process
mutation lock. It holds only:

- schema / purpose `review_attested_not_authorized` / revision;
- protected baseline manifest SHA-256;
- unchanged journal revision and saved draft revision;
- exact review-plan token and SHA-256 of the full server review,
  including all local anomaly reason codes and candidate-preview digest;
- hashed administrator ID, UTC timestamp and open-issue acknowledgement.

No raw Google metadata, PINs, secrets, names, rooms, aliases, original
YAML, or registry dumps are persisted or sent by this attestation API.

## Revalidation, concurrency and refusal

The admin-only read and write WebSocket commands:

- `ha_voice_label_sync/get_migration_review_attestation`
- `ha_voice_label_sync/attest_migration_review`

Both compute evidence from *saved server-side decisions*, not from
browser-provided rows. The write compares the evidence fingerprint and
current saved draft revision, verifies the journal is still
`baseline_ready` and has no pending operations, and rehashes every
original YAML file against the protected baseline under the mutation
lock. It also CAS-checks the current attestation revision, refusing to
silently overwrite another administrator's observation.

A previous attestation is treated as stale whenever fresh evidence is
missing or differs. A restart that loses a temporary browser state
cannot upgrade a saved draft or a stale attestation into authority.

The UI never sends the attestation command automatically and does not
turn on any migration Apply/Staging/Commit buttons. Cancelling the
confirmation is read-only.

**Invariants:** `apply_allowed:false`, `cutover_allowed:false`,
`google_home_state_verified:false`,
`review_is_not_execution_authorization:true`.

Tests include a synthetic protected baseline/journal, committed drafts,
unresolved errors and explicit acknowledgments, stale/missing evidence,
changes to HA review evidence, draft/journal/source drift, corruption,
symlink refusal, concurrent reviewers and frontend cancellation.
Real isolated Home Assistant tests and verified Google Home operation
are still required before developing a separate privileged stage
authorization.

Tracks #103, follows #110–#118.
