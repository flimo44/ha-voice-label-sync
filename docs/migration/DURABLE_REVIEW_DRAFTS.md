# PR #118 — Durable administrator migration decision drafts (non-authorizing)

## Scope

The protected baseline and journal created in #117 are now accompanied by
an **optional, explicitly saved decision draft**. This preserves human
selection progress across HA/browser restarts, but **does not authorize
execution**. No label, original Google Assistant YAML, loaded Google
Assistant policy, integration settings, or journal phase is changed.

The existing Migration tab gains two buttons:

- **Restore saved selections**: administrator-only read of the protected
  private draft, followed by a *fresh* diagnostic/simulation of the
  restored choices. Restoring is never approval or execution.
- **Save my selections**: requires a currently reviewed, non-dirty
  simulation and a native confirmation. It reads the latest protected
  revision and attempts a CAS update; unsaved changes in another
  administrator's version are not silently overwritten.

Neither opening the tab nor changing an entity selector writes a draft.
The two new WebSocket commands are administrator-only:
`ha_voice_label_sync/get_migration_decision_draft` and
`ha_voice_label_sync/save_migration_decision_draft`.

## Private storage and traceability

The file `.storage/hvls_migration/review-draft.json` has an allow-listed
schema with:

- `purpose: admin_review_draft_non_authorizing`, schema and revision;
- the immutable protected baseline manifest SHA-256;
- the journal **revision and phase** at review;
- source and reviewed-plan SHA-256 evidence;
- only explicitly entered valid `import`, `keep`, `disable`, `remove`
  decisions and optional metadata/acknowledgment fields;
- a one-way hash of the saving administrator's HA user ID;
- UTC timestamp.

Raw Google Assistant YAML, user names, rooms, aliases, PINs, secrets,
service account keys and arbitrary extra client fields are **not
stored**. The file uses 0600 permissions, safe file validation and
atomic fsync/rename under the same cross-process mutation lock as
the baseline and journal. Its data is never imported by the existing
PR #113 label executor, and no new staging API is provided.

## Optimistic concurrency and drift

The save endpoint **recomputes** the server diagnostic, native HA
registry facts and reviewed plan; it does not trust browser-supplied
diagnostic/plan data. It requires the current plan SHA to match
the previously reviewed SHA. Under the cross-process lock it
independently checks:

1. Existing baseline and journal are valid and refer to one another;
2. baseline SHA equals the reviewed baseline;
3. journal phase remains `baseline_ready`, has no operations and its
   revision equals the expected revision;
4. all *current* original YAML files still exactly match the baseline;
5. stored draft revision equals the administrator's expected revision
   (new draft revision `-1`, then monotonic revision 0,1,2...).

The frontend refuses to overwrite an existing unseen draft; to replace
it one must restore it, inspect and refresh the review first. Lost
responses cannot be assumed successful; the administrator must read
the protected status again before retrying. On file corruption,
unknown action, symlink, stale source, changed baseline, lock conflict,
journal drift or mismatched revision, **fail closed** without clearing
the prior valid draft.

On reload, a draft with a changed journal revision is marked
`stale_journal`; one with changed original YAML evidence is marked
`stale_source`. Its choices remain recoverable for a **new review**,
never a migration authorization.

## Important difference between a draft and approval

A saved choice can still be invalid for actual migration:
a customized entity may need special metadata preservation, a Keep
choice may lose effective exposure, an explicit exclusion must remain
excluded, or a Google Home routine may be unknown. **Those
unresolved entries do not prevent the user from remembering work**.
They still block the appropriate future mutation. Saving is not the
same as marking any reviewed state as safe to apply.

This PR intentionally does not change the existing executor,
does not advance a migration journal phase and never sets
`cutover_allowed: true` or `apply_allowed: true`.

## Validation

Unit/regression tests cover actual temporary HA config directories,
raw original YAML unchanged, exact restoration, source and baseline
drift, journal phase drift, two-admin revision conflicts, corrupted
and symlink draft files, permissions, atomic replace failure, bounded
allowlisted choices, lack of data leakage, stale reload, and
frontend confirmation/no-auto-write cases.

No assumption about Google Home parity is made; isolated HA integration
testing will remain required before enabling label staging.

Tracking #103; follows #111–#117.
