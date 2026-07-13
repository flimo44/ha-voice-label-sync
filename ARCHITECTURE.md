## WORKFLOW.md
# Development Workflow
This document describes the development workflow used by the HA Voice Label Sync project.
The objective is to keep the project simple, maintainable and well documented.

1. Idea
Every improvement starts with an idea.
At this stage:
* No code is written.
* The idea is discussed.
* The project vision (PRODUCT.md) is checked.
Questions:
* Does it solve a real problem?
* Does it fit the project philosophy?
* Is it worth implementing?

2. Issue
If the idea is accepted:
* Create a GitHub Issue.
* Assign labels.
* Assign the milestone.
* Add it to the GitHub Project.

3. Planning
Move the issue:
Ideas
?
Planned
The feature is now officially part of a future release.

4. Local Development
All modifications are made locally.
Never edit files directly on GitHub unless absolutely necessary.

5. Testing
Before committing:
* Review the code.
* Review the documentation.
* Verify Markdown rendering.
* Test the feature.

6. Git
Development cycle:
git status
?
git add
?
git commit
?
git pull �rebase
?
git push

7. Documentation
Every user-visible change must be documented.
Update when required:
* README.md
* CHANGELOG.md
* Examples
* Documentation
A feature is not considered complete until its documentation is updated.

8. Release
Move the issue through the project workflow:
Ideas
?
Planned
?
Development
?
Testing
?
Documentation
?
Released
Close the Issue after the release.

Guiding Principles
* Think before coding.
* One step at a time.
* Validate before continuing.
* Never trust code blindly. Understand it first.
* Documentation is part of the feature.
* Home Assistant remains the source of truth.
* Simplicity over complexity.
* Build on solid foundations.

---

# Release Checklist

Before closing an issue or considering a change released, verify:

- [ ] The idea has been validated.
- [ ] A GitHub Issue exists.
- [ ] The issue is assigned to a Milestone.
- [ ] The issue is linked to the Project.
- [ ] Development is complete.
- [ ] The feature has been tested.
- [ ] Documentation has been updated.
- [ ] CHANGELOG has been updated if required.
- [ ] `git status` is clean.
- [ ] Changes have been committed.
- [ ] `git pull --rebase` completed.
- [ ] Changes have been pushed.
- [ ] The issue is moved to Released.
- [ ] The GitHub Issue is closed.

---
> Never skip a checklist item because “it is only a small change”.


# Architecture

## Vision

HA Voice Label Sync (HVLS) is designed to become the simplest way to manage
voice assistant exposure from Home Assistant labels.

The primary goal is not only to generate a YAML file but to provide a complete
native Home Assistant experience while keeping the underlying generation engine
independent and reusable.

The user should only need to:

1. Install the integration (HACS or manual).
2. Add a single include line in `configuration.yaml`.
3. Configure HVLS from the Home Assistant UI.
4. Generate the configuration with one click.

No SSH access or manual Python execution should be required.

---

# Design principles

HVLS follows a few simple principles.

## Simplicity

Installation and daily usage should be as simple as possible.

Configuration should be performed from the Home Assistant interface whenever
possible.

## Safety

HVLS must never overwrite configuration without protection.

Every generation should:

- validate the generated configuration
- create a backup
- write atomically
- allow restoration

## Transparency

The user should always know what HVLS is about to generate before writing the
configuration.

A Dry Run mode should always be available.

## Modularity

The generation engine must remain independent from the Home Assistant
integration.

This allows:

- command line execution
- Home Assistant integration
- future API
- future multiple backends

without duplicating code.

---

# High level architecture

```
                   Home Assistant UI
                           │
                           ▼
                HA Voice Label Sync
                           │
        ┌──────────────────┴──────────────────┐
        │                                     │
        ▼                                     ▼
 Configuration                     Generation Engine
        │                                     │
        ▼                                     ▼
 Config Flow                   Registry Reader
 Options Flow                  Label Resolver
 Buttons                       YAML Generator
 Services                      Validation
 Sensors                       Backup Manager
```

The Home Assistant integration should only orchestrate the engine.

Business logic must stay inside the generation engine.

---

# User workflow

The expected workflow is:

```
Install

↓

Configuration

↓

Dry Run

↓

Preview

↓

Generate

↓

Backup

↓

Done
```

---

# Planned Home Assistant features

## Configuration

The integration should allow configuring:

- label name
- output file
- supported domains
- backup retention

without editing Python code.

---

## Dry Run

Generate the configuration in memory.

Display:

- entity count
- ignored entities
- warnings
- generated YAML preview

without writing anything.

---

## Generate

Generate the YAML configuration.

Before writing:

1. Validate
2. Backup
3. Atomic write
4. Report result

---

## Backup

Automatically create a backup before every generation.

Allow restoring previous versions.

---

## Restore

Restore a previous generated configuration directly from Home Assistant.

---

## Services

The integration should expose services such as:

- Generate configuration
- Dry Run
- Backup
- Restore

These services should be usable inside Home Assistant automations.

---

# Long-term objective

The current Google Assistant backend is only the first implementation.

The architecture should allow supporting additional voice assistants without
rewriting the generation engine.

