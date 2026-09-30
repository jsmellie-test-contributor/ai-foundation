# Feature Plan: Transitive skill dependencies for bundle installs

## 1. Metadata

| Field               | Value                                                                                                                                                     |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Feature ID          | AIF-006                                                                                                                                                   |
| Project             | ai-foundation                                                                                                                                             |
| Status              | Draft                                                                                                                                                     |
| Author (Agent)      | Engineering Manager                                                                                                                                       |
| Reviewed By         | Pending                                                                                                                                                   |
| Created             | 2026-09-30 00:00                                                                                                                                          |
| Last Updated        | 2026-09-30 00:00                                                                                                                                          |
| Standards           | `javascript`, `node` (resolver, validator and tests — real runtime code); AGENTS.md component schemas (skill, steering and agent frontmatter and prompts) |
| Total Tasks         | {filled after decomposition}                                                                                                                              |
| Product Requirement | None                                                                                                                                                      |
| ADRs                | None                                                                                                                                                      |

---

## 2. Goal

A bundle install must include every skill that an installed skill or steering file tells agents to follow. Today `collectSkillsFromAgents` installs only skills listed in some agent's `skills:`, so `plan-lifecycle` and `adr-authoring` are never installed even though the steering and several skills cite them (a cloud session reported `/root/.claude/skills/plan-lifecycle` missing). The Feature adds an optional `requires_skills` frontmatter field on skills and steering files, resolves it transitively at bundle resolution, and validates it so a missing skill, a cycle, or an undeclared reference is caught before it ships.

> Requirement traceability: `docs/plans/features/AIF-005/spike-main-thread-agent.md`, "Stage C rerun", Finding 2 (on branch `claude/bundles-install-check-f73zcv`, not yet on `main`).

---

## 3. Quick Summary

**Open Items:** 6 open (0 High / 2 Medium / 4 Low) — see Section 8

**Tier:** Tier 3 under `skill/complexity-tiers` (a schema change spanning resolver, validator, snapshot behaviour, one harness adapter, and several component definitions and docs), so it is a Feature.

**Approach in one line:** `requires_skills` on skills and steering, resolved as a transitive closure in `resolveBundle`; dependents go stale through the existing snapshot hashing; `aif validate` gains missing, cycle and undeclared-reference checks.

---

## 4. Scope

### In Scope

- New optional `requires_skills` frontmatter field on skills (`SKILL.md`) and steering files — a list of bare skill names (a `skill/` prefix is also accepted, normalised by `parseSkillRef`).
- Bundle resolution installs the transitive, deduplicated closure of `requires_skills` for every skill in the bundle (from agents' `skills:`, a bundle's explicit `skills:`, and any skill required by a steering file in the bundle). Missing and cyclic dependencies fail resolution with an error that names the chain.
- Declarations for every dependency the audit found (Section 5, Audit result), including the three engineering steering files and `feature-planning`, `task-orchestration`, `adr-authoring` and `agent-authoring` → `plan-lifecycle`.
- `adr-authoring` added to `agents/architect.yaml` `skills:`; not preloaded.
- `aif validate`: dependency-exists check (error), cycle check (error), and undeclared-reference check for `skill/x` body mentions (warning).
- Kiro adapter: skills required by an agent's skills (and, pending Open Question 1, by the steering it loads) are attached as that agent's `skill://` resources.
- Docs: AGENTS.md schema section, `skill-authoring` and `steering-authoring` skills and their schema references, `docs/architecture/05_01_bundle_resolution.md`, and any other arc42 section the Doc-Update Acceptance Gate identifies, with `last_verified` bumped per `steering/engineering/architecture-authoring.md`.
- Unit, integration and validation tests for all of the above.

### Out of Scope

- A `domain` field on skills. Considered and rejected — see Work Log.
- `requires_skills` on agents (agents keep `skills` and `preload_skills`, unchanged), servers, or standards.
- Requirements between other component kinds (steering → steering, skill → steering, and so on).
- Automatically adding required skills to any agent's `preload_skills`.
- Fixing `validateBundleSchemas` in `lib/commands/validate.js`, which never validates anything because it looks for `bundles/*.yaml` files while bundles are `bundles/<name>/bundle.yaml` directories — raised as Open Question 5.
- Promoting the undeclared-reference warning to an error.

