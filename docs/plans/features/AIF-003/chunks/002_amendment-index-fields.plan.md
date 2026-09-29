# Chunk Plan: Add `last_amended` and `amendment_count` to Index Entries

## 1. Metadata

| Field          | Value                                                                                                                                           |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Plan ID        | AIF-003-002                                                                                                                                     |
| Parent Epic    | AIF-003                                                                                                                                         |
| Chunk          | 2 of 8                                                                                                                                          |
| Depends On     | AIF-003-001                                                                                                                                     |
| Can Parallel   | AIF-003-006 (wave 2)                                                                                                                            |
| Project        | ai-foundation                                                                                                                                   |
| Status         | Approved                                                                                                                                        |
| Author (Agent) | Tech-Lead                                                                                                                                       |
| Reviewed By    | Jeremy Smellie                                                                                                                                  |
| Created        | 2026-08-25                                                                                                                                      |
| Last Updated   | 2026-08-25 (Approved by Jeremy Smellie)                                                                                                         |
| Standards      | `standards/javascript_base.md`, `standards/javascript_node.md` (project tags `javascript`, `node`). Software-Engineer track per `AIF-PROC-001`. |

---

## 2. Goal

Make amendment state machine-readable: every index entry gains `last_amended` (the `Last Amended` Metadata field, or `null`) and `amendment_count` (the number of rows in the record's `## Amendments` table, or `0`). Regenerate `docs/decisions/index.json` in the same chunk so `main` is never left with an index whose shape disagrees with the code that builds it.

---

## 3. Quick Summary

**Open Items:** 2 open (0 High / 2 Medium / 0 Low) — see Section 14

This is the first chunk to parse anything outside the Metadata table, and the only chunk in the Epic that rewrites a committed generated artifact.

---

## 4. Acceptance Criteria

- [ ] All components in Section 8 exist and build cleanly
- [ ] All tests in Section 12 pass
- [ ] Security checklist (Section 10) fully satisfied
- [ ] Logging checklist (Section 11) fully satisfied
- [ ] Documentation checklist (Section 13) fully satisfied
- [ ] Review approved with no CRITICAL or HIGH findings
- [ ] `REQUIRED_FIELDS` is **still** exactly `['Decision ID', 'Status']` — `Last Amended` must never be added (Epic Risk 11)
- [ ] All 16 existing records parse cleanly and index as `last_amended: null`, `amendment_count: 0`
- [ ] `docs/decisions/index.json` is regenerated via `aif index -d` and the command then reports it as up to date
- [ ] No existing `.decision.md` file is edited by this chunk (Epic: no retrofit)
- [ ] `npm test` passes

---

## 5. Scope

### In Scope

- `parseDecisionRecord`: read the optional `Last Amended` Metadata field, and count data rows in an optional `## Amendments` section.
- A new pure helper that counts `## Amendments` table rows from raw file content.
- `buildDecisionIndex`: emit `last_amended` and `amendment_count` on every entry.
- `entriesEqual`: include the two new fields in the structural comparison so `diffDecisionIndex` detects amendment changes.
- Unit tests in `tests/unit/decisions.test.js`; integration coverage in `tests/integration/decisions-index.test.js`.
- Regenerate `docs/decisions/index.json`.

### Out of Scope

- **Parsing or indexing `## Errata`.** Deliberately excluded by `AIF-META-002` — an indexed errata list would imply readers should consult it, contradicting the rung's defining property. The section must be ignored entirely, not read-and-discarded.
- **Retrofitting any existing record** with `Last Amended` or an `## Amendments` section (`AIF-META-002` Resolved Item 8).
- **Adding the sections/fields to the templates** — AIF-003-003 owns both templates.
- **Validating the `Amending` status value**, or any gate logic. No status special-casing anywhere (Epic Section 5 Business Rules).
- **Validating `Last Amended`'s date format or its agreement with `amendment_count`.** A record may legitimately have `amendment_count: 1` and `last_amended: null` — see Section 9.
- **Any change to `lib/commands/index.js`** — the CLI interface and output are unchanged.

---

## 6. Prerequisites

- [ ] Epic `AIF-003` `Status: Approved` committed (done — commit `8c82f90`)
- [ ] This Chunk Plan `Status: Approved` committed before implementation begins
- [ ] **AIF-003-001 complete and merged** — both chunks modify `parseDecisionRecord` and `buildDecisionIndex`; this one assumes `record.supersedes` already exists and that `supersedes`/`superseded_by` are no longer hardcoded
- [ ] `aif index -d` runnable in this repo (used to regenerate the committed index)

---

## 7. Architecture & Design

### Project Structure Changes

```
lib/
└── decisions.js                        ← MODIFIED (new helper, parseDecisionRecord,
                                           buildDecisionIndex, entriesEqual)
tests/
├── unit/
│   └── decisions.test.js               ← MODIFIED
└── integration/
    └── decisions-index.test.js         ← MODIFIED
docs/
└── decisions/
    └── index.json                      ← REGENERATED (16 entries, +2 fields each)
```

No new files.

### Key Design Decisions

1. **Decision**: count `## Amendments` rows with a small dedicated pure helper (e.g. `countAmendmentRows(content)`), not by extending `parseMetadataTable`.
   **Why:** `parseMetadataTable` is anchored to the `## Metadata` heading and returns a field map; the Amendments table is positional, has a different shape, and only its row count matters. Overloading one function to do both would make both harder to test. A separate helper is independently unit-testable with a string fixture.

2. **Decision**: `amendment_count` counts rows, not amendments-by-number.
   **Why:** the `#` column is authored text and can be wrong; the row count is structural. If they ever disagree the structural answer is the honest one. Rejected rows are counted too — `AIF-META-002` keeps them in the table deliberately, and the count is "how many times was this record proposed for amendment", not "how many succeeded".

3. **Decision**: `last_amended` is stored verbatim as a string, not parsed into a date.
   **Why:** `AIF-META-002` specifies the field's content as `{YYYY-MM-DD} (Amendment {N})` — a date plus an annotation. Parsing it into a `Date` would throw away the amendment number and invent a format contract the record does not promise. The index's job is to expose the field, not to interpret it.

4. **Decision**: absent field → `null`, absent section → `0`.
   **Why:** taken directly from `AIF-META-002` Design → Tooling. The asymmetry is intentional: `null` reads as "no such field", `0` reads as "no amendments", and both are true statements about a record that has never been amended.

5. **Decision**: add both fields to `entriesEqual`'s comparison.
   **Why:** they are scalars, so the existing `JSON.stringify` normalisation covers them once they are on the entry object — but the function explicitly enumerates array fields for sorting, so a reviewer must confirm the scalars are actually included in the compared shape rather than assumed. Without this, `aif index -d` would report an amended record as up to date.

> **Tier C decisions.** All five are Tier C per `skill/decision-triage` — local implementation choices inside an already-decided design, riding this plan's `skill/plan-lifecycle` cycle.

### Patterns & Conventions Applied

- **Pure/io split preserved** (`standards/javascript_node.md`, engineering-core Rule 6). The new helper is pure: string in, number out. No new I/O.
- **Line-based scanning, not multi-line regex** — matches how `parseMetadataTable` already walks `content.split(/\r?\n/)`, and avoids the backtracking risk flagged in Epic Section 7.
- **JSDoc on every exported and internal function**, consistent with the rest of the file.

---

## 8. Components

### `countAmendmentRows` — Amendments section → row count

**File**: `lib/decisions.js` (pure section, near `parseListField`)
**Purpose**: Count the data rows of a record's optional `## Amendments` table.

**Public Interface**:

```js
function countAmendmentRows(content: string) => number
```

Not exported unless a test needs it directly; if exported, it must be covered by its own unit tests.

**Key Behaviour**:

- Locate the line whose trimmed text is exactly `## Amendments`. If absent → `0`.
- Skip forward to the first line starting with `|` (the header row), then skip the `|---|---|`-style separator row, reusing the same separator pattern `parseMetadataTable` uses.
- Count subsequent consecutive lines starting with `|`; stop at the first line that does not.
- A section present with a header and separator but no data rows → `0`.
- A section present but malformed (no table at all) → `0`, no throw. Per Epic Section 5, a malformed Amendments table is non-fatal; only a missing `Decision ID`/`Status` is a hard parse failure.
- Must not match `## Amendments` appearing inside a fenced code block. See Risk 1 for the accepted limitation.
- Must ignore `## Errata` entirely.

**Dependencies**: none.

### `parseDecisionRecord` — Metadata → record object

**File**: `lib/decisions.js`
**Purpose**: Unchanged role; two more properties on the returned record.

**Public Interface**: signature unchanged. Returned `record` gains:

```js
{
  ...,
  last_amended: string | null,   // ← NEW
  amendment_count: number        // ← NEW
}
```

**Key Behaviour**:

- `last_amended`: `fields['Last Amended']` when present and non-empty; otherwise `null`. A value of `—` is treated as absent → `null`, consistent with the repo's empty-value convention.
- `amendment_count`: `countAmendmentRows(content)`.
- Neither field is added to `REQUIRED_FIELDS`. **This is an explicit acceptance criterion** — adding `Last Amended` there would fail all 16 existing records at once (Epic Risk 11).

**Dependencies**: `countAmendmentRows`, `parseMetadataTable` (both unchanged in signature).

### `buildDecisionIndex` — records → index.json structure

**File**: `lib/decisions.js`
**Purpose**: Unchanged role; two more fields per entry.

**Key Behaviour**:

- Each entry gains `last_amended` and `amendment_count`, carried straight through from the parsed record.
- Field order in the emitted object determines key order in the written JSON. Append the two new fields **after `tags`** so the regenerated file's diff is purely additive per entry rather than reordering every existing key.
- No inversion, no cross-record computation — both fields are per-record facts.

**Dependencies**: none new.

### `entriesEqual` — structural comparison

**File**: `lib/decisions.js`
**Purpose**: Decide whether a computed entry differs from the committed one.

**Key Behaviour**:

- The normalised shape must include `last_amended` and `amendment_count`.
- No sorting applies — both are scalars.
- Confirm via test 002-T11 rather than by inspection: this is the field most likely to be silently missed, and the failure mode is `aif index -d` cheerfully reporting a stale index as current.

---

## 9. Data Models

### Index entry (extended)

**Purpose**: One record's row in `{paths.decisions}/index.json`.

| Field             | Type           | Required | Notes                                                                                                                                                                                 |
| ----------------- | -------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `last_amended`    | string \| null | Yes      | Verbatim `Last Amended` Metadata value, e.g. `2026-09-02 (Amendment 1)`. `null` when the field is absent — which is the case for all 16 current records and is not a gap to backfill. |
| `amendment_count` | number         | Yes      | Count of data rows in `## Amendments`. `0` when the section is absent. Includes rejected amendments.                                                                                  |

**Legitimate combinations** — none of these is an inconsistency to detect or repair:

| `last_amended` | `amendment_count` | Meaning                                                                                             |
| -------------- | ----------------- | --------------------------------------------------------------------------------------------------- |
| `null`         | `0`               | Never amended. Every record in the repo today.                                                      |
| `null`         | `1+`              | Amendments were proposed; none was approved (a rejected row leaves `Last Amended` untouched).       |
| set            | `1+`              | Normal amended record.                                                                              |
| set            | `0`               | Malformed — but still indexed as-is. The index reports what the record says; it does not police it. |

---

## 10. Security Requirements

> This section must never be empty.

- [ ] All external inputs validated before use — repo-local trusted markdown; the new scan must tolerate malformed, empty, or absent sections without throwing, since any thrown error aborts the entire index build for every record
- [ ] No secrets or credentials in source code or logs — no new logging; record bodies are never emitted
- [ ] Errors exposed to users contain no internal system details — no new error paths; existing messages name only the relative path
- [ ] **Line-based scanning only.** No multi-line or greedy regex over whole-file content (Epic Section 7, LOW). The separator-row test is applied per line, matching `parseMetadataTable`
- [ ] **No unbounded work per file** — the scan is a single pass over the already-split line array; do not re-split content per section
- [ ] **`## Errata` content is never read into memory as data** — not parsed, not counted, not emitted. Deliberate per `AIF-META-002`
- [ ] No new filesystem or network access — all changes are in the file's pure section; only the already-existing io wrapper touches disk

---

## 11. Logging Requirements

> This section must never be empty.

`lib/decisions.js` is a pure library and logs nothing; user-facing output belongs to `lib/commands/index.js`, unchanged by this chunk. `standards/javascript_node.md` allows `console.*` for CLI output because output is the product — that output is unchanged here.

| Event                           | Level | What is logged                                                                                                         | What is NOT logged                                   |
| ------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Index regenerated               | —     | Existing CLI line only: `✓ Decision index generated: {n} entries → {path}`, emitted by `lib/commands/index.js`         | Record bodies, amendment rows, `Last Amended` values |
| Index checked and current       | —     | Existing CLI line only: `✓ Decision index is up to date.`                                                              | n/a                                                  |
| Index stale                     | —     | Existing CLI line only: `✗ Decision index is stale: {summary}` — the summary names record IDs, which are not sensitive | Field-level diffs, record contents                   |
| Malformed `## Amendments` table | —     | Nothing, deliberately. Non-fatal per Epic Section 5; counting what parses is the specified behaviour                   | n/a                                                  |

Do not add logging to this module — it would break the pure/io split this file is explicitly organised around.

---

## 12. Testing Plan

Unit fixtures are synthetic in-memory strings, per the existing file's convention. Extend `wellFormedRecord({...})` with optional `lastAmended` and `amendmentRows` parameters, both defaulting to absent so every existing case is unaffected.

### `countAmendmentRows` / `parseDecisionRecord` Tests

| Test ID | Description                                                                    | Type | Pass Criteria                                                                                                                                       |
| ------- | ------------------------------------------------------------------------------ | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 002-T01 | No `## Amendments` section (today's normal case)                               | Unit | `amendment_count === 0`, no throw                                                                                                                   |
| 002-T02 | `## Amendments` with header + separator + 0 data rows                          | Unit | `amendment_count === 0`                                                                                                                             |
| 002-T03 | `## Amendments` with 1 data row                                                | Unit | `amendment_count === 1`                                                                                                                             |
| 002-T04 | `## Amendments` with 3 data rows, one of them a rejected amendment             | Unit | `amendment_count === 3` — rejected rows count                                                                                                       |
| 002-T05 | `## Amendments` followed by another `##` section                               | Unit | Count stops at the table's end; the following section's content is not counted                                                                      |
| 002-T06 | `## Amendments` present but malformed (heading, no table)                      | Unit | `amendment_count === 0`, no throw                                                                                                                   |
| 002-T07 | `## Errata` present with 2 rows, no `## Amendments`                            | Unit | `amendment_count === 0`; no errata data appears anywhere in the entry                                                                               |
| 002-T08 | `Last Amended` absent                                                          | Unit | `last_amended === null`                                                                                                                             |
| 002-T09 | `Last Amended` present as `2026-09-02 (Amendment 1)`                           | Unit | `last_amended` equals that exact string — not parsed, not reformatted                                                                               |
| 002-T10 | `Last Amended` present as `—`                                                  | Unit | `last_amended === null`                                                                                                                             |
| 002-T11 | **`entriesEqual` detects an amendment-only change**                            | Unit | Two entries differing only in `last_amended` (and separately, only in `amendment_count`) compare unequal; `diffDecisionIndex` reports `stale: true` |
| 002-T12 | Record with `amendment_count: 1` and `last_amended: null` (rejected-only case) | Unit | Indexes without error — this combination is valid, not an inconsistency                                                                             |
| 002-T13 | **`REQUIRED_FIELDS` regression guard**                                         | Unit | A record with no `Tier`, `Domain`, `Supersedes`, `Last Amended`, or `## Amendments` parses successfully (Epic Risk 11)                              |
| 002-T14 | Entry key order                                                                | Unit | `last_amended`/`amendment_count` appear after `tags` in the emitted entry, so the committed JSON diff stays additive                                |

### Integration Tests

| Test ID | Description                                                               | Type             | Pass Criteria                                                                      |
| ------- | ------------------------------------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------- |
| 002-T15 | Build the index over a temp directory of records, one amended and one not | Integration      | Both entries carry the new fields with correct values                              |
| 002-T16 | Regenerated `docs/decisions/index.json` matches a fresh build             | Integration      | `aif index -d` reports "up to date" against the committed file after regeneration  |
| 002-T17 | All 16 real records still index cleanly                                   | Integration      | 16 entries, every one `last_amended: null` / `amendment_count: 0`, no parse errors |
| 002-T18 | Full suite regression                                                     | Unit+Integration | `npm test` passes                                                                  |

---

## 13. Documentation Requirements

- [ ] Inline documentation on all public members — JSDoc for `countAmendmentRows`; updated `@returns` on `parseDecisionRecord`; updated docblock on `buildDecisionIndex`
- [ ] File headers on all new source files — no new files; append this chunk's ID to `lib/decisions.js`'s existing header (`Plan: AIF-002-014, AIF-003-001, AIF-003-002`) rather than replacing prior provenance (engineering-core Rule 2)
- [ ] A comment at the `## Errata` omission point stating that errata are deliberately not indexed, citing `AIF-META-002` — without it, a future reader will "fix" the apparent oversight
- [ ] A comment at `REQUIRED_FIELDS` noting that `Last Amended` is intentionally excluded, in the same style as the existing `Tier`/`Domain` note
- [ ] README updated if user-facing — not applicable
- [ ] CHANGELOG entry written

---

## 14. Risks & Open Questions

| #   | Risk / Question                                                                                                                                                                                                                                | Type | Impact | Mitigation                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **A `## Amendments` heading inside a fenced code block would be miscounted.** `AIF-META-002` itself contains a fenced example of the Amendments table, so this is not hypothetical — a future record quoting the template could be misindexed. | Risk | M      | Accepted with a documented limitation: `parseMetadataTable` has the identical exposure today for `## Metadata` and has never been a problem in practice, since these headings only appear in template/spec documents rather than in records that live under `paths.decisions`. Do **not** add a fence-tracking state machine in this chunk — if it becomes real, it is a separate correction covering both functions consistently. Note the limitation in the JSDoc. |
| 2   | **`entriesEqual` silently omitting the new fields** is the highest-consequence and least-visible failure mode: `aif index -d` would report an amended record as up to date, so the index would quietly rot.                                    | Risk | M      | Test 002-T11 covers it directly and is written to fail if either field is omitted. Reviewer must confirm the test fails when the field is removed from the comparison, not merely that it passes.                                                                                                                                                                                                                                                                    |
| 3   | Regenerating `docs/decisions/index.json` produces a 16-entry diff plus a new `generated_at`, which is noisy to review.                                                                                                                         | Risk | L      | Mitigated by design decision 4 (append after `tags`), keeping each entry's diff to two added lines. Commit the regeneration separately from the code change so the noisy diff is isolated (engineering-core Rule 9 / git-workflow-framework Option A).                                                                                                                                                                                                               |
| 4   | If `AIF-003-003` (templates) has not merged when this chunk runs, no record will exercise the new fields end-to-end.                                                                                                                           | Risk | L      | Not blocking: the fields are optional by design and the unit/integration fixtures are synthetic. `chunks.json` does not make this chunk depend on 003, deliberately — see Epic Section 9.                                                                                                                                                                                                                                                                            |

---

## 15. Work Log

[2026-08-25] [Tech-Lead] [Created] [AIF-003-002] [Chunk Plan drafted from Epic AIF-003 Section 9 following its approval (`8c82f90`). Verified against source: confirmed `entriesEqual` enumerates only array fields for sorting (so the two new scalars must be deliberately included — recorded as Risk 2 with a dedicated test), confirmed `parseMetadataTable` is anchored to `## Metadata` and unsuitable for the positional Amendments table (hence a separate pure helper), and confirmed all 16 current records lack `Last Amended` so the `REQUIRED_FIELDS` trap in Epic Risk 11 would fail every record at once — promoted to an explicit acceptance criterion and a regression test (002-T13). Identified the fenced-code-block exposure in Risk 1 while checking how `## Amendments` would be located; deliberately not fixed here, since `parseMetadataTable` has the same exposure and a partial fix would leave the two functions inconsistent. Folded the index regeneration into this chunk per Epic Risk 12, with an instruction to commit it separately from the code change. Complexity assessed as Tier 2 per `skill/complexity-tiers`.]

[2026-08-25] [Tech-Lead] [Approved] [AIF-003-002] [Approved by Jeremy Smellie with no requested revisions. Status committed per `skill/plan-lifecycle` Step 4, as its own commit ahead of any implementation commit. This chunk is now cleared for dispatch; implementation is Software-Engineer's, not Tech-Lead's, and must commit incrementally per engineering-core Rule 9.]
