# Chunk Plan: skill/plan-lifecycle — Document Tier B Abbreviated Gate and Tier C Non-Gate

## 1. Metadata

| Field          | Value                                                                                                                                                          |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plan ID        | AIF-002-004                                                                                                                                                    |
| Parent Epic    | AIF-002                                                                                                                                                        |
| Chunk          | 004 of 15                                                                                                                                                      |
| Depends On     | None                                                                                                                                                           |
| Can Parallel   | 001, 002, 003, 005, 006, 007, 008, 009 (all other Wave 1 chunks)                                                                                               |
| Project        | ai-foundation                                                                                                                                                  |
| Status         | Approved                                                                                                                                                       |
| Author (Agent) | AI-Engineer                                                                                                                                                    |
| Reviewed By    | Jeremy                                                                                                                                                         |
| Created        | 2026-08-14                                                                                                                                                     |
| Last Updated   | 2026-08-14                                                                                                                                                     |
| Standards      | ai-foundation declarative-component schemas (AGENTS.md) — no code standards apply; this chunk's deliverables are`skills/plan-lifecycle/` markdown content only |

---

## 2. Goal

Extend `skills/plan-lifecycle/` to document two decision-record-specific gate variants introduced by AIF-META-001's Tier model — the Tier B abbreviated gate (Draft → one human confirmation → Approved, no expected multi-round revision cycle) and the Tier C non-gate (no standalone artifact, no `plan-lifecycle` cycle at all; the decision rides its parent plan's own gate) — and reference the `{paths.decisions}/index.json` update requirement for Tier A/B, without altering `plan-lifecycle`'s core Draft → Approved mechanics.

---

## 3. Quick Summary

**Open Items:** 2 open (0 High / 0 Medium / 2 Low) — see Section 14

---

## 4. Acceptance Criteria

