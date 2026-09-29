# Epic Plan: AI-Track Chunk Orchestration Dispatch

## 1. Metadata

| Field               | Value                                                                                                                                                                                   |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Epic ID             | AIF-001                                                                                                                                                                                 |
| Project             | ai-foundation                                                                                                                                                                           |
| Status              | Approved                                                                                                                                                                                |
| Author (Agent)      | Tech-Lead                                                                                                                                                                               |
| Reviewed By         | Jeremy                                                                                                                                                                                  |
| Created             | 2026-08-13                                                                                                                                                                              |
| Last Updated        | 2026-08-13                                                                                                                                                                              |
| Standards           | ai-foundation declarative-component schemas (AGENTS.md); no code standards apply — this Epic's deliverables are entirely `skills/` content, owned end-to-end by AI-Engineer per AIF-004 |
| Total Chunks        | 3                                                                                                                                                                                       |
| Product Requirement | None                                                                                                                                                                                    |
| Decision Records    | AIF-004 (Approved), AIF-005 (Approved), AIF-010 (Approved)                                                                                                                              |

---

## 2. Goal

Make `chunk-orchestration`, `chunk-planning`, and `epic-planning` track-aware so that a single Epic can contain both AI-track chunks (declarative components, owned by AI-Engineer) and software-track chunks (application code, owned by Software-Engineer), with both dispatching and pipelining automatically from the `agents` field that `chunks.json` already carries. Today, orchestration always assumes Software-Engineer and hardcodes a Software-Engineer → Test-Engineer → Principal-Engineer pipeline, and explicitly treats "AI component authoring" as out-of-domain work to be blocked — which directly contradicts AIF-004's settled ownership split. This Epic closes that gap per AIF-005's design, with chunk-boundary authorship unchanged per AIF-010 (Tech-Lead remains the sole author of `chunks.json` for both tracks).

> Requirement traceability: AIF-005 §"Impact on Planning" — "A Chunk Plan (or
> Tier-appropriate ai-foundation-internal plan) is needed to implement the
> `chunk-orchestration`/`chunk-planning`/`epic-planning` changes... it should be
> planned by Tech-Lead as a normal Epic."

---

## 3. Quick Summary

**Open Items:** 1 open (1 High / 0 Medium / 0 Low) — see Section 8

---

## 4. Scope

### In Scope

- `chunk-orchestration` Step 2 (Dispatch Wave): branch dispatch by each chunk's `agents` field — AI-track chunks (`agents: ["AI-Engineer"]`) dispatch to AI-Engineer instead of always assuming Software-Engineer.
- `chunk-orchestration` Step 3 (Monitor Pipeline): branch the pipeline by track.
  Software-track pipeline is unchanged (SE → TE → PE). AI-track pipeline is AI-Engineer implements + self-validates → Principal-Engineer review → Done, skipping Test-Engineer per AIF-005's Resolved Item #3.
- `chunk-orchestration` Step 4 (Handle Blocks): remove/rewrite the "Out-of-domain work detected" edge case's "AI component authoring" example — that work is now in-domain per AIF-004 and routes to AI-Engineer instead of being blocked and escalated to a human.
- `chunk-planning`: clarify that this skill (and its Chunk Plan template) applies to software-track chunks only. For AI-track chunks, the detailed plan is authored by AI-Engineer via `skill/complexity-tiers` (Tier 1/2: no written plan required: Tier 3: `skill/ai-engineering-plan`), still gated by `skill/plan-lifecycle` at the chunk's plan path.
- `epic-planning`: clarify Section 9/Step 5 guidance so Tech-Lead knows an AI-track chunk only needs a scope summary + `depends_on` in `chunks.json` (per the existing `agents` field), not a detailed Chunk-Plan-style breakdown.
- Version bumps (minor) on the front-matter of every modified `SKILL.md`, per this repo's existing versioning convention (each skill file currently carries a semver `version` field, e.g. `chunk-orchestration` is at `0.2.0`).
- Any `tests/validation/` assertions that reference the current single-track dispatch/pipeline behavior, if such assertions exist (to be confirmed at chunk decomposition — see Open Question 2).

### Out of Scope

