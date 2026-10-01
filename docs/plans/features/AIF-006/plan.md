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
| Last Updated        | 2026-10-01 00:00                                                                                                                                          |
| Standards           | `javascript`, `node` (resolver, validator and tests — real runtime code); AGENTS.md component schemas (skill, steering and agent frontmatter and prompts) |
| Total Tasks         | {filled after decomposition}                                                                                                                              |
| Product Requirement | None                                                                                                                                                      |
| ADRs                | None                                                                                                                                                      |

---

## 2. Goal

A bundle install must include every skill that an installed skill or steering file tells agents to follow. Today `collectSkillsFromAgents` installs only skills listed in some agent's `skills:`, so `plan-lifecycle` and `adr-authoring` are never installed even though the steering and several skills cite them (a cloud session reported `/root/.claude/skills/plan-lifecycle` missing). The Feature adds an optional `requires_skills` frontmatter field on skills and steering files, resolves it transitively at bundle resolution, defines an enforced way to reference a skill in prose (and a way to mark a mention as not a dependency), and validates both so a missing skill or an undeclared reference is caught before it ships.

> Requirement traceability: `docs/plans/features/AIF-005/spike-main-thread-agent.md`, "Stage C rerun", Finding 2 (on branch `claude/bundles-install-check-f73zcv`, not yet on `main`).

---

## 3. Quick Summary

**Open Items:** 0 open (0 High / 0 Medium / 0 Low) — see Section 8

**Tier:** Tier 3 under `skill/complexity-tiers` (a schema change spanning resolver, validator, snapshot behaviour, and several component definitions and docs), so it is a Feature.

**Approach in one line:** `requires_skills` on skills and steering, resolved as a transitive closure (cycles allowed, broken at the first repeated skill) in `resolveBundle`; dependents go stale through the existing snapshot hashing; `aif validate` enforces a structured prose-reference form (error), ignores marked examples, and warns on any other mention.

---

## 4. Scope

### In Scope

- New optional `requires_skills` frontmatter field on skills (`SKILL.md`) and steering files — a list of bare skill names (a `skill/` prefix is also accepted, normalised by `parseSkillRef`).
- Bundle resolution installs the transitive, deduplicated closure of `requires_skills` for every skill in the bundle (from agents' `skills:`, a bundle's explicit `skills:`, and any skill required by a steering file in the bundle). A missing skill fails resolution with an error naming the chain. Cycles are allowed: the walk stops at the first skill already visited, so mutually referencing skills cannot loop.
- A defined prose convention for referencing a skill, documented in `skill-authoring` and `steering-authoring` and enforced by `aif validate` (Section 5, "Reference convention").
- Declarations for the dependencies the audit verified (Section 5, "Audit result"), including `plan-lifecycle` for the three engineering steering files and for `feature-planning`, `task-orchestration` and `adr-authoring`. `agent-authoring` and `document-types.md` are deliberately not declared (their mentions are an example and a pointer, not needs).
- `adr-authoring` added to `agents/architect.yaml` `skills:`; not preloaded.
- `aif validate`: nonexistent `requires_skills` entry (error), malformed field (error), prose reference to a skill not covered by the file's `requires_skills` (error), and any other `skill/x` mention (warning). Marked examples are ignored.
- Docs: AGENTS.md schema section, `skill-authoring` and `steering-authoring` skills and their schema references, `docs/architecture/05_01_bundle_resolution.md`, and any other arc42 section the Doc-Update Acceptance Gate identifies, with `last_verified` bumped per `steering/engineering/architecture-authoring.md`.
- Unit, integration and validation tests for all of the above.

### Out of Scope

- A `domain` field on skills. Considered and rejected.
- `requires_skills` on agents (agents keep `skills` and `preload_skills`, unchanged), servers, or standards.
- Requirements between other component kinds (steering → steering, skill → steering, and so on).
- Automatically adding required skills to any agent's `preload_skills`.
- Kiro adapter work: attaching skills required by an agent's skills, and by the steering that agent loads, as that agent's `skill://` resources. Kiro work is deferred (human 2026-10-01); this becomes a follow-up Feature. The closure itself is harness-agnostic and lands here; `lib/harnesses/kiro.js` is unchanged.
- A cycle diagnostic. Cycles are legal and produce no error or warning.

---

## 5. Feature Description

### User-Facing Behaviour

An author who tells readers to follow a skill writes it in the reference form (`` `skill/plan-lifecycle` ``) and adds `requires_skills: [plan-lifecycle]` to the file's frontmatter. `aif install` then installs `plan-lifecycle` with the rest of the bundle without anyone listing it in an agent. `aif validate` errors on a referenced skill that does not exist or is not declared, and warns on looser mentions. An author who mentions a skill without needing it marks the mention so it is ignored. Consumers of an installed bundle see no change except that the missing skills are now present.

