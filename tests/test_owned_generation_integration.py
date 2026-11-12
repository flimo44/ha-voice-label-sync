"""Integration tests for the ownership-aware generation workflow."""

import pytest

from hvls import (
    FileWriterError,
    GenerationRequest,
    WorkflowError,
    run_google_assistant_workflow,
)
from hvls.output_ownership_registry import OwnershipRegistry
from test_live_registries import make_registries


def request(path, dry_run=False):
    return GenerationRequest(
        label="google_assistant",
        domains=frozenset({"switch"}),
        output_path=path,
        dry_run=dry_run,
    )


def generate(tmp_path, entry_id="HA-A"):
    return run_google_assistant_workflow(
        request=request(tmp_path / "generated.yaml"),
        registries=make_registries(),
        entry_id=entry_id,
        ownership_registry_path=tmp_path / ".hvls" / "ownership.json",
    )


def test_generate_requires_installation_identity(tmp_path):
    output = tmp_path / "generated.yaml"

    with pytest.raises(WorkflowError, match="Ownership"):
        run_google_assistant_workflow(
            request=request(output),
            registries=make_registries(),
        )

    assert not output.exists()


def test_first_generation_creates_owned_file(tmp_path):
    result = generate(tmp_path)
    output = tmp_path / "generated.yaml"

    assert result.written is True
    assert output.exists()
    assert output.read_text() == result.generation.content

    registry = OwnershipRegistry(
        tmp_path / ".hvls" / "ownership.json"
    )
    record = registry.get_record("HA-A")

    assert record["state"] == "managed"
    assert record["output_path"] == str(output)


def test_regeneration_of_owned_file_is_allowed(tmp_path):
    first = generate(tmp_path)
    second = generate(tmp_path)

    output = tmp_path / "generated.yaml"

    assert second.written is True
    assert output.read_text() == second.generation.content
    assert first.generation.content == second.generation.content
    assert second.write_result.backup_path is not None


def test_manual_file_is_never_overwritten(tmp_path):
    output = tmp_path / "generated.yaml"
    original = b"light.manual:\n  expose: false\n"
    output.write_bytes(original)

    with pytest.raises((FileWriterError, WorkflowError)):
        generate(tmp_path)

    assert output.read_bytes() == original
    assert not (tmp_path / ".hvls_backups").exists()


def test_other_installation_cannot_take_ownership(tmp_path):
    generate(tmp_path, entry_id="HA-A")
    output = tmp_path / "generated.yaml"
    original = output.read_bytes()

    with pytest.raises((FileWriterError, WorkflowError)):
        generate(tmp_path, entry_id="HA-B")

    assert output.read_bytes() == original


def test_dry_run_does_not_require_ownership(tmp_path):
    output = tmp_path / "generated.yaml"

    result = run_google_assistant_workflow(
        request=request(output, dry_run=True),
        registries=make_registries(),
    )

    assert result.dry_run is True
    assert result.write_result is None
    assert not output.exists()
    assert not (tmp_path / ".hvls").exists()
