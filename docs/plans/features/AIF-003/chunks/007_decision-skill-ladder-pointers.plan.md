# Chunk Plan: Point `skill/decision-record` and `skill/decision-brief` at the Ladder

## 1. Metadata

| Field          | Value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plan ID        | AIF-003-007                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Parent Epic    | AIF-003                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Chunk          | 7 of 8                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Depends On     | AIF-003-003, AIF-003-006                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Can Parallel   | AIF-003-008 (wave 3)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Project        | ai-foundation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Status         | Approved                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Author (Agent) | AI-Engineer                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Reviewed By    | Pending                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Created        | 2026-08-25                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Last Updated   | 2026-08-25 (rev 2 — anchors aligned to AIF-003-006's committed plan; see Section 15)                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Standards      | None apply (no `standards/{stack}.md` covers declarative skill documentation). Governed instead by `skill/skill-authoring`'s five-section schema and `AIF-PROC-001`'s AI-Engineer ownership of `skills/`. AI-track chunk per `chunks.json`; this plan is produced under `skill/chunk-planning`'s "AI-Track Chunks" process, using the software-track template's structure at the launching agent's explicit request for consistency with sibling chunks AIF-003-001/002, not because this chunk crossed into Tier 3. |

---

## 2. Goal

Add a pointer from `skills/decision-record/SKILL.md` and `skills/decision-brief/SKILL.md` to the amendment-ladder documentation that AIF-003-006 adds to `skill/plan-lifecycle` (rung selection, the errata test, and the two-commit amendment gate), so an author of an `Approved` Decision Record or Brief knows where to go for a post-approval change without that content being restated or duplicated in either record skill.

---

## 3. Quick Summary

**Open Items:** 0 open — see Section 14

AIF-003-006's Chunk Plan is now committed (`Status: Draft` as of this revision) and its Section 8 fixes the exact headings this chunk points at: `### Decision Record Amendment Ladder` in `skills/plan-lifecycle/SKILL.md`, and `## Decision Record Amendment Ladder` (with sub-anchors `### The Ladder`, `### The Errata Test`, `### Amendment Gate — Two Commits`) in `skills/plan-lifecycle/reference/commit-gate-procedure.md`. This revision replaces the prior draft's deliberately generic, anchor-free file-level reference (see Section 15 Work Log) with precise pointers to those headings. AIF-003-003 is still pending at the time of this revision, so the four field/section names this plan asserts (`Supersedes`, `Last Amended`, `## Amendments`, `## Errata`) remain sourced from Epic Section 4/6 rather than from that chunk's own landed output — unchanged from the prior draft, and still gated at implementation time per Section 6 Prerequisites.

---

## 4. Acceptance Criteria

- [ ] All components in Section 8 exist and read cleanly (both files still valid per `skill/skill-authoring`'s checklist)
- [ ] All checks in Section 12 pass
- [ ] Security checklist (Section 10) fully satisfied
- [ ] Logging checklist (Section 11) fully satisfied — N/A, confirmed not silently skipped
- [ ] Documentation checklist (Section 13) fully satisfied
- [ ] Review approved with no CRITICAL or HIGH findings
- [ ] `skills/decision-record/SKILL.md` points to the exact AIF-003-006 anchors (Section 8) for rung selection, the errata test, and the two-commit amendment gate — none of that content is copied into the file
- [ ] `skills/decision-brief/SKILL.md` carries the equivalent pointer, worded for Tier B's abbreviated-gate context
- [ ] Neither file's `Steps` or `Outputs` section gains a new procedural step that duplicates `skill/plan-lifecycle` content; the addition lives in `Edge Cases` (see Section 7)
- [ ] Neither file's front-matter `version` regresses; each is bumped per Section 7 Key Design Decision 3
- [ ] No edits made to `skills/decision-record/reference/template.md` or `skills/decision-brief/reference/template.md` — those belong to AIF-003-003
- [ ] No edits made to `skill/decision-triage` or its routing (Epic Out of Scope)
- [ ] No edits made to `skill/plan-lifecycle` or any of its `reference/` files — those belong to AIF-003-006
- [ ] Every anchor named in the pointer text resolves to a real heading at implementation time (verified against AIF-003-006's actually landed files, not just its plan — see Section 6 Prerequisites)
- [ ] `npm test` passes with no changes to any test unrelated to this chunk

---

## 5. Scope

### In Scope

- One new `Edge Cases` entry in `skills/decision-record/SKILL.md` naming the three rungs (errata / amendment / supersede) and pointing to the specific AIF-003-006 headings (Section 8) for rung selection, the errata test, and the two-commit amendment gate.
- One new `Edge Cases` entry in `skills/decision-brief/SKILL.md`, equivalent in substance, worded for Tier B's already-abbreviated initial-approval gate so a reader does not confuse the _initial_ Draft→Approved cycle (unchanged, still in this skill) with the _post-approval_ ladder (documented elsewhere).
- A one-line mention in each file of the Metadata fields/sections the ladder writes into (`Supersedes`, `Last Amended`, `## Amendments`, `## Errata`), by name only, referencing `reference/template.md` for their shape — not restating the shape.
- A patch version bump in each file's front-matter, reflecting the additive, non-breaking documentation change.

### Out of Scope

- **The templates themselves** (`skills/decision-record/reference/template.md`, `skills/decision-brief/reference/template.md`) — owned by AIF-003-003. This chunk only references what that chunk adds; it does not add the fields/sections itself.
- **The ladder documentation itself** — the rung-selection table, the errata test (including its default-deny property and worked examples), and the two-commit gate procedure live in `skill/plan-lifecycle`'s `SKILL.md` and `reference/commit-gate-procedure.md`, owned by AIF-003-006. This chunk must not copy any of that content — Epic Section 6 and Acceptance Criterion "not duplicated into the two record skills, which link to it" are explicit on this point.
- **`skill/decision-triage` routing** — Epic Out of Scope, restated here because it is the routing skill most likely to be mistaken for the right place to mention rung selection. It gains no new routing responsibility in this Epic.
- **`agents/architect.yaml`, `agents/engineering-manager.yaml`** — owned by AIF-003-008, which runs in the same wave.
- **`status-vocabulary.md`'s `Amending` status** — already added by AIF-003-004; this chunk references its existence (via the pointer to `skill/plan-lifecycle`) but does not modify it.
- **Choosing a different anchor than AIF-003-006's committed one, or inventing a new one** — see Section 7, Key Design Decision 2 (revised). If AIF-003-006's landed headings differ from what its own committed plan states, this chunk's implementer stops and raises it (Epic engineering-core Rule 4), it does not silently pick a substitute.

---

## 6. Prerequisites

- [ ] Epic `AIF-003` `Status: Approved` committed (done — commit `8c82f90`)
- [ ] This Chunk Plan `Status: Approved` committed before implementation begins
- [ ] **AIF-003-003 complete** — this chunk names `Supersedes`, `Last Amended`, `## Amendments`, `## Errata` as fields/sections that exist in both templates. These names are fixed by Epic Section 4 regardless of AIF-003-003's exact commit state, but the pointer text should not go live claiming the fields exist in the templates until AIF-003-003 has actually landed them.
- [ ] **AIF-003-006 complete** — this chunk's pointer text depends on `skill/plan-lifecycle` actually documenting the ladder, the errata test, and the two-commit gate, under the exact headings named in Section 8, by the time this chunk's pointer is written. AIF-003-006's Chunk Plan is committed and its Section 8 fixes those headings as a cross-chunk contract, but the implementer must still confirm at implementation time that the _landed_ files match — the plan is not a substitute for reading the actual committed `SKILL.md`/`commit-gate-procedure.md` content (same discipline AIF-003-006 itself applied to AIF-003-004, and AIF-003-002 applied to AIF-003-001).

---

## 7. Architecture & Design

### Project Structure Changes

```
skills/
├── decision-record/
│   └── SKILL.md                    ← MODIFIED (new Edge Cases entry, version bump)
└── decision-brief/
    └── SKILL.md                    ← MODIFIED (new Edge Cases entry, version bump)
```

No new files. No changes to either skill's `reference/` directory.

### Key Design Decisions

1. **Decision**: the pointer lives in each file's `Edge Cases` section, not as a new `Steps` entry or a new top-level section.
   **Why:** `skill/skill-authoring` requires exactly five body sections in a fixed order (Purpose, Inputs, Steps, Outputs, Edge Cases); adding a sixth section would violate that schema. `Steps` in both skills describes the sequence for authoring a _new_ Draft record — a post-approval change to an _existing_ `Approved` record is precisely the kind of "unusual situation relative to the skill's main purpose" `Edge Cases` exists for, so it is the correct home without deviating from the schema.

2. **Decision (revised)**: the pointer names AIF-003-006's exact committed headings, rather than the prior draft's generic anchor-free file reference.
   **Why:** the prior draft (see Section 15 Work Log, original entry) deliberately avoided naming a heading because AIF-003-006 had not yet been planned and no anchor existed to name. AIF-003-006's Chunk Plan is now committed and its Section 8 fixes the anchors as an explicit cross-chunk contract for this chunk and AIF-003-008 to reference. Continuing to use a file-level-only reference once a precise anchor is available and stable would be less useful to a reader with no offsetting benefit — the existing `skill/plan-lifecycle` cross-reference convention used elsewhere in both files (Step 5 of `decision-record/SKILL.md`, Step 3 of `decision-brief/SKILL.md`) predates this Epic and was never anchor-specific because nothing anchor-specific existed yet to point at; it is not a rule that pointers must stay file-level. The exact anchors now named are:
   - `skills/plan-lifecycle/SKILL.md` → `### Decision Record Amendment Ladder` (positioned after `### Decision Record Tier Variants`, before `## Outputs`) — for the procedural summary (which rung, who authors/gates it, who commits the second commit).
   - `skills/plan-lifecycle/reference/commit-gate-procedure.md` → `## Decision Record Amendment Ladder` (positioned after `## Decision Record Tier Variants`, the file's new final section), with three sub-anchors: `### The Ladder` (the rung-selection table), `### The Errata Test` (the test, its default-deny property, the `Status`/`Tier`/`Domain` exclusion, and the worked-examples table), and `### Amendment Gate — Two Commits` (the exact commit sequence and commit-message strings).

   `skills/decision-record/SKILL.md`'s pointer names `### The Errata Test` specifically, in addition to the parent section, because Tier A authors are the population most likely to face a live "is this errata or not" judgment call given the record's higher section count — sending them straight to the sub-anchor that answers that question is more useful than only naming the parent. `skills/decision-brief/SKILL.md`'s pointer names the parent `## Decision Record Amendment Ladder` section (covering all three sub-anchors) without singling one out, since a Tier B brief's smaller three-section protected set makes the full ladder (not just the errata test) the more relevant single stop for a reader who has less established context than a Tier A author already has from this skill's own Step 1 domain-guidance step.

3. **Decision**: bump `version` in both files' front-matter (`decision-record`: `0.3.0` → `0.3.1`; `decision-brief`: `0.1.0` → `0.1.1`).
   **Why:** the change is additive and non-breaking (new Edge Cases content, no change to Inputs/Steps/Outputs contracts), so a patch bump is correct per semver and per `skill/skill-authoring`'s "`version` is valid semver" checklist item. Note this repo does not treat every doc addition as requiring a bump (e.g. commit `6cb81de` added a `plan-lifecycle` section without bumping its version) — bumping here is a Tier C style choice, not a hard rule, and is flagged as such rather than assumed to be mandatory.

> **Tier C decisions.** All three are Tier C per `skill/decision-triage` — local documentation-authoring choices inside an already-decided design (Epic Section 6 already settled _that_ the two skills point at `plan-lifecycle` rather than duplicate it; this plan only settles _where in the file_ and _how precisely_, including — as of this revision — exactly which heading). None warrants a standalone record.

### Patterns & Conventions Applied

- **Pointer, not copy** (Epic Section 6, Section 9 Acceptance Criteria) — the defining constraint of this chunk.
- **Anchor-precise cross-reference**, now that AIF-003-006 has committed stable headings (see Key Design Decision 2, revised).
- **Five-section skill schema** (`skill/skill-authoring` Step 3) — preserved, not extended.

---

## 8. Components

### `skills/decision-record/SKILL.md` — Edge Cases addition

**File**: `skills/decision-record/SKILL.md`
**Purpose**: Let an author who already has an `Approved` Tier A record find the post-approval ladder without this skill restating it.

**Content to add** (new bullet, appended to the existing `## Edge Cases` list):

```
- **Record needs a change after `Approved`** — do not re-run this skill's Steps
  1-5 or treat `Approved` as immutable. Select a rung from the amendment
  ladder — errata, amendment, or supersede — documented in `skill/plan-lifecycle`
  § Decision Record Amendment Ladder (`SKILL.md`, for which rung applies and
  who authors/gates it) and `reference/commit-gate-procedure.md` §
  Decision Record Amendment Ladder → The Ladder / The Errata Test /
  Amendment Gate — Two Commits (for the rung table, the exact errata test,
  and the two-commit sequence — none of it restated here). The rungs write
  into this record's own `Supersedes`, `Last Amended`, `## Amendments`, and
  `## Errata` Metadata fields/sections — see `reference/template.md` for
  their shape.
```

**Key Behaviour**:

- Names the specific headings fixed by AIF-003-006 (`### Decision Record Amendment Ladder` in `SKILL.md`; `## Decision Record Amendment Ladder` and its `### The Errata Test` sub-anchor in `commit-gate-procedure.md`) rather than a generic file-level reference (Section 7, Key Design Decision 2, revised).
- Does not restate the errata test, the rung-selection table, or the two-commit gate's commit sequence — names the three rungs only, by label.
- Names the four fields/sections `Supersedes`, `Last Amended`, `## Amendments`, `## Errata` exactly as fixed by Epic Section 4, so a reader who goes to `reference/template.md` (AIF-003-003's output) finds a match.

**Dependencies**:

- `skill/plan-lifecycle` (AIF-003-006) — must document the ladder, errata test, and gate under the named headings for this pointer to resolve to real content.
- `skills/decision-record/reference/template.md` (AIF-003-003) — must carry the four named fields/sections.

### `skills/decision-brief/SKILL.md` — Edge Cases addition

**File**: `skills/decision-brief/SKILL.md`
**Purpose**: Same as above, for Tier B, worded so it is not confused with the brief's own already-abbreviated _initial_ approval gate (Step 3).

**Content to add** (new bullet, appended to the existing `## Edge Cases` list):

```
- **Brief needs a change after `Approved`** — this is separate from Step 3's
  abbreviated *initial* approval gate, which only covers Draft → Approved.
  Once `Approved`, select a rung from the amendment ladder — errata,
  amendment, or supersede — documented in `skill/plan-lifecycle` §
  Decision Record Amendment Ladder (`SKILL.md`, plus the full mechanical
  procedure — the rung table, the errata test, and the two-commit sequence —
  in `reference/commit-gate-procedure.md` § Decision Record Amendment
  Ladder). None of that content is restated here. The rungs write into this
  brief's own `Supersedes`, `Last Amended`, `## Amendments`, and `## Errata`
  Metadata fields/sections — see `reference/template.md` for their shape.
```

**Key Behaviour**:

- Explicitly distinguishes this from Step 3's gate, since both are about "Approved" and a reader skimming could otherwise conflate the two.
- Points at the parent `## Decision Record Amendment Ladder` section rather than a single sub-anchor (Section 7, Key Design Decision 2, revised) — a Tier B reader needs the full procedure, not just the errata test.
- Same non-duplication and field-naming constraints as the `decision-record` entry above.

**Dependencies**: same two as above, against `decision-brief`'s own template/plan-lifecycle copies.

---

## 9. Data Models

Not applicable. This chunk changes documentation prose only; it introduces no new data shape, schema, or field. (The four fields/sections it _names_ — `Supersedes`, `Last Amended`, `## Amendments`, `## Errata` — are defined and owned by AIF-003-003's template changes, not by this chunk.)

---

## 10. Security Requirements

> This section must never be empty.

- [ ] All external inputs validated before use — N/A, no input processing; this chunk edits static markdown prose only.
- [ ] No secrets or credentials in source code or logs — N/A, no secrets involved.
- [ ] Errors exposed to users contain no internal system details — N/A, no runtime error paths introduced.
- [ ] **No self-approval implication.** The added text must not state or imply that any agent may move a record to `Approved` (initial or post-amendment) without a preceding explicit human decision. It must not soften or restate `skill/plan-lifecycle`'s gate language in a way that could be read as a shortcut — it points at the gate, it does not describe or paraphrase it (Epic Section 7).
- [ ] **No widening of authorship.** The pointer text must not state or imply that errata's "anyone may author" rule extends to amendments or supersedes — Epic Section 5 Business Rules reserves those to the domain owner. If the added text needs to mention authorship at all, it must not contradict that rule; the safer choice is to name the rungs without restating who may use each one, deferring entirely to `skill/plan-lifecycle`.

---

## 11. Logging Requirements

> This section must never be empty.

Not applicable — this chunk touches only static skill documentation (`SKILL.md` prose and front-matter). There is no runtime code path, no CLI output, and no log statement anywhere in scope.

| Event | Level | What is logged                                                                                                                                                        | What is NOT logged |
| ----- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| N/A   | N/A   | This chunk has no executable component. Table included to satisfy the template's "never empty" requirement, not because a logging decision was made and then omitted. | N/A                |

---

## 12. Testing Plan

No automated test suite in this repo currently validates `SKILL.md` prose content (`tests/validation/schemas.test.js` covers `agents/` and `servers/` front-matter/schema only, not `skills/`). Verification here is self-validation per the AI-track process (`skill/chunk-planning` "AI-Track Chunks"), performed against explicit, checkable criteria rather than left informal.

| Check ID | Description                                                                                                                 | Type                                                                      | Pass Criteria                                                                                                                                                                                                                                                                                                                   |
| -------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 007-C01  | `skills/decision-record/SKILL.md` retains all five required sections (Purpose, Inputs, Steps, Outputs, Edge Cases) in order | Manual (`skill/skill-authoring` checklist)                                | All five present, in order, none removed or renamed                                                                                                                                                                                                                                                                             |
| 007-C02  | `skills/decision-brief/SKILL.md` retains all five required sections in order                                                | Manual                                                                    | Same as 007-C01                                                                                                                                                                                                                                                                                                                 |
| 007-C03  | Front-matter `version` in both files is valid semver and strictly greater than the pre-chunk value                          | Manual (grep + eyeball)                                                   | `decision-record`: `0.3.1`; `decision-brief`: `0.1.1`                                                                                                                                                                                                                                                                           |
| 007-C04  | No rung-selection table, errata-test wording, or two-commit gate step sequence appears verbatim in either edited file       | Manual (diff review against `skill/plan-lifecycle`'s AIF-003-006 content) | Zero matches beyond the rung _names_ (errata/amendment/supersede) and the four field/section _names_                                                                                                                                                                                                                            |
| 007-C05  | Every heading named in the new pointer text exists at the referenced path in `skill/plan-lifecycle`                         | Manual (`Read`, confirm exact heading string)                             | `### Decision Record Amendment Ladder` in `SKILL.md`; `## Decision Record Amendment Ladder`, `### The Ladder`, `### The Errata Test`, `### Amendment Gate — Two Commits` in `reference/commit-gate-procedure.md`; plus `skills/decision-record/reference/template.md` and `skills/decision-brief/reference/template.md` resolve |
| 007-C06  | No file outside this chunk's ownership was touched                                                                          | Manual (`git status`/`git diff --stat`)                                   | Only the two `SKILL.md` files appear in the diff                                                                                                                                                                                                                                                                                |
| 007-C07  | Full suite regression                                                                                                       | Automated                                                                 | `npm test` passes, no unrelated test changes                                                                                                                                                                                                                                                                                    |

---

## 13. Documentation Requirements

- [ ] Inline documentation on all public members — N/A, no code.
- [ ] File headers on all new source files — N/A, no new files; neither `SKILL.md` carries a "Plan:" header convention today (that convention is used in `lib/` source files, not skills), so none is added here, consistent with existing skill files in this repo.
- [ ] README updated if user-facing — not applicable.
- [ ] CHANGELOG entry written.

---

## 14. Risks & Open Questions

| #   | Risk / Question                                                                                                                                                                                                                                                                                                                              | Type | Impact | Mitigation                                                                                                                                                                                                                                                                                                                                                                                                                       |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **This chunk's pointer text now names specific headings inside `skill/plan-lifecycle`, sourced from AIF-003-006's committed Chunk Plan rather than its landed files.** If AIF-003-006's implementation ends up using different heading text than its own plan specifies (e.g. due to a review finding), this chunk's anchors would be stale. | Risk | M      | Do not implement this chunk until AIF-003-006's `Status: Approved` is committed _and_ its actual landed `SKILL.md`/`commit-gate-procedure.md` content is read directly at implementation time (Section 6 Prerequisites) — the plan's stated anchors are the expected contract, not a substitute for verifying the real file. If the landed headings differ, raise it per engineering-core Rule 4 rather than silently adjusting. |
| 2   | **Field/section names (`Supersedes`, `Last Amended`, `## Amendments`, `## Errata`) are asserted before AIF-003-003 necessarily exists.** Same class of risk as #1, but lower — these four names are fixed verbatim in Epic Section 4/6, not left to AIF-003-003's discretion.                                                                | Risk | L      | Prerequisite gate in Section 6; implementer confirms the four names against the landed `reference/template.md` files before writing the pointer text, but no material change is expected.                                                                                                                                                                                                                                        |
| 3   | **No automated test covers `SKILL.md` prose**, so duplication (copying ladder content instead of pointing to it) would not be caught by `npm test`.                                                                                                                                                                                          | Risk | M      | Check 007-C04 is a mandatory manual diff review, not optional; Principal-Engineer review is the second line of defence per Epic Acceptance Criteria ("not duplicated into the two record skills, which link to it").                                                                                                                                                                                                             |
| 4   | **Version-bump convention is not formally documented** (Section 7, Key Design Decision 3, notes an existing counter-example where a doc addition did not bump `version`).                                                                                                                                                                    | Risk | L      | Accepted as a Tier C style choice for this chunk; bump anyway since it is harmless and arguably more correct, but do not treat its absence elsewhere in the repo as a defect to fix in this chunk.                                                                                                                                                                                                                               |

---

## 15. Work Log

[2026-08-25] [AI-Engineer] [Created] [AIF-003-007] [Chunk Plan drafted from Epic AIF-003 Section 9 (`chunks.json` scope: "Point skill/decision-record and skill/decision-brief at the ladder", `depends_on: ["003", "006"]`). Written at the launching agent's explicit request to match sibling Chunk Plans AIF-003-001/002's structure and level of detail, using `skill/chunk-planning`'s software-track template even though this is an AI-track chunk per `chunks.json` — `skill/chunk-planning`'s "AI-Track Chunks" section would otherwise only require a written plan at Tier 3, and this chunk self-assesses as Tier 2 (multi-file, low-risk, following an established pattern — the file-level `skill/plan-lifecycle` cross-reference already used in both target files). Verified against current source rather than assuming: read both target `SKILL.md` files and confirmed neither yet contains any ladder-related content, confirmed `skill/plan-lifecycle`'s current `SKILL.md`/`commit-gate-procedure.md` do not yet document the ladder (AIF-003-006 is still pending), confirmed neither template currently defines `Supersedes`/`Last Amended`/`## Amendments`/`## Errata` (AIF-003-003 still pending), and confirmed `skill/skill-authoring` fixes the five-section schema, which is why the addition targets `Edge Cases` rather than a new top-level section. Confirmed no automated test exercises `SKILL.md` content, so Section 12 is manual-check-based rather than `npm test`-based beyond the full-suite regression. Did not invent a heading anchor inside `skill/plan-lifecycle` for AIF-003-006 to guarantee — used the file's own existing anchor-free cross-reference convention instead (Section 7, Key Design Decision 2) and recorded it as a non-blocking coordination note rather than an Open Question, since it does not require an answer before this plan can be approved.]

[2026-08-25] [AI-Engineer] [Revised] [AIF-003-007] [Rev 2. AIF-003-006's Chunk Plan is now committed to main (`Status: Draft`), and its Section 8 fixes the amendment-ladder anchors as a cross-chunk contract: `### Decision Record Amendment Ladder` in `skills/plan-lifecycle/SKILL.md` (after `### Decision Record Tier Variants`, before `## Outputs`), and `## Decision Record Amendment Ladder` in `skills/plan-lifecycle/reference/commit-gate-procedure.md` (after `## Decision Record Tier Variants`, the file's new final section) with sub-anchors `### The Ladder`, `### The Errata Test`, `### Amendment Gate — Two Commits`. Revised Section 7 Key Design Decision 2, Section 8's two pointer texts, Section 12 check 007-C05, Section 14 Risk 1, and this Quick Summary to name those exact headings instead of the prior draft's deliberately generic file-level reference — the prior draft avoided naming an anchor specifically because no anchor existed yet at drafting time (see the original entry above), not because file-level references were judged preferable in general. Chose to send `skills/decision-record/SKILL.md`'s pointer at the `### The Errata Test` sub-anchor specifically (in addition to the parent section), since Tier A authors are the population most likely to face a live errata-or-not judgment call; left `skills/decision-brief/SKILL.md`'s pointer at the parent section, since a Tier B reader needs the whole procedure rather than one sub-anchor. AIF-003-003 remains pending as of this revision — the four field/section names asserted in Section 8 are unchanged from the prior draft and remain sourced from Epic Section 4/6, not from AIF-003-003's own landed output; Section 6 Prerequisites and Section 14 Risk 2 are unchanged on this point. No other Section (Goal, Acceptance Criteria substance, Scope boundaries beyond the anchor wording, Prerequisites' dependency structure, Security, Logging, Documentation) required a change — this is a precision refinement of the pointer text, not a scope change. Did not implement anything and did not run any git command, per this task's explicit constraints; the Engineering-Manager will commit this revision.]