Field shape, on a skill or steering file:

```yaml
requires_skills:
  - plan-lifecycle
```

### Reference convention

Three classes of `skill/<name>` mention in a skill's files (`SKILL.md` and its `reference/` folder) or a steering file, checked by `aif validate`:

| Class         | Form                                                                                                                                                                                                                                               | Result                                                                                                                                                 |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Reference** | An inline code span containing exactly `skill/<name>` — the form the repo already uses for citations, optionally followed by the named-locator chain                                                                                               | Error if the skill does not exist, or if `<name>` is not covered by the file's `requires_skills` (directly or through the closure of its declarations) |
| **Example**   | Inside a fenced code block (already skipped by the citation checker), inside an inline code span that holds more than the bare reference (e.g. `preload_skills: [...]`), or followed immediately by the ignore marker `<!-- skill-ref: ignore -->` | Ignored                                                                                                                                                |
| **Other**     | Any other mention, such as unformatted prose or a frontmatter `description`                                                                                                                                                                        | Warning                                                                                                                                                |

The ignore marker covers the rare backticked mention that is not a need (a pointer or a consumer mention). `README.md` files are not scanned (they are not loaded). The exact marker text is fixed in the skill-authoring Task (Open Question 7). A skill's own name is never a reference to itself.

### Data Flow

