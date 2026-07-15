# Changelog

All notable changes to this project will be documented in this file.

The format is inspired by Keep a Changelog.

# Changelog

## [Unreleased]

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

## [0.1.0]

### Added

- Initial public release.
- Home Assistant label filtering.
- Google Assistant entity generation.

## [0.1.0] - 2026-06-27

### Added

- Generate Google Assistant `entity_config` from Home Assistant labels.
- Friendly names support.
- Area to Google Room mapping.
- Support for `input_select`.
- Support for `select`.
- Hidden and disabled entity filtering.
- Dry-run mode.

### Documentation

- Initial README.
- Quick Start guide.
- Configuration examples.
- Screenshots.
