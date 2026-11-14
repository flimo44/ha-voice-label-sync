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
        result["warnings"].append("Unable to read or parse configuration.yaml.")
        return result


def check_entity_config(
    google_result: dict[str, Any],
    hvls_output: str,
    config_dir: str | Path,
) -> dict[str, Any]:
    """Check Google Assistant entity_config against the HVLS output.

    Only inspect paths and file existence. Never read the generated file.
    """
    base = Path(config_dir).resolve()
    settings = google_result.get("settings", {})
    configured = settings.get("entity_config")

    result: dict[str, Any] = {
        "status": "unknown",
        "file_exists": False,
        "paths_match": False,
    }

    if google_result.get("status") != "found":
        result["status"] = "configuration_unavailable"
        return result

    if not configured:
        result["status"] = "entity_config_missing"
        return result

    if not isinstance(configured, str) or not configured.startswith("!include "):
        result["status"] = "unsupported_entity_config"
        return result

    include_path = configured[len("!include ") :].strip()

    if not include_path:
        result["status"] = "unsupported_entity_config"
        return result

    def normalize(value: str) -> Path:
        path = Path(value)
        if not path.is_absolute():
            path = base / path
        return path.resolve()

    google_path = normalize(include_path)
    output_path = normalize(hvls_output)

    # Do not inspect arbitrary paths outside the HA configuration directory.
    if not google_path.is_relative_to(base):
        result["status"] = "outside_config_directory"
        return result

    result["file_exists"] = google_path.is_file()
    result["paths_match"] = google_path == output_path

    if not result["file_exists"]:
        result["status"] = "file_missing"
    elif not result["paths_match"]:
        result["status"] = "path_mismatch"
    else:
        result["status"] = "ok"

    return result


def discover_existing_google_yaml(config_dir: str | Path) -> dict[str, Any]:
    """Discover an existing manual Google Assistant entity YAML, read-only.

    Discovery never implies permission to overwrite the source file.
    Unsupported or ambiguous configurations require manual review.
    """
    base = Path(config_dir).resolve()
    result: dict[str, Any] = {
        "status": "ambiguous",
        "source_path": None,
        "source_exists": False,
    }

    config_file = base / "configuration.yaml"

    try:
        if config_file.is_symlink() or not config_file.is_file():
            return result

        if config_file.stat().st_size > MAX_CONFIG_SIZE:
            return result

        document = yaml.compose(
            config_file.read_text(encoding="utf-8"),
            Loader=yaml.BaseLoader,
        )

        if not isinstance(document, MappingNode):
            return result

        def unique_mapping(node: Any) -> dict[str, Any] | None:
            if not isinstance(node, MappingNode):
                return None
            values: dict[str, Any] = {}
            for key, value in node.value:
                if not isinstance(key, ScalarNode) or key.tag.startswith("!"):
                    return None
                if key.value in values or key.value == "<<":
                    return None
                values[key.value] = value
            return values

        main = unique_mapping(document)
        if main is None:
            return result

        # Packages can declare Google Assistant outside configuration.yaml.
        # Do not claim there is no existing configuration in that case.
        homeassistant = main.get("homeassistant")
        if homeassistant is not None:
            ha_settings = unique_mapping(homeassistant)
            if ha_settings is None or "packages" in ha_settings:
                return result

        google = main.get("google_assistant")
        if google is None:
            result["status"] = "not_found"
            return result

        settings = unique_mapping(google)
        if settings is None:
            return result

        entity_config = settings.get("entity_config")
        if entity_config is None:
            return result

        if (
            not isinstance(entity_config, ScalarNode)
            or entity_config.tag != "!include"
        ):
            return result

        include_name = entity_config.value.strip()

        if not include_name:
            return result

        relative = Path(include_name)
        if relative.is_absolute():
            result["status"] = "unsafe_path"
            return result

        candidate = base / relative
        resolved = candidate.resolve()

        if not resolved.is_relative_to(base):
            result["status"] = "unsafe_path"
            return result

        # Refuse symbolic links, including parent directory components.
        current = base
        for component in relative.parts:
            current = current / component
            if current.is_symlink():
                result["status"] = "unsafe_path"
                return result

        if resolved.suffix.lower() not in {".yaml", ".yml"}:
            result["status"] = "ambiguous"
            return result

        result["source_path"] = str(resolved)
        result["source_exists"] = resolved.is_file()
        result["status"] = (
            "found" if result["source_exists"] else "file_missing"
        )
        return result

    except (OSError, UnicodeError, ValueError, yaml.YAMLError):
        return result


