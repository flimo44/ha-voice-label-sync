"""An unowned existing YAML must never be replaced by generation."""

import pytest
from test_live_registries import make_registries

from hvls import (
    FileWriterError,
    GenerationRequest,
    WorkflowError,
    run_google_assistant_workflow,
)


def test_generation_refuses_unmanaged_existing_file(tmp_path):
    output = tmp_path / "manual_google.yaml"
    original = b"light.manual:\n  expose: false\n"
    output.write_bytes(original)

    request = GenerationRequest(
        label="google_assistant",
        domains=frozenset({"switch"}),
        output_path=output,
        dry_run=False,
    )

    with pytest.raises(
        (WorkflowError, FileWriterError, ValueError),
        match=r"(?i)ownership|unmanaged|not owned|unauthorized",
    ):
        run_google_assistant_workflow(
            request=request,
            registries=make_registries(),
        )

    assert output.read_bytes() == original
    assert not (tmp_path / ".hvls_backups").exists()
