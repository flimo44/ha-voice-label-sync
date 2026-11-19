# Changelog

All notable changes to this project will be documented in this file.

The format is inspired by Keep a Changelog.

## [Unreleased]

### Fixes
- English panel: the message shown when a takeover backup succeeds but ownership is not transferred was in French.

### Improvements
- Italian translation of the panel, configuration screens and setup diagnostic (including regional variants such as it-CH).
- Spanish translation of the panel, configuration screens and setup diagnostic (including regional variants such as es-419).
- German translation of the panel, configuration screens and setup diagnostic. Home Assistant users with German (including regional variants such as de-CH) get the German interface automatically.
- Translations: the panel, setup diagnostic and configuration screens now support any number of languages (Home Assistant language with fallback to the base language, then English) instead of French or English only. Remaining hard-coded French/English texts (YAML file issue explanations, setup hints) moved to the translation tables, and tests check that every language is complete. See CONTRIBUTING.md, "Adding a language".

## [1.2.0] - 2026-11-19

Requires the Python core `ha-voice-label-sync==0.3.8`.

### Improvements
- Backups: preparing a backup while a restoration or label proposal is pending in Preview now asks whether to cancel it and prepare the selected backup instead; answering no changes nothing. Preparing the backup that is already staged simply opens Preview.
- Preview: each removed entity shows why it leaves the YAML: HVLS label removed in this proposal, absent from the restored backup, no longer labeled, no longer eligible (with the reason) or no longer existing in Home Assistant.
- Restore Preview redesigned as a three-column plan: **Not restored** (impossible entities locked, others restorable with one click), **Name or room changed** (restored with current Home Assistant values) and **Result for Google** (exactly what will be written: added, already exposed, current name/room, and in red the entities exposed today but absent from the backup, with **Keep** / **Keep all**). Each column has an ⓘ help. A single summary (exposed after restoration, added, already exposed, no longer exposed) is reused by the final confirmation, and HA label details move to a collapsed technical section.
- Opening a backup restore now starts from the recommended selection computed by the server: entities that cannot be regenerated are not restored, renamed or moved ones use current values, and the result follows the backup. **Back to the recommendation** resets manual choices.
- Restore Preview: when HA labels cannot reproduce a backup exactly, list each blocking entity with a readable reason (for example name in the backup vs current Home Assistant name, missing or ineligible entity) and offer an **Ignore** button per entity plus **Ignore these N entities**. Ignored entities are not restored and keep their current state; the server still recalculates and verifies every choice before Apply.
- Restore Preview: ignored entities stay listed with **Restore** / **Restore all** buttons, the final confirmation names the ignored entities that will not be restored, the remaining "Other entities that can be ignored" list is collapsed and no longer repeats them, and ignore controls are disabled while the Preview is recalculated.
- Restore Preview: an entity whose only differences are its name or room (renamed in Home Assistant since the backup) can be restored with **Restore with current name and room**, per entity or in bulk. The server only accepts name/room differences for entities it offers, binds the choice to the approval, shows the exact YAML that will be written, and the final confirmation lists these entities.

### Fixes
- Restore: a restoration with ignored entities or current values is written in the HVLS generator format (room sections, quoted names and rooms) instead of a plain YAML dump, so the YAML diff no longer mixes quoted and unquoted values and the next Preview shows no formatting-only difference. A backup restored without any choice keeps its own text.
- Restore plan: the summary counts additions, already exposed entities and removals against the production YAML, like the YAML comparison, tab badge and status line (23 vs 24 mismatch). Entities exposed today whose HVLS label was already removed in Home Assistant are now listed as removals with that reason and cannot be kept. The status line states that the figures apply when the restoration is applied and that nothing is written before.
- Integration page: the service device subtitle is the language-neutral "Google Assistant" instead of the English "HVLS integration" (Home Assistant does not translate device models), and the French options menu now reads "Vérifier Google Assistant".
- Panel: the Preview tab badge and the pending-changes alert count every affected entity for a label proposal, including YAML changes coming from Home Assistant itself, instead of only the checkboxes changed ("Preview (1)" next to three listed changes). The banner shown when a saved proposal is restored uses the same figures, with the added / removed / modified breakdown.
- Panel: the bucket for entities without an area is shown in the panel language ("No area" in English) in Statistics breakdowns and entity lists, instead of the French "Sans pièce".
- Prefix the device name for entities that only have a generic entity name (`has_entity_name` entities such as "Température" or "Humidité"), which previously gave several devices the same Google name. User-defined names, entities without a name and legacy entities keep exactly their previous name, so existing voice names do not change. Affected entities appear in the next Preview; nothing is written before an explicit Apply.
- Python core: a label made only of non-Latin characters or emoji no longer matches every other such label through an empty slug.
- Python core: strip control characters, lone surrogates and Unicode noncharacters from entity and room names so the generated YAML always loads.

