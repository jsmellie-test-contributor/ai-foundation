# Chunk Plan: `Supersedes`, `Last Amended`, `## Amendments`, `## Errata` in Both Templates

## 1. Metadata

| Field          | Value                                                                                                                                                                                                                                                                           |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plan ID        | AIF-003-003                                                                                                                                                                                                                                                                     |
| Parent Epic    | AIF-003                                                                                                                                                                                                                                                                         |
| Chunk          | 3 of 8                                                                                                                                                                                                                                                                          |
| Depends On     | None                                                                                                                                                                                                                                                                            |
| Can Parallel   | AIF-003-001, AIF-003-004, AIF-003-005 (wave 1)                                                                                                                                                                                                                                  |
| Project        | ai-foundation                                                                                                                                                                                                                                                                   |
| Status         | Approved                                                                                                                                                                                                                                                                        |
| Author (Agent) | AI-Engineer                                                                                                                                                                                                                                                                     |
| Reviewed By    | Pending                                                                                                                                                                                                                                                                         |
| Created        | 2026-08-25                                                                                                                                                                                                                                                                      |
| Last Updated   | 2026-08-25                                                                                                                                                                                                                                                                      |
| Standards      | No language/stack standards apply — this chunk edits two declarative documentation templates (`skills/decision-record/reference/template.md`, `skills/decision-brief/reference/template.md`) governed by the AGENTS.md component schemas. AI-Engineer track per `AIF-PROC-001`. |

---

## 2. Goal

Give both Decision Record templates the authoring surface the amendment ladder needs: an optional `Supersedes` Metadata field (mirroring `References`), an optional `Last Amended` Metadata field, the optional `## Amendments` and `## Errata` sections, and the inline `*(amended — see Amendment N)*` marker convention — exactly as `AIF-META-002` Design → "Record-shape changes" specifies, and exactly what `AIF-003-001`'s parser reads.

---

## 3. Quick Summary

