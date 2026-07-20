# HA Voice Label Sync – Product Vision

## Mission

Enable Home Assistant users to manage voice assistant exposure directly from Home Assistant labels.

The project removes the need to manually maintain voice assistant configuration while keeping Home Assistant as the single source of truth.

> This document describes the long-term vision of the project.
>
> It intentionally evolves much more slowly than the implementation.

---

# Problem Statement

Managing voice assistant exposure manually quickly becomes difficult on medium and large Home Assistant installations.

Users currently have to:

- manually edit configuration files
- keep friendly names synchronized
- maintain room assignments
- remember every newly created entity
- regenerate configuration after each change

This process is repetitive, error-prone and discourages users from maintaining a clean configuration.

---

# Solution

HA Voice Label Sync automatically generates the required configuration from Home Assistant labels.

Users simply manage labels inside Home Assistant.

Everything else is generated automatically.

---

# Design Principles

## 1. Home Assistant remains the source of truth

The project never creates a second place where users must manage entities.

Labels are the only selection mechanism.

---

## 2. Simplicity first

The project should remain understandable by any Home Assistant user.

Configuration must stay simple.

---

## 3. Safety first

The project must never overwrite user data without protection.

Whenever possible it should:

- preview changes
- create backups
- explain modifications

---

## 4. Follow Home Assistant philosophy

The project complements Home Assistant.

It does not replace existing features.

---

## 5. User experience matters

Managing a voice assistant should become as simple as adding or removing a label.

---

## 6. Build on solid foundations

Good architecture and documentation always come before new features.

---

# Non Goals

HVLS is **not** intended to:

- replace Home Assistant voice integrations
- replace Home Assistant Areas
- become a complete voice assistant manager
- duplicate Home Assistant configuration
- introduce another entity management system

Its purpose is only to synchronize voice assistant configuration from Home Assistant labels.

---

# Target Users

### Today

- Home Assistant users
- Medium and large installations
- Users managing Google Assistant

### Tomorrow

- Amazon Alexa users
- Apple Home users
- Future Home Assistant voice integrations

---

# Product Evolution

## v0.1 Foundation ✅

Initial public release.

CLI-based configuration generation from Home Assistant labels.

---

## v0.2 User Experience ✅

Focus on usability.

- Preview
- Backup
- Diff
- Better feedback

---

## v0.3 Home Assistant Integration ✅

HVLS became a complete Home Assistant integration.

Highlights:

- Config Flow
- Options Flow
- Preview panel
- Generate action
- PyPI package
- GitHub Actions
- HACS compatibility

---

## v0.4 Multi Voice Assistant

Expand the same workflow to additional voice assistants while preserving the same label-driven philosophy.

Potential targets:

- Amazon Alexa
- Apple Home
- Future Home Assistant integrations

---

## v0.5 Ecosystem

Focus on reliability.

- Documentation
- Community feedback
- Continuous improvements
- Long-term maintenance

---

## v1.0 Stable

A mature project providing a reliable and intuitive way to manage voice assistant exposure from Home Assistant labels.

---

# Long-Term Vision

Home Assistant labels become the single source of truth for voice assistant exposure.

Users should never need to manually maintain voice assistant configuration again.