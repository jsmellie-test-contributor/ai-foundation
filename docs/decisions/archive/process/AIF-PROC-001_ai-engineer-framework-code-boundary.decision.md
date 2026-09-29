# Decision Record: AI-Engineer / Software-Engineer Boundary for ai-foundation Repo Code

## Metadata

| Field          | Value                                                  |
| -------------- | ------------------------------------------------------ |
| Decision ID    | AIF-PROC-001                                           |
| Project        | ai-foundation                                          |
| Tier           | A                                                      |
| Domain         | process                                                |
| Status         | Superseded                                             |
| Author (Agent) | Architect                                              |
| Approved By    | Jeremy                                                 |
| Created        | 2026-08-13                                             |
| Referenced By  | AIF-PROC-002, AIF-PROC-004, AIF-PROC-005, AIF-PROC-006 |
| References     | —                                                      |
| Tags           | boundary, ownership, application-code                  |

---

> **Archived, `Superseded`** (process-model check 27, 2026-09-25): the ai-engineer /
> software-engineer boundary this record decided no longer exists — both roles
> consolidated into one `software-engineer` agent under `docs/process-model.md`'s Agent
> roster (`agents/ai-engineer.yaml` retired). Kept here as historical record — not
> converted to MADR.

## Problem Statement

`ai-engineer`'s charter is "builds and maintains AI infrastructure — agents, skills, steering, servers, and related tooling," and its prompt states it works in "the ai-foundation framework or project-local AI configuration." Its hard rules also state it must "never modify application/product code. That is Software-Engineer's domain."

The `ai-foundation` repo now contains two distinct kinds of artifact:

- **Declarative AI components**: `agents/`, `skills/`, `steering/`, `standards/`, `servers/`, `bundles/`, `docs/` — YAML/Markdown validated against `AGENTS.md` schemas (checked by `tests/validation/`).
- **Real application code**: `bin/aif.js`, `bin/ai-git.js`, `lib/` (resolver, manifest, harness adapters, project-init, snapshot, CLI command modules) — a genuine Node.js CLI with its own tests (`tests/unit/`, `tests/integration/`), now covered by the recently-added `javascript`/`node` standards.

`ai-engineer`'s "own the whole framework repo" language and its "never touch application code" rule now contradict each other, since `lib/`/`bin/` is application code that happens to implement AI tooling. This needs to be resolved before further CLI work is planned in this repo.

---

## Constraints & Requirements

What was non-negotiable:

- The resolution must not leave `ai-engineer`'s hard rules self-contradictory.
- The resolution must generalize — the same reasoning should apply in any repo that mixes declarative AI config with real application code, not just this one.
- Existing agent tool/skill surfaces should stay coherent with the work the agent actually performs (e.g. an agent should not be doing general JS engineering with only schema-authoring skills available).

What was a preference but not a hard requirement:

- Minimize cross-agent coordination overhead within a single small repo.

---

## Options Explored

### Option A: `ai-engineer` owns the whole framework repo, including `bin/`/`lib/`

**Summary**: Treat "AI infrastructure" broadly enough to include the CLI that installs and manages the framework. One agent for the entire repo.
**Strengths**: Simplest mental model; no handoffs inside a single small repo; `ai-engineer` already has the most context on why the CLI exists.
**Weaknesses**: Directly contradicts `ai-engineer`'s own hard rule against modifying application code. `lib/` is ordinary JS/Node software engineering with nothing AI-specific about it. `ai-engineer`'s tool/skill set (agent/skill/steering authoring)
is irrelevant to writing a manifest resolver or harness adapter. Sets a precedent that "supports AI" is enough to justify `ai-engineer` touching any code, which does not generalize safely to other repos.
**Verdict**: Not chosen — resolves the contradiction by ignoring the existing hard rule rather than fixing the inaccurate scope claim.

### Option B: Split ownership by artifact type

**Summary**: `ai-engineer` owns the declarative layer (`agents/`, `skills/`, `steering/`, `standards/`, `servers/`, `bundles/`, `docs/`, `tests/validation/`).
`software-engineer` — via the normal `tech-lead` → Chunk Plan → `software-engineer` → `principal-engineer` pipeline — owns `bin/`, `lib/`, `tests/unit/`, and `tests/integration/`.
**Strengths**: Matches both agents' charters as already written. Uses the newly-added `javascript`/`node` standards for the code they were added for. Keeps `ai-engineer`'s tool/skill surface coherent. Generalizes cleanly to any repo mixing declarative AI config with real code.
**Weaknesses**: A change spanning both layers (e.g. a new bundle field requiring resolver support) needs coordination across an Epic/Chunk boundary instead of one agent doing it end-to-end. Requires a prompt edit to `ai-engineer.yaml` to remove the now-inaccurate blanket "ai-foundation framework" claim.
**Verdict**: Chosen — see Decision below.

