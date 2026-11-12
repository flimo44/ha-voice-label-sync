# PR #122 — Actual Home Assistant Core runtime smoke, sandbox only

This adds a **separate CI job** that executes migration safety probes against
the **official Home Assistant Core 2026.11.0 runtime** (Python 3.14.2+),
instead of relying solely on the Python 3.12 test doubles used in ordinary
HVLS CI.

The test is deliberately small, offline and production-independent.
It is neither an integration deployment nor an authorization to stage.

## Environment

CI launches `ghcr.io/home-assistant/home-assistant:2026.11.0` with:

- `--network none` (no outgoing connection or Google Home API);
- `--read-only` root filesystem;
- a disposable in-memory `/tmp` (all HA config and registry files remain
  strictly inside a randomly created temporary directory);
- repository mounted **read-only**, capabilities dropped, no new privileges;
- **no user YAML, no credentials, no persistent Home Assistant registry**.

The official container supplies the real `homeassistant.core.HomeAssistant`,
entity registry, label registry, manual Google `GoogleConfig`,
and actual HA event bus.

## Contract assertions

1. Instantiate a real HA runtime with empty temporary registries, create
   an HVLS label and an unrelated label.
2. Create three native entities and a disposable *handwritten* Google YAML
   source: exposed, explicitly excluded, and auxiliary/diagnostic.
3. Observe native `GoogleConfig.should_expose` values before a label update.
4. Register an **external observer** on the actual
   `EVENT_ENTITY_REGISTRY_UPDATED`, to demonstrate that an integration
   could be notified; the observer does not invoke any writer or network.
5. Call our real production helper `entity_label_writer.update_entity_label`
   **only against this ephemeral registry**. Verify:
   - precisely one native entity-registry update event on a real change;
   - unrelated labels are preserved;
   - an unchanged label operation is a no-op, without an extra event;
   - a stale CAS request is rejected without another update.
6. Recheck the real manual Google runtime *after* the label change; the
   native `should_expose` results must be identical to those before.
7. Exercise the actual `migration_staging_impact` read-only adapter against
   that native Google object, verify that its output never grants staging
   or cutover and never claims Google Home was tested.
8. Assert the original source YAML remains **byte-for-byte identical**.

The ordinary tests remain unchanged and continue to run on Python 3.12.
The new job is a distinct CI check so a Home Assistant breaking change
cannot be disguised by mocking a legacy API.

## Scope limitations

- This is a **real Home Assistant runtime API contract** and event-bus
  test, *not* a complete running Home Assistant integration setup.
- No Google Home sync, service account, OAuth, speaker/phone, live automations,
  Node-RED, n8n, or third-party callbacks are present.
- The event listener deliberately models one external observer and confirms
  the event is observable; it cannot prove the absence of others.
- This PR does not expose the dormant migration stage executor (#113) via
  WebSocket, UI, services or any production entrypoint.
- No PR #119 human attestation is upgraded to staging authorization.
- The CI image is pinned to 2026.11.0. A future HA release warrants a
  separate compatibility bump and fresh CI evidence.

**Safety invariant:** `stage_allowed = false`,
`cutover_allowed = false`, `google_home_state_verified = false`.

Tracking #103; follows #111–#121.
