<img width="1024" height="559" alt="HA Voice Label Sync" src="https://github.com/user-attachments/assets/6918c5ae-b95b-4d81-9108-7b2cd8acd0fd" />

# HA Voice Label Sync

[![Python checks](https://github.com/flimo44/ha-voice-label-sync/actions/workflows/python-check.yml/badge.svg?branch=main)](https://github.com/flimo44/ha-voice-label-sync/actions/workflows/python-check.yml)
[![Latest release](https://img.shields.io/github/v/release/flimo44/ha-voice-label-sync?include_prereleases&label=release)](https://github.com/flimo44/ha-voice-label-sync/releases)
[![PyPI Downloads](https://static.pepy.tech/badge/ha-voice-label-sync)](https://pepy.tech/projects/ha-voice-label-sync)
[![Downloads/month](https://api.pepy.tech/badge/ha-voice-label-sync/month)](https://pepy.tech/projects/ha-voice-label-sync)

> **Manage once in Home Assistant. Sync everywhere.**

Generate Google Assistant entity exposure configuration from **Home Assistant labels**. Select eligible entities, generate and review a YAML Preview, compare it with production, and apply reviewed changes with safeguards and backups.

> [!IMPORTANT]
> **HA Voice Label Sync (HVLS) is not a voice assistant integration.**
>
> HVLS complements the official Home Assistant [Google Assistant integration](https://www.home-assistant.io/integrations/google_assistant/#manual-setup). It does **not** create your Google Cloud project, service account, or Google Home connection. Set up and verify Google Assistant before using HVLS.

**Latest tested Home Assistant integration:** `v0.3.5-beta.6` (**pre-release**)  
**Required Python core for this beta:** `ha-voice-label-sync==0.3.5`

> [!NOTE]
> HVLS remains under active development. The current beta is not a v1.0 stable release. Feedback and issue reports are welcome.

## ✨ Why HVLS?

Maintaining large Google Assistant `entity_config` sections by hand is tedious and error-prone. HVLS lets you select entities using a Home Assistant label and review proposed changes before writing them.

- 🏷️ Select entities through Home Assistant labels
- 🏠 Resolve names, areas and devices from **live Home Assistant registries** in the native integration
- 👀 Generate a dedicated Preview and inspect statistics by domain and room
- 🔍 See excluded entities and the reasons they were filtered out
- 📊 Compare the Preview with the current production YAML (added, removed, modified, unchanged)
- ✅ Apply a reviewed Preview with SHA-256 change detection
- 💾 Preserve the previous configuration with optional automatic backups and retention
- ⚡ Trigger Preview or direct generation through native Home Assistant actions
- 🔌 Keep the architecture open for future voice assistant backends

## 📸 Screenshots

> Screenshots may show earlier beta versions; labels and layout can evolve.

### Home Assistant configuration

<img width="834" height="510" alt="Home Assistant HVLS configuration" src="https://github.com/user-attachments/assets/30e733cc-24ac-45b5-a393-065e54cbce54" />

<img width="467" height="546" alt="Home Assistant HVLS options" src="https://github.com/user-attachments/assets/98ef67fd-787a-4e84-bc69-2de03160937b" />

<img width="463" height="449" alt="Home Assistant HVLS settings" src="https://github.com/user-attachments/assets/54282313-2b09-4f0b-b556-913fcaef69db" />

### Preview panel

<img width="819" height="883" alt="image" src="https://github.com/user-attachments/assets/547e82c5-a907-43b0-851f-72e50faff4ec" />

![HVLS preview panel](assets/screenshots/image.png)

<img width="380" height="367" alt="HVLS Preview (earlier version)" src="https://github.com/user-attachments/assets/fe6f447c-d318-45b3-ba2c-3767eb046063" />

### Generated YAML

![Generated Google Assistant YAML](assets/screenshots/image3.png)

## 🚀 Installation

### Install with HACS (recommended)

**HA Voice Label Sync is listed in the HACS catalog.** A custom repository is not required for a standard installation.

1. Open **HACS** in Home Assistant and search for **HA Voice Label Sync**.
2. Download the integration. To test the current beta, select **`v0.3.5-beta.6`** from the available versions (pre-release availability may depend on your HACS download options).
3. Restart Home Assistant.
4. Go to **Settings → Devices & services → Add integration**.
5. Search for **HA Voice Label Sync**, add it and configure its options.
6. Reload the browser after upgrades if an older Preview panel remains cached (`Ctrl+Shift+R` on most desktop browsers).

**Requirements**

- Home Assistant **2025.6.0 or later** (the project-stated minimum; compatibility with every release has not been individually verified)
- An existing and working [Google Assistant integration](https://www.home-assistant.io/integrations/google_assistant/#manual-setup) for actual Google Home exposure

### Manual installation

Download the desired [GitHub release](https://github.com/flimo44/ha-voice-label-sync/releases), copy `custom_components/ha_voice_label_sync` into `/config/custom_components/`, restart Home Assistant, then add the integration under **Devices & services**. Its Python core dependency is specified in `manifest.json`.

## ⚙️ Google Assistant configuration

HVLS generates a separate entity configuration YAML file. The default production output is:

```text
/config/google_assistant_entities.yaml
```

Include it in your **existing** `configuration.yaml` Google Assistant setup:

```yaml
google_assistant:
  project_id: YOUR_PROJECT_ID
  service_account: !include google_key.json
  report_state: true
  expose_by_default: false
  entity_config: !include google_assistant_entities.yaml
```

This is an example: retain your actual project settings, credentials and other Google Assistant options. HVLS does not create `google_key.json` or configure Google Cloud.

> [!IMPORTANT]
> Changing the generated `entity_config` file does **not** automatically reload Google Assistant. Restart Home Assistant after applying changes, then synchronize devices with Google Home if necessary.

## 🧭 Recommended workflow: Preview → Review → Apply

```text
🏷️ Add the google_assistant label to eligible entities
                   ↓
🛠️ Generate Preview (HVLS panel)
                   ↓
🔍 Review additions, removals, changes and exclusions
                   ↓
✅ Apply the reviewed Preview (with confirmation)
                   ↓
💾 Backup and atomic production write
                   ↓
🔄 Restart Home Assistant
                   ↓
🎤 Sync Google Home when needed
```

The Preview panel provides four distinct actions:

| Action | What it does |
| --- | --- |
| **Generate Preview** | Regenerates `/config/.hvls/preview.yaml` using the current HA registries, then refreshes the panel. Does not write the production file. |
| **Refresh** | Reloads existing Preview, comparisons and current diagnostics without generating a new YAML file. |
| **Copy YAML** | Copies the generated Preview content. |
| **Apply Preview** | Requests confirmation, checks the reviewed Preview and production SHA-256 fingerprints, then writes to the configured production path, with a backup when enabled. |

The panel also shows the count of entities, breakdowns by domain and room, exclusion diagnostics, and a Preview/Production comparison.

> [!WARNING]
> **Apply Preview changes the configured production file.** Read the differences first. HACS rollback restores integration code, **not** previously generated YAML. Automatic backups are stored under `/config/.hvls_backups/` for the default production output directory, when enabled.

### Native Home Assistant actions

The integration also exposes **Generate configuration** and **Preview configuration** actions. The former can write directly to the configured output and is useful for existing automations; the latter generates a Preview without a production write. For manual changes, the panel's reviewed Apply workflow is recommended.

## 🔍 Check Google Assistant

Open **Settings → Devices & services → HA Voice Label Sync → Configure → Check Google Assistant** for a read-only inspection of the Google Assistant settings detected by HVLS.

The checker reports the presence of `google_assistant:`, `project_id`, `report_state`, `expose_by_default`, the service-account reference, the `entity_config` reference, the referenced file's existence, and potential path mismatches or configuration warnings.

It does **not** read your service-account JSON contents, modify `configuration.yaml`, regenerate entity files, or verify connectivity to Google Cloud.

The integration also provides a separate **HVLS settings** options flow.

## 🧩 Entity eligibility and exclusions

A label identifies candidate entities, but it does not guarantee exposure. HVLS filters candidates by supported domain and, for certain domains, by compatible `device_class`.

For the `sensor` domain, this beta recognizes the following Google Assistant-compatible classes:

| Sensor device class | Supported |
| --- | --- |
| `temperature`, `humidity` | Yes |
| `aqi`, `carbon_dioxide`, `carbon_monoxide` | Yes |
| `pm10`, `pm25`, `volatile_organic_compounds` | Yes |

Supported `binary_sensor` device classes are also filtered. Entities with unsupported domains or classes are listed in **Excluded entities** with a reason. Raw measurements such as pH or electrical power are not automatically exposed just because they carry the label.

**Example:** A Zigbee2MQTT rain `binary_sensor` configured in Home Assistant to **Show as → Moisture** can be considered eligible. This changes the effective binary sensor class; it does not alter the original Zigbee2MQTT device.

## 🏠 Home Assistant integration features

- Native configuration and options flows
- Separate **HVLS settings** and **Check Google Assistant** options
- Live entity, device, area and label registries
- Preview generation and direct generation actions
- WebSocket Preview, diagnostics and reviewed Apply operations
- SHA-256 guards, serialized HVLS workflows, atomic writes and configurable backups
- English and French translations
- Python/JavaScript regression tests and GitHub Actions validation

## 🐍 Python engine and CLI

The project also provides a standalone Python package and CLI for advanced usage. The Python core version and the Home Assistant integration version are **separate**.

```bash
pip install ha-voice-label-sync
hvls --help

hvls \
  --storage /config/.storage \
  --output /config/google_assistant_entities.yaml \
  --label google_assistant
```

The standalone CLI reads registry files in Home Assistant `.storage`. **The native Home Assistant integration uses live/in-memory Home Assistant registries** instead; this migration is already implemented in the current beta.

## 🎤 Supported voice assistants

| Backend | Status |
| --- | --- |
| Google Assistant | ✅ Supported for configuration generation |
| Amazon Alexa | 🚧 Planned |
| Apple HomeKit | 📋 Planned |

## 🏗️ Architecture

```text
Home Assistant labels / live registries
                 │
                 ▼
      HA Voice Label Sync
                 │
        Preview / diagnostics
                 │
        Review and Apply
                 │
                 ▼
    Generated entity_config YAML
                 │
                 ▼
Official Google Assistant integration
                 │
                 ▼
              Google Home
```

Future backends may share the label-driven workflow. Only Google Assistant YAML generation is currently implemented.

## 🧪 Tests and releases

The `v0.3.5-beta.6` development snapshot passed **82 Python tests**, **8 JavaScript tests**, and Ruff checks. The repository also runs Home Assistant/HACS validation and package checks in GitHub Actions.

See [GitHub Releases](https://github.com/flimo44/ha-voice-label-sync/releases) for tagged versions and changelogs. Beta releases are intended for evaluation before a stable v1.0.

## 📚 Documentation and roadmap

See [ROADMAP.md](ROADMAP.md) for future milestones and the [`docs/`](docs/) directory for additional documentation.

## 🤝 Contributing

Bug reports, feature requests and pull requests are welcome. Please use [GitHub Issues](https://github.com/flimo44/ha-voice-label-sync/issues).

## 📄 License

See the repository's license file for the applicable terms.

MIT
