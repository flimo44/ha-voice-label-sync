# PR #110 — Read-only administrator migration diagnostic

## Scope

An administrator-only Home Assistant WebSocket command now assembles the
read-only analysis built by PRs #106–#109:

```json
{"id": 1, "type": "ha_voice_label_sync/get_migration_diagnostic"}
```

The response combines:
- source topology and explicit YAML rules, without returning raw YAML;
- an HA entity registry/state snapshot and Google's trait compatibility;
- a **disk-YAML-based** Home Assistant SYNC exposure projection;
- the comparison of that disk YAML with the manual Google Assistant policy
  actively loaded in Home Assistant.

The endpoint is registered with `@websocket_api.require_admin`. HVLS must
already be configured. This PR adds no frontend control, label staging,
backup, migration mutation, Google reload or automatic Apply.

## Critical interpretation rule

`disk_ha_sync_projection` is **a projection of the YAML on disk**, **not**
proof of what the Google Assistant integration or Google Home currently uses.

If the disk and loaded policy differ, the diagnostic still reports the
differences (IDs and field names only). Valid entities unaffected by
**local** problems can still appear as `candidate_for_review`, but no entity
is considered ready to import and `cutover_allowed` is **always false**.

Candidates require a loaded exposure-policy comparison confirming the
relevant entity fields and common default rules, a present registry record,
a positive HA trait test and no unsupported custom metadata. A localized
unknown or drift does not automatically disqualify unrelated entities.
Differences in global exposure rules do.

`active_google_home_state` is always `unknown`; a matching subset of
loaded fields does not prove parity of every Google Assistant setting, a
successful Google Home sync, or preservation of routines.

## Security and limits

- The filesystem discovery is executed via `hass.async_add_executor_job`;
  the actual HA state / registry and loaded GoogleConfig are read on HA's
  event loop.
- Only administrators can call the endpoint; the UI is not yet wired.
- The report excludes raw YAML, Google IDs, credentials, secrets,
  customized name/room/alias **values**, and third-party entity attributes.
  It may include entity IDs and relative source paths for troubleshooting.
- Per-entity customizations are reported by their field names only.
- SHA-256 source digests assist future validation but do not establish
  freshness at Apply time.
- `source_freshness_verified` and `google_home_state_verified` remain false.
  This response must never be reused as write authorization.
- `GoogleConfig._config` is a Home Assistant private API and can change.
  Unknown versions and runtime structures fail closed.

## Before completing the migration feature

Validate the native runtime adapters on an isolated instance of each
supported HA version. The next PRs must implement a durable baseline,
crash-safe journal, explicit user-reviewed per-entity decisions, conservative
staged label changes, YAML cutover validation and rollback.

No release should imply that this read-only endpoint performs migration.

Tracking: #103, following #106, #107, #108, #109.
