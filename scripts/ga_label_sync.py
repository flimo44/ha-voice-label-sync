#!/usr/bin/env python3
"""
HA Voice Label Sync.

Generate Google Assistant entity configuration from Home Assistant labels.

This script reads Home Assistant registries from the `.storage` directory,
selects entities matching a given label, and generates a
google_assistant_entities.yaml file.

Current backend: Google Assistant

Project:
    https://github.com/flimo44/ha-voice-label-sync
"""
import argparse
import json
import re
from pathlib import Path

# Home Assistant stores entity, device, area and label metadata
# in JSON registry files under /config/.storage.

CONFIG_DIR = Path("/config")
STORAGE = CONFIG_DIR / ".storage"

ENTITY_REGISTRY = STORAGE / "core.entity_registry"
DEVICE_REGISTRY = STORAGE / "core.device_registry"
AREA_REGISTRY = STORAGE / "core.area_registry"
LABEL_REGISTRY = STORAGE / "core.label_registry"
OUTPUT_FILE = CONFIG_DIR / "google_assistant_entities.yaml"

# Domains that can reasonably be exposed to Google Assistant by default.
# Users can override this list with the --domains argument.

DEFAULT_DOMAINS = {
    "light", "switch", "cover", "climate", "fan",
    "input_boolean", "input_select", "scene", "script",
    "lock", "vacuum", "select"
}


def load_json(path):
    """
    Load and parse a JSON file.

    Args:
        path: Path to the JSON file.

    Returns:
        Parsed JSON content.
    """
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def yaml_escape(value):
    """
    Prepare a value for safe YAML output.

    Empty values are written as explicit empty strings.
    Values containing YAML-sensitive characters are quoted.
    """   
    value = str(value).strip()
    if not value:
        return '""'
    # Characters that require quoting in YAML.
    YAML_QUOTING_PATTERN = r'[:#{}\[\],&*?|\-<>=!%@`"\']'
    if re.search(YAML_QUOTING_PATTERN, value):
        return json.dumps(value, ensure_ascii=False)
    return value


def slugify(value):
    """
    Convert a label into a normalized identifier.

    The generated identifier:
    - is lowercase,
    - contains only letters, numbers and underscores,
    - removes unsupported characters,
    - collapses multiple underscores into one.

    Args:
        value: Original label name.

    Returns:
        A normalized identifier suitable for internal use.
    """
    # Normalize the input before processing.
    value = (value or "").strip().lower()

    # Use underscores as word separators.
    value = value.replace(" ", "_").replace("-", "_")

    # Remove unsupported characters.
    value = re.sub(r"[^a-z0-9_]", "", value)

    # Collapse consecutive underscores.
    return re.sub(r"_+", "_", value)


def resolve_label_ids(label_name):
    wanted = {label_name, slugify(label_name)}
    data = load_json(LABEL_REGISTRY)
    for label in data.get("data", {}).get("labels", []):
        name = label.get("name", "")
        label_id = label.get("label_id", "")
        if label_id == label_name or name == label_name or slugify(name) == slugify(label_name):
            wanted.add(label_id)
    return wanted


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--label", default="google_assistant")
    parser.add_argument("--output", default=str(OUTPUT_FILE))
    parser.add_argument("--domains", nargs="*", default=sorted(DEFAULT_DOMAINS))
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    label_ids = resolve_label_ids(args.label)
    allowed_domains = set(args.domains)

    entity_data = load_json(ENTITY_REGISTRY)
    device_data = load_json(DEVICE_REGISTRY)
    area_data = load_json(AREA_REGISTRY)

    devices = {
        d["id"]: d for d in device_data.get("data", {}).get("devices", [])
    }

    areas = {}

    for a in area_data.get("data", {}).get("areas", []):
        area_id = a.get("area_id") or a.get("id")
        if not area_id:
            continue
        areas[area_id] = a.get("name") or area_id

    selected = []

    for ent in entity_data.get("data", {}).get("entities", []):
        entity_id = ent.get("entity_id")
        if not entity_id or "." not in entity_id:
            continue

        domain = entity_id.split(".", 1)[0]
        if domain not in allowed_domains:
            continue

        if ent.get("disabled_by") or ent.get("hidden_by"):
            continue

        if ent.get("entity_category") in {"diagnostic", "config"}:
            continue

        labels = set(ent.get("labels") or [])
        if not labels.intersection(label_ids):
            continue

        device = devices.get(ent.get("device_id")) if ent.get("device_id") else None

        name = (
            ent.get("name")
            or ent.get("original_name")
            or entity_id.split(".", 1)[1].replace("_", " ").title()
        )

        area_id = ent.get("area_id") or (device or {}).get("area_id")
        room = areas.get(area_id) if area_id else None

        selected.append({
            "entity_id": entity_id,
            "domain": domain,
            "name": name,
            "room": room,
        })

    selected.sort(key=lambda x: (x["room"] or "", x["domain"], x["name"], x["entity_id"]))

    lines = [
        "# Fichier généré automatiquement.",
        "# Ne pas modifier à la main.",
        "# Ajouter/retirer l'étiquette HA pour gérer l'exposition Google Assistant.",
        "",
    ]

    current_room = None
    for item in selected:
        if item["room"] != current_room:
            current_room = item["room"]
            lines.append(f"# --- {current_room or 'Sans pièce'} ---")

        lines.append(f"{item['entity_id']}:")
        lines.append("  expose: true")
        lines.append(f"  name: {yaml_escape(item['name'])}")
        if item["room"]:
            lines.append(f"  room: {yaml_escape(item['room'])}")
        lines.append("")

    content = "\n".join(lines)

    if args.dry_run:
        print(content)
        print(f"Total: {len(selected)} entités")
        return

    Path(args.output).write_text(content, encoding="utf-8")
    print(f"OK: {len(selected)} entités écrites dans {args.output}")


if __name__ == "__main__":
    main()