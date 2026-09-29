# Chunk Plan: Migrate AIF-001, AIF-002, AIF-003 (Architecture, light-touch)

## 1. Metadata

| Field          | Value                                                                                                                                                                 |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plan ID        | AIF-002-009                                                                                                                                                           |
| Parent Epic    | AIF-002                                                                                                                                                               |
| Chunk          | 9 of 15                                                                                                                                                               |
| Depends On     | None                                                                                                                                                                  |
| Can Parallel   | AIF-002-001, AIF-002-002, AIF-002-003, AIF-002-004, AIF-002-005, AIF-002-006, AIF-002-007, AIF-002-008 (Wave 1 siblings, per `docs/plans/chunks/AIF-002/chunks.json`) |
| Project        | ai-foundation                                                                                                                                                         |
| Status         | Approved                                                                                                                                                              |
| Author (Agent) | AI-Engineer                                                                                                                                                           |
| Reviewed By    | Jeremy Smellie                                                                                                                                                        |
| Created        | 2026-08-14 21:51                                                                                                                                                      |
| Last Updated   | 2026-08-14 21:51                                                                                                                                                      |
| Standards      | ai-foundation declarative-component schemas (AGENTS.md); no code standards apply — this chunk's deliverables are entirely `docs/decisions/` content, per AIF-PROC-001 |

---

## 2. Goal

Migrate the three existing Architecture decision records — AIF-001 ("Install CLI Redesign"), AIF-002 ("Steering Schema & Harness Adapter Scoping"), and AIF-003 ("Shared Resource Lifecycle Management") — to their new domain-scoped IDs (`AIF-ARCH-001`/`002`/`003`) and folder (`docs/decisions/architecture/`), applying the Epic's "Rename + warning (light)" treatment: rename only, insert the old-model warning note, and update cross-references — without rewriting the record bodies to the new Tier/Domain template.

---

## 3. Quick Summary

**Open Items:** 2 open (0 High / 1 Medium / 1 Low) — see Section 14

---

## 4. Acceptance Criteria

- [x] All three files renamed to `docs/decisions/architecture/AIF-ARCH-00{1,2,3}_*.decision.md`
- [x] Each renamed file's `Decision ID` field updated to its new ID
- [x] Each renamed file carries the exact old-model warning note immediately after its Metadata table
- [x] `Referenced By` cross-references between AIF-ARCH-001 and AIF-ARCH-002 are bidirectionally correct; AIF-ARCH-003's remains `—`
- [x] `Status`, `Approved By`, and all body content otherwise unchanged in all three records
- [x] `docs/plans/cli-plan.md`'s link updated to the new ID and a resolving path
- [x] All tests in Section 12 pass (manual/structural verification)
- [x] Security checklist (Section 10) fully satisfied
- [x] Logging checklist (Section 11) — Work Log and commit-message requirements — fully satisfied
- [x] Open Question 1 (Section 14) is either resolved by the human before implementation, or implementation proceeds on the "do not edit AIF-META-001" default with the question left open and noted in the Work Log — human's call
- [ ] Review approved with no CRITICAL or HIGH findings
- [x] This Chunk Plan reaches `Status: Approved` (per `skill/plan-lifecycle`) before any rename/edit is performed (Rule 1)

---

## 5. Scope

### In Scope

- Create `docs/decisions/architecture/` folder.
- Rename and move the three files:
  - `docs/decisions/AIF-001_install-cli-redesign.decision.md` → `docs/decisions/architecture/AIF-ARCH-001_install-cli-redesign.decision.md`
  - `docs/decisions/AIF-002_steering-schema-harness-scoping.decision.md` → `docs/decisions/architecture/AIF-ARCH-002_steering-schema-harness-scoping.decision.md`
  - `docs/decisions/AIF-003_shared-resource-lifecycle-management.decision.md` → `docs/decisions/architecture/AIF-ARCH-003_shared-resource-lifecycle-management.decision.md`
