# PR #123 — Real Home Assistant automation regression

This extends the sandbox introduced by PR #122, using the **actual Home
Assistant Core 2026.11.0** in a fresh throwaway Docker container. The
ordinary Python 3.12/Node tests are unchanged.

## A. Native automation callback is a real side effect

- Start an actual HA core instance with empty native entity, device and label
  registries in a disposable configuration.
- Register only an innocuous `hvls_sandbox.record` spy service.
- Configure the **built-in HA Automation integration** with a real event trigger
  on `entity_registry_updated` for the one synthetic entity and an action
  invoking the spy service.
- Invoke the existing production `entity_label_writer.update_entity_label`
  against the synthetic registry only.
- Verify that the action runs **once** on a real label change, never for the
  subsequent idempotent no-op; other labels and original YAML are unchanged.

This proves a real automation observes an HVLS label update. It does not
simulate the user's other automations, third-party integrations, Node-RED, or
external service availability. The spy never writes Google YAML.

The crash/restart scenarios that this document used to describe exercised the
migration journal, removed with the unfinished migration tools in v1.4.0.

## CI security

The smoke scripts run in the official Core 2026.11.0 image with
`--network none`, `--read-only`, isolated `/tmp`, dropped Linux
capabilities, no elevated privileges, read-only repository mount, no
production config, no secrets, and no Google account.

No Google Home parity is certified. No external automation engine or
network callback is treated as safe.

Runs in addition to PR #122 and tracks #103.
