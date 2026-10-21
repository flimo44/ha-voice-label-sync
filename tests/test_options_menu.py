"""Regression tests for Home Assistant options menu steps."""

from __future__ import annotations

import ast
from pathlib import Path

CONFIG_FLOW = (
    Path(__file__).resolve().parents[1]
    / "custom_components"
    / "ha_voice_label_sync"
    / "config_flow.py"
)


def test_options_menu_steps_exist() -> None:
    """Every menu option must have a matching options-flow method."""
    tree = ast.parse(CONFIG_FLOW.read_text(encoding="utf-8"))

    options_flow = next(
        node
        for node in tree.body
        if isinstance(node, ast.ClassDef) and node.name == "HVLSOptionsFlow"
    )

    methods = {
        node.name
        for node in options_flow.body
        if isinstance(node, ast.AsyncFunctionDef)
    }

    menu = next(
        node
        for method in options_flow.body
        if isinstance(method, ast.AsyncFunctionDef) and method.name == "async_step_init"
        for node in ast.walk(method)
        if isinstance(node, ast.Call)
        and isinstance(node.func, ast.Attribute)
        and node.func.attr == "async_show_menu"
    )

    options = next(
        keyword.value for keyword in menu.keywords if keyword.arg == "menu_options"
    )

    assert isinstance(options, ast.List)

    for option in options.elts:
        assert isinstance(option, ast.Constant)
        assert isinstance(option.value, str)
        assert f"async_step_{option.value}" in methods, (
            f"Missing options flow handler: async_step_{option.value}"
        )
