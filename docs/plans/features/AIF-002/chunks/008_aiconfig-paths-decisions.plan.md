# Chunk Plan: .aiconfig.json — Add Explicit paths.decisions Entry

## 1. Metadata

| Field          | Value                                                                                                                                     |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Plan ID        | AIF-002-008                                                                                                                               |
| Parent Epic    | AIF-002                                                                                                                                   |
| Chunk          | 008 of 15                                                                                                                                 |
| Depends On     | None                                                                                                                                      |
| Can Parallel   | 001, 002, 003, 004, 005, 006, 007, 009 (all other Wave 1 chunks)                                                                          |
| Project        | ai-foundation                                                                                                                             |
| Status         | Approved                                                                                                                                  |
| Author (Agent) | AI-Engineer                                                                                                                               |
| Reviewed By    | Jeremy Smellie                                                                                                                            |
| Created        | 2026-08-14                                                                                                                                |
| Last Updated   | 2026-08-14                                                                                                                                |
| Standards      | ai-foundation declarative-component schemas (AGENTS.md) — no code standards apply; this chunk's deliverable is a single JSON config field |

---

## 2. Goal

Add an explicit `paths.decisions: "docs/decisions"` entry to `.aiconfig.json`'s `paths` object, matching the existing precedent set by `paths.epics` and `paths.chunks`, so that `docs/decisions/` is a first-class configured path rather than an implicit convention.

---

## 3. Quick Summary

**Open Items:** 1 open (0 High / 0 Medium / 1 Low) — see Section 14

---

## 4. Acceptance Criteria

- [ ] `.aiconfig.json` has an explicit `paths.decisions: "docs/decisions"` entry, matching the Epic Plan Acceptance Criteria item verbatim
- [ ] `.aiconfig.json` remains valid JSON with no other field changed
- [ ] Security checklist (Section 10) fully satisfied
- [ ] Logging/Work-Log checklist (Section 11) fully satisfied
- [ ] Documentation checklist (Section 13) fully satisfied
- [ ] Review approved with no CRITICAL or HIGH findings
- [ ] This Chunk Plan itself is committed with `Status: Draft` via `ai-git` before being presented for human approval, per `skill/plan-lifecycle`

---

## 5. Scope

### In Scope

- `.aiconfig.json` — add one key, `"decisions": "docs/decisions"`, to the existing `paths` object.

### Out of Scope

- Any change to other `paths.*` entries, `standards`, `orchestration`, or `ai_identity` fields in `.aiconfig.json` — untouched.
- Creating or migrating the `docs/decisions/{domain}/` subfolder structure itself — that is Wave 1 chunk 009 (light-touch migration) and the domain folders described in Epic Plan Section 5 ("Creation of the domain subfolders under `docs/decisions/`").
- Any skill or tooling change that reads `paths.decisions` — no skill in this Epic currently requires reading it programmatically; this chunk only adds the config entry itself, per the Epic Plan's exact scope description ("Adding an explicit `paths.decisions: "docs/decisions"` entry to `.aiconfig.json`").
- `tests/validation/` changes — that is Wave 4 chunk 015, scoped to `docs/decisions/index.json` validation, not `.aiconfig.json` schema validation.

---

## 6. Prerequisites

- [x] AIF-002 Epic Plan is `Approved` (verified: `docs/plans/epics/AIF-002.epic.md`, Status: Approved, Work Log entry 2026-08-14 [Approved])
- [x] Open Question 3 resolved (human, 2026-08-14): "adds flexibility, matches the precedent set for paths.epics/paths.chunks" — confirmed in Epic Plan Section 5 and Work Log
- [x] Current `.aiconfig.json` read in full (repo root)
- [x] No dependency chunks — this chunk has `depends_on: []` in `chunks.json`

---

## 7. Architecture & Design

### Project Structure Changes

- `.aiconfig.json` ← MODIFIED (one new key in the existing `paths` object)
- No new files.

### Key Design Decisions

1. **Decision**: Use the exact key/value `"decisions": "docs/decisions"`, placed in the `paths` object after `"knowledge"` and before `"epics"` (or any position within `paths` — ordering is cosmetic).
   **Rationale**: Matches the human-confirmed scope statement verbatim (Epic Plan Section 5, resolved Open Question 3) and the naming pattern already used by `paths.epics: "docs/plans/epics"` and `paths.chunks: "docs/plans/chunks"` — both point at a directory one level more specific than a broader parent path, exactly as `paths.decisions` does relative to `paths.knowledge: "docs"`.

