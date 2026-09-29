# Chunk Plan: Add the `Amending` Status and Its Two Transitions to `status-vocabulary.md`

## 1. Metadata

| Field          | Value                                                                                                                                                                                      |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Plan ID        | AIF-003-004                                                                                                                                                                                |
| Parent Epic    | AIF-003                                                                                                                                                                                    |
| Chunk          | 4 of 8                                                                                                                                                                                     |
| Depends On     | None                                                                                                                                                                                       |
| Can Parallel   | AIF-003-001, AIF-003-003, AIF-003-005 (wave 1)                                                                                                                                             |
| Project        | ai-foundation                                                                                                                                                                              |
| Status         | Approved                                                                                                                                                                                   |
| Author (Agent) | AI-Engineer                                                                                                                                                                                |
| Reviewed By    | Pending                                                                                                                                                                                    |
| Created        | 2026-08-25                                                                                                                                                                                 |
| Last Updated   | 2026-08-25                                                                                                                                                                                 |
| Standards      | AGENTS.md skill-authoring schemas; no language/stack standards apply (documentation-only change to a reference file inside `skills/plan-lifecycle`). AI-Engineer track per `AIF-PROC-001`. |

---

## 2. Goal

Add `Amending` — a `Status` value scoped to Decision Records only — and its two new transitions (`Approved` → `Amending`, `Amending` → `Approved`) to `skills/plan-lifecycle/reference/status-vocabulary.md`, reproducing `AIF-META-002` Design → Status handling verbatim, so that `AIF-003-006`'s ladder documentation has a settled status name and transition semantics to point at. No gate-checking logic anywhere is touched — this chunk is a single-file documentation edit, and its central acceptance criterion is proving that constraint rather than merely asserting it.

---

## 3. Quick Summary

**Open Items:** 0 open — see Section 14

Complexity assessed at **Tier 1** per `skill/complexity-tiers`: single file, clear intent (the exact table and transition text already exists, approved, in `AIF-META-002` Design → Status handling), no new pattern (this file already carries a Decision-Record-only status extension — `Superseded` — in the identical shape), and no schema change to any code (`lib/` contains no status enum to touch; confirmed by grep — see Section 7). A written Chunk Plan is nonetheless produced here because it was explicitly requested to match the sibling AI-track plans' structure and because `AIF-003-006` depends on this chunk's exact output for its own documentation — precision here has downstream cost if wrong.

---

## 4. Acceptance Criteria

- [ ] All components in Section 8 exist and are internally consistent (documentation-only chunk; "build cleanly" means the resulting markdown renders correctly and its tables remain well-formed)
- [ ] All checks in Section 12 pass
- [ ] Security checklist (Section 10) fully satisfied
- [ ] Logging checklist (Section 11) fully satisfied (not applicable — see Section 11)
- [ ] Documentation checklist (Section 13) fully satisfied
- [ ] Review approved with no CRITICAL or HIGH findings
- [ ] `status-vocabulary.md` documents `Amending`, scoped explicitly to Decision Records, and both new transitions (`Approved` → `Amending`, `Amending` → `Approved`)
- [ ] The `Amending` row/note text matches `AIF-META-002` Design → Status handling's wording in substance (paraphrase permitted for house style, meaning must not drift)
- [ ] `git diff --stat` after this chunk's commit shows exactly one file changed: `skills/plan-lifecycle/reference/status-vocabulary.md`
- [ ] No line in the "Checking whether dependent work may proceed" section is edited — it already generalizes to any non-`Approved` value without needing to know `Amending` exists (this is the load-bearing proof that no gate logic changed)
- [ ] `Amending` does **not** appear in the "Core statuses (all artifact types)" table — it is Decision-Record-scoped only, exactly as `Superseded` already is
- [ ] No other artifact type's "Allowed Statuses" cell in the Per-artifact-type extensions table gains `Amending`

---

## 5. Scope

### In Scope

- Add `Amending` to the Decision Record row's "Allowed Statuses" cell in the "Per-artifact-type extensions" table.
- Add an explanatory note for `Amending` to that row's "Notes" cell, in the same style as the existing `Superseded` note, reproducing `AIF-META-002`'s meaning: an amendment has been proposed and applied to the record's body, and is awaiting human confirmation; not a terminal state (it resolves back to `Approved` on either confirm or reject); scoped to Decision Records only; blocks dependent work the same way `Draft`/`Deferred` already do, through the existing positive `Approved` check.
- Add two new bullets to the "Transitions" section: `Approved` → `Amending` and `Amending` → `Approved`, each with a short parenthetical matching the existing bullets' style (e.g. how the existing `Approved` → `Superseded` bullet reads).

