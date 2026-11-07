# HVLS v1.0.0-beta.1 — Release checklist

Status: **draft; not tagged or published**. Branch: `release/prepare-beta2`.

## Pre-release verification

- [ ] Confirm the HA manifest version is `1.0.0-beta.1` and PyPI requirement is still `0.3.5`.
- [ ] Run `.venv/bin/python -m ruff check .`.
- [ ] Run `.venv/bin/python -m pytest -q` (baseline: 107 passing).
- [ ] Run `node --check custom_components/ha_voice_label_sync/frontend/hvls-preview-panel.js`.
- [ ] Run `git diff --check`.
- [ ] Review `README.md`, `CHANGELOG.md`, and integration translations.
- [ ] Confirm FR and EN UI in Home Assistant, including statistics, exclusions, entity filters and confirmations.
- [ ] Test label addition/removal on a disposable test entity; confirm other labels stay intact.
- [ ] Generate Preview and inspect changes; verify no production change before Apply.
- [ ] Test backup and Apply only in an environment with a recoverable copy of the production YAML.
- [ ] Confirm HACS/Hassfest/package/Python GitHub checks pass on the PR.
- [ ] Verify release ZIP asset structure, downloadability and upgrade path in a separate HA instance.

## Publish only after validation

- [ ] Merge reviewed preparation PR into `main`.
- [ ] Create the annotated Git tag `v1.0.0-beta.1` from the merged commit.
- [ ] Publish GitHub Release marked **Pre-release**, with release notes and correct HACS ZIP asset.
- [ ] Test installation/update via HACS and verify manifest version after restarting HA.
- [ ] Confirm the published README points at the actual release, not a future one.

## Rollback

Keep a copy of the prior Google Assistant production YAML and any configured HVLS backups. Rolling back a HACS integration version does not automatically restore generated YAML. Never assume a code rollback reverses a production Apply.

## Out of scope

The guided Google Assistant setup wizard and automated Google Home connection are **V2** items.