2. **Decision**: Do not add a corresponding change to any skill's `Inputs` section to consume `paths.decisions` in this chunk.
   **Rationale**: The Epic Plan's In Scope bullet for this chunk is narrowly "adding an explicit entry," not "wiring skills to read it." Skills that produce records under `docs/decisions/` (`decision-record`, `decision-brief` — chunks 002/003) already hardcode the `docs/decisions/{domain}/` path pattern per the Epic Plan's Data Flow (Section 6, step 4). Adding config-consumption logic to those skills without an explicit Epic Plan directive would be scope expansion beyond what was confirmed; if a future chunk wants skills to read `paths.decisions` instead of hardcoding the path, that is a separate, explicitly scoped change.

### Patterns & Conventions Applied

- Follows the existing flat key-value convention already used by every other entry in `.aiconfig.json`'s `paths` object — no nesting, no new schema shape introduced.

---

## 8. Components

### .aiconfig.json paths.decisions — Config Entry

**File**: `.aiconfig.json`
**Purpose**: Register `docs/decisions/` as an explicit, named path so future tooling/skills can reference `paths.decisions` instead of a hardcoded literal.

**Public Interface**:
Not applicable — static JSON config, no function signature. Resulting shape:

```json
"paths": {
  "plans": "docs/plans",
  "knowledge": "docs",
  "epics": "docs/plans/epics",
  "chunks": "docs/plans/chunks",
  "decisions": "docs/decisions",
  "worktrees": "../worktrees/ai-foundation"
}
```

**Key Behaviour**:

- Adds exactly one key. No existing key's value changes.
- Valid JSON after the edit (verified by a JSON parse check in self-validation).

**Dependencies**:

- None.

---

## 9. Data Models

### .aiconfig.json paths object (existing schema, one field added)

**Purpose**: Declares project-relative paths used by planning skills to resolve default output locations.

| Field       | Type   | Required                                        | Notes                                                                |
| ----------- | ------ | ----------------------------------------------- | -------------------------------------------------------------------- |
| `decisions` | string | No (optional, like all other `paths.*` entries) | Relative path to the Decision Records root; value `"docs/decisions"` |

---

## 10. Security Requirements

> This section must never be empty.

- [ ] No new attack surface — this chunk edits a single static JSON configuration file already committed to the repo; it introduces no code execution paths, no credential handling, and no network-facing behavior (consistent with Epic Plan Section 8, first bullet).
- [ ] No secrets or credentials in source content — the added value is a relative filesystem path string (`"docs/decisions"`), containing no environment-specific or credential-bearing data.
- [ ] `.aiconfig.json` remains valid JSON after the edit and does not alter `ai_identity` (`git_author_name`, `git_author_email`, `git_token_env`)
      or `orchestration` fields — verified by diff review, since a malformed edit to this shared config file could affect every agent/skill that reads it, not just this chunk's deliverable.
- [ ] Errors exposed to any consumer of this config contain no internal system details — not applicable in practice for a static config value, verified as N/A.

---

## 11. Logging Requirements

> This section must never be empty.

This chunk produces a static configuration value with no runtime component — `.aiconfig.json` is read by agents/skills at the start of a session, not executed as code, so there are no application log statements for this chunk to define. The table below documents the plan-level Work Log entries this chunk itself must produce, per `steering/engineering/core.md` Rule 2/Rule 9 and `skill/plan-lifecycle` Steps 1-4 commit requirements — these are the only "logging" applicable to a config-only chunk.

| Event                                         | Level (Work Log Action)   | What is logged                                                                | What is NOT logged                                                       |
| --------------------------------------------- | ------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Plan drafted                                  | `[Created]`               | Plan ID, agent, tier assessed, summary of scope                               | No content of unrelated chunks/plans                                     |
| Plan approved/deferred                        | `[Approved]`/`[Deferred]` | Human decision, approver name if approved                                     | Nothing beyond the decision itself                                       |
| Implementation commit (future, post-approval) | `[Implemented]`           | File touched (`.aiconfig.json`), one-line description referencing AIF-002-008 | No secrets; no `ai_identity` values beyond the unchanged existing config |

---

## 12. Testing Plan

This chunk has no executable code, so "tests" are validation checks performed during self-validation (Section 4) rather than automated unit tests.

