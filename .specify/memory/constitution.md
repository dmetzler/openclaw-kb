<!--
  === Sync Impact Report ===
  Version change: (initial template) → 1.0.0
  Modified principles:
    - [PRINCIPLE_1_NAME] → I. Code Quality
    - [PRINCIPLE_2_NAME] → II. Testing Standards
    - [PRINCIPLE_3_NAME] → III. User Experience Consistency
    - [PRINCIPLE_4_NAME] → IV. Performance Requirements
  Removed sections:
    - Principle 5 slot (template had 5, reduced to 4 per user request)
  Added sections:
    - Technology Stack (was [SECTION_2_NAME])
    - Development Workflow (was [SECTION_3_NAME])
  Templates requiring updates:
    - .specify/templates/plan-template.md ✅ no updates needed
      (Constitution Check section is dynamic, filled at plan time)
    - .specify/templates/spec-template.md ✅ no updates needed
      (Template is generic; requirements/scenarios align with principles)
    - .specify/templates/tasks-template.md ✅ no updates needed
      (Task phases and polish section already cover testing,
       performance, and quality concerns)
  Follow-up TODOs: none
-->
# OpenClaw KB Constitution

## Core Principles

### I. Code Quality

All code in this project MUST adhere to consistent, measurable quality
standards. Non-negotiable rules:

- Every module, function, and public API MUST include clear, accurate
  documentation (docstrings, inline comments for non-obvious logic).
- All code MUST pass configured linting and formatting checks before
  merge. No exceptions for "quick fixes."
- Functions and modules MUST follow the single-responsibility
  principle. A function that does more than one thing MUST be
  refactored.
- Dead code, unused imports, and commented-out code blocks MUST be
  removed before merge.
- Code duplication MUST be eliminated through shared utilities or
  abstractions when the same logic appears in three or more locations.
- All public interfaces MUST use explicit, descriptive naming. Avoid
  abbreviations unless they are universally understood domain terms.

**Rationale**: Consistent code quality reduces onboarding friction,
lowers defect rates, and ensures the codebase remains maintainable
as the project scales.

### II. Testing Standards

All features MUST be accompanied by tests that verify correctness
and prevent regressions. Non-negotiable rules:

- Every new feature or bug fix MUST include corresponding tests.
  Untested code MUST NOT be merged.
- Tests MUST be deterministic: no flaky tests, no reliance on
  external services without mocking, no time-dependent assertions
  without controlled clocks.
- Test names MUST clearly describe the scenario being verified
  (e.g., `test_returns_404_when_resource_not_found`).
- Unit tests MUST run in isolation with no shared mutable state
  between test cases.
- Integration tests MUST validate cross-boundary interactions
  (API contracts, database queries, service-to-service calls).
- Test coverage MUST NOT decrease on any merge. New code SHOULD
  target a minimum of 80% line coverage for the changed files.

**Rationale**: Rigorous testing standards catch defects early,
enable confident refactoring, and serve as executable documentation
of expected behavior.

### III. User Experience Consistency

All user-facing interfaces MUST deliver a predictable, coherent
experience. Non-negotiable rules:

- Error messages MUST be actionable: they MUST tell the user what
  went wrong and what they can do about it. Raw stack traces or
  internal codes MUST NOT be exposed to end users.
- All CLI commands MUST follow consistent argument patterns,
  flag naming conventions, and output formatting across the project.
- Help text and usage instructions MUST be available for every
  user-facing command or endpoint.
- Output formats MUST be consistent within a given mode (e.g., JSON
  output MUST always use the same envelope structure; human-readable
  output MUST use the same heading/indentation style).
- Breaking changes to user-facing interfaces MUST be communicated
  via deprecation warnings at least one minor version before removal.
- Accessibility and readability MUST be considered in all output
  design decisions (clear hierarchy, adequate contrast in terminal
  output, parseable structure for automation).

**Rationale**: Users build workflows and mental models around
consistent interfaces. Inconsistency erodes trust and increases
support burden.

### IV. Performance Requirements

All features MUST meet defined performance criteria before release.
Non-negotiable rules:

- Every feature MUST define explicit performance targets during
  the planning phase (response time, throughput, memory usage)
  documented in the implementation plan.
- Operations MUST NOT introduce regressions to existing performance
  baselines. Any degradation MUST be justified and approved.
- Resource-intensive operations MUST implement appropriate
  strategies (caching, pagination, lazy loading, streaming) to
  remain within defined constraints.
- Database queries and external API calls MUST be profiled during
  development. N+1 query patterns and unbounded result sets are
  prohibited.
- Memory allocation patterns MUST be reviewed for features
  processing large datasets. Unbounded in-memory collection growth
  is prohibited.
- Performance-critical paths MUST include benchmarks that run as
  part of the test suite and fail on regression beyond defined
  thresholds.

**Rationale**: Performance is a feature. Addressing it reactively
is significantly more expensive than building it into the
development process from the start.

## Technology Stack

Technology choices MUST be intentional and documented. Constraints:

- The project's primary language, framework, and runtime versions
  MUST be pinned in project configuration files (e.g., lock files,
  toolchain version files) and kept up to date.
- Third-party dependencies MUST be evaluated for maintenance status,
  license compatibility, and security posture before adoption.
- New dependencies MUST be justified in the pull request description.
  "Convenience" alone is not sufficient justification if the
  functionality can be achieved with existing dependencies or
  reasonable custom code.
- All dependencies MUST be regularly audited for known
  vulnerabilities. Critical vulnerabilities MUST be addressed within
  one business day of discovery.
- Infrastructure and deployment configuration MUST be version
  controlled alongside application code.

## Development Workflow

All contributors MUST follow a consistent development workflow:

- All changes MUST go through pull/merge requests. Direct pushes
  to the main branch are prohibited.
- Every pull request MUST include a description of what changed
  and why. "WIP" or empty descriptions are not acceptable for
  merge-ready PRs.
- Code review MUST be completed by at least one other contributor
  before merge. Self-merging is prohibited except for automated
  dependency updates.
- CI pipelines MUST pass (lint, test, build) before a PR is
  eligible for merge. Broken builds MUST NOT be merged.
- Commit messages MUST follow a consistent convention (e.g.,
  Conventional Commits) and reference related issues or
  specifications where applicable.
- Feature branches MUST be kept up to date with the base branch.
  Conflicts MUST be resolved by the branch author before requesting
  review.

## Governance

This constitution is the authoritative source of development
standards for the OpenClaw KB project. It supersedes conflicting
guidance found in other documents.

- **Amendment procedure**: Any change to this constitution MUST be
  proposed via pull request with a clear rationale. Amendments MUST
  be reviewed and approved before merge. The Sync Impact Report
  (HTML comment at top of this file) MUST be updated to reflect
  the change.
- **Versioning policy**: The constitution version follows semantic
  versioning (MAJOR.MINOR.PATCH). MAJOR for principle removals or
  incompatible redefinitions; MINOR for new principles or materially
  expanded guidance; PATCH for clarifications and wording fixes.
- **Compliance review**: All pull requests and code reviews MUST
  verify compliance with the principles defined in this document.
  Non-compliance MUST be flagged and resolved before merge.
- **Conflict resolution**: When a principle conflicts with a
  practical constraint, the conflict MUST be documented in the
  Complexity Tracking section of the implementation plan with
  justification for the deviation.

**Version**: 1.0.0 | **Ratified**: 2026-04-14 | **Last Amended**: 2026-04-14