### Upgrade notes
- Backups created before the entity name fix may contain the previous generic names (for example "Temperature"). Their label-based restoration is then not exact: use **Ignore** on the affected entities in the restore Preview, or restore them later after renaming.
- The two Python core fixes are shipped in `ha-voice-label-sync==0.3.8`, now required by `manifest.json`; the entity name fix ships with the integration itself.

## [1.1.2] - Release candidate (pending Synology VM validation)

### Security
- Prevent Google Assistant YAML injection through Home Assistant area/room names, including newlines and Unicode line separators (U+0085, U+2028, U+2029). Room comments cannot create additional YAML entity keys.
- Always serialize entity names and room values as quoted YAML strings. Numeric-looking names, booleans and special scalars remain strings, while accented characters and emoji stay readable.
- Require the published Python core package `ha-voice-label-sync==0.3.7` containing the hardened YAML backend.

### Fixes
- Request explicit approval for high-impact removal of at least 3 entities representing at least 50% of the production configuration, including small HA installations; backend and JavaScript UI agree on the threshold.
- Add the missing `unsafe_output_path` options error translation in English and French.

### Validation and upgrade notes
- PRs #187 and #188 passed Python, JS, Hassfest, HACS, packaging and Home Assistant sandbox checks before merge; the final combined candidate requires fresh checks.
- The Python core 0.3.7 package was published to PyPI on 2026-11-17. Install the integration candidate on an isolated Home Assistant VM and verify core availability, the Preview/Apply workflow and removal confirmation before publishing a stable release.
- No change to YAML ownership, production SHA checks, backups or required Preview -> explicit Apply.
- The independent path-alias/write-path consistency concern and sidebar cleanup on uninstall are not covered by this release.

## [1.1.1] - 2026-11-16

### Fixed
- Allow a deliberate, reviewed removal of the last selected HVLS entity (1 → 0). The empty selection is staged in Preview and requires explicit confirmation before Apply; accidental empty generations and empty recoveries remain refused.
- Default Entity Management to « Sans HVLS — éligibles » so first-time users can immediately select an eligible entity, while allowing manual filter changes.
- Add a direct GitHub Issues reporting link in the Assistant, localized in French and English.

### Validation
- Regression tests added for deliberate final-entity removal, refusal of unsafe empty plans, default filter and confirmation behavior.
- All five PR #185 CI checks passed; the change was exercised successfully on an isolated Synology Home Assistant VM before merge.
- No changes to the review/Apply safety architecture, ownership checks, SHA verification, or backup policy.


## [1.1.0] - Release candidate (date set at publication)

### Added and improved
- Guided onboarding for a new configuration or an existing Google Assistant YAML, including safe recovery and inspection before changes.
- Entity selection can continue in Management or Statistics without forcing an immediate switch to Preview; the Preview tab shows the pending-change count.
- Contextual Google Assistant YAML setup help with complete examples and non-blocking warnings when Google Assistant is not yet connected.
- Recovery from backups and missing output through reviewed Preview, preserving safeguards around file ownership and HA entity labels.

