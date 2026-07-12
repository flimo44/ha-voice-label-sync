# Contributing

Thank you for your interest in HA Voice Label Sync!

Contributions, ideas and bug reports are welcome.

## Workflow

Development follows a simple Git workflow:

1. Open an Issue.
2. Create a dedicated branch.
3. Implement the change.
4. Open a Pull Request.
5. GitHub Actions must pass.
6. Squash and merge.
7. Create a release if needed.

## Branch naming

- feature/...   New features
- fix/...       Bug fixes
- docs/...      Documentation
- ci/...        Continuous Integration
- refactor/...  Code cleanup

Examples:

feature/alexa-support
fix/yaml-escaping
docs/update-readme
ci/add-ruff
refactor/generator

## Coding style

- Follow PEP 8.
- Keep functions focused on one responsibility.
- Prefer readability over clever code.
- Add comments only when they improve understanding.

## Pull Requests

Please keep Pull Requests focused on a single topic.

Before opening a PR:

- Python syntax check passes.
- Ruff passes.
- Documentation is updated if needed.
- CHANGELOG is updated for user-visible changes.

## Versioning

The project follows Semantic Versioning.

- Patch → bug fixes
- Minor → new features
- Major → breaking changes
