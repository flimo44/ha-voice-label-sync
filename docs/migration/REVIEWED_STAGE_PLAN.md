# PR #112 — Reviewed per-entity decisions and label stage preflight

This change adds **pure, read-only preparation** for migration decisions.
It is not connected to the HA WebSocket, frontend, services, registry writer,
Google reload or the PR #111 journal. It never creates a backup, label,
override or new YAML. The V1 behavior remains unchanged.

## Input

`migration_stage_plan.build_reviewed_stage_plan(diagnostic, decisions,
registry_facts, label_id=...)` accepts a current admin diagnostic report
from PR #110, explicit decisions, and separately captured registry facts:

```python
decisions = {
    "light.kitchen": {"action": "import"},
    "lock.front": {"action": "keep"},  # expose:false remains excluded
    "switch.old": {
        "action": "disable", "acknowledge_change": True,
    },
}
registry_facts = {
    "light.kitchen": {
        "registry_id": "<native-registry-entry-id>",
        "label_present": False,
        "eligible": True,
    }
}
```

All registry facts are **input observations**, not permission to write; the
future caller must obtain them from current HA native APIs on its event loop
and verify identity, label state and eligibility immediately before a write.

## Decision semantics

- **Import**: for an explicitly selected, positively projected, eligible
  entity with valid registry identity and no custom metadata, propose a
  single addition of the already configured HVLS label. Sensitive domains
  (locks, alarm panels and covers) require separate exposure acknowledgement.
  An already present label yields a no-op, not another operation.
- **Keep**: retain effective behavior, including original per-entity
  settings; not a claim that storing original YAML alone guarantees Google
  Home parity. Explicit `expose:false` is kept by default with **no**
  label addition. Other Keep decisions that rely on current exposure require
  a future preservation plan.
- **Disable**: intentionally make an entity unexposed, subject to user
  acknowledgement and an as-yet-unimplemented cutover rule. No label is
  changed by this PR.
- **Remove**: intentionally discard the existing definition, subject to
  acknowledgement, a separate impact warning and a future manual cutover
  procedure. No label is changed by this PR.
- **Name / room / aliases**: the original values exist only in the protected
  baseline, never in this preflight report. If customized metadata exists,
  even an approved `retain_manual_yaml` or `discard_after_review`
  **cannot** generate a label proposal until a tested preservation / override
  writer exists. This is intentional: labels are selection, not metadata.

Unrecognized decisions and individual entity anomalies are reported per
entity. They do **not** prevent planning unaffected valid entities. Global
source ambiguity, missing source hashes, untrusted runtime exposure,
unavailable loaded policy or changed **global** exposure rules block all
label proposals. Drift or uncertainty restricted to an individual entity
blocks only that entity.

Implicitly exposed entities must be explicitly selected for import to
survive a future default-deny switch. The full affected inventory will
still need validation at cutover.

## Output and boundaries

- `label_additions_proposed`: reviewed **suggestions only**, with registry
  ID and expected before/after membership. It does not call
  `record_label_intent` and it must **not** be replayed as a write.
- `review_token_sha256`: comparison fingerprint of the preflight result,
  **not** an authorization token.
- `projected_after: unknown`: this stage never claims that the final
  Google Assistant YAML was generated, loaded, or reflected in Google Home.
- `read_only: true`, `apply_allowed: false`, `cutover_allowed: false`:
  invariant. Source freshness, metadata preservation and effective policy
  at mutation time remain unverified.

## Follow-up before any mutations

A separate PR must implement HA-native and journal-backed label staging,
with explicit user approval, disk source CAS, verified protected baseline,
current registry identity/membership, write intent committed before mutation,
and safe post-write verification. It must not automatically resume an
ambiguous `intent` left by a crash, nor overwrite unrelated HA labels.

A tested metadata override store and the manual cutover/reload/rollback
workflow are also required. HA integration tests on isolated versions remain
necessary; synthetic unit tests alone do not establish real-runtime parity.

Tracking issue #103; builds on PRs #110 and #111.