### Security and fixes
- All production changes require reviewed Preview -> Apply, including restoration; protect existing production YAML, validate configured output paths and reject invalid YAML before writing.
- Require explicit confirmation of bulk removals, guard unsaved proposals and preserve pending selections during navigation.
- Disable legacy direct generation and retire the old Home Assistant button entities; existing automations calling `ha_voice_label_sync.generate` now fail explicitly and must migrate to reviewed Preview -> Apply.
- Fix the `À valider` action to open Preview without toggling the checkbox, and compute frontend JS asset hash without blocking HA's event loop.

### Validation and upgrade notes
- Python unit tests, frontend JavaScript regressions, Ruff, package checks, Hassfest and HACS validation passed on integrated main before release preparation.
- Installation, selections, Preview -> Apply, YAML/label consistency and backup restoration were exercised on an isolated Home Assistant Synology VM.
- Existing retired button entities may appear unavailable in HA until the administrator cleans up the entity registry; no silent removal is performed.
- Google Home synchronization remains a separate step from the HVLS YAML and labels workflow.


## [1.1.0-beta.5] - 2026-11-15

### Security
- Remove the two legacy Home Assistant button entities (`Generate configuration`, `Preview configuration`), avoiding direct writes and accidental Preview replacement outside HVLS.
- Keep the legacy `ha_voice_label_sync.generate` service registered but make it **fail explicitly**, including in existing automations. The legacy direct workflow rejects any `dry_run=False` call before accessing HA registries or writing files.
- The native HVLS Preview -> explicit reviewed Apply WebSocket path is unchanged. Existing unused button entities can remain unavailable in HA; they are not silently deleted from the registry.

### Fixed
- `À valider` is now an independent accessible Preview action rather than part of the HVLS checkbox label; clicking it no longer deselects the pending entity. Fixed in both entity management and statistics.
- Register the integration's existing virtual device as a service with a native **Visit** link to `homeassistant://hvls-preview`. It remains available without the legacy buttons.
- Correct entry unload after removing the button platform, avoiding an unnecessary attempt to unload an unregistered platform.

