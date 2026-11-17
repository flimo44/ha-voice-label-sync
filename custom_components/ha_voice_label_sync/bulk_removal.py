"""Require explicit acknowledgement for unusually large production removals.

This is an additional guard, never an alternative to Preview, SHA, ownership,
restore holds or the existing write lock. Normal small changes are unaffected.
"""

from __future__ import annotations

from typing import Any

MIN_BULK_REMOVALS = 3


class BulkRemovalApprovalError(ValueError):
    """A high-impact removal was not explicitly acknowledged."""


def bulk_removal_details(
    comparison: dict[str, Any], production_total: int | None,
) -> dict[str, int] | None:
    """Describe high-impact removal only when the production diff is valid."""
    if (
        comparison.get("status") != "ok"
        or type(production_total) is not int
        or production_total <= 0
    ):
        return None
    removed = comparison.get("removed")
    added = comparison.get("added")
    if not isinstance(removed, list) or not isinstance(added, list):
        return None

    count = len(removed)
    if count < MIN_BULK_REMOVALS or count * 2 < production_total:
        return None
    return {
        "before": production_total,
        "after": production_total - count + len(added),
        "removed": count,
    }


def require_bulk_removal_approval(
    comparison: dict[str, Any],
    production_total: int | None,
    acknowledged_removals: int = 0,
) -> None:
    """Reject a bulk removal unless its *current* count was confirmed.

    The caller independently validates reviewed Preview and production hashes.
    A number is sent rather than a generic bool to prevent accepting an old
    confirmation for a differently sized removal after re-review.
    """
    details = bulk_removal_details(comparison, production_total)
    if details is None:
        return
    if (
        type(acknowledged_removals) is not int
        or acknowledged_removals != details["removed"]
    ):
        raise BulkRemovalApprovalError(
            "Bulk removal requires confirmation: "
            f"{details['removed']} of {details['before']} entities would be "
            "removed. Review the Preview and confirm the removal count."
        )