**Open Items:** 0 open — see Section 14. Three implementation-level design choices not fixed by `AIF-META-002` (field placement within the Metadata table, section placement in the Tier B brief, and whether to extend the record template's explanatory paragraph) are resolved as Tier C decisions in Section 7 rather than escalated, since none of them affects what `lib/decisions.js` parses — the parser reads by field/heading name, not position.

**Process note:** This chunk is on the AI-Engineer track (`agents: ["AI-Engineer"]` in `chunks.json`). Per `skill/chunk-planning`'s "AI-Track Chunks" section, such chunks normally either skip a written plan (Tier 1/2) or, at Tier 3, use the lighter `skill/ai-engineering-plan` schema rather than this software-track Chunk Plan template. AI-Engineer assesses this chunk as **Tier 3** per `skill/complexity-tiers` — it introduces a new cross-cutting convention (the inline amendment marker, the `Amendments`/`Errata` section shapes) across two templates simultaneously, and it is contract-coupled to `AIF-003-001`'s parser (Epic Risk: "if the two disagree on spelling, the parser silently reads nothing"). This plan nonetheless follows the full Chunk Plan template — as directed by the dispatching task, to match the structure and level of detail of sibling chunks `AIF-003-001`/`AIF-003-002` — rather than `skill/ai-engineering-plan`'s one-screen schema. This is a formatting choice, not a scope or approval-gate change: the commit-gate procedure (`Draft` → human decision → `Approved` commit before implementation) is identical either way. Flagged for the human/Engineering-Manager's awareness, not as a blocking question.

---

## 4. Acceptance Criteria

- [ ] All components in Section 8 exist and render as valid Markdown
- [ ] All checks in Section 12 pass
- [ ] Security checklist (Section 10) fully satisfied
- [ ] Logging checklist (Section 11) — not applicable, confirmed in Section 11
- [ ] Documentation checklist (Section 13) fully satisfied
- [ ] Review approved with no CRITICAL or HIGH findings
- [ ] Both templates carry a `Supersedes` Metadata field, comma-separated, `—` when empty, mirroring `References` exactly in shape
- [ ] Both templates carry an optional `Last Amended` Metadata field using the exact field name `Last Amended` (case- and spacing-exact, since `parseMetadataTable` keys on the raw cell text)
- [ ] Both templates carry an optional `## Amendments` section with columns `#`, `Date`, `Section`, `Change`, `Rationale`, `Outcome`, matching `AIF-META-002`'s worked shape verbatim
- [ ] Both templates carry an optional `## Errata` section with columns `#`, `Date`, `Change`, `Author`, matching `AIF-META-002`'s worked shape verbatim
- [ ] Both templates document the inline `*(amended — see Amendment N)*` marker convention
- [ ] No template introduces a `Superseded By` field, a child-record ID scheme, section-level version stamps, or a versioned-reissue convention (Epic Out of Scope — the three ruled-out `AIF-META-002` options)
- [ ] Neither template's added text implies an amendment or errata author may set `Status: Approved` without a preceding human decision
- [ ] `Supersedes` is spelled identically to what `AIF-003-001`'s parser reads (`Supersedes`, exact case)
- [ ] `## Amendments` and `## Errata` headings are spelled identically to what `AIF-003-002`'s row-counting helper locates (`## Amendments` exact; `## Errata` exact, and never parsed)
- [ ] `npm test` still passes (no code is touched by this chunk; this is a no-op regression check)

---

## 5. Scope

### In Scope

- `skills/decision-record/reference/template.md`: add the `Supersedes` and `Last Amended` Metadata rows; append the `## Amendments` and `## Errata` sections; extend the explanatory paragraph beneath the Metadata table with one sentence covering `Supersedes`'s ID-shape constraint.
- `skills/decision-brief/reference/template.md`: same two Metadata rows and the same two sections, adapted to the brief's simpler style (no explanatory paragraph, since the brief template has none for `References`/`Referenced By` either).
- Documenting the inline `*(amended — see Amendment N)*` marker convention in both templates' new `## Amendments` section, as instructional (curly-brace) prose consistent with the templates' existing style.

### Out of Scope

- **The `Amending` status value and its transitions.** `AIF-003-004` owns `status-vocabulary.md`; this chunk's templates only reference the marker/section conventions, not status mechanics.
- **The rung-selection table, the errata test, its worked examples, and the two-commit gate procedure.** `AIF-003-006` owns that documentation in `skill/plan-lifecycle`; this chunk's templates point at nothing yet, since `AIF-003-007` (which adds those pointers) depends on `AIF-003-006` as well as this chunk.
- **`lib/decisions.js` parsing changes.** `AIF-003-001`/`AIF-003-002` own the parser; this chunk only has to agree with it on field/heading spelling.
- **Retrofitting any existing Decision Record.** No `.decision.md` file under `{paths.decisions}` is touched by this chunk (`AIF-META-002` Resolved Item 8; Epic Out of Scope).
- **A `Superseded By` Metadata field, or any other hand-authored inverse field.** `superseded_by` is index-computed only (`AIF-003-001` Decision 1).
- **Adding validation, tooling, or lint for the new fields/sections.** This chunk is documentation only.
- **Updating `skills/decision-record/SKILL.md` or `skills/decision-brief/SKILL.md`.** `AIF-003-007` owns pointing those SKILL files at the ladder documentation; this chunk touches only `reference/template.md` in each skill.

---

## 6. Prerequisites

- [ ] Epic `AIF-003` `Status: Approved` committed (done — commit `8c82f90`)
- [ ] This Chunk Plan's `Status: Approved` committed before implementation begins
- [ ] No prior chunk required — this is a wave-1 chunk with no dependencies
- [ ] `AIF-META-002` (`Status: Approved`) available as the authoritative source for exact field names, section shapes, and worked examples — read directly rather than paraphrased from the Epic

---

## 7. Architecture & Design

### Project Structure Changes

```
skills/
├── decision-record/
│   └── reference/
│       └── template.md          ← MODIFIED (Metadata rows + 2 new sections)
└── decision-brief/
    └── reference/
        └── template.md          ← MODIFIED (Metadata rows + 2 new sections)
```

No new files.

### Key Design Decisions

1. **Decision**: `Last Amended` is inserted immediately after `Created`; `Supersedes` is inserted immediately after `References`, before `Tags`.
   **Why:** `AIF-META-002` fixes the field names and semantics but not table position, and `parseMetadataTable` reads by field name, not row order, so position has no functional effect on `AIF-003-001`/`002`. Placement is chosen for readability only: `Last Amended` sits next to the table's other date field (`Created`); `Supersedes` sits next to `References`, since the two are structurally identical (comma-separated ID lists, `—` when empty) and reading them adjacently makes that parallel obvious to a human author.

2. **Decision**: `## Amendments` and `## Errata` are appended at the very end of each template — after `## Resolved Items`/`## Open Items` in `decision-record/template.md` (matching `AIF-META-002`'s explicit instruction), and after `## Impact` in `decision-brief/template.md` (the brief's last section; it has no `Resolved Items`/`Open Items` equivalent).
   **Why:** `AIF-META-002` only specifies Tier A placement explicitly ("placed after the closing `Resolved Items`/`Open Items` section"). For Tier B, "after the closing section" is the same instruction applied to whichever section is last in that template, which is `## Impact`.

3. **Decision**: the inline marker convention and the append-only/never-edit rule are documented as instructional curly-brace prose inside the `## Amendments` section, not as a separate written-out example scattered across other sections.
   **Why:** both templates are fill-in-the-blank skeletons, not filled specimens — every other optional convention in `decision-record/template.md` (e.g. the `## Design` section's "Optional — include when...") is documented the same way, as a note at the point of use rather than as a worked example planted elsewhere in the skeleton. Placing a literal `*(amended — see Amendment N)*` marker on some placeholder body text would misleadingly suggest that section is always amended.

4. **Decision**: `decision-brief/reference/template.md` does not gain an explanatory paragraph for `Supersedes` analogous to the one added to the record template.
   **Why:** the brief template already omits the equivalent paragraph for `References`/`Referenced By` — it states the field in the table and nothing more. Adding prose only for `Supersedes` would make the brief inconsistent with its own existing style rather than with the record template, which is not the bar to match.

5. **Decision**: the `## Amendments` example row's `Outcome` cell reads `Pending / Approved by {name} / Rejected by {name}` rather than the single literal example value `AIF-META-002` itself uses (`Approved by {name}`).
   **Why:** `AIF-META-002` is a _filled_ record illustrating one row; these files are _templates_ an author fills in. Every other placeholder cell in both templates already shows the full range of legal values inline (e.g. `Status | Draft / Approved / Done / Deferred / Superseded`), so showing all three legal `Outcome` values in one cell matches the templates' own convention rather than the record's illustrative convention.

> **Tier C decisions.** All five are Tier C per `skill/decision-triage` — local documentation/formatting choices inside an already-decided design (`AIF-META-002`), riding this plan's own `skill/plan-lifecycle` cycle. None changes what any parser reads or what any author is permitted to do.

### Patterns & Conventions Applied

- **Curly-brace placeholder convention** — both templates use `{...}` for fill-in text and plain prose in curly braces for authoring instructions (e.g. `## Design`'s "Optional — include when..."). The new sections and fields follow the same convention exactly.
- **No prescriptive/gate language added.** Per Epic Section 7 ("No self-approval"), the new `## Amendments` instructional text describes what an author does (apply the edit, add the marker, append the row, set `Outcome: Pending`) without stating who may set `Status: Approved` or when — that belongs to `AIF-003-006`'s documentation of the two-commit gate, not to the template.

---

## 8. Components

### `skills/decision-record/reference/template.md` — Tier A record skeleton

**File**: `skills/decision-record/reference/template.md`
**Purpose**: The fill-in-the-blank skeleton an author copies to start a new Tier A Decision Record.

**Metadata table changes** (exact rows to insert):

```
| Last Amended | {YYYY-MM-DD} (Amendment {N}) — omit this row entirely until the record's first amendment is confirmed |
```

— inserted immediately after the `Created` row.

```
| Supersedes | {Decision ID(s) this record supersedes, or "—"} |
```

— inserted immediately after the `References` row, before `Tags`.

**Explanatory-paragraph change**: append one sentence to the existing paragraph below the Metadata table (the one explaining `Referenced By`/`References` ID shapes):

> `Supersedes` cites only Decision ID(s) — a record can supersede another decision, never an Epic — and stays `—` until this record explicitly replaces a predecessor; the inverse `Superseded By` relationship is never authored by hand, it is computed by `lib/decisions.js` from every other record's `Supersedes` field.

**New sections** (appended after the existing `### Open Items` table, i.e. at the very end of the file):

```markdown
---

## Amendments

{Optional — omit this section entirely until this record is amended for the first time. Append-only: once a row's `Outcome` is filled in, existing rows are never edited or deleted — including rejected proposals. Mark the amended point in the body inline with `*(amended — see Amendment N)*`. See `skill/plan-lifecycle` for the amendment rung and its two-commit gate.}

| #   | Date         | Section        | Change         | Rationale | Outcome                                           |
| --- | ------------ | -------------- | -------------- | --------- | ------------------------------------------------- |
| 1   | {YYYY-MM-DD} | {Section name} | {What changed} | {Why}     | Pending / Approved by {name} / Rejected by {name} |

## Errata

{Optional — omit this section entirely until this record has its first erratum. Ungated: anyone may append a row for a change that provably leaves the rendered meaning of the record's substantive sections unchanged. No inline marker, no `Status` change, no `Last Amended` change. See `skill/plan-lifecycle` for the errata test.}

| #   | Date         | Change         | Author |
| --- | ------------ | -------------- | ------ |
| 1   | {YYYY-MM-DD} | {What changed} | {name} |
```

**Key Behaviour**: both new sections and both new fields are optional and forward-looking — nothing in this chunk causes an existing `.decision.md` file to need editing (`REQUIRED_FIELDS` in `lib/decisions.js` is untouched by this chunk, and stays that way per `AIF-003-002`'s acceptance criteria).

**Dependencies**: none — this is a static documentation file with no build step.

### `skills/decision-brief/reference/template.md` — Tier B brief skeleton

**File**: `skills/decision-brief/reference/template.md`
**Purpose**: The fill-in-the-blank skeleton an author copies to start a new Tier B Decision Brief.

**Metadata table changes** (same two rows, same relative position, adapted to this file's existing field wording style):

```
| Last Amended | {YYYY-MM-DD} (Amendment {N}) — omit this row entirely until the record's first amendment is confirmed |
```

— inserted immediately after `Created`.

```
| Supersedes | {Decision ID(s) this decision supersedes, or "—"} |
```

— inserted immediately after `References`, before `Tags`.

No explanatory-paragraph change (Design Decision 4 above — the brief template carries no such paragraph today for any Metadata field).

**New sections** (appended after the existing `## Impact` section, i.e. at the very end of the file):

```markdown
---

## Amendments

{Optional — omit this section entirely until this decision is amended for the first time. Append-only: once a row's `Outcome` is filled in, existing rows are never edited or deleted — including rejected proposals. Mark the amended point in the body inline with `*(amended — see Amendment N)*`. See `skill/plan-lifecycle` for the amendment rung and its two-commit gate.}

| #   | Date         | Section        | Change         | Rationale | Outcome                                           |
| --- | ------------ | -------------- | -------------- | --------- | ------------------------------------------------- |
| 1   | {YYYY-MM-DD} | {Section name} | {What changed} | {Why}     | Pending / Approved by {name} / Rejected by {name} |

## Errata

{Optional — omit this section entirely until this decision has its first erratum. Ungated: anyone may append a row for a change that provably leaves the rendered meaning of this decision's substantive sections (`Decision`, `Rationale`, `Impact`) unchanged. No inline marker, no `Status` change, no `Last Amended` change. See `skill/plan-lifecycle` for the errata test.}

| #   | Date         | Change         | Author |
| --- | ------------ | -------------- | ------ |
| 1   | {YYYY-MM-DD} | {What changed} | {name} |
```

**Key Behaviour**: identical to the record template's, adjusted only for the Tier B protected-section list (`Decision`, `Rationale`, `Impact`, per `AIF-META-002`'s amended errata test) named in the `## Errata` instructional prose, since a Tier B author benefits from seeing that list at the point of use rather than having to cross-reference `AIF-META-002` or the future `AIF-003-006` documentation.

**Dependencies**: none.

---

## 9. Data Models

### Decision Record / Decision Brief Metadata — new fields

**Purpose**: The two new optional rows both templates' Metadata tables gain.

| Field          | Type                                    | Required | Notes                                                                                                                                                                                                                                                                                        |
| -------------- | --------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Last Amended` | string (verbatim, not parsed as a date) | No       | `{YYYY-MM-DD} (Amendment {N})`. Omitted from a record's actual Metadata table until that record's first amendment is confirmed — never written as `—` or left blank; the row is absent entirely. Never added to `REQUIRED_FIELDS` (Epic Risk 11; enforced in `AIF-003-002`, not this chunk). |
| `Supersedes`   | comma-separated Decision ID list        | No       | Mirrors `References` exactly: comma-separated, `—` when empty. Decision IDs only — never an Epic ID, since only decisions can be superseded.                                                                                                                                                 |

### `## Amendments` row shape

**Purpose**: One proposed-and-resolved amendment cycle.

| Field       | Type                                                      | Required | Notes                                                                                                                                                   |
| ----------- | --------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `#`         | integer                                                   | Yes      | Authored, monotonically increasing; not the source of truth for count (`AIF-003-002`'s `amendment_count` counts rows structurally, not by this column). |
| `Date`      | `YYYY-MM-DD`                                              | Yes      | Date the proposal commit was made.                                                                                                                      |
| `Section`   | string                                                    | Yes      | The record section the amendment touches.                                                                                                               |
| `Change`    | string                                                    | Yes      | What changed.                                                                                                                                           |
| `Rationale` | string                                                    | Yes      | Why — the original rationale still holds; this is what distinguishes an amendment from a supersede.                                                     |
| `Outcome`   | `Pending` \| `Approved by {name}` \| `Rejected by {name}` | Yes      | `Pending` while `Status: Amending`; filled in once when the cycle closes and never edited again — including for rejected rows, which stay in the table. |

### `## Errata` row shape

**Purpose**: One ungated non-substantive correction.

| Field    | Type         | Required | Notes                                                                                                          |
| -------- | ------------ | -------- | -------------------------------------------------------------------------------------------------------------- |
| `#`      | integer      | Yes      | Authored, monotonically increasing.                                                                            |
| `Date`   | `YYYY-MM-DD` | Yes      | Date of the single errata commit.                                                                              |
| `Change` | string       | Yes      | What changed — must satisfy the errata test (default-deny; documented fully in `AIF-003-006`, not this chunk). |
| `Author` | string       | Yes      | Anyone — errata authorship is not restricted to the domain owner.                                              |

---

## 10. Security Requirements

> This section must never be empty.

- [ ] All external inputs validated before use — not applicable; this chunk edits static documentation with no input path.
- [ ] No secrets or credentials in source code or logs — not applicable; no code, no logging.
- [ ] Errors exposed to users contain no internal system details — not applicable; no error paths introduced.
- [ ] **No self-approval path introduced.** Per Epic Section 7, the new `## Amendments` instructional text must describe only what an author _does_ (edit, mark, append `Outcome: Pending`, set `Status: Amending`) and must not state or imply that any agent — including Architect — may set `Status: Approved` without a preceding human decision, nor that any agent may commit that transition unilaterally. That rule belongs to `AIF-003-006`/`AIF-003-008`, and this chunk's templates must not pre-empt or contradict it.
- [ ] **No reintroduction of ruled-out mechanisms.** The template text must not describe a child-record ID scheme (Option B), inline section-level version stamps (Option C), or versioned reissue (Option E) — all three explicitly ruled out by `AIF-META-002` and listed in the Epic's Out of Scope.
- [ ] **Append-only framed as a rule, not a suggestion.** Both new sections' instructional prose must state plainly that rows are never edited or deleted once `Outcome` is filled in — this is the audit-integrity property Epic Section 7 calls a security property, not a style choice, and a template that hedges this (e.g. "should generally not be edited") would understate it.

---

## 11. Logging Requirements

> This section must never be empty.

Not applicable. This chunk touches two static Markdown files with no runtime behaviour, no execution path, and no logging surface. `lib/decisions.js` (the only component in this Epic with a logging posture) is owned by `AIF-003-001`/`AIF-003-002` and is unmodified by this chunk.

| Event | Level | What is logged                                   | What is NOT logged |
| ----- | ----- | ------------------------------------------------ | ------------------ |
| n/a   | n/a   | n/a — no code executes as a result of this chunk | n/a                |

---

## 12. Testing Plan

No automated test in this repo targets `reference/template.md` content directly (`tests/unit/decisions.test.js` and `tests/integration/decisions-index.test.js` exercise `lib/decisions.js` against synthetic fixtures, not the templates themselves). Validation is self-verification against the exact strings `AIF-003-001`/`AIF-003-002` depend on, plus a full-suite regression run to confirm this documentation-only chunk touches nothing executable.

| Test ID | Description                            | Type             | Pass Criteria                                                                                                                                                      |
| ------- | -------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 003-T01 | `Supersedes` field name spelling       | Self-check       | Both templates spell the field exactly `Supersedes` (case-exact), matching the string `AIF-003-001`'s `parseDecisionRecord` reads via `fields['Supersedes']`       |
| 003-T02 | `Last Amended` field name spelling     | Self-check       | Both templates spell the field exactly `Last Amended`, matching the string `AIF-003-002`'s `parseDecisionRecord` reads via `fields['Last Amended']`                |
| 003-T03 | `## Amendments` heading spelling       | Self-check       | Both templates use the exact trimmed heading text `## Amendments`, matching what `AIF-003-002`'s `countAmendmentRows` locates                                      |
| 003-T04 | `## Errata` heading spelling           | Self-check       | Both templates use the exact trimmed heading text `## Errata`; confirm neither template's heading could be mistaken for `## Amendments` by a naive substring match |
| 003-T05 | `Supersedes`/`References` shape parity | Self-check       | Both fields' placeholder text describe identical shape: comma-separated Decision ID(s), `—` when empty                                                             |
| 003-T06 | No `Superseded By` field anywhere      | Self-check       | `grep -i "superseded by"` on both templates returns no Metadata-row match                                                                                          |
| 003-T07 | No ruled-out mechanism reintroduced    | Self-check       | Both templates contain no child-ID amendment scheme, no section-level version-stamp convention, no versioned-reissue (`v2`-style) convention                       |
| 003-T08 | Markdown table well-formedness         | Self-check       | Both new tables render correctly (column counts consistent, separator row present) when previewed                                                                  |
| 003-T09 | Optional-and-forward-looking framing   | Self-check       | Both templates' instructional prose states the sections/fields are omitted, not filled with `—`, until first use — matching `AIF-META-002` Resolved Item 8         |
| 003-T10 | Full suite regression                  | Unit+Integration | `npm test` passes unchanged — this chunk modifies no `.js` file, so this is a no-op confirmation that nothing was inadvertently touched                            |

---

## 13. Documentation Requirements

- [ ] Inline documentation on all public members — not applicable (no code); the templates' own instructional prose _is_ the documentation and is covered by Section 8/12
- [ ] File headers on all new source files — not applicable; no new files, and `reference/template.md` files in this repo do not carry the `Plan:`-header convention used by `.js` source files
- [ ] README updated if user-facing — not applicable; no README references these template internals
- [ ] CHANGELOG entry written

---

## 14. Risks & Open Questions

| #   | Risk / Question                                                                                                                                                                                                                                                                                                                                                                                                                   | Type | Impact | Mitigation                                                                                                                                                                                                                                                                                                                                                                         |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Field-name/heading-name coupling with `AIF-003-001`/`AIF-003-002`**, both of which read exact strings this chunk defines. If any of `Supersedes`, `Last Amended`, `## Amendments`, or `## Errata` is spelled differently between this chunk and the parser chunks, the parser silently reads nothing (absent-field behaviour) rather than failing loudly — this is `AIF-003-001`'s own Risk 2, restated from this chunk's side. | Risk | M      | This plan copies every exact string directly from `AIF-META-002` Design → "Record-shape changes" rather than paraphrasing, and Section 12 (003-T01–T04) makes spelling an explicit self-check. No independent judgment calls on spelling are made anywhere in this plan.                                                                                                           |
| 2   | **Placement choices (Design Decisions 1–2) are this chunk's own inference**, not stated verbatim by `AIF-META-002` for every case (table row order is unstated entirely; Tier B section placement is inferred from "after the closing section").                                                                                                                                                                                  | Risk | L      | Both inferences are functionally inert — `parseMetadataTable`/`countAmendmentRows` are position/order-independent within their respective anchors — so a reviewer disagreeing with the placement can request a reorder with zero risk to `AIF-003-001`/`002`'s behavior. Documented explicitly in Section 7 rather than left implicit, so disagreement is easy to raise in review. |
| 3   | **This chunk runs in wave 1, parallel with `AIF-003-001`, by specification rather than by file dependency** (Epic Section 9). If `AIF-003-001` lands with a field name other than `Supersedes`, this chunk's output would silently mismatch.                                                                                                                                                                                      | Risk | L      | Both chunks were planned from the same source (`AIF-META-002`) and `AIF-003-001`'s already-`Approved` Chunk Plan is verified in this plan's own Prerequisites/Section 8 to use the identical string `Supersedes`. No action needed unless `AIF-003-001`'s implementation deviates from its approved plan, which would itself be a review-blocking finding on that chunk.           |

---

## 15. Work Log

[2026-08-25] [AI-Engineer] [Created] [AIF-003-003] [Chunk Plan drafted from Epic AIF-003 Section 9 following its approval (`8c82f90`), reading `AIF-META-002` (Approved) directly for the exact field names, section shapes, and worked examples rather than paraphrasing from the Epic summary. Verified both current templates lack any `Supersedes`/`Last Amended` field and any `Amendments`/`Errata` section. Cross-checked exact strings against `AIF-003-001`'s already-Approved Chunk Plan (`Supersedes`, read via `fields['Supersedes']`) and `AIF-003-002`'s already-Approved Chunk Plan (`Last Amended`, `## Amendments`, exact heading match in `countAmendmentRows`) to eliminate the spelling-mismatch risk both sibling plans flag from their side. Assessed complexity as Tier 3 per `skill/complexity-tiers` (new cross-cutting convention across two templates, contract-coupled to a parallel chunk) and noted in Section 3 that this plan uses the full Chunk Plan template — per the dispatching task's explicit instruction to match sibling structure — rather than the lighter `skill/ai-engineering-plan` schema `skill/chunk-planning`'s AI-Track section would otherwise call for at Tier 3; flagged as a process note for the human, not an open question, since it changes no scope and the commit-gate procedure is unaffected. Resolved three placement choices not fixed by `AIF-META-002` (Metadata row order, Tier B section placement, whether to extend the brief's explanatory paragraph) as Tier C decisions rather than escalating, since all three are functionally inert to the parser. No genuine open questions identified — nothing in this chunk's scope is unsettled by the Epic or by `AIF-META-002`.]
