"""Read Google Assistant YAML settings without resolving includes.

Read-only: no secrets, no file writes, no Home Assistant side effects.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml
from yaml.nodes import MappingNode, ScalarNode

MAX_CONFIG_SIZE = 1024 * 1024

VISIBLE_FIELDS = (
    "project_id",
    "report_state",
    "expose_by_default",
    "entity_config",
    "service_account",
)

SECRET_FIELDS = {
    "api_key",
    "client_secret",
    "private_key",
    "token",
    "access_token",
}


def _mapping(node: MappingNode) -> dict[str, Any]:
    """Extract named YAML nodes, without constructing their values."""
    result = {}
    for key, value in node.value:
        if isinstance(key, ScalarNode):
            result[key.value] = value
    return result


def _display_value(field: str, node: Any) -> str:
    """Represent an allowed setting without exposing secrets."""
    if field in SECRET_FIELDS:
        return "[redacted]"

    if not isinstance(node, ScalarNode):
        return "[configured; details hidden]"

    if field == "service_account":
        if node.tag == "!include":
            return f"!include {node.value}"
        return "[configured; details hidden]"

    if node.tag.startswith("!") and node.tag != "!include":
        return "[YAML directive]"

    if node.tag == "!include":
        return f"!include {node.value}"

    return node.value


def read_google_config(config_file: str | Path) -> dict[str, Any]:
    """Read the Google Assistant section from configuration.yaml.

    Return only safe, explicitly selected fields.
    Never resolve includes or read credential files.
    """
    path = Path(config_file)
    result: dict[str, Any] = {
        "status": "unknown",
        "settings": {},
        "warnings": [],
    }

    try:
        if not path.is_file():
            result["status"] = "missing_file"
            return result

        if path.stat().st_size > MAX_CONFIG_SIZE:
            result["status"] = "file_too_large"
            return result

        content = path.read_text(encoding="utf-8")
        document = yaml.compose(content, Loader=yaml.BaseLoader)

        if not isinstance(document, MappingNode):
            result["status"] = "unsupported_structure"
            return result

        root = _mapping(document)
        google = root.get("google_assistant")

        if google is None:
            result["status"] = "not_found"
            result["warnings"].append(
                "Google Assistant may be configured through packages "
                "or another included YAML file."
            )
            return result

        if not isinstance(google, MappingNode):
            result["status"] = "external_or_unsupported"
            result["warnings"].append(
                "Google Assistant settings are not directly defined "
                "as a mapping in configuration.yaml."
            )
            return result

        settings = _mapping(google)
        result["settings"] = {
            field: _display_value(field, settings[field])
            for field in VISIBLE_FIELDS
            if field in settings
        }

        result["other_keys"] = sorted(
            name for name in settings if name not in VISIBLE_FIELDS
        )

        result["status"] = "found"

        expose = settings.get("expose_by_default")
        if isinstance(expose, ScalarNode):
            if expose.value.lower() == "true":
                result["warnings"].append(
                    "expose_by_default is enabled: entities may be "
                    "exposed independently of HVLS labels."
                )

        return result

    except (OSError, UnicodeError, yaml.YAMLError):
        result["status"] = "read_error"
        result["warnings"].append(
            "Unable to read or parse configuration.yaml."
        )
        return result
