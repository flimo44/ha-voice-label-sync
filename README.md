# Automatically generate your Google Assistant configuration from Home Assistant labels.

> 🚧 Early development project
>
> Feedback and ideas are welcome.

Generate Home Assistant Google Assistant `entity_config` from Home Assistant labels.

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
Google       Alexa
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

Usage :

1 ) Add the Home Assistant label

<img width="455" height="375" alt="Capture d&#39;écran 2026-06-26 201643" src="https://github.com/user-attachments/assets/a262942a-5fb1-4a84-b88e-5db12eb67be8" />


2 ) Preview the generated configuration

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


3 ) Generate the file:

python3 /config/scripts/ga_label_sync.py --label "google_assistant"

<img width="454" height="446" alt="Capture d&#39;écran 2026-06-26 200340" src="https://github.com/user-attachments/assets/6f0938ae-13e9-4856-9b4f-7db5e8290171" />


4 ) Restart Home assistant


5 ) Synchronize Google Home




<img width="1080" height="2400" alt="Screenshot_2026-06-26-19-44-33-60_2d2bd67b5e15ae98c151ac739cd6881e" src="https://github.com/user-attachments/assets/a03d1005-fde8-4186-b8ea-da2f426c5a84" />

<img width="1080" height="2400" alt="Screenshot_2026-06-26-19-45-48-86_2d2bd67b5e15ae98c151ac739cd6881e" src="https://github.com/user-attachments/assets/5b4d96cc-9da9-4419-9d1f-f5eac4fbec8c" />

License
MIT
