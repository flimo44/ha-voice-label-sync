# # HA Voice Label Sync

### Automatically generate your Google Assistant configuration from Home Assistant labels.

## Why?

Google Assistant is currently the first supported backend.

The project has been designed to support additional voice assistants in the future, including Alexa and HomeKit.

Managing Google Assistant entities manually quickly becomes difficult.

HA Voice Label Sync automatically generates your Google Assistant configuration directly from Home Assistant labels.

No duplicated configuration.

No manual maintenance.

Your Home Assistant labels become the single source of truth.

Do you maintain dozens of Google Assistant entities manually?

This project lets Home Assistant labels become the single source of truth.


> 🚧 Early development project
>
> Feedback and ideas are welcome.



Stop maintaining your Google Assistant YAML manually. Let Home Assistant labels do it for you.

Instead of manually maintaining a long YAML list of exposed entities, simply add a label in Home Assistant, run the script, and it generates the Google Assistant configuration automatically.

## Features

- Select entities using a Home Assistant label
- Generate `entity_config` for Google Assistant
- Use Home Assistant friendly names
- Use Home Assistant areas as Google rooms
- Ignore disabled or hidden entities
- Dry-run mode before writing the file

## How it works


```
                           Home Assistant
                                │
                                ▼
                              Labels
                                │
                                ▼
                        Voice Assistant Sync
                                │
                         ┌──────┴───────┐
                         │              │
               Google Assistant    Amazon Alexa
       
```

## Generated entity_config

```yaml
switch.prise_pompe:
  expose: true
  name: Pompe piscine
  room: Piscine
```


Home Assistant configuration

```yaml
google_assistant:
  project_id: YOUR_PROJECT_ID
  service_account: !include google_key.json
  report_state: true
  expose_by_default: false
  entity_config: !include google_assistant_entities.yaml
```

## Quick start

Installation

Option 1 – Download the script

Download the latest version of ga_label_sync.py from the repository.

Copy it to your Home Assistant scripts directory.

Typical locations are:

/config/scripts/

or

<home-assistant-config>/scripts/

depending on your Home Assistant installation.

Option 2 – Clone the repository
git clone https://github.com/flimo44/ha-voice-label-sync.git

The script is located in:

scripts/ga_label_sync.py

```Tip

If you simply want to use the script, downloading scripts/ga_label_sync.py is enough.

Cloning the repository is recommended only if you plan to follow development or contribute to the project.
```

Usage :

### Step 1 — Add the label

<img width="455" height="375" alt="Capture d&#39;écran 2026-06-26 201643" src="https://github.com/user-attachments/assets/a262942a-5fb1-4a84-b88e-5db12eb67be8" />


### Step 2 — Preview the generated configuration


<img width="555" height="172" alt="Capture d&#39;écran 2026-06-26 203136" src="https://github.com/user-attachments/assets/66ea6d63-983b-467b-9870-198d64b027bd" />


python3 /config/scripts/ga_label_sync.py --label "google_assistant" --dry-run

```
# --- Couloir ---
lock.serrure_maison:
  expose: true
  name: Serrure porte entrée
  room: Couloir

# --- Jardin ---
switch.portail:
  expose: true
  name: Portail
  room: Jardin

# --- Piscine ---
input_select.piscine_mode_gestion:
  expose: true
  name: "Piscine - Mode Gestion"
  room: Piscine

switch.piscine_chauffage:
  expose: true
  name: Pac Piscine
  room: Piscine

switch.prise_pompe2:
  expose: true
  name: Pompe piscine
  room: Piscine
```


### Step 3 — Generate the file

python3 /config/scripts/ga_label_sync.py --label "google_assistant"

<img width="454" height="446" alt="Capture d&#39;écran 2026-06-26 200340" src="https://github.com/user-attachments/assets/6f0938ae-13e9-4856-9b4f-7db5e8290171" />


### Step 4 — Restart Home Assistant



### Step 5 — Synchronize Google Home


Google Home before synchronization

<img width="1080" height="2400" alt="Screenshot_2026-06-26-19-44-33-60_2d2bd67b5e15ae98c151ac739cd6881e" src="https://github.com/user-attachments/assets/a03d1005-fde8-4186-b8ea-da2f426c5a84" />

Google Home after synchronization

<img width="1080" height="2400" alt="Screenshot_2026-06-26-19-45-48-86_2d2bd67b5e15ae98c151ac739cd6881e" src="https://github.com/user-attachments/assets/5b4d96cc-9da9-4419-9d1f-f5eac4fbec8c" />

License
MIT
