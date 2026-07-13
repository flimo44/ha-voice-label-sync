"""Home Assistant registry reading utilities."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


class RegistryError(Exception):
    """Raised when a Home Assistant registry cannot be read."""


def load_json(path: Path) -> dict[str, Any]:
    """Load and parse a Home Assistant JSON registry.

    Args:
        path: Path to the registry file.

    Returns:
        Parsed registry content.

    Raises:
        RegistryError: If the file is missing, unreadable or contains
            invalid JSON.
    """
    if not path.exists():
        raise RegistryError(f"Registry file not found: {path}")

    if not path.is_file():
        raise RegistryError(f"Registry path is not a file: {path}")

    try:
        with path.open("r", encoding="utf-8") as file:
            data = json.load(file)
    except json.JSONDecodeError as exc:
        raise RegistryError(
            f"Registry contains invalid JSON: {path} ({exc})"
        ) from exc
    except (OSError, UnicodeError) as exc:
        raise RegistryError(
            f"Unable to read registry: {path} ({exc})"
        ) from exc

    if not isinstance(data, dict):
        raise RegistryError(
            f"Registry root must be a JSON object: {path}"
        )

    return data


def get_registry_items(
    registry: dict[str, Any],
    collection_name: str,
) -> list[dict[str, Any]]:
    """Return a named collection from a Home Assistant registry.

    Home Assistant registry collections are normally stored under:

        data -> collection_name

    Args:
        registry: Parsed Home Assistant registry.
        collection_name: Name of the requested collection.

    Returns:
        Registry entries represented as dictionaries.

    Raises:
        RegistryError: If the collection exists but is not a list, or if
            an entry is not a JSON object.
    """
    data = registry.get("data", {})

    if not isinstance(data, dict):
        raise RegistryError("Registry 'data' field must be an object")

    items = data.get(collection_name, [])

    if not isinstance(items, list):
        raise RegistryError(
            f"Registry collection '{collection_name}' must be a list"
        )

    if not all(isinstance(item, dict) for item in items):
        raise RegistryError(
            f"Registry collection '{collection_name}' contains invalid entries"
        )

    return items
