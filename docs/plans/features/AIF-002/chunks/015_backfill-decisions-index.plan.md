# Chunk Plan: Backfill `docs/decisions/index.json` via `aif index -d`

## 1. Metadata

| Field          | Value                                                                                                                                                                                                                    |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Plan ID        | AIF-002-015                                                                                                                                                                                                              |
| Parent Epic    | AIF-002                                                                                                                                                                                                                  |
| Chunk          | 15 of 15                                                                                                                                                                                                                 |
| Depends On     | AIF-002-009, AIF-002-010, AIF-002-011, AIF-002-012, AIF-002-013 (all 11 records must be migrated to their final ID/domain/status first), AIF-002-014 (the `aif index -d` tool must exist to run it)                      |
| Can Parallel   | None (sole Wave 3 chunk)                                                                                                                                                                                                 |
| Project        | ai-foundation                                                                                                                                                                                                            |
| Status         | Approved                                                                                                                                                                                                                 |
| Author (Agent) | AI-Engineer (self-planned)                                                                                                                                                                                               |
| Reviewed By    | Jeremy Smellie                                                                                                                                                                                                           |
| Created        | 2026-08-17                                                                                                                                                                                                               |
| Last Updated   | 2026-08-16 (revised — added AIF-META-001 pointer edit and stale-reference sweep scope, per Epic Open Question 8 resolution)                                                                                              |
| Standards      | AGENTS.md declarative-component schemas — this chunk produces `docs/decisions/index.json`, a `docs/` data artifact, per AIF-004's boundary table. No code is written by this chunk; it runs a tool built in AIF-002-014. |

---

## 2. Goal

