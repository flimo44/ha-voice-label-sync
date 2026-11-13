# Guided setup and migration: first diagnostic slice

## Scope

The existing migration engine is **not** changed. This first UI slice
only helps a Home Assistant administrator understand a detected
`new_configuration` result before trying to initialize a migration.

The detection result is evidence, not the user's intention and not
authorization to write.

## Observations

If no `google_assistant:` declaration is found in the analyzed
`configuration.yaml`, HVLS distinguishes:

- The usual `google_assistant_entities.yaml` file is present as a regular,
  non-symlink file in the HA config directory, but it is **not referenced**.
  This is a possible migration candidate, not proof that it is in use or
  that it originated from a previous setup.
- The usual file is not detected. This is not evidence that no other
  Google Assistant files exist.

The candidate is **never read, parsed, copied, or activated** merely
to display this hint. Paths and YAML content are not added to the
admin-only WebSocket diagnostic.

## User intent

The UI offers three local, unsaved responses: new installation,
migration of an existing configuration, or not sure.

- New installation: guide the user to check existing files before generating.
- Migration: explain the missing `google_assistant:` declaration and
  `entity_config:` reference, and recommend a refreshed read-only check.
  Never instruct the user to activate an old Google integration solely
  to unblock the tool without checking external effects.
- Not sure: recommend checking the HA configuration and preserved files.

The choice is never sent to the backend as execution evidence.

## Fail closed

Protected-baseline preparation is disabled until the loaded admin
diagnostic is an unblocked, resolved `assisted_migration`. The backend
continues to enforce its own preconditions.

The current phase does **not** configure Google, import entities, stage
labels, establish ownership, run migration, or claim Google Home parity.

## Follow-on implementation

Extend the same QQOQCP pattern to: unsupported includes/packages,
YAML structure errors, local per-entity issues, runtime registry
mismatches, drift, protected backup failures, and recovery paths.
Each branch should explain what was found, consequences, where to
inspect, and a safe recheck action. The full interactive setup wizard
and end-to-end isolated-VM validation are separate steps.
