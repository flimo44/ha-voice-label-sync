# PR #121 — Read-only audit of indirect Home Assistant label consumers

## Finding: HVLS V1 does not itself regenerate on a label event

Inspection of the current `__init__.py`, `services.py`, `button.py` and
`entity_label_writer.py` indicates that **the V1 integration does not
register an entity-registry-update callback to regenerate its output**.
However `ha_voice_label_sync.generate` and the **Generate configuration**
button are write-capable; an automation, script or third-party integration
can call them at any time. Adding a label publishes registry changes that
may be observed by components outside HVLS, and changing a label can
change which entities a later V1 Generate will select.

PR #120's read-only `GoogleConfig.should_expose` oracle proves neither
that third parties are idle nor that V1 cannot be invoked indirectly.

## Scope of the new administrator-only read-only audit

The existing `get_migration_review` response gains
`indirect_consumer_audit`. All evidence is collected *without writing*.

- On the HA event loop, confirm whether HVLS's legacy `generate` service
  is registered. No service is invoked.
- In a bounded worker scan, inspect `configuration.yaml`,
  `automations.yaml`, `scripts.yaml`, and YAML files under `packages/`
  (up to 200 files, 1 MiB each, 4 MiB in total). Detect literal
  `ha_voice_label_sync.generate`, `entity_registry_updated`,
  `label_entities(...)`, `label_devices(...)`, `label_areas(...)`,
  `button.press`, and dynamic `service_template` values.
- Record only **aggregate counts and fixed reason codes**. Do not return
  snippets, paths, arbitrary YAML values, secrets, aliases or private names.
  Do not execute/construct YAML values: PyYAML's BaseLoader **compose
  node tree** only, skip `!secret`, never follow `!include` targets.
- Compare the configured V1 output path with protected/manual Google YAML
  source paths. If they overlap, warn that a separately triggered V1
  generation **could overwrite the original source**.
- Reject symlinks, inaccessible files, oversized YAML and malformed YAML
  without suppressing findings from unrelated files.
- Show the warning and counts in the Migration tab; no Stage/Apply action.

The scanner does **not** inspect `.storage`, `secrets.yaml`,
`custom_components`, third-party Python code, UI-managed automation
internals, blueprints, arbitrary `!include` targets, scripts hosted on
other systems, Node-RED, n8n or AppDaemon. A textual reference can be a
false positive and the absence of a match is **not** proof of safety.
Changing YAML between the scan and a later action can invalidate it;
no future staging writer is permitted to use the scan as authorization.

Every result therefore reports:
```json
{
  "status": "indirect_effects_unverified",
  "coverage": "limited_standard_yaml_only",
  "all_live_listeners_inspected": false,
  "external_consumers_verified": false,
  "google_home_state_verified": false,
  "stage_allowed": false,
  "apply_allowed": false,
  "cutover_allowed": false,
  "read_only": true
}
```

## Link with the saved human review attestation

The full audit output is incorporated in the attestation evidence SHA-256
from PR #119. Any changed source-overlap state, discovered callback risk,
incomplete scan or reference count causes the previous human attestation
to become **stale**.

Because external listeners remain unverified even when no local references
are found, a new human attestation must acknowledge this as an **open
issue**, never mark the staging environment as certified. This is separate
from and weaker than any future execution authorization.

## Regression scope

The tests include:
- explicit writer + registry-event automation, label-template references,
  `button.press` potential target, dynamic service templates;
- source overlap and V1 service registration;
- a simulated registry change that **can** invoke a user-defined callback;
- comments that should not count, unknown `!include` targets,
  malformed/oversized YAML, symlink avoidance and secrets redaction;
- evidence changes invalidating a previous review attestation;
- confirmation that no file is created, no HA service is called,
  no Google Assistant config is written and the staging executor remains
  entirely disconnected.

These tests are **bounded threat-model rehearsals using an offline
simulated event**, not an end-to-end test against a running Home Assistant
Core instance. A future isolated HA environment must validate actual
entity-registry events, loaded automation actions, and the behavior of
third-party observers before staging can be designed safely.

Tracks #103; follows #111–#120.