def inspect_initial_setup(
    config_dir: str | Path,
    output_path: str | Path,
) -> dict[str, Any]:
    """Inspect initial HVLS setup without creating or modifying files.

    Discovery is informational only and never establishes ownership.
    """
    import stat

    base = Path(config_dir).resolve()
    discovery = discover_existing_google_yaml(base)

    result: dict[str, Any] = {
        "discovery_status": discovery["status"],
        "source_path": discovery["source_path"],
        "source_exists": discovery["source_exists"],
        "output_status": "unsafe",
        "source_matches_output": False,
        "review_required": True,
    }

    try:
        requested = Path(output_path)

        # No parent traversal, even when it would resolve inside /config.
        if ".." in requested.parts:
            return result

        candidate = (
            requested
            if requested.is_absolute()
            else base / requested
        )

        # Generated output must remain inside the HA config directory.
        relative = candidate.relative_to(base)

        # Refuse symbolic links in any output path component.
        current = base
        for component in relative.parts:
            current = current / component
            if current.is_symlink():
                return result

        resolved = candidate.resolve(strict=False)

        if not resolved.is_relative_to(base):
            return result

        try:
            metadata = candidate.lstat()
        except FileNotFoundError:
            output_status = "absent"
        else:
            output_status = (
                "existing"
                if stat.S_ISREG(metadata.st_mode)
                else "unsafe"
            )

        result["output_status"] = output_status

        source_path = discovery.get("source_path")
        if source_path is not None:
            result["source_matches_output"] = (
                Path(source_path) == resolved
            )

        # Any preexisting source, ambiguous discovery or existing
        # output requires review. This is NOT write authorization.
        result["review_required"] = (
            discovery["status"] != "not_found"
            or output_status != "absent"
        )

        return result

    except (OSError, ValueError, RuntimeError, TypeError):
        # Fail closed when path inspection cannot be completed.
        return result


def initial_setup_output_error(report: dict[str, Any]) -> str | None:
    """Refuse unsafe paths, not the presence of an existing YAML file.

    Initial configuration creates an HVLS entry, NOT a claim on the output
    file. Ownership and any later YAML writes are checked separately by the
    managed writer / Assistant takeover flow, with explicit user approval.
    """
    # The user can configure HVLS while an existing/manual entity file is
    # present, including when it is referenced by Google Assistant.
    # A regular existing file MUST NOT be overwritten or adopted here.
    if report.get("output_status") not in {"absent", "existing"}:
        return "unsafe_output_path"
    return None


def render_initial_setup_diagnostic(
    report: dict[str, Any],
    language: str = "en",
) -> str:
    """Display a read-only installation diagnostic."""
    french = str(language).lower().startswith("fr")

    def tr(fr: str, en: str) -> str:
        return fr if french else en

    def safe(value: Any) -> str:
        value = str(value).replace("\\r", " ").replace("\\n", " ")[:240]
        for char in ("\\", "`", "*", "_", "[", "]", "(", ")", "<", ">", "|"):
            value = value.replace(char, "\\" + char)
        return value

    discoveries = {
        "found": tr("Fichier détecté", "File detected"),
        "not_found": tr("Aucun fichier détecté", "No file detected"),
        "file_missing": tr("Fichier déclaré mais absent", "Declared file missing"),
        "ambiguous": tr("Configuration ambiguë", "Ambiguous configuration"),
        "unsafe_path": tr("Chemin source non sûr", "Unsafe source path"),
    }

    outputs = {
        "absent": tr("Fichier absent", "File does not exist"),
        "existing": tr("Fichier déjà présent", "File already exists"),
        "unsafe": tr("Chemin non sûr", "Unsafe path"),
    }

    discovery = report.get("discovery_status", "ambiguous")
    output = report.get("output_status", "unsafe")

    lines = [
        "### " + tr("Diagnostic Google Assistant", "Google Assistant diagnostic"),
        "**" + tr("Configuration", "Configuration") + " :** "
        + safe(discoveries.get(discovery, discoveries["ambiguous"])),
        "**" + tr("Fichier source", "Source file") + " :** "
        + safe(report.get("source_path") or tr("Non identifié", "Not identified")),
        "**" + tr("Destination HVLS", "HVLS output") + " :** "
        + safe(outputs.get(output, outputs["unsafe"])),
    ]

    if report.get("source_matches_output"):
        lines.append(
            "⚠️ " + tr(
                "La destination correspond au fichier Google Assistant déclaré.",
                "The output matches the declared Google Assistant file.",
            )
        )

    if report.get("review_required"):
        lines.append(
            "⚠️ " + tr(
                "Vérification nécessaire. Aucune adoption automatique.",
                "Review required. No automatic adoption.",
            )
        )

    lines.append(
        tr(
            "La détection ne donne aucune autorisation de modification.",
            "Discovery does not authorize file modification.",
        )
    )

    return "\\n\\n".join(lines)
