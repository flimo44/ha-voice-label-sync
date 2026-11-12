"""Ensure Home Assistant installs the matching HVLS Python core."""

import json
import tomllib
from pathlib import Path


def test_ha_manifest_matches_python_core_version():
    root = Path(__file__).resolve().parents[1]

    with (root / "pyproject.toml").open("rb") as stream:
        project = tomllib.load(stream)["project"]

    manifest_path = (
        root
        / "custom_components"
        / "ha_voice_label_sync"
        / "manifest.json"
    )

    manifest = json.loads(
        manifest_path.read_text(encoding="utf-8")
    )

    expected = (
        f"{project['name']}=={project['version']}"
    )

    assert expected in manifest["requirements"], (
        f"Home Assistant must require {expected}, "
        f"not {manifest['requirements']}"
    )
