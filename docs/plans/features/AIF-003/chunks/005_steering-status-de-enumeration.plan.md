# Chunk Plan: De-Enumerate the Decision Record Status Check in `knowledge-consumption.md`

## 1. Metadata

| Field          | Value                                                                                                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plan ID        | AIF-003-005                                                                                                                                                               |
| Parent Epic    | AIF-003                                                                                                                                                                   |
| Chunk          | 5 of 8                                                                                                                                                                    |
| Depends On     | None                                                                                                                                                                      |
| Can Parallel   | AIF-003-001, AIF-003-003, AIF-003-004 (wave 1)                                                                                                                            |
| Project        | ai-foundation                                                                                                                                                             |
| Status         | Approved                                                                                                                                                                  |
| Author (Agent) | AI-Engineer                                                                                                                                                               |
| Reviewed By    | Pending                                                                                                                                                                   |
| Created        | 2026-08-25                                                                                                                                                                |
| Last Updated   | 2026-08-25                                                                                                                                                                |
| Standards      | `skills/steering-authoring/SKILL.md` (this is a steering-file edit, not application code — no `javascript`/`node` standards apply). AI-Engineer track per `AIF-PROC-001`. |

---

## 2. Goal

Fix `steering/global/knowledge-consumption.md`'s "Never reference" rule so it stops enumerating non-approved Decision Record statuses (today: `Draft`, `Pending`) and instead states a single negative check against `Approved`, per Epic `AIF-003` Section 4 (Question 5, answered) and `reference/status-vocabulary.md`'s positive-check convention. This makes the new `Amending` status (added by `AIF-003-004`) block consumption automatically, with no future edit to this file required when a status is added or removed from the vocabulary.

---

## 3. Quick Summary

**Open Items:** 0 open — see Section 14

This chunk is a Tier 1 change per `skill/complexity-tiers` (single file, single bullet, clear intent, no new pattern, no schema change). A written Chunk Plan is nonetheless produced here because the Epic's own decomposition and orchestration dispatch this chunk through the standard chunk-plan gate (per `AIF-PROC-002`'s human-approval-gate requirement, which is not weakened for either track), and because the human requested this artifact directly. It intentionally omits ceremony (e.g. multi-component breakdowns) that would not apply to a one-line edit.

---

## 4. Acceptance Criteria

- [ ] All components in Section 8 exist and are edited as specified
- [ ] No `.md`-lint or repo validation regresses (Section 12)
- [ ] Security checklist (Section 10) fully satisfied
- [ ] Logging checklist (Section 11) fully satisfied (not applicable — see Section 11)
- [ ] Documentation checklist (Section 13) fully satisfied
- [ ] Review approved with no CRITICAL or HIGH findings
- [ ] `steering/global/knowledge-consumption.md`'s "Never reference" bullet no longer names `Draft` or `Pending` (or any other specific status)
- [ ] The bullet still reads in the negative voice ("never reference a Decision Record that is not in the `Approved` status") — per the Epic, the defect is the enumeration, not the negative phrasing
- [ ] No other bullet, section, or file in the repo is edited by this chunk
- [ ] `bundles/engineering/snapshot.json`'s stored hash for `steering/global/knowledge-consumption.md` is regenerated so `aif snapshot --check` (and `aif status`) report the bundle current, not stale
- [ ] `npm test` passes

---

## 5. Scope

### In Scope

- Rewrite the single "Never reference" bullet under `### What to Load` in `steering/global/knowledge-consumption.md` so it performs a negative check against `Approved` only, without listing any other status value.
- Regenerate `bundles/engineering/snapshot.json` (the only bundle snapshot that references this file) via `aif snapshot --bundle engineering`, since the edit changes the file's content hash.

### Out of Scope

