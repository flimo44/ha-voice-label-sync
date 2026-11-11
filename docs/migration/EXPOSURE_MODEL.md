# Migration exposure model — read-only phase (PR #107)

## Source of truth and scope

This model is a *projection of Home Assistant's **manual** Google Assistant SYNC response*, **not** an observation of Google Home. It never claims that a synced device currently appears in a user's Google Home application, nor that Google Home routines/rooms are preserved. No migration is enabled by this phase.

The rules below were cross-checked in Home Assistant Core versions **2026.10.2** and **2026.11.0**:
- [Manual GoogleConfig.should_expose](https://github.com/home-assistant/core/blob/2026.11.0/homeassistant/components/google_assistant/http.py)
- [ENTITY_SCHEMA and Google Assistant defaults](https://github.com/home-assistant/core/blob/2026.11.0/homeassistant/components/google_assistant/__init__.py)
- [DEFAULT_EXPOSED_DOMAINS](https://github.com/home-assistant/core/blob/2026.11.0/homeassistant/components/google_assistant/const.py)
- [HA state-based supported-traits filtering](https://github.com/home-assistant/core/blob/2026.11.0/homeassistant/components/google_assistant/helpers.py)
- [Google SYNC enumeration](https://github.com/home-assistant/core/blob/2026.11.0/homeassistant/components/google_assistant/smart_home.py)

**Subtlety corrected:** if YAML omits exposed_domains, Home Assistant applies its *default list of domains* (not every possible Google-compatible domain). An explicitly empty exposed_domains list means no implicit domains. The previous PR #106 discovery label default_all_supported is a shorthand **not** to be interpreted literally; the new projection requires the real HA default-domain list, supplied by the caller. It refuses to guess otherwise.

## Two stages of truth

1. **Rule evaluation:** whether manual GoogleConfig.should_expose would select the entity based on expose_by_default, exposed_domains, explicit entity_config expose, plus HA hidden/entity_category flags. The per-entry HA schema has expose=true by default when an entity_config entry exists, even if that entry contains only a name.
2. **HA SYNC candidate:** the entity must have an active HA state, compatible Google traits, and an exposure rule allowing it. HA disabled entities generally have no active state. Hidden or categorized entities are excluded from *implicit* exposure, but an explicitly exposed entity can override that restriction.

The model intentionally receives both the active-state/registry snapshot and a precomputed google_traits_supported result. Its input is not produced in this PR: a future HA-native read-only adapter must get these facts from the supported HA versions, without changing labels or production YAML.

## Output statuses

- exposed — rules, active HA state, and Google trait support are all positively verified.
- not_exposed — definitively excluded by YAML/rules, absent from the active state machine (when the inventory is authoritative), or known unsupported.
- unknown — missing runtime state inventory, missing Google trait checks, missing HA default domains, invalid local options, or ambiguous registry visibility.

The model produces manual_ga_rule_exposes separately from ha_sync_exposure. These can differ: an explicitly exposed but disabled entity has a *true rule* but is not currently in HA SYNC. This is important for future drift if it is later enabled.

All rows mark google_home_state=unknown. The model always outputs cutover_allowed=false, independently of the number of known/exposed entries.

## Not yet implemented

- Connecting the model to live HA state and Google trait evaluation, with a reliable adapter and API capability/permission review.
- Actual per-entity custom name/room/alias reconciliation and Google Home comparison.
- User choices, protected baseline, label writes, generator changes, config check/reload, safe cutover or rollback.
- Advanced packages and cross-file ambiguities.
- HA-native integration tests against supported runtime versions, including the difference between current SYNC and retained Google Home devices.

No production source files were changed. The model is pure and tested with synthetic runtime facts, following the reference code above; it is deliberately unsuitable as a migration authorization on its own.
