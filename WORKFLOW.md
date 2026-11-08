# HA Voice Label Sync — Development Workflow

This document separates development and release practices from the implementation architecture described in [ARCHITECTURE.md](ARCHITECTURE.md).

## Principles

- Start from a real user problem and confirm it fits the project scope.
- Prefer a simple, understandable user experience; if a feature needs pages of instructions, reconsider the UI.
- Keep Home Assistant the authoritative source for entity and label state.
- Avoid modifying production without explicit user intent and appropriate safeguards.
- Develop in a dedicated branch; review changes in a pull request before merging.
- Use reproducible tests and document user-visible behavior.
- Do not enlarge HVLS's Google Assistant mission to anticipate speculative future products.

## From idea to release

1. **Idea:** describe the user problem, proposed behavior, safety risks and expected benefit.
2. **Planning:** record accepted work in the roadmap; use a GitHub issue/milestone/project when appropriate.
3. **Development:** branch from the intended base, change the smallest relevant components and add regression tests.
4. **Testing:** exercise Python/JS tests and relevant Home Assistant UI workflows; check error, empty, mobile and translation states where applicable.
5. **Documentation:** update README, CHANGELOG, roadmap and screenshots when affected. Do not describe planned capabilities as already available.
6. **Review:** inspect the diff, check safe production behavior and open a PR. Merge only after review and applicable CI checks.
7. **Release:** verify the release version, packaged artifact, publication notes and installation/update instructions. Close corresponding issues and update the project.

## Typical local Git commands

```bash
git status
git switch main
git pull --ff-only
git switch -c feat/short-description

# edit code and run relevant tests
git diff --check
git status
git add <files>
git commit -m "feat: describe the change"
git push -u origin feat/short-description
```

Use `git pull --rebase` only when appropriate for the current branch and after checking local changes. Do not force-push a shared branch without coordination.

## Release checklist

- [ ] Agreed scope and behavior are documented.
- [ ] Relevant tests pass, including regressions.
- [ ] Changes were validated in Home Assistant where applicable.
- [ ] No unexpected production writes or configuration changes.
- [ ] README, CHANGELOG and other affected documentation are consistent.
- [ ] User-facing translations and screenshots are updated if necessary.
- [ ] Version and distribution artifacts agree.
- [ ] CI and applicable packaging/HACS checks pass.
- [ ] PR is reviewed and merged.
- [ ] Release and follow-up issue/project statuses are updated.

Not every minor edit requires a separate milestone or a new release, but every change deserves an appropriate review.
