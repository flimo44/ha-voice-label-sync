"""Every supported language is complete in all three translation layers.

Adding a language means adding, with the same keys as English:
- ``translations/<code>.json`` (Home Assistant configuration screens);
- a ``SETUP_TEXTS`` block in ``google_config.py`` (setup diagnostic);
- a ``HVLS_TRANSLATIONS`` block in the panel (``frontend/*.js``).
"""

import importlib.util
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "custom_components/ha_voice_label_sync"
PRODUCT_NAMES = {"HA Voice Label Sync"}

spec = importlib.util.spec_from_file_location(
    "hvls_google_config_i18n", ROOT / "google_config.py"
)
google_config = importlib.util.module_from_spec(spec)
spec.loader.exec_module(google_config)


def _json(code):
    return json.loads(
        (ROOT / "translations" / f"{code}.json").read_text(encoding="utf-8")
    )


def _flatten(value, path=""):
    if isinstance(value, dict):
        for key, item in value.items():
            yield from _flatten(item, f"{path}/{key}")
    else:
        yield path, value


def _placeholders(text):
    return sorted(re.findall(r"\{(\w+)\}", str(text)))


def _panel_languages():
    source = (ROOT / "frontend/hvls-preview-panel.js").read_text(encoding="utf-8")
    block = source[:source.index("\n};\n")]
    return re.findall(r"^  ([a-z]{2}(?:-[a-z]+)?): \{$", block, re.M)


def test_all_layers_support_the_same_languages():
    files = sorted(path.stem for path in (ROOT / "translations").glob("*.json"))
    assert files == sorted(google_config.SUPPORTED_LANGUAGES)
    assert sorted(google_config.SETUP_TEXTS) == files
    assert sorted(_panel_languages()) == files


def test_integration_translation_files_are_complete():
    english = dict(_flatten(_json("en")))
    for code in google_config.SUPPORTED_LANGUAGES:
        if code == "en":
            continue
        other = dict(_flatten(_json(code)))
        assert set(other) == set(english), code
        leftovers = [
            path for path, text in other.items()
            if text == english[path] and text not in PRODUCT_NAMES
            and len(str(text).split()) > 1
        ]
        assert leftovers == [], (code, leftovers)
        for path, text in other.items():
            assert _placeholders(text) == _placeholders(english[path]), (code, path)


def test_setup_texts_are_complete():
    english = google_config.SETUP_TEXTS["en"]
    for code, texts in google_config.SETUP_TEXTS.items():
        assert set(texts) == set(english), code


def test_language_resolution_falls_back_to_english():
    resolve = google_config.resolve_language
    assert resolve("fr") == "fr"
    assert resolve("FR-ca") == "fr"
    assert resolve("pt_BR") == "en"
    assert resolve("de") == "de"
    assert resolve("de-CH") == "de"
    assert resolve("ja") == "en"
    assert resolve(None) == "en"
    assert google_config.setup_text("ja", "title") == "HVLS initial diagnostic"
    assert google_config.setup_text("de", "title") == "HVLS-Erstdiagnose"
    assert resolve("es-419") == "es"
    assert google_config.setup_text("es", "title") == "Diagnóstico inicial de HVLS"
    assert resolve("it-CH") == "it"
    assert google_config.setup_text("it", "title") == "Diagnostica iniziale di HVLS"
    assert google_config.setup_text("fr", "title") == "Diagnostic initial HVLS"
