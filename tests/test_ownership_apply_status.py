"""Read-only ownership diagnostics for the Apply interface."""

import hashlib
from pathlib import Path

import pytest

from hvls.output_ownership_registry import OwnershipRegistry
from hvls.owned_writer import (
    evaluate_registered_output,
    write_owned_output,
)


@pytest.mark.parametrize(
    ("scenario", "expected_status", "expected_allowed"),
    [
        ("new", "new", True),
        ("manual", "unmanaged", False),
        ("managed", "managed", True),
        ("changed", "changed", False),
        ("pending", "pending", False),
        ("pending_create", "pending", False),
        ("missing", "missing", False),
        ("other_owner", "unknown", False),
        ("corrupt_registry", "unknown", False),
        ("symlink", "unknown", False),
        ("wrong_output", "unknown", False),
    ],
)
def test_apply_ownership_diagnostic(
    tmp_path: Path,
    scenario: str,
    expected_status: str,
    expected_allowed: bool,
):
    output = tmp_path / "production.yaml"
    registry_path = tmp_path / ".hvls" / "ownership.json"
    backups = tmp_path / ".hvls_backups"

    entry_id = "test-installation"

    if scenario in {
        "managed",
        "changed",
        "pending",
        "missing",
        "wrong_output",
        "other_owner",
    }:
        write_owned_output(
            output_path=output,
            content="switch.original:\n  expose: true\n",
            entry_id=(
                "another-installation"
                if scenario == "other_owner"
                else entry_id
            ),
            ownership_registry_path=registry_path,
            backup_directory=backups,
        )

    if scenario == "manual":
        output.write_text("switch.manual: {}\n")

    elif scenario == "changed":
        output.write_text("switch.external: {}\n")

    elif scenario == "pending":
        registry = OwnershipRegistry(registry_path)
        record = registry.get_record(entry_id)

        registry.begin_write(
            entry_id=entry_id,
            output_path=str(output),
            expected_sha256=record["sha256"],
            next_sha256=hashlib.sha256(b"next").hexdigest(),
        )

    elif scenario == "pending_create":
        OwnershipRegistry(registry_path).begin_create(
            entry_id=entry_id,
            output_path=str(output),
            next_sha256=hashlib.sha256(b"next").hexdigest(),
        )

    elif scenario == "missing":
        output.unlink()

    elif scenario == "corrupt_registry":
        registry_path.parent.mkdir(parents=True)
        registry_path.write_text("{invalid json")

    elif scenario == "symlink":
        target = tmp_path / "manual.yaml"
        target.write_text("switch.manual: {}\n")
        output.symlink_to(target)

    checked_output = (
        tmp_path / "different.yaml"
        if scenario == "wrong_output"
        else output
    )

    def snapshot():
        return sorted(
            (
                str(path.relative_to(tmp_path)),
                path.is_dir(),
                path.read_bytes() if path.is_file() else None,
            )
            for path in tmp_path.rglob("*")
        )

    before = snapshot()

    result = evaluate_registered_output(
        checked_output,
        entry_id,
        registry_path,
    )

    assert result.status == expected_status
    assert result.write_allowed is expected_allowed
    assert isinstance(result.reason, str)
    assert result.reason.strip()

    # Reading eligibility must never modify files or directories.
    assert snapshot() == before


def test_apply_diagnostic_has_distinct_reason_codes(tmp_path):
    """Different safety failures must have stable diagnostic codes."""
    registry = tmp_path / ".hvls" / "ownership.json"
    output = tmp_path / "production.yaml"
    entry_id = "test-installation"

    output.write_text("switch.manual: {}\n", encoding="utf-8")

    manual = evaluate_registered_output(output, entry_id, registry)
    assert manual.write_allowed is False
    assert manual.reason_code == "unmanaged_output"

    output.unlink()
    target = tmp_path / "external.yaml"
    target.write_text("switch.external: {}\n", encoding="utf-8")
    output.symlink_to(target)

    unsafe = evaluate_registered_output(output, entry_id, registry)
    assert unsafe.write_allowed is False
    assert unsafe.reason_code == "unsafe_path"

    output.unlink()
    registry.parent.mkdir(parents=True)
    registry.write_text("{invalid json", encoding="utf-8")

    corrupted = evaluate_registered_output(output, entry_id, registry)
    assert corrupted.write_allowed is False
    assert corrupted.reason_code == "registry_invalid"