### Out of Scope

- **Any change to the "Checking whether dependent work may proceed" section.** It already reads "Always check for `Status: Approved` specifically. Do not write special-case logic for `Deferred`, `Draft`, or any other non-`Approved` value" — this sentence already covers `Amending` without modification. Editing it to name `Amending` explicitly would be an unnecessary (and precedent-breaking) special case; leaving it untouched is itself part of proving Business Rule "No gate anywhere special-cases `Amending`" (Epic Section 5).
- **`skills/plan-lifecycle/reference/commit-gate-procedure.md`.** Owned by `AIF-003-006`, which documents the two-commit amendment gate procedure itself. This chunk documents only the status _value_ and its transitions, not the commit sequence that drives them.
- **`skills/plan-lifecycle/SKILL.md`.** Also `AIF-003-006`'s file.
- **`steering/global/knowledge-consumption.md`.** Owned by `AIF-003-005` — a parallel, independent wave-1 chunk. This chunk does not touch it and does not need to; the existing negative-phrased status check there is unaffected by a new status value existing (per `AIF-META-002` Design → Status handling: "Because every gate checks positively for `Approved` ... this new status blocks dependent work through the existing mechanism").
- **Either record template.** `## Amendments`, `## Errata`, `Last Amended`, `Supersedes` are `AIF-003-003`'s files.
- **`lib/decisions.js` or any code.** Confirmed by grep (Section 7) that no code in `lib/` enumerates `Status` values or contains gate-checking logic referencing `Superseded`/`Amending`/`Approved` as string literals tied to a gate decision — `Status` is read and passed through as an opaque field, never branched on for gating.
- **Any change to the Core statuses table.** `Amending`, like `Superseded`, is an artifact-type extension, not a core status.
- **Retroactively adding `Amending` to any existing Decision Record.** No record in the repo is mid-amendment; this chunk only makes the value available in the vocabulary.

---

## 6. Prerequisites

- [ ] Epic `AIF-003` `Status: Approved` committed (done — commit `8c82f90`)
- [ ] This Chunk Plan `Status: Approved` committed before implementation begins
- [ ] No prior chunk required — this is a wave-1 chunk with no dependencies
- [ ] `AIF-META-002` (`Status: Approved`) available as the source-of-truth text for the `Amending` wording — confirmed present and `Approved` at `docs/decisions/meta-process/AIF-META-002_partial-amendment-of-approved-decisions.decision.md`

---

## 7. Architecture & Design

### Project Structure Changes

```
skills/
└── plan-lifecycle/
    └── reference/
        └── status-vocabulary.md    ← MODIFIED (one table row's two cells, one new
                                       pair of bullets in Transitions)
```

No new files. No files outside `skills/plan-lifecycle/reference/status-vocabulary.md` are touched by this chunk.

### Key Design Decisions

1. **Decision**: reproduce `AIF-META-002` Design → Status handling's wording rather than re-deriving new phrasing.
   **Why:** the record is `Approved` and already states the exact meaning ("An amendment has been proposed and applied to the body, and is awaiting human confirmation") and the exact two transitions. Inventing new wording risks introducing a semantic drift between the decision and its implementing artifact — the record itself warns about exactly this kind of drift in its own Design section ("The log can drift from the body if an amendment is applied carelessly" — the same discipline applies to documentation as to record bodies).

2. **Decision**: fold `Amending`'s explanation into the existing Decision Record row's "Notes" cell (matching how `Superseded` is documented today), rather than adding a new standalone sub-table.
   **Why:** `AIF-META-002` Design → Status handling presents `Amending` in a small `Status | Meaning | Dependent work allowed?` table of its own, but that table exists inside the _decision record_, not inside `status-vocabulary.md`. Introducing a second table shape into `status-vocabulary.md` — one row-plus-notes pattern for `Superseded`, one three-column sub-table for `Amending` — would be an inconsistent precedent for the next status value some future decision adds. The existing Notes-cell convention already carries everything needed (meaning, scope, blocking behaviour) in prose, exactly as it does for `Superseded` today.

