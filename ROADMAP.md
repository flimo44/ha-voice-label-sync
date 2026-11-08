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

# v0.3.3 — Live Home Assistant Registries

Goal:
Avoid stale previews and generated configurations by using current Home Assistant registry data instead of delayed `.storage` writes.

## Home Assistant integration

- [ ] Read entity, device, area and label registries via `homeassistant.helpers` in memory.
- [ ] Pass a consistent snapshot of those registries to the HVLS library for preview and generation.
- [ ] Ensure newly assigned or removed labels are reflected immediately, without waiting for `.storage` persistence.

## Library and CLI compatibility

- [ ] Introduce a Home Assistant-independent registry input/adapter for the selection engine.
- [ ] Preserve `.storage` file loading for standalone CLI use and existing callers.
- [ ] Normalize in-memory registry structures to the format expected by the core engine.

## Quality and validation

- [ ] Add regression tests for immediate label changes and preview/generation consistency.
- [ ] Test all four registries, missing or invalid data, and CLI backward compatibility.
- [ ] Run Ruff, package checks, HACS validation and Hassfest before release.

---

# v1.0.0-beta.3 — Intuitive User Experience

Goal:
Make HVLS immediately understandable for people who already use the manual Home Assistant Google Assistant integration (without Home Assistant Cloud). The core journey is **Select → Review → Apply**. Keep production changes explicit and safe.

## Navigation and header

- [ ] Simplify the panel header: brand, mobile navigation, a compact refresh control and settings.
- [ ] Restore the Home Assistant sidebar/hamburger menu on narrow/mobile screens.
- [ ] Remove duplicate header actions (Generate Preview, Copy YAML, Apply Preview); keep actions where they are relevant.
- [ ] Make a single refresh action reload the entity catalog, regenerate the Preview and update summary/comparison data; prevent overlapping requests and stale results.
- [ ] Refresh the Preview after label changes without automatically applying anything to production.

## Entity management

- [ ] Add the **Without HVLS — eligible** filter (`eligible && !has_label`), while preserving existing filters.
- [ ] Open Home Assistant's native entity More Info dialog by clicking an entity name or ID, without interfering with the label checkbox; support mouse, touch and keyboard.
- [ ] Improve FR/EN explanations for excluded entities, clearly identifying the HVLS Google Assistant selection rules rather than implying the HA entity is deleted.
- [ ] Hide the **Excluded entities** tab when there are no excluded entities; show the count when non-empty and safely switch tabs when the last exclusion disappears.
- [ ] Distinguish an empty exclusion list from a failed/unfinished load.

## Preview and application workflow

- [ ] Show an understandable, grouped entity-level diff: additions, removals and modifications, with counts and before/after details where applicable.
- [ ] Make it clear that removal from generated Google Assistant configuration does not delete an entity from Home Assistant.
- [ ] Keep the complete generated YAML accessible in the Preview tab, with **Copy YAML** alongside it; consider a collapsible display for mobile readability.
- [ ] Place **Apply changes** in the Preview tab, after the review, instead of in the header.
- [ ] Preserve explicit confirmation, production/Preview SHA freshness checks, backups and existing safe-apply safeguards; never auto-apply production changes.
- [ ] Avoid redundant information between the Statistics and Preview tabs: overview in Statistics, actionable detail in Preview.

## HACS presentation and onboarding

- [ ] Replace the technical HACS description with a benefit-first, audience-specific description:
  > Already using Google Assistant with Home Assistant without Home Assistant Cloud? Easily manage exposed entities using labels.
- [ ] Clarify in the README that HVLS targets the manually configured Google Assistant integration, not Home Assistant Cloud's native exposure management.
- [ ] Refresh the README introduction and screenshots to match the beta.3 visual workflow; keep CLI, PyPI and `entity_config` details in technical sections.
- [ ] Avoid implying that HVLS installs Google Assistant or automatically synchronizes devices to Google Home.

## Validation before release

- [ ] Add/update Python and JavaScript regression tests for the filters, exclusions, HA navigation, entity details, Preview diff and review/apply safety.
- [ ] Validate the UX on desktop and mobile Home Assistant, including FR/EN and empty/error states.
- [ ] Run the available test suite and release checks; verify no regression relative to beta.2.

## Guiding principles

- Understandable without reading pages of documentation.
- Automate safe preparation, not irreversible production changes.
- Keep HVLS focused on Google Assistant exposure; generic entity/label management ideas belong to a possible separate future project, **not beta.3**.

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