- [ ] `skills/plan-lifecycle/SKILL.md` documents the Tier B abbreviated gate (Draft → one human confirmation → Approved, no expected multi-round revision cycle) and the Tier C non-gate (no standalone artifact, rides the parent plan's own gate)
- [ ] `skills/plan-lifecycle/reference/commit-gate-procedure.md` documents the Tier A/B/C sequence variants, including the `{paths.decisions}/index.json` update requirement for Tier A/B (referenced, not duplicated/owned)
- [ ] `skills/plan-lifecycle/reference/status-vocabulary.md` clarifies that no new `Status` values are introduced by Tier B/C
- [ ] No wording change to `plan-lifecycle`'s existing core Draft → Approved mechanics (Steps 1-5, the existing sequence diagram, the existing status table/transitions) — verified via diff review (Test 004-T01, 004-T04)
- [ ] All new content cross-references AIF-META-001 as the source of the Tier definitions rather than re-deriving them
- [ ] Security checklist (Section 10) fully satisfied
- [ ] Logging/Work-Log checklist (Section 11) fully satisfied
- [ ] Documentation checklist (Section 13) fully satisfied
- [ ] Review approved with no CRITICAL or HIGH findings
- [ ] This Chunk Plan itself is committed with `Status: Draft` via `ai-git` before being presented for human approval, per `skill/plan-lifecycle` (the very procedure this chunk documents — using its CURRENT, pre-chunk wording, since this chunk's own proposed changes are not yet approved)

---

## 5. Scope

### In Scope

- `skills/plan-lifecycle/SKILL.md` — add documentation of the Tier B abbreviated gate and the Tier C non-gate as an additive subsection/clarification, without changing Steps 1-5's core mechanics for Chunk Plans, Epic Plans, or Tier A Decision Records (Tier A already follows the existing full cycle unchanged).
- `skills/plan-lifecycle/reference/commit-gate-procedure.md` — add a decision-record tier-variant reference: Tier A follows the existing documented sequence unchanged; Tier B is a shortened variant (Draft → confirm → Approved, no expected revision loop); Tier C is explicitly out of scope for this procedure (no sequence applies).
- `skills/plan-lifecycle/reference/status-vocabulary.md` — add a note clarifying that the Tier B variant uses the same `Draft`/`Approved`/`Deferred`/`Done`/ `Superseded` status values and transitions already documented (no new status values are introduced by Tier B or Tier C).
- Reference (not own) the `{paths.decisions}/index.json` update requirement for Tier A and Tier B Decision Records — documented as a required output step that belongs to the producing skill (`skill/decision-record`, `skill/decision-brief` — chunks 002/003 of this Epic), not duplicated as `plan-lifecycle`'s own responsibility.
- Cross-reference AIF-META-001 (Decision ID) as the source of the Tier definitions, so a future reader can trace why the variant exists.

### Out of Scope

- Any change to `plan-lifecycle`'s core Draft → Approved mechanics, Steps 1-5, or the status vocabulary's core statuses/transitions — explicitly out of scope per the Epic Plan (Section 5, Out of Scope) and per AIF-META-001's own "Not required by this decision" note.
- Authoring `skill/decision-triage`, `skill/decision-record`'s Tier A scoping, or `skill/decision-brief` themselves — those are chunks 001, 002, and 003 respectively, dispatched in parallel with this chunk. This chunk only documents the gate shape those skills will invoke; it does not define or modify those skills' own Steps/Outputs.
- Modifying `skills/chunk-planning/reference/template.md` or `skills/epic-planning/reference/template.md` for the Tier C inline-recording convention — that is chunk 005.
- Any validation tooling for `{paths.decisions}/index.json` — that is chunk 015.

---

## 6. Prerequisites

- [x] AIF-002 Epic Plan is `Approved` (verified: `docs/plans/epics/AIF-002.epic.md`, Status: Approved, Work Log entry 2026-08-14 [Approved])
- [x] AIF-META-001 Decision Record is `Approved` (verified: `docs/decisions/meta-process/AIF-META-001_decision-record-tiering-and-domain-ownership.decision.md`, Status: Approved)
- [x] Current `skills/plan-lifecycle/` content read in full (`SKILL.md`, `reference/status-vocabulary.md`, `reference/commit-gate-procedure.md`)
- [x] No dependency chunks — this chunk has `depends_on: []` in `chunks.json`

---

## 7. Architecture & Design

### Project Structure Changes

- `skills/plan-lifecycle/SKILL.md` ← MODIFIED
- `skills/plan-lifecycle/reference/commit-gate-procedure.md` ← MODIFIED
- `skills/plan-lifecycle/reference/status-vocabulary.md` ← MODIFIED
- No new files.

### Key Design Decisions

1. **Decision**: Document the Tier B/C variants as additive subsections placed after the existing Steps/procedure, rather than rewriting Steps 1-5 or the existing sequence diagram in place.
   **Rationale**: The Epic Plan and AIF-META-001 both explicitly require that core Draft → Approved mechanics are unchanged. Keeping the variant documentation additive (a clearly labeled "Decision Record Tier Variants" section) makes the diff auditable as "new content describing which artifacts use which cycle" rather than "changed mechanics," satisfying that constraint structurally, not just by intent.
2. **Decision**: `plan-lifecycle` documents _that_ the index-update step exists and is required for Tier A/B, but does not itself own or duplicate that step's procedure.
   **Rationale**: `{paths.decisions}/index.json` is produced/updated by `skill/decision-record` and `skill/decision-brief` (chunks 002/003), in the same commit as the record itself, per AIF-META-001's Design section. Making `plan-lifecycle` the second source of truth for that step would create drift risk between two skills describing the same mechanic. `plan-lifecycle` references it so a reader following the gate procedure doesn't miss it, without becoming its owner.
3. **Decision**: Tier C is documented as an explicit _non-gate_, not merely omitted.
   **Rationale**: AIF-META-001's Design section states Tier C "rides its parent plan's own `plan-lifecycle` gate — nothing separate." If `plan-lifecycle` simply doesn't mention Tier C, a future reader (or `skill/decision-triage`)
   might assume Tier C decisions need _some_ minimal cycle here. An explicit statement — "Tier C decisions never invoke this skill directly; they are governed entirely by whichever plan recorded them" — forecloses that ambiguity.

### Patterns & Conventions Applied

- Follows the existing skill-authoring convention of `SKILL.md` (Purpose/Inputs/ Steps/Outputs/Edge Cases) plus `reference/` files for procedural detail, already established in this skill and others (`skill/decision-record`, `skill/chunk-planning`).
- Follows AIF-META-001's Design section Tier table verbatim for the Tier B/C gate descriptions, rather than re-deriving new wording — `plan-lifecycle` documents the same gate shape the Decision Record already specifies, avoiding a second, potentially drifting description.

---

## 8. Components

### plan-lifecycle SKILL.md — Tier Variant Documentation

**File**: `skills/plan-lifecycle/SKILL.md`
**Purpose**: Make the skill's `Inputs`/`Steps`/`Edge Cases` sections aware that "Decision Record" as an artifact type now has three tier-scoped gate shapes (A/B/C) instead of one, without changing the shape for any other artifact type (Chunk Plan, Epic Plan, Tier 3 `ai-engineering-plan`).

**Content additions** (markdown sections, not code):

- `Inputs` — extend the "Artifact type" bullet to note that for Decision Records, the artifact's `Tier` field (from `skill/decision-triage`) determines which gate variant applies.
- New subsection after Step 4, e.g. "### Decision Record Tier Variants" — states the three variants (A full cycle / B abbreviated one-shot / C rides the parent plan, no cycle here) at the `plan-lifecycle` level, with a link/reference to AIF-META-001's Design section Tier table as the source of truth for the underlying rigor definitions (this skill does not re-define what Tier A/B/C _mean_ — only how the gate procedure differs once a tier is already chosen).
  Explicitly states: "Tier C decisions are never presented to this skill as a standalone artifact — they do not have a `Status` field of their own; consult the governing plan's own status instead." Explicitly references: "Tier A and Tier B Decision Records must update `{paths.decisions}/index.json` in the same commit that produces or updates the record — see `skill/decision-record`/`skill/decision-brief` for that step's procedure; this skill's commit-gate applies in addition to, not instead of, that requirement."
- `Edge Cases` — add one new edge case: "Decision Record with Tier B — the abbreviated gate applies (see Decision Record Tier Variants above): commit Draft, present for one round of human confirmation, commit Approved. A multi-round revision cycle is not expected but is not prohibited if the human requests changes — if it happens, follow Steps 2-3 exactly as for Tier A."

**Key Behaviour**:

- Tier A Decision Records: no wording changes to existing Steps — they already follow the full cycle described today.
- Tier B Decision Records: same Steps 1, 2, 4, 5; Step 3 (revision loop) is documented as not expected to occur but still available if the human requests a change — the skill does not remove Step 3's applicability, only notes the default expectation differs.
- Tier C: explicitly out of this skill's scope — no Step in `plan-lifecycle` ever applies to a Tier C decision directly.

**Dependencies**:

- AIF-META-001 (Decision Record) — source of the Tier definitions being referenced, not redefined.
- `skill/decision-record`, `skill/decision-brief` (chunks 002, 003) — own the index-update step this chunk references but does not implement. Since those chunks are dispatched in parallel (Wave 1, no dependency edge), this chunk references their _documented_ responsibility per the Epic Plan/AIF-META-001 rather than their as-yet-unwritten `SKILL.md` content.

### plan-lifecycle commit-gate-procedure.md — Tier Variant Sequences

**File**: `skills/plan-lifecycle/reference/commit-gate-procedure.md`
**Purpose**: Give the same level of mechanical, copy-pasteable detail for the Tier B/C variants that the existing sequence diagram gives for the default (Tier A / Chunk Plan / Epic Plan) cycle.

**Content additions**:

- New section "## Decision Record Tier Variants" after the existing `## Rules` section, containing:
  - Tier A: "Follows the sequence above unchanged."
  - Tier B: a shortened sequence block, e.g.:
    ```
    1. Write record, Status: Draft          → commit ("Add draft decision: ...")
    2. Present to human for confirmation
    3. Human confirms → Status: Approved     → commit ("Approve decision: ...")
       (If the human requests changes instead, follow the full Draft → revision
       → Approved sequence above — Tier B does not prohibit revision, it just
       does not expect it.)
    4. Update {paths.decisions}/index.json in the same commit as step 1 and step 3
       (see skill/decision-record / skill/decision-brief for the index-update
       procedure itself)
    ```
  - Tier C: "No sequence applies. The decision is recorded inline in the governing plan (Chunk Plan/Epic Plan) and is fully covered by that plan's own Draft → Approved sequence above. `{paths.decisions}/index.json` is never touched for a Tier C decision."
- Add one bullet to the existing `## Rules` list: "For Decision Records, the `{paths.decisions}/index.json` update (Tier A/B only) happens in the same commit as the Draft and Approved steps respectively — see Decision Record Tier Variants below. This does not add a new commit to the sequence; it is content within the existing Draft/Approved commits."

**Key Behaviour**:

- No existing line in the file is rewritten to change meaning — the current sequence, Rules list items 1-5 (renumbered if a new bullet is inserted), and all existing prose remain intact. New content is appended/inserted, not substituted.

**Dependencies**:

- None beyond the source-of-truth cross-reference to AIF-META-001.

### plan-lifecycle status-vocabulary.md — No-New-Status Clarification

**File**: `skills/plan-lifecycle/reference/status-vocabulary.md`
**Purpose**: Prevent a future reader (or agent) from assuming Tier B/C introduce new `Status` values, since the file is the single source of truth for the status list.

**Content additions**:

- One clarifying note under the "Per-artifact-type extensions" table, e.g.:
  "Tier does not add new `Status` values. A Tier B Decision Record uses the same `Draft`/`Approved`/`Done`/`Deferred`/`Superseded` values as Tier A — only the _procedure_ for reaching `Approved` differs (see `skill/plan-lifecycle`/`reference/commit-gate-procedure.md`, Decision Record Tier Variants). Tier C decisions have no `Status` field of their own — they are governed by their parent plan's status."

**Key Behaviour**:

- No changes to the existing status table, transitions list, or "Checking whether dependent work may proceed" section — those already apply unchanged to Tier A and Tier B alike, and are simply not applicable to Tier C at all.

**Dependencies**:

- None.

---

## 9. Data Models

Not applicable — this chunk produces markdown documentation only, no data schemas or structured artifacts.

---

## 10. Security Requirements

> This section must never be empty.

- [ ] No new attack surface — this chunk edits only markdown documentation inside `skills/plan-lifecycle/`; it introduces no code execution paths, no credential handling, and no network-facing behavior (consistent with Epic Plan Section 8, first bullet).
- [ ] No secrets or credentials in source content — the added text references only public artifact paths (`{paths.decisions}/index.json`) and skill/decision names, nothing environment- or credential-specific.
- [ ] The Tier B abbreviated gate must not be documented in a way that weakens the approval requirement — the abbreviated gate still requires an explicit committed `Approved` status; "abbreviated" refers only to the expected number of revision rounds, never to skipping human confirmation itself.
      This is a direct carry-forward of AIF-META-001's non-negotiable constraint ("must not weaken `skill/plan-lifecycle`'s human-approval gate for any decision, regardless of tier or domain") and of Epic Plan Section 8.
- [ ] Errors/ambiguity exposed to future readers contain no internal system details beyond what is already documented elsewhere in this repo (not applicable in practice for a docs-only change, verified as N/A).

---

## 11. Logging Requirements

> This section must never be empty.

This chunk produces static documentation content with no runtime component — `skills/plan-lifecycle/` is read by agents as reference material, not executed as code, so there are no application log statements for this chunk to define.
The table below documents the plan-level Work Log entries this chunk itself must produce, per `steering/engineering/core.md` Rule 2/Rule 9 and `skill/plan-lifecycle` Step 1-4 commit requirements — these are the only "logging" applicable to a documentation-only chunk.

| Event                                          | Level (Work Log Action)                                      | What is logged                                           | What is NOT logged                                        |
| ---------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------- | --------------------------------------------------------- |
| Plan drafted                                   | `[Created]`                                                  | Plan ID, agent, tier assessed, summary of scope          | No content of unrelated chunks/plans                      |
| Plan approved/deferred                         | `[Approved]`/`[Deferred]`                                    | Human decision, approver name if approved                | Nothing beyond the decision itself                        |
| Implementation commits (future, post-approval) | `[Implemented]` (per commit, one per Component in Section 8) | Files touched, brief description referencing AIF-002-004 | No secrets; N/A here since no secrets exist in this chunk |

---

## 12. Testing Plan

This chunk has no executable code, so "tests" are documentation-validation checks performed during self-validation (Section 4) rather than automated unit tests.

### plan-lifecycle Documentation Tests

| Test ID | Description                                                                                                                                                                                                 | Type                       | Pass Criteria                                                                                                                                    |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 004-T01 | `SKILL.md` still describes Steps 1-5 and the core status transitions identically to the pre-chunk version (diff review)                                                                                     | Manual/diff review         | No wording change to existing Step 1-5 semantics; only additive content present                                                                  |
| 004-T02 | New Tier B/C content is internally consistent with AIF-META-001's Design section Tier table (Draft→confirm→Approved for B; no cycle for C)                                                                  | Manual cross-check         | Wording matches AIF-META-001's Tier table's`Gate` column meaning, not contradicting it                                                           |
| 004-T03 | `commit-gate-procedure.md`'s new "Decision Record Tier Variants" section renders as valid markdown and its Tier B sequence block is copy-paste consistent in format with the existing Tier A block above it | Manual review              | Same code-fence/numbered-list style as existing sequence                                                                                         |
| 004-T04 | `status-vocabulary.md`'s new note does not add, remove, or rename any status value in the existing table                                                                                                    | Manual diff review         | Existing table rows (`Draft`, `Approved`, `Done`, `Deferred`, `Superseded`) and Transitions section byte-for-byte unchanged except appended note |
| 004-T05 | Grep for "Tier B" and "Tier C" across`skills/plan-lifecycle/` after edit returns exactly the new content added by this chunk (no stray duplicate/contradictory mentions)                                    | Grep-based self-validation | Matches expected line count/locations                                                                                                            |
| 004-T06 | Cross-reference to AIF-META-001 uses its Decision ID (`AIF-META-001`) and, if referencing the file path, points to the correct current path under `docs/decisions/meta-process/`                            | Manual review              | Path resolves; ID matches Metadata table                                                                                                         |

---

## 13. Documentation Requirements

- [ ] Inline documentation on all new subsections (clear headers, no orphaned prose) — applies to markdown structure since there is no code
- [ ] File headers — not applicable; `skills/plan-lifecycle/*.md` files use YAML front-matter (SKILL.md only) / no header convention for `reference/` files, consistent with existing files in this skill; no new header convention introduced
- [ ] README updated if user-facing — not applicable; no README exists for this skill beyond `SKILL.md` itself, which is being updated directly
- [ ] CHANGELOG entry written — confirmed at Epic level (Acceptance Criteria item: "Epic-level CHANGELOG entry written (if this repo maintains one — confirm at implementation time)"); this chunk defers to that Epic-level decision rather than adding a chunk-level CHANGELOG entry unilaterally

---

## 14. Risks & Open Questions

| #   | Risk / Question                                                                                                                                                                                                                                                | Impact | Mitigation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | This chunk references`skill/decision-record` and `skill/decision-brief` (chunks 002/003) for the index-update step's procedure, but those chunks' own Chunk Plans/implementations are being authored in parallel (Wave 1, no dependency edge in `chunks.json`) | L      | No functional risk — this chunk only needs the*existence and required-ness* of the index-update step (already specified in AIF-META-001's Design section, independent of 002/003's eventual wording), not their finished `SKILL.md` text. If 002/003 land with a materially different index-update mechanic than AIF-META-001 describes, that is a discrepancy for review to catch across those chunks, not something this chunk can pre-empt without violating its own Out of Scope (documenting, not defining, those skills). |
| 2   | The exact insertion points/wording for the new subsections in`SKILL.md` and `commit-gate-procedure.md` are a drafting judgment call (no existing precedent in this repo for a "tier variant" documentation pattern)                                            | L      | Documented under global Rule 4's delegated-judgment exception — reasonable, additive placement chosen to avoid touching existing Step numbering; flagged here for reviewer visibility rather than escalated, since the choice has no architectural impact and is easily revised in review if the reviewer prefers different placement                                                                                                                                                                                           |

---

## 15. Work Log

[2026-08-14 00:00] [AI-Engineer] [Created] [AIF-002-004] [Self-planned Chunk 004 of Epic AIF-002 per Tech-Lead's decomposition (`chunks.json`). Read Epic Plan Sections 5/4/5/8 and AIF-META-001 in full. Assessed Tier 2 (Standard) per `skill/complexity-tiers`: multi-file change (SKILL.md + 2 reference files) within a shared, widely-depended-upon skill, documenting a new pattern (tier-differentiated gate) without altering existing mechanics — not a Tier 1 single-file tweak, and not Tier 3 since no schema change or cross-cutting redesign is involved. Drafted full Chunk Plan following `skills/chunk-planning/reference/template.md`. Saving as Status: Draft per `skill/plan-lifecycle` (current, unmodified procedure) before presenting for human approval. No implementation performed.]
[2026-08-16 11:18] [Jeremy] [Approved] [AIF-002-004] [Reviewed and approved manually by Jeremy. Status set to `Approved`, `Reviewed By: Jeremy`, committed as part of "Approved AIF-002 chunk plan 01 to 04" (commit `bbd6a1e`). This Work Log entry added retroactively by Engineering-Manager on 2026-08-17 to close a traceability gap — the original approval commit updated the Metadata table but did not append a corresponding Work Log entry, per engineering steering Rule 3 (logging requirements are never optional).]
[2026-08-18] [AI-Engineer] [Revised] [AIF-002-004] [Migrated this Chunk Plan to the reordered template structure approved for skill/chunk-planning: Quick Summary (new Section 3, open-item count derived from the existing Risks & Open Questions table) and Acceptance Criteria (moved from Section 12 to Section 4) now sit immediately after the Goal; all other sections renumbered accordingly (mapping: 3->5, 4->6, 5->7, 6->8, 7->9, 8->10, 9->11, 10->12, 11->13, 13->14, 14->15). Every inline "Section N" cross-reference in this file, including references into the AIF-002 Epic Plan's own renumbered sections, was remapped to match. No wording, decisions, criteria, or risk content was changed - purely structural, per human direction (no active work on these plans at the time of migration).]
[2026-08-18] [AI-Engineer] [Implemented] [AIF-002-004] [Commit `6cb81de` - "AIF-002-004: document Decision Record Tier A/B/C gate variants in plan-lifecycle SKILL.md". Added the "Decision Record Tier Variants" subsection to `skills/plan-lifecycle/SKILL.md` (Inputs bullet extended to note the Tier field determines gate variant; new subsection after Step 4 stating the A/full-cycle, B/abbreviated, C/no-cycle shapes and cross-referencing AIF-META-001; new Edge Case for Tier B). File touched: `skills/plan-lifecycle/SKILL.md`.]
[2026-08-18] [AI-Engineer] [Implemented] [AIF-002-004] [Commit `b58970a` - "AIF-002-004: add Decision Record Tier variant sequences to commit-gate-procedure.md". Added the "Decision Record Tier Variants" section to `skills/plan-lifecycle/reference/commit-gate-procedure.md` (Tier A unchanged-sequence reference, Tier B shortened Draft->confirm->Approved sequence block with index-update step, Tier C no-sequence statement) plus one new bullet to the existing Rules list documenting the `{paths.decisions}/index.json` update timing. File touched: `skills/plan-lifecycle/reference/commit-gate-procedure.md`.]
[2026-08-18] [AI-Engineer] [Implemented] [AIF-002-004] [Commit `284e91c` - "AIF-002-004: clarify Tier B/C introduce no new Status values". Added a clarifying note under the "Per-artifact-type extensions" table in `skills/plan-lifecycle/reference/status-vocabulary.md` stating Tier B reuses the existing Status values and Tier C has no Status field of its own. File touched: `skills/plan-lifecycle/reference/status-vocabulary.md`.]
