# PR #128 — Native entity-label CAS at a hypothetical write boundary

This PR follows the protected investigation history (#127). Its goal is to
prove, with the **actual Home Assistant Core 2026.11 entity/label
registries**, that a future migration writer can reject stale native HA
facts **at the precise synchronous event-loop point before a write**.

**This PR is strictly READ-ONLY.** It neither enables the dormant
migration stage executor (#113) nor adds any migration recovery action.

## Two-step contract

New `migration_write_boundary.py` defines two synchronous helpers.

1. **Capture**, in the HA event loop, a snapshot of one entity's
   immutable native registry identity, exact FULL set of existing labels,
   unique configured Google/HVLS label identity and target presence,
   and a *hypothetical* desired state (add/remove).
2. **Assess**, in another synchronous HA event-loop call, whether the
   previously captured snapshot still agrees with the actual native HA
   registries. The test checks:
   - the entity still exists and has the **same native registry ID**;
   - the configured label still uniquely resolves to the **same label ID**;
   - the native entity has not been hidden or disabled;
   - **every label**, including unrelated labels, is unchanged;
   - no previously present label identity has disappeared from HA's label
     registry;
   - a single target-label addition or removal is still a valid projection.

If a check fails, the result contains only a sanitized reason such as
`registry_identity_changed`, `native_full_label_set_changed`,
`native_label_identity_missing` or `entity_missing`.

This is intentionally stricter than checking only target-label presence.
An unrelated automation/user could add/remove another label between
the original review and a prospective update; a future safe writer must
never silently use old assumptions to overwrite such concurrent changes.

## Negative tests and actual HA integration

Offline pytest cases inject:
- target label altered after capture;
- unrelated label added/removed;
- entity re-created with a new native ID or removed entirely;
- target/unrelated label identity invalidated;
- entity hidden/disabled;
- malformed, forged, duplicate or stale snapshot fields;
- both add and remove directions;
- a temporary native state change that is later reverted;
- a bad entity alongside an unaffected entity.

The existing sandbox (**official Home Assistant Core 2026.11**, no
network, temporary config, read-only repository mount) now creates a
separate test entity, captures its native label set, deliberately updates
an unrelated label using the real HA registry, and verifies refusal.
After restoring the local label membership, it verifies that a matching
snapshot **still cannot claim external effects are known**.

It also injects a concurrent target-label addition and verifies that
the old add projection is refused, while a fresh read-only removal
projection can be examined without executing it.

The earlier #123–#127 automation and crash/restart cases remain part of
this CI, including durable audit history. The original Google YAML is
asserted unchanged.

## Critical limits — NO execution safety certification

- A successful assessment is **not** an execution permit. Every result
  always has `read_only:true`, `execution_authorized:false`,
  `journal_ack_allowed:false`, `retry_allowed:false`,
  `rollback_allowed:false`, `stage_allowed:false`,
  `apply_allowed:false`, `cutover_allowed:false`,
  `google_home_state_verified:false` and
  `external_consumers_verified:false`.
- This captures the **native entity and label registries only**. It does
  not, by itself, prove YAML source integrity, journal continuity,
  external automation state, Google Home parity or authorization.
  Those need separate independent guards.
- An entity might return to the exact same label set after an
  intervening modification (**ABA**). A label-set match cannot prove
  that no intermediate registry event occurred. The guard therefore
  never claims external side effects are known.
- Two separate calls cannot be atomic across them, other processes or
  external subscribers. A future real executor must perform **fresh
  trusted admission plus the native CAS and actual write in one
  synchronous HA event-loop section with no await between CAS and
  update**, and preserve an intent-before-write journal.
- The SHA-256 snapshot digest is *not authenticated*, and must never
  become an execution credential. The dormant stage executor is
  deliberately **not wired to this experimental helper**, and there is
  no WebSocket or UI execution path.

In particular, a recorded investigation decision from #127 cannot
authorize a label change or a journal ACK. Any executable recovery
would require a separate design and explicit administrator review,
not an implicit promotion of this successful rehearsal.

Tracks #103. Follows #113, #120–#127.