### .aiconfig.json Config Tests

| Test ID | Description                                                                                                                                        | Type                                                  | Pass Criteria                                                                                        |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 008-T01 | `.aiconfig.json` parses as valid JSON after the edit                                                                                               | Automated (`node -e "JSON.parse(...)"` or equivalent) | No parse error                                                                                       |
| 008-T02 | `paths.decisions` equals exactly `"docs/decisions"`                                                                                                | Manual/scripted field check                           | Value matches human-confirmed scope statement verbatim                                               |
| 008-T03 | No other key in `.aiconfig.json` changes value (diff review)                                                                                       | Manual diff review                                    | Only one line added; all pre-existing lines byte-for-byte unchanged except trailing comma adjustment |
| 008-T04 | `docs/decisions` (the path value) already exists as a real directory in the repo, so the new config entry does not point at a nonexistent location | Filesystem check                                      | Directory exists (confirmed: `docs/decisions/meta-process/` already present from AIF-META-001)       |

---

## 13. Documentation Requirements

- [ ] Inline documentation on all public members — not applicable; JSON config has no inline-doc convention in this repo (no other `paths.*` entry carries a comment)
- [ ] File headers on all new source files — not applicable; no new file created, and `.aiconfig.json` carries no header convention today
- [ ] README updated if user-facing — not applicable; `.aiconfig.json` is not referenced by a README requiring an update for this addition
- [ ] CHANGELOG entry written — deferred to the Epic-level decision (Epic Plan Acceptance Criteria: "Epic-level CHANGELOG entry written (if this repo maintains one — confirm at implementation time)"); this chunk does not add its own CHANGELOG entry unilaterally

---

## 14. Risks & Open Questions

| #   | Risk / Question                                                                                                                                                | Impact | Mitigation                                                                                                                                                                                                                              |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | No skill currently reads `paths.decisions` programmatically, so this chunk's deliverable is purely declarative until a future skill/tooling change consumes it | L      | Matches the Epic Plan's exact scope ("adding an explicit entry"), not a functional gap — flagged here per global Rule 4 rather than silently expanded into wiring work not requested by the Epic Plan or the human's scope confirmation |

---

## 15. Work Log

[2026-08-14 00:00] [AI-Engineer] [Created] [AIF-002-008] [Self-planned Chunk 008 of Epic AIF-002 per Tech-Lead's decomposition (`chunks.json`). Read Epic Plan Sections 5 and 10 in full, plus resolved Open Question 3 (human, 2026-08-14: confirmed adding `paths.decisions: "docs/decisions"` for flexibility, matching the `paths.epics`/`paths.chunks` precedent). Assessed Tier 1 (Quick) per `skill/complexity-tiers`: single-file change, clear intent, matches an existing precedent exactly, no new pattern or schema change. Produced a full Chunk Plan per `skill/chunk-orchestration`'s requirement that an approved Chunk Plan exist before dispatch, even though the underlying change is Tier 1. Saving as Status: Draft per `skill/plan-lifecycle` before presenting for human approval. No implementation performed — `.aiconfig.json` itself not yet modified.]
[2026-08-18] [AI-Engineer] [Revised] [AIF-002-008] [Migrated this Chunk Plan to the reordered template structure approved for skill/chunk-planning: Quick Summary (new Section 3, open-item count derived from the existing Risks & Open Questions table) and Acceptance Criteria (moved from Section 12 to Section 4) now sit immediately after the Goal; all other sections renumbered accordingly (mapping: 3->5, 4->6, 5->7, 6->8, 7->9, 8->10, 9->11, 10->12, 11->13, 13->14, 14->15). Every inline "Section N" cross-reference in this file, including references into the AIF-002 Epic Plan's own renumbered sections, was remapped to match. No wording, decisions, criteria, or risk content was changed - purely structural, per human direction (no active work on these plans at the time of migration).]
[2026-08-18] [Engineering-Manager] [Approved] [AIF-002-008] [Human (Jeremy Smellie) explicitly confirmed in chat that chunks AIF-002-007 through AIF-002-015 are approved. Per skill/plan-lifecycle and engineering-core Rule 8, recorded that decision as a committed status change: `Status` updated from `Draft` to `Approved`, `Reviewed By` updated from `Pending` to `Jeremy Smellie`. No plan content changed. Committed as its own commit, separate from the prior revision history.]
