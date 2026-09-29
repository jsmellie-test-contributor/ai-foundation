# Chunk Plan: skill/chunk-planning + skill/epic-planning — Document Tier C Inline-Recording Convention

## 1. Metadata

| Field          | Value                                                                                                                                                                                                                                 |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plan ID        | AIF-002-005                                                                                                                                                                                                                           |
| Parent Epic    | AIF-002                                                                                                                                                                                                                               |
| Chunk          | 005 of 15                                                                                                                                                                                                                             |
| Depends On     | None                                                                                                                                                                                                                                  |
| Can Parallel   | 001, 002, 003, 004, 006, 007, 008, 009 (all other Wave 1 chunks)                                                                                                                                                                      |
| Project        | ai-foundation                                                                                                                                                                                                                         |
| Status         | Approved                                                                                                                                                                                                                              |
| Author (Agent) | AI-Engineer                                                                                                                                                                                                                           |
| Reviewed By    | Jeremy                                                                                                                                                                                                                                |
| Created        | 2026-08-14                                                                                                                                                                                                                            |
| Last Updated   | 2026-08-17 (Approved by Jeremy)                                                                                                                                                                                                       |
| Standards      | ai-foundation declarative-component schemas (AGENTS.md) — no code standards apply; this chunk's deliverables are `skills/chunk-planning/reference/template.md` and `skills/epic-planning/reference/template.md` markdown content only |

---

## 2. Goal

Add the Tier C inline-recording convention ("Decision: ... **Why:** ...") to both `skills/chunk-planning/reference/template.md` and `skills/epic-planning/reference/template.md` as documented guidance in the relevant section of each template, so an agent planning a chunk or epic knows — without relying on an implicit assumption — where and how to record a decision that `skill/decision-triage` determines does not rise to Tier A or Tier B.

---

## 3. Quick Summary

**Open Items:** 2 open (0 High / 0 Medium / 2 Low) — see Section 14

---

## 4. Acceptance Criteria

- [ ] `skills/chunk-planning/reference/template.md` Section 7 documents the Tier C inline-recording convention as an explicit callout, not an implicit assumption
- [ ] `skills/epic-planning/reference/template.md` Section 12 documents the same convention, adapted to the Work Log section
- [ ] Both guidance blocks use the literal `Decision: ... **Why:** ...` wording from AIF-META-001's Design section Tier table
- [ ] Both guidance blocks reference `skill/decision-triage` by name as the promotion-threshold entry point, without restating the threshold itself
- [ ] No wording change to either template's existing sections, section numbering, or section headers beyond the two additive callouts — verified via diff review (Tests 005-T01, 005-T02, 005-T05)
- [ ] Security checklist (Section 10) fully satisfied
- [ ] Logging/Work-Log checklist (Section 11) fully satisfied
- [ ] Documentation checklist (Section 13) fully satisfied
- [ ] Review approved with no CRITICAL or HIGH findings
- [ ] This Chunk Plan itself is committed with `Status: Draft` via `ai-git` before being presented for human approval, per `skill/plan-lifecycle`

---

## 5. Scope

### In Scope