- AIF-006 (parallel-chunk branch isolation), AIF-007/AIF-ARCH-004 (standards-sync ownership/mechanism), and AIF-009 (git-workflow mode) — separate Decision Records, separate Epics if/when planned.
- Introducing a new "AI Tech-Lead" agent or an `skill/ai-chunk-decomposition` skill — AIF-010 explicitly decided against this for now (Option A: status quo, Tech-Lead remains sole `chunks.json` author for both tracks).
- Any change to `bin/`, `lib/`, or other application code — none of this Epic's deliverables touch application code; everything here is declarative skill content owned by AI-Engineer per AIF-004.
- Retroactively re-processing or re-dispatching any Epic that already ran under the current single-track pipeline.
- Changing `chunks-schema.md`'s `agents` field definition — it already supports this use case as documented; no schema change is needed (per AIF-005's non-negotiable constraint).

---

## 5. Feature Description

### User-Facing Behaviour

When a human (via Engineering-Manager/orchestration) runs an Epic whose `chunks.json` contains a mix of chunks tagged `agents: ["Software-Engineer"]` and `agents: ["AI-Engineer"]`, both tracks now dispatch and progress automatically within the same wave-based orchestration run — no manual intervention or separate process is needed to hand AI-track chunks to AI-Engineer. Today, an AI-track chunk would incorrectly be marked `Blocked` with "out-of-domain work detected" and escalated to the human; after this Epic, it dispatches to AI-Engineer directly.

### Data Flow

