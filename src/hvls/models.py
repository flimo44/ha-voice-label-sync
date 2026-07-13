"""Internal data models used by the HVLS core engine."""

from dataclasses import dataclass, field
from datetime import datetime
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
class SelectionResult:
    """Structured result returned by the entity selection engine."""

    entities: tuple[SelectedEntity, ...]
    domain_counts: dict[str, int] = field(default_factory=dict)
    warnings: tuple[str, ...] = ()

    @property
    def entity_count(self) -> int:
        """Return the number of selected entities."""
        return len(self.entities)

    @property
    def success(self) -> bool:
        """Return whether at least one entity was selected."""
        return self.entity_count > 0


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

@dataclass(frozen=True)
class FileWriteResult:
    """Structured result returned after writing generated configuration."""

    output_path: Path
    backup_path: Path | None
    bytes_written: int
    written_at: datetime

@dataclass(frozen=True)
class WorkflowResult:
    """Structured result returned by an HVLS workflow execution."""

    generation: GenerationResult
    write_result: FileWriteResult | None
    dry_run: bool

    @property
    def entity_count(self) -> int:
        """Return the number of selected entities."""
        return self.generation.entity_count

    @property
    def written(self) -> bool:
        """Return whether generated content was written to disk."""
        return self.write_result is not None
