"""Integration translation files stay complete and localized."""

import json
from pathlib import Path


def test_french_translations_have_no_english_leftovers():
    root = Path(__file__).resolve().parents[1] / (
        "custom_components/ha_voice_label_sync/translations"
    )
    english = json.loads((root / "en.json").read_text(encoding="utf-8"))
    french = json.loads((root / "fr.json").read_text(encoding="utf-8"))
    allowed = {"HA Voice Label Sync"}  # product name

    def walk(en, fr, path):
        if isinstance(en, dict):
            assert set(en) == set(fr), path
            for key in en:
                yield from walk(en[key], fr[key], f"{path}/{key}")
        elif isinstance(en, str) and en == fr and en not in allowed \
                and len(en.split()) > 1:
            yield f"{path} = {en}"

    assert list(walk(english, french, "")) == []
