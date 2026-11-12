# PR #124 — Administrator recovery triage, strictly read-only

This PR connects the **existing** protected migration-journal classifier
(PR #111) to native Home Assistant entity/label registry observations and
a new admin-only **read-only** recovery panel.

It follows the real Home Assistant Core 2026.11 two-process interruption
tests in PR #123. It does **not** implement retry, rollback, staging,
automatic recovery, confirmation of the journal, Google reload, or cutover.

## User-facing operation

Opening the **Migration** tab automatically reads a fresh recovery summary.
The separate **Recheck journal and labels** button performs the same
read-only request on demand.

The new endpoint is administrator-only:
`ha_voice_label_sync/get_migration_recovery_status`.

It returns non-secret status fields, the journal phase/revision, counts
and entity IDs, and bounded per-entity observations. It **never returns**
the raw source YAML, names, aliases, rooms, secure PINs, file-system paths,
original project IDs or raw exceptions.

No action button is provided to acknowledge or resolve an operation.
The API and UI categorically return or require:

```json
{
  "read_only": true,
  "automatic_recovery_allowed": false,
  "stage_allowed": false,
  "apply_allowed": false,
  "cutover_allowed": false,
  "google_home_state_verified": false,
  "observation_atomic_across_processes": false
}
```

## Classification

The diagnostic loads the verified write-once baseline and journal **without
creating either**. If private storage was never initialized, it reports
`not_initialized` without creating `.storage`. If a journal or baseline is
missing/corrupt within existing migration storage, it reports
`unavailable`, never silently creating a replacement journal.

While holding the in-process migration workflow lock, it:

1. Loads and validates the protected baseline/journal in an executor.
2. Observes the *native* HA entity and label registries on the HA event loop,
   without any asynchronous suspension between registry reads.
3. Calls the existing journal `recovery_report` against those observations
   and re-reads the journal revision/content. If it changed between
   observations, classifies the result `snapshot_changed` and refuses
   to show apparently reliable per-entity conclusions.
4. Re-hashes the **original** YAML files against the protected baseline,
   without following source symlinks or reading `!secret` targets. Drift
   gives `source_integrity: changed_or_unavailable`.
5. Reports each pending `intent` as **unconfirmed** even when a label is
   currently present. The external HA write may or may not have happened,
   and its effects may be externally visible; presence is *not* an ACK.
6. Isolates missing/replaced entity identities and missing label identities
   as per-entity anomalies rather than hiding healthy observations.
7. Marks an active staging/other intermediate journal phase as
   `review_required` even if a label seems correctly applied.

The view is an **observation only**. Changes between the native observation,
the disk read and a future user action are possible, especially across
processes. Consequently `observation_atomic_across_processes:false`
is always set. Nothing in this report constitutes execution authority.

### Interruption example

After a power loss, if the journal retains an unconfirmed intent:

| Journal | Current HA label | Result |
| --- | --- | --- |
| `intent` | Absent | `unconfirmed_intent` — human review required |
| `intent` | Present | `unconfirmed_intent` — human review required |
| `applied` | Present, same entity identity | `applied_verified` observation, **not** Google Home parity |
| Any | Entity identity changed | Per-entity review required |
| Any | Label identity missing | Per-entity review required |
| Any | Original source changed | Global review required |

The user may investigate and manually reconcile the incident through a
**future separately designed process**. This PR never makes that decision.

## Testing

Offline regression coverage includes absent/corrupt journals, pending
intents before/after a label write, an applied journal row, source drift,
missing labels/registry entities, identity mismatch, multiple independent
faults, a concurrent journal revision change, unavailable native registries,
secret redaction, admin-only WebSocket registration and absence of writes.

The existing real HA Core 2026.11 sandbox smoke (#123) is extended to
exercise this recovery view against the genuine registry **in the second
Python interpreter** after both interruption boundaries.

Frontend tests cover automatic review on opening the Migration tab,
manual recheck, pending/unknown/corrupt states, rejection of any backend
payload that claims execution authority, and a maximum of 100 rendered
rows even when the protected journal contains more.

This is deliberately **not** a full integration+Google Home migration
verification and does not change production V1 preview/apply behavior.

Tracks #103; follows #111, #113, #119–#123.
