# Chunk Plan: Parse `Supersedes` and Invert It Into `superseded_by`

## 1. Metadata

| Field          | Value                                                                                                                                           |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Plan ID        | AIF-003-001                                                                                                                                     |
| Parent Epic    | AIF-003                                                                                                                                         |
| Chunk          | 1 of 8                                                                                                                                          |
| Depends On     | None                                                                                                                                            |
| Can Parallel   | AIF-003-003, AIF-003-004, AIF-003-005 (wave 1)                                                                                                  |
| Project        | ai-foundation                                                                                                                                   |
| Status         | Approved                                                                                                                                        |
| Author (Agent) | Tech-Lead                                                                                                                                       |
| Reviewed By    | Jeremy Smellie                                                                                                                                  |
| Created        | 2026-08-25                                                                                                                                      |
| Last Updated   | 2026-08-25 (Approved by Jeremy Smellie)                                                                                                         |
| Standards      | `standards/javascript_base.md`, `standards/javascript_node.md` (project tags `javascript`, `node`). Software-Engineer track per `AIF-PROC-001`. |

---

## 2. Goal

Wire up the supersede half of the decision index, which is currently half-built: `buildDecisionIndex` hardcodes `supersedes: []` and `superseded_by: []`, and `parseDecisionRecord` never reads a `Supersedes` field. Make the parser read `Supersedes` from the Metadata table and have the index inverter compute `superseded_by` from it, exactly as `References` → `referenced_by` already works.

---

## 3. Quick Summary

**Open Items:** 1 open (0 High / 1 Medium / 0 Low) — see Section 14

This chunk must land before AIF-003-002 extends the index entry shape, per `AIF-META-002` Design → Tooling: the index must not describe the new amendment rungs while still misreporting the existing supersede rung.

---

## 4. Acceptance Criteria

- [ ] All components in Section 8 exist and build cleanly
- [ ] All tests in Section 12 pass
- [ ] Security checklist (Section 10) fully satisfied
- [ ] Logging checklist (Section 11) fully satisfied
- [ ] Documentation checklist (Section 13) fully satisfied
- [ ] Review approved with no CRITICAL or HIGH findings
- [ ] `supersedes: []` and `superseded_by: []` are no longer hardcoded literals in `buildDecisionIndex`
- [ ] `REQUIRED_FIELDS` is unchanged — still exactly `['Decision ID', 'Status']`
- [ ] A record with no `Supersedes` field still parses cleanly and yields `supersedes: []`
- [ ] `npm test` passes with no changes to any test unrelated to this chunk
- [ ] `docs/decisions/index.json` is **not** regenerated in this chunk (owned by AIF-003-002)

---

## 5. Scope

### In Scope

- `parseDecisionRecord`: read the `Supersedes` Metadata field via the existing `parseListField` helper and expose it on the returned record object.
- `buildDecisionIndex`: emit `supersedes` from the parsed value, and compute `superseded_by` by inverting `supersedes` across the record set, mirroring the existing `referenced_by` inversion loop.
- Unit tests in `tests/unit/decisions.test.js` covering the new parse and inversion, including the absent-field case.

### Out of Scope

- **`last_amended` / `amendment_count`** — AIF-003-002 owns those, and this chunk must not anticipate them.
- **Regenerating `docs/decisions/index.json`** — AIF-003-002 owns it. No record in the repo currently declares `Supersedes`, so this chunk changes no committed index content; see Risk 1.
- **Adding the `Supersedes` field to the record templates** — AIF-003-003 (AI-track) owns both templates.
- **Validating that a `Supersedes` ID refers to a real record** — Epic Question 7, answered "no". `References` does not validate either, and consistency is deliberate.
- **Any change to `REQUIRED_FIELDS`.** `Supersedes` is optional; the overwhelming majority of records will never carry it.
- **Any change to `lib/commands/index.js`** — the CLI's interface and output are unaffected.

---

## 6. Prerequisites

- [ ] Epic `AIF-003` `Status: Approved` committed (done — commit `8c82f90`)
- [ ] This Chunk Plan `Status: Approved` committed before implementation begins
- [ ] No prior chunk required — this is a wave-1 chunk with no dependencies
- [ ] Node.js with `node:test` available (existing suite already relies on it)

---

## 7. Architecture & Design

### Project Structure Changes

```
lib/
└── decisions.js                    ← MODIFIED (parseDecisionRecord, buildDecisionIndex)
tests/
└── unit/
    └── decisions.test.js           ← MODIFIED (new cases + fixture parameter)
```

No new files.

### Key Design Decisions

