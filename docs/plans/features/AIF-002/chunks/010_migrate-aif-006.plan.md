# Chunk Plan: Migrate AIF-006 to AIF-PROC-003 (Full Reformat, Standalone)

## 1. Metadata

| Field          | Value                                                                                                                                                                                        |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plan ID        | AIF-002-010                                                                                                                                                                                  |
| Parent Epic    | AIF-002                                                                                                                                                                                      |
| Chunk          | 10 of 15                                                                                                                                                                                     |
| Depends On     | AIF-002-002                                                                                                                                                                                  |
| Can Parallel   | AIF-002-011, AIF-002-012, AIF-002-013, AIF-002-014                                                                                                                                           |
| Project        | ai-foundation                                                                                                                                                                                |
| Status         | Approved                                                                                                                                                                                     |
| Author (Agent) | AI-Engineer (self-planned, per AIF-PROC-002/AIF-005 dual-authorship model)                                                                                                                   |
| Reviewed By    | Jeremy Smellie                                                                                                                                                                               |
| Created        | 2026-08-17                                                                                                                                                                                   |
| Last Updated   | 2026-08-17                                                                                                                                                                                   |
| Standards      | AGENTS.md declarative-component schemas — this chunk produces only `docs/decisions/**/*.decision.md` content; no code standards apply (docs-only, per AIF-004/AIF-PROC-001's boundary table) |

---

## 2. Goal

Migrate `AIF-006` ("Parallel Chunk Isolation (Worktrees)", currently `Draft`) to its new domain-scoped identity `AIF-PROC-003` under `docs/decisions/process/`, fully reformatted to the Tier A template finalized in AIF-002-002 — no `Draft`→`Approved` round-trip needed, since the record is already `Draft`.

> Requirement traceability: AIF-002 Epic Plan §3 (migration table row "AIF-006 → AIF-PROC-003, Full reformat (already Draft)") and §8 (Wave 2 decomposition, chunk 010).

---

## 3. Quick Summary

**Open Items:** 3 open (0 High / 0 Medium / 3 Low) — see Section 14

---

## 4. Acceptance Criteria

- [x] `docs/decisions/process/AIF-PROC-003_parallel-chunk-isolation-worktrees.decision.md` exists with the full 11-field Metadata table, `Tier: A`, `Domain: process`, `Status: Draft` (unchanged)
- [x] `docs/decisions/AIF-006_parallel-chunk-branch-isolation.decision.md` no longer exists
- [x] `References` field and Problem Statement prose updated to `AIF-PROC-002`/`AIF-PROC-005` (Test M6-T04)
- [x] `Tags` field populated with judgment-chosen, comma-separated values
- [x] Repo-wide grep for `AIF-006` returns only the explicitly out-of-scope historical/sibling-chunk hits disposed of in Section 7 (Test M6-T05)
- [x] `npm test` passes with no new failures (Test M6-T07)
- [ ] No HIGH or CRITICAL findings open in review
- [x] Plan committed with `Status: Draft`, presented, and `Status: Approved` committed as its own commit before any implementation commit, per `skill/plan-lifecycle`

---

## 5. Scope

### In Scope

- Reformat `docs/decisions/AIF-006_parallel-chunk-branch-isolation.decision.md` into the Tier A template shape finalized by AIF-002-002 (`skills/decision-record/reference/template.md`), writing the result to the new path `docs/decisions/process/AIF-PROC-003_parallel-chunk-isolation-worktrees.decision.md`:
  - New Metadata table with the 11-field contract from AIF-002-002 (`Decision ID, Project, Tier, Domain, Status, Author (Agent), Approved By, Created, Referenced By, References, Tags`).
  - `Decision ID: AIF-PROC-003`, `Tier: A`, `Domain: process`.
  - `Status: Draft` (unchanged — no round-trip; this record was never `Approved`).
  - `Author (Agent)`, `Approved By`, `Created` carried over unchanged from the original record (`Architect`, `Pending`, `2026-08-13`) — historical authorship facts are not rewritten by migration, same precedent as AIF-003's "originally authored by AI-Engineer, predating AIF-META-001... note only, no retroactive re-authorship" (Epic §3 table).
  - `References` updated to the new ID scheme per the Epic's migration table: `AIF-005` → `AIF-PROC-002`, `AIF-009` → `AIF-PROC-005`. Both target IDs are already fixed by the Epic's migration table (§3), so this does not require AIF-002-012 (which owns migrating AIF-005/AIF-009) to have landed first.
  - `Referenced By` stays `—` — confirmed by grep (Section 7, Key Design Decision 3) that no other current record's `References` field cites `AIF-006`.
  - `Tags` (new field, author's judgment per AIF-002-002's template contract): `worktrees, orchestration, parallel-dispatch, chunk-isolation, git`.
  - Body content (Problem Statement, Constraints & Requirements, Options Explored, Decision, Design, Impact on Planning, Resolved Items) carried over unchanged in substance, **except**: the Problem Statement's two inline prose citations of `AIF-005`/`AIF-009` are updated to `AIF-PROC-002`/`AIF-PROC-005` for the same referential-integrity reason as the `References` field (Epic §6: "a broken cross-reference during migration is a data-integrity defect, not merely cosmetic").
  - Title line and section structure otherwise unchanged — this is a full-reformat migration, not a content rewrite; the Design/Impact on Planning sections already match the Process-domain guidance framing from AIF-002-002's `reference/domain-guidance.md` (dispatch/sequencing rationale), so no additional content is added there beyond the ID fix.
- Delete the old file `docs/decisions/AIF-006_parallel-chunk-branch-isolation.decision.md` once the new file is committed (rename, not copy-and-leave-both).
- Create `docs/decisions/process/` if it does not already exist (a side effect of writing the first file into it — idempotent, and safe to run concurrently with AIF-002-012, which also writes into this same folder from a separate worktree, since both add distinct filenames).
- Grep the repo for the literal string `AIF-006` and evaluate every hit for whether it is a live, functioning cross-reference that must be updated versus a historical citation that is not rewritten (see Section 7, Key Design Decision 3, for the full list of hits found and the disposition of each).

### Out of Scope

- Updating `AIF-005`'s or `AIF-009`'s own Metadata tables (their `Referenced By` fields, where applicable) — those records belong to AIF-002-012 (the interlinked Process cluster chunk), which is responsible for both their own reformat and any `Referenced By` bookkeeping when it migrates them. Confirmed by inspection (Section 7, Key Design Decision 3) that `AIF-005`'s current `Referenced By` field does not list `AIF-006` even today, so this is a pre-existing gap, not one this chunk introduces — and it self-heals once AIF-002-015 runs `aif index -d`, which computes `referenced_by` by inversion across the whole corpus rather than trusting any record's hand-written field.
- Rewriting `AIF-META-001`'s Design-section prose (line 28: "...process/orchestration decisions (AIF-005, AIF-006, AIF-009, AIF-010)...") — this is a historical citation used as motivating evidence at the time `AIF-META-001` was authored/approved, not a live cross-reference; `AIF-META-001` is itself outside the migration table's scope (it already carries a domain-scoped ID and is not one of the 11 records being migrated). Treated the same as the Epic's own "commit messages are historical, not rewritten" carve-out in spirit — see Key Design Decision 3.
- Rewriting `AIF-002.epic.md`'s own migration table or `chunks.json`'s chunk-10 title, both of which cite `AIF-006` by design (they document the old→new ID mapping itself) — rewriting these would destroy the record of what was migrated from what, not preserve it.
- Rewriting `AIF-001.epic.md` line 45 (a different, already-completed Epic's retrospective "separate Decision Records, separate Epics if/when planned" note) — historical planning artifact, not live guidance an agent currently follows.
- Any change to `skills/decision-record/`, `skills/decision-triage/`, or any other skill — this chunk consumes AIF-002-002's finalized template; it does not modify it.
- Running or building `aif index -d` — that tool does not exist yet (AIF-002-014, parallel Wave 2 chunk) and this chunk does not depend on it; index generation/backfill is AIF-002-015's job.
- `.aiconfig.json` `paths.decisions` — this chunk writes to the existing conventional path `docs/decisions/` directly (AIF-002-008, parallel Wave 1 chunk, adds the explicit config entry; this chunk does not block on it, matching the precedent set in AIF-002-002 Out of Scope).

---

## 6. Prerequisites

- [x] AIF-002 Epic Plan `Status: Approved` (rev 6) — verified, §3 migration table and §8 Wave 2 decomposition
- [x] AIF-002-002 (`skill/decision-record` Tier A scoping) `Status: Approved` — verified, provides the finalized 11-field Metadata table contract and per-domain guidance stub this chunk reformats against
- [x] Current `docs/decisions/AIF-006_parallel-chunk-branch-isolation.decision.md` read and understood in full
- [x] Repo-wide grep for `AIF-006` run and every hit evaluated (Section 7, Key Design Decision 3)
- [x] No blocking dependency on AIF-002-009/011/012/013/014 — all Wave 2/adjacent chunks touch disjoint files (confirmed: none of them write to `docs/decisions/process/AIF-PROC-003_*` or edit `docs/decisions/AIF-006_*`)

---

## 7. Architecture & Design

### Project Structure Changes

- `docs/decisions/AIF-006_parallel-chunk-branch-isolation.decision.md` ← DELETED
- `docs/decisions/process/` ← NEW (folder, if not already created by a concurrently-dispatched sibling chunk)
- `docs/decisions/process/AIF-PROC-003_parallel-chunk-isolation-worktrees.decision.md` ← NEW

### Key Design Decisions

1. **Decision**: `Author (Agent)`, `Approved By`, and `Created` are carried over unchanged from the original record rather than reset to reflect the migrating agent or migration date.
   **Rationale**: The Epic's migration-treatment definition for "Full reformat" only calls for rewriting the record to the current template shape and adding `Tier`/`Domain` — it does not direct reassigning historical authorship. This matches the explicit precedent already set for AIF-003 in the Epic's own migration table ("Originally authored by AI-Engineer, predating AIF-META-001. Historical inconsistency — note only, no retroactive re-authorship").

2. **Decision**: `Tags` value (`worktrees, orchestration, parallel-dispatch, chunk-isolation, git`) is chosen by this chunk's own judgment at migration time.
   **Rationale**: `Tags` is a free-text, author-judgment field per AIF-002-002's template contract (Epic rev 6, Open Question 6) — there is no controlled vocabulary to derive it from. Chosen to reflect the record's actual subject matter for future cross-domain discovery via `docs/decisions/index.json` (AIF-002-015).

3. **Decision**: Scope the repo-wide `AIF-006` grep sweep to _live, functioning cross-references_ only — not historical citations in other Epic/Decision-Record prose that exist specifically to document what happened.
   **Rationale, with full disposition of every hit found** (`grep -r "AIF-006"` across the repo, 7 files):
   - `docs/decisions/AIF-006_parallel-chunk-branch-isolation.decision.md` — the record itself. **In scope** (this is the migration).
   - `docs/decisions/AIF-009_git-workflow-mode.decision.md` (Metadata table, `Referenced By: AIF-006, AIF-007`) — a live cross-reference, but it lives inside a record owned by AIF-002-012 (the interlinked Process cluster chunk), not this chunk. **Out of scope for this chunk** — flagged for AIF-002-012 to update when it reformats AIF-009. Confirmed non-blocking: even if AIF-002-012 lands before or after this chunk, `aif index -d` (AIF-002-014/015) computes `referenced_by` by inversion across the whole corpus at backfill time, so a temporarily-stale hand-written field in AIF-009 does not produce an incorrect final `index.json` — it only affects the human-readable table inside AIF-009's own file until AIF-002-012 updates it, same as AIF-005's own pre-existing gap discovered here (AIF-005's `Referenced By` today already omits AIF-006, despite AIF-006 citing it — a pre-existing inconsistency this chunk did not create and is not the chunk to fix).
   - `docs/decisions/meta-process/AIF-META-001_decision-record-tiering-and-domain-ownership.decision.md` (Design-section prose, line 28) — a historical citation ("decision-authorship has so far defaulted to Architect for process/orchestration decisions (AIF-005, AIF-006, AIF-009, AIF-010)") documenting the state of the repo _at the time AIF-META-001 was authored_, used as evidence for the decision it made. `AIF-META-001` is `Approved` and is not itself one of the 11 records in the Epic's migration table (it already has a domain-scoped ID). Rewriting `Approved` content to update a historical illustration is out of this chunk's scope and would require its own reformat/re-approval cycle if ever done — not implied by "migrate AIF-006." **Out of scope.**
   - `docs/plans/epics/AIF-002.epic.md` (the migration table itself, plus the Work Log narrative) — cites `AIF-006` by design, to document the old→new mapping. **Out of scope** — rewriting this would destroy, not preserve, the migration record.
   - `docs/plans/chunks/AIF-002/chunks.json` (chunk 010's own title, `"Migrate AIF-006 (Draft, Process, full reformat, standalone)"`) — same reasoning; this is the chunk's own historical label. **Out of scope.**
   - `docs/plans/chunks/AIF-002/015_backfill-decisions-index.plan.md` (its own Prerequisites/Acceptance-Criteria checklist item, `"AIF-002-010 Status: Approved and implemented (AIF-006 migrated)"`) — a sibling chunk plan's own tracking language, not this chunk's file to edit. **Out of scope.**
   - `docs/plans/epics/AIF-001.epic.md` (line 45, a different completed Epic's retrospective note) — historical planning artifact from an unrelated, already-closed Epic. **Out of scope.**

   This means the practical effect of the grep sweep for this chunk is: **no live document outside `docs/decisions/` requires editing** — the only in-scope edit is the record's own migration. This is recorded transparently here (rather than silently narrowing the Epic's "grep the repo... in live documentation and skills" bullet) because the Epic's own Section 10 revisit claimed AIF-006 has "no cross-reference coupling to that cluster or each other" (§8, migration-chunk grouping rationale) — which this chunk found to be **not quite accurate**: AIF-006 does reference AIF-005/AIF-009 (its own `References` field), and AIF-009 does reference AIF-006 back (`Referenced By: AIF-006, AIF-007`). This does not change any chunk boundary or introduce blocking work, since (a) all new IDs are already fixed by the Epic's migration table regardless of execution order, and (b) `aif index -d`'s inversion-based computation makes the final `index.json` correct regardless of any transient staleness in a hand-written field — so this is noted here as a factual correction for traceability, not escalated as a new Epic-level Open Question per Rule 4, since it does not require any work beyond what this chunk plan already scopes.

### Patterns & Conventions Applied

- AIF-002-002's finalized Tier A Metadata-table contract (field names, order, `process` domain-folder value) — applied verbatim, no deviation.
- The "Full reformat" migration-treatment definition from AIF-002 Epic Plan §3 — applied without the `Draft`→`Approved` round-trip step, since the source record's `Status` is already `Draft` (per the Epic's own explicit carve-out: "Records already `Draft` (AIF-006, AIF-007, AIF-008, AIF-009) are reformatted directly with no status round-trip needed").
- `skill/plan-lifecycle` commit-gate procedure for this Chunk Plan itself (Draft → human confirmation → Approved), separate from the decision record's own (already-`Draft`, unchanged) status.

---

## 8. Components

### `docs/decisions/process/AIF-PROC-003_parallel-chunk-isolation-worktrees.decision.md` — migrated record

**File**: `docs/decisions/process/AIF-PROC-003_parallel-chunk-isolation-worktrees.decision.md`
**Purpose**: The reformatted Tier A, Process-domain Decision Record ratifying git worktrees as the parallel-chunk-isolation mechanism, replacing `AIF-006` under its new domain-scoped identity.

**Key Behaviour**:

- Metadata table follows the exact 11-field shape and order from AIF-002-002 §6/§7:

  | Field          | Value                                                             |
  | -------------- | ----------------------------------------------------------------- |
  | Decision ID    | AIF-PROC-003                                                      |
  | Project        | ai-foundation                                                     |
  | Tier           | A                                                                 |
  | Domain         | process                                                           |
  | Status         | Draft                                                             |
  | Author (Agent) | Architect                                                         |
  | Approved By    | Pending                                                           |
  | Created        | 2026-08-13                                                        |
  | Referenced By  | —                                                                 |
  | References     | AIF-PROC-002, AIF-PROC-005                                        |
  | Tags           | worktrees, orchestration, parallel-dispatch, chunk-isolation, git |

- Problem Statement's two inline citations updated: "AIF-005 confirmed..." → "AIF-PROC-002 confirmed...", "AIF-009 confirmed..." → "AIF-PROC-005 confirmed...".
- All other sections (Constraints & Requirements, Options Explored A-D, Decision, Design, Impact on Planning, Resolved Items) carried over verbatim — no substantive content change, per the "full reformat" (not "content rewrite") treatment.

**Dependencies**:

- `skills/decision-record/reference/template.md` (AIF-002-002) — the Metadata-table contract this migration conforms to.
- `skills/decision-record/reference/domain-guidance.md` (AIF-002-002) — confirms the record's existing Design/Impact on Planning framing already matches Process-domain guidance; no additional content needed.

### `docs/decisions/AIF-006_parallel-chunk-branch-isolation.decision.md` — removed

**File**: `docs/decisions/AIF-006_parallel-chunk-branch-isolation.decision.md`
**Purpose**: Superseded by the migrated file above; deleted as part of this chunk (rename, not copy-and-retain).

---

## 9. Data Models

### Decision Record Metadata (post-migration instance)

**Purpose**: The concrete field values `AIF-PROC-003` carries after migration, conforming to AIF-002-002's contract.

| Field          | Type            | Required | Notes                                                                                                    |
| -------------- | --------------- | -------- | -------------------------------------------------------------------------------------------------------- |
| Decision ID    | string          | Yes      | `AIF-PROC-003` (new)                                                                                     |
| Project        | string          | Yes      | `ai-foundation` (unchanged)                                                                              |
| Tier           | string          | Yes      | `A` (new field, added by this migration)                                                                 |
| Domain         | string          | Yes      | `process` (new field, added by this migration)                                                           |
| Status         | string          | Yes      | `Draft` (unchanged — no round-trip needed)                                                               |
| Author (Agent) | string          | Yes      | `Architect` (unchanged, historical)                                                                      |
| Approved By    | string          | Yes      | `Pending` (unchanged)                                                                                    |
| Created        | datetime string | Yes      | `2026-08-13` (unchanged, historical)                                                                     |
| Referenced By  | string          | Yes      | `—` (unchanged — confirmed no live citation exists)                                                      |
| References     | string          | Yes      | `AIF-PROC-002, AIF-PROC-005` (updated from `AIF-005, AIF-009`)                                           |
| Tags           | string          | No       | `worktrees, orchestration, parallel-dispatch, chunk-isolation, git` (new field, added by this migration) |

---

## 10. Security Requirements

> This section must never be empty.

- [ ] All external inputs validated before use — N/A, this chunk edits static markdown content only; no external input is parsed or executed.
- [ ] No secrets or credentials in source code or logs — verified; no credential-shaped content exists in or is introduced to this record.
- [ ] Errors exposed to users contain no internal system details — N/A, no runtime error paths (documentation only).
- [ ] Referential integrity of `References`/`Referenced By` fields is preserved across the migration — verified via Section 7 Key Design Decision 3's full grep disposition: `References` correctly updated to the new IDs (`AIF-PROC-002`, `AIF-PROC-005`), `Referenced By` correctly left at `—` (no live citation found), and the one known cross-reference this chunk does _not_ own (AIF-009's `Referenced By` field, still reading `AIF-006`) is explicitly flagged for AIF-002-012 rather than silently left inconsistent with no owner. This satisfies AIF-002 Epic Plan §6's requirement that "a broken cross-reference during migration is a data-integrity defect, not merely cosmetic."
- [ ] `Status: Draft` is not accidentally flipped to `Approved` during reformat — verified; this record requires no round-trip (Epic §3 explicit carve-out for already-`Draft` records), so `Status` is copied unchanged, not touched by any commit-gate re-confirmation step.
- [ ] No `WebSearch`/`WebFetch` grant or agent tool-grant change is introduced or implied by this chunk — this chunk does not touch any agent config file at all (verified; out of scope, Section 5).

---

## 11. Logging Requirements

> This section must never be empty.

This chunk produces only a static documentation artifact (a migrated Decision Record) — it introduces no runtime software component, so there is no application log stream to define events for. The Decision Record template itself (per AIF-002-002) has no Work Log section of its own (unlike Epic/Chunk Plans), so no in-file logging convention applies to the migrated record either. The applicable logging requirements are the ones already mandated by `skill/plan-lifecycle`'s Work Log convention, for this Chunk Plan document:

| Event                                           | Level (Work Log equivalent)     | What is logged                                                         | What is NOT logged                                         |
| ----------------------------------------------- | ------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------- |
| Chunk Plan Draft committed                      | Work Log entry, this file's §14 | Timestamp, Agent, Action=`Created`, Plan ID, one-line summary          | Full migrated-record content duplicated into the log entry |
| Chunk Plan Approved/Deferred                    | Work Log entry, this file's §14 | Timestamp, Agent, Action=`Approved`/`Deferred`, Plan ID, approver name | —                                                          |
| Migration implementation commit (post-approval) | Git commit message              | Plan ID (`AIF-002-010`), old ID (`AIF-006`), new ID (`AIF-PROC-003`)   | Token values, credentials (N/A — none touched)             |

---

## 12. Testing Plan

This chunk has no executable code — "testing" here means self-validation of the migrated markdown artifact.

### `AIF-PROC-003` Migration Tests

| Test ID | Description                                                                                                                                                                                   | Type                 | Pass Criteria                                                                                                                                                                           |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M6-T01  | New file exists at `docs/decisions/process/AIF-PROC-003_parallel-chunk-isolation-worktrees.decision.md`                                                                                       | Manual/self-validate | File present, old `docs/decisions/AIF-006_*.decision.md` no longer present                                                                                                              |
| M6-T02  | Metadata table matches Section 8/7's 11-field contract exactly (field names, order)                                                                                                           | Manual/self-validate | Diff against AIF-002-002's template shows no discrepancy                                                                                                                                |
| M6-T03  | `Decision ID` (`AIF-PROC-003`) and `Domain` (`process`) agree — Domain Code embedded in the ID matches the Domain field's folder name                                                         | Manual/self-validate | `PROC` ↔ `process` consistent, per AIF-002-002's Key Behaviour rule                                                                                                                     |
| M6-T04  | `References` field and Problem Statement prose both cite `AIF-PROC-002`/`AIF-PROC-005`, not the old `AIF-005`/`AIF-009` strings                                                               | Manual/self-validate | Grep for `AIF-005` and `AIF-009` inside the new file returns zero hits                                                                                                                  |
| M6-T05  | No other in-scope live document still contains the string `AIF-006` after this chunk (per Section 7's disposition — records/plans explicitly marked out of scope are the only remaining hits) | Manual/self-validate | Repo-wide grep for `AIF-006` returns only the disposition list from Section 7 (AIF-009, AIF-META-001, AIF-002.epic.md, chunks.json, 015 plan, AIF-001.epic.md) — no new/unaccounted hit |
| M6-T06  | `Status` remains `Draft`; `Author (Agent)`/`Approved By`/`Created` remain unchanged from the original record                                                                                  | Manual/self-validate | Byte-for-byte match against the pre-migration values for those four fields                                                                                                              |
| M6-T07  | `npm test` (repo-wide validation suite) still passes after this change                                                                                                                        | Automated            | Exit code 0, no new failures introduced                                                                                                                                                 |

---

## 13. Documentation Requirements

- [ ] Inline documentation on all public members — N/A (markdown decision record, not source code)
- [ ] File headers on all new source files — N/A per Rule 2's own scope ("source files"); this is a docs artifact. The record's own `Decision ID`/`Created` Metadata-table row plus this Chunk Plan's Work Log entry (§14) provide Plan ID traceability, consistent with how AIF-002-002 treated its own new reference file.
- [ ] README updated if user-facing — N/A, no README references this record's old or new ID
- [ ] CHANGELOG entry written — to confirm at Epic-level sign-off per AIF-002 Acceptance Criteria (whether this repo maintains one); not duplicated per chunk

---

## 14. Risks & Open Questions

| #   | Risk / Question                                                                                                                                                                                                                                                                        | Impact | Mitigation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Epic §8's chunk-grouping rationale states AIF-006 has "no cross-reference coupling" to the interlinked Process cluster, but AIF-006 actually cites AIF-005/AIF-009, and AIF-009 cites AIF-006 back.                                                                                    | L      | Documented transparently in Section 7, Key Design Decision 3, as a factual correction. Does not change any chunk boundary, dependency, or introduce blocking work — all new IDs are pre-fixed by the Epic's migration table, and `aif index -d`'s inversion-based computation (AIF-002-014/015) makes the final `index.json` correct regardless of hand-written-field staleness in AIF-009 until AIF-002-012 updates it. Not escalated as a new Epic-level Open Question per Rule 4, since no additional work is required beyond what is already scoped here and in AIF-002-012. |
| 2   | The Epic's "grep the repo for old ID strings... in live documentation and skills" bullet is ambiguous about whether it includes other Epic Plans'/Decision Records' own historical citations of the old ID (e.g. AIF-META-001's Design-section prose, the Epic's own migration table). | L      | Resolved via delegated judgment (global Rule 2 exception): scoped the sweep to live, functioning cross-references only, with the full disposition of every grep hit documented in Section 7. If the human disagrees with this scoping when reviewing this Draft plan, it is a one-line adjustment before implementation begins — no implementation has started under this assumption.                                                                                                                                                                                            |
| 3   | AIF-002-012 (interlinked Process cluster) has not yet landed at the time this chunk may execute, so AIF-009's `Referenced By` field will temporarily still read `AIF-006` instead of `AIF-PROC-003` until AIF-002-012 runs.                                                            | L      | Non-blocking by design (Section 7) — `aif index -d`'s corpus-wide inversion (AIF-002-015) is the actual source of truth for `index.json`'s `referenced_by`, not any individual record's hand-written field. Flagged for AIF-002-012's own scope, not this chunk's to fix.                                                                                                                                                                                                                                                                                                        |
| 4   | Resolved by Epic OQ8, see docs/plans/epics/AIF-002.epic.md §7                                                                                                                                                                                                                          | —      | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

---

## 15. Work Log

[2026-08-17] [AI-Engineer] [Created] [AIF-002-010] [Drafted Chunk Plan migrating AIF-006 ("Parallel Chunk Isolation (Worktrees)", Draft) to AIF-PROC-003 under docs/decisions/process/, full reformat per AIF-002 Epic Plan §3's migration table (no Draft→Approved round-trip needed, since the source record is already Draft). Read AIF-002 Epic Plan (rev 6, Approved) in full, chunks.json, AIF-002-002 (Approved — the finalized Tier A template/domain-guidance contract this migration conforms to), the current AIF-006 record, skill/chunk-planning, skill/complexity-tiers, and confirmed no knowledge/index.json exists in this repo. Assessed complexity as Tier 2 (Standard) per skill/complexity-tiers — a template-driven single-record reformat following an already-established, human-approved pattern (AIF-002-002's finalized contract), not inventing a new one. Ran a repo-wide grep for "AIF-006" and disposed of every hit (Section 7, Key Design Decision 3): the record itself (in scope), AIF-009's Referenced By field (out of scope — owned by AIF-002-012), AIF-META-001's historical Design-section citation (out of scope — Approved record, historical evidence, not itself a migration-table entry), and four planning-artifact citations (AIF-002.epic.md's own migration table, chunks.json's chunk-10 title, AIF-002-015's checklist item, AIF-001.epic.md's retrospective note — all out of scope, since rewriting them would destroy rather than preserve the migration record). Noted, but did not escalate as a new Epic-level Open Question per Rule 4, a minor factual inaccuracy in Epic §8's chunk-grouping rationale ("AIF-006... has no cross-reference coupling to that cluster") — AIF-006 does reference AIF-005/AIF-009 and is referenced back by AIF-009 — since this does not change any chunk boundary or introduce new blocking work (all IDs are pre-fixed by the migration table; aif index -d's inversion-based computation self-heals any transient hand-written-field staleness). Not yet presented for human review.]
[2026-08-18] [AI-Engineer] [Revised] [AIF-002-010] [Migrated this Chunk Plan to the reordered template structure approved for skill/chunk-planning: Quick Summary (new Section 3, open-item count derived from the existing Risks & Open Questions table) and Acceptance Criteria (moved from Section 12 to Section 4) now sit immediately after the Goal; all other sections renumbered accordingly (mapping: 3->5, 4->6, 5->7, 6->8, 7->9, 8->10, 9->11, 10->12, 11->13, 13->14, 14->15). Every inline "Section N" cross-reference in this file, including references into the AIF-002 Epic Plan's own renumbered sections, was remapped to match. No wording, decisions, criteria, or risk content was changed - purely structural, per human direction (no active work on these plans at the time of migration).]
[2026-08-18] [Engineering-Manager] [Approved] [AIF-002-010] [Human (Jeremy Smellie) explicitly confirmed in chat that chunks AIF-002-007 through AIF-002-015 are approved. Per skill/plan-lifecycle and engineering-core Rule 8, recorded that decision as a committed status change: `Status` updated from `Draft` to `Approved`, `Reviewed By` updated from `Pending` to `Jeremy Smellie`. No plan content changed. Committed as its own commit, separate from the prior revision history.]
[2026-08-19] [AI-Engineer] [Implemented] [AIF-002-010] [Wrote `docs/decisions/process/AIF-PROC-003_parallel-chunk-isolation-worktrees.decision.md` per Section 10's exact field values (11-field Metadata table, Tier A, Domain process, Status Draft unchanged, Author/Approved By/Created carried over unchanged, References updated to AIF-PROC-002/AIF-PROC-005, Tags per Section 7 Key Design Decision 2), and removed the old `docs/decisions/AIF-006_parallel-chunk-branch-isolation.decision.md` (git detects this as a rename given identical body content). Self-validated all Section 12 tests: M6-T01 (new file present, old file absent) through M6-T06 (Status/Author/Approved By/Created byte-for-byte unchanged) confirmed by direct file inspection; M6-T07 confirmed via `npm test` — 490/490 passing, no new failures. Repo-wide grep for `AIF-006` returns only the Section 7 disposition list (AIF-009 Referenced By, AIF-META-001 historical prose, AIF-002.epic.md migration table, chunks.json, 015 plan checklist item, AIF-001.epic.md, plus this chunk's own plan file and sibling chunk plans 011/012 which cite AIF-006 by design as cross-references to this chunk) — no unaccounted hit. Checked off Acceptance Criteria and Prerequisites boxes verified true by this work; left "No HIGH or CRITICAL findings open in review" unchecked pending Principal-Engineer review. No scope expansion beyond Section 5/7. Trivial correction (global-core Rule 4 exception, zero architectural impact): found a third AIF-005/AIF-009 occurrence in the Problem Statement's closing sentence ("now that AIF-004/AIF-005/AIF-009 make concurrent orchestrated work... a live path") that Section 8's "two inline citations" description hadn't called out, but which caused a literal grep-based failure of Test M6-T04's stated pass criteria ("Grep for AIF-005 and AIF-009 inside the new file returns zero hits"). Updated that occurrence's AIF-005/AIF-009 to AIF-PROC-002/AIF-PROC-005 for consistency with the other two citations and to satisfy the test's literal criteria; left AIF-004 in the same sentence untouched (out of this chunk's scope, owned by AIF-002-012). Re-verified M6-T04 grep returns zero hits after this correction. Committing and pushing for review.]