### Option C: `ai-engineer` remains sole implementer, but `bin/`/`lib/` changes are gated behind the standard software-engineering pipeline

**Summary**: Same ownership as Option A, but changes to `bin/`/`lib/` must go through `tech-lead` Chunk Planning and `principal-engineer` review under the `javascript`/`node` standards, instead of `skill/ai-engineering-plan`.
**Strengths**: Adds process rigor to CLI code without introducing a second agent.
**Weaknesses**: Does not resolve the actual contradiction — `ai-engineer`'s hard rule still says it must never touch application code, so this option requires carving a repo-specific exception into that rule. Leaves `ai-engineer` doing general software engineering with a tool/skill set built for schema authoring. Does not generalize to other repos.
**Verdict**: Not chosen — process rigor without fixing the ownership contradiction.

---

## Decision

**Chosen approach**: Option B — split ownership by artifact type.

**Rationale**:
The repo's own file layout already draws this line: `tests/validation/` (schema compliance checks) versus `tests/unit/` + `tests/integration/` (code behaviour tests) is exactly the declarative/code split. `ai-engineer`'s existing hard rule ("never modify application/product code") is correct as written — the only thing wrong is the prompt sentence claiming blanket ownership of "the ai-foundation framework," which predates `lib/`/`bin/` existing as real code. Fixing that sentence, rather than carving an exception into the hard rule, keeps the boundary consistent across every repo `ai-engineer` might work in, not just this one.

**Trade-offs accepted**:

- Cross-cutting changes (declarative schema change + resolver code change) require two agents and a coordinated Epic/Chunk breakdown instead of one agent handling it end-to-end. Accepted because it mirrors how any other repo with mixed declarative/code concerns would be planned, and keeps each agent's scope legible.

---

## Design

### Boundary definition

| Path                                                                                          | Owner               | Pipeline                                                                                                                          |
| --------------------------------------------------------------------------------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `agents/`, `skills/`, `steering/`, `standards/`, `servers/`, `bundles/`, `docs/`, `projects/` | `ai-engineer`       | `skill/complexity-tiers` → `skill/ai-engineering-plan` (Tier 3)                                                                   |
| `tests/validation/`                                                                           | `ai-engineer`       | Same as above (schema/cross-reference checks are AI-domain knowledge)                                                             |
| `bin/`, `lib/`, `tests/unit/`, `tests/integration/`                                           | `software-engineer` | `tech-lead` Epic/Chunk Plan → `software-engineer` implementation → `principal-engineer` review, per `javascript`/`node` standards |

### Required follow-up changes

1. `ai-engineer.yaml`: remove/narrow the prompt sentence "You work in any repo where AI components live — the ai-foundation framework or project-local AI configuration" to scope it to declarative components only. Minor version bump.
2. No change needed to `software-engineer.yaml` — its existing charter already covers this work; it simply needs to be invoked for `ai-foundation` repo code changes going forward, planned through `tech-lead` like any other repo.
3. Any open or future work touching `bin/`/`lib/` (e.g. CLI features, harness adapters, resolver changes) should be planned as a normal Epic/Chunk Plan, not authored ad-hoc by `ai-engineer`.

---

## Impact on Planning

- Future Epics touching `bin/`/`lib/` route through `tech-lead` → `software-engineer` instead of `ai-engineer`.
- `ai-engineer.yaml` requires a follow-up edit (tracked separately) to correct its scope claim; until that edit lands, this Decision Record is the authoritative statement of the boundary.
- No changes required to existing declarative-component workflows.

---

## Resolved Items

| #   | Item                                                                                       | Resolution                                                                                                                  |
| --- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| 1   | Does `ai-engineer` maintain the `ai-foundation` framework's own CLI code (`bin/`, `lib/`)? | No. That is `software-engineer`'s domain, planned via the normal `tech-lead` pipeline, per Option B above.                  |
| 2   | Does `ai-engineer` still own declarative AI components within `ai-foundation`?             | Yes, unchanged — `agents/`, `skills/`, `steering/`, `standards/`, `servers/`, `bundles/`, `docs/`, and `tests/validation/`. |
