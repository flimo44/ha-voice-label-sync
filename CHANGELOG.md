# Changelog

All notable changes to this project will be documented in this file.

The format is inspired by Keep a Changelog.

# Changelog

## [Unreleased]

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