1. Tech-Lead decomposes an Epic into `chunks.json`, assigning `agents` per chunk (unchanged — AIF-010).
2. `chunk-orchestration` Step 1 initializes orchestration state as today (no track distinction needed here — the state schema's `agents` field is already read from `chunks.json`).
3. `chunk-orchestration` Step 2 reads each `Ready` chunk's `agents` field:
   - `["Software-Engineer"]` → dispatch Software-Engineer subagent (unchanged).
   - `["AI-Engineer"]` → dispatch AI-Engineer subagent, with instruction to self-validate before reporting complete (AI-Engineer's own hard rule: "Always run tests before declaring work complete").
4. `chunk-orchestration` Step 3 branches the pipeline after the implementing agent completes:
   - Software-track: → Testing (Test-Engineer) → Reviewing (Principal-Engineer) → Done (unchanged).
   - AI-track: → Reviewing (Principal-Engineer) directly → Done (Testing/Test-Engineer step skipped).
5. Principal-Engineer remains the review gate for both tracks in all cases — unchanged.

### Business Rules

- The `agents` field on a chunk is the sole signal used for track-aware dispatch and pipeline selection. No new field is introduced (AIF-005 non-negotiable constraint).
- Test-Engineer is skipped only for AI-track chunks (`agents: ["AI-Engineer"]`).
  Every software-track chunk still goes through Test-Engineer — no shortcuts.
- Principal-Engineer review is never skipped for either track.
- AI-track chunks still require an `Approved` chunk plan (or a Tier-1/2 "no written plan required" determination, per `skill/complexity-tiers`) before dispatch — the approval gate is not weakened for either track.
- "AI component authoring" is removed from `chunk-orchestration`'s out-of-domain block example. Genuinely out-of-domain work (e.g. infrastructure provisioning unrelated to either track) remains blocked and escalated as before.

### Error States

| Scenario                                                                         | Expected Behaviour                                                                                                                                                                                                                         |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Chunk's `agents` field is missing, empty, or contains an unrecognized agent role | Mark chunk `Blocked` with reason "Unrecognized or missing agent assignment for chunk {id}" and escalate to human — do not guess a default track.                                                                                           |
| Chunk's `agents` field contains more than one agent (e.g. both tracks)           | Out of scope for this Epic — `chunks-schema.md` already allows `agents` to be an array, but this Epic assumes exactly one agent role per chunk. Raise as Open Question 1 below rather than silently deciding a multi-agent pipeline shape. |
| AI-Engineer subagent fails unexpectedly                                          | Same as existing "Agent subagent fails unexpectedly" edge case — mark chunk `Blocked`, log, escalate. No new behaviour needed.                                                                                                             |
| AI-track chunk's Chunk Plan (or Tier determination) is missing/not approved      | Same as existing "Chunk plan not found or not approved" edge case — mark `Blocked`, do not dispatch.                                                                                                                                       |

---

## 6. Architecture Overview

### New Components

| Component                | Type | Responsibility                                                                                                                                                                               |
| ------------------------ | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| None (no new components) | —    | This Epic modifies three existing skills' procedures/documentation; it does not add new skills, agents, or files beyond the modified `SKILL.md`s and any affected `tests/validation/` files. |

### Component Relationships

- `epic-planning` (Tech-Lead) produces `chunks.json` with per-chunk `agents` → `chunk-orchestration` (Engineering-Manager or equivalent orchestrator) reads `agents` to select dispatch target and pipeline shape → `chunk-planning` (Software-Engineer's chunk-plan authoring) applies to software-track chunks only; AI-track chunks bypass `chunk-planning` and use `skill/complexity-tiers` + `skill/ai-engineering-plan` instead (AI-Engineer's existing skills, unchanged by this Epic).

### Integration Points

- `skill/complexity-tiers` — existing skill, used unchanged by AI-Engineer to decide Tier 1/2/3 for each AI-track chunk's own plan.
- `skill/ai-engineering-plan` — existing skill, used unchanged for Tier 3 AI-track chunks.
- `skill/plan-lifecycle` — existing skill, continues to gate both tracks' plans identically (no weakening of the approval gate, per AIF-005's non-negotiable constraint).
- `chunks-schema.md`'s `agents` field — read, not modified.

---

## 7. Security Considerations

- No new attack surface — this Epic changes orchestration _logic_ (which agent gets dispatched and in what order), not any credential handling, external I/O, or network-facing behavior. `chunk-orchestration` already uses `ai-git`/worktree mechanics unchanged by this Epic.
- The chunk plan approval gate (`skill/plan-lifecycle`) must remain enforced identically for both tracks — this is a stated non-negotiable in AIF-005 and must be explicitly verified in the chunk implementing this change (no dispatch without an `Approved` plan/tier-determination, for either track).

---

## 8. Risks & Open Questions

| #   | Risk / Question                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Type     | Impact | Source                                                                        | Raised By   | Resolved                                                                                                                                                                                                                                                                                                                                                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | ------ | ----------------------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Should a chunk ever be assigned more than one agent in `agents` (e.g. a chunk requiring both tracks)? AIF-005's design assumes one track per chunk; `chunks-schema.md` allows an array without saying whether multi-agent chunks are meaningful. This Epic assumes single-agent chunks only and treats multi-agent as an error state (Section 5).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Question | M      | Design gap in AIF-005/chunks-schema.md                                        | Tech-Lead   | Yes — human confirmed no reason for a chunk to need multiple agents. If that need arises, the chunk should be split instead. The Section 5 error-state row (multi-agent `agents` = out of scope, raise rather than silently decide) stands as the permanent behaviour, not just an interim assumption.                                                                                             |
| 2   | Does `tests/validation/schemas.test.js` or `tools.test.js` assert anything about `chunk-orchestration`'s current single-track dispatch/pipeline text that would need updating alongside the `SKILL.md` changes?                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Question | L      | Repo inspection                                                               | Tech-Lead   | Yes — verified by direct inspection. Neither file, nor any other file under `tests/validation/`, references `chunk-orchestration`, the out-of-domain edge case, or the SE→TE→PE pipeline text. Both validation tests are generic YAML-schema checks (servers/agents front-matter) with no assertions tied to skill prose content. No test updates are in scope for this Epic.                      |
| 3   | This Epic's ID (`AIF-001`) reuses the `AIF` project-shortname convention established by the Decision Records (`AIF-004`...`AIF-010`), since `.aiconfig.json` has no explicit `project_shortname` field (falls back to `project_name: "ai-foundation"` per `skill/epic-planning`). Confirm `AIF` is the intended Epic-ID prefix, and whether `.aiconfig.json` should be updated with an explicit `project_shortname` field to remove this ambiguity for future Epics.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Question | M      | `skill/epic-planning` Step 2 vs. observed repo convention                     | Tech-Lead   | Yes — human updated `.aiconfig.json` with `"project_shortname": "AIF"`. `AIF-001` is confirmed correct.                                                                                                                                                                                                                                                                                            |
| 4   | This Epic is saved at `docs/plans/epics/AIF-001.epic.md` with chunks at `docs/plans/chunks/AIF-001/chunks.json`, inferring `paths.epics`/`paths.chunks` from the configured `paths.plans: "docs/plans"` (by analogy with how `paths.knowledge: "docs"` resolves the observed `docs/decisions/` location). `.aiconfig.json` does not explicitly set `paths.epics` or `paths.chunks`, and `skill/epic-planning`'s literal documented default is `plans/epics/` / `plans/chunks/` (not derived from `paths.plans`). Confirm this location is correct, or whether `.aiconfig.json` should gain explicit `paths.epics`/`paths.chunks` entries.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Question | M      | `skill/epic-planning` Outputs vs. `.aiconfig.json`                            | Tech-Lead   | Yes — human added explicit `.aiconfig.json` entries: `"paths": {"epics": "epics", "chunks": "chunks"}`. Per `skill/epic-planning`'s literal default resolution, these are relative to the repo root, not nested under `paths.plans` — so the corrected canonical locations are `epics/AIF-001.epic.md` and `chunks/AIF-001/chunks.json`. This Epic file has been moved accordingly (see Work Log). |
| 6   | While implementing chunk 001 (`chunk-orchestration` track-aware dispatch/pipeline/blocks), AI-Engineer found that two areas outside this chunk's literal enumerated scope are still track-unaware: (a) the Conflict Resolution Sub-Flow in Step 4 still hardcodes dispatching a "Software-Engineer subagent" for conflict resolution regardless of track; (b) the generic Edge Cases section at the bottom of `chunk-orchestration/SKILL.md` still references "SE → TE → PE" / "SE is re-dispatched" language in a track-agnostic way (e.g. "Epic has only one chunk", "Conflict resolution introduces test failures", "Human resolves conflict but doesn't push"). AI-Engineer did not implement a fix (per engineering-core.md Rule 4) and raised it here instead.                                                                                                                                                                                                                                                                                                                                                                             | Question | M      | AI-Engineer discovery during AIF-001-001 implementation                       | AI-Engineer | Yes — human (Jeremy) directed 2026-08-19 to fix this within chunk 001 (scope explicitly reopened for this chunk, not deferred to a follow-up). Conflict Resolution Sub-Flow and the generic Edge Cases section are to be made track-aware alongside the already-completed Step 2-4 changes.                                                                                                        |
| 5   | AIF-005 chose Option B (dual-authorship: AI-Engineer self-plans AI-track chunks via `skill/complexity-tiers`/`skill/ai-engineering-plan`, separate from Tech-Lead's Chunk Plan template) over Option A (Tech-Lead authors one Chunk Plan format for every chunk regardless of track). While scoping a follow-up change (giving Tech-Lead approval-gated subagent-dispatch capability to trigger AI-track plan authorship pre-orchestration), the human indicated a preference for reopening AIF-005 toward something closer to Option A — Tech-Lead authoring (or being able to author) the Chunk Plan for both tracks, and holding dispatch capability for both. This directly reopens AIF-005's chosen rationale (Tech-Lead lacking AGENTS.md-schema expertise; Test-Engineer having nothing to test on declarative changes) and AIF-010's assumption that Tech-Lead doesn't write schema-level detail. Needs Architect reconsideration — likely a new/superseding Decision Record — before any agent or skill changes proceed on this front. See `docs/plans/tech-lead-subagent-dispatch-plan.md` (Deferred) for the superseded interim plan. | Risk     | H      | Human feedback during AI-Engineer scoping conversation, adjacent to this Epic | AI-Engineer | Yes — human (Jeremy) confirmed 2026-08-19 that this was revisited and resolved elsewhere, and confirmed AI-Engineer owning this Epic's dual-authorship work (AIF-005 Option B, as originally decided) is acceptable. No superseding Decision Record was found in `docs/decisions/` at the time of this update; proceeding on the human's explicit direction per this Epic's approval gate.         |

---

## 9. Chunk Decomposition

Dependency graph: [`chunks.json`](../chunks/AIF-001/chunks.json)

Summary: 3 chunks across 1 wave. All three chunks are independent (no `depends_on` edges) and dispatch fully in parallel.

- **001 — `chunk-orchestration`**: track-aware dispatch (Step 2), track-aware pipeline (Step 3), and removal of "AI component authoring" from the out-of-domain edge case (Step 4).
- **002 — `chunk-planning`**: documents the AI-track exception — AI-track chunks are planned by AI-Engineer via `skill/complexity-tiers`/`skill/ai-engineering-plan` instead of this skill's template, still gated by `skill/plan-lifecycle`.
- **003 — `epic-planning`**: clarifies Section 9/Step 5 guidance so Tech-Lead knows an AI-track chunk only needs a scope summary + `depends_on`, not a detailed software-style breakdown.

`dag-validate` result: `{"valid": true, "errors": []}`. `dag-compute-waves` result:
one wave, `["001", "002", "003"]`.

The `chunks.json` file is the machine-parseable source of truth for the dependency graph. It must pass `dag-validate` before the epic is considered decomposed.

Start from the template at `skills/epic-planning/assets/chunks.json`.
See `skills/epic-planning/reference/chunks-schema.md` for the file format.

Parallelization notes:

- All three chunks touch distinct files (`skills/chunk-orchestration/SKILL.md`, `skills/chunk-planning/SKILL.md`, `skills/epic-planning/SKILL.md` respectively) — no file overlap, so no merge-conflict risk from parallel dispatch.
- Although the three skills describe cross-referenced behavior (the same dispatch/pipeline design spans all three), this Epic's Section 5 is the single source of truth each chunk implements independently, so no `depends_on` ordering is required between them. Per AIF-010, if AI-Engineer discovers while implementing one chunk that this boundary was wrong (e.g. a dependency actually exists), it stops and raises the discovery back to this Epic rather than silently reordering.

---

## 10. Acceptance Criteria

- [ ] All chunks complete and signed off
- [ ] `chunk-orchestration` Step 2 dispatches AI-track chunks to AI-Engineer and software-track chunks to Software-Engineer, driven solely by the chunk's `agents` field
- [ ] `chunk-orchestration` Step 3 pipelines AI-track chunks as AI-Engineer-implements-and-self-validates → Principal-Engineer review → Done (Test-Engineer skipped), and leaves the software-track SE → TE → PE pipeline unchanged
- [ ] `chunk-orchestration` Step 4's "Out-of-domain work detected" edge case no longer lists AI component authoring as an example of out-of-domain work
- [ ] `chunk-planning` and `epic-planning` clearly document the AI-track exception (who authors the detailed plan, which skill governs it, how it's gated)
- [ ] Neither track's plan-approval gate (`skill/plan-lifecycle`) is weakened
- [ ] No HIGH or CRITICAL findings open in any chunk review
- [ ] Epic-level CHANGELOG entry written (if this repo maintains one — confirm at implementation time)
- [ ] All Open Questions in Section 8 are resolved before implementation begins on the chunk(s) they affect

---

## 11. Work Log

[2026-08-13] [Tech-Lead] [Created] [AIF-001] [Drafted Epic Plan implementing AIF-005's dual-authorship, track-appropriate plan and pipeline design, per AIF-005's "Impact on Planning" directive. Confirmed AIF-004 requires no Epic/Chunk Plan of its own (the required follow-up is a declarative `ai-engineer.yaml` prompt-scope edit, owned end-to-end by AI-Engineer via its own Tier-appropriate process, not Tech-Lead's Epic/Chunk pipeline).]
[2026-08-13] [Tech-Lead] [Revised] [AIF-001] [Resolved all 4 Open Questions per human feedback: (1) multi-agent `agents` arrays confirmed out of scope — split the chunk instead; (2) confirmed no `tests/validation/` assertions reference `chunk-orchestration` content, so no test updates are in scope; (3)/(4) human added `project_shortname: "AIF"` and explicit `paths.epics: "epics"` / `paths.chunks: "chunks"` to `.aiconfig.json`. Moved this file from `docs/plans/epics/AIF-001.epic.md` to the now-canonical `epics/AIF-001.epic.md` to match the corrected path config.]
[2026-08-13] [Tech-Lead] [Approved] [AIF-001] [Human (Jeremy) approved the Epic Plan. Proceeding to Step 5: chunk decomposition into `chunks.json`.]
[2026-08-13] [Tech-Lead] [Decomposed] [AIF-001] [Produced `chunks/AIF-001/chunks.json` with 3 independent, parallel chunks (one per modified skill: `chunk-orchestration`, `chunk-planning`, `epic-planning`). Ran `dag-validate` (valid: true) and `dag-compute-waves` (single wave: 001, 002, 003) via `servers/dag/logic.js`. Updated Section 9 with the decomposition summary. Chunk Plans for each chunk are not yet authored — that is AI-Engineer's next step per AIF-005 (self-plan via `skill/complexity-tiers`), gated by `skill/plan-lifecycle` before dispatch.]
[2026-08-13] [AI-Engineer] [Raised] [AIF-001] [While scoping a Tech-Lead subagent-dispatch capability to trigger the above AI-track plan-authorship step, human feedback indicated a preference for reopening AIF-005's chosen Option (B) toward something closer to Option A — Tech-Lead authoring the Chunk Plan for both tracks. Deferred the interim plan (`docs/plans/tech-lead-subagent-dispatch-plan.md`, Status: Deferred) rather than implement against a Decision Record that may be superseded. Added Open Question 5. Routing to Architect to reconsider AIF-005/AIF-010; no agent/skill changes made.]
[2026-08-18] [AI-Engineer] [Revised] [AIF-001] [Migrated this Epic Plan to the reordered template structure approved for skill/epic-planning: Quick Summary (new Section 3, open-item count) now sits immediately after the Goal; the former Open Questions section (old Section 7) was renamed Risks & Open Questions and gained a Type column, merging the two concepts per skill/chunk-planning's existing pattern. All other sections renumbered accordingly (mapping: 3->4, 4->5, 5->6, 6->7, 7->8, 8->9, 9->10, 10->11); every inline "Section N" cross-reference in this file was remapped to match. Type classification is a judgment call made per human direction (Rule 2 delegated judgment): rows 1-4 (resolved scoping/design questions) are Question; row 5 (Resolved: No, routed to Architect, reopens AIF-005's dual-authorship rationale) is Risk, since it threatens assumptions this already-Approved Epic's chunk decomposition depends on. No wording, decisions, criteria, priority values, or resolution status were changed - purely structural plus the one classification judgment call requested, per human direction (no active work on this plan at the time of migration).]
[2026-08-19] [Engineering-Manager] [Revised] [AIF-001] [Human (Jeremy) confirmed Risk 5 has been revisited and resolved elsewhere, and explicitly approved AI-Engineer owning this Epic's work under the existing AIF-005 dual-authorship model. Marked Risk 5 Resolved: Yes on human direction. All Section 8 items are now resolved, satisfying Acceptance Criterion "All Open Questions in Section 8 are resolved before implementation begins." Proceeding to dispatch all 3 chunks (001, 002, 003) to AI-Engineer per chunks.json - single wave, no depends_on edges, no file overlap.]
[2026-08-19] [Principal-Engineer] [Reviewed] [AIF-001] [Chunk 003 (epic-planning) APPROVED, no blocking findings. One LOW finding surfaced as a follow-up, not fixed per-chunk to avoid a multi-writer conflict on the shared bundle file: `bundles/engineering/snapshot.json`'s recorded hash for each modified skill file (epic-planning now, chunk-orchestration and chunk-planning pending their own reviews) will be stale once all 3 AIF-001 chunks land, since none of the three parallel chunks should regenerate a shared bundle snapshot independently. FOLLOW-UP ACTION before this Epic is considered fully closed: run `aif snapshot --bundle engineering` (or equivalent) once chunks 001, 002, and 003 have all merged to main, to refresh bundles/engineering/snapshot.json's hashes for skills/chunk-orchestration/SKILL.md, skills/chunk-planning/SKILL.md, and skills/epic-planning/SKILL.md.]
