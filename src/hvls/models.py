"""Internal data models used by the HVLS core engine."""

from dataclasses import dataclass, field
from pathlib import Path


@dataclass(frozen=True)
class SelectedEntity:
    """Home Assistant entity selected for a voice assistant backend."""

    entity_id: str
    domain: str
    name: str
    room: str | None = None


@dataclass(frozen=True)
class GenerationRequest:
    """Input parameters required to generate a backend configuration."""

    label: str
    domains: frozenset[str]
    output_path: Path
    dry_run: bool = False


@dataclass(frozen=True)
class GenerationResult:
    """Structured result returned by the HVLS generation engine."""

    content: str
    entities: tuple[SelectedEntity, ...]
    domain_counts: dict[str, int] = field(default_factory=dict)
    warnings: tuple[str, ...] = ()

    @property
    def entity_count(self) -> int:
        """Return the number of selected entities."""
        return len(self.entities)

    @property
    def success(self) -> bool:
        """Return whether generation produced at least one entity."""
        return self.entity_count > 0
