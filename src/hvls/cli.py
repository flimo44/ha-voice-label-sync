#!/usr/bin/env python3
"""Command-line interface for HA Voice Label Sync."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path



from . import (  # noqa: E402
    FileWriterError,
    GenerationRequest,
    RegistryError,
    WorkflowError,
    run_google_assistant_workflow,
)

CONFIG_DIRECTORY = Path("/config")
STORAGE_DIRECTORY = CONFIG_DIRECTORY / ".storage"
DEFAULT_OUTPUT_FILE = CONFIG_DIRECTORY / "google_assistant_entities.yaml"

DEFAULT_DOMAINS = {
    "light",
    "switch",
    "cover",
    "climate",
    "fan",
    "input_boolean",
    "input_select",
    "scene",
    "script",
    "lock",
    "vacuum",
    "select",
}


def build_argument_parser() -> argparse.ArgumentParser:
    """Build and return the command-line argument parser."""
    parser = argparse.ArgumentParser(
        description=(
            "Generate Google Assistant entity configuration from "
            "Home Assistant labels."
        )
    )

    parser.add_argument(
        "--label",
        default="google_assistant",
        help="Home Assistant label used to select exposed entities.",
    )

    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT_FILE,
        help="Path of the generated YAML file.",
    )

    parser.add_argument(
        "--storage",
        type=Path,
        default=STORAGE_DIRECTORY,
        help="Path to the Home Assistant .storage directory.",
    )

    parser.add_argument(
        "--domains",
        nargs="*",
        default=sorted(DEFAULT_DOMAINS),
        help="Home Assistant domains to include.",
    )

    parser.add_argument(
        "--backup-directory",
        type=Path,
        default=None,
        help=(
            "Directory used for backups. "
            "Defaults to .hvls_backups beside the output file."
        ),
    )

    parser.add_argument(
        "--backup-retention",
        type=int,
        default=5,
        help="Maximum number of backups to keep.",
    )

    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Display the generated YAML without writing any file.",
    )

    return parser


def print_summary(result: object) -> None:
    """Display a human-readable workflow summary."""
    generation = result.generation

    print(f"Total: {generation.entity_count} entités")

    if generation.domain_counts:
        detail = ", ".join(
            f"{domain}: {count}"
            for domain, count in sorted(generation.domain_counts.items())
        )
        print(f"Détail par domaine -> {detail}")

    for warning in generation.warnings:
        print(f"Attention : {warning}", file=sys.stderr)

    if result.dry_run:
        print()
        print(generation.content, end="")
        return

    write_result = result.write_result

    if write_result is None:
        return

    print(f"OK: fichier écrit dans {write_result.output_path}")
    print(f"Octets écrits: {write_result.bytes_written}")

    if write_result.backup_path is not None:
        print(f"Sauvegarde créée: {write_result.backup_path}")


def main() -> int:
    """Run the HVLS command-line interface."""
    parser = build_argument_parser()
    args = parser.parse_args()

    if args.backup_retention < 0:
        parser.error("--backup-retention ne peut pas être négatif.")

    request = GenerationRequest(
        label=args.label,
        domains=frozenset(args.domains),
        output_path=args.output,
        dry_run=args.dry_run,
    )

    try:
        result = run_google_assistant_workflow(
            request=request,
            storage_path=args.storage,
            backup_directory=args.backup_directory,
            backup_retention=args.backup_retention,
        )
    except (
        RegistryError,
        FileWriterError,
        WorkflowError,
        OSError,
        ValueError,
    ) as exc:
        print(f"Erreur : {exc}", file=sys.stderr)
        return 1

    print_summary(result)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
