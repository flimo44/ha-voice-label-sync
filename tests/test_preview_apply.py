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

    for name in (
        "restore_guard", "missing_output_rebuild",
        "preview_guard", "preview_compare", "bulk_removal", "preview_apply",
    ):
        spec = importlib.util.spec_from_file_location(
            f"{prefix}.{name}", component / f"{name}.py"
        )
        module = importlib.util.module_from_spec(spec)
        monkeypatch.setitem(sys.modules, spec.name, module)
        spec.loader.exec_module(module)

    return sys.modules[f"{prefix}.preview_apply"]


def prepare(tmp_path, *, owned=False, production="switch.ancienne:\n  expose: true\n"):
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
    if owned:
        from hvls.owned_writer import write_owned_output

        write_owned_output(
            output_path=output,
            content=production,
            entry_id="test-installation",
            ownership_registry_path=tmp_path / ".hvls" / "ownership.json",
            backup_directory=tmp_path / ".hvls_backups",
        )
    else:
        output.write_text(production, encoding="utf-8")

    return registries, request, preview, output


def test_apply_reviewed_preview_can_rebuild_only_after_missing_file_review(
    apply_module, tmp_path,
):
    from hvls.owned_writer import evaluate_registered_output

    registries, request, preview, output = prepare(tmp_path, owned=True)
    original = output.read_bytes()
    saved = tmp_path / "prior.yaml"
    output.rename(saved)
    registry = tmp_path / ".hvls" / "ownership.json"
    assert evaluate_registered_output(
        output, "test-installation", registry
    ).reason_code == "managed_output_missing"

    result = apply_module.apply_reviewed_preview(
        request, registries, preview,
        apply_module.preview_digest(preview.read_text()),
        10, True, expected_production_digest=None,
        entry_id="test-installation",
        ownership_registry_path=registry,
        rebuild_missing=True,
    )

    assert output.read_text(encoding="utf-8") == preview.read_text(encoding="utf-8")
    assert result.backup_path is None
    assert saved.read_bytes() == original
    assert evaluate_registered_output(
        output, "test-installation", registry
    ).write_allowed is True


def test_missing_output_rebuild_rejects_stale_review_without_mutation(
    apply_module, tmp_path,
):
    from hvls.output_ownership_registry import OwnershipRegistry

    registries, request, preview, output = prepare(tmp_path, owned=True)
    output.unlink()
    registry = tmp_path / ".hvls" / "ownership.json"
    before = OwnershipRegistry(registry).get_record("test-installation")
    preview.write_text("switch.forged:\n  expose: true\n", encoding="utf-8")

    with pytest.raises(apply_module.PreviewChangedError):
        apply_module.apply_reviewed_preview(
            request, registries, preview,
            apply_module.preview_digest(preview.read_text()),
            10, True, expected_production_digest=None,
            entry_id="test-installation", ownership_registry_path=registry,
            rebuild_missing=True,
        )
    assert not output.exists()
    assert OwnershipRegistry(registry).get_record("test-installation") == before


def test_missing_output_rebuild_requires_null_production_hash(
    apply_module, tmp_path,
):
    registries, request, preview, output = prepare(tmp_path, owned=True)
    previous_hash = apply_module.preview_digest(output.read_text())
    output.unlink()
    with pytest.raises(apply_module.PreviewChangedError):
        apply_module.apply_reviewed_preview(
            request, registries, preview,
            apply_module.preview_digest(preview.read_text()),
            10, True, expected_production_digest=previous_hash,
            entry_id="test-installation",
            ownership_registry_path=tmp_path / ".hvls" / "ownership.json",
            rebuild_missing=True,
        )
    assert not output.exists()


def test_apply_valid_reviewed_preview(apply_module, tmp_path):
    registries, request, preview, output = prepare(tmp_path, owned=True)
    digest = apply_module.preview_digest(preview.read_text())

    result = apply_module.apply_reviewed_preview(
        request,
        registries,
        preview,
        digest,
        10,
        True,
        expected_production_digest=apply_module.preview_digest(output.read_text()),
        entry_id="test-installation",
        ownership_registry_path=tmp_path / ".hvls" / "ownership.json",
    )

    assert output.read_text() == preview.read_text()
    assert result.backup_path is not None
    assert result.backup_path.read_text() == "switch.ancienne:\n  expose: true\n"


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
            entry_id="test-installation",
            ownership_registry_path=tmp_path / ".hvls" / "ownership.json",
        )

    assert output.read_text() == "switch.ancienne:\n  expose: true\n"
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
            entry_id="test-installation",
            ownership_registry_path=tmp_path / ".hvls" / "ownership.json",
        )

    assert output.read_text() == "switch.ancienne:\n  expose: true\n"


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
            entry_id="test-installation",
            ownership_registry_path=tmp_path / ".hvls" / "ownership.json",
        )

    assert output.read_text() == "switch.ancienne:\n  expose: true\n"


def test_reject_changed_production(apply_module, tmp_path):
    registries, request, preview, output = prepare(tmp_path, owned=True)

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
            entry_id="test-installation",
            ownership_registry_path=tmp_path / ".hvls" / "ownership.json",
        )

    assert output.read_text() == "modification externe\n"


