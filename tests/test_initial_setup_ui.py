"""Read-only initial setup UI policy tests."""

import importlib.util
from pathlib import Path

MODULE = (
    Path(__file__).resolve().parents[1]
    / "custom_components/ha_voice_label_sync/google_config.py"
)

spec = importlib.util.spec_from_file_location("hvls_setup_ui", MODULE)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def report(output="absent", source_match=False, review=False):
    return {
        "discovery_status": "not_found",
        "source_path": None,
        "source_exists": False,
        "output_status": output,
        "source_matches_output": source_match,
        "review_required": review,
    }


def test_clean_destination_accepted():
    assert module.initial_setup_output_error(report()) is None


def test_existing_destination_is_accepted_for_read_only_onboarding():
    assert module.initial_setup_output_error(
        report(output="existing")
    ) is None


def test_source_destination_match_is_not_a_write_authorization():
    assert module.initial_setup_output_error(
        report(output="existing", source_match=True)
    ) is None


def test_missing_declared_source_can_be_configured_without_claiming_it():
    assert module.initial_setup_output_error(
        report(output="absent", source_match=True)
    ) is None


def test_unsafe_destination_refused():
    assert module.initial_setup_output_error(
        report(output="unsafe")
    ) == "unsafe_output_path"


def test_ambiguous_source_does_not_automatically_block_configuration():
    item = report(review=True)
    item["discovery_status"] = "ambiguous"
    assert module.initial_setup_output_error(item) is None


def test_diagnostic_is_localized_and_escapes_markdown():
    item = report(output="existing", source_match=True, review=True)
    item["source_path"] = "/config/test*file.yaml"

    french = module.render_initial_setup_diagnostic(item, "fr")
    english = module.render_initial_setup_diagnostic(item, "en")

    assert "Source Google Assistant" in french
    assert "Google Assistant source" in english
    assert r"test\*file.yaml" in french
    assert "Aucune adoption automatique" in french


def test_diagnostic_has_real_markdown_paragraphs_not_literal_backslashes():
    item = report(output="existing", review=True)
    french = module.render_initial_setup_diagnostic(item, "fr")
    english = module.render_initial_setup_diagnostic(item, "en")

    assert french.startswith("### Diagnostic initial HVLS\n\n")
    assert "Source Google Assistant" in french
    assert "Aucune source Google Assistant identifiée" in french
    assert "Fichier YAML HVLS" in french
    assert "Fichier existant détecté" in french
    assert "Vous pouvez installer HVLS" in french
    assert "Assistant HVLS" in french
    assert "\\n" not in french
    assert "\\n" not in english
    assert "\n\n" in french
    assert english.startswith("### HVLS initial diagnostic\n\n")


def test_diagnostic_escapes_actual_linebreaks_in_source_path():
    item = report(output="existing", source_match=True, review=True)
    item["source_path"] = "/config/nottrusted.yaml\nINJECTED *headline*"
    rendered = module.render_initial_setup_diagnostic(item, "fr")
    assert "nottrusted.yaml INJECTED" in rendered
    assert "nottrusted.yaml\nINJECTED" not in rendered
    assert r"\*headline\*" in rendered