1. **Decision**: `Supersedes` is the authored field; `superseded_by` is computed by inversion and never hand-written.
   **Why:** it mirrors the `References`/`referenced_by` pair that already exists three lines away, so there is one inversion idiom in this file rather than two. It also makes the relationship impossible to record inconsistently — a hand-maintained back-reference can disagree with its forward reference, a computed one cannot.

2. **Decision**: reuse `parseListField` rather than adding a scalar parse.
   **Why:** a record can supersede more than one predecessor (two narrow records replaced by one broad one), and `parseListField` already handles the repo's `—` empty-value convention and comma splitting. A scalar parse would have to reimplement both.

3. **Decision**: the inversion loop is extended, not duplicated.
   **Why:** `referenced_by` is already computed in a single pass over `entries`. Computing `superseded_by` in that same pass keeps the function O(n²) as it already is rather than making it two separate O(n²) passes, and keeps the two relationships visibly parallel for the next reader.

> **Tier C decisions.** These three are Tier C per `skill/decision-triage` — local implementation choices inside an already-decided design, riding this plan's own `skill/plan-lifecycle` cycle. None warrants a standalone record.

### Patterns & Conventions Applied

- **Pure/io split preserved** (`standards/javascript_node.md`, engineering-core Rule 6): every change is in the pure section of the file. `collectDecisionFiles` and `buildDecisionIndexForDir` are untouched.
- **JSDoc on exported functions** — existing `@param`/`@returns` blocks updated to reflect the new field.
- **File header** — `lib/decisions.js` already carries a header with `Plan: AIF-002-014`. See Section 13 for how it is updated.

---

## 8. Components

### `parseDecisionRecord` — Metadata → record object

**File**: `lib/decisions.js`
**Purpose**: Parse one `.decision.md` file's Metadata table into the structured record the index is built from.

**Public Interface**: unchanged signature —

```js
parseDecisionRecord(content: string, relPath: string)
  => { record: object } | { error: string }
```

The returned `record` gains one property:

```js
{
  id, tier, domain, title, status, path,
  references: string[],
  supersedes: string[],   // ← NEW
  tags: string[]
}
```

**Key Behaviour**:

