#!/usr/bin/env python3
"""Compatibility wrapper for the HVLS command-line interface."""

from __future__ import annotations

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
SRC_DIRECTORY = PROJECT_ROOT / "src"


def main() -> int:
    """Run the packaged HVLS command-line interface."""
    if str(SRC_DIRECTORY) not in sys.path:
        sys.path.insert(0, str(SRC_DIRECTORY))

    from hvls.cli import main as cli_main

    return cli_main()


if __name__ == "__main__":
    raise SystemExit(main())
