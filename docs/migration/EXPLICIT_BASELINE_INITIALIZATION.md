# PR #117 — Two-step protected baseline initialization (admin only)

This PR changes **only** the protected migration infrastructure. It adds an
explicit initialization workflow, not a Google Assistant migration.

## Administrator flow

1. Open **Migration**, inspect the read-only diagnostic and per-entity issues.
2. Click **Review protected backup**. An administrator-only WebSocket command
   `ha_voice_label_sync/prepare_migration_baseline` re-discovers the current
   original Google Assistant YAML on an executor. It refuses ambiguous global
   source topology, duplicate keys and unresolved source files.
   Local per-entity issues do not prevent backing up valid original bytes.
3. The server returns a cryptographically unpredictable **single-use**
   confirmation challenge, tied to the HA administrator user ID, the exact
   discovered source hashes and the current rules. It expires after five
   minutes, is stored **only in HA process memory**, and is replaced on each
   new prepare by the same user. No baseline or journal files are written.
4. Click **Confirm backup creation**. A native confirmation asks the user
   whether to protect the displayed number of source files and initialize
   the journal. Cancel means no write, no request to initialize.
5. The admin-only `ha_voice_label_sync/initialize_migration_baseline`
   command requires `confirmed: true` and the matching challenge.
   The server consumes that one-use challenge *before* filesystem work.
   After a fresh discovery, if any source hashes/rules/inventory changed,
   it refuses without creating a baseline.

On success, the existing PR #111 code copies the **original raw source
bytes exactly once** into `.storage/hvls_migration/baseline` and checks
all SHA256 hashes, private permissions, source directory topology and
cross-process mutation lock. It then creates an fsynced, CAS-protected
`journal.json` in the `baseline_ready` phase. Neither file contains
a migration approval; the raw backup can contain private YAML, so it
**never appears in WebSocket responses, logs or UI**.

A pre-existing verified baseline is returned only if its manifest
agrees with the fresh source; it is never overwritten. An existing
journal is never reset, including a journal already in a later phase.
Corruption, stale locks, changed originals or interrupted staged copies
cause refusal/manual inspection, not silent repair.

## Recovery from partial failure

The two durable steps cannot be one atomic transaction across filesystems.
If the immutable baseline is created but journal initialization fails,
the endpoint reports `baseline_verified_journal_unavailable` and
`needs_manual_review: true`. The baseline is **kept** so its original
bytes are protected. It can be rechecked after the reason for failure
has been addressed, with a new explicit confirmation; an existing
journal will never be reset. Failures before baseline verification
return a generic safe WebSocket error advising inspection (because a
partial step may have occurred). No silent fallback to a new baseline.

The in-memory challenge disappears on a Home Assistant restart.
An expired, replayed, mismatched or cross-admin challenge is rejected.

## Safety boundaries

- **No** live entity registry mutation, label import, YAML production
  write, Google Assistant reload or change to the V1 Preview/Apply path.
- **No** automatic initialization on opening or refreshing the tab.
- The existing migration review remains read-only. Prior per-entity
  decisions are still temporary and non-authorizing.
- This step does **not** validate active Google Home state or loaded-policy
  equivalence. A verified backup is **not** exposure parity.
- `apply_allowed: false` and `cutover_allowed: false` are invariant.
- All responses include safe counts, statuses and hashes, never the
  source YAML, custom names, aliases, secrets, or original file paths.

The first integration tests use synthetic YAML and a fake HA runtime.
Tests cover atomic backup and journal creation, original-byte integrity,
permissions, idempotence, phase preservation, per-admin isolation,
expiry, replay, stale YAML, bad topology, corrupt baseline and
partial journal failure. A real isolated HA installation is still
required before enabling any label staging or Google cutover.

Tracking #103. Builds on #110–#116.