1. `resolveBundle` collects seed skills exactly as today (domain discovery from agents, then the bundle's explicit `skills:`), plus the `requires_skills` of every steering file in the resolved steering list.
2. A new closure step walks `requires_skills` from each seed skill, reading each `SKILL.md` frontmatter. It keeps the set of skills already visited and stops descending as soon as it reaches one of them, which both deduplicates and breaks cycles. The result goes through the existing `dedupe`.
3. `ResolvedBundle.skills` now holds the closure. `install.js`, `computeBundleSourceHashes` and the snapshot code consume it unchanged, so a skill pulled in only as a dependency is installed, hashed and tracked like any other.
4. Claude: no adapter change (installed skills are reachable through the Skill tool). Kiro: unchanged; attaching required skills is a follow-up Feature.

### Business Rules

- Transitive, not one level. Any chain of `requires_skills` is followed to the end.
- Cycles are allowed and silent. Walk order is depth-first from each seed, and the first repeated skill ends that branch; the resulting set is the same regardless of where a cycle is entered.
- `requires_skills` adds to what is installed; it never changes what an agent lists in `skills` or `preload_skills`. Preloading stays an explicit per-agent choice because it costs context.
- Bundles with explicit `skills:` lists and no `domain` still receive the closure. Listing a skill by hand without its dependencies is the bug this Feature exists to fix, so there is no opt-out.
- A dependency on a skill that does not exist is an error in `resolveBundle` and in `aif validate`. The message names the chain, for example `feature-planning → plan-lifecycle → (missing)`.
- A mention is judged by its class (Reference convention above), not by guesswork about intent: a reference that is not declared is an error, so the author either declares the dependency or marks the mention as ignored.
- Editing a file's `requires_skills`, or a required skill's content, changes the bundle's source hashes, so dependent bundles become stale through the existing freshness detection with no change to the snapshot format.

### Audit result

A repo-wide scan of `skill/<name>` mentions from everything the `engineering` and `generic` bundles install, against what they install. The individual mentions were then read to separate needs from examples and pointers.

| Finding                                                                                                                                      | Detail                                                                                                                                                                                                                                                                                                                                                        |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Not installed by any bundle                                                                                                                  | `plan-lifecycle`, `adr-authoring`. Every other skill on disk is installed.                                                                                                                                                                                                                                                                                    |
| `plan-lifecycle` needed by                                                                                                                   | `steering/engineering/core.md`, `git-workflow-framework.md`, `git-workflow-projects.md`; skills `feature-planning`, `task-orchestration`, `adr-authoring`                                                                                                                                                                                                     |
| `plan-lifecycle` mentioned, not needed                                                                                                       | `agent-authoring` (`SKILL.md:101` and `reference/schema.md:22,24` are YAML syntax examples) — not declared                                                                                                                                                                                                                                                    |
| `adr-authoring` cited by                                                                                                                     | No installed component (only docs and plans mention it); the requirement is that Architect can use it, handled by the Architect `skills:` change                                                                                                                                                                                                              |
| Cited and already installed, but only because an agent lists them (worth declaring so installs stay correct for bundles with explicit lists) | `complexity-tiers`, `feature-planning` (core.md); `pr-stewardship` (git-workflow-core.md); `worktree-management`, `complexity-tiers`, `test-execution` (task-orchestration); `skill-authoring` (agent-authoring); `review-severity` (code-review, ai-component-review); `code-review` ↔ `ai-component-review` (each routes to the other — a real mutual need) |
| Pointers and consumer mentions, to be marked ignored rather than declared                                                                    | `task-orchestration` in `steering/engineering/document-types.md:36`; `feature-planning` in `skills/plan-lifecycle/SKILL.md:65`; `code-review` and `ai-component-review` in `review-severity` (consumer mentions — declare instead if the Task judges it a real coupling)                                                                                      |
| `generic` bundle                                                                                                                             | `steering/generic/gmail-irreversible-action-approval.md` cites `steering-authoring`, which the `generic` bundle does not install on its own (it is present only when `engineering` is also installed)                                                                                                                                                         |

Each remaining mention is resolved by the implementing Task as either a declaration or an ignore marker; a reviewer checks the choices. The goal is zero errors and zero warnings on `main` when the Feature lands.

### Error States

| Scenario                                                                                | Expected Behaviour                                                                                          |
| --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `requires_skills` names a skill with no `skills/<name>/`                                | `resolveBundle` throws naming the chain; `aif validate` reports it with the declaring file                  |
| `requires_skills` forms a cycle (A requires B, B requires A)                            | Not an error: both install once, resolution terminates, no diagnostic                                       |
| `requires_skills` is not a list of strings                                              | `aif validate` schema error on the declaring file; `resolveBundle` throws rather than guessing              |
| Reference-form `skill/x`, `x` does not exist                                            | `aif validate` error with file and line                                                                     |
| Reference-form `skill/x`, `x` exists but is not covered by the file's `requires_skills` | `aif validate` error with file and line; fix by declaring it or adding the ignore marker                    |
| Other mention of `skill/x` (unformatted prose, frontmatter description)                 | `aif validate` warning (does not fail the run)                                                              |
| Mention in a fenced block, a longer inline span, or with the ignore marker              | Ignored                                                                                                     |
| A dependency changes after an install                                                   | The bundle's source hashes differ, so `aif install` and the session-start freshness check treat it as stale |

---

## 6. Architecture Overview

### New Components

| Component             | Type                          | Responsibility                                                                                                                                                                                 |
| --------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Skill closure step    | Function in `lib/resolver.js` | Pure function over a `name → requires_skills[]` map: returns the deduplicated closure using a visited set (cycles end at the first repeat), or a missing-skill error naming the chain. No I/O. |
| Dependency reader     | Function in `lib/resolver.js` | Thin I/O wrapper: reads `requires_skills` from a skill's or steering file's frontmatter and builds the map the closure step consumes.                                                          |
| Mention classifier    | Pure function                 | Given a line of text, returns each `skill/<name>` mention with its class (reference, example, other). Reuses the repo's fenced-line handling. Unit tested without the filesystem.              |
| Dependency validation | Checks in `validate.js`       | Reuses the reader and closure for the existence and coverage checks; applies the classifier over skill and steering files to emit errors and warnings.                                         |

Design follows `steering/engineering/core.md`: "Design for Testability" — the closure and the classifier are pure and unit tested without the filesystem; only the readers touch disk. A shared frontmatter reader is reused or extracted rather than duplicated (`validate.js` currently has its own private `extractFrontmatter`).

### Component Relationships

- `resolveBundle` → dependency reader → closure step → `ResolvedBundle.skills`.
- `install.js` and `snapshot/io.js` consume `ResolvedBundle.skills` and agent `skills` unchanged. The Kiro adapter is not changed in this Feature.
- `validate.js` calls the same reader and closure step, so `validate` and `install` cannot disagree about what a bundle contains.

### Integration Points

- `lib/resolver.js` — `collectSkillsFromAgents`, `parseSkillRef`, `dedupe` (the closure extends this pipeline).
- `lib/snapshot/io.js` — `computeBundleSourceHashes` already hashes every resolved skill; verified, not modified.
- `lib/harnesses/claude.js` — unchanged; preload stays driven by `preload_skills`.
- `lib/commands/validate.js` — schema checks for skills and steering, cross-reference checks, and the citation checker this Feature sits beside (`validateCitations`).
- `lib/component-defs.js` — gains a JSDoc type for the new field.

---

## 7. Security Considerations

- Skill names read from frontmatter are used to build filesystem paths. The reader and resolver must accept only names matching the existing kebab-case rule (no `/`, no `..`), so a crafted `requires_skills` entry cannot resolve outside `skills/`. Addressed in the resolver Task and covered by a test.
- No network, secrets or credential handling is introduced.

---

## 8. Risks & Open Questions

| #   | Risk / Question                                                                                                                                                                                                                                                                                                       | Type     | Impact | Source       | Raised By           | Resolved                                                                                                                                                               |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------ | ------------ | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Kiro attaches only an agent's own `skills`. Should skills required only by steering attach too?                                                                                                                                                                                                                       | Question | M      | Architecture | Engineering Manager | Moved out — Kiro work is deferred (human 2026-10-01); attaching steering-required skills on Kiro is a follow-up Feature, and `lib/harnesses/kiro.js` is unchanged here |
| 2   | `code-review`, `ai-component-review` and `review-severity` reference each other. How are cycles handled?                                                                                                                                                                                                              | Question | M      | Audit        | Engineering Manager | Yes — cycles are allowed; the closure stops at the first skill already visited, so there is no loop and no cycle error                                                 |
| 3   | Field name.                                                                                                                                                                                                                                                                                                           | Question | L      | Request      | Engineering Manager | Yes — `requires_skills`                                                                                                                                                |
| 4   | Severity of the undeclared-reference check, and how false positives are worked around.                                                                                                                                                                                                                                | Question | L      | Request      | Engineering Manager | Yes — a structured reference form that is enforced (error), a defined example form that is ignored, and a warning for any other mention                                |
| 5   | Discovered: `validateBundleSchemas` reads `bundles/*.yaml` files, but bundles are directories, so bundle schema checks never run. Recommendation: fix in a separate follow-up, not silently inside this Feature; include it here only if the human says so.                                                           | Question | L      | Audit        | Engineering Manager | Yes — resolved: fixed on `main` by `2b14d2e` (bundle schemas now validate from `bundles/<name>/bundle.yaml`); no longer a concern of this Feature                      |
| 6   | The mention scan is prose matching and may misclassify. Mitigation: the three-class convention, the ignore marker, fenced-block skipping, and a repo-wide dry run before merge.                                                                                                                                       | Risk     | L      | Design       | Engineering Manager | Yes — mitigated by the convention in Section 5                                                                                                                         |
| 7   | Confirm the concrete syntax: reference = inline code span holding exactly `skill/<name>`; example = fenced block, longer inline span, or `<!-- skill-ref: ignore -->` immediately after the span; README files not scanned; a reference is covered if `<name>` is in the closure of the file's own `requires_skills`. | Question | L      | Design       | Engineering Manager | Yes — syntax confirmed as proposed                                                                                                                                     |

---

## 9. Task Decomposition

Dependency graph: [`tasks.json`](./tasks.json) — not yet produced; decomposition follows approval (`skill/feature-planning`: "Decompose into Tasks").

Summary: {filled after decomposition}. Expected shape, not binding: resolver and closure with unit tests; mention classifier and validator checks; declarations and the Architect change; authoring docs, AGENTS.md and arc42 bumps last.

Landing order (human decision 2026-10-01): after `AIF-008` and `AIF-007` (008, then 007, then 006, then `AIF-005`), because the validator checks the skill and steering files `AIF-008` rewrites (`skill/pr-stewardship`, `git-workflow-core.md`). The zero-errors-and-warnings criterion is evaluated on the tree rebased onto those changes, with snapshots regenerated and versions bumped again where a file changed in both.

Parallelization notes:

- Docs and the arc42 `last_verified` bump depend on the final state of every `key_files` entry they describe, so they run last, and `aif index architecture --check` runs once as the final local step.
- The declaration and ignore-marker edits across skills and steering depend on the validator existing, so the repo can be checked clean.

---

## 10. Acceptance Criteria

- [ ] All Tasks complete and signed off
- [ ] Feature works end-to-end as described in Section 5
- [ ] No HIGH or CRITICAL findings open in any Task review
- [ ] A fresh `engineering` bundle install includes `plan-lifecycle` and `adr-authoring`, and a `generic`-only install includes `steering-authoring`
- [ ] A missing dependency and a non-list `requires_skills` each fail `resolveBundle` and `aif validate`, with a message naming the chain for a missing dependency
- [ ] A `requires_skills` entry that is not a plain kebab-case skill name (`../x`, `a/b`) is rejected by the resolver and by `aif validate`, covered by a test (the path-traversal requirement in Section 7)
- [ ] A cycle (A requires B, B requires A) resolves, terminates, and installs each skill once, with no error or warning
- [ ] Reference-form mentions of a nonexistent or undeclared skill are errors; fenced, longer-span and marked mentions are ignored; other mentions are warnings
- [ ] `aif validate` passes on the repo with no errors and no warnings outstanding
- [ ] Changing a required skill (or a `requires_skills` line) marks dependent bundles stale
- [ ] `npm test` passes (unit, integration, validation) before any push
- [ ] Edited skills, steering and agents carry version bumps as the repo's version-bump check requires
- [ ] `docs/architecture/05_01_bundle_resolution.md` and any other affected arc42 section updated, with `last_verified` set by a final `aif index architecture --check`
