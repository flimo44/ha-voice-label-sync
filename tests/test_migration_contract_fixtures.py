"""Validate the migration design fixture corpus without asserting runtime behavior.

The migration analyzer does not exist yet. These tests check fixture integrity
and YAML parseability only. Future tests must invoke the analyzer and validate
its classifications, no-write guarantee, and effective-exposure semantics.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
import yaml

FIXTURE_FILE = (
    Path(__file__).resolve().parent
    / "fixtures"
    / "migration"
    / "contract_cases.json"
)

with FIXTURE_FILE.open(encoding="utf-8") as fixture_file:
    CONTRACT = json.load(fixture_file)

CASES = CONTRACT["cases"]

VALID_GATES = {"new_configuration", "pending_review", "blocked"}
VALID_RULES = {
    "none",
    "explicit_only",
    "domain_limited",
    "default_exposed_domains",
    "unknown",
}


def test_contract_corpus_has_version_and_unique_identifiers() -> None:
    """Avoid silently losing or duplicating an acceptance vector."""
    assert CONTRACT["schema_version"] == 1
    assert "not" in CONTRACT["notice"].lower()
    ids = [case["id"] for case in CASES]
    assert len(ids) == len(set(ids))
    assert set(ids) == {f"S{i:02d}" for i in range(1, 21)}


@pytest.mark.parametrize("case", CASES, ids=[item["id"] for item in CASES])
def test_contract_case_structure_and_yaml_parseability(case: dict) -> None:
    """Ensure deliberate valid/invalid source examples stay as intended."""
    assert case["title"]
    assert "configuration.yaml" in case["files"]

    expected = case["expected"]
    assert isinstance(expected["parseable"], bool)
    assert expected["rule"] in VALID_RULES
    assert expected["gate"] in VALID_GATES
    assert isinstance(expected["diagnostics"], list)
    assert len(expected["diagnostics"]) == len(set(expected["diagnostics"]))
    assert all(isinstance(item, str) and item for item in expected["diagnostics"])

    for name, content in case["files"].items():
        assert name != ""
        assert not name.startswith("/")
        assert ".." not in Path(name).parts
        assert name.endswith((".yaml", ".yml"))
        assert isinstance(content, str)
        assert len(content) < 100_000

        # Compose does not resolve YAML tags or touch referenced files.
        # It deliberately does NOT detect duplicate mapping keys.
        if name == "configuration.yaml" and not expected["parseable"]:
            with pytest.raises(yaml.YAMLError):
                yaml.compose(content, Loader=yaml.BaseLoader)
        else:
            document = yaml.compose(content, Loader=yaml.BaseLoader)
            assert document is not None

    if "explicit_entities" in expected:
        assert isinstance(expected["explicit_entities"], int)
        assert expected["explicit_entities"] >= 0


def test_invalid_yaml_and_duplicate_keys_are_distinct_cases() -> None:
    """Parsing success alone must never be mistaken for migration safety."""
    by_id = {case["id"]: case for case in CASES}
    assert by_id["S07"]["expected"]["parseable"] is False
    assert "yaml_syntax_error" in by_id["S07"]["expected"]["diagnostics"]
    assert by_id["S08"]["expected"]["parseable"] is True
    assert "duplicate_mapping_key" in by_id["S08"]["expected"]["diagnostics"]
    assert by_id["S08"]["expected"]["gate"] == "blocked"