Produce the first real `docs/decisions/index.json` for this repo by running `aif index -d` (built in AIF-002-014) against all 11 migrated Decision Records, verify `aif index -d --check` passes against the result, and commit the generated file. **(Added, 2026-08-16, per Epic Open Question 8's resolution)** Also performs the two follow-on documentation edits that Epic AIF-002's Open Question 8 assigned here rather than to the individual migration chunks (009-013): (a) a single-line pointer edit to `AIF-META-001`, and (b) a narrow sweep for any other genuinely valid stale old-ID references in live documentation left unhandled by the migration chunks.

> Requirement traceability: AIF-002 Epic Plan §3 ("One-time creation of
> `docs/decisions/index.json`, backfilled from the 11 existing records...
> produced by running `aif index -d` against the migrated records, not
> hand-authored") and §8 (Wave 3).

---

## 3. Quick Summary

**Open Items:** 3 open (0 High / 1 Medium / 2 Low) — Risk 4 resolved 2026-08-24, see Section 14

---

## 4. Acceptance Criteria

- [ ] `docs/decisions/index.json` exists and is committed
- [ ] ~~Contains exactly 11 entries, one per migrated record (Test BF-T01, BF-T02)~~ **(Superseded, 2026-08-24, human decision — see Work Log)** Contains exactly 14 entries: the 11 originally-migrated records plus `AIF-META-001`, plus two new records committed by Architect outside this Epic (`AIF-ARCH-005`, `AIF-ARCH-006`) which the human confirmed (chat, 2026-08-24: "New DRs is fine") legitimately belong in the index (Test BF-T01, BF-T02)
- [ ] Every `path` resolves (Test BF-T03)
- [ ] Every entry's `domain`/`tier`/`status` matches its source record (Test BF-T04)
- [ ] `references`/`referenced_by` bidirectionally consistent (Test BF-T05)
- [ ] `aif index -d --check` exits 0 against the committed result (Test BF-T06)
- [ ] `npm test` passes (Test BF-T07)
- [ ] No hand-editing of the generated file occurred (Key Design Decision 1) — verified by the file being the direct, unmodified output of `aif index -d`
- [ ] Any data problem discovered during verification was routed back to its owning migration chunk, not patched here
- [ ] No HIGH or CRITICAL findings open in review
- [ ] This Chunk Plan itself is committed with `Status: Draft` via `ai-git` before being presented for human approval, per `skill/plan-lifecycle`
- [ ] **(Added, 2026-08-16)** `AIF-META-001` carries a single-line pointer to Epic AIF-002 Section 4 as the source of truth for the old→new ID mapping, with its existing embedded table/prose otherwise untouched
- [ ] **(Added, 2026-08-16)** Any other genuinely valid stale old-ID references identified as unresolved in the migration chunks own disposition tables (009-013) are fixed, scoped narrowly per Section 5

---

## 5. Scope

### In Scope

- Run `aif index -d` against this repo's `docs/decisions/` directory, once all 11 records (migrated by chunks 009–013) exist in their final `{domain}/{ID}_{ShortTitle}.decision.md` form.
- Verify the generated `docs/decisions/index.json`:
  - Contains exactly 11 entries, one per migrated record.
  - Every entry's `id`, `tier`, `domain`, `status`, `path` match the corresponding record's Metadata table and actual file location.
  - `references`/`referenced_by` are bidirectionally consistent (by construction, since `aif index -d` computes `referenced_by` by inversion — this is a confirmation check, not new logic).
  - Every `path` resolves to a real file on disk.
- Run `aif index -d --check` against the committed result and confirm it exits 0 (no drift immediately after generation).
- Commit `docs/decisions/index.json` to the repo.
- **(Added, 2026-08-16, per Epic Open Question 8's resolution)** Update `AIF-META-001` (`docs/decisions/meta-process/AIF-META-001_decision-record-tiering-and-domain-ownership.decision.md`) with a single-line pointer/reference edit: its "Migration of existing records" section should state that Epic AIF-002's Section 4 migration table is the authoritative, up-to-date source of truth for the old→new ID mapping, rather than leaving its own embedded copy (now stale/superseded) as an apparent second source of truth. This is a pointer edit only — do not delete, rewrite, or find-replace AIF-META-001's existing embedded table or its historical prose; the table remains valid as a point-in-time snapshot of the original decision, it is simply no longer the place to look for the current mapping.
- **(Added, 2026-08-16, per Epic Open Question 8's resolution)** Sweep for and fix any other genuinely valid stale old-ID references in live documentation surfaced during migration (chunks 009-013) but not already handled by those chunks — real stale citations only (e.g. "AIF-005" appearing in running prose that should say "AIF-PROC-002"), never plain mentions of Epic AIF-002 itself by its own ID (Epic IDs are a separate, un-renumbered scheme per Epic §3's own note). Scope this narrowly: consult each of chunks 009-013's own grep-and-disposition tables (Section 7/6 of each) for hits they explicitly left unresolved or flagged as ambiguous, rather than re-running an unscoped repo-wide grep from first principles.
- If verification surfaces a data problem in a migrated record (e.g. a `References` field pointing to an ID that doesn't exist, a Metadata table field that doesn't parse) — **stop and report**, per Section 8 (Error Handling); do not hand-edit the generated `index.json` to work around it, and do not silently fix the source record without flagging it, since that would be undocumented scope creep into a migration chunk's own territory.

### Out of Scope

- Any change to `aif index -d`'s implementation, `lib/commands/index.js`, or `lib/decisions.js` — that is chunk 014, already complete and Approved by the time this chunk runs (dependency).
- Any change to any of the 11 migrated Decision Records' content — this chunk only reads them; fixing a data problem discovered during verification is routed back to the relevant migration chunk (009–013), not patched here (see In Scope, last bullet).
- Adding a `Supersedes`/`Superseded By` field to any template or record — out of scope for chunk 014 (Risk 3 there) and equally out of scope here; this chunk accepts `supersedes`/`superseded_by` as empty arrays in the generated output, consistent with chunk 014's documented limitation.
- Any `tests/validation/` change — validation of `index.json`'s structural integrity is `aif index -d --check` (chunk 014's own deliverable), not a separate `tests/validation/` addition (rev 6 correction, already reflected in the Epic Plan).
- Wiring `aif index -d` into `skill/plan-lifecycle` as an ongoing required step — that is chunk 004's documentation concern; this chunk is a one-time backfill run, not the establishment of the ongoing convention.
- **(Added, 2026-08-16)** Any full reformat, rewrite, or removal of `AIF-META-001`'s own embedded migration table or historical narrative — Open Question 8's resolution calls for a single pointer/reference edit only (see In Scope). `AIF-META-001` remains Approved and authoritative; this chunk does not reopen it for revision beyond that one pointer.
- **(Added, 2026-08-16)** Old-ID references inside `docs/plans/` Epic/Chunk Plans (e.g. `docs/plans/epics/AIF-001.epic.md`, `docs/plans/tech-lead-subagent-dispatch-plan.md`) that are historical planning-time snapshots, not live cross-references — per the migration chunks' own disposition tables (see, e.g., AIF-002-009 §5/6), these are generally treated as historical artifacts, not rewritten. This chunk only fixes references those disposition tables identified as genuinely unresolved, not a fresh, unscoped audit of every `docs/plans/` file.

---

## 6. Prerequisites

- [ ] AIF-002-009 `Status: Approved` and implemented (AIF-001–003 migrated, light touch)
- [ ] AIF-002-010 `Status: Approved` and implemented (AIF-006 migrated)
- [ ] AIF-002-011 `Status: Approved` and implemented (AIF-008 migrated)
- [ ] AIF-002-012 `Status: Approved` and implemented (AIF-004/005/007/009/010 migrated)
- [ ] AIF-002-013 `Status: Approved` and implemented (AIF-011 migrated)
- [ ] AIF-002-014 `Status: Approved` and implemented (`aif index -d` exists and passes its own test suite)
- [ ] All 11 records confirmed present at their final locations (`docs/decisions/{domain}/{ID}_{ShortTitle}.decision.md`) before this chunk runs

---

## 7. Architecture & Design

### Project Structure Changes

- `docs/decisions/index.json` ← NEW (generated, not hand-authored)

### Key Design Decisions

1. **Decision**: This chunk performs no hand-editing of the generated `index.json` — if the tool's output looks wrong, the fix is either in the source record (routed back to a migration chunk) or in the tool itself (routed back to chunk 014), never a direct edit to the JSON output.
   **Rationale**: Direct implementation of AIF-002 Epic Plan Section 6's business rule ("`docs/decisions/index.json` is a derived/generated artifact. No agent or skill hand-edits it directly"). Hand-editing the output here, even to "just fix one thing," would reintroduce exactly the drift risk the generated-artifact model exists to prevent, and the next `aif index -d` run would silently overwrite the hand-edit anyway.

2. **Decision**: This chunk is a "run and verify" chunk, not an implementation chunk — its own Components/Data Models sections are correspondingly thin, since it introduces no new logic.
   **Rationale**: Matches the actual nature of the work per the Epic's Section 5 description ("produced by running `aif index -d` against the migrated records, not hand-authored"). A heavyweight Chunk Plan for a "run a command and check its output" task would be ceremony without substance; `skill/complexity-tiers` assessment (Section 15) reflects this as Tier 1.

### Patterns & Conventions Applied

- AGENTS.md declarative-component conventions for `docs/` content.
- `skill/plan-lifecycle` commit-gate procedure for this Chunk Plan itself.

---

## 8. Components

### `docs/decisions/index.json` — generated backfill output

**File**: `docs/decisions/index.json`
**Purpose**: The first real cross-domain decision index for this repo, generated (not authored) by running `aif index -d` against all 11 migrated records.

**Key Behaviour**:

- Produced entirely by AIF-002-014's tool — this chunk supplies no new parsing/generation logic.
- 11 entries, matching AIF-002 Epic Plan Section 5's migration table exactly (IDs `AIF-ARCH-001` through `AIF-ARCH-004`, `AIF-PROC-001` through `AIF-PROC-006`, `AIF-PLAN-001`).

**Error Handling** (this chunk's actual work, beyond running the command):

- **`aif index -d` exits non-zero (malformed record found)**: stop immediately; do not attempt to work around it in this chunk. Identify which migration chunk (009–013) produced the offending record and report back to it — that chunk's own Chunk Plan or a follow-up revision fixes the source record, not this chunk.
- **`aif index -d --check` finds drift immediately after generation**: should not happen by construction (generation and the check use the same underlying logic per chunk 014's design) — if it does, this is itself a bug in chunk 014's tool, reported back there, not worked around here.
- **A `References` field points to an ID that doesn't exist among the 11 migrated records**: `aif index -d`'s inversion logic (chunk 014) will simply not find a match for that reference — it does not itself validate that every `References` entry resolves to a real ID in the corpus (chunk 014's Section 8 does not specify this as a validation step, only that `referenced_by` is computed from what does match). This chunk's own verification step (Section 5, second bullet) catches this by manually cross-checking each entry's `references` list against the set of real IDs — if any don't resolve, stop and report to the migration chunk that owns the record with the bad reference, per the Epic's Section 8 ("a broken cross-reference during migration is a data-integrity defect, not merely cosmetic").

**Dependencies**:

- `aif index -d` (AIF-002-014) — the tool this chunk runs
- All 11 migrated Decision Records (AIF-002-009 through 013) — the source data

---

## 9. Data Models

No new data model — `docs/decisions/index.json`'s shape is entirely defined by AIF-META-001's Design section and implemented by AIF-002-014's `lib/decisions.js`. This chunk verifies conformance; it does not define or alter the shape.

---

## 10. Security Requirements

> This section must never be empty.

- [ ] No new attack surface — this chunk runs an already-reviewed CLI command (`aif index -d`, chunk 014) against this repo's own committed content; no external input, no network calls.
- [ ] No secrets or credentials involved — decision records and their generated index contain no credential-shaped content.
- [ ] The generated `index.json` is committed as-is, with no hand-editing (Key Design Decision 1) — this is itself a security/integrity property, not just a process nicety: it guarantees the committed file is exactly what the reviewed, tested tool from chunk 014 produced, with no unreviewed manual modification introduced at commit time.
- [ ] If a cross-reference integrity problem is found (Section 8, Error Handling), it is reported and fixed at the source (a migration chunk), never patched around in the generated output — preserves the Epic's referential-integrity requirement (Section 8) as a real guarantee, not a cosmetic one.

---

## 11. Logging Requirements

> This section must never be empty.

This chunk performs a one-time CLI run plus manual verification, not ongoing runtime execution — no new application log stream is introduced. The relevant logging is `aif index -d`'s own console output (already specified in chunk 014, Section 11) plus this chunk's own Work Log entries.

| Event                                             | Level (Work Log equivalent)                                          | What is logged                                             | What is NOT logged                                                                                      |
| ------------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `aif index -d` run against the real repo          | Captured in this chunk's implementation commit message/Work Log      | Entry count generated, confirmation `--check` passed       | Full file contents duplicated into the Work Log (the file itself is the artifact, committed separately) |
| A data problem found during verification (if any) | Work Log `[Blocked]`/note, referencing the offending migration chunk | Which record, which field, which chunk it's routed back to | —                                                                                                       |
| Chunk Plan Draft/Revised/Approved                 | Work Log entry, this file's §14                                      | Standard plan-lifecycle fields                             | —                                                                                                       |

---

## 12. Testing Plan

This chunk produces a data artifact via a tool already tested in chunk 014 — "testing" here is verification of the generated output against the known-correct migration data, not new automated tests.

### `docs/decisions/index.json` Verification

| Test ID | Description                                                                                                                                                                                                                                                 | Type                                              | Pass Criteria                                              |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------------- |
| BF-T01  | ~~`docs/decisions/index.json` contains exactly 11 entries~~ **(Superseded, 2026-08-24, human decision — see Work Log)** contains exactly 14 entries                                                                                                         | Manual/scripted count check                       | Count is 14                                                |
| BF-T02  | ~~Every entry's `id` matches one of the 11 final IDs from AIF-002 Epic Plan §3's migration table~~ **(Superseded, 2026-08-24)** Every entry's `id` matches one of the 11 originally-migrated final IDs, plus `AIF-META-001`, `AIF-ARCH-005`, `AIF-ARCH-006` | Manual cross-check                                | Full match, no missing/extra IDs                           |
| BF-T03  | Every entry's `path` resolves to a real file on disk                                                                                                                                                                                                        | Manual/scripted check (`existsSync` per entry)    | All resolve                                                |
| BF-T04  | Every entry's `domain`/`tier`/`status` matches the corresponding record's actual Metadata table                                                                                                                                                             | Manual spot-check (all 11, given the small count) | Full match                                                 |
| BF-T05  | `references`/`referenced_by` are bidirectionally consistent across all 11 entries                                                                                                                                                                           | Manual cross-check                                | For every `A references B`, `B.referenced_by` includes `A` |
| BF-T06  | `aif index -d --check` exits 0 immediately after generation                                                                                                                                                                                                 | Automated (run the command)                       | Exit code 0                                                |
| BF-T07  | `npm test` passes (no regression introduced by adding this file)                                                                                                                                                                                            | Automated                                         | Exit code 0                                                |

---

## 13. Documentation Requirements

- [ ] Inline documentation on all public members — N/A, this chunk produces a generated JSON data file, not source code
- [ ] File headers on all new source files — N/A for generated JSON; `generated_at` field (from chunk 014's `buildDecisionIndex`) serves as the file's own provenance marker
- [ ] README updated if user-facing — confirmed at implementation time whether `README.md` references `docs/decisions/`; if so, note that the index now exists and is generated, not hand-maintained
- [ ] CHANGELOG entry written — deferred to Epic-level sign-off, consistent with every other chunk in this Epic

---

## 14. Risks & Open Questions

| #   | Risk / Question                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Impact | Mitigation                                                                                                                                                                                                                                                                                                                                                            |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | This chunk is entirely dependent on all 5 migration chunks and chunk 014 being fully Approved and correctly implemented — it has no independent value until then and cannot be meaningfully started early.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | L      | Reflected accurately in `chunks.json` (`depends_on: ["009","010","011","012","013","014"]`) and Section 6 Prerequisites — no attempt to parallelize this chunk against its dependencies.                                                                                                                                                                              |
| 2   | If a cross-reference or parsing problem is found during this chunk's verification, fixing it requires reopening an already-Approved migration chunk (009–013) or chunk 014, which this chunk cannot do unilaterally.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | M      | Documented explicit "stop and report" behavior (Section 8, Error Handling) rather than silently patching around it. This is a real risk that could block Epic completion, not eliminated by this chunk, but its scope is deliberately kept out of this chunk's authority to avoid an undocumented fix landing outside the process that produced the original content. |
| 3   | `supersedes`/`superseded_by` will be empty for all 11 entries, per chunk 014's Risk 3 (no `Supersedes` field in the current templates). None of the 11 existing records currently use `Status: Superseded`, so this gap has no visible effect on this specific backfill — but it means the backfilled index cannot yet represent a superseding relationship if one is later declared.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | L      | Accepted as a known, documented limitation inherited from chunk 014; not this chunk's to fix. Revisit if/when chunks 002/003 gain a `Supersedes` field.                                                                                                                                                                                                               |
| 4   | ~~**(Discovered, 2026-08-24)** `AIF-ARCH-005`'s `References` field cites the old-numbering ID `AIF-005` (the record now known as `AIF-PROC-002`), which does not resolve to any real entry in the generated index — its `references` array contains a dangling old-ID string and `AIF-PROC-002.referenced_by` does not include it. `AIF-ARCH-005` was authored by Architect after this Epic's migration and is not one of the 11 records this chunk is scoped to fix (Section 5, Out of Scope) or one covered by chunks 009–013's disposition tables.~~ **Resolved (2026-08-24, human direction, full commit authorization given directly):** `AIF-ARCH-005`'s `References` fixed to `AIF-PROC-002`, `AIF-PROC-002`'s `Referenced By` gained the reverse link, `docs/decisions/index.json` regenerated via `aif index -d` (unmodified tool output), `--check` passes, `npm test` 681/681. Commit `745d503`, direct to `main`, outside this chunk's own scope/plan (same ad hoc human-approved pattern as commits `5543cc4`/`c47c86f`). | L      | Originally not fixed by this chunk per Rule 4 (raise, don't silently expand scope) and this chunk's own "stop and report, do not patch source records" mandate (Section 8); raised as an open item for Architect/Tech-Lead follow-up. Did not block this chunk's own acceptance criteria. Follow-up completed same-day per explicit human instruction.                |

---

## 15. Work Log

[2026-08-17 00:00] [AI-Engineer] [Created] [AIF-002-015] [Self-planned per Tech-Lead's re-sequenced decomposition (`chunks.json`, rev 6 chunk-plan revisit). Read AIF-002 Epic Plan §3/§8 (rev 6), AIF-002-014's Chunk Plan (the tool this chunk depends on and runs), and the Epic's migration table (§3) for the 11 final IDs this chunk verifies against. Assessed Tier 1 (Simple) per `skill/complexity-tiers` — this chunk runs an already-built, already-tested tool and performs verification/commit, introducing no new logic, schema, or component of its own. Deliberately thin Components/Data Models sections reflect this. Sole Wave 3 chunk; depends on every migration chunk (009-013) and chunk 014. Documented explicit "stop and report, do not patch around" behavior for any data problem discovered during verification, since this chunk has no authority to silently fix another chunk's already-Approved output. `Status: Draft`, not yet presented for human review.]
[2026-08-16] [AI-Engineer] [Revised] [AIF-002-015] [Applied the human's resolution (2026-08-16) of Epic Open Question 8: AIF-META-001 should be updated with a single-line pointer edit referencing Epic AIF-002 Section 4's migration table as the source of truth for the old→new ID mapping (rather than embedding its own separate, driftable copy), and any other genuinely valid stale old-ID references found in live documentation during migration (009-013) that were not already handled by those chunks should be fixed here, scoped narrowly to real stale citations only, never plain mentions of Epic AIF-002 by its own un-renumbered ID. Added both as new scope items to Section 5 (In Scope), corresponding Out-of-Scope clarifications (no full AIF-META-001 rewrite, no unscoped docs/plans/ audit), and two new Acceptance Criteria items (Section 4). This resolution also closes the identical underlying concern separately flagged as an unresolved risk by chunks AIF-002-009, -010, -011, and -013 (each noted AIF-META-001's embedded migration table as stale without editing it) — see Epic AIF-002 Work Log, 2026-08-16. Status remains Draft — this is a content revision to an already-Draft plan, not a Draft → Approved transition; the plan still requires full human review before implementation, and per its Section 6 Prerequisites still depends on chunks 009-014 landing first.]
[2026-08-18] [AI-Engineer] [Revised] [AIF-002-015] [Migrated this Chunk Plan to the reordered template structure approved for skill/chunk-planning: Quick Summary (new Section 3, open-item count derived from the existing Risks & Open Questions table) and Acceptance Criteria (moved from Section 12 to Section 4) now sit immediately after the Goal; all other sections renumbered accordingly (mapping: 3->5, 4->6, 5->7, 6->8, 7->9, 8->10, 9->11, 10->12, 11->13, 13->14, 14->15). Every inline "Section N" cross-reference in this file, including references into the AIF-002 Epic Plan's own renumbered sections, was remapped to match. No wording, decisions, criteria, or risk content was changed - purely structural, per human direction (no active work on these plans at the time of migration).]
[2026-08-18] [Engineering-Manager] [Approved] [AIF-002-015] [Human (Jeremy Smellie) explicitly confirmed in chat that chunks AIF-002-007 through AIF-002-015 are approved. Per skill/plan-lifecycle and engineering-core Rule 8, recorded that decision as a committed status change: `Status` updated from `Draft` to `Approved`, `Reviewed By` updated from `Pending` to `Jeremy Smellie`. No plan content changed. Committed as its own commit, separate from the prior revision history.]
[2026-08-23] [AI-Engineer] [Blocked] [AIF-002-015] [First implementation attempt: ran `aif index -d` against `docs/decisions/` and hit two blocking issues, per this chunk's own "stop and report" mandate (Section 8/10): (1) `lib/decisions.js`'s `REQUIRED_FIELDS` hard-required `Tier`/`Domain`, which chunk 009's already-Approved light-touch migration of `AIF-ARCH-001`/`002`/`003` deliberately omits by design, causing the tool to error on all three; (2) `docs/decisions/` contained 14 `.decision.md` files, not the plan's expected 11 — the extra 3 being `AIF-META-001` (the meta-record governing the model itself) plus two new records, `AIF-ARCH-005`/`AIF-ARCH-006`, committed by Architect outside this Epic's scope entirely. Both are schema/scope conflicts this chunk has no unilateral authority to resolve (Rule 5 — architectural/scope decisions escalate, not decided ad-hoc). No source or generated files modified; no commits made; worktree left clean. Routed to the human for a decision on both points.]
[2026-08-24] [AI-Engineer] [Resumed] [AIF-002-015] [Human (Jeremy Smellie, chat, 2026-08-24) resolved both blockers: (1) "work with the legacy records" — `lib/decisions.js` should tolerate `AIF-ARCH-001`/`002`/`003`'s missing `Tier`/`Domain` rather than erroring; (2) "New DRs is fine" — `AIF-ARCH-005`/`AIF-ARCH-006` legitimately belong in the index alongside the 11 originally-migrated records and `AIF-META-001`. Software-Engineer applied fix (1) in commit `c47c86f` on `main` (`REQUIRED_FIELDS` reduced to `['Decision ID', 'Status']`; `Tier`/`Domain` parse to `null` when absent), rebased into this branch — verified present in this worktree before proceeding (`grep REQUIRED_FIELDS lib/decisions.js` shows only `Decision ID`/`Status`). Note: this fix landed as a direct commit to `lib/decisions.js` outside this chunk's own governing plan (chunk 014's tool implementation, already Approved) — recorded here for traceability, not authored by this chunk. Ran `aif index -d`: succeeded, 14 entries generated (no hand-editing). Verified: BF-T01 (14 entries, superseded count per human decision, see below) pass; BF-T02 (IDs = `AIF-ARCH-001..006`, `AIF-META-001`, `AIF-PLAN-001`, `AIF-PROC-001..006`) pass; BF-T03 (all 14 `path`s resolve via `existsSync`) pass; BF-T04 (manual cross-check of every entry's `tier`/`domain`/`status` against its source Metadata table, including confirming `AIF-ARCH-001`/`002`/`003` correctly show `tier: null, domain: null`) pass; BF-T05 (references/referenced_by cross-checked bidirectionally across all 14 entries) pass, with one discovered-but-out-of-scope exception logged as Risk 4 below (`AIF-ARCH-005` cites the stale old-numbering ID `AIF-005` instead of `AIF-PROC-002`, a dangling reference in a record outside this chunk's scope — not fixed here per Rule 4, raised as an open item instead); BF-T06 (`aif index -d --check` exit 0) pass; BF-T07 (`npm test`, 653/653 passing) pass.]
[2026-08-24] [AI-Engineer] [Revised] [AIF-002-015] [Per explicit human instruction (chat, 2026-08-24), updated Section 4 (Acceptance Criteria) and Section 12 (Testing Plan, BF-T01/BF-T02) to supersede the original "exactly 11 entries" criterion with "exactly 14 entries" (11 originally-migrated + `AIF-META-001` + `AIF-ARCH-005` + `AIF-ARCH-006`), striking the superseded text rather than deleting it, per the human's explicit direction that this is a human-directed change to the plan's acceptance criteria, not a unilateral deviation by this agent (engineering-core Rule 1/Rule 8 — plan content changes require the same commit-gate discipline as the original plan). Added Risk 4 to Section 14 documenting the discovered-but-unfixed `AIF-ARCH-005` stale reference (see Resumed entry above) and updated the Quick Summary open-item count (Section 3) from 3 to 4. Completed the two owed documentation edits: (a) single-line pointer edit to `AIF-META-001`'s "Migration of existing records" section, directing readers to Epic AIF-002 Section 4 as the authoritative old→new ID mapping, existing embedded table left untouched; (b) fixed the stale "AIF-002" → "AIF-ARCH-002" prose reference in `AIF-ARCH-001`'s Resolved Items table (chunk 009 PE review MEDIUM finding, assigned here). Confirmed `README.md` does not reference `docs/decisions/` — no README change needed. `docs/decisions/index.json` committed as-is, unmodified from `aif index -d`'s direct output.]
[2026-08-24] [Engineering-Manager] [Revised] [AIF-002-015] [Human explicitly directed fixing Risk 4's previously-out-of-scope `AIF-ARCH-005` stale reference, with full commit authorization given directly in chat. Fixed `AIF-ARCH-005`'s `References` field (`AIF-005` → `AIF-PROC-002`) and added the missing reverse link on `AIF-PROC-002`'s `Referenced By`, restoring bidirectional cross-reference integrity. Regenerated `docs/decisions/index.json` via `aif index -d` (generated artifact, not hand-edited); `aif index -d --check` passes; `npm test` 681/681. Commit `745d503`, pushed directly to `main`, outside this chunk's own governing plan/scope — same ad hoc human-approved pattern as commits `5543cc4` (ai-git token-leak fix) and `c47c86f` (legacy-record tolerance fix), no formal Plan ID. Marked Risk 4 (Section 14) resolved; Quick Summary open-item count (Section 3) updated 4 -> 3.]