3. **Decision**: do not touch the "Checking whether dependent work may proceed" section.
   **Why:** this is the section that would constitute "gate-checking logic" if this file contained any executable logic — but it is prose guidance, and it is already written generically ("any other non-`Approved` value"). Editing it to explicitly list `Amending` would itself be the special-casing the Epic's Business Rules (Section 5) and `AIF-META-002` Resolved Item 5 forbid. Leaving it untouched is the correct outcome, not an oversight, and Section 4's acceptance criteria call this out explicitly so a reviewer checks for the absence of a change here, not just the presence of one elsewhere.

4. **Decision**: `Amending` is not added to the "Core statuses (all artifact types)" table.
   **Why:** `AIF-META-002` Design → Status handling states the new value is "scoped to Decision Records only (alongside `Superseded`)". `Superseded` already establishes the precedent that Decision-Record-only statuses live exclusively in the "Per-artifact-type extensions" table, never in Core statuses. Adding `Amending` to Core would incorrectly make it available to Chunk Plans, Epic Plans, and Tier 3 `ai-engineering-plan` artifacts — directly contradicting the Epic's Out of Scope entry "Extending errata/amendment to non-Decision-Record artifacts."

> **Tier C decisions.** All four are Tier C per `skill/decision-triage` — local implementation choices inside an already-decided design (`AIF-META-002`), riding this Chunk Plan's own `skill/plan-lifecycle` cycle. None warrants a standalone record.

### Patterns & Conventions Applied

- **Reuse the existing `Superseded` precedent exactly.** `status-vocabulary.md` already demonstrates the pattern this chunk needs: a Decision-Record-only status added to the Per-artifact-type extensions table's "Allowed Statuses" cell, explained in "Notes", and given its own Transitions bullet. `Amending` follows the identical shape.
- **Verbatim-source-of-truth discipline** (engineering-core Rule 1 / global-core Rule 1): every substantive word describing `Amending`'s meaning traces back to `AIF-META-002`, an `Approved` record, rather than being invented here.
- **No gate logic anywhere** (Epic Section 5 Business Rules, `AIF-META-002` Constraints & Requirements): verified concretely, not just asserted — see the grep evidence below.

**Grep evidence that no code-level gate exists to change:**

```
$ grep -rn "Superseded\|Amending" lib/
(no matches)
```

`lib/decisions.js` parses and passes through `Status` as an opaque string (used only for the `status` field on an index entry); it contains no conditional branching on `Status` value and therefore no "gate" for this chunk — or any future chunk — to modify. Gate-checking in this repo is a documented human/agent procedure (`skill/plan-lifecycle`, this very file), not code. This confirms the Epic's "no gate anywhere special-cases `Amending`" constraint is satisfiable by a pure-documentation change, with nothing in `lib/` requiring a parallel edit.

---

## 8. Components

### `status-vocabulary.md` — "Per-artifact-type extensions" table, Decision Record row

**File**: `skills/plan-lifecycle/reference/status-vocabulary.md`
**Purpose**: State which `Status` values a Decision Record may hold, and what each non-core value means.

**Current text** (for reference — not reproduced from the live file verbatim beyond what is needed to show the edit boundary):

| Artifact Type   | Allowed Statuses                                      | Notes                                                                                                                                                      |
| --------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Decision Record | `Draft`, `Approved`, `Done`, `Deferred`, `Superseded` | `Superseded`: a later decision replaced this one. This is a terminal outcome reached after the record was `Approved`, not a choice made at initial review. |

**New text**:

| Artifact Type   | Allowed Statuses                                                  | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Decision Record | `Draft`, `Approved`, `Done`, `Deferred`, `Superseded`, `Amending` | `Superseded`: a later decision replaced this one. This is a terminal outcome reached after the record was `Approved`, not a choice made at initial review. `Amending` (Decision Records only): an amendment has been proposed and applied to the record's body, and is awaiting human confirmation. Unlike `Superseded`, this is not a terminal state — it always resolves back to `Approved`, whether the human confirms or rejects the proposal. It blocks dependent work exactly as `Draft`/`Deferred` already do, through the existing positive `Approved` check — no gate anywhere needs to know this value exists. |

**Key Behaviour**:

- The cell addition is purely additive — no existing text in the row is removed or reworded.
- `Amending` is never added to the Core statuses table (Design Decision 4).

**Dependencies**: none.

### `status-vocabulary.md` — "Transitions" section

**File**: `skills/plan-lifecycle/reference/status-vocabulary.md`
**Purpose**: Enumerate every valid status-to-status move across all artifact types.