def test_apply_must_not_claim_unmanaged_output(apply_module, tmp_path):
    """A matching preview digest never authorizes manual YAML replacement."""
    from hvls import FileWriterError

    registries, request, preview, output = prepare(tmp_path)

    original = output.read_bytes()
    reviewed = apply_module.preview_digest(preview.read_text())
    production = apply_module.preview_digest(output.read_text())

    with pytest.raises(
        (apply_module.PreviewChangedError, ValueError, FileWriterError),
        match=r"(?i)ownership|unmanaged|not owned|unauthorized",
    ):
        apply_module.apply_reviewed_preview(
            request,
            registries,
            preview,
            reviewed,
            10,
            True,
            expected_production_digest=production,
            entry_id="test-installation",
            ownership_registry_path=tmp_path / ".hvls" / "ownership.json",
        )

    assert output.read_bytes() == original
    assert not (tmp_path / ".hvls_backups").exists()


@pytest.mark.parametrize(
    "invalid_yaml",
    [
        "switch.corrupt: [\n",
        "- not_an_entity_mapping\n",
        "switch.corrupt: 42\n",
        "not_an_entity_id: {}\n",
    ],
)
def test_apply_rejects_invalid_owned_production_without_mutation(
    apply_module, tmp_path, invalid_yaml,
):
    """Even a matching owned production hash does not make bad YAML safe."""
    from hvls.output_ownership_registry import OwnershipRegistry

    registries, request, preview, output = prepare(
        tmp_path, owned=True, production=invalid_yaml,
    )
    registry_path = tmp_path / ".hvls" / "ownership.json"
    original = output.read_bytes()
    ownership_before = OwnershipRegistry(registry_path).get_record("test-installation")

    with pytest.raises(
        apply_module.PreviewChangedError, match="Production YAML is invalid",
    ):
        apply_module.apply_reviewed_preview(
            request, registries, preview,
            apply_module.preview_digest(preview.read_text()),
            10, True,
            expected_production_digest=apply_module.preview_digest(
                output.read_text(),
            ),
            entry_id="test-installation",
            ownership_registry_path=registry_path,
        )

    assert output.read_bytes() == original
    assert OwnershipRegistry(registry_path).get_record(
        "test-installation",
    ) == ownership_before



def test_bulk_removal_blocks_unacknowledged_apply_without_mutation(
    apply_module, tmp_path,
):
    """Even a hash-matched, HVLS-owned YAML needs explicit large-delete approval."""
    from hvls.output_ownership_registry import OwnershipRegistry

    production = "".join(
        f"switch.legacy_{i}:\n  expose: true\n" for i in range(80)
    )
    registries, request, preview, output = prepare(
        tmp_path, owned=True, production=production,
    )
    registry = tmp_path / ".hvls" / "ownership.json"
    record = OwnershipRegistry(registry).get_record("test-installation")
    review_sha = apply_module.preview_digest(preview.read_text())
    production_sha = apply_module.preview_digest(output.read_text())
    args = (
        request, registries, preview, review_sha, 10, True,
    )
    kwargs = {
        "expected_production_digest": production_sha,
        "entry_id": "test-installation",
        "ownership_registry_path": registry,
    }

    with pytest.raises(ValueError, match="Bulk removal requires confirmation"):
        apply_module.apply_reviewed_preview(*args, **kwargs)

    assert output.read_text() == production
    assert OwnershipRegistry(registry).get_record("test-installation") == record
    assert not (tmp_path / ".hvls_backups").exists()

    # Stale or generic acknowledgments cannot bypass the reviewed count.
    for wrong in (True, 1, 79, 81):
        with pytest.raises(ValueError, match="Bulk removal requires confirmation"):
            apply_module.apply_reviewed_preview(
                *args, **kwargs, acknowledged_bulk_removals=wrong,
            )
        assert output.read_text() == production

    result = apply_module.apply_reviewed_preview(
        *args, **kwargs, acknowledged_bulk_removals=80,
    )
    assert result.backup_path is not None
    assert result.backup_path.read_text() == production
    assert output.read_text() == preview.read_text()


def test_bulk_removal_threshold_requires_count_and_ratio(apply_module):
    import sys

    guard = sys.modules[f"{apply_module.__package__}.bulk_removal"]
    for before, removed, expected in (
        (80, 77, True),
        (20, 10, True),
        (20, 9, False),
        (100, 20, False),
        (40, 12, False),
        (10, 10, True),
        (10, 9, True),
        (8, 7, True),
        (6, 3, True),
        (6, 2, False),
        (3, 3, True),
        (3, 2, False),
        (2, 2, False),
        (10, 3, False),
    ):
        comparison = {
            "status": "ok",
            "removed": [f"switch.old_{i}" for i in range(removed)],
            "added": [],
        }
        details = guard.bulk_removal_details(comparison, before)
        assert (details is not None) is expected

    assert guard.bulk_removal_details(
        {"status": "missing", "removed": ["switch.a"] * 30, "added": []},
        None,
    ) is None
