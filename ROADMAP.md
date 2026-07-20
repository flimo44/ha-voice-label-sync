# HA Voice Label Sync Roadmap

> **Expose only the entities you choose, verify the result, then generate safely.**

---

# Vision

HA Voice Label Sync aims to become the simplest and safest way to manage
voice assistant exposure from Home Assistant labels.

The project focuses on:

- Native Home Assistant experience
- Safe preview before generation
- Simple configuration
- Multi-backend architecture
- Easy installation through HACS
- Reliable automation-friendly workflows

---

# v0.2.x — Foundation

## Core

- [x] Reusable HVLS Python engine
- [x] Registry reader
- [x] Neutral entity selection engine
- [x] Google Assistant backend
- [x] Safe filesystem writer
- [x] Automatic backups
- [x] PyPI package

## Home Assistant

- [x] Native integration
- [x] Config Flow
- [x] Options Flow
- [x] Generate action
- [x] Preview action
- [x] Preview panel
- [x] Authenticated WebSocket API
- [x] Configuration translations

## Remaining

- [x] Documentation refresh
- [x] Installation guide
- [x] HACS metadata
- [x] Logo & branding

---

# v0.3 — User Experience

Goal:
Make HVLS enjoyable for everyday users.

## Dashboard

- [ ] Unified dashboard
- [ ] Configuration summary
- [ ] Status section
- [ ] Action center

## Preview

- [ ] Optional sidebar panel
- [ ] Better Preview navigation
- [ ] Preview history
- [ ] Diff against current configuration

## Configuration

- [ ] Simplified mode
- [ ] Advanced mode
- [ ] Better validation
- [ ] Inline help

---

# v0.4 — Voice Assistant Platform

Goal:
Support additional assistants without changing the workflow.

- [ ] Alexa backend
- [ ] Future HomeKit backend
- [ ] Generic backend architecture
- [ ] Backend selector improvements

---

# v0.5 — Reliability

- [ ] Status entities
- [ ] Automatic reload
- [ ] Diagnostics
- [ ] Better notifications
- [ ] Backup browser
- [ ] Restore workflow

---

# v1.0 — Stable Release

## Product

- [ ] Published on HACS
- [ ] Stable API
- [ ] Complete documentation
- [ ] Installation wizard
- [ ] Visual identity
- [ ] Screenshots
- [ ] Examples

## Quality

- [ ] Full CI
- [ ] Integration tests
- [ ] Backward compatibility
- [ ] Translation support

## User Experience

- [ ] Production-ready Dashboard
- [ ] Preview workflow
- [ ] Generate workflow
- [ ] Restore workflow

Ready for production.