**Current text** (last two bullets):

```
- `Approved` → `Done` (described work completes)
- `Approved` → `Superseded` (Decision Records only, when a later decision replaces this one)
```

**New text** (two new bullets appended after the existing `Superseded` bullet):

```
- `Approved` → `Done` (described work completes)
- `Approved` → `Superseded` (Decision Records only, when a later decision replaces this one)
- `Approved` → `Amending` (Decision Records only; an amendment is proposed and the body edit is applied in the same commit)
- `Amending` → `Approved` (Decision Records only; the human confirms or rejects the proposal — either outcome returns the record to `Approved`)
```

**Key Behaviour**:

- Both new bullets are scoped explicitly with "(Decision Records only; ...)", matching how the existing `Superseded` bullet already scopes itself.
- The two-commit mechanics behind these transitions (propose commit, human decision, confirm/reject commit) are **not** described here — that belongs to `AIF-003-006`'s commit-gate-procedure documentation. This chunk states only that the transition exists and its trigger, consistent with how every other bullet in this section is written (one line, no procedure detail).

**Dependencies**: none.

---

## 9. Data Models

Not applicable — this chunk changes documentation prose and table cells, not a data schema. No index entry, record field, or code interface is added or altered.

---

## 10. Security Requirements

> This section must never be empty.

- [ ] No gate-checking logic is changed anywhere in the repo as a result of this chunk — verified by the grep evidence in Section 7 and by the Section 4 acceptance criterion checking `git diff --stat` shows exactly one file changed. This is the chunk's central security-adjacent property per `AIF-META-002` Constraints & Requirements ("Must not require any existing gate-checking logic to change") and Epic Section 7.
- [ ] No self-approval path is introduced. This chunk documents a status value and its transitions only; it does not touch `agents/architect.yaml` (that is `AIF-003-008`) and introduces no wording suggesting `Amending` → `Approved` can be reached without a preceding human decision. The transition bullet explicitly says "the human confirms or rejects."
- [ ] All external inputs validated before use — not applicable; this chunk edits static markdown with no runtime input.
- [ ] No secrets or credentials in source code or logs — not applicable; no code or logs are touched.
- [ ] Errors exposed to users contain no internal system details — not applicable; no error paths exist in a documentation-only change.

---

## 11. Logging Requirements

> This section must never be empty.

Not applicable. This chunk changes a static reference markdown file inside a skill; it introduces no code path, no runtime behaviour, and therefore nothing that could log an event. Per engineering-core Rule 3's own framing, logging requirements apply to acceptance criteria for runtime/observable behaviour — a documentation edit has none. Recorded explicitly here rather than left blank, per Step 2's rule that Section 11 must never be empty.

| Event                      | Level | What is logged | What is NOT logged |
| -------------------------- | ----- | -------------- | ------------------ |
| N/A — no runtime component | —     | N/A            | N/A                |

---

## 12. Testing Plan

This chunk has no unit or integration test suite of its own — `status-vocabulary.md` is prose consumed by agents and humans, not parsed by any code (confirmed in Section 7: no `lib/` file references it). Validation is self-check against the acceptance criteria in Section 4, performed by AI-Engineer before presenting the result, per `skill/complexity-tiers` Tier 1's "Self-validate" step.

| Check ID | Description                                                                       | Type                           | Pass Criteria                                                                                                                 |
| -------- | --------------------------------------------------------------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| 004-C01  | `Amending` appears in the Decision Record row's Allowed Statuses cell             | Self-check (read file)         | Cell reads `Draft`, `Approved`, `Done`, `Deferred`, `Superseded`, `Amending`                                                  |
| 004-C02  | `Amending` does **not** appear in the Core statuses table                         | Self-check (read file)         | Core statuses table's four rows (`Draft`, `Approved`, `Done`, `Deferred`) are unchanged                                       |
| 004-C03  | `Amending` does **not** appear in any other artifact type's Allowed Statuses cell | Self-check (read file)         | Chunk Plan / Epic Plan / Tier 3 `ai-engineering-plan` rows read exactly as before: `Draft`, `Approved`, `Done`, `Deferred`    |
| 004-C04  | Both new transition bullets are present and correctly scoped                      | Self-check (read file)         | `Approved` → `Amending` and `Amending` → `Approved` bullets exist, each parenthetically scoped "(Decision Records only; ...)" |
| 004-C05  | "Checking whether dependent work may proceed" section is byte-for-byte unchanged  | Self-check (diff)              | `git diff` shows zero changed lines in that section                                                                           |
| 004-C06  | Exactly one file changed                                                          | Self-check (`git diff --stat`) | Only `skills/plan-lifecycle/reference/status-vocabulary.md` appears                                                           |
| 004-C07  | Markdown tables remain well-formed                                                | Self-check (visual/render)     | Pipe alignment and column count are consistent with the rest of the file; no broken table rendering                           |
| 004-C08  | `npm test` still passes                                                           | Automated                      | No test in the suite reads `status-vocabulary.md`, so the full suite is unaffected — run as a regression guard only           |

