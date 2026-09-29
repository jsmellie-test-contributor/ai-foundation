# Decision Record: AI-Track Chunk Orchestration Dispatch

## Metadata

| Field          | Value                                                  |
| -------------- | ------------------------------------------------------ |
| Decision ID    | AIF-PROC-002                                           |
| Project        | ai-foundation                                          |
| Tier           | A                                                      |
| Domain         | process                                                |
| Status         | Superseded                                             |
| Author (Agent) | Architect                                              |
| Approved By    | Jeremy                                                 |
| Created        | 2026-08-13                                             |
| Referenced By  | AIF-PROC-004, AIF-PROC-005, AIF-PROC-006, AIF-ARCH-005 |
| References     | AIF-PROC-001                                           |
| Tags           | orchestration, dual-track, dispatch                    |

---

> **Archived, `Superseded`** (process-model check 27, 2026-09-25): the AI-track/
> software-track dispatch distinction this record decided retires with the
> process-model merge — task-orchestration is now uniform for every task, per
> `docs/process-model.md`'s Agent roster and `skill/task-orchestration`. Kept here as
> historical record — not converted to MADR.

## Problem Statement

AIF-PROC-001 established that `ai-foundation` work splits into two tracks: declarative AI components (owned by AI-Engineer) and application code in `bin/`/`lib/` (owned by Software-Engineer, planned via Tech-Lead's Epic/Chunk process). But chunk orchestration is still single-track: `chunk-orchestration`'s dispatch logic (Step 2)
always dispatches Software-Engineer, and its monitored pipeline (Step 3) is hardcoded SE → TE → PE. Its own edge cases explicitly list "AI component authoring" as an example of "out-of-domain work" that gets `Blocked` and escalated to a human, rather than routed to AI-Engineer. This means a single Epic cannot currently contain both AI-track and software-track chunks and have both dispatch automatically — even though `chunks.json` already has an `agents` field per chunk that is structurally capable of expressing this split.

---

## Constraints & Requirements

What was non-negotiable:

- `chunks.json`'s existing `agents` field must be the mechanism used, not a new parallel schema — it already exists for exactly this purpose per `chunks-schema.md`.
- Each track's plan must still be authored by the agent with the relevant domain expertise (Tech-Lead should not be forced to write AGENTS.md-schema-level detail it isn't equipped to write; AI-Engineer should not be forced to reverse-engineer a software Chunk Plan template that assumes interfaces/security/logging sections meant for code).
- Whatever the resolution, it must not silently weaken the human-approval gate (`skill/plan-lifecycle`) for either track.

What was a preference but not a hard requirement:

- Minimize changes to `chunk-orchestration`/`chunk-planning`/`epic-planning` — reuse structure that already exists where possible.

---

## Options Explored

### Option A: Single-authorship, always-reviewed