- `skills/chunk-planning/reference/template.md` — add a Tier C guidance callout to Section 7 ("Architecture & Design" → "Key Design Decisions"), documenting the inline convention, the promotion threshold entry point (`skill/decision-triage`), and the fact that a Tier C entry rides this Chunk Plan's own `plan-lifecycle` cycle with no standalone file, no index update, and no separate approval gate.
- `skills/epic-planning/reference/template.md` — add the same guidance, adapted to Section 12 ("Work Log"), since the Epic template has no "Key Design Decisions"-shaped section and AIF-META-001 names "the governing plan's own body or its sibling worklog file" as the Tier C home — the Epic template's existing Work Log section is the closest present-day fit (AIF-011's sibling-worklog-file convention is not yet migrated into this template; that is out of scope here — see below).
- Both guidance blocks use the literal convention wording from AIF-META-001's Design section Tier table: `Decision: {what}. **Why:** {rationale}.`
- Both guidance blocks reference `skill/decision-triage` by name (the confirmed entry-point skill name per Epic Open Question 1's resolution) as where the Tier A/B/C promotion threshold is applied — without restating the threshold's own definition, to avoid a second, driftable copy of AIF-META-001's Design section content.

### Out of Scope

- Authoring `skill/decision-triage` itself, or its promotion-threshold logic — that is chunk 001, dispatched in parallel. This chunk only points to it by name.
- Modifying `skills/decision-record/`, `skills/decision-brief/`, or `skills/plan-lifecycle/` — chunks 002, 003, and 004 respectively.
- Modifying `skills/chunk-planning/SKILL.md` or `skills/epic-planning/SKILL.md` themselves — Epic Plan Section 5 scopes this chunk explicitly to the two `reference/template.md` files, not the parent `SKILL.md` files that describe the planning process around them.
- Migrating the Epic template (or any other artifact) onto AIF-011's sibling-worklog-file convention — that convention does not yet exist in this repo's active templates (AIF-011 itself has not been migrated; it is chunk 013 of this Epic, in Wave 2, unrelated to this chunk's scope). This chunk documents the Tier C convention against the Epic template's _current_ single-file Work Log section, not a hypothetical future structure.
- Retroactively applying the Tier C convention to any existing plan's Work Log entries — per Epic Plan Section 5 ("Out of Scope"), the promotion threshold applies forward from this Epic's completion, not retroactively.

---

## 6. Prerequisites

- [x] AIF-002 Epic Plan is `Approved` (verified: `docs/plans/epics/AIF-002.epic.md`, Status: Approved, Work Log entry 2026-08-14 [Approved])
- [x] AIF-META-001 Decision Record is `Approved` (verified:
      `docs/decisions/meta-process/AIF-META-001_decision-record-tiering-and-domain-ownership.decision.md`, Status: Approved, Design section Tier table read in full)
- [x] Current `skills/chunk-planning/reference/template.md` and `skills/epic-planning/reference/template.md` content read in full
- [x] No dependency chunks — this chunk has `depends_on: []` in `chunks.json`

---

## 7. Architecture & Design

### Project Structure Changes

- `skills/chunk-planning/reference/template.md` ← MODIFIED
- `skills/epic-planning/reference/template.md` ← MODIFIED
- No new files.

### Key Design Decisions

1. **Decision**: Place the Chunk template's Tier C guidance in Section 7 ("Key Design Decisions") rather than Section 15 ("Work Log").
   **Rationale**: Section 7 already uses a `**Decision**: {What}` / `**Rationale**: {Why}` bullet shape nearly identical to AIF-META-001's "Decision: ... **Why:** ..." convention, and is the section an implementing agent already consults when recording in-flight design calls during chunk work — the natural existing home for a Tier C decision made while executing or planning the chunk, requiring no new section.

2. **Decision**: Place the Epic template's Tier C guidance in Section 12 ("Work Log") rather than inventing a new subsection or repurposing Section 9 ("Open Questions").
   **Rationale**: AIF-002's own Work Log entries already informally follow this shape (decision + rationale folded into `[Details]` — see this Epic's own `[Revised]` entries). AIF-META-001 explicitly names "the governing plan's own body or its sibling worklog file" as the Tier C home; the Epic template has no sibling worklog file today (that is AIF-011's not-yet-migrated convention, out of scope per Section 5), and no other existing section is dedicated to logging decisions made during planning itself. Open Questions (Section 9) is reserved for questions raised and their eventual resolution, not for decisions that were never raised as an open question in the first place — using it would conflate two different record types.

3. **Decision**: Reference `skill/decision-triage` by name in both guidance blocks rather than restating the full promotion threshold (the 1/2/3 test from AIF-META-001's Design section).
   **Rationale**: Keeps the templates from becoming a second, driftable copy of the threshold's actual definition, which is owned by AIF-META-001 and implemented by `skill/decision-triage` (chunk 001). The templates only need to tell an agent where to check and what to do once the answer comes back Tier C — not re-derive the test itself.

4. **Decision**: Use the AIF-META-001 Design section's Tier C row wording verbatim (`Decision: ... **Why:** ...`) as the literal convention text in both guidance blocks, rather than paraphrasing.
   **Rationale**: This is the destination `skill/decision-triage` (chunk 001)
   points to by name per the Epic's Component Relationships (Section 7); using the exact wording avoids any ambiguity about whether the template's convention and the Decision Record's convention are the same thing.

### Patterns & Conventions Applied

- Reuses AIF-META-001's Design section Tier table's exact Tier C row wording as the literal inline-recording convention, rather than re-deriving new wording — the same "reference, don't redefine" pattern chunk 004 applies to `skill/plan-lifecycle`.
- Follows this repo's existing cross-reference convention of naming skills as `skill/{name}` and Decision Records by their ID (`AIF-META-001`).
- Both guidance blocks are added as callouts/notes immediately adjacent to the existing section content they extend, not as new top-level sections — matches the additive-insertion pattern chunk 004 used for `skill/plan-lifecycle` (no renumbering, no rewording of existing template structure).

---

## 8. Components

### chunk-planning template.md — Tier C guidance block

**File**: `skills/chunk-planning/reference/template.md`
**Purpose**: Tell an agent planning or implementing a chunk when and how to record a Tier C decision inline in a Chunk Plan, instead of leaving it as an implicit assumption that the existing "Key Design Decisions" bullet format happens to also serve this purpose.

**Content addition** (markdown, not code):

- A callout inserted immediately after the existing Section 7 "Key Design Decisions" example (`1. **Decision**: {What} / **Rationale**: {Why}`), e.g.:

  ```
  > **Tier C decisions.** Not every decision needs a standalone Decision Record —
  > most don't. Before writing a decision in this section, run it through
  > `skill/decision-triage`'s promotion threshold. If it doesn't rise to Tier A
  > (`skill/decision-record`) or Tier B (`skill/decision-brief`), it stays here as
  > a Tier C entry: no standalone file, no `{paths.decisions}/index.json` update, no
  > separate approval gate — it rides this Chunk Plan's own `skill/plan-lifecycle`
  > cycle. Use the convention: `Decision: {what was decided}. **Why:** {rationale}.`
  > If a later, unrelated plan needs to cite this decision independently, it
  > should be promoted via `skill/decision-triage`, not silently re-explained.
  ```

**Key Behaviour**:

- Purely documentation — no change to the existing numbered-list example format, which already matches the convention closely enough to serve as both the generic example and the Tier C guidance's home.
- Does not restate or redefine the Tier A/B/C promotion threshold itself.

**Dependencies**:

- `skill/decision-triage` (chunk 001) — referenced by name only; this chunk does not depend on chunk 001's completion (Wave 1, no dependency edge in `chunks.json`), since the reference is to the skill's _name_, which is already fixed by the Epic's resolved Open Question 1, not to its finished content.

### epic-planning template.md — Tier C guidance block

**File**: `skills/epic-planning/reference/template.md`
**Purpose**: Tell an agent planning or revising an epic when and how to record a Tier C decision in the Epic Plan's Work Log, rather than defaulting every decision made during epic planning/revision to unstructured prose with no recognizable convention.

**Content addition** (markdown, not code):

- A callout inserted immediately after the existing Section 12 Work Log format description (`[{YYYY-MM-DD HH:mm}] [{Agent}] [{Action}] [{ID}] [{Details}]`), e.g.:

  ```
  > **Tier C decisions.** Decisions made during epic planning or revision that
  > don't rise to Tier A/B per `skill/decision-triage`'s promotion threshold are
  > recorded inline in a Work Log entry, not as a standalone Decision Record — no
  > separate file, no `{paths.decisions}/index.json` update, no separate approval
  > gate. Fold the convention into the entry's `[Details]`:
  > `Decision: {what was decided}. **Why:** {rationale}.` This rides the Epic
  > Plan's own `skill/plan-lifecycle` cycle. Promote to Tier B/A later (via
  > `skill/decision-triage`) only if a second, unrelated plan needs to cite the
  > decision independently.
  ```

**Key Behaviour**:

- Purely documentation — no change to the existing Work Log entry format itself (agent/action/ID/details fields unchanged); the convention is guidance for what goes inside `[Details]` for this specific decision-recording case, not a new field.
- Does not restate or redefine the Tier A/B/C promotion threshold itself.

**Dependencies**:

- `skill/decision-triage` (chunk 001) — referenced by name only, same rationale as above.

---

## 9. Data Models

Not applicable — this chunk produces markdown documentation only, no data schemas or structured artifacts. `{paths.decisions}/index.json`'s schema is owned by chunk 014, unaffected by this chunk (Tier C decisions never touch it).

---

## 10. Security Requirements

> This section must never be empty.

- [ ] No new attack surface — this chunk edits only markdown documentation inside `skills/chunk-planning/reference/` and `skills/epic-planning/reference/`; it introduces no code execution paths, no credential handling, and no network-facing behavior (consistent with Epic Plan Section 8, first bullet).
- [ ] No secrets or credentials in added content — the guidance text references only public skill names (`skill/decision-triage`, `skill/decision-record`, `skill/decision-brief`, `skill/plan-lifecycle`) and public artifact paths (`{paths.decisions}/index.json`), nothing environment- or credential-specific.
- [ ] The guidance must not overstate mechanics not yet built by this chunk's Wave 1 siblings — it must describe `skill/decision-triage` as a documented convention/entry point an agent consults, consistent with how the Epic Plan and AIF-META-001 describe it, and must not claim the promotion threshold is enforced by tooling this Epic does not build (per Epic Plan Section 6 "Error States": domain/tier misrouting is "not blocked at a tooling level ... a documented convention, not a hard gate").
- [ ] Errors exposed to a future reader contain no internal system details beyond what is already documented elsewhere in this repo — not applicable in practice for a docs-only addition, verified as N/A.

---

## 11. Logging Requirements

> This section must never be empty.

This chunk produces static documentation content with no runtime component — both target templates are read by agents as reference material when authoring plans, not executed as code, so there are no application log statements for this chunk to define. The table below documents the plan-level Work Log entries this chunk itself must produce, per `steering/engineering/core.md` Rule 2/Rule 9 and `skill/plan-lifecycle` Steps 1-4 commit requirements — these are the only "logging" applicable to a documentation-only chunk.

| Event                                          | Level (Work Log Action)                                                                             | What is logged                                           | What is NOT logged                                        |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------- |
| Plan drafted                                   | `[Created]`                                                                                         | Plan ID, agent, tier assessed, summary of scope          | No content of unrelated chunks/plans                      |
| Plan approved/deferred                         | `[Approved]`/`[Deferred]`                                                                           | Human decision, approver name if approved                | Nothing beyond the decision itself                        |
| Implementation commits (future, post-approval) | `[Implemented]` (per Component in Section 8, one commit per file per Commit Granularity Option A/B) | Files touched, brief description referencing AIF-002-005 | No secrets; N/A here since no secrets exist in this chunk |

---

## 12. Testing Plan

This chunk has no executable code, so "tests" are documentation-validation checks performed during self-validation (Section 4) rather than automated unit tests.

### Tier C Guidance Documentation Tests

| Test ID | Description                                                                                                                                                                                                         | Type                                    | Pass Criteria                                                                                                       |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 005-T01 | `skills/chunk-planning/reference/template.md` Section 7 renders the new Tier C callout correctly, immediately after the existing "Key Design Decisions" example, with no change to any other section                | Manual/diff review                      | Callout present, correctly formatted markdown blockquote; rest of file byte-for-byte unchanged except the insertion |
| 005-T02 | `skills/epic-planning/reference/template.md` Section 12 renders the new Tier C callout correctly, immediately after the existing Work Log format line, with no change to any other section                          | Manual/diff review                      | Callout present, correctly formatted markdown blockquote; rest of file byte-for-byte unchanged except the insertion |
| 005-T03 | Both guidance blocks reference `skill/decision-triage` using that exact spelling, matching the naming confirmed in Epic Open Question 1                                                                             | Grep-based self-validation              | `skill/decision-triage` string present in both files, no variant spelling                                           |
| 005-T04 | Both guidance blocks use the literal convention wording `Decision: ... **Why:** ...` consistent with AIF-META-001's Design section Tier table                                                                       | Manual cross-check against AIF-META-001 | Wording matches; no paraphrase that changes meaning                                                                 |
| 005-T05 | Neither template's existing section numbering/headers shifted (diff review) — downstream skills (`skill/chunk-planning`, `skill/epic-planning`) reference these templates by section number/name and must not break | Manual diff review                      | Section headers 1-14 (chunk) and 1-10 (epic) identical to pre-chunk version                                         |

---

## 13. Documentation Requirements

- [ ] Inline documentation on all new subsections (clear callout formatting, no orphaned prose) — applies to markdown structure since there is no code
- [ ] File headers — not applicable; neither `reference/template.md` file uses a header/front-matter convention today (unlike `SKILL.md` files, which carry YAML front-matter); no new header convention introduced by this chunk
- [ ] README updated if user-facing — not applicable; no README exists for either skill beyond `SKILL.md`, which this chunk does not modify (out of scope per Section 5)
- [ ] CHANGELOG entry written — confirmed at Epic level (Acceptance Criteria item: "Epic-level CHANGELOG entry written (if this repo maintains one — confirm at implementation time)"); this chunk defers to that Epic-level decision rather than adding a chunk-level CHANGELOG entry unilaterally

---

## 14. Risks & Open Questions

| #   | Risk / Question                                                                                                                                                                                                                                                                  | Impact | Mitigation                                                                                                                                                                                                                                                                                                                                                                                                                   |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | The Epic template has no section shaped like the Chunk template's "Key Design Decisions," so the choice of Section 12 (Work Log) as its Tier C home is a drafting judgment call with no existing precedent in this repo for a "decisions embedded in an epic's work log" pattern | L      | Documented under global Rule 4's delegated-judgment exception — reasonable placement chosen based on AIF-META-001's own phrasing ("governing plan's own body or its sibling worklog file") and this Epic's own observed Work Log usage; flagged here for reviewer visibility rather than escalated, since the choice has no architectural impact and is easily revised in review if the reviewer prefers a different section |
| 2   | AIF-011 (not yet migrated — chunk 013 of this Epic) introduces a sibling-worklog-file convention that could eventually change where Epic-level Tier C decisions live (a separate worklog file instead of an in-plan Work Log section)                                            | L      | Explicitly out of scope for this chunk (Section 5) — this chunk documents against the Epic template's _current_ structure; if AIF-011's migration later changes the Work Log's shape, that is a follow-up documentation update to this same guidance block, not a blocker for this chunk                                                                                                                                     |

---

## 15. Work Log

[2026-08-14 00:00] [AI-Engineer] [Created] [AIF-002-005] [Self-planned Chunk 005 of Epic AIF-002 per Tech-Lead's decomposition (`chunks.json`). Read Epic Plan Sections 5/4/5/8 and AIF-META-001 (Design section Tier table) in full, plus both current template files (`skills/chunk-planning/reference/template.md`, `skills/epic-planning/reference/template.md`) and sibling Wave 1 chunk plan AIF-002-004 for precedent/style consistency. Assessed Tier 2 (Standard) per `skill/complexity-tiers`: multi-file change (two templates) modifying an existing pattern (adding documented guidance to established sections) without changing that pattern's core shape — not Tier 1 since it spans two files across two skills and required judgment on where each template's Tier C home should live (no existing "Key Design Decisions"-equivalent section in the Epic template); not Tier 3 since no schema change, no new convention beyond what AIF-META-001 already specifies, and no cross-cutting redesign is involved. Drafted full Chunk Plan following `skills/chunk-planning/reference/template.md`. Saving as Status: Draft per `skill/plan-lifecycle` before presenting for human approval. No implementation performed.]
[2026-08-17 00:00] [Jeremy] [Approved] [AIF-002-005] [Reviewed and approved manually by Jeremy. Status set to `Approved`, `Reviewed By: Jeremy`.]
[2026-08-18] [AI-Engineer] [Revised] [AIF-002-005] [Migrated this Chunk Plan to the reordered template structure approved for skill/chunk-planning: Quick Summary (new Section 3, open-item count derived from the existing Risks & Open Questions table) and Acceptance Criteria (moved from Section 12 to Section 4) now sit immediately after the Goal; all other sections renumbered accordingly (mapping: 3->5, 4->6, 5->7, 6->8, 7->9, 8->10, 9->11, 10->12, 11->13, 13->14, 14->15). Every inline "Section N" cross-reference in this file, including references into the AIF-002 Epic Plan's own renumbered sections, was remapped to match. No wording, decisions, criteria, or risk content was changed - purely structural, per human direction (no active work on these plans at the time of migration).]
[2026-08-18] [AI-Engineer] [Implemented] [AIF-002-005] [Implemented exactly as planned: added the Tier C inline-recording callout to skills/chunk-planning/reference/template.md Section 7 (Key Design Decisions), immediately after the existing numbered example, and skills/epic-planning/reference/template.md Section 12/11 (Work Log), immediately after the existing Work Log format line. Both callouts use the literal `Decision: ... **Why:** ...` wording verified against AIF-META-001's Design section Tier table (Tier C row), and reference `skill/decision-triage` by name without restating the promotion threshold. Verified via `git diff` that both files' existing content, section headers, and numbering are unchanged except for the two additive insertions (Tests 005-T01, 005-T02, 005-T05 pass). Confirmed `skill/decision-triage` exact spelling present in both files via grep (005-T03). Cross-checked wording against AIF-META-001 manually (005-T04). Ran `npm test` — all 489 tests pass, no regressions. Test-Engineer skipped for this AI-track chunk per Decision Record AIF-005 (Approved); self-validated per steering. Committed each template file separately (commit per file, Commit Granularity Option B) before this Work Log entry.]
