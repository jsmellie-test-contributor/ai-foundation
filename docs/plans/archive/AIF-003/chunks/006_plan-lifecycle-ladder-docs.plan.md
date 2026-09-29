# Chunk Plan: Document the Amendment Ladder, Errata Test, and Two-Commit Gate in `skill/plan-lifecycle`

## 1. Metadata

| Field          | Value                                                                                                                                                                                                                                         |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plan ID        | AIF-003-006                                                                                                                                                                                                                                   |
| Parent Epic    | AIF-003                                                                                                                                                                                                                                       |
| Chunk          | 6 of 8                                                                                                                                                                                                                                        |
| Depends On     | AIF-003-004                                                                                                                                                                                                                                   |
| Can Parallel   | AIF-003-002 (wave 2)                                                                                                                                                                                                                          |
| Project        | ai-foundation                                                                                                                                                                                                                                 |
| Status         | Approved                                                                                                                                                                                                                                      |
| Author (Agent) | AI-Engineer                                                                                                                                                                                                                                   |
| Reviewed By    | Pending                                                                                                                                                                                                                                       |
| Created        | 2026-08-25                                                                                                                                                                                                                                    |
| Last Updated   | 2026-08-25                                                                                                                                                                                                                                    |
| Standards      | `skill/skill-authoring` (existing-skill extension, not a new skill), `skill/plan-lifecycle` (this chunk's own governing gate). AI-track chunk per `AIF-PROC-001`; complexity assessed as Tier 3 per `skill/complexity-tiers` — see Section 3. |

---

## 2. Goal

Document the three-rung amendment ladder that `AIF-META-002` defines — `## Errata` (ungated), `## Amendments` (gated, two-commit), and `Superseded` (existing, repaired elsewhere in this Epic) — inside `skills/plan-lifecycle/SKILL.md` and `skills/plan-lifecycle/reference/commit-gate-procedure.md`. This is the Epic's central documentation chunk: `AIF-003-007` points `skill/decision-record` and `skill/decision-brief` at what this chunk writes, and `AIF-003-008` aligns `agents/architect.yaml` and `agents/engineering-manager.yaml` with it. Nothing about the ladder is duplicated into those files — they link here.

---

## 3. Quick Summary

**Open Items:** 0 open — see Section 14 for accepted risks (none block Approval)

**Tier:** 3, per `skill/complexity-tiers`. Signals present: cross-cutting (two downstream chunks in this Epic depend on the exact anchors this chunk creates), and it introduces a new governed procedure (the amendment gate) into a skill other chunks already treat as the single source of truth for status semantics — exactly the "reshapes how other components work" signal the tiering skill names. Per `skill/chunk-planning`'s AI-Track Chunks section, Tier 3 AI-track work normally produces its plan via `skill/ai-engineering-plan`; this plan instead follows the Chunk Plan template at the Engineering-Manager's explicit direction, to match the detail level of the two already-Approved software-track sibling plans (`AIF-003-001`, `AIF-003-002`) in this Epic. The gate itself is unchanged either way — `Status: Draft` committed first, no implementation before a committed `Approved`.

---

## 4. Acceptance Criteria

- [ ] All components in Section 8 exist as written, in the exact files and under the exact headings specified
- [ ] Security checklist (Section 10) fully satisfied
- [ ] Logging requirements (Section 11) — N/A, recorded per Section 11
- [ ] Cross-reference checklist (Section 12) fully satisfied
- [ ] Documentation checklist (Section 13) fully satisfied
- [ ] Review approved with no CRITICAL or HIGH findings
- [ ] `skills/plan-lifecycle/SKILL.md` gains a `### Decision Record Amendment Ladder` section, positioned after `### Decision Record Tier Variants` and before `## Outputs`
- [ ] `skills/plan-lifecycle/reference/commit-gate-procedure.md` gains a `## Decision Record Amendment Ladder` section, positioned after `## Decision Record Tier Variants` (the file's current final section)
- [ ] The rung-selection table, the errata test (verbatim substance, not reworded), its default-deny tie-breaker, the `Status`/`Tier`/`Domain` exclusion, and the worked-examples table all appear in `commit-gate-procedure.md`
- [ ] The two-commit amendment sequence (propose → human decision → confirm/reject) is documented with its exact commit-message conventions (`Propose amendment: ...`, `Amend decision: ...`, `Reject amendment: ...`)
- [ ] Neither file introduces child-record amendments with their own IDs, inline section-level version stamps, or whole-record versioned reissue (Epic Out of Scope; `AIF-META-002` Options B/C/E)
- [ ] Neither file adds or implies any new gate-checking logic — every gate still checks positively for `Approved` only, exactly as `reference/status-vocabulary.md` (post-`AIF-003-004`) already states
- [ ] `skills/plan-lifecycle/SKILL.md` frontmatter `version` is bumped from `0.1.0` to `0.2.0`
- [ ] No file other than the two named in Section 5 is modified

---

## 5. Scope

### In Scope

- `skills/plan-lifecycle/SKILL.md` — one new section, `### Decision Record Amendment Ladder`, giving the procedural summary an implementing agent needs (what the three rungs are, when each applies, who authors and gates each, and a pointer to `commit-gate-procedure.md` for the exact commit sequence). Mirrors the existing `### Decision Record Tier Variants` section immediately above it in both position and register.
- `skills/plan-lifecycle/reference/commit-gate-procedure.md` — one new section, `## Decision Record Amendment Ladder`, carrying the mechanical detail: the rung table, the errata test with its default-deny property and worked examples, and the two-commit sequence with commit-message conventions. Mirrors the existing `## Decision Record Tier Variants` section immediately above it.
- Bumping `skills/plan-lifecycle/SKILL.md`'s frontmatter `version` (`0.1.0` → `0.2.0`), consistent with how sibling skills in this repo (`skill/decision-record` at `0.3.0`, `skill/chunk-planning` at `0.3.0`, `skill/ai-engineering-plan` at `0.2.0`) have been bumped for prior additive changes. `commit-gate-procedure.md` and `status-vocabulary.md` are `reference/` files without their own frontmatter and are not versioned independently.
- Establishing the stable heading anchors that `AIF-003-007` and `AIF-003-008` will reference (see Section 8 for the exact strings).

### Out of Scope

- **Editing `skills/plan-lifecycle/reference/status-vocabulary.md`.** `AIF-003-004` owns that file and adds the `Amending` status plus its two transitions. This chunk depends on that work existing but does not touch the file — see Prerequisites.
- **Editing `skill/decision-record` or `skill/decision-brief`.** `AIF-003-007` points those skills at this chunk's output; this chunk does not pre-empt that by writing pointer text into the record skills itself.
- **Editing `agents/architect.yaml` or `agents/engineering-manager.yaml`.** `AIF-003-008` owns the agent-prompt alignment, including the "Architect may set `Status: Approved` but must not commit it" carve-out (Epic Question 6). That carve-out is agent-specific and belongs in the agent's own prompt, not restated here — this chunk's documentation states the gate generically (an agent commits the transition after the human decides, per `skill/plan-lifecycle` Step 4, applied unchanged to the amendment gate) and leaves agent-specific exceptions to the agent's own file, exactly as the existing Step 4 language already does for every other artifact type.
- **Editing the record templates (`skills/decision-record/reference/template.md`, `skills/decision-brief/reference/template.md`).** `AIF-003-003` owns the `## Amendments`/`## Errata` section shapes and the `Last Amended`/`Supersedes` Metadata fields as they appear _inside a record_. This chunk documents the _procedure_ those shapes support, not the shapes themselves, and does not reproduce the table column headers as a second source of truth — it references `AIF-META-002` Design → Record-shape changes for readers who need the exact markup.
- **Editing `AIF-META-002` itself.** Explicitly Out of Scope for the whole Epic. This chunk implements the record's currently-committed text (including its Tier A/B section lists) verbatim in substance; it does not correct the two cosmetic defects the record's own errata test would classify as errata (a code-span rendering glitch and an under-inclusive worked-examples row) — those are governed by the ladder this chunk is documenting, not by this chunk itself, and the Epic's Risk 14 was explicitly removed by the human with no chunk required to fix them.
- **Any change to `lib/decisions.js`, `lib/commands/index.js`, or `tests/`.** Software-track, owned by `AIF-003-001`/`AIF-003-002`.
- **The mechanisms `AIF-META-002` ruled out.** Child amendment records with their own IDs (Option B), inline section-level version stamps (Option C), whole-record versioned reissue (Option E). Must not reappear in either file.
- **Retrofitting any example.** No existing Decision Record is cited as a worked "here is a real amended record" example — none exists yet (Epic: no retrofit, and the ladder has not shipped until this Epic completes).

---

## 6. Prerequisites

- [ ] Epic `AIF-003` `Status: Approved` committed (done — commit `8c82f90`)
- [ ] This Chunk Plan `Status: Approved` committed before implementation begins
- [ ] **`AIF-003-004` complete** — `skills/plan-lifecycle/reference/status-vocabulary.md` must already document the `Amending` status and its two transitions (`Approved → Amending`, `Amending → Approved`) before this chunk's text references them as an existing fact rather than a proposal. If `AIF-003-004` has not landed when this chunk is implemented, the AI-Engineer implementing it must verify `status-vocabulary.md` directly before writing prose that assumes its content — do not assume the Epic's summary is still accurate (per this Epic's own precedent in `AIF-003-002`, which made the same check against `AIF-003-001`'s actual landed state rather than its plan).
- [ ] `AIF-META-002`'s Design section (`docs/decisions/meta-process/AIF-META-002_partial-amendment-of-approved-decisions.decision.md`) is the authoritative source text for the ladder table, the errata test, and the two-commit sequence. Read it directly at implementation time in case it has itself been amended between this plan's approval and implementation (self-referential, but real: the record this Epic implements is itself subject to the ladder it describes once the ladder ships — though not before, since the machinery does not exist yet during this Epic).

---

## 7. Architecture & Design

### Project Structure Changes

```
skills/
└── plan-lifecycle/
    ├── SKILL.md                          ← MODIFIED (+1 section, version bump)
    └── reference/
        └── commit-gate-procedure.md      ← MODIFIED (+1 section)
```

No new files, no new folders.

### Key Design Decisions

1. **Decision**: place the new material as a sibling of "Decision Record Tier Variants" in both files, using the same heading depth and immediately following it.
   **Rationale**: Epic Section 6 (Integration Points) names the existing Tier Variants sections as "the structural precedent for Decision-Record-specific content living in a generic skill." Following that precedent exactly — same position, same heading level, same "scoped to Decision Records only" framing — means a reader who already understands how Tier Variants works needs zero new orientation to understand how the Amendment Ladder section works.

2. **Decision**: `SKILL.md` carries the procedural summary; `commit-gate-procedure.md` carries the mechanical detail (rung table, errata test, worked examples, two-commit sequence with commit messages). Neither file repeats the other's content beyond a one-line pointer.
   **Rationale**: this is exactly how the existing Tier Variants split already works — `SKILL.md`'s Tier Variants section describes what differs per Tier in prose; `commit-gate-procedure.md`'s Tier Variants section gives the literal numbered commit sequence. Splitting the Amendment Ladder the same way keeps one place, not two, as the source of truth for the exact wording of the errata test and the commit-message strings that `AIF-003-007`/`008` and any future implementer will quote.

3. **Decision**: the errata test, its default-deny property, the `Status`/`Tier`/`Domain` exclusion, and the worked-examples table are carried into `commit-gate-procedure.md` with the same substance as `AIF-META-002`'s Design section, not merely summarised or linked.
   **Rationale**: Epic Section 7 (Security Considerations) treats this as an explicit acceptance criterion, not polish — "an errata rung documented without its default-deny property is a governance hole." A reader of `plan-lifecycle` must not have to also open the Decision Record to learn the one property that keeps the ungated rung safe.

4. **Decision**: this chunk does not correct the two cosmetic defects present in `AIF-META-002`'s current errata-test text (the `` `Decision, Design` `` code-span rendering issue, and a worked-examples row naming three of the six protected sections) when translating that text into prose here. It states the four Tier A sections (`Options Explored`, `Decision`, `Design`, `Impact on Planning`) and three Tier B sections (`Rationale`, `Decision`, `Impact`) correctly and separately, since prose in a different file is not bound to reproduce a markdown rendering artifact from the source record — but it does not silently "fix" `AIF-META-002` by implication, and it does not touch that record.
   **Rationale**: Epic Risk 14 (now removed by the human, commit `7ee4c4b`) explicitly said no chunk is required to correct the defects in the record itself, and this Epic's Out of Scope list forbids editing `AIF-META-002`. Writing accurate, independently-correct prose in `plan-lifecycle` is not the same act as editing the record — the two documents are allowed to describe the same test without one being a byte-for-byte transcript of the other's broken markdown.

5. **Decision**: attribute the new sections inline with `*(AIF-003-006)*`, matching the existing `*(AIF-002-004)*` citation already present at the start of both files' Tier Variants sections, rather than adding a file-header comment.
   **Rationale**: neither `SKILL.md` (fixed three-field YAML frontmatter per `skill/skill-authoring/reference/schema.md`) nor `reference/*.md` files in this repo carry a file-header "Plan:" comment convention — that pattern exists in `lib/decisions.js` (source code) but not in any skill markdown file. The inline citation is the established in-repo equivalent for markdown skill content and satisfies engineering-core Rule 2 without inventing a new convention this chunk isn't chartered to introduce.

> **Tier C decisions.** All five are Tier C per `skill/decision-triage` — presentation and placement choices inside an already-decided design (`AIF-META-002`), riding this plan's own `skill/plan-lifecycle` cycle. None warrants a standalone record.

### Patterns & Conventions Applied

- **No gate-checking logic changes anywhere.** Both files must continue to state (and must not contradict) that every gate checks positively for `Approved` only — `Amending` is never special-cased. This is restated as an explicit acceptance criterion (Section 4) because it is the single easiest thing for documentation prose to get subtly wrong by implication (e.g. writing "the gate rejects `Amending` records" reads correctly but must not be phrased as new logic).
- **Verbatim-substance carry-across**, per Epic acceptance criterion "the test's tier-specific section lists are carried across exactly as `AIF-META-002` states them" — the four Tier A / three Tier B protected sections are quoted as a set, not paraphrased into a different grouping.

---

## 8. Components

Documentation components — each is a markdown section added at a named, stable heading. `AIF-003-007` and `AIF-003-008` reference these headings directly; the exact strings below are the cross-chunk contract.

### `### Decision Record Amendment Ladder` — `skills/plan-lifecycle/SKILL.md`

**File**: `skills/plan-lifecycle/SKILL.md`
**Anchor (stable, for `AIF-003-007`/`AIF-003-008` to reference)**: `### Decision Record Amendment Ladder`
**Position**: immediately after the existing `### Decision Record Tier Variants` section, immediately before `## Outputs`.
**Purpose**: Tell an agent authoring or amending a Decision Record which rung applies and where to find the exact procedure.

**Content requirements**:

- Opens with `*(AIF-003-006)*` per Design Decision 5.
- One sentence scoping it: applies to Decision Records only, alongside the existing Tier scoping — mirrors how the Tier Variants section opens.
- A short prose statement of the three rungs (errata / amendment / supersede) and the one-line test for choosing between them: "does this provably leave the rendered meaning of a substantive section unchanged?" (errata) vs. "does the original rationale still hold?" (amendment) vs. neither (supersede).
- States plainly: `Amending` is a Decision-Record-only status (per `reference/status-vocabulary.md`, `AIF-003-004`); no gate anywhere special-cases it; every gate continues to check positively for `Approved` only.
- One sentence on who commits the second (confirm/reject) commit: "the agent commits the transition after the human decides, exactly as Step 4 already describes for every other artifact type — any agent-specific exception is documented in that agent's own definition, not here." No naming of Architect or any specific agent (Out of Scope, Section 5).
- Closes with an explicit pointer: "See `reference/commit-gate-procedure.md` → Decision Record Amendment Ladder for the rung-selection table, the errata test, and the exact two-commit sequence." This is the one-line pointer from Design Decision 2 — it must not restate the table or the test.

**Dependencies**:

- `reference/status-vocabulary.md` (`AIF-003-004`'s output) — referenced, not duplicated.
- `reference/commit-gate-procedure.md` (this chunk's other component) — referenced by relative pointer.

### `## Decision Record Amendment Ladder` — `skills/plan-lifecycle/reference/commit-gate-procedure.md`

**File**: `skills/plan-lifecycle/reference/commit-gate-procedure.md`
**Anchor (stable, for `AIF-003-007`/`AIF-003-008` to reference)**: `## Decision Record Amendment Ladder`
**Position**: immediately after the existing `## Decision Record Tier Variants` section (the file's current final section — this becomes the new final section).
**Purpose**: Give the complete, citable mechanical procedure: which rung, what the errata test actually is, and the exact commit sequence with commit-message strings.

**Content requirements, as three sub-sections**:

1. **`### The Ladder`** — reproduces the rung-selection table from `AIF-META-002` Design → The ladder, in the same three-row shape (Change / Path / Author / Gate):

   | Change                                                           | Path                                  | Author       | Gate                                 |
   | ---------------------------------------------------------------- | ------------------------------------- | ------------ | ------------------------------------ |
   | Provably cannot alter the decision                               | `## Errata` entry                     | Anyone       | None                                 |
   | Alters the record, but the original rationale still holds        | `## Amendments` entry + in-place edit | Domain owner | `Amending` + two-commit confirmation |
   | The original rationale no longer holds, or the decision reverses | `Status: Superseded` + new record     | Domain owner | Full Tier A cycle                    |

2. **`### The Errata Test`** — states the test in full: "a change that provably leaves the rendered meaning of a record's substantive sections unchanged — `Options Explored`, `Decision`, `Design`, and `Impact on Planning` at Tier A; `Rationale`, `Decision`, and `Impact` at Tier B." Immediately follows with both required properties, stated as rules (per Epic Section 7, not as guidance):
   - _It is about meaning, not location_ — a typo inside `Decision` is errata; a clarifying rewrite of an option's stated weakness in `Options Explored` (or its Tier B analogue, a rewrite of `Rationale`) is not.
   - _Doubt disqualifies_ — if it is not obvious that a change leaves meaning unchanged, it is not errata. Default-deny.
   - `Status`, `Tier`, and `Domain` changes are never errata; other metadata corrections may be.
   - The worked-examples table, carried across from `AIF-META-002` Design → The errata test, in full (four rows: typos/grammar/formatting; broken or moved link/path fixes; ID renumbering where the referent is identical; metadata corrections other than `Status`/`Tier`/`Domain` — each paired with its "not errata" counterpart).
   - The one-sentence warning that the record itself calls out: a factual correction to an option's strengths/weaknesses is the case most often misfiled as errata, because it undermines the reasoning that rejected an option rather than merely fixing prose.

3. **`### Amendment Gate — Two Commits`** — the mechanical sequence, in the same fenced-block style as the existing numbered sequences in this file (see the file's top-level sequence and the Tier B variant for the established formatting convention):

   ```
   1. Domain owner applies the body edit, adds the inline marker
      (*(amended — see Amendment N)*), appends the Amendments row
      (Outcome: Pending), sets Status: Amending.
                                           → commit ("Propose amendment: ...")
   2. Present to human.
   3a. Human confirms → Outcome: Approved by {name}, update Last Amended,
       Status back to Approved.            → commit ("Amend decision: ...")
   3b. Human rejects  → revert the body edit and inline marker,
       Outcome: Rejected by {name} (the row stays),
       Status back to Approved.            → commit ("Reject amendment: ...")
   ```

   Followed by:
   - One sentence stating errata need no sequence and no status change: edit, append the `## Errata` row, one commit (`Errata: ...`).
   - One sentence stating the body edit lands in the proposal commit, not the approval commit, and why (`Amending` already signals unconfirmed content — carried from `AIF-META-002` Resolved Item 6).
   - A closing note, matching Rule set 2 above (`### The Ladder`... no — matches the existing "Rules" list style at the top of this file): "Every gate checks positively for `Approved` only. `Amending` requires no new gate-checking logic anywhere — see `reference/status-vocabulary.md`."

**Dependencies**:

- `docs/decisions/meta-process/AIF-META-002_partial-amendment-of-approved-decisions.decision.md` — source text for all three sub-sections; read directly at implementation time per Prerequisites.
- `reference/status-vocabulary.md` (`AIF-003-004`) — the `Amending` status and its two transitions are referenced, not redefined.

---

## 9. Data Models

Not applicable — this chunk produces documentation, not a data structure or schema. No entities, fields, or index shapes are introduced or changed by this chunk (those belong to `AIF-003-001`/`002`/`003`).

---

## 10. Security Requirements

> This section must never be empty.

- [ ] **The errata rung's default-deny property must appear as a rule, not as guidance.** Per Epic Section 7: "an errata rung documented without its default-deny property is a governance hole, not a wording nit." Reviewer must confirm the sentence "if it is not obvious that a change leaves meaning unchanged, it is not errata" appears in `commit-gate-procedure.md` verbatim in substance, not paraphrased into something softer (e.g. "consider whether...").
- [ ] **No self-approval path is documented.** Neither file may describe, imply, or leave ambiguous a way for `Status: Approved` to be reached without a preceding explicit human decision. The two-commit sequence's `3a`/`3b` branches both require "Human confirms" / "Human rejects" as the triggering event before any status-returning commit.
- [ ] **Append-only is stated as a property of the Amendments/Errata tables**, not merely implied — carry across "rejected rows stay in the table" from `AIF-META-002`, since Epic Section 7 treats append-only as a security property (audit integrity), not a style choice.
- [ ] **No new authority is granted to any agent by this documentation.** This chunk does not touch `agents/architect.yaml` or `agents/engineering-manager.yaml` (Out of Scope) and must not phrase the generic "agent commits after human decides" sentence in a way that could be read as pre-authorizing a specific agent to commit an `Approved`-status change — see Design Decision 5's scoping and the Section 5 Out of Scope entry on agent files.
- [ ] All external inputs — N/A, no code, no parsing, no runtime input surface in this chunk.
- [ ] No secrets or credentials in source, output, or examples.

---

## 11. Logging Requirements

> This section must never be empty.

Not applicable. This chunk adds no runtime code, no CLI behaviour, and no execution path — it is documentation content only. `lib/decisions.js` and `lib/commands/index.js` are untouched by this chunk (owned by `AIF-003-001`/`002`), so there is no logging surface for this chunk to specify. Recorded here per template requirement rather than left blank.

| Event | Level | What is logged                                     | What is NOT logged |
| ----- | ----- | -------------------------------------------------- | ------------------ |
| N/A   | N/A   | This chunk produces no code and no log statements. | N/A                |

---

## 12. Cross-Reference Checklist

_(Substituted for the template's Section 12 "Testing Plan," which assumes executable test cases. This is a documentation chunk; its validation is cross-reference and content-fidelity checking, run by AI-Engineer as self-validation per `skill/chunk-planning`'s AI-Track Chunks process, and confirmed again by Principal-Engineer review.)_

| Check ID | Description                                                                                                                                                                 | Pass Criteria                                                                                                                                       |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 006-C01  | `### Decision Record Amendment Ladder` exists in `skills/plan-lifecycle/SKILL.md` at the specified position                                                                 | Heading present, positioned between `### Decision Record Tier Variants` and `## Outputs`                                                            |
| 006-C02  | `## Decision Record Amendment Ladder` exists in `skills/plan-lifecycle/reference/commit-gate-procedure.md` at the specified position                                        | Heading present, positioned after `## Decision Record Tier Variants`, is the new final section                                                      |
| 006-C03  | The rung table in `commit-gate-procedure.md` matches `AIF-META-002` Design → The ladder in substance (3 rows, 4 columns each)                                               | Row-by-row comparison against the record's current committed text                                                                                   |
| 006-C04  | The errata test's protected-section lists match `AIF-META-002`'s currently committed text exactly as a set (4 Tier A sections, 3 Tier B sections)                           | Set comparison against the record, independent of the record's own code-span rendering defect (Design Decision 4)                                   |
| 006-C05  | The default-deny sentence and the `Status`/`Tier`/`Domain` exclusion are both present, each as an explicit rule sentence                                                    | Manual read-through against Section 10's security checklist                                                                                         |
| 006-C06  | The worked-examples table carries all four rows from `AIF-META-002`                                                                                                         | Row-by-row comparison                                                                                                                               |
| 006-C07  | The two-commit sequence's three commit-message strings match `AIF-META-002` exactly: `Propose amendment: ...`, `Amend decision: ...`, `Reject amendment: ...`               | String comparison                                                                                                                                   |
| 006-C08  | No mention of child-record IDs, section-level version stamps, or versioned reissue appears anywhere in either file                                                          | Full-text search for the ruled-out mechanisms' characteristic phrases (e.g. "Amends"/"Amended By" as field names, "v2" reissue) returns nothing     |
| 006-C09  | Neither file states or implies new gate-checking logic beyond "check positively for `Approved`"                                                                             | Manual read-through; cross-check against `reference/status-vocabulary.md`'s "Checking whether dependent work may proceed" section for contradiction |
| 006-C10  | Neither file names `Architect`, `Engineering-Manager`, or any other specific agent                                                                                          | Full-text search for agent names returns nothing in the two new sections                                                                            |
| 006-C11  | `skills/plan-lifecycle/SKILL.md` frontmatter `version` reads `0.2.0`                                                                                                        | Direct read of the frontmatter block                                                                                                                |
| 006-C12  | `skills/decision-record/SKILL.md`, `skills/decision-brief/SKILL.md`, `agents/architect.yaml`, `agents/engineering-manager.yaml` are byte-identical to their pre-chunk state | `git diff` shows no changes to any file outside the two named in Section 5                                                                          |
| 006-C13  | `AIF-META-002`'s file is untouched                                                                                                                                          | `git diff` shows no changes to the record                                                                                                           |
| 006-C14  | Prerequisite check: `reference/status-vocabulary.md` documents `Amending` and its two transitions before this chunk's prose is finalized                                    | Direct read of the file at implementation time (Section 6 Prerequisites)                                                                            |

No unit or integration test suite exists for skill markdown content in this repo; `npm test` is unaffected by this chunk and is not expected to change its result count.

---

## 13. Documentation Requirements

- [ ] Both new sections open with `*(AIF-003-006)*`, matching the existing `*(AIF-002-004)*` citation convention (Design Decision 5)
- [ ] `skills/plan-lifecycle/SKILL.md` frontmatter `version` bumped `0.1.0` → `0.2.0`
- [ ] No file header comment added to either file — this repo's skill markdown files carry no such convention (see Design Decision 5); do not introduce one unilaterally
- [ ] README updated if user-facing — not applicable, no README references `plan-lifecycle`'s internal section structure
- [ ] CHANGELOG entry — per this Epic's Section 10 acceptance criteria, satisfied at the Epic level, not per chunk; no standalone CHANGELOG.md exists in this repo today (verified: none found at any path)

---

## 14. Risks & Open Questions

| #   | Risk / Question                                                                                                                                                                                                                                                                                      | Type | Impact | Mitigation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **This chunk depends on `AIF-003-004`, which had not landed as of this plan's drafting** — `reference/status-vocabulary.md` does not yet document `Amending` at the time this plan is written.                                                                                                       | Risk | M      | Not a blocker for planning (the interface is fully specified in `AIF-META-002` Design → Status handling and restated in `chunks.json`'s dependency edge), but is a hard implementation-time check — Prerequisites (Section 6) requires the AI-Engineer implementing this chunk to read the landed `status-vocabulary.md` directly, not assume the plan's description of it is still accurate, mirroring how `AIF-003-002` verified `AIF-003-001`'s actual landed state rather than trusting its own plan's summary. |
| 2   | **Two cosmetic defects exist in `AIF-META-002`'s current errata-test text** (a broken code span, an under-inclusive worked-examples row) that this chunk must not silently propagate as if they were correct, and must not "fix" by editing the record (Out of Scope).                               | Risk | L      | Resolved by Design Decision 4: this chunk writes independently correct prose describing the same test, rather than transcribing the record's markdown byte-for-byte. Cross-reference check 006-C04 verifies the _substance_ (the section sets) matches, not the record's rendering.                                                                                                                                                                                                                                 |
| 3   | **Scope-boundary risk between this chunk and `AIF-003-008`** on the "who commits the confirm/reject commit" sentence — writing it too specifically could pre-empt `AIF-003-008`'s Architect-specific carve-out; writing it too vague could leave `AIF-003-008` without a generic rule to specialize. | Risk | M      | Resolved by Section 5's Out of Scope entry and the exact sentence specified in Section 8's `SKILL.md` component: state the existing Step 4 rule generically, name no agent, and explicitly point future readers to "that agent's own definition" for exceptions. `AIF-003-008`'s implementer should read this exact sentence before drafting the Architect-specific wording, so the two chunks compose without contradiction.                                                                                       |
| 4   | **`AIF-003-007` and `AIF-003-008` are the actual consumers of the anchors this chunk creates**, but neither has been implemented yet, so the anchor strings in Section 8 cannot be validated against real consuming text — only against the Epic's stated dependency graph.                          | Risk | L      | Accepted. The anchor strings are chosen to be stable and mirror an existing, already-proven pattern (Tier Variants), minimizing the chance `AIF-003-007`/`008` need a different anchor than what is specified here. If either downstream chunk's author finds the anchors insufficient, that is a discovery to raise per engineering-core Rule 4, not a silent deviation.                                                                                                                                           |

---

## 15. Work Log

[2026-08-25] [AI-Engineer] [Created] [AIF-003-006] [Chunk Plan drafted from Epic AIF-003 Section 9 (scope summary + `depends_on: ["004"]`) and `AIF-META-002`'s committed Design section, read in full rather than relied on secondhand via the Epic's summary. Verified directly: `skills/plan-lifecycle/SKILL.md`'s existing `### Decision Record Tier Variants` section sits between Step 5 and `## Outputs`; `reference/commit-gate-procedure.md`'s existing `## Decision Record Tier Variants` section is the file's current final section; `reference/status-vocabulary.md` does not yet contain `Amending` (confirms `AIF-003-004` has not landed as of drafting — recorded as Risk 1); no skill markdown file in this repo carries a "Plan:" header comment, so the existing `*(AIF-002-004)*` inline-citation convention was adopted instead of inventing a new one (Design Decision 5); `AIF-META-002`'s errata-test text as currently committed still contains the two cosmetic defects the Epic's removed Risk 14 described, confirmed by direct read of lines 129 and 138-142 of the record. Complexity assessed as Tier 3 per `skill/complexity-tiers` given the cross-chunk anchor contract this chunk establishes for `AIF-003-007`/`008`; this plan was written using the Chunk Plan template rather than the lighter `skill/ai-engineering-plan` schema, per the Engineering-Manager's explicit direction to match the detail level of the Epic's two Approved software-track sibling plans. Scoped the "who commits the confirm/reject commit" sentence generically and explicitly deferred the Architect-specific carve-out to `AIF-003-008`, recorded as Risk 3, to avoid the two chunks disagreeing on that boundary. No open questions were identified that Epic Section 4/5/6/7 or `AIF-META-002` leave genuinely unsettled — 0 open items.]
