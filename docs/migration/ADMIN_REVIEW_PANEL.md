# PR #116 — Administrator-only migration review tab (read-only)

This PR adds a **Migration** tab to the existing Home Assistant HVLS
panel, plus an authenticated administrator-only read-only WebSocket
command: `ha_voice_label_sync/get_migration_review`.

## No migration on opening this page

The tab and its WebSocket command are diagnostic only. They do **not**
initialize a journal, capture or overwrite the protected source baseline,
add or remove an HA label, edit any YAML, run the normal V1 Preview/Apply
workflow, reload Google Assistant or validate Google Home state.

The new tab is loaded on demand (when the administrator opens Migration).
It displays projected before / hypothetical after exposure, error codes,
counts and provisional per-entity choices: Import, Keep, Disable, Remove.
Sensitive exposures and destructive choices have explicit acknowledgement
checkboxes and custom metadata has Retain / Discard policy options.

**These are temporary review inputs only**, held in the active page's
memory. There is no approval persistence, button for applying these
choices, migration mutation API or automatic cutover. After changing a
choice, the page marks its current analysis as stale until **Refresh
simulation** is pressed. No requests are sent automatically when
changing an option. The rendering uses DOM `textContent`, not raw
user-controlled `innerHTML`.

## Backend review request

The admin-only WebSocket command accepts:
```json
{"type":"ha_voice_label_sync/get_migration_review","decisions":{}}
```

It recomputes PR #110's current sanitized diagnostic, then captures the
native HA registry and entry ID/membership/eligibility on the HA event
loop, and runs the PR #112 planner on a worker executor. The response
includes the sanitized diagnostic and per-entity planner result.

If and **only if** an independently created PR #111 protected baseline
already exists and verifies successfully, the executor additionally
runs the PR #115 full-inventory hypothetical review. The baseline is
never created implicitly from a page load.

With no verified baseline, the response has:
- `protected_baseline_status: "not_verified"`;
- `simulation: null`;
- the ordinary sanitized diagnostic and stage preflight for orientation.

A missing, corrupt or unavailable baseline is not treated as a
successful simulated migration. No secrets, names/rooms/aliases or
candidate YAML are returned to the browser by this endpoint.

A verification exception is reduced to an administrator-safe error code;
the WebSocket never returns raw errors, YAML, paths or credentials.

## Guarantees and outstanding work

The endpoint response unconditionally reports:
`read_only:true`, `apply_allowed:false`,
`cutover_allowed:false`, `google_home_state_verified:false`.

This is the first UI for observing and reviewing migration choices, **not
a replacement for the reviewed write-approval workflow**. Even a
`hypothetical_preview_consistent` result is only a projection. A future
step must implement safe baseline initialization with explicit consent,
reconcile metadata and final effective exposure, persist approvals,
bind write operations to fresh CAS and the journal, add HA-isolated
tests, support recovery / rollback and obtain manual Google Home
verification before enabling cutover.

The existing V1 generation, Preview, Apply, label management and
backup/restore controls remain unchanged. The new tab does not call
any existing write action.

This PR adds regression tests for the admin-only WebSocket registration,
absence of baseline and corrupt baseline, native snapshot routing and
frontend state / error behavior without side effects.

Tracking #103; builds on #110–#115.