---

## 13. Documentation Requirements

- [ ] Inline documentation on all public members — not applicable (no code)
- [ ] File headers on all new source files — not applicable; `status-vocabulary.md` carries no file-header/Plan-ID convention today (it is a skill reference file, not source code under `lib/`), and this chunk does not introduce one unilaterally. If a header convention is later adopted for skill reference files, that is a separate cross-cutting decision, not this chunk's to make.
- [ ] README updated if user-facing — not applicable
- [ ] CHANGELOG entry written

---

## 14. Risks & Open Questions

| #   | Risk / Question                                                                                                                                                                                                                                                                                                               | Type | Impact | Mitigation                                                                                                                                                                                                                                                                                                                                                                   |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **`AIF-003-006` depends on this chunk's exact wording**, not just its existence. If `006` is authored against a different phrasing than what actually lands here, its ladder documentation could describe a status name or transition slightly differently than the vocabulary file states.                                   | Risk | M      | Section 8's "New text" blocks are written to be copy-adoptable verbatim by `006` rather than paraphrased loosely; the status name (`Amending`) and both transition labels are fixed strings taken directly from `AIF-META-002`, leaving no room for `006` to reasonably diverge.                                                                                             |
| 2   | **Folding `Amending`'s explanation into a prose Notes cell (Design Decision 2) discards the three-column `Status / Meaning / Dependent work allowed?` shape `AIF-META-002` uses inline.** A reviewer comparing the two side-by-side could read this as an unfaithful reproduction rather than a deliberate format adaptation. | Risk | L      | Explicitly justified in Design Decision 2: the three-column shape is intrinsic to how the record explains itself inline, not a fixed contract this chunk must preserve structurally. The Notes-cell convention is the file's own established pattern (matching `Superseded`), and the acceptance criterion checks for semantic match ("in substance"), not structural match. |
| 3   | **This chunk cannot itself verify `AIF-003-006`'s downstream consumption is correct**, since `006` has not been written yet.                                                                                                                                                                                                  | Risk | L      | Accepted — this is an ordinary forward dependency, identical in kind to how `AIF-003-001` could not verify `AIF-003-003`'s template field agreement end-to-end (see `AIF-003-001` Risk 2). `chunks.json` already sequences `006` behind `004` for exactly this reason.                                                                                                       |

---

## 15. Work Log

[2026-08-25] [AI-Engineer] [Created] [AIF-003-004] [Chunk Plan drafted from Epic AIF-003 Section 9 following its approval (`8c82f90`) and the parent chunk decomposition (`8922730`). Complexity assessed as Tier 1 per `skill/complexity-tiers` (single file, clear intent sourced from an already-`Approved` decision record, no new pattern — `Superseded` already establishes the exact shape needed, no code schema touched). A written plan is produced despite the Tier 1 assessment because it was explicitly requested to match the sibling AI-track plans' structure, and because `AIF-003-006` depends on this chunk's precise output. Verified by grep that no file under `lib/` contains the strings `Superseded` or `Amending`, confirming the "no gate-checking logic changes anywhere" constraint (`AIF-META-002` Constraints & Requirements; Epic Section 5 Business Rules) is satisfiable by a documentation-only change, with nothing in code requiring a parallel edit. Sourced all new wording directly from `AIF-META-002` Design → Status handling (an `Approved` record) rather than re-deriving phrasing, per global-core Rule 1. Deliberately left the "Checking whether dependent work may proceed" section untouched and made its non-modification an explicit acceptance criterion (004-C05), since editing it to name `Amending` would itself be the special-casing the Epic forbids. No open questions requiring human input were identified — `AIF-META-002`'s Design section fully specifies the status name, its scope, and both transitions, leaving no ambiguity for this chunk to resolve.]
