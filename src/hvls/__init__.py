"""Reusable core package for HA Voice Label Sync."""

from .backends import render_google_assistant, yaml_escape
from .engine import resolve_label_ids, select_entities, slugify
from .models import (
    GenerationRequest,
    GenerationResult,
    SelectedEntity,
    SelectionResult,
)
from .registry import RegistryError, get_registry_items, load_json

__all__ = [
    "GenerationRequest",
    "GenerationResult",
    "RegistryError",
    "SelectedEntity",
    "SelectionResult",
    "get_registry_items",
    "load_json",
    "resolve_label_ids",
    "select_entities",
    "slugify",
    "render_google_assistant",
    "yaml_escape",
]
