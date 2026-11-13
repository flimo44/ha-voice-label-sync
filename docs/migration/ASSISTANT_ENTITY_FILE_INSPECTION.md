# Assistant: independent entity-file inspection

## Supported automatic discovery

Existing `migration_discovery` parses only supported manual GA YAML in
`configuration.yaml`, `google_assistant: !include …`, and
`entity_config: !include …`. Configurations involving packages stay
unsupported and blocked for migration.

For a missing active declaration, the guided Assistant may suggest a
regular `google_assistant_entities.yaml` file already present inside the
HA config directory. This is a hint, never proof of use.

## Standalone inspector

An administrator can supply a relative YAML path in the Assistant.
The `inspect_assistant_entity_file` WebSocket command runs a bounded
PyYAML BaseLoader inspection in the executor. It returns counts for:
- all declared entries;
- `expose: true` explicitly set on individual entities;
- `expose: false` explicitly set on individual entities;
- entries with no `expose` field (unknown without global policy);
- invalid `expose` values (also reported as structural anomalies);
- entries with local anomalies, with limited entity ID/line examples.

For compatibility, `requested_exposure` is retained as a **legacy aggregate**
of explicit-true plus omitted-expose entries. The Assistant must never
display it as the number of explicitly requested or actually exposed
Google Home entities. Malformed entries may not belong to any of these
exposure-intent subsets, and the anomaly count is not a disjoint category.

- Reject absolute paths, parent traversals, hidden paths, reserved or
  secret-bearing names, and symlinks including intermediate directories.
- Restrict file size, total parsed nodes, aliases and nesting using the
  existing migration discovery parser.
- Never read secrets, return custom names, rooms or aliases, or write files.
- Never use this selected file as a substitute for the active GA policy;
  never pass its data to the migration baseline, stage, or cutover.
- A parsed file is **not** evidence of effective exposure, loaded HA state,
  migration readiness or Google Home parity.

The Assistant shows structural YAML examples as optional help and clearly
states that Google Assistant needs additional settings. Package configurations
are classified as "Other configuration"; the manual check does not parse the
package wiring or change its blocked status.

## Validation

Python tests cover good and malformed YAML, local anomalies, missing files,
bad paths, secret-bearing names, symlinks, duplicates, size and no writes.
JavaScript tests cover manual vs suggested paths, package guidance,
non-authorizing results and stale WebSocket responses.

Beta VM acceptance criteria:
1. Missing `google_assistant:` plus existing entity file: suggest file.
2. Selecting an existing setup exposes the YAML help and path check.
3. Read-only inspection reports 52 entities for the test file if unchanged.
4. Entering a different path resets the previous assessment.
5. Packages remain unsupported even when standalone file inspection succeeds.
6. The migration preparation button stays disabled while no resolved active
   manual configuration is detected.

This phase does not implement full QQOQCP explanations or migration from
an unreferenced file.
