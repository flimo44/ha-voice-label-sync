"""Safety tests for applying a reviewed HVLS preview."""

import importlib.util
import sys
from pathlib import Path
from types import ModuleType

import pytest
from test_live_registries import make_registries

from hvls import GenerationRequest, run_google_assistant_workflow


@pytest.fixture
def apply_module(monkeypatch):
    prefix = "_test_hvls_apply"
    package = ModuleType(prefix)
    package.__path__ = []
    monkeypatch.setitem(sys.modules, prefix, package)

    component = (
        Path(__file__).resolve().parents[1] / "custom_components/ha_voice_label_sync"
    )

    for name in ("preview_guard", "preview_apply"):
        spec = importlib.util.spec_from_file_location(
            f"{prefix}.{name}", component / f"{name}.py"
        )
        module = importlib.util.module_from_spec(spec)
        monkeypatch.setitem(sys.modules, spec.name, module)
        spec.loader.exec_module(module)

    return sys.modules[f"{prefix}.preview_apply"]


def prepare(tmp_path):
    registries = make_registries()
    output = tmp_path / "production.yaml"
    preview = tmp_path / "preview.yaml"

    request = GenerationRequest(
        label="google_assistant",
        domains=frozenset({"switch"}),
        output_path=output,
        dry_run=True,
    )

    generated = run_google_assistant_workflow(
        request=request,
        registries=registries,
    )
    preview.write_text(generated.generation.content, encoding="utf-8")
    output.write_text("ancienne configuration\n", encoding="utf-8")

    return registries, request, preview, output


def test_apply_valid_reviewed_preview(apply_module, tmp_path):
    registries, request, preview, output = prepare(tmp_path)
    digest = apply_module.preview_digest(preview.read_text())

    result = apply_module.apply_reviewed_preview(
        request,
        registries,
        preview,
        digest,
        10,
        True,
        expected_production_digest=apply_module.preview_digest(output.read_text()),
    )

    assert output.read_text() == preview.read_text()
    assert result.backup_path is not None
    assert result.backup_path.read_text() == "ancienne configuration\n"


def test_reject_changed_entities(apply_module, tmp_path):
    registries, request, preview, output = prepare(tmp_path)
    digest = apply_module.preview_digest(preview.read_text())

    registries["entity_registry"]["data"]["entities"][0]["name"] = "Lampe renommée"

    with pytest.raises(apply_module.PreviewChangedError):
        apply_module.apply_reviewed_preview(
            request,
            registries,
            preview,
            digest,
            10,
            True,
            expected_production_digest=apply_module.preview_digest(output.read_text()),
        )

    assert output.read_text() == "ancienne configuration\n"
    assert not (tmp_path / ".hvls_backups").exists()


def test_reject_modified_preview(apply_module, tmp_path):
    registries, request, preview, output = prepare(tmp_path)
    digest = apply_module.preview_digest(preview.read_text())

    preview.write_text("contenu modifié\n", encoding="utf-8")

    with pytest.raises(apply_module.PreviewChangedError):
        apply_module.apply_reviewed_preview(
            request,
            registries,
            preview,
            digest,
            10,
            True,
            expected_production_digest=apply_module.preview_digest(output.read_text()),
        )

    assert output.read_text() == "ancienne configuration\n"


@pytest.mark.parametrize(
    "invalid_digest",
    ["", "a" * 63, "z" * 64, "A" * 64, None],
)
def test_reject_invalid_digest(apply_module, tmp_path, invalid_digest):
    registries, request, preview, output = prepare(tmp_path)

    with pytest.raises(apply_module.PreviewChangedError):
        apply_module.apply_reviewed_preview(
            request,
            registries,
            preview,
            invalid_digest,
            10,
            True,
            expected_production_digest=apply_module.preview_digest(output.read_text()),
        )

    assert output.read_text() == "ancienne configuration\n"


def test_reject_changed_production(apply_module, tmp_path):
    registries, request, preview, output = prepare(tmp_path)

    digest = apply_module.preview_digest(preview.read_text())
    production_digest = apply_module.preview_digest(output.read_text())

    output.write_text("modification externe\n", encoding="utf-8")

    with pytest.raises(apply_module.PreviewChangedError):
        apply_module.apply_reviewed_preview(
            request,
            registries,
            preview,
            digest,
            10,
            True,
            expected_production_digest=production_digest,
        )

    assert output.read_text() == "modification externe\n"
