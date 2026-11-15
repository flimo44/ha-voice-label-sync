"""Output path safety across HA OS, Container and Core config roots."""

import importlib.util
from pathlib import Path


MODULE = (
    Path(__file__).resolve().parents[1]
    / "custom_components/ha_voice_label_sync/output_path.py"
)
spec = importlib.util.spec_from_file_location("hvls_output_path_test", MODULE)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def expect_unsafe(config_root, value):
    try:
        module.resolve_output_path(config_root, value)
    except module.UnsafeOutputPath:
        return
    raise AssertionError("Unsafe output path unexpectedly accepted")


def test_valid_relative_path_preserves_configured_root(tmp_path):
    for name in ("google_assistant_entities.yaml", "subdir/assistant.yaml"):
        assert module.resolve_output_path(tmp_path, name) == tmp_path / name


def test_valid_absolute_path_unchanged(tmp_path):
    configured = tmp_path / "google_assistant_entities.yaml"
    assert module.resolve_output_path(tmp_path, configured) == configured


def test_config_root_symlink_is_accepted_without_rewriting_path(tmp_path):
    actual = tmp_path / "homeassistant"
    actual.mkdir()
    alias = tmp_path / "config"
    alias.symlink_to(actual, target_is_directory=True)

    configured = alias / "google_assistant_entities.yaml"
    assert module.resolve_output_path(actual, configured) == configured
    assert module.resolve_output_path(alias, configured) == configured


def test_rejects_empty_and_parent_traversal(tmp_path):
    for value in ("", "   ", "../outside.yaml",
                  "folder/../../outside.yaml", ".", ".."):
        expect_unsafe(tmp_path, value)


def test_rejects_other_absolute_root(tmp_path):
    outside = tmp_path.parent / "outside-hvls.yaml"
    expect_unsafe(tmp_path, outside)


def test_rejects_symlinked_output_file(tmp_path):
    target = tmp_path / "actual.yaml"
    target.write_text("switch.a: {}\n")
    alias = tmp_path / "symlink.yaml"
    alias.symlink_to(target)
    expect_unsafe(tmp_path, alias)


def test_rejects_symlinked_subfolder_even_when_target_is_inside(tmp_path):
    subdir = tmp_path / "original"
    subdir.mkdir()
    alias = tmp_path / "alias"
    alias.symlink_to(subdir, target_is_directory=True)
    expect_unsafe(tmp_path, alias / "file.yaml")


def test_rejects_symlinked_subfolder_outside(tmp_path):
    outside = tmp_path.parent / "other"
    outside.mkdir(exist_ok=True)
    alias = tmp_path / "escape"
    alias.symlink_to(outside, target_is_directory=True)
    expect_unsafe(tmp_path, alias / "file.yaml")


def test_rejects_non_path_value(tmp_path):
    expect_unsafe(tmp_path, None)


def test_rejects_existing_directory_as_output(tmp_path):
    folder = tmp_path / "output.yaml"
    folder.mkdir()
    expect_unsafe(tmp_path, folder)
