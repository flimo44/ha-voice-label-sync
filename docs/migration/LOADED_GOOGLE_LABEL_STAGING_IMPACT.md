# PR #120 — Loaded manual Google exposure impact of staging an HVLS label

This PR introduces an **administrator-only, read-only pre-staging impact
assessment** in the existing Migration review WebSocket and panel. It does not
modify any labels, YAML, original source baseline, migration journal,
Google Assistant runtime configuration or V1 Preview/Apply behavior.

## Why a separate check before staging?

Adding an entity label to Home Assistant's entity registry creates a registry
change event. It is not automatically safe just because the final Google
Assistant YAML is still unchanged: automation or third-party label consumers
may react, HA implementation details could change, and Google Home's observed
devices cannot be inferred from current YAML.

The current native manual Google Assistant `GoogleConfig.should_expose()`
rule uses `expose_by_default`, `exposed_domains`, entity-specific
`expose` overrides and entity visibility. It does not currently use the
entity's **HVLS label membership** directly. The rule is publicly documented
at https://www.home-assistant.io/integrations/google_assistant/ and can be
inspected in the HA core implementation. This is **not** a promise about
unverified future runtime versions.

## What is checked

For each entity that an administrator explicitly selects **Import**, the
adapter captures only non-secret evidence from the *active* manual Google
runtime object, directly on the HA event loop:

- the exact native `GoogleConfig` type (a subclass or unknown API fails);
- exactly one **manually imported** Google Assistant config entry, with
  no additional Google Assistant entries;
- the loaded booleans `expose_by_default`, `entity_config.*.expose`;
- loaded exposed-domain membership, native entity visibility;
- the live read-only `should_expose(entity_id)` result.

It deliberately discards **all names, aliases, rooms, service-account data,
PINs, project IDs, arbitrary YAML and file paths**. The protected source
baseline and live loaded-policy comparison from the prior PRs remain
independent and unchanged.

The pure evaluator then:

1. Checks the previously reviewed PR #112 list of proposed label additions.
2. Refuses to classify the manual Google policy as consistent when the
   **loaded** exposure policy does not entirely match the original disk
   exposure fields, or when the HA runtime snapshot is incomplete.
3. Models the exposure rule as it would be with the **same** loaded policy
   and entity visibility after changing **only** HVLS label membership.
4. Compares that projection to Home Assistant's own *current* native
   `should_expose` result. Disagreement is an **entity-specific**
   `manual_google_runtime_rule_disagreement` requiring review.
5. Keeps unrelated healthy entities visible, even when other entities
   have missing registry entries, invalid values or an unavailable native
   exposure result.

Results are displayed as projected information:
`no_manual_policy_delta_detected`, `local_review_pending`, or
`global_review_blocked`. The UI explicitly displays that other label
consumers and Google Home are **unverified**.

## What is deliberately NOT proved

This code **cannot** guarantee that no other integration or user automation
is triggered by a label update, that a later GA runtime update will use the
same rule, that an entity's Google traits remain supported, or that Google
Home has no cached devices/routines. It cannot validate a post-write
registry state because there is **no write operation in this PR**.

Even when every tested entity has a matching native exposure projection,
all results unconditionally contain:

```json
{
  "stage_allowed": false,
  "apply_allowed": false,
  "cutover_allowed": false,
  "other_label_consumers_verified": false,
  "google_home_state_verified": false,
  "read_only": true
}
```

The PR #113 journaled single-label executor remains **dormant**. Its
existing execution guards are unchanged. PR #119 review attestations are
not staging approvals; this preflight is also not an approval.

Before any future staged label mutation becomes possible, we still need a
separate explicit per-operation authorization, an independent way to bound
other label-driven callbacks/automations, fresh loaded-policy and native
registry rechecks *immediately before and after writing*, journalled
recovery and an isolated Home Assistant test environment.

## Regression tests

Tests cover explicit `expose: true`, explicit `expose: false` overriding
default exposure, `expose_by_default: true/false`, excluded domains,
hidden/auxiliary entities, missing native registry state, invalid exposure
values, loaded runtime API incompatibility, multiple Google config entries,
native-oracle disagreement, 70 healthy + 10 anomalous entities, loaded/disk
drift, incomplete runtime inventory, and frontend status-only rendering.

The fixture demonstrates that neither entity-registry update APIs nor
Google integration reload/write methods are called. The live object is
queried on the event loop and **not** passed to the executor.

Tracking #103; follows #110–#119.
