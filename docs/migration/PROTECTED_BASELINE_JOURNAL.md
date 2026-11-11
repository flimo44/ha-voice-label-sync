# PR #111 — Protected baseline and crash-safe journal

This implementation is **dormant**. No WebSocket, service, UI, label
writer, Google Assistant reload, or normal HVLS V1 Apply path calls these
modules. They cannot migrate anything by themselves.

## Protected baseline

`migration_baseline.capture_baseline(config_dir, discovery)` accepts
only a resolved, unambiguous manual Google Assistant YAML discovery report.
It verifies source paths, rejects symlinks and out-of-root includes, and
rechecks SHA-256 values against the discovery report. It then captures the
**exact original bytes** of `configuration.yaml` and all successfully
resolved YAML includes (preserving comments, formatting and `!secret`
references, without following those secret references).

Copies are stored under
`<ha-config>/.storage/hvls_migration/baseline/files/`, outside
`custom_components/` and outside the rotating `.hvls_backups` directory.
The private migration directory is mode `0700`; captured files are
created with mode `0600`. Original YAML may contain inline secrets:
**never expose, log, upload, or return baseline file contents**.

A manifest contains path, byte size and original SHA-256 for each file.
The snapshot is published as a directory only after all files and the
manifest are written and fsynced. It is **write once by application**:
a second call with the same source manifest only verifies; a different
manifest is refused, not silently substituted. `verify_baseline` hashes
the stored bytes and refuses corruption.

An abandoned staging directory or exclusive lock after abnormal termination
blocks new mutation until an administrator inspects it. Filesystem permissions
protect against inadvertent disclosure by other local accounts; this
is **not cryptographic tamper-proof storage** against someone who can modify
the HA config filesystem.

## Durable journal

`migration_journal.initialize_journal` creates
`<ha-config>/.storage/hvls_migration/journal.json` after verified baseline.
Each record is schema-versioned, linked to the baseline manifest digest,
stored with owner-only permissions and updated by locked, fsynced,
atomic replacement.

Mutation methods require `expected_revision` (optimistic
compare-and-swap); concurrent or stale updates are refused:

- `advance_phase`: monotonic phase history with restricted transitions;
- `record_label_intent`: save the entity ID, registry identity, HVLS label,
  expected membership before and after, **before** a future label change;
- `mark_label_applied`: record verified post-change membership only after
  a future caller has actually performed the action;
- `mark_label_rolled_back`: record verified post-rollback membership;
- `recovery_report`: classify persisted intent and actual registry
  observations without changing anything.

The journal must **never** restore the whole HA label set. Future import and
rollback implementations must update only their own label, preserve all
other labels, and verify entity-registry identity and current membership
without an `await` between check and registry write. They must recheck the
protected baseline, the current production hash and the reviewed decisions.

An intent found after process interruption is *unconfirmed* whether the
current registry looks like the before or after state. This is intentional:
the journal cannot distinguish a completed operation from a concurrent
manual edit just by inspecting a Boolean label. It requires review, never
automatic replay, acknowledgement or rollback.

## Fail-safe guarantees and current limits

- No migration action, YAML write, Google reload, exposed-entity change or
  label mutation is wired to the above primitives.
- The baseline covers the original resolved YAML source topology. It does
  **not** automatically include an unrelated future HVLS output path:
  that separate target must be protected before any cutover.
- A disk snapshot **does not** certify that Google Assistant has loaded the
  same settings, nor does an exposure-policy comparison validate Google
  Home routines. The PR #110 diagnostic remains read-only.
- `phase` records requested workflow progress only; it does not
  independently prove that a later reload, Google Home check or manual
  edit occurred. Future steps must add dedicated validation gates.
- Source hashes captured at discovery must be rechecked when baseline is
  captured. The capture-to-label-import / cutover interval requires another
  independent compare-and-swap check by the future writer.
- No tested real Home Assistant instance is claimed. Only synthetic
  filesystem/registry-adjacent behavior is covered by the tests.

Follow-up PR: import staging, metadata/override preservation and explicit
`Keep / Disable / Remove` decisions with identity-aware rollback, then
manual cutover, reload and user verification.

Tracking #103, following PR #110.
