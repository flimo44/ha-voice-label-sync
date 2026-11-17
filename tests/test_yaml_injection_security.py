"""Security regressions for Google Assistant YAML rendering."""

from __future__ import annotations

import pytest
import yaml

from hvls.backends.google import render_google_assistant, yaml_escape
from hvls.models import SelectedEntity, SelectionResult


def _render(*, name: str, room: str | None) -> str:
    selected = SelectedEntity(
        entity_id="switch.safe_test",
        domain="switch",
        name=name,
        room=room,
    )
    return render_google_assistant(
        SelectionResult(entities=(selected,), domain_counts={"switch": 1})
    ).content


@pytest.mark.parametrize(
    "name",
    (
        "1_000",
        "0x1F",
        ".5",
        "5.",
        ".inf",
        ".nan",
        "yes",
        "on",
        "TRUE",
        "null",
        "2026-11-17",
        "12:30",
        "Éclairage 🔐",
        'Double " guillemets \\',
        "Nom\nsur deux lignes",
        "Nom\u2028sur deux lignes",
        "Nom\u2029sur deux lignes",
        "Nom\u0085sur deux lignes",
    ),
)
def test_name_is_always_a_yaml_string(name):
    expected = " ".join(name.split())
    scalar = yaml_escape(name)
    assert scalar.startswith('"') and scalar.endswith('"')
    data = yaml.safe_load(_render(name=name, room="Bureau"))
    assert data["switch.safe_test"]["name"] == expected
    assert isinstance(data["switch.safe_test"]["name"], str)
    assert list(data) == ["switch.safe_test"]


@pytest.mark.parametrize("separator", ("\n", "\r", "\u0085", "\u2028", "\u2029"))
def test_area_comment_cannot_inject_an_exposed_lock(separator):
    malicious = (
        "Salon" + separator +
        "lock.porte:" + separator +
        "  expose: true"
    )
    content = _render(name="Volet test", room=malicious)
    config = yaml.safe_load(content)
    assert list(config) == ["switch.safe_test"]
    assert "lock.porte" not in config
    assert config["switch.safe_test"]["room"] == " ".join(malicious.split())
    assert "# --- Salon lock.porte: expose: true ---" in content
    assert content.count("lock.porte:") == 2  # comment + quoted room scalar


def test_ordinary_french_names_remain_readable_and_safely_quoted():
    content = _render(name="Éclairage séjour 🔐", room="Pièce à vivre")
    assert 'name: "Éclairage séjour 🔐"' in content
    assert 'room: "Pièce à vivre"' in content
    assert yaml.safe_load(content)["switch.safe_test"] == {
        "expose": True,
        "name": "Éclairage séjour 🔐",
        "room": "Pièce à vivre",
    }
