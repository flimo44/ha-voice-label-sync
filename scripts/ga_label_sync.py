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
import sys
import unicodedata
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

# Values that YAML 1.1 parsers interpret as booleans / null, regardless of
# quoting characters. If an entity name matches one of these (case-insensitive)
# it MUST be quoted, otherwise it will silently become a bool/null in the
# generated file instead of a string.
YAML_RESERVED_WORDS = {
    "y", "yes", "n", "no", "true", "false", "on", "off",
    "null", "~", "none",
}

# Characters that require quoting in YAML scalars.
YAML_QUOTING_PATTERN = r'[:#{}\[\],&*?|\-<>=!%@`"\']'


def load_json(path):
    """
    Load and parse a JSON file.

    Args:
        path: Path to the JSON file.

    Returns:
        Parsed JSON content.

    Raises:
        SystemExit: if the file is missing or not valid JSON, with a
            human-readable explanation (instead of a raw traceback).
    """
    if not path.exists():
        sys.exit(
            f"Erreur : fichier introuvable : {path}\n"
            "Vérifie que le script est bien exécuté avec accès au dossier "
            "/config/.storage de Home Assistant."
        )
    try:
        with path.open("r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError as exc:
        sys.exit(f"Erreur : {path} n'est pas un JSON valide ({exc}).")
    except (OSError, UnicodeError) as exc:
        sys.exit(f"Erreur : impossible de lire {path} ({exc}).")


def yaml_escape(value):
    """
    Prepare a value for safe YAML output.

    Empty values are written as explicit empty strings. Values containing
    YAML-sensitive characters, values that look like YAML booleans/null,
    and purely numeric values are quoted so they stay strings.
    """
    value = str(value).strip()
    if not value:
        return '""'

    if value.lower() in YAML_RESERVED_WORDS:
        return json.dumps(value, ensure_ascii=False)

    # Purely numeric-looking values (ints or floats) must be quoted too,
    # otherwise YAML will parse them as numbers instead of strings.
    if re.fullmatch(r"[+-]?\d+(\.\d+)?", value):
        return json.dumps(value, ensure_ascii=False)

    if re.search(YAML_QUOTING_PATTERN, value):
        return json.dumps(value, ensure_ascii=False)

    return value


def slugify(value):
    """
    Convert a label into a normalized identifier.

    The generated identifier:
    - has accented characters transliterated to their plain ASCII form
      (e.g. "é" -> "e"), so labels with French names don't get mangled,
    - is lowercase,
    - contains only letters, numbers and underscores,
    - removes unsupported characters,
    - collapses multiple underscores into one.

    Args:
        value: Original label name.

    Returns:
        A normalized identifier suitable for internal use.
    """
    value = (value or "").strip().lower()

    # Transliterate accented characters (é -> e, ç -> c, etc.) instead of
    # just dropping them, so distinct labels don't collide after slugifying.
    value = unicodedata.normalize("NFKD", value)
    value = value.encode("ascii", "ignore").decode("ascii")

    value = value.replace(" ", "_").replace("-", "_")
    value = re.sub(r"[^a-z0-9_]", "", value)
    return re.sub(r"_+", "_", value).strip("_")


def resolve_label_ids(label_name):
    """
    Resolve every identifier associated with a Home Assistant label.

    The function accepts either the label name or its normalized form
    and returns every matching label identifier found in the registry.

    Args:
        label_name: Label name provided by the user.

    Returns:
        A set containing all matching label identifiers.
    """
    wanted_slug = slugify(label_name)
    wanted = {label_name, wanted_slug}
    data = load_json(LABEL_REGISTRY)
    found_any = False
    for label in data.get("data", {}).get("labels", []):
        name = label.get("name", "")
        label_id = label.get("label_id", "")
        normalized_name = slugify(name)
        if (
            label_id == label_name
            or name == label_name
            or normalized_name == wanted_slug
        ):
            wanted.add(label_id)
            found_any = True

    if not found_any:
        print(
            f"Attention : aucun label ne correspond à '{label_name}' dans le "
            "registre. Vérifie l'orthographe ou la casse du label dans "
            "Home Assistant.",
            file=sys.stderr,
        )

    return wanted


def main():
    """
    Generate a voice assistant configuration from Home Assistant labels.

    Parse command-line arguments, load Home Assistant registries,
    generate the configuration and either display or write the result.
    """
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--label",
        default="google_assistant",
        help="Home Assistant label used to select exposed entities.",
    )

    parser.add_argument(
        "--output",
        default=str(OUTPUT_FILE),
        help="Path of the generated YAML file.",
    )

    parser.add_argument(
        "--domains",
        nargs="*",
        default=sorted(DEFAULT_DOMAINS),
        help="Home Assistant domains to include.",
    )

    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print the generated YAML without writing the output file.",
    )

    args = parser.parse_args()

    label_ids = resolve_label_ids(args.label)
    allowed_domains = set(args.domains)

    entity_data = load_json(ENTITY_REGISTRY)
    device_data = load_json(DEVICE_REGISTRY)
    area_data = load_json(AREA_REGISTRY)

    devices = {
        d["id"]: d for d in device_data.get("data", {}).get("devices", [])
    }

    # Construction du dictionnaire des zones
    areas = {}
    for a in area_data.get("data", {}).get("areas", []):
        area_id = a.get("area_id") or a.get("id")
        if not area_id:
            continue
        areas[area_id] = a.get("name") or area_id

    # Préparation de la sélection
    selected = []
    domain_counts = {}

    for ent in entity_data.get("data", {}).get("entities", []):
        entity_id = ent.get("entity_id")
        if not entity_id or "." not in entity_id:
            continue

        # Extraction et filtrage du domaine
        domain = entity_id.split(".", 1)[0]
        if domain not in allowed_domains:
            continue

        # Exclusion des entités désactivées ou cachées
        if ent.get("disabled_by") or ent.get("hidden_by"):
            continue

        # Exclusion des entités techniques
        if ent.get("entity_category") in {"diagnostic", "config"}:
            continue

        # Vérification des labels
        labels = set(ent.get("labels") or [])
        if not labels.intersection(label_ids):
            continue

        # Recherche de l'appareil parent
        device_id = ent.get("device_id")
        device = devices.get(device_id) if device_id else None

        # Définition du nom
        name = (
            ent.get("name")
            or ent.get("original_name")
            or entity_id.split(".", 1)[1].replace("_", " ").title()
        )

        area_id = ent.get("area_id") or (device or {}).get("area_id")
        room = areas.get(area_id) if area_id else None

        selected.append(
            {
                "entity_id": entity_id,
                "domain": domain,
                "name": name,
                "room": room,
            }
        )
        domain_counts[domain] = domain_counts.get(domain, 0) + 1

    selected.sort(
        key=lambda x: (
            x["room"] or "",
            x["domain"],
            x["name"],
            x["entity_id"],
        )
    )

    lines = [
        "# Fichier généré automatiquement.",
        "# Ne pas modifier à la main.",
        "# Ajouter/retirer l'étiquette HA pour gérer l'exposition Google Assistant.",
        "",
    ]

    current_room = object()
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

    content = "\n".join(lines).rstrip() + "\n"

    if not selected:
        print(
            "Attention : aucune entité sélectionnée. Vérifie le label et "
            "les domaines utilisés.",
            file=sys.stderr,
        )

    if args.dry_run:
        print(content)
        print(f"Total: {len(selected)} entités")
        if domain_counts:
            detail = ", ".join(
                f"{d}: {n}" for d, n in sorted(domain_counts.items())
            )
            print(f"Détail par domaine -> {detail}")
        return

    output_path = Path(args.output)
    try:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(content, encoding="utf-8")
    except OSError as exc:
        sys.exit(
            f"Erreur : impossible d'écrire le fichier {output_path} ({exc})."
        )
    print(f"OK: {len(selected)} entités écrites dans {output_path}")


if __name__ == "__main__":
    main()