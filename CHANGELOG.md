# Changelog

All notable changes to this project will be documented in this file.

The format is inspired by Keep a Changelog.

# Changelog

## [Unreleased]

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
