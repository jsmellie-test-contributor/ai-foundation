---
section: '02'
title: 'Constraints'
lifecycle: published
last_verified: ecf3245
tags: [constraints]
key_files:
  - package.json
  - package-lock.json
  - tsconfig.json
  - lib/harnesses/base.js
  - lib/resolver.js
  - steering/engineering/git-workflow-core.md
  - steering/engineering/git-workflow-projects.md
---

> Technical and organizational constraints the design must work within.

## Technical constraints

| Constraint                              | Detail                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Primarily Node.js                       | The core CLI and adapters (`bin/`, `lib/`) are plain Node.js (`engines.node: >=22.0.0`) — a hard constraint, since ESM-only and `node:test` below both depend on it. MCP servers under `servers/` are Node today, but that's not a hard rule: a third-party server in another language (e.g. a Python-based YouTrack MCP) is a legitimate fit if it's a better implementation — an MCP server only needs to speak the MCP protocol, not share a runtime with the CLI. |
| ESM-only                                | `package.json` sets `"type": "module"`; every Node module this repo owns (`lib/`, `bin/`, this repo's own `servers/` implementations) is an ES module, no CommonJS. Applies to this codebase's own Node code — not a constraint on a third-party server written in another language. Low-stakes, real constraint — noted here rather than as an ADR.                                                                                                                  |
| OS-agnostic                             | No shell scripts or OS-specific path assumptions in the install/uninstall path — `lib/harnesses/*.js` and `lib/resolver.js` use Node's `path` module throughout so installation works the same on Linux, macOS, and Windows.                                                                                                                                                                                                                                          |
| No network at install time              | `aif install`/`uninstall`/`validate`/`index` read and write the local filesystem only. Network access is confined to the optional MCP servers (`servers/gmail`, `servers/youtrack`) a project chooses to install, and to `web_search`/`web_fetch` tool grants an _installed agent_ uses at runtime — never to the framework's own CLI operations.                                                                                                                     |
| Plain JavaScript + JSDoc, no TypeScript | `tsconfig.json` type-checks JSDoc annotations (`allowJs`/`checkJs`) via `npm run typecheck`; there is no `.ts` source. Runtime validation (e.g. `zod`, where used) is separate from the type-checking layer.                                                                                                                                                                                                                                                          |

## Organizational constraints

| Constraint                         | Detail                                                                                                                       |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Human approves plans and decisions | No agent may set a plan or ADR to `Approved`; only a human confirms (`skill/plan-lifecycle`).                                |
| Human merges to `main`             | Agents open PRs; only a human merges (`steering/engineering/git-workflow-projects.md`: "Human Reviews and Merges Every PR"). |

## Conventions

| Convention                                 | Detail                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `node:test` over a third-party test runner | Jest/Vitest/Mocha appear nowhere in `package-lock.json` — the built-in `node:test` runner is used throughout `tests/`. A tooling choice, not an externally-imposed constraint.                                                                                                                                                                                                               |
| Commit messages                            | Imperative mood, under 70 characters (`steering/engineering/git-workflow-core.md`: "Commits Must Be Atomic"), Plan ID included where one governs the change (`steering/engineering/git-workflow-projects.md`: "Include Plan ID in the First Commit").                                                                                                                                        |
| Branch naming                              | `{plan-id}/{short-description}` for governed work (same source).                                                                                                                                                                                                                                                                                                                             |
| Artifact file naming                       | Type suffix in the filename (`.plan.md`, `.test-results.md`) identifies what a file is without opening it. Two exceptions: the Feature Plan is the bare suffix `plan.md` with no FeatureID prefix, since identity comes from its parent `plans/features/{FeatureID}/` directory; ADRs are a flat, bare `NNNN-slug.md` under `docs/decisions/`, MADR's own ID scheme (`skill/adr-authoring`). |
| Frontmatter-first docs                     | Structured, machine-readable values (status, tags, file references) live in YAML frontmatter; prose lives in the body. Applies to arc42 sections and ADRs alike (`skill/adr-authoring`).                                                                                                                                                                                                     |