- **Any other bullet in this file.** `### Before Starting Work`, the `scope`/`tags` matching bullets, and `### When Knowledge Conflicts with Standards` are unrelated to the status check and are not touched.
- **`reference/status-vocabulary.md` or the `Amending` status itself** — owned by `AIF-003-004` (wave 1, independent of this chunk; see Epic Section 9).
- **Any gate-checking logic** (code, CLI, or another skill/steering file) that decides whether dependent work may proceed. This chunk is documentation-only; per Epic Section 5 Business Rules, no gate anywhere special-cases `Amending`, and this chunk does not introduce one.
- **Propagating the change to the user's installed global rules copy** (e.g. `C:\Users\Jeremy\.claude\rules\global-knowledge-consumption.md`). That copy is produced by `aif install` against the harness target and is refreshed by re-running install after this chunk lands — not by editing the installed copy directly. See Section 7 "Propagation" and Risk 1.
- **Regenerating any snapshot other than `bundles/engineering/snapshot.json`.** No other bundle currently lists this file as a source (verified by inspection of `bundles/generic/snapshot.json`).
- **Wording changes to any other rule in this file that predates this Epic** (e.g. the file's `## Exceptions` section, or the `### Before Starting Work` procedure) — out of scope per the Epic's chunk boundary (`chunks.json` `005` owns exactly this file, and the Epic's Question 5 resolution scopes the fix to the enumeration defect only).

---

## 6. Prerequisites

- [ ] Epic `AIF-003` `Status: Approved` committed (done — commit `8c82f90`)
- [ ] This Chunk Plan `Status: Approved` committed before implementation begins
- [ ] No prior chunk required — this is a wave-1 chunk with no dependencies (`chunks.json`: `"depends_on": []`)
- [ ] `aif snapshot` runnable in this repo (used to regenerate the bundle snapshot)

---

## 7. Architecture & Design

### Project Structure Changes

```
steering/
└── global/
    └── knowledge-consumption.md   ← MODIFIED (one bullet)
bundles/
└── engineering/
    └── snapshot.json              ← REGENERATED (one hash)
```

No new files.

### Key Design Decisions

1. **Decision**: replace the enumerated bullet with a single negative check against `Approved`, rather than inverting it into a positive-check sentence.
   **Why:** Epic Question 5 was answered explicitly on this point — the defect is the _enumeration_ of statuses (which predates `Amending` and already omitted `Deferred`), not the negative voice. A positive-check rewrite ("only reference `Approved` records") would also be correct in effect, but the human directed the negative phrasing be kept, so this is not a free implementation choice.

2. **Decision**: state the check against exactly one status value (`Approved`), matching `reference/status-vocabulary.md`'s own convention ("Always check for `Status: Approved` specifically. Do not write special-case logic for `Deferred`, `Draft`, or any other non-`Approved` value").
   **Why:** this is the mechanism by which `Amending` (added by the sibling chunk `AIF-003-004`) blocks consumption without this file ever needing to know that status exists — the Epic's stated purpose for this chunk. Any wording that lists specific non-approved statuses would reintroduce the exact defect being fixed the next time a status is added.

3. **Decision**: regenerate `bundles/engineering/snapshot.json` in this chunk rather than deferring it.
   **Why:** the snapshot stores a content hash per source file (`lib/snapshot/io.js` / `lib/commands/snapshot.js`); editing the steering file without regenerating the snapshot leaves `aif snapshot --check` / `aif status` reporting the bundle as stale. This mirrors Epic Risk 12's rationale for `AIF-003-002` (never leave a generated artifact stale after the source it describes changes), scoped here to the one hash this chunk's edit affects.

> **Tier C decisions.** All three are Tier C per `skill/decision-triage` — local implementation choices inside an already-decided design (the Epic answered the substantive question), riding this plan's own `skill/plan-lifecycle` cycle. None warrants a standalone record.

### Patterns & Conventions Applied

- **`skill/steering-authoring` Step 3 / Self-validate checklist**: every rule needs a clear imperative, rationale, and exceptions. The edited bullet's rationale (the em-dash clause "— these are not authoritative") is preserved verbatim; only the enumerated status list is removed.
- **`reference/status-vocabulary.md` convention**: check positively for `Approved` and treat every non-`Approved` value uniformly, reused here inside a negatively-phrased sentence per the human's explicit instruction.

### Propagation

`steering/global/knowledge-consumption.md` is the framework source of truth. It is installed per-harness by `aif install` (`lib/harnesses/claude.js` maps `steering/` sources into `~/.claude/rules/{scope}-{name}.md` for Claude Code, e.g. this file installs as `global-knowledge-consumption.md`). This chunk edits only the repo source. The installed copy at `C:\Users\Jeremy\.claude\rules\global-knowledge-consumption.md` is refreshed the next time `aif install` (or `aif install --update`) runs against that harness target — that is an existing, unmodified mechanism, not something this chunk builds or triggers itself. See Risk 1 for the gap this leaves until the next install run.

---

## 8. Components

### `steering/global/knowledge-consumption.md` — "Never reference" bullet

**File**: `steering/global/knowledge-consumption.md`
**Purpose**: Tell every agent, in every session, which Decision Records are safe to cite as authoritative.

**Current text** (line 36, under `### What to Load`):

```
- **Never reference:** Decision Records with `status: "Draft"` or `status: "Pending"` — these are not authoritative
```

**New text**:

```
- **Never reference:** a Decision Record that is not in the `Approved` status — these are not authoritative
```

**Key Behaviour**:

- No status value other than `Approved` appears anywhere in the bullet.
- The sentence remains negatively phrased (a "never ... that is not" construction), per the Epic's explicit direction, not a "only reference `Approved`" positive rewrite.
- The trailing rationale clause ("— these are not authoritative") is preserved unchanged; only the enumerated clause before it is rewritten.
- No other line in the file changes. In particular, the `### Before Starting Work` procedure, the `scope`/`tags`-matching bullets, and the `## Exceptions` section are untouched — this chunk's boundary is exactly the one bullet the Epic names.

**Dependencies**: none. This is a standalone prose edit with no code path, template, or schema behind it.

### `bundles/engineering/snapshot.json` — regenerated hash

**File**: `bundles/engineering/snapshot.json`
**Purpose**: Machine-checkable record of each bundle source file's content hash, used by `aif snapshot --check` / `aif status` to detect drift between the repo source and what has been installed.

**Key Behaviour**:

- Run `aif snapshot --bundle engineering` (or `aif snapshot` with no target, which covers all stale bundles/servers/hooks) after the steering edit lands.
- Only the `steering/global/knowledge-consumption.md` entry's hash changes; `computed_at` updates; no other entry in the file changes, since no other bundle source is touched by this chunk.
- Do not hand-edit the hash. The value is SHA-256 of file content, computed by `lib/snapshot/io.js` — regenerate via the CLI, never author it manually.

**Dependencies**:

- `lib/commands/snapshot.js` (`aif snapshot`) — existing tool, unmodified by this chunk.

---

## 9. Data Models

Not applicable. This chunk edits prose in a steering file and regenerates an existing generated artifact; it introduces no new data shape, field, or schema.

---

## 10. Security Requirements

> This section must never be empty.

- [ ] All external inputs validated before use — not applicable; there is no external input. The edit is authored text in a repo-local markdown file.
- [ ] No secrets or credentials in source code or logs — none introduced; the change is a wording edit.
- [ ] Errors exposed to users contain no internal system details — not applicable; no error paths are added.
- [ ] **No weakening of the approval gate.** The rewritten bullet must still cause every non-`Approved` status — `Draft`, `Pending`, `Deferred`, `Amending`, or any future value — to fail the "may I reference this" check. This is the chunk's core acceptance property (Epic Section 5, "Reading a record" / Business Rules: "No gate anywhere special-cases `Amending`"), and a reviewer must verify the new wording actually excludes all of them, not just the two previously named.
- [ ] **No new authority granted.** This chunk does not change who may set `Status: Approved` or how; it only changes how the status is checked by a knowledge-consuming agent, which is a read-only check.

---

## 11. Logging Requirements

> This section must never be empty.

Not applicable — `steering/global/knowledge-consumption.md` is a static instruction file, not executable code, and this chunk touches no logging call site, log level, or log-emitting component. There is no event to log because there is no runtime behaviour in this chunk's diff.

| Event | Level | What is logged                   | What is NOT logged |
| ----- | ----- | -------------------------------- | ------------------ |
| N/A   | N/A   | N/A — no executable code changes | N/A                |

---

## 12. Testing Plan

There is no unit or integration test suite for steering-file prose content (steering files are not parsed or executed by `lib/`; they are copied verbatim by the install harness). Validation for this chunk is manual/self-validation plus the existing repo-wide checks that do execute:

| Test ID | Description                                                                                   | Type                     | Pass Criteria                                                                                                                             |
| ------- | --------------------------------------------------------------------------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 005-T01 | Read the edited bullet                                                                        | Manual (self-validation) | No status value other than `Approved` appears in the bullet; the sentence is still negatively phrased                                     |
| 005-T02 | Diff the file against its prior committed version                                             | Manual (self-validation) | Exactly one bullet's line(s) changed; no other line in the file differs                                                                   |
| 005-T03 | `aif snapshot --check`                                                                        | Integration (CLI)        | Reports the `engineering` bundle current after regeneration, not stale                                                                    |
| 005-T04 | `npm test`                                                                                    | Unit+Integration         | Full suite passes with no changes to any test unrelated to this chunk (none are expected — this chunk touches no `lib/` or `tests/` file) |
| 005-T05 | `aif validate` (repo-wide schema/cross-reference check, if it inspects steering front-matter) | Integration (CLI)        | No new validation failures introduced by the edit                                                                                         |

---

## 13. Documentation Requirements

- [ ] Inline documentation on all public members — not applicable (no code)
- [ ] File headers on all new source files — not applicable, no new files. Steering files in this repo do not carry a `Plan:` header convention (confirmed: `knowledge-consumption.md`'s front-matter has only `name`/`version`/`description`/`file_patterns`); no header addition is required or invented here
- [ ] README updated if user-facing — not applicable
- [ ] CHANGELOG entry written

---

## 14. Risks & Open Questions

| #   | Risk / Question                                                                                                                                                                                                                                                                                                 | Type | Impact | Mitigation                                                                                                                                                                                                                                                                                                                                                                                                                         |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **The user's installed global rules copy (`C:\Users\Jeremy\.claude\rules\global-knowledge-consumption.md`) will still show the old, enumerated wording until `aif install` is re-run against that harness target.** This chunk only edits the repo source, per its file ownership in `chunks.json`.             | Risk | L      | Accepted and explicitly out of scope (Section 5). No chunk in this Epic re-runs install for the human — that has always been a separate, human-initiated step for every steering/agent change in this repo, not something introduced or worsened by this chunk. Flagged here so the human is aware the installed copy needs a refresh after this chunk (and the Epic's other steering/agent chunks, `AIF-003-008`) land.           |
| 2   | **`bundles/engineering/snapshot.json` regeneration is a generated-artifact diff outside the "one bullet" scope description**, which could read as scope creep if not called out explicitly.                                                                                                                     | Risk | L      | Not scope creep: the snapshot is a hash of this exact file's content, and leaving it stale would make `aif snapshot --check` report a false negative the moment this chunk merges. Included explicitly in Sections 5 and 8 rather than silently done, consistent with engineering-core Rule 4 (raise discoveries rather than silently expand scope) — this is the minimal, mechanically necessary companion change, not new scope. |
| 3   | **Verifying the new wording excludes `Amending` requires the reader to already know `Amending` exists.** `AIF-003-004` (which adds `Amending` to `reference/status-vocabulary.md`) is independent of this chunk (`chunks.json`: neither depends on the other), so at review time either chunk could land first. | Risk | L      | Accepted. The rewritten bullet is correct regardless of ordering, because it checks positively-in-spirit against `Approved` alone rather than naming any specific non-approved status — it does not need `Amending` to already exist in the vocabulary to already exclude it. No dependency edge is needed between `005` and `004`.                                                                                                |

---

## 15. Work Log

[2026-08-25] [AI-Engineer] [Created] [AIF-003-005] [Chunk Plan drafted from Epic AIF-003 Section 9 following its approval (`8c82f90`) and the chunk's scope entry in `docs/plans/chunks/AIF-003/chunks.json` (`depends_on: []`, `agents: ["AI-Engineer"]`). Verified against source rather than the Epic's summary: read `steering/global/knowledge-consumption.md` directly and confirmed the exact current bullet text (`Decision Records with `status: "Draft"`or`status: "Pending"``), confirmed `reference/status-vocabulary.md`'s positive-check convention it must now align with, and confirmed via `grep` that `bundles/engineering/snapshot.json` is the only bundle snapshot listing this file as a source (`bundles/generic/snapshot.json` does not reference it), which fixed the regeneration scope in Section 5/8 to that one file. Assessed complexity as Tier 1 per `skill/complexity-tiers` (single file, single bullet, clear intent, no schema change) — a written plan is produced anyway because the chunk is dispatched through the standard gate and was explicitly requested. No open questions found beyond the Epic's own resolved Question 5; the three items in Section 14 are accepted risks, not blocking ambiguities, so none is escalated.]
