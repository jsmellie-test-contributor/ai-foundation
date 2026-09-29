# Chunk Plan: Migrate AIF-008 (Draft, reclassified Architecture, full reformat, standalone)

## 1. Metadata

| Field          | Value                                                                                                                                                                                  |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plan ID        | AIF-002-011                                                                                                                                                                            |
| Parent Epic    | AIF-002                                                                                                                                                                                |
| Chunk          | 11 of 15                                                                                                                                                                               |
| Depends On     | AIF-002-002 (finalized Tier A `decision-record` template shape — Metadata field order and `reference/domain-guidance.md` Architecture stub)                                            |
| Can Parallel   | AIF-002-010, AIF-002-012, AIF-002-013 (Wave 2 siblings, per `docs/plans/chunks/AIF-002/chunks.json`); AIF-002-014 (no coupling)                                                        |
| Project        | ai-foundation                                                                                                                                                                          |
| Status         | Approved                                                                                                                                                                               |
| Author (Agent) | AI-Engineer (self-planned)                                                                                                                                                             |
| Reviewed By    | Jeremy Smellie                                                                                                                                                                         |
| Created        | 2026-08-17                                                                                                                                                                             |
| Last Updated   | 2026-08-17                                                                                                                                                                             |
| Standards      | ai-foundation declarative-component schemas (AGENTS.md); no code standards apply — this chunk's deliverable is entirely `docs/decisions/` content, per AIF-PROC-001 (formerly AIF-004) |

---

## 2. Goal

Migrate the existing AIF-008 ("Standards Sync Mechanism") decision record — currently `Draft`, Architecture-reclassified — to its new domain-scoped ID `AIF-ARCH-004` under `docs/decisions/architecture/`, applying the Epic's "Full reformat (already Draft)" treatment: rewrite the record's Metadata table to the current Tier A template shape (adding `Tier: A`, `Domain: architecture`, `Tags`), update its outbound `References` field and inline prose ID citations to the new ID scheme, and update the one live-documentation cross-reference found outside `docs/decisions/`. No `Draft`→`Approved` round-trip is needed (the record is already `Draft`).

> Requirement traceability: AIF-002 Epic Plan §3 (migration table, AIF-008 row) and
> the "Migration Treatment definitions" ("Full reformat" bullet); §8 (Wave 2,
> chunk 011).

---

## 3. Quick Summary

**Open Items:** 3 open (0 High / 1 Medium / 2 Low) — see Section 14

---

## 4. Acceptance Criteria

- [x] File renamed to `docs/decisions/architecture/AIF-ARCH-004_standards-sync-mechanism.decision.md`
- [x] Metadata table rewritten to the AIF-002-002 Tier A contract: `Decision ID`, `Tier: A`, `Domain: architecture` correct; `Referenced By`/`References` correct and bidirectionally sound; `Tags` populated
- [x] Both inline prose ID citations (`AIF-007`, `AIF-004`) renamed to their new IDs (`AIF-PROC-004`, `AIF-PROC-001`)
- [x] `Status: Draft`, `Approved By`, and all body content otherwise unchanged (no `Draft`→`Approved` round-trip performed — none required, record was already `Draft`)
- [x] `docs/plans/epics/AIF-001.epic.md` line 45 updated to reference `AIF-ARCH-004`
- [x] All tests in Section 12 pass (manual/structural verification)
- [x] Security checklist (Section 10) fully satisfied
- [x] Logging checklist (Section 11) — Work Log and commit-message requirements — fully satisfied
- [ ] Review approved with no CRITICAL or HIGH findings
- [x] This Chunk Plan reaches `Status: Approved` (per `skill/plan-lifecycle`) before any rename/edit is performed (Rule 1)

---

## 5. Scope

### In Scope

