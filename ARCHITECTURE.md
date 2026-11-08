# HA Voice Label Sync — Architecture

> **Implemented baseline:** Home Assistant integration `v1.0.0-beta.2`, with independent Python core `ha-voice-label-sync==0.3.5`. This describes the current implementation, not the beta.3 roadmap.

## Purpose and scope

HA Voice Label Sync (HVLS) helps users of the **manually configured Home Assistant Google Assistant integration** manage which entities are exposed using a Home Assistant label. It is not a replacement for Home Assistant Cloud, and does not create Google Cloud credentials, establish Google Home pairing, reload the Google Assistant integration or synchronize Google Home devices automatically.

The intended manual workflow is **select entities → generate and inspect Preview → explicitly apply reviewed changes**. See [README.md](README.md) for installation and configuration and [ROADMAP.md](ROADMAP.md) for future work.

## Implemented components

```text
Home Assistant
  ├─ Config Flow / Options Flow / Google Assistant config diagnostic
  ├─ Administrator-only custom sidebar panel (JavaScript)
  │    ├─ Statistics, exclusions and entity manager
  │    └─ YAML Preview, Preview/Production comparison and reviewed Apply
  ├─ Two button entities: Preview configuration / Generate configuration
  ├─ HA service: ha_voice_label_sync.generate
  └─ Authenticated, administrator-only WebSocket API
         ├─ get_entities / set_entity_label
         ├─ generate_preview / get_preview
         └─ apply_preview
                 │
                 ▼
       Native HA registry snapshot / entity catalog
       entity · device · area · label registries
                 │
                 ▼
          Independent Python core (src/hvls)
       select entities · render Google Assistant YAML
                 │
        ┌────────┴─────────┐
        ▼                  ▼
 Preview generation     Direct generate action
 .hvls/preview.yaml     configured production YAML
        │                  │
        ▼                  └─ separate automation/action pathway
 compare to production
        │
        ▼
 explicitly reviewed Apply
 revalidate → optional backup → safe production write
```

The frontend is served by `custom_components/ha_voice_label_sync/frontend/hvls-preview-panel.js` and registered by `__init__.py`. Its URL includes a content-derived SHA-256 fingerprint to reduce stale browser caching.

## Module responsibilities

| Location | Responsibility |
| --- | --- |
| `custom_components/ha_voice_label_sync/__init__.py` | Integration setup, sidebar panel, static frontend resources, platform loading and API registration. |
| `config_flow.py` / `const.py` | Configuration and options: Google Assistant backend, label, output path, backup enabled and retention; read-only Google configuration diagnostic. |
| `ha_registries.py` | Snapshot four live Home Assistant registries on the HA event-loop thread; adapt them to the independent core format. |
| `entity_catalog.py` / `preview_exclusions.py` | Build UI catalog and reasons for entities excluded from Google Assistant selection. |
| `entity_label_writer.py` / `label_update.py` | Change only the configured HVLS label, with eligibility and stale-state protections. |
| `websocket.py` | Admin-only entity, Preview and reviewed-Apply endpoints. |
| `services.py` / `button.py` | Preview and direct-generation workflows, HA service and two button entities; shared workflow lock. |
| `preview_compare.py` / `preview_guard.py` / `preview_apply.py` | Analyze YAML differences; verify SHA-256 digests and current content before reviewed Apply. |
| `src/hvls/` | HA-independent selection, Google Assistant YAML generation, CLI and filesystem writing/backups. |

The current Home Assistant integration uses **live native HA registries**. The standalone CLI/core remains independent of Home Assistant and supports its own registry inputs. UI-only decisions do not replace server-side validation.

## Current configuration

The Config Flow / Options Flow exposes:

- Backend: Google Assistant (the only implemented backend).
- Label: `google_assistant` by default.
- Production output: `/config/google_assistant_entities.yaml` by default.
- Automatic backup toggle: **enabled by default**.
- Backup retention: **10 by default**.

The native integration uses the fixed supported-domain set in `services.DEFAULT_DOMAINS`. The old architecture document's editable domain list and five-backup default are not descriptions of the current HA interface.

The user must configure the existing manual Google Assistant integration to include the generated file in its `entity_config`; HVLS does **not** rewrite `configuration.yaml`.

## Current Preview and production workflows

### Review-first panel workflow (recommended)

1. The user adds/removes the configured HVLS label in the panel or through Home Assistant.
2. **Generate Preview** snapshots live registries, runs the Python core in dry-run mode, then writes the generated YAML atomically to `/config/.hvls/preview.yaml`. **Production is unchanged.**
3. **Get Preview** reads that YAML, compares it with the configured production file and returns excluded-entity diagnostics, summary/diff information and SHA-256 fingerprints.
4. **Apply Preview** requires explicit user confirmation and the previously reviewed Preview/production hashes.
5. The server serializes the operation under its workflow lock, re-reads live registries, regenerates the proposed YAML, verifies that the Preview still matches, confirms that production has not changed and rejects an empty entity selection.
6. Only the validated content is written to the configured production file, using the core's protected writer and a backup **when the backup option is enabled**.

If any verification fails, the reviewed Apply must stop rather than silently overwrite unexpected changes. The panel does not automatically apply label changes.

### Separate direct-generation entry points

The `ha_voice_label_sync.generate` service and **Generate configuration** button can write the configured production file directly. **Preview configuration** generates a Preview without changing production. These direct pathways are distinct from the panel's reviewed-Apply workflow and must not be described as requiring its UI confirmation.

## Safety boundaries and limitations

- Panel and WebSocket operations require Home Assistant administrator permissions.
- Entity-label additions are checked against the current eligible-entity catalog on the server; removing an existing HVLS label remains possible even for an excluded entity.
- Label edits preserve other labels and use the expected prior label state to detect stale actions.
- Reviewed Apply checks both Preview and production SHA-256 hashes and regenerates with current registries.
- Generated Preview and production content use protected writes. Production backups and their retention are configurable; a backup is **not guaranteed** if disabled or if the file did not previously exist.
- Current implementation does not provide a Home Assistant UI backup browser or restore-latest button/service. Recovery from available backup files remains a separate operational procedure.
- Applying YAML does not automatically reload Google Assistant or trigger Google Home synchronization.

## What is planned, not implemented

[ROADMAP.md](ROADMAP.md) tracks beta.3 UX work, including streamlined navigation, automatic Preview refresh **without automatic production Apply**, clearer Preview details and refreshed user-facing documentation.

A generic Home Assistant label manager and additional assistant backends (for example Alexa or HomeKit) are possible future ideas, **not implemented capabilities or promised beta.3 features**.

## Development and releases

See [WORKFLOW.md](WORKFLOW.md) for contribution stages, test and review guidelines and the release checklist. Keep this architecture file focused on the implementation, not project-management steps.