**Summary**: Tech-Lead writes the full Chunk Plan for every chunk regardless of track (including AI-track chunks), using the existing Chunk Plan template.
`chunk-orchestration` gains a branch in Step 2/3: if `agents` is `["AI-Engineer"]`, dispatch AI-Engineer instead of Software-Engineer, but keep Test-Engineer and Principal-Engineer in the pipeline unchanged.
**Strengths**: Minimal new concepts — one plan schema, one universal pipeline shape.
Principal-Engineer stays the single quality gate across all work.
**Weaknesses**: Tech-Lead ends up writing "components/interfaces" detail for AGENTS.md schema changes it has no particular expertise in, conflicting with the escalate-to-the-right-owner principle already established for this repo (AIF-PROC-001).
Test-Engineer in the pipeline for declarative changes has nothing meaningful to test (there's no separate runtime test suite for prompt/schema content beyond the validation tests AI-Engineer already runs itself).

### Option B: Dual-authorship, track-appropriate plan and pipeline

**Summary**: Tech-Lead's Epic Section 8 decomposition assigns `agents:
["AI-Engineer"]` to AI-track chunks with only a scope summary and `depends_on`.
AI-Engineer then authors that chunk's own plan — using `skill/complexity-tiers` to decide whether a written plan is even needed (Tier 1/2) or whether `skill/ai-engineering-plan` applies (Tier 3) — saved at the standard chunk-plan path and gated by `skill/plan-lifecycle` exactly like any other chunk plan.
`chunk-orchestration` Step 2 dispatches by the chunk's `agents` field: AI-track chunks go to AI-Engineer; software-track chunks go to Software-Engineer as today.
Step 3's pipeline branches too: AI-track = AI-Engineer implements + self-validates → Principal-Engineer review → Done (Test-Engineer skipped — AI-Engineer's own hard rule already requires running validation tests before declaring work complete).
Software-track pipeline is unchanged (SE → TE → PE).
**Strengths**: Each agent authors the plan for its own domain, matching AIF-PROC-001 and the escalation principle already in effect. Reuses the `agents` field exactly as `chunks-schema.md` already documents it — no schema change required. Preserves DAG dependency automation and parallel wave dispatch across both tracks in one Epic.
Principal-Engineer remains the review gate for both tracks (schema/cross-reference review for AI-track, code review for software-track), so "never skip the quality pipeline" still holds — only the track-specific _tester_ step is skipped, not review.
**Weaknesses**: `chunk-orchestration` and `chunk-planning` need branching logic (track-aware dispatch and track-aware plan authorship) added — real, if bounded, work. Two plan schemas now exist under one Epic, so anyone reading `chunks.json` must check `agents` to know which plan format to expect at a chunk's path.

### Option C: Fully decoupled tracks

**Summary**: Don't extend `chunk-orchestration` at all. Tech-Lead's Epic Section 8 splits into two independent lists: a `chunks.json`-backed software track (unchanged)
and a plain-text "AI Component Work" list handled entirely outside orchestration — a human manually invokes AI-Engineer per item, and cross-track dependencies are tracked as prose notes rather than DAG edges.
**Strengths**: Zero changes to `chunk-orchestration`'s pipeline assumptions.
**Weaknesses**: Loses automated dependency tracking and parallel dispatch between the two tracks — reintroduces the manual coordination gap the Epic/Chunk system exists to prevent, and gets worse as both tracks grow (which is the stated trend).

---

## Decision

**Chosen approach**: Option B — dual-authorship, track-appropriate plan and pipeline, dispatched via the chunk's existing `agents` field.

**Rationale**: The `agents` field in `chunks.json` already exists specifically to assign "appropriate agent(s) to each chunk" (per `chunks-schema.md` Step 5) — the gap is purely that `chunk-orchestration` never reads it for dispatch or pipeline selection, and its "out-of-domain" edge case actively blocks the exact work AIF-PROC-001 just brought in-scope. Fixing dispatch to honor the field it already has is smaller and more consistent than either forcing one plan format on both tracks (Option A) or abandoning DAG automation (Option C). Keeping Principal-Engineer as the review gate for both tracks (just varying what precedes it) preserves "never skip the quality pipeline" without forcing Test-Engineer to review artifacts it has nothing to meaningfully test.

**Trade-offs accepted**:

- `chunk-orchestration`, `chunk-planning`, and `epic-planning` all need edits to become track-aware. This is real implementation work, tracked as its own planned change (see Impact on Planning) — not done as part of this Decision Record.
- Two plan-artifact shapes coexist per Epic. Mitigated by keeping both gated through the same `skill/plan-lifecycle` procedure and the same file-path convention, so the _mechanics_ stay uniform even though the _content_ differs by track.

---

## Impact on Planning

- A Chunk Plan (or Tier-appropriate ai-foundation-internal plan) is needed to implement the `chunk-orchestration`/`chunk-planning`/`epic-planning` changes:
  track-aware dispatch in Step 2, track-aware pipeline in Step 3, and removal/rewrite of the "AI component authoring is out-of-domain" edge case. This is `bin`/`lib`-adjacent process work, not application code — it should be planned by Tech-Lead as a normal Epic (the skills being modified are declarative components, so implementation is AI-Engineer's, per AIF-PROC-001).
- See AIF-PROC-005 for the related (but separate) decision on how orchestrated chunks — from either track — interact with this repo's git workflow mode.

---

## Resolved Items

| #   | Item                                                                   | Resolution                                                                                                                                                                                                                         |
| --- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | How does an Epic route AI-component work to AI-Engineer automatically? | Tech-Lead assigns `agents: ["AI-Engineer"]` on the relevant chunk(s) in `chunks.json`; `chunk-orchestration` (once updated per this decision) dispatches and pipelines by that field instead of always assuming Software-Engineer. |
| 2   | Who writes the detailed plan for an AI-track chunk?                    | AI-Engineer, using `skill/complexity-tiers` to select Tier 1/2/3 process and `skill/ai-engineering-plan` for Tier 3, gated by `skill/plan-lifecycle` at the chunk's plan path — not Tech-Lead.                                     |
| 3   | Does Test-Engineer review AI-track chunks?                             | No — AI-Engineer self-validates (existing hard rule) and Principal-Engineer still reviews before Done. Test-Engineer is skipped only for the AI track.                                                                             |
