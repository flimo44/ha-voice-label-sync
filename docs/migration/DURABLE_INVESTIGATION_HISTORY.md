# PR #127 — Durable, append-only recovery investigation history

## Scope: human investigation evidence, NOT permission to recover

Following #126's ephemeral prepare/confirm protocol, this PR introduces a
**distinct, explicitly authorized durable recording operation**.

An administrator may now choose **Record this investigation choice** beside
an unresolved, protected migration operation in Home Assistant's Migration
tab, and explicitly confirm. The only authorized write is **one new audit
record**, never a label modification, journal acknowledgement, retry,
rollback, YAML generation, Google Assistant reload or cutover.

The existing **Test my decision** button remains a completely separate
non-persistent simulation.

The three permitted choices are still *investigation dispositions only*:
`inspect_external_effects`, `quarantine_for_investigation`,
`defer_until_further_evidence`. There is no "accept completed", "replay",
"rollback", "stage" or "cutover" option.

### What a successful confirmation writes

Inside existing private Home Assistant storage
`.storage/hvls_migration/recovery-investigation-records/`, the integration
creates one file `000001.json`, `000002.json`, etc., using **O_EXCL**
(create-only), 0600 permissions and explicit `fsync` on the file and its
0700 parent directory.

Every bounded, schema-validated record stores:
- record sequence; previous record SHA-256; this record's SHA-256;
- protected baseline SHA-256; validated *complete* migration journal SHA-256
  and revision; full observed read-only recovery evidence SHA-256;
- entity ID and enum investigation disposition;
- SHA-256 of the administrator ID (not the raw identity);
- UTC timestamp and an explicit **NOT AUTHORIZED FOR EXECUTION** purpose.

Never store original YAML, aliases, Google names, rooms, PINs, project
credentials, raw administrator IDs or challenge tokens.

The chain allows corruption, incomplete writes, gaps, unauthorized edits
that do not recompute the whole chain, and unexpected files to be detected.
It is **not a cryptographic digital signature** against a malicious actor
with full filesystem write access who can rewrite all records and hashes;
separate backups/append-only filesystem controls are required for that
threat model.

### Two-phase confirmation and CAS

Admin-only WebSockets:
- `prepare_migration_investigation_record`
- `confirm_migration_investigation_record`
- `get_migration_investigation_history` (read-only, last 50 entries)

Prepare refuses source YAML drift, uncertain/changed journal, wrong phase,
an already-settled entity, missing entity or inconsistent evidence, but
*allows unaffected entities to be investigated* when a different entry
has its own isolated failure.

The challenge is one-use, expires after 180 seconds, and is scoped to the
exact admin ID, entity, choice, SHA-256 of the complete validated recovery
snapshot, and the expected head and length of the immutable audit chain.
Prepare does **not** create the ledger directory.

Confirm consumes the challenge before rechecking the full snapshot and
reading the protected history again. It refuses any changed journal, source
file, HA registry identity, label membership, selected entity, disposition
or audit-chain head.

For the one permitted append, the disk writer obtains the existing
cross-process migration lock, validates the entire audit chain, journal,
source files and baseline **again**, checks the expected count and head,
and creates exactly one file. A second admin trying to use the old chain
head is rejected even if their HA observation is unchanged.

Interrupted or malformed files are **never automatically repaired or
deleted**; attempts to read or append fail closed. A power loss during
file creation can leave an incomplete last record, which requires manual
investigation. No attempt is made to infer success from file existence
alone. The old migration transaction journal remains unchanged.

The in-process migration workflow lock and cross-process on-disk lock only
coordinate HVLS's own storage operations. They cannot guarantee atomicity
relative to all external HA integrations, files edited outside HVLS or
changes after the response. That is why **history is evidence, not
execution authority**.

### Reading and staleness

The Migration tab can inspect the protected history on demand, showing
up to 50 records from a maximum of 1,000. Every read revalidates the full
hash chain. The history API compares the historical full read-only
recovery hash with today's live HA observations; historical records become
`historical_stale_observation` or `not_revalidated` as appropriate.

A matching evidence hash is **not proof** that callbacks/Google Home were
synchronized, and does not grant staging, confirmation, resolution or
rollback privileges.

## Test coverage

- Both interruption boundaries in the real Home Assistant Core 2026.11
  *second interpreter*: one protected history file persisted, no changes
  to Google source YAML, HA label or transaction journal.
- Reused/expired/foreign-user token; changed entity/label membership and
  identity; source YAML drift; changed journal and competing admin append.
- Private directory/files, complete chain integrity, unexpected temporary
  file, symlink, changed record, file gap, permissive file and directory,
  invalid JSON and corrupted head; no automatic recovery from any anomaly.
- Frontend explicit two-phase consent, verified history, cancellation,
  forged authority flags and no accidental mutation WebSocket calls.

## NON-AUTHORIZATION INVARIANT

All success responses contain:
`execution_authorized:false`, `journal_ack_allowed:false`,
`retry_allowed:false`, `rollback_allowed:false`,
`stage_allowed:false`, `apply_allowed:false`,
`cutover_allowed:false`.

**No migration executor consumes this new ledger.** A future executable
recovery design must build a *separate, explicit* authorization and
write-time native-registry CAS, preserve externally visible side effects,
and safely reconcile the transaction journal under a new design/PR.
Do **not** treat a recorded investigation choice as such an authorization.

Refs #103, #111, #113, #119–#126.