---

## 5. Feature Description

### User-Facing Behaviour

An author who writes "follow `skill/plan-lifecycle`" in a skill or steering file adds `requires_skills: [plan-lifecycle]` to that file's frontmatter. `aif install` then installs `plan-lifecycle` with the rest of the bundle without anyone listing it in an agent. `aif validate` reports a declared skill that does not exist, a dependency cycle, and a body reference that is not declared (as a warning). Consumers of an installed bundle see no change except that the missing skills are now present.

Field shape, on a skill or steering file:

```yaml
requires_skills:
  - plan-lifecycle
```

### Data Flow

1. `resolveBundle` collects seed skills exactly as today (domain discovery from agents, then the bundle's explicit `skills:`), plus the `requires_skills` of every steering file in the resolved steering list.
2. A new closure step walks `requires_skills` from each seed skill, skill by skill, reading each `SKILL.md` frontmatter. It tracks the current path to detect cycles and a visited set to deduplicate. The result goes through the existing `dedupe`.
3. `ResolvedBundle.skills` now holds the closure. `install.js`, `computeBundleSourceHashes` and the snapshot code consume it unchanged, so a skill pulled in only as a dependency is installed, hashed and tracked like any other.
4. Claude: no adapter change (installed skills are reachable through the Skill tool). Kiro: agent `resources` are built from each agent's `skills` closure (see Open Question 1 for steering-required skills).

### Business Rules

- Transitive, not one level. Any chain of `requires_skills` is followed to the end.
- `requires_skills` adds to what is installed; it never changes what an agent lists in `skills` or `preload_skills`. Preloading stays an explicit per-agent choice because it costs context.
- Bundles with explicit `skills:` lists and no `domain` still receive the closure. Listing a skill by hand without its dependencies is the bug this Feature exists to fix, so there is no opt-out.
- A dependency on a skill that does not exist, or a cycle, is an error in `resolveBundle` and in `aif validate`. The message names the chain, for example `feature-planning → plan-lifecycle → (missing)`.
- The undeclared-reference check is advisory: a `skill/x` body mention in a skill or steering file, where `x` is not in that file's `requires_skills`, is a warning. A reference is exempt when the referenced skill itself (transitively) requires the referencing skill — it describes a consumer, not a need (see Open Question 2).
- Editing a file's `requires_skills`, or a required skill's content, changes the bundle's source hashes, so dependent bundles become stale through the existing freshness detection with no change to the snapshot format.

### Audit result

A repo-wide scan of `skill/<name>` references from everything the `engineering` and `generic` bundles install, against what they install:

| Finding                                                                                                                                      | Detail                                                                                                                                                                                                                                                                                                                                                                                                                              |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Not installed by any bundle                                                                                                                  | `plan-lifecycle`, `adr-authoring`. Every other skill on disk is installed.                                                                                                                                                                                                                                                                                                                                                          |
| `plan-lifecycle` cited by                                                                                                                    | `steering/engineering/core.md`, `git-workflow-framework.md`, `git-workflow-projects.md`; skills `feature-planning`, `task-orchestration`, `agent-authoring`                                                                                                                                                                                                                                                                         |
| `adr-authoring` cited by                                                                                                                     | No installed component (only docs and plans mention it); the requirement is that Architect can use it, handled by the Architect `skills:` change                                                                                                                                                                                                                                                                                    |
| Cited and already installed, but only because an agent lists them (worth declaring so installs stay correct for bundles with explicit lists) | `complexity-tiers`, `feature-planning` (core.md); `task-orchestration` (document-types.md); `pr-stewardship` (git-workflow-core.md); `worktree-management`, `complexity-tiers`, `test-execution` (task-orchestration); `skill-authoring` (agent-authoring); `complexity-tiers`, `ai-component-review` (code-review); `review-severity`, `code-review` (ai-component-review); `code-review`, `ai-component-review` (review-severity) |
| `generic` bundle                                                                                                                             | `steering/generic/gmail-irreversible-action-approval.md` cites `steering-authoring`, which the `generic` bundle does not install on its own (it is present only when `engineering` is also installed)                                                                                                                                                                                                                               |

All of these are declared by this Feature, so the undeclared-reference warning is clean on `main` when it lands (the `code-review` / `ai-component-review` / `review-severity` mutual citations are the one case needing a rule — Open Question 2).

### Error States

| Scenario                                                 | Expected Behaviour                                                                                                           |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `requires_skills` names a skill with no `skills/<name>/` | `resolveBundle` throws naming the chain; `aif validate` reports it with the declaring file                                   |
| `requires_skills` forms a cycle                          | `resolveBundle` throws naming the cycle path; `aif validate` reports it                                                      |
| `requires_skills` is not a list of strings               | `aif validate` schema error on the declaring file; `resolveBundle` throws rather than guessing                               |
| Body cites `skill/x`, `x` exists, `x` is not declared    | `aif validate` warning (does not fail the run); not reported inside fenced code blocks, matching the existing citation check |
| A dependency changes after an install                    | The bundle's source hashes differ, so `aif install` and the session-start freshness check treat it as stale                  |

---

## 6. Architecture Overview

### New Components

| Component             | Type                          | Responsibility                                                                                                                               |
| --------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Skill closure step    | Function in `lib/resolver.js` | Pure function over a `name → requires_skills[]` map: returns the deduplicated closure, or a missing/cycle error naming the chain. No I/O.    |
| Dependency reader     | Function in `lib/resolver.js` | Thin I/O wrapper: reads `requires_skills` from a skill's or steering file's frontmatter and builds the map the closure step consumes.        |
| Dependency validation | Checks in `validate.js`       | Reuses the same pure closure and reader for the exists and cycle checks; adds the undeclared-reference scan over skills and steering bodies. |

Design follows `steering/engineering/core.md`: "Design for Testability" — the closure and the undeclared-reference decision are pure and unit tested without the filesystem; only the readers touch disk. A shared frontmatter reader is reused or extracted rather than duplicated (`validate.js` currently has its own private `extractFrontmatter`).

### Component Relationships

- `resolveBundle` → dependency reader → closure step → `ResolvedBundle.skills`.
- `install.js`, `snapshot/io.js` and the Kiro adapter consume `ResolvedBundle.skills` and agent `skills`; they do not parse `requires_skills` themselves.
- `validate.js` calls the same reader and closure step, so `validate` and `install` cannot disagree about what a bundle contains.

### Integration Points

- `lib/resolver.js` — `collectSkillsFromAgents`, `parseSkillRef`, `dedupe` (the closure extends this pipeline).
- `lib/snapshot/io.js` — `computeBundleSourceHashes` already hashes every resolved skill; verified, not modified.
- `lib/harnesses/kiro.js` — `transformAgent` builds `skill://` resources from `agent.skills` only today.
- `lib/harnesses/claude.js` — unchanged; preload stays driven by `preload_skills`.
- `lib/commands/validate.js` — schema checks for skills and steering, cross-reference checks, and the citation checker this Feature sits beside.
- `lib/component-defs.js` — gains a JSDoc type for the new field.

---

## 7. Security Considerations

- Skill names read from frontmatter are used to build filesystem paths. The reader and resolver must accept only names matching the existing kebab-case rule (no `/`, no `..`), so a crafted `requires_skills` entry cannot resolve outside `skills/`. Addressed in the resolver Task and covered by a test.
- No network, secrets or credential handling is introduced.

---

## 8. Risks & Open Questions

| #   | Risk / Question                                                                                                                                                                                                                                                                                                                                                                                | Type     | Impact | Source       | Raised By           | Resolved |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------ | ------------ | ------------------- | -------- |
| 1   | Kiro attaches only an agent's own `skills` as `skill://` resources. A skill required only by steering (`plan-lifecycle` via `core.md`) would install on Kiro but attach to no agent. Recommendation: Kiro resources use the closure of each agent's `skills` plus the `requires_skills` of the steering that agent loads. Alternative: Claude-first, Kiro gap documented.                      | Question | M      | Architecture | Engineering Manager | No       |
| 2   | `code-review`, `ai-component-review` and `review-severity` cite each other, which would be a cycle if all are declared. Recommendation: declare only `code-review → review-severity` and `ai-component-review → review-severity`, and exempt a reference from the undeclared-reference warning when the referenced skill itself requires the referencing one (a consumer mention, not a need). | Question | M      | Audit        | Engineering Manager | No       |
| 3   | Field name: `requires_skills` (recommended — `depends_on` is already used by standards for other standards, and this name says what it lists). The request used both `requires_skills` and `required_skills`.                                                                                                                                                                                  | Question | L      | Request      | Engineering Manager | No       |
| 4   | Undeclared body reference: warning (recommended, since prose matching is heuristic) or error. Revisit once the repo is clean under the check.                                                                                                                                                                                                                                                  | Question | L      | Request      | Engineering Manager | No       |
| 5   | Discovered: `validateBundleSchemas` reads `bundles/*.yaml` files, but bundles are directories, so bundle schema checks never run. Recommendation: fix in a separate follow-up, not silently inside this Feature; include it here only if you say so.                                                                                                                                           | Question | L      | Audit        | Engineering Manager | No       |
| 6   | The undeclared-reference scan is prose matching and may flag illustrative mentions. Mitigation: warning severity, skip fenced code blocks (as the citation checker does), and tune on the current repo before merge.                                                                                                                                                                           | Risk     | L      | Design       | Engineering Manager | No       |

---

## 9. Task Decomposition

Dependency graph: [`tasks.json`](./tasks.json) — not yet produced; decomposition follows approval (`skill/feature-planning`: "Decompose into Tasks").

Summary: {filled after decomposition}. Expected shape, not binding: resolver and closure with unit tests; validator checks; declarations, Architect change and Kiro attachment; docs and arc42 bumps last.

Parallelization notes:

- Docs and the arc42 `last_verified` bump depend on the final state of every `key_files` entry they describe, so they run last, and `aif index architecture --check` runs once as the final local step.

---

## 10. Acceptance Criteria

- [ ] All Tasks complete and signed off
- [ ] Feature works end-to-end as described in Section 5
- [ ] No HIGH or CRITICAL findings open in any Task review
- [ ] A fresh `engineering` bundle install includes `plan-lifecycle` and `adr-authoring`, and a `generic`-only install includes `steering-authoring`
- [ ] A missing dependency, a cycle, and a non-list `requires_skills` each fail `resolveBundle` and `aif validate` with a message naming the chain
- [ ] An undeclared `skill/x` reference produces a warning and does not fail `aif validate`; `aif validate` passes on the repo with no warnings outstanding
- [ ] Changing a required skill (or a `requires_skills` line) marks dependent bundles stale
- [ ] `npm test` passes (unit, integration, validation) before any push
- [ ] Edited skills, steering and agents carry version bumps as the repo's version-bump check requires
- [ ] `docs/architecture/05_01_bundle_resolution.md` and any other affected arc42 section updated, with `last_verified` set by a final `aif index architecture --check`

---

## 11. Work Log

[2026-09-30 00:00] [Engineering Manager] [Tier assessed] [AIF-006] [Tier 3 (schema change, cross-cutting) — Feature Plan required. Feature ID chosen as AIF-006 per the request (AIF-005 is reserved for another Feature).]

[2026-09-30 00:00] [Engineering Manager] [Decision] [AIF-006] [Decision: no `domain` field on skills. **Why:** it installs every skill in a domain regardless of need, cannot express a skill shared across domains, does not help the domain-less `generic` bundle, and does not attach skills to Kiro agents, whereas `requires_skills` states the actual dependency; the validation work in this Feature is needed either way.]

[2026-09-30 00:00] [Engineering Manager] [Decision] [AIF-006] [Decision: `requires_skills` is transitive and applies to bundles with explicit `skills:` lists. **Why:** one level breaks on the first chain (steering → `task-orchestration` → `plan-lifecycle`), and hand-listed skills without their dependencies is the bug being fixed.]

[2026-09-30 00:00] [Engineering Manager] [Decision] [AIF-006] [Decision: `adr-authoring` is added to Architect's `skills:` but not `preload_skills`. **Why:** preloading costs context on every Architect start; it can be added later at no risk.]
