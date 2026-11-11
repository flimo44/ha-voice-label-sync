# Assisted migration — decision contract and acceptance plan

> **Design-only / not implemented.** Scope: users of the manual Home Assistant Google Assistant integration. Tracking: [#103](https://github.com/flimo44/ha-voice-label-sync/issues/103). This document does not change runtime behavior.

## Guiding contract

The migration assistant must be **tolerant of isolated entity-level problems, never silently destructive, and conservative about global ambiguity**. An error on 10 entries must not automatically prevent importing 70 good entries; however, no unresolved exception may disappear from the final effective configuration by accident.

There are **two onboarding routes**:
- **New configuration**: no pre-existing manual Google Assistant configuration; provision/select labels, validate that the Google Assistant exposure policy will not unintentionally expose unlabeled entities.
- **Assisted migration**: inspect the *actual* YAML source(s) without writing, classify entries and rules, preserve a protected baseline, stage safe changes, review differences, and only then perform a user-authorized cutover.

A "successful migration" means more than a matching YAML diff: the set of effectively exposed entities **and each meaningful per-entity setting** must either match the validated original or carry an explicit approved change. Google Home may maintain its own room assignments and routines: YAML comparison alone cannot verify those.

## Decision model

These are **proposed user-visible decisions**; implementation must prove their resulting effects.

| Finding | Default classification | User decision | Requirement before cutover |
| --- | --- | --- | --- |
| Compatible active entity with registry entry | \`migrable\` | Import | Label addition planned; desired exposure verified |
| Explicit \`expose: false\` | \`explicitly_excluded\` | Preserve exclusion (default); other choices require separate explicit review | Must remain unexposed; never auto-label to exposed |
| Missing, renamed, unregistered, disabled or unsupported entity | \`needs_review\` with precise reason | Keep, match manually, disable, remove where viable | Preserve semantics or explicitly approve change; unregistered is not synonymous with nonexistent |
| Custom \`name\`, \`room\`, \`aliases\` or advanced option | \`needs_review\` if not reproducible | Keep override, choose HA default, manual correction | No silent loss of valid options |
| Implicit exposure through \`expose_by_default\` / \`exposed_domains\` | \`implicit_rule\` (not an explicit entity_config entry) | Explicit switch to controlled default-deny model, plus resolved exceptions | Inventory current rule and current entity snapshot; no unnoticed exposure/de-exposure |
| Ambiguous YAML, duplicate key, untrusted file path, unreadable source or incomplete baseline | \`global_blocker\` | Diagnose and fix manually | No automatic cutover; report remains available |

**Keep** means *keep the effective behavior*, not merely retain an archived text entry. **Disable** means the resulting entity is not exposed (and its old definition can be restored). **Remove** deliberately discards its old exposure/override after prominent confirmation, including potential Google Home routine impact. These choices are unavailable if HVLS cannot make their promised effect true.

A syntax error that prevents reliable parsing of a complete YAML document is a **global source blocker**, not a local entity defect. A *parseable* but unsupported/invalid option on one entity can be a local anomaly. Do not guess the user's current runtime behavior when HA itself rejects a configuration.

## Effective exposure model

Discovery requires *both*:

1. A snapshot of currently known HA entities, registry entries, state, eligible domains/classes, and explicit YAML overrides.
2. A representation of **ongoing rules**: \`expose_by_default\` defaults to \`true\`; \`exposed_domains\` only limits default exposure when default exposure is enabled; explicit \`entity_config.*.expose\` may override that default. Do not infer the exact behavior of disabled/hidden entities without testing against the supported HA versions.

Separate **explicit YAML entries** from **effectively exposed devices** and from **implicit exposure by rule**: their counts are not interchangeable. Every entity has \`before\` and proposed \`after\` states from \`exposed | not_exposed | unknown\`. \`unknown\` is not equal to safe, absent, or hidden. Effective state evaluation needs real HA integration semantics and a test oracle; a simple YAML dictionary comparison is insufficient.

For a completely HVLS-controlled exposure policy, the *proposed cutover* requires an explicit \`expose_by_default: false\` in the user's Google Assistant settings. HVLS must not silently change \`configuration.yaml\`. Changing this flag may de-expose **implicitly exposed** entities; migration cannot proceed until these are reviewed and individually handled. This is a cutover design decision, **not an immediate change to existing HVLS installations**.

Security-sensitive entities (locks, alarm panels, garage/gate covers, etc.) and pre-existing \`expose: false\` entries require conspicuous review of any *new exposure*. Do not log, display or archive \`secure_devices_pin\`, service credentials or secrets in the discovery report.

## Read-only discovery report (proposed v1 schema)

\`\`\`json
{
  "schema_version": 1,
  "mode": "new_configuration | assisted_migration",
  "source": {
    "status": "resolved | partial | unsupported | ambiguous",
    "locations": [{"path": "configuration.yaml", "kind": "inline | include | package", "digest_sha256": "..."}],
    "warnings": []
  },
  "rules": {
    "expose_by_default": "true | false | unknown",
    "exposed_domains": ["light"],
    "implicit_exposure_may_change_with_new_entities": true
  },
  "counts": {
    "explicit_entries": 0,
    "currently_exposed_known": 0,
    "current_exposure_unknown": 0,
    "migrable": 0,
    "needs_review": 0,
    "explicitly_excluded": 0
  },
  "entities": [
    {
      "entity_id": "light.living_room",
      "source_path": "configuration.yaml",
      "source_line": 12,
      "registry_identity": null,
      "category": "migrable | needs_review | explicitly_excluded",
      "reasons": [],
      "before": {"exposure": "exposed | not_exposed | unknown", "name": null, "room": null, "aliases": []},
      "proposed_after": null,
      "available_decisions": ["import", "keep", "disable", "remove"]
    }
  ],
  "global_blockers": [],
  "pending_decisions": [],
  "cutover_status": "not_applicable | pending_review | blocked | ready_for_validation"
}
\`\`\`

This is an illustrative shape, **not yet a stable API**. Do not include raw YAML, arbitrary paths outside the config root, secret values, or sensitive configuration field contents in the report. Source SHA-256 helps detect changes but does not prove runtime behavior. Counts must explain whether they count explicit records or the effective exposure inventory; they need not sum to the same total.

**Cutover gates**:
- \`blocked\`: unknown effective exposure that would be changed, unresolved source topology, dangerous ambiguity, baseline missing/corrupt, stale hashes, failed HA config validation.
- \`pending_review\`: only local anomalies remain, with choices available and no destructive write yet.
- \`ready_for_validation\`: all choices resolved and before/after differences confirmed, but final HA config validation, CAS checks and safe write/reload remain outstanding.
- No user-facing "override safety" button: acknowledging intentional changes does not authorize an unknown or corrupt final configuration.

## YAML topology and manual cutover

Handle direct \`entity_config: !include ...\`, inline mappings in \`configuration.yaml\`, a whole included \`google_assistant\` section, nested includes and HA packages. Unsupported structures are **detected and reported**, not guessed.

For inline \`entity_config\`, once migration is fully reviewed, create a separate managed YAML file and display the **exact requested manual edit**, replacing the inline map by an \`!include\` while preserving other settings; do **not** edit \`configuration.yaml\` automatically. Verify the user's edit and the target file before enabling cutover.

Parse YAML without executing tags or reading \`!secret\`, credential files or external paths. Restrict file traversal to HA's configuration root; apply bounds on size, nesting, alias expansion, total files and symlinks. Duplicate and conflicting keys must be diagnosed rather than silently overwritten. Source comments and formatting survive in the baseline even if generated YAML does not retain them.

## Per-entity overrides — design work still required

Labels indicate selection, **not metadata**. Decide and document precedence of: imported Google name/room/aliases > explicit HVLS override > native HA defaults, or another explicit policy. No precedence order is *yet approved*. Any override store must have a schema version, HA-backup persistence, rename/orphan policy, privacy protection and rollback journal. Google Home's app-level rooms/routines cannot be inferred solely from YAML.

## Recovery and ownership

Before any *migration state mutation*, store a protected one-time baseline **outside** \`custom_components/\` and normal rotating backup retention, with immutable-by-application "write once" semantics and digest verification. Keep an operation journal for exactly the label changes HVLS made; rollback removes only those still matching the expected post-import state. Never restore an old whole-label snapshot over user edits.

Persist an idempotent migration phase machine so a restart or error midway through label import, file preparation, manual cutover or reload can resume or recover without doubling work. Check production content and registry identity immediately before mutation; conflicts require re-review.

After cutover: check HA config first, call \`google_assistant.reload\` where supported, handle failure or absent sync, guide validation inside Google Home (devices, names, rooms and routines), then offer a verified rollback route. A successful reload is **not** proof that Google Home has the expected presentation.

## Test plan and PR sequencing

The companion \`tests/fixtures/migration/contract_cases.json\` is a **reviewed-design expectation corpus**, not a currently passing exposure engine. \`tests/test_migration_contract_fixtures.py\` checks that these examples remain structurally usable; **it does not certify migration functionality**.

1. **PR A — design + acceptance fixtures**: this document and fixtures, zero runtime changes.
2. **PR B — read-only analyzer**: implement source topology and rules; use the fixtures as behavioral assertions; assert *no writes* even for errors; real HA semantics checks for hidden/disabled categories.
3. **PR C — protected baseline and crash-safe operation journal**; failure injection and conflict tests.
4. **PR D — label staging + metadata preservation + Keep/Disable/Remove**; user-approved effective-exposure diff.
5. **PR E — manual cutover guidance, config validation, reload/sync and rollback**.
6. **PR F — extended packages, directory includes and edge cases** after explicit support decisions.

Each later PR must add regression tests; never silently reinterpret an unresolved test as a passed scenario. A test pass on synthetic fixtures is not equivalent to validation on supported real Home Assistant versions.

References:
- [Google Assistant integration](https://www.home-assistant.io/integrations/google_assistant/)
- [Reload action](https://www.home-assistant.io/actions/google_assistant.reload/)
- [Splitting configurations](https://www.home-assistant.io/docs/configuration/splitting_configuration/)
- [Packages](https://www.home-assistant.io/docs/configuration/packages/)