- Update the `Decision ID` field in each record's Metadata table to its new ID.
- Update the `Referenced By` cross-references between the three records:
  - AIF-001 body: `Referenced By | AIF-002` → `Referenced By | AIF-ARCH-002`
  - AIF-002 body: `Referenced By | AIF-001` → `Referenced By | AIF-ARCH-001`
  - AIF-003 body: `Referenced By | —` — unchanged (no incoming reference exists)
- Insert the exact old-model warning note immediately after the Metadata table (before the `---` separator that follows it) in all three records:
  > **Note:** This decision predates the AIF-META-001 Tier × Domain model (approved
  > 2026-08-14) and has not been reformatted to the current template. Its content
  > and Approved status remain valid as historical record.
- Update the one confirmed live-documentation cross-reference found outside `docs/decisions/`: `docs/plans/cli-plan.md` line 3, which links to AIF-001 by old ID and an already-stale path. New link target:
  `docs/decisions/architecture/AIF-ARCH-001_install-cli-redesign.decision.md`, new visible ID text `AIF-ARCH-001`. (The path correction — the existing link points to a path, `decisions/2026-07-31_001_install-cli-redesign.decision.md`, that was already wrong before this migration — is bundled into this edit since the line is being touched anyway for the ID rename; see global Rule 4 exception for trivial corrections with zero architectural impact.)
- `Status`, `Approved By`, `Author (Agent)`, `Created`, and all body content (Problem Statement through Resolved Items / Known Limitations / Open Items) in all three records remain byte-for-byte unchanged except for the two edits above (ID field, warning insert) and the `Referenced By` updates.

### Out of Scope

