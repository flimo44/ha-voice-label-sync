## WORKFLOW.md
# Development Workflow
This document describes the development workflow used by the HA Voice Label Sync project.
The objective is to keep the project simple, maintainable and well documented.

1. Idea
Every improvement starts with an idea.
At this stage:
* No code is written.
* The idea is discussed.
* The project vision (PRODUCT.md) is checked.
Questions:
* Does it solve a real problem?
* Does it fit the project philosophy?
* Is it worth implementing?

2. Issue
If the idea is accepted:
* Create a GitHub Issue.
* Assign labels.
* Assign the milestone.
* Add it to the GitHub Project.

3. Planning
Move the issue:
Ideas
?
Planned
The feature is now officially part of a future release.

4. Local Development
All modifications are made locally.
Never edit files directly on GitHub unless absolutely necessary.

5. Testing
Before committing:
* Review the code.
* Review the documentation.
* Verify Markdown rendering.
* Test the feature.

6. Git
Development cycle:
git status
?
git add
?
git commit
?
git pull �rebase
?
git push

7. Documentation
Every user-visible change must be documented.
Update when required:
* README.md
* CHANGELOG.md
* Examples
* Documentation
A feature is not considered complete until its documentation is updated.

8. Release
Move the issue through the project workflow:
Ideas
?
Planned
?
Development
?
Testing
?
Documentation
?
Released
Close the Issue after the release.

Guiding Principles
* Think before coding.
* One step at a time.
* Validate before continuing.
* Documentation is part of the feature.
* Home Assistant remains the source of truth.
* Simplicity over complexity.
* Build on solid foundations.
