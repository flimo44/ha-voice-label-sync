"""Tests for WebSocket review fingerprints."""

import hashlib

from test_preview_websocket import websocket_module as websocket_fixture

websocket_module = websocket_fixture


def test_review_returns_exact_file_hashes(websocket_module, tmp_path, monkeypatch):
    preview_bytes = b"switch.pompe:\r\n  expose: true\r\n"
    production_bytes = b"ancienne configuration\n"

    preview = tmp_path / "preview.yaml"
    production = tmp_path / "production.yaml"

    preview.write_bytes(preview_bytes)
    production.write_bytes(production_bytes)

    monkeypatch.setattr(
        websocket_module.websocket,
        "analyze_preview",
        lambda preview_text, production_text: {
            "summary": {"total": 1},
            "comparison": {"status": "changed"},
        },
    )

    from unittest.mock import Mock

    module = websocket_module.websocket
    assert isinstance(module._read_and_compare, Mock)
    module._read_and_compare = module._read_and_compare_real

    result = module._read_and_compare(preview, production)

    assert result["can_apply"] is True
    assert result["preview_sha256"] == hashlib.sha256(preview_bytes).hexdigest()
    assert result["production_sha256"] == hashlib.sha256(production_bytes).hexdigest()


def test_review_handles_missing_production(websocket_module, tmp_path, monkeypatch):
    preview = tmp_path / "preview.yaml"
    production = tmp_path / "production.yaml"

    preview.write_text("switch.pompe:\n  expose: true\n", encoding="utf-8")

    monkeypatch.setattr(
        websocket_module.websocket,
        "analyze_preview",
        lambda preview_text, production_text: {
            "summary": {"total": 1},
            "comparison": {"status": "new"},
        },
    )

    from unittest.mock import Mock

    module = websocket_module.websocket
    assert isinstance(module._read_and_compare, Mock)
    module._read_and_compare = module._read_and_compare_real

    result = module._read_and_compare(preview, production)

    assert result["can_apply"] is True
    assert result["preview_sha256"] is not None
    assert result["production_sha256"] is None


def test_review_disables_apply_for_invalid_production(
    websocket_module, tmp_path, monkeypatch,
):
    """An invalid production YAML cannot receive an Apply authorization."""
    from test_preview_compare import module as real_compare
    from unittest.mock import Mock

    preview = tmp_path / "preview.yaml"
    production = tmp_path / "production.yaml"
    preview.write_text("switch.pompe:\n  expose: true\n", encoding="utf-8")
    production.write_text("switch.broken: [\n", encoding="utf-8")

    module = websocket_module.websocket
    assert isinstance(module._read_and_compare, Mock)
    module._read_and_compare = module._read_and_compare_real
    monkeypatch.setattr(module, "analyze_preview", real_compare.analyze_preview)

    result = module._read_and_compare(preview, production)
    assert result["available"] is True
    assert result["comparison"]["status"] == "invalid"
    assert result["can_apply"] is False
    assert result["production_sha256"] == hashlib.sha256(
        production.read_bytes(),
    ).hexdigest()
