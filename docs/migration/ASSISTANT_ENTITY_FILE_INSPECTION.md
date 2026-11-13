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

## Guided provenance review (PR #144)

After a successful standalone inspection (including a partially anomalous
file with `review_required`), the Assistant displays a third, **local**
review step for `new_configuration` plus the user-selected existing/unsure
path. The user can say:
- The file was part of an older Google Assistant configuration.
- Its origin is unknown.
- It was prepared for a new configuration.

Each choice reveals an appropriate **research suggestion**, not a source
attestation. The panel distinguishes:
1. **Verified:** the bounded YAML file was read, explicit entries counted,
   and local issues reported without blocking inspection of other entries.
2. **Unknown:** the analyzed configuration does not reference the file;
   historical `expose_by_default` / `exposed_domains`, loaded HA policy and
   Google Home effective exposure remain unverified.
3. **Next check:** review previous HA backups/configurations for source
   references and global rules; never activate a historical configuration
   merely to satisfy the assistant.

A declared origin is never posted to any WebSocket endpoint, stored on
disk, turned into approval evidence or used to satisfy baseline eligibility.
The choice is cleared when the file path, migration path, or main discovery
changes, and when re-inspection begins. A late stale inspection response
cannot revive it. Packages remain classified as **Other configuration**
and do not receive the historical-source review panel. A malformed, blocked,
or forged inspection cannot display the review step.

The test VM should verify the 52-entry example, switching the three origin
choices, `review_required` non-global anomaly treatment, then changing the
file path and rerunning the diagnostic. No action should modify HA labels,
Google Assistant YAML, or migration state.

This phase does not implement automatic provenance attestation, full
QQOQCP for every entity anomaly, or migration from an unreferenced file.

## Readable provenance report and practical backup checklist (PR #145)

The provenance review groups its facts in three separate semantic sections
with accessible headings: **verified by HVLS**, **unverified**, and
**recommended next check**. This changes presentation only, not the
underlying migration assessment or its evidence requirements.

For the user-reported **old** or **unknown** provenance paths, the recommended
next step includes an expandable, language-localized guide for manual checks
on an *offline copy* of a Home Assistant backup:

1. Open a copy of a backup without restoring it onto active Home Assistant.
2. In `configuration.yaml`, inspect the `google_assistant:` declaration or
   its `!include` target.
3. In the included configuration (if any), inspect `entity_config: !include`
   and compare its reference with the independently analyzed entity file.
4. Record global rules such as `expose_by_default` and `exposed_domains`.
   Do not disclose service accounts, tokens, passwords, or other secrets.

A "new configuration" choice hides the historical-backup lookup guide.
Changing the choice collapses the guide. Changes to the migration context,
selected YAML file, or current source assessment continue to invalidate the
selected provenance and hide the review step.

**Scope:** there is no archive scan, file picker, remote connector,
backup extraction, restoration, source attestation, Google Home exposure check,
or migration authorization. Finding a historical include reference only
supports a source-history hypothesis and does not certify runtime exposure.
Automated inspection of a user-selected backup will require a separately
reviewed design and source-isolation checks.


## Explicit isolated historical YAML inspection (PR #146)

This adds an **admin-initiated**, entirely read-only source-check workflow.
Administrators manually extract *only the necessary, sanitized YAML copies*
from an earlier backup into this fixed directory in HA's configuration folder:

```text
/config/
  configuration.yaml                      # ACTIVE -- leave untouched
  google_assistant_entities.yaml           # selected current entity file
  hvls-history-review/                    # MANUALLY prepared, isolated
    configuration.yaml                    # HISTORICAL COPY, not active
    google_assistant.yaml                 # only if referenced with !include
    google_assistant_entities.yaml        # only if referenced with !include
```

The folder name is fixed; the WebSocket command does not accept an arbitrary
directory path. The user must explicitly choose « Inspect historical copy
(read-only) » in the Assistant after checking the current entity YAML and
choosing old/unknown provenance. No directory or file is created by HVLS.

The backend uses the existing bounded YAML parser and a stricter
`_IsolatedReader`: fixed-root, YAML-only, no hidden paths, no `..`,
no symlinks (including directory segments), no secret-bearing include
filenames, and no include outside the isolated folder. File count, size,
depth, alias and node limits remain enforced. It never follows unrelated
`!secret` / credentials references, reads backup archives, opens the HA
`.storage` folder, or restores a backup.

Reports include:
- presence of a direct or `!include` Google Assistant declaration;
- `expose_by_default` (explicit or parser-assumed default) and validated
  `exposed_domains`;
- whether `entity_config` is inline, included, missing or unresolved;
- exact relative reference comparison against the current entity YAML path;
- SHA-256 *comparison result only* when both files are present (hashes and
  content are not returned);
- declaration counts and structural anomalies, with no private names, rooms,
  aliases, or service account material;
- safe error codes for unsafe paths, duplicates, YAML errors and missing files.

The historical review does **not** update live source discovery, grant access
to the migration baseline, create evidence, attest the selected file's origin,
or claim Google Home exposure. Identical path and identical contents only
establish matching snapshots at inspection time; they do not establish which
file HA loaded previously or which entities Google Home actually exposed.

User selection of another file, changing the provenance or migration intent,
or refreshing the main diagnosis invalidates the report and ignores stale
WebSocket replies. Packages remain unsupported; all reviews remain blocked
for migration.

VM acceptance:
1. In the test VM, manually make a sanitized *copy* in
   `/config/hvls-history-review/configuration.yaml`. Add matching referenced
   YAML files only if needed, retaining relative subdirectories.
2. Verify the file's origin choice is old/unknown and the standalone entity
   file has been inspected.
3. Click the explicit historical inspection button; compare reported global
   rules and include target with the copy, not with a guessed active source.
4. Test missing historical folder, unsafe `!include`, mismatched content,
   and local anomaly counts. Confirm no writes or migration button enabled.
5. Use VM snapshots and isolate external devices/Google Home connections for
   any separate HA restart or controlled production-like test.

An actual HA backup archive picker or automatic archive parsing is **out of
scope**, as is automatic import of these historical files.