Possible future backends:

- Google Assistant
- Alexa
- HomeKit
- Matter
```
# Integration architecture

HVLS is split into independent layers.

The Home Assistant integration orchestrates the workflow, while the core
engine contains all registry reading, selection, generation and validation
logic.

```text
┌──────────────────────────────────────────────┐
│ Home Assistant user interface                │
│                                              │
│ Config flow · Options · Buttons · Actions    │
└──────────────────────┬───────────────────────┘
                       │
┌──────────────────────▼───────────────────────┐
│ HVLS integration layer                       │
│                                              │
│ Coordinates requests, reports results and    │
│ exposes Home Assistant entities/actions.     │
└───────────────┬──────────────────┬───────────┘
                │                  │
┌───────────────▼──────────┐ ┌─────▼──────────────┐
│ Generation engine       │ │ Backup manager     │
│                         │ │                    │
│ Registry reader         │ │ Create backup      │
│ Label resolver          │ │ List backups       │
│ Entity selector         │ │ Restore backup     │
│ Backend renderer        │ │ Apply retention    │
│ Validator               │ │                    │
└───────────────┬─────────┘ └────────────────────┘
                │
┌───────────────▼───────────────────────────────┐
│ Safe file writer                              │
│                                              │
│ Temporary file · Validation · Atomic replace │
└───────────────────────────────────────────────┘
Core engine

The core engine must not depend directly on Home Assistant UI components.

It receives explicit input parameters and returns structured results.

Example input:

label: google_assistant
domains: light, switch, cover, climate, lock
output: google_assistant_entities.yaml
dry_run: true

Example result:

success: true
entity_count: 42
domain_counts:
  light: 12
  switch: 19
warnings: 2
generated_content: ...

The same engine must be usable by:

the current command-line script
the Home Assistant integration
automated tests
future voice assistant backends
Internal data model

Before generating assistant-specific configuration, selected Home Assistant
entities should be represented using a neutral internal model.

Example:

entity_id: switch.prise_pompe2
domain: switch
name: Pompe piscine
area: Piscine
labels:
  - google_assistant

The registry reader and selector produce this neutral representation.

A backend renderer then converts it into the required output format.

Home Assistant registries
          │
          ▼
Neutral entity model
          │
          ├── Google Assistant renderer
          ├── Future Alexa renderer
          ├── Future HomeKit renderer
          └── Future backends
Home Assistant integration layer

The integration layer is responsible for:

installation through the Home Assistant UI
configuration and options
exposing actions and entities
launching dry runs and generations
displaying execution results
coordinating backups and restores
logging errors clearly

It must not duplicate generation logic.

Configuration

The initial configuration should support:

label name
enabled domains
output filename
backup retention

Recommended defaults:

label: google_assistant
output: google_assistant_entities.yaml
backup retention: 5

The output path must remain restricted to the Home Assistant configuration
directory.

Actions

The integration should expose these Home Assistant actions:

ha_voice_label_sync.dry_run

Generate and validate the configuration without writing a file.

Expected result:

entity count
count by domain
ignored entities
warnings
generated YAML preview
ha_voice_label_sync.generate

Generate the configuration and safely write it.

Execution order:

Read registries.
Resolve the configured label.
Select entities.
Render the target backend.
Validate generated content.
Create a backup of the current file.
Write to a temporary file.
Atomically replace the destination.
Report the result.
ha_voice_label_sync.backup

Create a manual backup of the current generated file.

ha_voice_label_sync.restore_latest

Restore the most recent valid backup after explicit confirmation.

Home Assistant entities

The MVP may expose:

button.hvls_dry_run
button.hvls_generate
button.hvls_backup
button.hvls_restore_latest

sensor.hvls_last_result
sensor.hvls_last_run
sensor.hvls_entity_count

Buttons provide simple dashboard access.

Actions remain available for scripts and automations.

Safety requirements

HVLS must follow these rules:

Never modify configuration.yaml.
Never overwrite a generated file without a backup.
Never replace the destination with invalid or incomplete content.
Restrict file operations to approved paths.
Validate backup content before restoration.
Keep a configurable number of backups.
Clearly report partial failures and warnings.
MVP scope

The first Home Assistant integration release includes:

manual or HACS installation
setup through the Home Assistant UI
configurable label
configurable supported domains
dry-run action
generate action
automatic backup before generation
restore latest backup
last-run status sensors
French and English translations

The MVP does not include:

a custom frontend panel
editing Home Assistant labels
automatic Home Assistant restart
multiple voice assistant backends
graphical backup history
automatic generation after every registry change

These features may be considered after the core integration is stable.

Manual configuration requirement

HVLS must not rewrite the user's Home Assistant configuration.

For the Google Assistant backend, the user remains responsible for adding the
required include once:

google_assistant:
  entity_config: !include google_assistant_entities.yaml

After this initial change, normal HVLS usage should be possible entirely from
the Home Assistant interface.

Future user interface

A future dedicated HVLS panel may provide:

label selection
domain selection
YAML preview
entity preview grouped by area
generation controls
backup history
restore selection
warning and validation details

This interface will use the same integration actions and core engine as the
MVP.