- Create `docs/decisions/architecture/` folder if it does not already exist (it may already exist from chunk 009 or 010 landing first — Wave 2 chunks are parallel, so this chunk creates it if it isn't there yet; no conflict either way since folder creation is idempotent).
- Rename and move: `docs/decisions/AIF-008_standards-sync-mechanism.decision.md` → `docs/decisions/architecture/AIF-ARCH-004_standards-sync-mechanism.decision.md` (via `git mv` through `ai-git`, preserving history).
- Rewrite the Metadata table to the AIF-002-002 (Approved) Tier A template contract — field order `Decision ID, Project, Tier, Domain, Status, Author (Agent), Approved By, Created, Referenced By, References, Tags`:
  - `Decision ID`: `AIF-008` → `AIF-ARCH-004`
  - `Tier`: **added**, value `A` (all 11 existing records are Tier A by definition, per Epic §3)
  - `Domain`: **added**, value `architecture` (reclassified per Epic §3 — concrete mechanism/system design, not process/orchestration)
  - `Status`, `Author (Agent)`, `Approved By`, `Created`: unchanged (`Draft`, `Architect`, `Pending`, `2026-08-13`) — `Architect` is already the correct default owner for Architecture domain per `reference/domain-guidance.md`, so no author-inconsistency correction is needed (unlike AIF-003's historical case)
  - `Referenced By`: unchanged, `—` (confirmed by repo-wide grep — no record's `References` field cites AIF-008)
  - `References`: `AIF-007` → `AIF-PROC-004` (AIF-007's Epic-table-determined new ID; the ID string is already fully determined even though AIF-007's own file hasn't been renamed yet — same reasoning the Epic's own parallelization note applies to chunk 009)
  - `Tags`: **added** (new field, rev 6/Open Question 6), value `standards-sync, cli, filesystem-sync, config-schema, conflict-detection` — free-text judgment call made during this reformat, in the same spirit as `Domain`/`Tier`, since the pre-existing record predates the `Tags` field
- Update two inline prose ID citations inside the record body (mechanical ID-string rename only, not a change to which records are cited):
  - Problem Statement, first sentence: `AIF-007 settled *who* implements...` → `AIF-PROC-004 settled *who* implements...`
  - Decision → Rationale: `...rather than reusing what AIF-004/ skill/plan-lifecycle already established.` → `...rather than reusing what AIF-PROC-001/ skill/plan-lifecycle already established.`
- Update the one confirmed live-documentation cross-reference found outside `docs/decisions/`: `docs/plans/epics/AIF-001.epic.md` line 45, Out-of-Scope bullet: `AIF-007/AIF-008 (standards-sync ownership/mechanism)` → `AIF-007/AIF-ARCH-004 (standards-sync ownership/mechanism)`. Only the `AIF-008` portion is renamed here — `AIF-007` remains its old ID pending chunk 012, which owns that migration; a temporarily mixed-scheme reference is an expected transitional state across parallel Wave 2 chunks, not a defect (see Section 7, Key Design Decision 3).
- All other body content (Problem Statement's remaining text, Constraints & Requirements, Options Explored, Decision's Chosen approach/Trade-offs, Design, Impact on Planning, Resolved Items) remains byte-for-byte unchanged — the current template's non-Metadata section structure is unmodified by AIF-002-002 (confirmed: "No other section of `template.md` changes"), and AIF-008's existing Design/Impact on Planning content already matches the Architecture domain-guidance shape (`reference/domain-guidance.md`: "Schemas, component boundaries, system-structure diagrams" / "What Tech-Lead must know when decomposing an Epic...") — no rewrite needed to "materially improve" it per the Migration Treatment definition's optional clause.

### Out of Scope

- Any change to `docs/decisions/AIF-007_standards-sync-ownership.decision.md` itself — including its own `Referenced By: AIF-008` field and its three prose mentions of "AIF-008" (Problem Statement, Decision Rationale, Resolved Items #3). That file is chunk AIF-002-012's exclusive migration territory (interlinked Process cluster AIF-004/005/007/009/010) — updating it here would step on a parallel chunk's scope. Chunk 012 is responsible for renaming those AIF-008 mentions to `AIF-ARCH-004` when it lands, using the same fully-determined-ID reasoning this chunk relies on for its own `References` field.
- Editing `docs/decisions/meta-process/AIF-META-001_decision-record-tiering-and-domain-ownership.decision.md`'s own embedded migration table (which contains a superseded `AIF-008`/`AIF-ARCH-004` row using the pre-rev-6 table shape). This is the same class of ambiguity chunk AIF-002-009 raised as its Open Question 1 (editing an already-`Approved` Decision Record's own body, outside the chunk's specific migration target) — not re-raised as a new question here, since it is already open at the Epic level and applies uniformly to every migration chunk, not specifically to this one. This chunk defaults to the same "do not edit" posture chunk 009 took, for consistency.
- Creating or modifying `docs/decisions/index.json` — that is chunk AIF-002-015 (Wave 3), which depends on this chunk (and 009, 010, 012, 013) completing first.
- Any change to `knowledge/index.json` — no such file currently exists in this repo (confirmed, `knowledge/` directory does not exist); its creation is not part of this Epic's in-scope deliverables. The migration table's "`knowledge/index.json`? Yes" column for AIF-008 records that once such a file exists, Architecture-domain decisions (including this one) are proactively loaded into it — it is not an instruction to create the file here.
- Migrating any other decision record (AIF-001–003, AIF-004/005/007/009/010, AIF-006, AIF-011) — chunks 009, 010, 012, 013 respectively, out of this chunk's scope and not dependent on it.
- Renaming the record's own document title heading (`# Decision Record: Standards Push/Pull/Sync Mechanism`) to match the Epic table's shorter "Standards Sync Mechanism" label — this pre-existing wording difference is cosmetic, not part of the ID/Tier/Domain/Metadata migration this chunk performs, and is left as-is (same category of "not retroactively corrected" precedent as AIF-003's `Author (Agent)` field in chunk 009).

---

## 6. Prerequisites

- [x] Epic AIF-002 is `Approved` (rev 6) and decomposed (`chunks.json`, Wave 2, chunk 011 depends only on 002)
- [x] AIF-002-002 (`skill/decision-record` Tier A scoping) reaches `Status: Approved` — verified (`docs/plans/chunks/AIF-002/002_decision-record-tier-a.plan.md`, `Status: Approved`), providing the finalized Metadata field order and the Architecture domain-guidance stub this chunk reformats against. Note: AIF-002-002's _implementation_ (the actual edit to `skills/decision-record/reference/template.md`) may not have landed yet when this chunk is implemented — per `skill/chunk-planning`'s Edge Case guidance ("Dependency chunk not complete — write the plan assuming the dependency's documented interfaces"), this plan is written against AIF-002-002's Approved Plan contract (Section 8/7 there), not against the live file state.
- [x] The source file exists and was read in full during planning: `docs/decisions/AIF-008_standards-sync-mechanism.decision.md`
- [x] Repo-wide grep for `AIF-008` performed and every hit classified (see Section 8 disposition table)
- [ ] This Chunk Plan reaches `Status: Approved` (per `skill/plan-lifecycle`) before any rename/edit is performed

---

## 7. Architecture & Design

### Project Structure Changes

```
docs/decisions/
├── architecture/                                                    (may already exist — chunk 009/010)
│   └── AIF-ARCH-004_standards-sync-mechanism.decision.md             ← MOVED + MODIFIED (from AIF-008_standards-sync-mechanism.decision.md)
├── AIF-004_ai-engineer-framework-code-boundary.decision.md           (unchanged — chunk 012)
├── ... (AIF-005, 006, 007, 009, 010, 011, unchanged — chunks 010/012/013)
└── meta-process/
    └── AIF-META-001_...decision.md                                   (unchanged — see Section 5, Out of Scope)

docs/plans/epics/
└── AIF-001.epic.md                                                   ← MODIFIED (one prose ID mention)
```

### Key Design Decisions

1. **Decision**: Use `git mv` (via `ai-git`) for the rename, in the same commit as the Metadata-table rewrite and prose ID-string edits.
   **Rationale**: Same as AIF-002-009's Key Design Decisions 1–2 — preserves file history across the rename, and avoids a transient inconsistent state (moved file, stale ID/Tier/Domain fields) with no value in being separately committed.

2. **Decision**: Rewrite only the Metadata table and the two inline prose ID citations; leave every other body section byte-for-byte unchanged.
   **Rationale**: The Epic's "Full reformat" treatment requires the template shape (Metadata fields) to be current and permits — but does not require — improving `Design`/`Impact on Planning` content. AIF-008's existing Design and Impact on Planning sections already match the Architecture domain-guidance shape (concrete schema/config detail; what Tech-Lead needs when decomposing an Epic). Rewriting well-formed content that already fits the target shape would be unmotivated churn against an otherwise-approved-in-substance record.

3. **Decision**: In `docs/plans/epics/AIF-001.epic.md`, update only the `AIF-008` half of the compound `AIF-007/AIF-008` mention, leaving `AIF-007` as-is.
   **Rationale**: `AIF-007`'s migration is chunk AIF-002-012's exclusive territory. Updating only the ID this chunk owns avoids reaching into a parallel chunk's scope, while still keeping this chunk's own cross-reference obligation (Epic §3: "grepping the repo for old ID strings... in live documentation") current for AIF-008 specifically. A line with one old-scheme ID and one new-scheme ID for a few commits, until chunk 012 lands, is an accepted transitional state under Wave 2's parallel-dispatch design (Epic §8, "no genuine file dependency prevents" fully parallel Wave 2 execution).

4. **Decision**: Do not add `AIF-PROC-001` (formerly AIF-004) to the `References` metadata field, despite the record's own Decision/Rationale prose citing it.
   **Rationale**: The source record's `References` field has only ever listed `AIF-007`; the prose mention of AIF-004 is an incidental citation, not a field the original author populated. This migration renames existing ID strings wherever found (Metadata field or prose) — it does not audit or expand which records are formally cited in the `References` field, which would be a substantive content judgment outside "Full reformat"'s scope (rename + Tier/Domain/Tags addition + optional Design/Impact improvement).

### Patterns & Conventions Applied

- Migration Treatment definition from Epic AIF-002 §3 ("Full reformat"), applied per its exact wording: rewrite to the current template shape, add `Tier: A` and the resolved `Domain`, no `Draft`→`Approved` round-trip (record is already `Draft`).
- AIF-002-002's (Approved) Metadata field order and Architecture `reference/domain-guidance.md` stub, per Section 6's dependency-contract note.
- `git mv` / atomic-commit pattern established by AIF-002-009 (Key Design Decisions 1–2), reused here for the full-reformat case.
- `skill/plan-lifecycle` commit-gate procedure governs this Chunk Plan itself before implementation begins.

---

## 8. Components

### Decision Record: AIF-ARCH-004 (renamed and reformatted from AIF-008) — Standards Sync Mechanism

**File**: `docs/decisions/architecture/AIF-ARCH-004_standards-sync-mechanism.decision.md`
**Purpose**: Architecture-domain Tier A decision record for the local-filesystem standards push/pull/sync mechanism (unchanged design content, `Draft` status).

**Target Metadata table** (replaces the current 8-field table):

```
| Field | Value |
|---|---|
| Decision ID | AIF-ARCH-004 |
| Project | ai-foundation |
| Tier | A |
| Domain | architecture |
| Status | Draft |
| Author (Agent) | Architect |
| Approved By | Pending |
| Created | 2026-08-13 |
| Referenced By | — |
| References | AIF-PROC-004 |
| Tags | standards-sync, cli, filesystem-sync, config-schema, conflict-detection |
```

**Prose edits applied** (relative to current `docs/decisions/AIF-008_standards-sync-mechanism.decision.md`):

- Problem Statement, sentence 1: `AIF-007 settled *who* implements...` → `AIF-PROC-004 settled *who* implements...`
- Decision → Rationale: `...rather than reusing what AIF-004/ skill/plan-lifecycle already established.` → `...rather than reusing what AIF-PROC-001/ skill/plan-lifecycle already established.`
- No other content changes — Constraints & Requirements, Options Explored (A/B/C), Decision's Chosen approach/Trade-offs accepted, Design (Configuration/Sync state tracking/Conflict rule/New-standard handling/Command surface/Explicit non-goals), Impact on Planning, and Resolved Items all remain byte-for-byte unchanged.

**Dependencies**: None for the rename/edit itself. `References: AIF-PROC-004` depends on AIF-007's new ID being fully determined by the Epic's migration table (it is — see Key Design Decision 1's precedent in AIF-002-009), not on chunk 012's file actually existing yet.

---

### Cross-reference fix: `docs/plans/epics/AIF-001.epic.md`

**File**: `docs/plans/epics/AIF-001.epic.md`
**Purpose**: A different, already-decided Epic's Out-of-Scope section, which lists AIF-008 (alongside AIF-006, AIF-007, AIF-009) as a decision record with its own separate future Epic.

**Current text** (line 45):

```
- AIF-006 (parallel-chunk branch isolation), AIF-007/AIF-008 (standards-sync ownership/mechanism), and AIF-009 (git-workflow mode) — separate Decision Records, separate Epics if/when planned.
```

**New text**:

```
- AIF-006 (parallel-chunk branch isolation), AIF-007/AIF-ARCH-004 (standards-sync ownership/mechanism), and AIF-009 (git-workflow mode) — separate Decision Records, separate Epics if/when planned.
```

**Key behaviour / notes**:

- Only the `AIF-008` token is renamed to `AIF-ARCH-004`; `AIF-006`, `AIF-007`, and `AIF-009` are left as their pre-migration IDs, since those migrations belong to chunks 010, 012, and 012 respectively, not this chunk.
- This is prose, not a hyperlink — no path resolution is at risk (unlike AIF-002-009's `cli-plan.md` case, which corrected a broken relative link). This edit is purely an ID-string rename for grep-discoverability going forward.

**Dependencies**: None (independent, mechanical string edit).

---

### Disposition table — every repo-wide grep hit for `AIF-008`

| File                                                                                                                   | Hit type                                                                                              | Action                                                                                                                    |
| ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `docs/decisions/AIF-008_standards-sync-mechanism.decision.md`                                                          | Decision record itself                                                                                | Rename + reformat (this chunk)                                                                                            |
| `docs/decisions/AIF-007_standards-sync-ownership.decision.md` (3 prose mentions + `Referenced By` field)               | Cross-reference from a sibling record outside this chunk's migration target                           | **Not edited** — chunk AIF-002-012's scope (see Section 5, Out of Scope)                                                  |
| `docs/decisions/meta-process/AIF-META-001_...decision.md` (embedded, superseded migration table)                       | Approved Decision Record's own body, outside this chunk's specific migration target                   | **Not edited** — same class of ambiguity as AIF-002-009's Open Question 1, already open at Epic level, not re-raised here |
| `docs/plans/epics/AIF-002.epic.md` (migration table, Section 10 summary, Work Log)                                     | This Epic's own authoritative planning record, documents pre-migration state by design                | Not rewritten — Epic explicitly notes its own Section 5 table is not rewritten by the migration it describes              |
| `docs/plans/chunks/AIF-002/chunks.json` (chunk 011's own title text quoting "AIF-008")                                 | This chunk's own authoritative decomposition record                                                   | Not rewritten — same rationale as AIF-002-009's disposition table row for its own chunk title text                        |
| `docs/plans/chunks/AIF-002/015_backfill-decisions-index.plan.md` (Prerequisites: "AIF-002-011 ... (AIF-008 migrated)") | Descriptive text about this chunk's own dependency, not a decision-record content reference           | No action — informational cross-chunk reference, not an ID this chunk's migration renames                                 |
| `docs/plans/epics/AIF-001.epic.md` line 45                                                                             | Live-documentation prose reference to the decision record, in a different Epic's Out-of-Scope section | Update (this chunk) — see component above                                                                                 |

---

## 9. Data Models

Not applicable — this chunk is a content/filename migration of an existing Markdown document; no new data model is introduced.

---

## 10. Security Requirements

> This section must never be empty.

- [x] Referential integrity is preserved: the `References: AIF-PROC-004` field (renamed from `AIF-007`) and the record's `Referenced By: —` remain internally consistent after the edit — this is the Epic §6 non-negotiable ("Migration work must preserve referential integrity of existing `Referenced By`/`References` fields... a broken cross-reference during migration is a data-integrity defect, not merely cosmetic"). Verified by the disposition table (Section 8): no other record's `References` field cites AIF-008/AIF-ARCH-004, so `Referenced By: —` is correct both before and after.
- [x] The record's outbound `References` field (`AIF-PROC-004`) must resolve to a real, eventually-existing record once chunk AIF-002-012 lands. Since `AIF-PROC-004` is not the file's current name at the time this chunk runs, this is a forward reference by design (fully determined by the Epic's migration table, per Key Design Decision 1) — not a broken link, but flagged so a future `aif index -d --check` run (chunk 014/015) is expected to validate it only once all of Wave 2 has landed, not immediately after this chunk alone.
- [x] No content beyond the Metadata table, the two prose ID-string renames, and the `AIF-001.epic.md` cross-reference is altered — `Status: Draft`, `Approved By: Pending`, and every Design/Impact-on-Planning/Options-Explored/Resolved-Items detail (including the mechanism's own security-relevant design content — e.g. "must not require network access, hosted PR automation, or cross-repo git credentials," "must detect and refuse silent overwrites") must remain byte-for-byte unchanged, so this migration does not silently alter a security-relevant architectural decision while relabeling it.
- [x] No secrets or credentials are introduced or exposed by this migration (verified by inspection — none present in the source file; the record's own subject matter — sync mechanism design — explicitly rules out cross-repo git credentials as a v1 requirement, and this migration does not touch that content).
- [x] Git history is preserved via `git mv` (through `ai-git`) rather than delete+recreate, so the rename is traceable and does not appear as a content deletion in blame/history.
- [x] This chunk does not touch `docs/decisions/AIF-007_standards-sync-ownership.decision.md` or any other Wave 2 sibling chunk's target file — verified via the disposition table (Section 8) and Key Design Decision 3, guarding against accidental cross-chunk scope bleed during parallel Wave 2 execution.

---

## 11. Logging Requirements

> This section must never be empty.

This chunk produces static Markdown content changes with no runtime/application logging surface (no code is executed). "Logging" here refers to the plan/worklog trail required by steering and `skill/plan-lifecycle`, not application log statements. This record also feeds `knowledge/index.json` once that file exists (Architecture domain is proactively loaded per the Epic's migration table `knowledge/index.json`? = Yes column) and `docs/decisions/index.json` (via chunk 014/015's `aif index -d`) — both are downstream generated-artifact consumers of this record's Metadata table, not something this chunk itself writes to.

| Event                                                                                                            | Level                                  | What is logged                                            | What is NOT logged                       |
| ---------------------------------------------------------------------------------------------------------------- | -------------------------------------- | --------------------------------------------------------- | ---------------------------------------- |
| Chunk Plan committed (`Status: Draft`)                                                                           | Work Log entry (this file, Section 15) | Plan ID, action (`Created`), summary of scope             | No content of the decision record itself |
| Chunk Plan `Approved`/`Deferred`                                                                                 | Work Log entry (this file, Section 15) | Plan ID, action, reviewer name/decision                   | N/A                                      |
| File rename + Metadata/prose edit committed (implementation phase, not this planning chunk)                      | Git commit message                     | Plan ID (`AIF-002-011`), old ID → new ID, file(s) touched | No secrets (none present)                |
| Epic-level Work Log entry noting chunk completion (Epic AIF-002 Section 11, by whichever agent closes the chunk) | Work Log entry                         | Chunk ID, file migrated, disposition-table summary        | N/A                                      |

---

## 12. Testing Plan

This chunk has no executable test suite (Markdown content only). Verification is manual/structural, performed as part of Self-Validation before the chunk is marked `Done`:

| Test ID  | Description                                                                                                                                                                                                                                              | Type                                                              | Pass Criteria                                                                                                                                                 |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M011-T01 | The renamed file exists at its new path and the old path no longer exists                                                                                                                                                                                | Structural (`git status`)                                         | `docs/decisions/architecture/AIF-ARCH-004_standards-sync-mechanism.decision.md` present; `docs/decisions/AIF-008_standards-sync-mechanism.decision.md` absent |
| M011-T02 | Metadata table matches the Section 8 target exactly, in field order                                                                                                                                                                                      | Structural (manual diff)                                          | 11 fields, exact order: Decision ID, Project, Tier, Domain, Status, Author (Agent), Approved By, Created, Referenced By, References, Tags                     |
| M011-T03 | `Decision ID` = `AIF-ARCH-004`; `Tier` = `A`; `Domain` = `architecture`                                                                                                                                                                                  | Structural (manual check)                                         | Exact match                                                                                                                                                   |
| M011-T04 | `References` = `AIF-PROC-004`; `Referenced By` = `—`                                                                                                                                                                                                     | Structural (manual check)                                         | Exact match                                                                                                                                                   |
| M011-T05 | Both inline prose ID citations updated (`AIF-007`→`AIF-PROC-004`, `AIF-004`→`AIF-PROC-001`)                                                                                                                                                              | Structural (grep for literal `AIF-007`/`AIF-004` in the new file) | Zero remaining hits of the old ID strings anywhere in the file                                                                                                |
| M011-T06 | `Status`, `Approved By`, `Author (Agent)`, `Created`, and all body sections (Constraints & Requirements through Resolved Items) unchanged from the pre-migration file                                                                                    | Structural (`git diff` review)                                    | Diff shows only the Metadata-table rewrite and the two prose ID renames                                                                                       |
| M011-T07 | `docs/plans/epics/AIF-001.epic.md` line 45 updated: `AIF-008` → `AIF-ARCH-004`, `AIF-007` unchanged                                                                                                                                                      | Structural (manual diff)                                          | Exact match to Section 8's "New text"                                                                                                                         |
| M011-T08 | Repo-wide grep for the literal string `AIF-008` after implementation shows no remaining decision-record cross-references outside the disposition table's "no action" rows (AIF-007's own file, AIF-META-001, this Epic's/chunk's own planning artifacts) | Structural (grep re-run post-implementation)                      | Only expected rows from Section 8's disposition table remain                                                                                                  |

---

## 13. Documentation Requirements

- [ ] No inline code documentation applicable (Markdown content, not source code)
- [ ] No file headers applicable in the source-code sense; the record's own Metadata table serves this role and is updated per Section 8
- [ ] No README update required — no README references this decision record by old ID (confirmed by the repo-wide grep, Section 8 disposition table)
- [ ] CHANGELOG entry: deferred to Epic-level closeout, consistent with sibling chunk AIF-002-009's precedent (no CHANGELOG entry from an individual migration chunk)

---

## 14. Risks & Open Questions

| #   | Risk / Question                                                                                                                                                                                                                                                                                                 | Impact                                                                                                                                                         | Mitigation                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | This chunk's `References: AIF-PROC-004` field and its `docs/plans/epics/AIF-001.epic.md` edit both name AIF-007's _future_ ID before chunk AIF-002-012 (which actually renames AIF-007's file) has necessarily landed, since Wave 2 chunks are dispatched fully in parallel.                                    | L                                                                                                                                                              | Not a defect — the Epic's own §8 parallelization note establishes that every new ID is already fully determined by the migration table, so no chunk needs to wait for another migration chunk's file to exist to write a correct cross-reference string. If chunk 012 is deferred or its ID mapping changes for any reason, this chunk's forward references would need a follow-up correction — flagged here for visibility, not blocking. |
| 2   | `docs/decisions/meta-process/AIF-META-001_...decision.md`'s own embedded, now-superseded migration table still shows AIF-008 under its pre-rev-6 shape (no Migration Treatment column, no `AIF-ARCH-004` mapping consistent with rev 6's final table).                                                          | M — same as AIF-002-009's Open Question 1; affects discoverability inside an Approved Decision Record, not referential integrity of the migrated record itself | This chunk defaults to **not editing** AIF-META-001, consistent with chunk 009's precedent and its still-open Open Question 1 at the Epic level. Not re-raised as a new, separate open question here — it is the same underlying question, applicable uniformly to every full-reformat migration chunk (010, 011, 012, 013), and resolving it once at the Epic/chunk-009 level resolves it for all of them.                                |
| 3   | The `AIF-001.epic.md` edit (Key Design Decision 3) touches a different, already-decided Epic's historical Out-of-Scope prose — arguably a borderline case of the same "should historical planning artifacts be rewritten" question raised for AIF-META-001, but for an Epic Plan rather than a Decision Record. | L                                                                                                                                                              | Treated as in-scope here (unlike AIF-META-001) because it is not a Decision Record's own content (no content-immutability norm applies the same way) and the edit is a pure ID-string rename with no semantic change to that Epic's actual scope decision. If the human disagrees, this is a one-line, low-cost revert before implementation.                                                                                              |
| 4   | Resolved by Epic OQ8, see docs/plans/epics/AIF-002.epic.md §7                                                                                                                                                                                                                                                   | —                                                                                                                                                              | —                                                                                                                                                                                                                                                                                                                                                                                                                                          |

---

## 15. Work Log

[2026-08-17 00:00] [AI-Engineer] [Created] [AIF-002-011] [Drafted Chunk Plan for the full-reformat migration of AIF-008 ("Standards Sync Mechanism") to AIF-ARCH-004 under `docs/decisions/architecture/`, per Epic AIF-002 §3's "Full reformat (already Draft)" treatment for the Architecture-reclassified record. Read the Epic Plan in full (rev 6, Approved), `chunks.json`, the Approved AIF-002-002 Chunk Plan (finalized Tier A Metadata field order and Architecture domain-guidance stub — dependency contract, since AIF-002-002's implementation may not have landed yet per `skill/chunk-planning`'s Edge Case guidance), the current AIF-008 source record, `skill/chunk-planning`/`reference/template.md`, and `skill/complexity-tiers`. No `knowledge/index.json` exists in this repo yet, so no knowledge-consumption step applied (per global knowledge-consumption steering's stated exception). Assessed complexity as Tier 2 (Standard) per `skill/complexity-tiers` — multi-file rename + full Metadata reformat, following an already-fully-specified Epic pattern (Migration Treatment definitions) and the AIF-002-009 sibling chunk's established rename/edit/disposition-table pattern, not inventing a new one. Performed a repo-wide grep for `AIF-008`, read and classified all 7 hits (disposition table, Section 8): found one genuine live-documentation prose reference needing update (`docs/plans/epics/AIF-001.epic.md` line 45), one cross-chunk boundary correctly left to AIF-002-012 (AIF-007's own file), and one already-open Epic-level ambiguity not re-raised (AIF-META-001's embedded table, covered by AIF-002-009's Open Question 1). Also found and renamed a second inline prose citation this chunk's own scope surfaced (`AIF-004` → `AIF-PROC-001` inside AIF-008's Decision/Rationale text) — a mechanical ID-string rename within the record being migrated, not new scope; not raised as a discovery per global Rule 4's exception for trivial, zero-architectural-impact corrections in a file already being touched. No implementation performed — plan committed as Draft per `skill/plan-lifecycle` Step 1, awaiting human review.]
[2026-08-18] [AI-Engineer] [Revised] [AIF-002-011] [Migrated this Chunk Plan to the reordered template structure approved for skill/chunk-planning: Quick Summary (new Section 3, open-item count derived from the existing Risks & Open Questions table) and Acceptance Criteria (moved from Section 12 to Section 4) now sit immediately after the Goal; all other sections renumbered accordingly (mapping: 3->5, 4->6, 5->7, 6->8, 7->9, 8->10, 9->11, 10->12, 11->13, 13->14, 14->15). Every inline "Section N" cross-reference in this file, including references into the AIF-002 Epic Plan's own renumbered sections, was remapped to match. No wording, decisions, criteria, or risk content was changed - purely structural, per human direction (no active work on these plans at the time of migration).]
[2026-08-18] [Engineering-Manager] [Approved] [AIF-002-011] [Human (Jeremy Smellie) explicitly confirmed in chat that chunks AIF-002-007 through AIF-002-015 are approved. Per skill/plan-lifecycle and engineering-core Rule 8, recorded that decision as a committed status change: `Status` updated from `Draft` to `Approved`, `Reviewed By` updated from `Pending` to `Jeremy Smellie`. No plan content changed. Committed as its own commit, separate from the prior revision history.]
[2026-08-19] [AI-Engineer] [Implemented] [AIF-002-011] [Implemented the full-reformat migration per this Approved plan. Renamed `docs/decisions/AIF-008_standards-sync-mechanism.decision.md` -> `docs/decisions/architecture/AIF-ARCH-004_standards-sync-mechanism.decision.md` via `ai-git mv` (git history preserved). Rewrote the Metadata table to the Tier A contract (added `Tier: A`, `Domain: architecture`, `Tags`; renamed `References` `AIF-007` -> `AIF-PROC-004`). Renamed the two inline prose ID citations specified in Section 8 (`AIF-007` -> `AIF-PROC-004` in Problem Statement; `AIF-004` -> `AIF-PROC-001` in Decision/Rationale). Updated `docs/plans/epics/AIF-001.epic.md`'s Out-of-Scope bullet (`AIF-008` -> `AIF-ARCH-004`, `AIF-007` left unchanged). All other body content confirmed byte-for-byte unchanged via `ai-git diff`. Committed in two increments: rename+reformat (0e8e684), then the epic cross-reference fix (9a9c06f). Ran the disposition-table grep (M011-T08) post-implementation — only expected rows remain (AIF-007's own file, AIF-META-001's superseded table, and planning-artifact self-references). Flagged one discrepancy for review: Section 12's Test M011-T05 pass-criteria text ("Zero remaining hits of the old ID strings anywhere in the file") is broader than Section 5/8's explicit, repeated instruction to rename only the two named prose citations and leave all other body content — including three further `AIF-007` mentions in Options Explored (lines 51/58/65 of the pre-migration file) and two in Impact on Planning (lines 129/130) — byte-for-byte unchanged; followed the more specific Scope/Component instruction and left those five mentions as `AIF-007`, consistent with Key Design Decision 2's explicit rationale. `npm test` run clean (no test-suite content affected — Markdown-only change, no code touched). Ran `worktree-scratch/cwd-reset` self-correction mid-task: an early `ai-git mv` was mistakenly run from the wrong repo root (`ai-foundation` main worktree, branch `main`) due to the bash tool's cwd resetting between calls; caught immediately via `ai-git status` showing `On branch main`, fully reverted (`ai-git restore --staged`/`ai-git restore` + removal of the untracked copy) before any commit was made there, then redone correctly in this worktree with every subsequent command explicitly `cd`-prefixed. No implementation ever landed in the wrong repo. Pushed to `origin/AIF-002/011-migrate-aif-008`. Ready for Principal-Engineer review.]
