# Chunk Plan: skill/knowledge-authoring — Domain-Scoped knowledge/index.json Decision Guidance

## 1. Metadata

| Field          | Value                                                                                                                                                                      |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plan ID        | AIF-002-007                                                                                                                                                                |
| Parent Epic    | AIF-002                                                                                                                                                                    |
| Chunk          | 007 of 15                                                                                                                                                                  |
| Depends On     | None                                                                                                                                                                       |
| Can Parallel   | 001, 002, 003, 004, 005, 006, 008, 009 (all other Wave 1 chunks)                                                                                                           |
| Project        | ai-foundation                                                                                                                                                              |
| Status         | Approved                                                                                                                                                                   |
| Author (Agent) | AI-Engineer                                                                                                                                                                |
| Reviewed By    | Jeremy Smellie                                                                                                                                                             |
| Created        | 2026-08-14                                                                                                                                                                 |
| Last Updated   | 2026-08-17 (revised — folded Risk 1's Edge Cases/Step 6 corrections into this chunk's own scope so the file's changes are self-contained to AIF-002-007)                   |
| Standards      | ai-foundation declarative-component schemas (AGENTS.md) — no code standards apply; this chunk's deliverable is `skills/knowledge-authoring/SKILL.md` markdown content only |

---

## 2. Goal

Update `skills/knowledge-authoring/SKILL.md` Step 2's `decision` type guidance to reflect AIF-META-001's domain-scoped `knowledge/index.json` consumption rule:
`knowledge/index.json` proactively loads only Architecture and AI-component domain decisions — the two domains without a single canonical implementing artifact that already captures the decision's effect. All other domains' decisions remain traceable via `{paths.decisions}/index.json` (built in a later chunk, not yet available) but are not proactively loaded as knowledge. This replaces the current blanket "use decision-record instead" guidance with the correct, domain-aware routing and rationale.

**Revision note (2026-08-17):** Originally, this chunk scoped itself strictly to Step 2 and flagged two other stale lines in the same file (the Edge Cases "Decision Record" bullet and the Step 6 checklist's `{paths.knowledge}/decisions/` parenthetical) as an out-of-scope discovery (Section 14, Risk 1), deferring them to a follow-up. Per human direction, both corrections are now folded into this chunk's own scope, so every change to `skills/knowledge-authoring/SKILL.md` made as a result of AIF-002's decision-record model lands in one self-contained chunk rather than being split across this chunk and an unspecified future one.

---

## 3. Quick Summary

**Open Items:** 2 open (0 High / 0 Medium / 2 Low) — see Section 14

---

## 4. Acceptance Criteria

- [ ] `skills/knowledge-authoring/SKILL.md` Step 2's `decision` row directs to `skill/decision-triage` (not `decision-record` directly) as the entry point for recording any decision
- [ ] Step 2 states the domain-scoped `knowledge/index.json` consumption rule:
      Architecture and AI-component only; all other domains remain traceable via `{paths.decisions}/index.json` but are not proactively loaded as knowledge
- [ ] New guidance cites AIF-META-001 as the source of the rule
- [ ] Step 6's checklist no longer contains the `{paths.knowledge}/decisions/` parenthetical (folded in, 2026-08-17 revision)
- [ ] Edge Cases "Decision Record" bullet points to `skill/decision-triage` and no longer describes a decision record as producing a knowledge file (folded in, 2026-08-17 revision)
- [ ] No wording change outside Step 2 (plus its new explanatory note), the Step 6 parenthetical, and the Edge Cases bullet (Steps 1, 3-5, Inputs, Outputs, and every other Step 6/Edge Cases line untouched by this chunk)
- [ ] Security checklist (Section 10) fully satisfied
- [ ] Logging/Work-Log checklist (Section 11) fully satisfied
- [ ] Documentation checklist (Section 13) fully satisfied
- [ ] Review approved with no CRITICAL or HIGH findings
- [ ] This Chunk Plan itself is committed with `Status: Draft` via `ai-git` before being presented for human approval, per `skill/plan-lifecycle`

---

## 5. Scope

### In Scope

- `skills/knowledge-authoring/SKILL.md` Step 2 (`## Step 2 — Choose the type`) — replace the `decision` row's guidance text. It currently reads "Recording a technical decision with options and rationale (use decision-record skill instead)" — a blanket redirect with no domain awareness. Replace with guidance that:
  - Directs the agent to `skill/decision-triage` as the entry point for recording any decision (per this Epic's Wave 1 chunk 001), rather than naming `decision-record` directly, since `decision-triage` is what determines Tier/Domain and dispatches to `decision-record` (Tier A) or `decision-brief` (Tier B) — `knowledge-authoring` should not itself re-derive tier/domain routing logic that `decision-triage` owns.
  - States the domain-scoped consumption rule plainly: a decision is only added to `knowledge/index.json` when its Domain is Architecture or AI-component — the two domains without a single canonical implementing artifact that already captures the decision's effect. Other domains' decisions (Process, Planning, Quality, Testing, Meta-process) are never added to `knowledge/index.json`; their traceability is via `{paths.decisions}/index.json` instead.
- A short explanatory note immediately below the Step 2 table (or inline in the row, whichever reads more clearly once drafted) carrying the "why" — same rationale AIF-META-001 gives: knowledge is for descriptive material with no other canonical home, and most domains' decisions already have one (the skill/template/steering file the decision changed).
- **(Folded in, 2026-08-17 revision)** The `Edge Cases` section's "Decision Record" bullet ("use the `decision-record` skill instead. It produces a knowledge file with the correct decision format and template.") — update to point to `skill/decision-triage` (not `decision-record` directly) and to drop the now-inaccurate "produces a knowledge file" characterization, since a decision record is no longer a knowledge file under the new model.
- **(Folded in, 2026-08-17 revision)** The `Step 6` self-validation checklist's "(or `{paths.knowledge}/decisions/` for decisions)" parenthetical — remove it; decisions are no longer located under `{paths.knowledge}/` at all in the new model (they live at `{paths.decisions}/{domain}/`, per the dedicated `paths.decisions` config key chunk 008 introduces — not `{paths.knowledge}/decisions/`, which would only coincidentally resolve correctly in this project since `paths.knowledge` happens to equal `docs` here), so the parenthetical is now simply incorrect, not just stale phrasing.

### Out of Scope

- Authoring `skill/decision-triage`, `skill/decision-record`'s Tier A scoping, or `skill/decision-brief` themselves — those are chunks 001, 002, and 003 respectively, dispatched in parallel with this chunk. This chunk only points to `decision-triage` as the entry point; it does not define or modify that skill's own Steps/Outputs.
- Creating or backfilling `{paths.decisions}/index.json` — that is chunk 014, which depends on all migration chunks (009-013) and has not been built yet. This chunk's new guidance text references that path as the eventual traceability mechanism for non-Architecture/AI-component domains, without assuming it already exists.
- Steps 1, 3, 4, and 5 of `skills/knowledge-authoring/SKILL.md` — untouched. These are generic across all five `type` values and are not decision-specific. **(Step 6 is no longer fully untouched — see the folded-in bullet above; only its decisions-specific parenthetical changes, the rest of Step 6's checklist is unaffected.)**

---

## 6. Prerequisites

- [x] AIF-002 Epic Plan is `Approved` (verified: `docs/plans/epics/AIF-002.epic.md`, Status: Approved, Work Log entry 2026-08-14 [Approved])
- [x] AIF-META-001 Decision Record is `Approved` (verified:
      `docs/decisions/meta-process/AIF-META-001_decision-record-tiering-and-domain-ownership.decision.md`, Status: Approved) — source of the domain-scoped `knowledge/index.json` consumption rule (Resolved Item 9, Domain table's rightmost column)
- [x] Current `skills/knowledge-authoring/SKILL.md` content read in full
- [x] No dependency chunks — this chunk has `depends_on: []` in `chunks.json`

---

## 7. Architecture & Design

### Project Structure Changes

- `skills/knowledge-authoring/SKILL.md` ← MODIFIED (Step 2 section only)
- No new files.

### Key Design Decisions

1. **Decision**: Point Step 2's `decision` row to `skill/decision-triage`, not `skill/decision-record` directly.
   **Rationale**: Per the Epic Plan's Architecture Overview (Section 7), `decision-triage` is the single entry point every agent uses to record a decision — it determines Tier and Domain and dispatches accordingly.
   `knowledge-authoring` naming `decision-record` directly would either be wrong for Tier B/C decisions or would require `knowledge-authoring` to re-explain tier selection itself, duplicating logic that belongs solely to `decision-triage`. This keeps `knowledge-authoring` as a thin, correct pointer rather than a second source of truth for decision routing.

2. **Decision**: State the domain list (Architecture, AI-component) explicitly in the guidance text rather than only linking to AIF-META-001.
   **Rationale**: `knowledge-authoring` is consulted at the moment an agent is about to write a knowledge file — it needs to be immediately actionable ("is this decision's domain Architecture or AI-component? if not, don't add it to `knowledge/index.json`") without requiring a detour into the full AIF-META-001 record to extract the rule. The record is still referenced as the source/rationale, consistent with how `skills/plan-lifecycle/` (chunk 004)
   references AIF-META-001 for the Tier definitions without re-deriving them — the same "reference the source, but state the actionable rule inline" pattern is applied here since Step 2 is itself the actionable checklist a reader follows in the moment.

3. **Decision (revised 2026-08-17 — supersedes the original chunk's Key Design Decision 3)**: Also correct the Step 6 checklist parenthetical and the Edge Cases "Decision Record" bullet in this chunk, rather than deferring them.
   **Rationale**: The original chunk scoped itself strictly to "Step 2's `decision` type guidance" per the Epic Plan's Section 5 wording, and raised the other two lines as an out-of-scope discovery (Section 14, Risk 1) per `steering/engineering/core.md` Rule 4, since they weren't named in the Epic bullet and a reviewer hadn't signed off on including them. Human direction (2026-08-17) confirmed folding them in instead, so this single chunk leaves `skills/knowledge-authoring/SKILL.md` fully self-consistent with the new decision-record model — no stale line is left behind for an unspecified future chunk to pick up. All three edits (Step 2 row, Step 6 parenthetical, Edge Cases bullet) are small, mechanically related corrections of the exact same superseded model, not three independent pieces of scope.

### Patterns & Conventions Applied

- Follows the same "reference the source-of-truth decision record, state the actionable rule inline, don't re-derive it" pattern already used by chunk 004 (`skill/plan-lifecycle`) for AIF-META-001's Tier definitions.
- Preserves the existing Step 2 table's row-per-type structure; the `decision` row's guidance text is replaced, the table shape itself is not restructured.

---

## 8. Components

### knowledge-authoring SKILL.md — Step 2 Decision-Type Guidance

**File**: `skills/knowledge-authoring/SKILL.md`
**Purpose**: Correct the single guidance line an agent consults when deciding whether a `decision` belongs in `knowledge/`, replacing a blanket redirect with the domain-scoped rule.

**Content changes**:

- Step 2 table, `decision` row — replace:
  `| `decision` | Recording a technical decision with options and rationale (use decision-record skill instead) |` with guidance that:
  1. Directs to `skill/decision-triage` as the entry point for recording any decision (not `decision-record` directly).
  2. States the domain-scoped `knowledge/index.json` rule: only decisions whose Domain is Architecture or AI-component are added to `knowledge/index.json`; all other domains (Process, Planning, Quality, Testing, Meta-process) are never added here — they remain traceable via `{paths.decisions}/index.json`.
- Add a short note (one to three sentences) immediately below the Step 2 table carrying the rationale: decisions in domains with a canonical implementing artifact (the skill/template/steering file the decision changed) don't need a second, driftable knowledge copy; Architecture and AI-component decisions lack that single canonical artifact, so they are loaded as knowledge directly.
  Cite AIF-META-001 by Decision ID as the source.

**Key Behaviour**:

- An agent reading Step 2 for a `decision`-type entry is redirected to `decision-triage`, never told to write a `knowledge-authoring`-produced decision file directly.
- An agent that already has a Tier A/B decision in hand (post-triage) and is deciding whether it _also_ needs a `knowledge/index.json` entry can answer that from Step 2's guidance alone, using the decision's Domain field.
- No other Step (1, 3, 4, 5) or the Inputs/Outputs sections change. Step 6 and Edge Cases change only in the two specific ways described below (folded in, 2026-08-17 revision) — everything else in those two sections is untouched.

**Dependencies**:

- AIF-META-001 (Decision Record) — source of the domain-scoped consumption rule, referenced not redefined.
- `skill/decision-triage` (chunk 001) — this chunk points to it by name as the entry point; since chunk 001 has no dependency edge on this chunk (both Wave 1, parallel), this chunk references `decision-triage`'s documented role per the Epic Plan/AIF-META-001 rather than its as-yet-unwritten `SKILL.md` content.

### knowledge-authoring SKILL.md — Step 6 Checklist Correction (folded in, 2026-08-17 revision)

**File**: `skills/knowledge-authoring/SKILL.md`
**Purpose**: Remove the now-incorrect decisions-location parenthetical from the Step 6 self-validation checklist.

**Content changes**:

- Step 6, first checklist item — replace:
  `- [ ] File is in `{paths.knowledge}/`(or`{paths.knowledge}/decisions/` for decisions)`
  with:
  `- [ ] File is in `{paths.knowledge}/``
  (Decisions are never written by `knowledge-authoring` at all under the new model — see Step 2's revised guidance — so a decisions-specific location note no longer belongs on this checklist.)

**Key Behaviour**: No other Step 6 checklist item changes.

**Dependencies**: Same as the Step 2 component above (AIF-META-001, `skill/decision-triage`).

### knowledge-authoring SKILL.md — Edge Cases "Decision Record" Bullet Correction (folded in, 2026-08-17 revision)

**File**: `skills/knowledge-authoring/SKILL.md`
**Purpose**: Correct the Edge Cases bullet that still names `decision-record` directly and still describes a decision as producing "a knowledge file."

**Content changes**:

- Edge Cases section — replace:
  `- **Decision Record** — use the `decision-record` skill instead. It produces a knowledge file with the correct decision format and template.`
  with:
  `- **Decision Record** — use `skill/decision-triage`instead, which determines Tier/Domain and dispatches to`skill/decision-record`(Tier A) or`skill/decision-brief`(Tier B) as needed. A decision record is not a knowledge file — see Step 2 for when (Architecture/AI-component domain) it is additionally added to`knowledge/index.json`.`

**Key Behaviour**: No other Edge Cases bullet changes.

**Dependencies**: Same as the Step 2 component above.

---

## 9. Data Models

Not applicable — this chunk produces markdown documentation only, no data schemas or structured artifacts.

---

## 10. Security Requirements

> This section must never be empty.

- [ ] No new attack surface — this chunk edits only markdown documentation inside `skills/knowledge-authoring/SKILL.md`; it introduces no code execution paths, no credential handling, and no network-facing behavior (consistent with Epic Plan Section 8, first bullet).
- [ ] No secrets or credentials in source content — the added text references only public artifact paths (`knowledge/index.json`, `{paths.decisions}/index.json`)
      and skill/decision names, nothing environment- or credential-specific.
- [ ] The updated guidance must not imply that non-Architecture/AI-component decisions are less discoverable or less legitimate than before — it must state plainly that they remain traceable via `{paths.decisions}/index.json`, preserving referential integrity of the overall decision system rather than silently dropping a discovery path (direct carry-forward of AIF-META-001's Problem Statement concern about interconnectivity).
- [ ] Errors/ambiguity exposed to future readers contain no internal system details beyond what is already documented elsewhere in this repo (not applicable in practice for a docs-only change, verified as N/A).

---

## 11. Logging Requirements

> This section must never be empty.

This chunk produces static documentation content with no runtime component — `skills/knowledge-authoring/SKILL.md` is read by agents as reference material, not executed as code, so there are no application log statements for this chunk to define. The table below documents the plan-level Work Log entries this chunk itself must produce, per `steering/engineering/core.md` Rule 2/Rule 9 and `skill/plan-lifecycle` Steps 1-4 commit requirements — these are the only "logging" applicable to a documentation-only chunk.

| Event                                         | Level (Work Log Action)   | What is logged                                                                                  | What is NOT logged                                        |
| --------------------------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Plan drafted                                  | `[Created]`               | Plan ID, agent, tier assessed, summary of scope                                                 | No content of unrelated chunks/plans                      |
| Plan approved/deferred                        | `[Approved]`/`[Deferred]` | Human decision, approver name if approved                                                       | Nothing beyond the decision itself                        |
| Implementation commit (future, post-approval) | `[Implemented]`           | File touched (`skills/knowledge-authoring/SKILL.md`), brief description referencing AIF-002-007 | No secrets; N/A here since no secrets exist in this chunk |

---

## 12. Testing Plan

This chunk has no executable code, so "tests" are documentation-validation checks performed during self-validation (Section 4) rather than automated unit tests.

### knowledge-authoring Documentation Tests

| Test ID                             | Description                                                                                                                                                                                                                                            | Type                       | Pass Criteria                                                                        |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------- | ------------------------------------------------------------------------------------ |
| 007-T01                             | Step 2's `decision` row no longer says "use decision-record skill instead" and instead names `skill/decision-triage`                                                                                                                                   | Manual/diff review         | Old blanket-redirect text is fully replaced, not left alongside the new text         |
| 007-T02                             | Step 2 guidance states the domain-scoped rule (Architecture and AI-component only load into `knowledge/index.json`) matching AIF-META-001's Domain table's `knowledge/index.json?` column exactly (Yes for Architecture/AI-component, No for the rest) | Manual cross-check         | Domain list matches AIF-META-001 verbatim — no domain omitted or added               |
| 007-T03                             | New text cites AIF-META-001 by Decision ID                                                                                                                                                                                                             | Manual review              | Citation present and ID matches AIF-META-001's Metadata table                        |
| 007-T04                             | No section of `SKILL.md` other than Step 2, Step 6's decisions-parenthetical, and the Edge Cases "Decision Record" bullet changes wording (Steps 1, 3-5, Inputs, Outputs, and every other Step 6/Edge Cases line untouched)                            | Manual diff review         | Diff is scoped to exactly those three locations plus the new Step 2 explanatory note |
| 007-T05                             | Resulting Step 2 table remains valid markdown (renders correctly, no broken table syntax)                                                                                                                                                              | Manual render check        | Table parses cleanly                                                                 |
| 007-T06 (folded in, rev 2026-08-17) | Step 6's checklist no longer contains any `{paths.knowledge}/decisions/` reference                                                                                                                                                                     | Grep-based self-validation | Zero matches for `decisions/` in Step 6                                              |
| 007-T07 (folded in, rev 2026-08-17) | Edge Cases "Decision Record" bullet names `skill/decision-triage` (not `decision-record` directly) and no longer states a decision record "produces a knowledge file"                                                                                  | Manual review              | Both corrections present                                                             |

---

## 13. Documentation Requirements

- [ ] Inline documentation on the new/changed Step 2 content — clear, scannable, consistent with the rest of the file's table + prose style
- [ ] File headers — not applicable; `skills/knowledge-authoring/SKILL.md` uses YAML front-matter only, consistent with existing file structure; no new header convention introduced
- [ ] README updated if user-facing — not applicable; no README exists for this skill beyond `SKILL.md` itself, which is being updated directly
- [ ] CHANGELOG entry written — confirmed at Epic level (Acceptance Criteria item: "Epic-level CHANGELOG entry written (if this repo maintains one — confirm at implementation time)"); this chunk defers to that Epic-level decision rather than adding a chunk-level CHANGELOG entry unilaterally

---

## 14. Risks & Open Questions

| #   | Risk / Question                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Impact | Mitigation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **(Resolved, 2026-08-17)** ~~The Epic Plan scopes this chunk to "Step 2's `decision` type guidance" specifically, but two other lines in the same file describe the same pre-AIF-META-001 model and will read as stale once Step 2 changes.~~ Resolved by human direction: both lines (the Edge Cases "Decision Record" bullet and the Step 6 `{paths.knowledge}/decisions/` parenthetical) are now folded into this chunk's own scope (Section 5, Section 8) so `skills/knowledge-authoring/SKILL.md` is left fully self-consistent by this single chunk. | —      | Resolved — no longer a follow-up risk.                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 2   | This chunk references `skill/decision-triage` (chunk 001) by name for its entry-point role, but chunk 001's own Chunk Plan/implementation is being authored in parallel (Wave 1, no dependency edge in `chunks.json`)                                                                                                                                                                                                                                                                                                                                      | L      | No functional risk — this chunk only needs `decision-triage`'s documented existence and role (already specified in the Epic Plan Section 7, Architecture Overview), not its finished `SKILL.md` content. If chunk 001 lands with a materially different entry-point name or behavior than the Epic Plan describes, that is a discrepancy for review to catch across chunks, not something this chunk can pre-empt.                                                                                               |
| 3   | This chunk's new text references `{paths.decisions}/index.json` as the traceability mechanism for non-Architecture/AI-component domains, but that file does not yet exist (created in chunk 014, which depends on all migration chunks 009-013)                                                                                                                                                                                                                                                                                                            | L      | Acceptable per the same pattern chunk 004 uses for the same file — the reference states the eventual traceability mechanism per AIF-META-001's Design section, independent of whether the file has been created yet in this Epic's sequencing. No agent following this guidance today would need `{paths.decisions}/index.json` to exist in order to correctly _not_ add a Process/Planning/Quality/Testing/Meta-process decision to `knowledge/index.json` — the guidance is actionable immediately regardless. |

---

## 15. Work Log

[2026-08-14 00:00] [AI-Engineer] [Created] [AIF-002-007] [Self-planned Chunk 007 of Epic AIF-002 per Tech-Lead's decomposition (`chunks.json`). Read Epic Plan Sections 5/4/5/8 and AIF-META-001 in full, plus the current `skills/knowledge-authoring/SKILL.md`. Assessed Tier 1 (Quick) per `skill/complexity-tiers`: single-file change (`SKILL.md`), clear intent, no new pattern or schema change — narrower than chunk 004's Tier 2 assessment (which touched three files across a widely-depended-upon skill introducing a new gate variant); this chunk replaces one table row's guidance text with no structural change to the skill itself. Per `steering/engineering/core.md` Rule 1, a Chunk Plan is still required and gates implementation regardless of tier, since this is an Epic chunk with dependent downstream work (Acceptance Criteria item in AIF-002 Section 11). Drafted full Chunk Plan following `skills/chunk-planning/reference/template.md`. Flagged one discovery (Section 14, Risk 1): two other lines in the same file (Edge Cases' "Decision Record" bullet, Step 6's decisions-subfolder parenthetical) describe the same superseded model but are outside this chunk's Epic-defined scope — raised rather than silently expanded into scope, per Rule 4. Saving as Status: Draft per `skill/plan-lifecycle` before presenting for human approval. No implementation performed.]
[2026-08-17 00:00] [Engineering-Manager] [Revised] [AIF-002-007] [Per human direction, folded Risk 1's two flagged corrections (Edge Cases "Decision Record" bullet, Step 6 `{paths.knowledge}/decisions/` parenthetical) into this chunk's own scope, so all `skills/knowledge-authoring/SKILL.md` changes resulting from AIF-002's decision-record model land in one self-contained chunk. Updated Section 1 (Last Updated), Section 2 (revision note), Section 5 (In/Out of Scope), Section 7 (Key Design Decision 3 superseded), Section 8 (two new Components added for the Step 6 and Edge Cases corrections), Section 12 (Test 007-T04 rewritten, Tests 007-T06/007-T07 added), Section 4 (Acceptance Criteria updated), Section 14 (Risk 1 marked Resolved). No change to the Step 2 guidance content itself. Still `Status: Draft`, not yet re-presented for human approval.]
[2026-08-18] [AI-Engineer] [Revised] [AIF-002-007] [Migrated this Chunk Plan to the reordered template structure approved for skill/chunk-planning: Quick Summary (new Section 3, open-item count derived from the existing Risks & Open Questions table) and Acceptance Criteria (moved from Section 12 to Section 4) now sit immediately after the Goal; all other sections renumbered accordingly (mapping: 3->5, 4->6, 5->7, 6->8, 7->9, 8->10, 9->11, 10->12, 11->13, 13->14, 14->15). Every inline "Section N" cross-reference in this file, including references into the AIF-002 Epic Plan's own renumbered sections, was remapped to match. No wording, decisions, criteria, or risk content was changed - purely structural, per human direction (no active work on these plans at the time of migration).]
[2026-08-18] [Engineering-Manager] [Approved] [AIF-002-007] [Human (Jeremy Smellie) explicitly confirmed in chat that chunks AIF-002-007 through AIF-002-015 are approved. Per skill/plan-lifecycle and engineering-core Rule 8, recorded that decision as a committed status change: `Status` updated from `Draft` to `Approved`, `Reviewed By` updated from `Pending` to `Jeremy Smellie`. No plan content changed. Committed as its own commit, separate from the prior revision history.]