- Reads `fields['Supersedes']` and passes it through the existing `parseListField`.
- Absent field → `[]` (via `parseListField`'s `!value` guard). This is the normal case for every record in the repo today.
- `—` → `[]`, per the repo's empty-value convention already implemented in `parseListField`.
- Multiple comma-separated IDs are supported and trimmed.
- `Supersedes` is **not** added to `REQUIRED_FIELDS`; a record without it must parse cleanly.

**Dependencies**:

- `parseListField` — existing helper, unchanged.
- `parseMetadataTable` — existing helper, unchanged; it already returns every row of the table, so no parsing change is needed to _find_ the field.

### `buildDecisionIndex` — records → index.json structure

**File**: `lib/decisions.js`
**Purpose**: Assemble index entries and compute both inverted relationships.

**Public Interface**: unchanged signature —

```js
buildDecisionIndex(records: object[])
  => { generated_at: string, entries: object[] }
```

**Key Behaviour**:

- `supersedes` is populated from `record.supersedes || []` instead of the current hardcoded `[]`.
- `superseded_by` is computed in the existing inversion pass: for each entry, the IDs of all other entries whose `supersedes` array contains this entry's `id`.
- Self-reference is excluded by the same `other.id !== entry.id` guard the `referenced_by` inversion already uses.
- An ID in `supersedes` that matches no entry contributes nothing and raises no error (Epic Question 7).
- Entry key order must remain as it is today, so the regenerated JSON in AIF-003-002 produces a minimal diff: `id, tier, domain, title, status, path, supersedes, superseded_by, references, referenced_by, tags`.

**Dependencies**:

- None new. `entriesEqual` already sorts and compares both `supersedes` and `superseded_by`, so `diffDecisionIndex` needs no change.

---

## 9. Data Models

### Index entry (existing shape, two fields now populated rather than stubbed)

**Purpose**: One record's row in `{paths.decisions}/index.json`.

| Field           | Type     | Required | Notes                                                                                                  |
| --------------- | -------- | -------- | ------------------------------------------------------------------------------------------------------ |
| `supersedes`    | string[] | Yes      | Was hardcoded `[]`; now parsed from the `Supersedes` Metadata field. Empty array when absent.          |
| `superseded_by` | string[] | Yes      | Was hardcoded `[]`; now computed by inverting `supersedes` across all records. Never authored by hand. |

No other field changes in this chunk.

---

## 10. Security Requirements

> This section must never be empty.

- [ ] All external inputs validated before use — input is repo-local trusted markdown; the new code must still tolerate a malformed or empty `Supersedes` value without throwing, since a parse failure aborts the whole index build (`buildDecisionIndexForDir` throws on any record error).
- [ ] No secrets or credentials in source code or logs — no new logging, no new file reads.
- [ ] Errors exposed to users contain no internal system details — no new error paths are added; existing messages name only the record's relative path.
- [ ] **No new regex over file content.** Reuse `parseListField` and `parseMetadataTable` rather than adding a pattern that scans the whole document; this avoids introducing a backtracking risk on long files (Epic Section 7).
- [ ] **No new filesystem or network access** — every change is inside the file's pure section.

---

## 11. Logging Requirements

> This section must never be empty.

`lib/decisions.js` is a pure library and deliberately logs nothing; all user-facing output belongs to `lib/commands/index.js`, which this chunk does not modify. `standards/javascript_node.md` permits `console.*` for CLI output because "output _is_ the product" — that output is unchanged here.

| Event                        | Level | What is logged                                                                                                                                             | What is NOT logged                                            |
| ---------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Successful parse/index build | —     | Nothing from this module. The existing CLI line `✓ Decision index generated: {n} entries → {path}` is unchanged and is emitted by `lib/commands/index.js`. | Record bodies, field values, supersede relationships          |
| Record fails to parse        | —     | No logging from this module; it returns `{ error }` and the io wrapper throws with the existing message, printed by the CLI as `✗ {message}`.              | File contents beyond the relative path already in the message |
| Dangling `Supersedes` ID     | —     | Nothing, deliberately. Epic Question 7 answered "no validation" — silence here is the specified behaviour, not an oversight.                               | n/a                                                           |

Adding logging to this module would be a deviation from the existing pure/io split and must not be done in this chunk.

---

## 12. Testing Plan

All tests are unit tests against synthetic in-memory fixtures, per the existing file's stated convention ("no real disk I/O"). Extend the existing `wellFormedRecord({...})` factory with a `supersedes` parameter defaulting to `'—'` so existing cases are unaffected.

| Test ID | Description                                                                      | Type             | Pass Criteria                                                                            |
| ------- | -------------------------------------------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------- |
| 001-T01 | `Supersedes` absent from the Metadata table (today's normal case)                | Unit             | `parseDecisionRecord` succeeds; `record.supersedes` deep-equals `[]`                     |
| 001-T02 | `Supersedes` present as `—`                                                      | Unit             | `record.supersedes` deep-equals `[]`                                                     |
| 001-T03 | `Supersedes` names one record                                                    | Unit             | `record.supersedes` deep-equals `['AIF-ARCH-004']`                                       |
| 001-T04 | `Supersedes` names three records, with irregular spacing                         | Unit             | Values are split and trimmed to a 3-element array                                        |
| 001-T05 | Inversion: B supersedes A                                                        | Unit             | Entry A has `superseded_by: ['B']`; entry B has `supersedes: ['A']`, `superseded_by: []` |
| 001-T06 | Inversion with a dangling ID (C supersedes `AIF-ARCH-999`, which does not exist) | Unit             | No throw; C keeps `supersedes: ['AIF-ARCH-999']`; no entry gains a `superseded_by`       |
| 001-T07 | Two records supersede the same predecessor                                       | Unit             | The predecessor's `superseded_by` contains both IDs                                      |
| 001-T08 | A record naming itself in `Supersedes`                                           | Unit             | Its own `superseded_by` stays `[]` (self-reference guard), no infinite loop              |
| 001-T09 | `references`/`referenced_by` still computed correctly alongside the new pair     | Unit             | Existing reference assertions unchanged and passing                                      |
| 001-T10 | Legacy record with no `Tier`/`Domain` **and** no `Supersedes`                    | Unit             | Parses cleanly — proves `REQUIRED_FIELDS` was not widened                                |
| 001-T11 | `diffDecisionIndex` reports a supersede-only change as stale                     | Unit             | `stale: true`, and the changed record's ID appears in the summary                        |
| 001-T12 | Full suite regression                                                            | Unit+Integration | `npm test` passes; the pre-existing 681 tests remain green                               |

---

## 13. Documentation Requirements

- [ ] Inline documentation on all public members — `@returns` on `parseDecisionRecord` and the `buildDecisionIndex` docblock updated to describe `supersedes`/`superseded_by` as parsed and inverted rather than stubbed
- [ ] File headers on all new source files — no new files; **do not** overwrite `lib/decisions.js`'s existing `Plan: AIF-002-014` header. Per engineering-core Rule 2, add this chunk's Plan ID alongside it (`Plan: AIF-002-014, AIF-003-001`) rather than replacing the original provenance
- [ ] The stale comment above `buildDecisionIndex` ("Compute referenced_by/superseded_by ... by inverting References/Supersedes") becomes accurate for the first time — verify it matches the implemented behaviour instead of leaving it aspirational
- [ ] README updated if user-facing — not applicable; no CLI interface change
- [ ] CHANGELOG entry written

---

## 14. Risks & Open Questions

| #   | Risk / Question                                                                                                                                                                                                                         | Type | Impact | Mitigation                                                                                                                                                                                                                                                         |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **No record in the repo declares `Supersedes` today**, so this chunk's behaviour change is invisible in the committed `index.json` and is only demonstrated by unit tests. A reviewer could reasonably ask whether it works end-to-end. | Risk | M      | Test 001-T05/T07 prove the inversion on synthetic multi-record sets, and AIF-003-002's integration test exercises the real index path. Do **not** invent a supersede relationship in a real record to demonstrate it — that would be fabricating decision history. |
| 2   | Field-name coupling with AIF-003-003, which adds `Supersedes` to the templates in the same wave. If the two disagree on spelling, the parser silently reads nothing (absent field → `[]`) rather than failing loudly.                   | Risk | M      | The Epic fixes the name in Section 4 and Section 6 for both chunks. Implementer must use the exact string `Supersedes` — matching is case-sensitive and exact, since `parseMetadataTable` keys on the raw cell text.                                               |
| 3   | `entriesEqual` already sorts `supersedes`/`superseded_by`, so a pure reordering will not register as a change. This is correct behaviour, but means the diff cannot detect ordering churn.                                              | Risk | L      | Accepted — matches how `references`/`tags` already behave. No action.                                                                                                                                                                                              |

---

## 15. Work Log

[2026-08-25] [Tech-Lead] [Created] [AIF-003-001] [Chunk Plan drafted from Epic AIF-003 Section 9 following its approval (`8c82f90`). Verified against the current source rather than the Epic's summary: confirmed `buildDecisionIndex` hardcodes both arrays (`lib/decisions.js:134-136`), confirmed `parseDecisionRecord` returns no `supersedes` property, confirmed `parseListField` already handles the `—` convention and comma splitting, and confirmed `entriesEqual` already normalises both fields — so `diffDecisionIndex` needs no change and none is planned. Scoped the index regeneration out (AIF-003-002 owns it) and recorded as Risk 1 that this chunk therefore produces no visible `index.json` change, with an explicit instruction not to manufacture a supersede relationship to demonstrate one. Complexity assessed as Tier 2 per `skill/complexity-tiers`: a contained change to two functions in one file, following a pattern that already exists in the same file.]

[2026-08-25] [Tech-Lead] [Approved] [AIF-003-001] [Approved by Jeremy Smellie with no requested revisions. Status committed per `skill/plan-lifecycle` Step 4, as its own commit ahead of any implementation commit. This chunk is now cleared for dispatch; implementation is Software-Engineer's, not Tech-Lead's, and must commit incrementally per engineering-core Rule 9.]

[2026-08-25] [Test-Engineer] [Verified] [AIF-003-001] [Independently verified Software-Engineer's implementation (commits `862b92e`, `e1a0b03`) against Section 12's Testing Plan. Re-ran `npm test` from a clean worktree and confirmed 692/692 passing (148 suites), matching the reported count and the plan's expected 681 pre-existing + 11 new. Reviewed all 11 new tests in `tests/unit/decisions.test.js` (001-T01 through 001-T11) against their plan rows individually — each maps to a distinct, non-redundant assertion; no coverage gaps found. Confirmed via `git diff origin/main...HEAD --stat` that only `lib/decisions.js` and `tests/unit/decisions.test.js` were modified (an initial diff against a stale local `main` ref showed a spurious `orchestration-state.json` change that does not exist on this branch — resolved by diffing against `origin/main`'s merge-base instead). Confirmed by inspection: `REQUIRED_FIELDS` unchanged, no hardcoded `supersedes`/`superseded_by` literals remain, entry key order preserved, `index.json` not regenerated, stale docblock comment corrected, file header provenance preserved (`Plan: AIF-002-014, AIF-003-001`). One open item flagged for Principal-Engineer/Tech-Lead, not blocking: the plan's Section 13 checklist item "CHANGELOG entry written" is unchecked and no `CHANGELOG.md` exists anywhere in the repo — likely inapplicable to this project's conventions, but Test-Engineer cannot confirm intent and does not have authority to waive a documentation requirement. Full Test Results Report written to `docs/plans/chunks/AIF-003/001_supersedes-parse-and-inversion.test-results.md`. Outcome: Pass. Chunk is ready to proceed to Principal-Engineer review.]