- Rewriting any of the three records to the new Tier/Domain template — explicitly excluded by the Epic's "Rename + warning (light)" treatment definition (Section 5).
- Retroactively re-authoring AIF-003's `Author (Agent)` field. It was originally authored by AI-Engineer, predating AIF-META-001's domain-ownership model — this is a noted historical inconsistency, not something this chunk corrects.
- Creating or modifying `docs/decisions/index.json` — that is chunk AIF-002-014's scope (Wave 3), which depends on this chunk (and 010–013) completing first so the final IDs are settled.
- Creating or modifying `knowledge/index.json` — no such file currently exists in this repo; its creation is not part of this Epic's in-scope deliverables (the Epic's migration table's "`knowledge/index.json`? Yes" column records which domains _would_ be proactively loaded once such a file exists, not an instruction to create it here).
- Migrating any other decision record (AIF-004 through AIF-011) — Wave 2 chunks (010–013), out of this chunk's scope and not dependent on it.
- Editing `docs/decisions/meta-process/AIF-META-001_decision-record-tiering-and-domain-ownership.decision.md`'s own body (which contains an earlier, superseded migration table using the old AIF-001/002/003 IDs, at its "Migration of existing records" section). Raised as Open Question 1 (Section 14) rather than silently resolved — see rationale there.
- Editing `docs/plans/epics/AIF-001.epic.md` or `docs/plans/tech-lead-subagent-dispatch-plan.md` — both reference `AIF-001` but as the **Epic ID** ("Install CLI Redesign" Epic, a separate numbering scheme per `skill/epic-planning`, explicitly untouched by AIF-META-001 per the Epic Plan's Section 5 note), not the Decision Record ID.
  Confirmed by reading surrounding context in both files (Epic metadata table, Work Log entries, and "AIF-001's scope" prose referring to the Epic).
- Editing `docs/decisions/AIF-011_epic-chunk-colocation-worklog-split.decision.md`'s two `AIF-001` mentions — confirmed by context to reference the **Epic** `AIF-001` (`epics/AIF-001.epic.md`, `chunks/AIF-001/chunks.json` migration), not the Decision Record.
- Editing `docs/plans/chunks/AIF-001/chunks.json`'s `"epic_id": "AIF-001"` — Epic ID, not Decision Record ID.
- Editing any file under `docs/plans/chunks/AIF-002/` or `docs/plans/orchestration/AIF-002/` whose `AIF-002` matches are references to **this Epic's own ID**, not the Decision Record `AIF-002` — confirmed by context (Plan IDs, Epic Section citations, `Parent Epic` fields). `chunks.json`'s own Section-3-derived chunk title text ("Migrate AIF-001, AIF-002, AIF-003...") is the Epic's authoritative decomposition record and is not rewritten either, for the same reason the Epic Plan's own Section 5 migration table is not rewritten (it documents the pre-migration state as a historical/planning artifact).

---

## 6. Prerequisites

- [x] Epic AIF-002 is `Approved` and decomposed (`chunks.json`, Wave 1, chunk 009 has no dependencies)
- [x] The three source files exist and were read in full during planning:
      `docs/decisions/AIF-001_install-cli-redesign.decision.md`, `docs/decisions/AIF-002_steering-schema-harness-scoping.decision.md`, `docs/decisions/AIF-003_shared-resource-lifecycle-management.decision.md`
- [x] Repo-wide grep for `AIF-001`, `AIF-002`, `AIF-003` performed and every hit classified (decision-record cross-reference vs. Epic-ID self-reference vs.
      out-of-tree stale link) — see Section 8 for the full disposition table
- [ ] This Chunk Plan reaches `Status: Approved` (per `skill/plan-lifecycle`)
      before any rename/edit is performed

---

## 7. Architecture & Design

### Project Structure Changes

```
docs/decisions/
├── architecture/                                          ← NEW folder
│   ├── AIF-ARCH-001_install-cli-redesign.decision.md       ← MOVED + MODIFIED (from AIF-001_install-cli-redesign.decision.md)
│   ├── AIF-ARCH-002_steering-schema-harness-scoping.decision.md  ← MOVED + MODIFIED (from AIF-002_steering-schema-harness-scoping.decision.md)
│   └── AIF-ARCH-003_shared-resource-lifecycle-management.decision.md ← MOVED + MODIFIED (from AIF-003_shared-resource-lifecycle-management.decision.md)
├── AIF-004_ai-engineer-framework-code-boundary.decision.md  (unchanged — chunk 012)
├── ... (AIF-005 through AIF-011, unchanged — chunks 010–013)
└── meta-process/
    └── AIF-META-001_decision-record-tiering-and-domain-ownership.decision.md (unchanged — see Open Question 1)

docs/plans/
└── cli-plan.md                                              ← MODIFIED (one link updated)
```

### Key Design Decisions

1. **Decision**: Use `git mv` (via `ai-git`, per this repo's framework git-workflow steering) rather than delete+recreate, for each of the three files.
   **Rationale**: Preserves file history/blame across the rename in a single traceable operation, consistent with how a normal content-preserving rename should be represented in git history.

2. **Decision**: Perform the ID-field edit, the warning insert, and the `Referenced By` edit as part of the same commit as the rename for each file, rather than three separate commits per file.
   **Rationale**: A renamed-but-not-yet-relabeled decision record (ID field still says the old ID after the file has already moved) is a transient inconsistent state with no value in being separately committed — Rule 9 (commit incrementally) is satisfied at the granularity of "one fully-consistent file per commit," which is the natural atomic unit here, not "one edit type per commit."

3. **Decision**: Treat the `docs/plans/cli-plan.md` link-target path correction as bundled into the ID-reference update rather than a separate commit or a separately-raised item.
   **Rationale**: Global Rule 4's exception for trivial, zero-architectural-impact corrections in a file already being touched applies directly — the line is being edited for the ID rename regardless, and the path was already broken before this migration (pointing at a filename/date-prefix scheme that was never the actual file layout).

4. **Decision**: Do not edit AIF-META-001's own body, despite it containing stale `AIF-001`/`AIF-002`/`AIF-003` ID references in its "Migration of existing records" table.
   **Rationale**: See Open Question 1 (Section 14) — raised rather than decided unilaterally, since editing a different, already-`Approved` Decision Record's body is outside this chunk's explicit scope (migrating AIF-001–003 themselves)
   and touches content-immutability norms for approved decision records.

### Patterns & Conventions Applied

- Migration Treatment definition from Epic AIF-002 Section 4 ("Rename + warning (light)"), applied verbatim, including the exact warning note text.
- `skill/plan-lifecycle` commit-gate procedure (Draft → human review → Approved, each a separate commit) governs this Chunk Plan itself before implementation begins.
- Framework repo git-workflow steering (direct commits to `main`, atomic commits, `ai-git` only, incremental commit-per-verified-step) governs the eventual implementation commits (not part of this planning-only chunk).

---

## 8. Components

### Decision Record: AIF-ARCH-001 (renamed from AIF-001) — Install CLI Redesign

**File**: `docs/decisions/architecture/AIF-ARCH-001_install-cli-redesign.decision.md`
**Purpose**: Historical, now-relabeled Architecture decision record for the `aif` CLI's design (unchanged content, Approved status).

**Edits applied** (relative to current `docs/decisions/AIF-001_install-cli-redesign.decision.md`):

- Metadata table: `Decision ID | AIF-001` → `Decision ID | AIF-ARCH-001`
- Metadata table: `Referenced By | AIF-002` → `Referenced By | AIF-ARCH-002`
- Insert warning note immediately after the Metadata table (before the next `---`)
- No other content changes

**Dependencies**: None (independent rename).

---

### Decision Record: AIF-ARCH-002 (renamed from AIF-002) — Steering Schema & Harness Adapter Scoping

**File**: `docs/decisions/architecture/AIF-ARCH-002_steering-schema-harness-scoping.decision.md`
**Purpose**: Historical, now-relabeled Architecture decision record for the steering `file_patterns` schema and harness adapter translation (unchanged content, Approved status).

**Edits applied** (relative to current `docs/decisions/AIF-002_steering-schema-harness-scoping.decision.md`):

- Metadata table: `Decision ID | AIF-002` → `Decision ID | AIF-ARCH-002`
- Metadata table: `Referenced By | AIF-001` → `Referenced By | AIF-ARCH-001`
- Insert warning note immediately after the Metadata table (before the next `---`)
- No other content changes

**Dependencies**: None (independent rename; cross-reference to AIF-ARCH-001 is a string edit only, not a file dependency — AIF-ARCH-001's new ID is already fully determined by the Epic's migration table, per the Epic's own parallelization note in Section 10).

---

### Decision Record: AIF-ARCH-003 (renamed from AIF-003) — Shared Resource Lifecycle Management

**File**: `docs/decisions/architecture/AIF-ARCH-003_shared-resource-lifecycle-management.decision.md`
**Purpose**: Historical, now-relabeled Architecture decision record for the reference-counted manifest design for shared servers/hooks (unchanged content, Approved status).

**Edits applied** (relative to current `docs/decisions/AIF-003_shared-resource-lifecycle-management.decision.md`):

- Metadata table: `Decision ID | AIF-003` → `Decision ID | AIF-ARCH-003`
- `Referenced By | —` — unchanged (no incoming reference)
- Insert warning note immediately after the Metadata table (before the next `---`)
- `Author (Agent) | AI-Engineer` — unchanged (historical inconsistency, not retroactively corrected, per Epic Section 5 Notes column)
- No other content changes

**Dependencies**: None (independent rename).

---

### Cross-reference fix: `docs/plans/cli-plan.md`

**File**: `docs/plans/cli-plan.md`
**Purpose**: Live planning document; line 3 links to the decision record that motivated the CLI's phased implementation.

**Current text** (line 3):

```
Tracks the phased implementation of the `aif` CLI as defined in [AIF-001](decisions/2026-07-31_001_install-cli-redesign.decision.md).
```

**New text**:

```
Tracks the phased implementation of the `aif` CLI as defined in [AIF-ARCH-001](../decisions/architecture/AIF-ARCH-001_install-cli-redesign.decision.md).
```

**Key behaviour / notes**:

- The relative path is corrected from a stale, never-actually-matching filename scheme (`decisions/2026-07-31_001_install-cli-redesign.decision.md`, relative to `docs/plans/`) to the real, post-migration path (`docs/decisions/architecture/AIF-ARCH-001_install-cli-redesign.decision.md`), expressed relative to `docs/plans/cli-plan.md`'s own location (`../decisions/architecture/...`). Verify the relative path resolves correctly from `docs/plans/cli-plan.md`'s actual location before committing.

**Dependencies**: Depends on AIF-ARCH-001's rename landing first (or in the same commit) so the link target exists.

---

### Disposition table — every repo-wide grep hit for `AIF-001`/`AIF-002`/`AIF-003`

| File                                                                      | Hit type                                                                                                                                      | Action                                                                                            |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `docs/decisions/AIF-001_install-cli-redesign.decision.md`                 | Decision record itself                                                                                                                        | Rename + edit (this chunk)                                                                        |
| `docs/decisions/AIF-002_steering-schema-harness-scoping.decision.md`      | Decision record itself                                                                                                                        | Rename + edit (this chunk)                                                                        |
| `docs/decisions/AIF-003_shared-resource-lifecycle-management.decision.md` | Decision record itself                                                                                                                        | Rename + edit (this chunk)                                                                        |
| `docs/plans/cli-plan.md`                                                  | Live doc, stale link to AIF-001 decision record                                                                                               | Update (this chunk)                                                                               |
| `docs/decisions/meta-process/AIF-META-001_...decision.md`                 | Approved decision record's own body — embedded, now-superseded migration table using old IDs AIF-001–003 (and AIF-004–011)                    | **Not edited** — raised as Open Question 1                                                        |
| `docs/plans/epics/AIF-001.epic.md`                                        | Epic ID `AIF-001` (Install CLI Redesign Epic — separate numbering scheme)                                                                     | Not a decision-record reference — no action                                                       |
| `docs/plans/tech-lead-subagent-dispatch-plan.md`                          | "AIF-001's scope" — refers to the Epic                                                                                                        | Not a decision-record reference — no action                                                       |
| `docs/decisions/AIF-011_epic-chunk-colocation-worklog-split.decision.md`  | Two mentions of `AIF-001` — both refer to the Epic (`epics/AIF-001.epic.md`, `chunks/AIF-001/chunks.json`)                                    | Not a decision-record reference — no action                                                       |
| `docs/plans/chunks/AIF-001/chunks.json`                                   | `"epic_id": "AIF-001"`                                                                                                                        | Not a decision-record reference — no action                                                       |
| `docs/plans/epics/AIF-002.epic.md`                                        | This Epic's own Section 5 migration table (documents old→new IDs as the migration source-of-truth) + all other `AIF-002` = this Epic's own ID | Not rewritten — Epic explicitly notes it is not renumbered/rewritten by its own table             |
| `docs/plans/chunks/AIF-002/chunks.json`                                   | Chunk 009's own title text quoting "AIF-001, AIF-002, AIF-003"; all other `AIF-002` = this Epic's own ID                                      | Not rewritten — Epic's authoritative decomposition record, same rationale as the Epic Plan itself |
| `docs/plans/chunks/AIF-002/001_...plan.md` through `008_...plan.md`       | All `AIF-002` hits = this Epic's own ID (`Plan ID: AIF-002-00N`, `Parent Epic: AIF-002`, Section citations)                                   | Not a decision-record reference — no action                                                       |
| `docs/plans/orchestration/AIF-002/orchestration-state.json`               | `AIF-002` = this Epic's own ID                                                                                                                | Not a decision-record reference — no action                                                       |
| `docs/plans/cli-plan.md` (further `AIF-002`/`AIF-003` check)              | None found beyond the one AIF-001 link                                                                                                        | N/A                                                                                               |

---

## 9. Data Models

Not applicable — this chunk is a content/filename migration of existing Markdown documents; no new data model is introduced.

---

## 10. Security Requirements

> This section must never be empty.

- [x] Referential integrity is preserved: every `Referenced By` field updated in this chunk (AIF-ARCH-001 ↔ AIF-ARCH-002) must remain bidirectionally correct after the edit — this is an explicit Epic Section 8 non-negotiable ("Migration work must preserve referential integrity... a broken cross-reference during migration is a data-integrity defect, not merely cosmetic")
- [x] No content beyond the ID field, the warning insert, and the `Referenced By` fields is altered — `Status: Approved` and `Approved By` fields must remain byte-for-byte unchanged, so the records' historical approval provenance is not silently altered
- [x] No secrets or credentials are introduced or exposed by this migration (not applicable to this content, verified by inspection — none present in the three source files)
- [x] The `docs/plans/cli-plan.md` link-target path is verified to actually resolve (file exists at the corrected relative path) before committing — a broken link is a lesser but still real defect this chunk must not introduce
- [x] Git history is preserved via `git mv` (through `ai-git`) rather than delete+recreate, so the rename is traceable and does not appear as a content deletion in blame/history

---

## 11. Logging Requirements

> This section must never be empty.

This chunk produces static Markdown content changes with no runtime/application logging surface (no code is executed). "Logging" here refers to the plan/worklog trail required by steering, not application log statements.

| Event                                                                                                            | Level                                  | What is logged                                            | What is NOT logged                            |
| ---------------------------------------------------------------------------------------------------------------- | -------------------------------------- | --------------------------------------------------------- | --------------------------------------------- |
| Chunk Plan committed (`Status: Draft`)                                                                           | Work Log entry (this file, Section 15) | Plan ID, action (`Created`), summary of scope             | No content of the decision records themselves |
| Chunk Plan `Approved`/`Deferred`                                                                                 | Work Log entry (this file, Section 15) | Plan ID, action, reviewer name/decision                   | N/A                                           |
| Each file rename + edit committed (implementation phase, not this planning chunk)                                | Git commit message                     | Plan ID (`AIF-002-009`), old ID → new ID, file(s) touched | No secrets (none present)                     |
| Epic-level Work Log entry noting chunk completion (Epic AIF-002 Section 11, by whichever agent closes the chunk) | Work Log entry                         | Chunk ID, files migrated, disposition-table summary       | N/A                                           |

---

## 12. Testing Plan

This chunk has no executable test suite (Markdown content only). Verification is manual/structural, performed as part of Self-Validation before the chunk is marked `Done`:

| Test ID  | Description                                                                                                                                                                                  | Type                                                          | Pass Criteria                                                                                                         |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| M009-T01 | Each of the three renamed files exists at its new path and the old path no longer exists                                                                                                     | Structural (manual check via `ls`/`git status`)               | 3 new files present under `docs/decisions/architecture/`; 3 old paths absent                                          |
| M009-T02 | Each renamed file's `Decision ID` metadata field matches its new ID                                                                                                                          | Structural (manual diff)                                      | `AIF-ARCH-001`, `AIF-ARCH-002`, `AIF-ARCH-003` respectively                                                           |
| M009-T03 | Each renamed file contains the exact warning note text immediately after the Metadata table                                                                                                  | Structural (manual diff against the quoted note in Section 5) | Verbatim match, correct placement                                                                                     |
| M009-T04 | `Referenced By` fields are bidirectionally correct: AIF-ARCH-001 references AIF-ARCH-002 and vice versa; AIF-ARCH-003's stays `—`                                                            | Structural (manual cross-check)                               | Matches Section 8 component specs exactly                                                                             |
| M009-T05 | `Status`, `Approved By`, `Author (Agent)`, `Created`, and all body sections are unchanged from the pre-migration files (diff shows only the ID/warning/reference edits)                      | Structural (`git diff` review)                                | No unintended content changes                                                                                         |
| M009-T06 | `docs/plans/cli-plan.md`'s updated link resolves to an existing file                                                                                                                         | Structural (manual path resolution check)                     | Link target file exists at the corrected relative path                                                                |
| M009-T07 | Repo-wide grep for literal strings `AIF-001`, `AIF-002`, `AIF-003` after implementation shows no remaining decision-record cross-references outside the disposition table's "no action" rows | Structural (grep re-run post-implementation)                  | Only expected non-decision-record hits (Epic IDs, this Epic's own table/IDs, AIF-META-001 per Open Question 1) remain |

---

## 13. Documentation Requirements

- [ ] No inline code documentation applicable (Markdown content, not source code)
- [ ] No file headers applicable in the source-code sense; each decision record's existing Metadata table serves this role and is preserved/updated per Section 8
- [ ] No README update required — no README references these decision records by old ID (confirmed by repo-wide grep, Section 8 disposition table)
- [ ] CHANGELOG entry: per Epic AIF-002's own Acceptance Criteria, "Epic-level CHANGELOG entry written (if this repo maintains one — confirm at implementation time)" — this chunk does not write a standalone CHANGELOG entry; deferred to Epic-level closeout, consistent with sibling chunk AIF-002-001's precedent (no CHANGELOG entry from an individual Wave 1 chunk)

---

## 14. Risks & Open Questions

| #   | Risk / Question                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Impact                                                                                                                                                                                                                                                                                  | Mitigation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `docs/decisions/meta-process/AIF-META-001_...decision.md` (an already-`Approved` Decision Record, not one of the three this chunk migrates) contains its own embedded "Migration of existing records" table using the old `AIF-001`/`AIF-002`/`AIF-003` IDs (and AIF-004–011). This table is now superseded in substance by the Epic AIF-002 Section 4 table (which added the Migration Treatment column and differentiated treatment). Should this chunk (or a later one) update AIF-META-001's own ID references for consistency, or is it correctly left as a historical/pre-migration artifact — analogous to why the Epic Plan's own Section 5 table is explicitly _not_ rewritten by the migration it describes? | M — affects whether `AIF-001`/`002`/`003` remain discoverable via grep inside an Approved Decision Record after migration, which could confuse a future reader, but does not affect referential integrity of the migrated records themselves (Section 8's Epic-mandated non-negotiable) | This chunk defaults to **not editing** AIF-META-001, treating it the same as the Epic Plan's own un-rewritten Section 5 table (a historical/planning-time snapshot). Raising to human/Tech-Lead per global Rule 2 (ambiguity → ask) rather than silently deciding either way. If the human wants it updated, it can be done as a small follow-up (either inside this chunk before Approval, or as a separately-raised, trivially-scoped edit — not full reformat, since AIF-META-001 is not in the migration table's scope) |
| 2   | The grep-based discovery in Section 8 cannot be exhaustively guaranteed complete (e.g. binary files, generated artifacts, or files outside the repo's tracked tree are not searched)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | L — the repo-wide grep was run without a file-type filter and returned a manageable, fully-reviewed hit list; residual risk is low                                                                                                                                                      | Re-run the grep (Test M009-T07) after implementation as a final structural check                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 3   | Resolved by Epic OQ8, see docs/plans/epics/AIF-002.epic.md §7                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | —                                                                                                                                                                                                                                                                                       | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

---

## 15. Work Log

[2026-08-14 21:51] [AI-Engineer] [Created] [AIF-002-009] [Drafted Chunk Plan for the light-touch migration of AIF-001, AIF-002, AIF-003 to AIF-ARCH-001/002/003 under `docs/decisions/architecture/`, per Epic AIF-002 Section 4's "Rename + warning (light)" treatment. Assessed complexity as Tier 2 (multi-file rename + cross-reference update, following an already-fully-specified Epic pattern, no new conventions invented) per `skill/complexity-tiers`. Performed a repo-wide grep for `AIF-001`/`AIF-002`/`AIF-003`, read and classified all 20 hits (disposition table in Section 8): found one genuine live-documentation cross-reference outside `docs/decisions/` needing update (`docs/plans/cli-plan.md`, a stale link to AIF-001), and one ambiguous case raised as Open Question 1 rather than silently resolved (AIF-META-001's own embedded, now-superseded migration table). All other hits confirmed to be unrelated Epic-ID (`AIF-001`/`AIF-002` as Epic IDs, a separate numbering scheme) self-references requiring no action. No implementation performed — plan committed as Draft per `skill/plan-lifecycle` Step 1, awaiting human review.]
[2026-08-18] [AI-Engineer] [Revised] [AIF-002-009] [Migrated this Chunk Plan to the reordered template structure approved for skill/chunk-planning: Quick Summary (new Section 3, open-item count derived from the existing Risks & Open Questions table) and Acceptance Criteria (moved from Section 12 to Section 4) now sit immediately after the Goal; all other sections renumbered accordingly (mapping: 3->5, 4->6, 5->7, 6->8, 7->9, 8->10, 9->11, 10->12, 11->13, 13->14, 14->15). Every inline "Section N" cross-reference in this file, including references into the AIF-002 Epic Plan's own renumbered sections, was remapped to match. No wording, decisions, criteria, or risk content was changed - purely structural, per human direction (no active work on these plans at the time of migration).]
[2026-08-18] [Engineering-Manager] [Approved] [AIF-002-009] [Human (Jeremy Smellie) explicitly confirmed in chat that chunks AIF-002-007 through AIF-002-015 are approved. Per skill/plan-lifecycle and engineering-core Rule 8, recorded that decision as a committed status change: `Status` updated from `Draft` to `Approved`, `Reviewed By` updated from `Pending` to `Jeremy Smellie`. No plan content changed. Committed as its own commit, separate from the prior revision history.]
[2026-08-18] [AI-Engineer] [Implemented] [AIF-002-009] [Implemented the approved plan on branch `AIF-002/009-migrate-aif-001-003` in an isolated worktree. Renamed the three files via `git mv` (through `ai-git`) to `docs/decisions/architecture/AIF-ARCH-00{1,2,3}_*.decision.md`; for each, updated the `Decision ID` field, updated `Referenced By` (AIF-ARCH-001 ↔ AIF-ARCH-002 bidirectionally correct; AIF-ARCH-003's remains `—`), and inserted the exact old-model warning note immediately after the Metadata table and before the pre-existing `---` separator — one commit per fully-consistent file, per Section 9 Design Decision 2. Updated `docs/plans/cli-plan.md` line 3's link (ID and path) in a fourth commit; verified the corrected relative path resolves to the renamed AIF-ARCH-001 file. Re-ran the repo-wide grep for `AIF-001`/`AIF-002`/`AIF-003` (Test M009-T07): all hits outside the three migrated records and `cli-plan.md` are Epic-ID self-references or the already-excluded AIF-META-001/AIF-011 cases, consistent with Section 10's disposition table; confirmed AIF-META-001 and AIF-011 were not modified. Open Question 1: proceeded on the plan's default — did not edit AIF-META-001's body; question remains open for the human/Tech-Lead. Self-validated all M009-T01–T07 tests (Section 12) and the Security checklist (Section 10) by manual/structural inspection per this chunk's testing plan (no executable test suite; Test-Engineer skipped for this AI-track chunk per AIF-005/AIF-PROC-002, Approved). No files outside this chunk's three records, `cli-plan.md`, and this plan file itself were touched. Branch pushed for Principal-Engineer review; PR not created by this agent per process.]
