# PR #114 — Exact Google Assistant metadata from protected baseline

This is a **private, read-only, opt-in preview capability**. It is not
connected to Home Assistant WebSocket, services, the existing generator,
production Apply, startup, or the migration journal. Installing HVLS cannot
change any exposure, label, name, room, aliases, or YAML because of this PR.

## Why a label is not enough

The existing HVLS generator synthesizes Google Assistant `name` and `room`
from native HA entity names/areas, and does not emit `aliases`. Simply
importing the label from manual Google Assistant YAML could silently change
pronunciation, rooms or routines when the generated file is used.

The original YAML is already in the private PR #111 write-once baseline.
This PR deliberately **avoids a second mutable store** of personal metadata.
`migration_metadata.read_baseline_metadata(config_dir)` re-verifies the
baseline and exact original bytes, parses only the supported explicit manual
Google Assistant `entity_config` topology, and extracts:

- `name` as an exact string, preserving accents, punctuation and spacing;
- `room` as an exact string;
- `aliases` as an ordered list, including an explicitly empty list;
- `expose:false` as a protected exclusion, never an import target.

`!include` is followed **only inside the verified baseline inventory**:
this module never resolves `!secret`, arbitrary tags or paths outside the
protected copy. Only the configured original YAML filenames already captured
by PR #111 can be parsed. Source topology mismatch is a **global error**.

An invalid value or unsupported per-entity option is a **local**
`needs_review` issue, not a reason to discard valid metadata on other
entities. We do not copy arbitrary unknown options or their values.
Unquoted `on`, `null`, numeric or boolean YAML scalars in name/alias/room
positions are not silently converted into strings; they need review.

## Preview overlay, not a cutover

`preview_metadata_overlay(generated_yaml, snapshot, import_entity_ids)`
is a pure function that accepts the existing **unwritten** HVLS generator
output and a precisely selected set of entities proposed for import. It:

1. Rejects unsafe, malformed, duplicate-key or unsupported generated YAML.
2. Rejects duplicate or invalid import identifiers.
3. Overlays original explicit metadata on matching generated entries,
   giving **approved imported manual values precedence over HA defaults**.
4. Validates a YAML round-trip (including Unicode and reserved strings).
5. Removes from this **preview only** entities with unsupported original
   options, invalid metadata or explicit exclusion, and marks each for
   review without blocking unrelated valid entries.
6. Refuses to produce any preview content if the generator already includes
   an entity that is not among the explicitly reviewed import selections.
   This prevents a pre-existing label from silently introducing exposure.
7. Lists all original entries not imported as
   `manual_entry_requires_cutover_decision`. A later UI must resolve
   Keep / Disable / Remove for each before final cutover.

The generated `content` contains private Google device names/rooms/aliases.
It must remain **administrator-only private data**, never included in
diagnostic logs, telemetry, public issues, unauthenticated API responses,
or exception messages. Per-entity reports expose only field names and
reason codes, not their values.

The preview is expressly **not a new production writer**. Its result always
contains `read_only:true`, `apply_allowed:false`,
`cutover_allowed:false` and `google_home_state_verified:false`. A
preview with local issues is **incomplete** and is not a valid basis for
cutover. Any missing or renamed entity, Google Home routine, or implicit
default-exposure difference still needs independent resolution.

## Future wiring and security work

The PR #112 planner and the PR #113 label executor intentionally **continue
to block customized entities** until this overlay is securely integrated
with the full reviewed migration workflow. The metadata values are
extracted from the original protected baseline for a future generator; the
PR does **not** lift existing safety gates.

Before any actual cutover, implement explicit approval persistence, link
the selected baseline snapshot to reviewed decisions, revalidate source
and HA runtime policy, preserve the effective exposed set (including
`expose:false` and implicit exposure), stage labels with the PR #111
journal, generate validated YAML, and provide guarded manual edits,
reload, Google Home checks and rollback.

Unit tests are synthetic. They establish exact-value and parser behavior,
not behavior of the native Google Assistant integration on a real HA
installation. Validate against isolated HA versions before enabling UI.

Refs #103, #110, #111, #112, #113.
