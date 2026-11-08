# HA Voice Label Sync — Product Vision

> **Manage which Home Assistant entities are exposed to Google Assistant using labels — simply, visibly and safely.**

This document defines the **purpose, audience and product principles** of HA Voice Label Sync (HVLS). It is not an implementation specification or release commitment. For the current technical architecture see [ARCHITECTURE.md](ARCHITECTURE.md); for scheduled improvements see [ROADMAP.md](ROADMAP.md).

## Mission

Make it straightforward for people who **already use Home Assistant's manually configured Google Assistant integration**, **without Home Assistant Cloud**, to select and maintain exposed entities using native Home Assistant labels.

HVLS should remove the need to maintain a large Google Assistant entity list by hand while letting users understand what will change before applying a generated configuration.

**HVLS complements Google Assistant; it does not set it up.** It does not create Google Cloud credentials, link Google Home, or automatically synchronize devices after YAML changes.

## Who HVLS is for

- Home Assistant users whose **manual Google Assistant integration is already working**.
- People who want to choose exposed entities from a visual Home Assistant interface instead of editing each entity entry in YAML.
- Installations of any size where clear selection, diagnostics and controlled changes provide value.

### Who it is not for

- Users relying solely on **Home Assistant Cloud / Nabu Casa** for native Google Assistant exposure management.
- Users looking for a one-click Google Assistant installation or a replacement for the Google Assistant integration.
- Users expecting HVLS to manage all voice assistants or to replace Home Assistant's native entity registry.

A clear product description should help people decide **before installation** whether HVLS matches their setup.

## The problem

With a manually configured Google Assistant integration, maintaining entity-specific YAML by hand can become tedious:

- Choosing which entities to expose is scattered across configuration and entity management.
- Entity additions, renames and room changes make an existing selection harder to maintain.
- It is difficult to see which entries would be added, removed or changed.
- An incorrect write can disrupt a working configuration.

The problem is not that Home Assistant lacks labels; it is that using those labels to manage a manual Google Assistant exposure configuration should be easy and safe.

## The product approach

**Select → Review → Apply.**

1. **Select:** use a native Home Assistant label to identify entities intended for Google Assistant exposure. Display entities by domain, with search, filters and understandable eligibility feedback.
2. **Review:** generate a Preview from current Home Assistant data and make the resulting YAML and differences understandable.
3. **Apply:** require an intentional action before writing reviewed changes to production, with validation and appropriate safeguards.

HVLS can automate the preparation and explanation of a change. **It must not silently apply a change to production simply because an entity label changed.**

Advanced and automation-oriented generation pathways may exist separately from the recommended, review-first UI workflow; they must be described accurately rather than confused with the reviewed Apply action.

## Product principles

### 1. Understandable without a manual

A person should understand what HVLS does, whether it is meant for them and what each action will do without reading pages of documentation.

> If explaining a feature takes longer than using it, reconsider its interface before writing more documentation.

Use familiar language, avoid unnecessary technical terms in the interface and present details progressively.

### 2. Home Assistant is the source of truth

Use the native Home Assistant entity, device, area and label data. Do not create a competing entity catalog or a separate labeling system users must maintain.

An entity's eligibility for **Google Assistant exposure through HVLS** must not be confused with its general usefulness in Home Assistant.

### 3. Safety without unnecessary friction

Show proposed changes before the recommended manual Apply. Explain exclusions and errors clearly, prevent invalid actions, detect stale changes and protect production writes.

Backups should be available and enabled by default, while documentation must respect the user's configurable backup settings. Do not promise a backup when it is disabled or there is no previous file.

### 4. A native, practical Home Assistant experience

Keep normal entity selection, label management, Preview inspection and configuration within Home Assistant. Reuse native dialogs and behavior where practical instead of inventing an unrelated interface.

### 5. Be precise about scope and automation

HVLS generates Google Assistant exposure configuration. Applying that file does not itself guarantee a reload of Google Assistant or synchronization in Google Home.

Do not market planned features as available, or imply that HVLS makes manual Google Assistant setup unnecessary.

### 6. Keep a reusable technical foundation

Keep the independent Python engine and Home Assistant integration responsibilities well separated. The underlying components may be reused elsewhere, but speculative future projects should not make HVLS more complicated.

## Current product direction

The V1 beta already provides a native Home Assistant panel for managing the HVLS label, inspecting eligibility and exclusions, generating a YAML Preview, comparing Preview with production and applying a reviewed result with safeguards. The separate CLI/PyPI core remains available for technical workflows.

**V1 priority:** refine that existing Google Assistant experience into an intuitive, dependable release. The beta.3 work focuses on clearer navigation, better entity management, an understandable Preview and accurate HACS/README messaging. Its precise feature checklist lives in [ROADMAP.md](ROADMAP.md).

## Non-goals

HVLS is not intended to:

- Replace Google Assistant, Home Assistant Cloud or the initial Google integration setup.
- Automatically configure Google Cloud or pair devices in Google Home.
- Become a general-purpose Home Assistant entity/label manager within the HVLS V1 scope.
- Replace Home Assistant areas, devices or native label management.
- Automatically publish every label edit to the production YAML.
- Promise Alexa, HomeKit, Matter or other backend support on a specific schedule.

Additional assistants and a generic label manager remain **possible ideas**, not commitments. If generic label management becomes useful in its own right, it can be considered as a **separate project** built on reusable components rather than changing HVLS's core mission.

## What success looks like

- The right users recognize immediately that HVLS is for their **existing, non-Cloud Google Assistant setup**.
- They can choose entities and understand the consequences without hand-editing entity lists.
- They can see and verify the proposed change before applying it.
- The integration protects existing production configuration and communicates failures clearly.
- Everyday use feels simpler as the underlying implementation becomes more capable.

**The purpose of HVLS is not to offer the most controls. It is to make the right task obvious and safe.**
