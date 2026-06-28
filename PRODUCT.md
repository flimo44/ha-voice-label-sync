# HA Voice Label Sync – Product Vision

## Mission

Enable Home Assistant users to manage voice assistant exposure directly from Home Assistant labels.

The project removes the need to manually maintain voice assistant configuration files while keeping Home Assistant as the single source of truth.

---

# Problem Statement

Managing Google Assistant entity exposure manually quickly becomes difficult on medium and large Home Assistant installations.

Users currently have to:

* manually edit YAML files
* keep friendly names synchronized
* maintain room assignments
* remember every newly created entity
* update the configuration after each change

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

Whenever possible:

* preview changes
* create backups
* explain modifications

---

## 4. Follow Home Assistant philosophy

The project complements Home Assistant.

It does not replace existing features.

---

## 5. User experience matters

The tool should feel natural.

Managing a voice assistant should become as simple as adding or removing a label.

---

## 6. Build on Solid Foundations

Take time to design before implementing.

Good architecture and documentation always come before new features.

---

# Target Users

Current

* Home Assistant users
* Google Assistant users
* Medium and large installations

Future

* Amazon Alexa
* Apple HomeKit
* Other voice assistant integrations

---

# Roadmap

## v0.1 Foundation

Initial public release.

## v0.2 User Experience

Improve usability:

* Preview
* Backup
* Diff
* Better feedback

## v0.3 Configuration

More customization while keeping simplicity.

## v0.4 Home Assistant Integration

Research deeper integration into Home Assistant.

## v0.5 HACS

Provide a complete HACS experience.

## v1.0 Stable

Production-ready project.

---

# Long-Term Vision

Home Assistant labels become the single source of truth for voice assistant exposure.

Users should never need to manually maintain voice assistant entity configuration again.
