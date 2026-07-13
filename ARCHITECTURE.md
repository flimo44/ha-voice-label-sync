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