### Validation
- Python/JavaScript regressions test direct-write refusal, unfinished setup safety, independent pending-label review, and native device navigation.
- Run the VM installation, upgrade and restoration tests before promoting a stable release.
- **Known limitation:** unapproved UI drafts are not durable across all refresh/migration paths (see issue #170); production writes continue to require explicit Apply.


## [1.1.0-beta.4] - 2026-11-15

### Fixed
- After successful existing-YAML takeover and reviewed Apply, the Assistant no longer automatically expands the legacy global migration audit (which may list thousands of unrelated HA entities as `pending_review`).
- Show a concise managed-output status; the full diagnostic remains available on deliberate expansion.
- Interrupted recovery, stale recovery snapshots, and incomplete ownership reconciliation must still surface their safety warnings; the code does not alter YAML generation, labels, backups or Apply guards.

### Regression tests
- Completed migration with a legacy 6,408-entity report remains folded.
- User-invoked advanced diagnostics remain accessible.
- Genuine interrupted recovery and incomplete reconciliation stay visible.


## [1.1.0-beta.3] - 2026-11-15

### Fixed
- Restore the Assistant's existing-YAML takeover path when Home Assistant already has an active manual Google Assistant configuration.
- Show the detected YAML, its entity count and a read-only inspection action when the configured output is unmanaged or belongs to an inactive HVLS installation.
- Keep the takeover workflow hidden for managed or ambiguous configurations; no labels or production YAML are modified by inspection.

### Validation
- Regression tests cover active manual Google Assistant YAML, the visible takeover path, and safe refusal in other ownership states.
- Production takeover still requires separate explicit review, verified backup, and guarded Preview Apply. Test on the HA VM before using in production.


## [1.1.0-beta.2] - 2026-11-15

### Release correction
- The `v1.1.0-beta.1` tag was accidentally created from `main`; it contained integration version `1.0.1` and not the recovery changes.
- `v1.1.0-beta.2` is the intended first public test build for the features listed below. Its tag **must** target `feat/reinstall-recovery-via-preview`, and its manifest must say `1.1.0-beta.2`.



### Added
- Guided initial setup: choose whether to select current Home Assistant entities or review an existing YAML file, without silently overwriting production.
- Recovery via explicit Preview: reconcile entities from an older Google Assistant YAML against the live HA registry; preserve currently labeled entities and report obsolete, missing or ineligible entries.
- Backup-first takeover for a previous HVLS installation with SHA-256 ownership checks and explicit approval.
- Restore a previous backup or reconstruct a deleted HVLS-managed YAML after reviewing the proposed changes, without reinstalling HVLS.
- Show current labeled entities even when no production YAML exists; first-generation Preview requires explicit Apply.
- Preserve pending label proposals when navigating between Statistics, Entity Management and Preview.

### Improved
- Detailed initial-recovery comparison, including old and proposed YAML entity counts.
- An explicit route from **Choose my entities in HA** to Entity Management; no clearing of existing labels.
- Guarded file recreation and backup reconciliation, with refusal of foreign owners, stale reviews, unsafe paths, or files reappearing during recovery.

### Validation and limits
- Python and JavaScript regression tests, package checks, HACS validation, Hassfest, and isolated Home Assistant Core checks.
- End-to-end test VM coverage of YAML takeover (40 → 28), initial creation (28 entities), restart persistence and missing-production recovery flows; additional early-beta feedback remains welcome.
- Google Cloud project, DNS/HTTPS and Home/Google Assistant account linkage remain manual and outside HVLS.
- The Home Assistant integration uses the separately released `ha-voice-label-sync==0.3.6` Python core; no new PyPI release is included in this beta.


## [1.0.1] - 2026-11-10

### Fixed
- Automatically create the configured Home Assistant label when missing during initial setup, options updates, or startup of an existing integration.
- Reuse existing labels without duplicates and reject ambiguous or invalid label names; display localized errors during configuration.
- Add first-run regression tests for default/custom labels, existing labels, ambiguity, and creation failures.

## [1.0.0] - 2026-11-09

### Stable V1 release
- Mature Home Assistant UI built around **Select → Review → Apply**, with Statistics, HVLS Entity Management, Preview, Backups and conditional Excluded entities navigation.
- Live Home Assistant registry catalog: domain and room grouping, search/filter, eligibility explanations, label changes with confirmation, and native HA More Info links.
- Pending-changes warning in Statistics, with direct navigation to Preview. HVLS label changes regenerate Preview but **never automatically overwrite production YAML**.
- Read-only production status markers beside selected entities in Statistics: green for present unchanged in production, amber for unapplied additions/changes, neutral when comparison is unavailable; tooltips and FR/EN descriptions.
- Entity-level Preview-versus-production differences (added/removed/modified/unchanged), explicit reviewed Apply, SHA-256 freshness checks, safe YAML writes and optional normal backups.
- Backup history browser, directional comparison and administrator-confirmed restore with mandatory safety backup, checksum checks and atomic replacement. Restoring YAML never changes HA labels or registries.
- Updated README, screenshots and HACS installation guidance; frontend cache-busting and localization improvements.

### Verification
- PR #96 production status markers merged and tested in Home Assistant: pending indicators turn green after applying and refreshing Preview.
- Python, JavaScript, package, Hassfest and HACS CI checks passing on `main` prior to release preparation.
- Native integration depends on the separately versioned Python core `ha-voice-label-sync==0.3.5`; this release does **not** publish a new PyPI core.
- Google Assistant setup, connection and Google Home device synchronization remain manual; the guided setup wizard is planned for V2.

## [1.0.0-beta.5] - 2026-11-09

### Added
- Pending Preview-change warning in Statistics, linking to Preview.
- Quick removal of the HVLS label from Statistics domain/area lists with the confirmed safe label workflow.

## [1.0.0-beta.4] - 2026-11-09

### Added
- Backup history, production comparison, protected restoration and compulsory safety copy.
- Statistics by room and native More Info links in Preview changes.

## [1.0.0-beta.3] - 2026-11-08

### Improved
- Refined V1 panel navigation, live entity management and visual Preview-review workflow.

## [1.0.0-beta.2] - 2026-11-08

### Fixed
- Prevent assignment of the HVLS label to currently ineligible entities, including direct WebSocket requests.
- Disable the HVLS checkbox for ineligible, unlabeled entities, with an accessible exclusion reason indicator.
- Continue allowing removal of existing HVLS labels from entities that have become ineligible.
- Restore disabled checkbox state after an entity update; ensure localized JavaScript tests use a fixed locale.
- Add non-regression coverage for eligibility decisions and WebSocket refusal/removal flows.

### Validation
- 122 Python tests and 10 JavaScript tests passed on Tower2.
- Manually confirmed disabled controls, exclusion tooltip, and legacy label removal in Home Assistant.
- Python core dependency remains `ha-voice-label-sync==0.3.5`.

## [1.0.0-beta.1] - 2026-11-08 (published pre-release)

### Added
- Full Home Assistant entity catalog with domain grouping, search, filters and per-domain pagination.
- Interactive HVLS label management directly from the panel, with confirmation and preservation of other labels.
- Four-tab panel for statistics, excluded entities, entity management and YAML Preview.
- Native registry diagnostics, eligible/ineligible status and exclusion reasons.
- HVLS icon alongside the panel heading.
- French/English localization of panel controls, dynamic statistics, confirmations and errors.

### Improved
- Preview/Production comparison and review-before-Apply workflow.
- Automated coverage of the entity catalog, label updates and WebSocket operations.
- CI validation with Ruff, Python tests, HACS and Hassfest.

### Notes
- Google Assistant setup and Google Home linking remain manual; a guided wizard is planned for V2.
- The Python core remains `ha-voice-label-sync==0.3.5`; the Home Assistant integration has its own version.
- No production YAML is modified by changing labels alone. Explicit Preview generation and Apply are required.


## [0.3.1] - 2026-07-21

### Documentation

- Improved README
- Added installation guide
- Added configuration.yaml examples
- Clarified the role of HVLS
- Updated PRODUCT.md
- Updated ROADMAP.md

### Notes

No functional changes.

## [v0.3.0] - 2026-07-19

This release turns HA Voice Label Sync into a HACS-ready Home Assistant integration with a complete preview and generation workflow.

Highlights

- Added an authenticated Preview panel
- Added generated YAML preview
- Added a Generate button entity
- Improved the configuration interface
- Stored preview output in a dedicated file
- Added integration branding
- Added HACS metadata and validation
- Reworked the README and project roadmap
- Updated the Python package to version 0.3.0

Validation
- HACS validation passed
- Python checks passed
- Package build and validation passed

## [0.2.0] - 2026-07-15

### Added

- Reusable HVLS core package.
- Home Assistant registry reader.
- Neutral entity selection engine.
- Google Assistant YAML backend.
- Safe atomic file writer with backups and retention.
- Workflow orchestrator supporting dry-run and safe generation.
- Installable Python package and `hvls` command.
- Home Assistant custom integration.
- Configuration and options flows.
- Home Assistant generate action.
- PyPI and TestPyPI publishing workflows.

### Changed

- The historical `scripts/ga_label_sync.py` entry point now delegates to the
  reusable HVLS core.
- Project structure now separates the CLI, core engine, backends, writers and
  Home Assistant integration.

## [0.1.2] - 2026-07-12

### Fixed

- Quote YAML reserved words.
- Quote numeric-looking values.
- Transliterate accented characters.
- Better JSON loading errors.
- Warn when label does not exist.
- Automatically create output directory.

[0.1.0] - 2026-06-27

Added


Initial public release.
Generate Google Assistant entity_config from Home Assistant labels.
Home Assistant label filtering.
Friendly names support.
Area to Google Room mapping.
Support for input_select.
Support for select.
Hidden and disabled entity filtering.
Dry-run mode.

### Documentation

- Initial README.
- Quick Start guide.
- Configuration examples.
- Screenshots.
