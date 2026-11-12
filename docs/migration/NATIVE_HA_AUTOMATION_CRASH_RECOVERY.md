# PR #123 — Real Home Assistant automation and crash/restart regression

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

This proves a real automation **could** observe a future stage-label update.
It does not simulate the user's other automations, third-party integrations,
Node-RED, or external service availability. The spy never writes Google YAML.

## B. Crash boundaries through genuinely separate processes

For two independent, fresh isolated configurations:

1. Set up the native HA registries, preserve an unrelated label, and capture
   the **real** immutable Google source using migration discovery/baseline.
2. Initialize a protected journal, transition into `labels_staging` **only
   inside this test fixture**, and write an `intent` before any label change.
3. Simulate two power-loss boundaries:
   - **Before HA mutation:** intent exists; target label was not added.
   - **After HA mutation / before journal ACK:** target label exists in the
     native registry but intent is still unresolved.
4. Explicitly persist the actual HA registry on disk and exit the preparation
   context; start a **second Python interpreter** using the same temporary
   HA configuration, loading the native registry and protected journal afresh.
5. In both cases, require an `unconfirmed_intent`, `needs_review:true`,
   `cutover_allowed:false` and rejection of a duplicate stage request.
   Compare the original source bytes, and verify no recovery API mutates
   the journal or guesses whether the operation completed.

The journal transition and label update here are **test-only** operations on
a temporary HA registry: there is no staging/approval WebSocket or service
in the actual integration. The dormant production staging executor is never
called. The private configuration, registry and backup are thrown away.

## CI security

Both smoke scripts run in the official Core 2026.11.0 image with
`--network none`, `--read-only`, isolated `/tmp`, dropped Linux
capabilities, no elevated privileges, read-only repository mount, no
production config, no secrets, and no Google account.

No Google Home parity is certified. No external automation engine or
network callback is treated as safe. Passing these tests **does not**
authorize label staging, Google YAML writes, Google reload or cutover.

Runs in addition to PR #122 and tracks #103.
