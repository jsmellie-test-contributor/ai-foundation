# Chunk Plan: Engineering-Manager Process-Domain Decision Authoring + Decision Hand-off Sub-Flow

## 1. Metadata

| Field          | Value                                                                                                                                                                                                                                                                                                                                                                       |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plan ID        | AIF-002-006                                                                                                                                                                                                                                                                                                                                                                 |
| Parent Epic    | AIF-002                                                                                                                                                                                                                                                                                                                                                                     |
| Chunk          | 6 of 15                                                                                                                                                                                                                                                                                                                                                                     |
| Depends On     | None                                                                                                                                                                                                                                                                                                                                                                        |
| Can Parallel   | AIF-002-001, AIF-002-002, AIF-002-003, AIF-002-004, AIF-002-005, AIF-002-007, AIF-002-008, AIF-002-009 (Wave 1 siblings, per `docs/plans/chunks/AIF-002/chunks.json`)                                                                                                                                                                                                       |
| Project        | ai-foundation                                                                                                                                                                                                                                                                                                                                                               |
| Status         | Approved                                                                                                                                                                                                                                                                                                                                                                    |
| Author (Agent) | AI-Engineer                                                                                                                                                                                                                                                                                                                                                                 |
| Reviewed By    | Jeremy                                                                                                                                                                                                                                                                                                                                                                      |
| Created        | 2026-08-14                                                                                                                                                                                                                                                                                                                                                                  |
| Last Updated   | 2026-08-17 (Approved by Jeremy)                                                                                                                                                                                                                                                                                                                                             |
| Standards      | None apply — this chunk produces only declarative agent-config (`agents/engineering-manager.yaml`) and skill content (`skills/chunk-orchestration/SKILL.md` + `reference/state-schema.md`), governed by AGENTS.md schemas and `skill/agent-authoring`/`skill/skill-authoring`, not by the project's `javascript`/`node` engineering standards (no runtime code is produced) |

---

## 2. Goal

Expand `agents/engineering-manager.yaml`'s charter to include Process-domain (`PROC`) decision-record authoring, per AIF-META-001's Tier × Domain model and following the domain-ownership pattern already established by AIF-PROC-001 (formerly AIF-004, AI-Engineer's Architecture/AI-component split). Add a corresponding Hard Rule covering orchestration-time decision hand-offs, and implement the new **Decision Hand-off Sub-Flow** in `skill/chunk-orchestration` Step 4 (parallel to the existing Conflict Resolution Sub-Flow) so a dispatched subagent's cross-domain or approval-gated decision blocks the chunk correctly, gets authored, and resumes only once `Approved` — reusing existing generic Blocked/unblock mechanics with three new Log actions in `state-schema.md`.

---

## 3. Quick Summary

**Open Items:** 3 open (0 High / 0 Medium / 3 Low) — see Section 14

---

## 4. Acceptance Criteria

- [ ] `agents/engineering-manager.yaml` gains a Process-domain (`PROC`)
      decision-authoring Responsibilities bullet, referencing `skill/decision-triage` → `skill/decision-record`/`skill/decision-brief` and the AIF-PROC-001 (formerly AIF-004) precedent
- [ ] `agents/engineering-manager.yaml` gains a new Hard Rule covering orchestration-time decision hand-offs, referencing the Decision Hand-off Sub-Flow and both gate invariants
- [ ] `agents/engineering-manager.yaml`'s `skills:` field includes `skill/decision-triage`, `skill/decision-record`, `skill/decision-brief` alongside the two pre-existing entries
- [ ] `agents/engineering-manager.yaml`'s `tools:`/`approved_tools:` lists are unchanged from v0.4.0 — **explicitly verified: no `web_search`/ `web_fetch` added** (Epic AIF-002 Section 7 non-negotiable)
- [ ] `agents/engineering-manager.yaml` `version` bumped `0.4.0` → `0.5.0`
- [ ] `skill/chunk-orchestration/SKILL.md` implements the Decision Hand-off Sub-Flow under Step 4, matching all five sub-steps from Epic AIF-002 Section 4 1:1
- [ ] `skill/chunk-orchestration/reference/state-schema.md` documents exactly three new Log actions (`decision_handoff_detected`, `decision_authored`, `decision_handoff_resolved`) and no other schema element changes
- [ ] All Section 12 tests pass (structural self-validation)
- [ ] Security checklist (Section 10) fully satisfied, including the explicit no-`WebSearch`/`WebFetch` verification
- [ ] Logging requirements (Section 11) fully satisfied — all three log actions documented with level, logged fields, and excluded fields
- [ ] Documentation checklist (Section 13) fully satisfied
- [ ] Review approved with no CRITICAL or HIGH findings

---

## 5. Scope

### In Scope

- `agents/engineering-manager.yaml`:
  - Add a Responsibilities bullet for Process-domain (`PROC`) decision-record authoring via `skill/decision-triage` → `skill/decision-record`/ `skill/decision-brief`.
  - Add `skill/decision-triage`, `skill/decision-record`, `skill/decision-brief` to the `skills:` field (EM invokes all three when it authors a Process-domain decision directly — see Key Design Decision 2).
  - Add a new Hard Rule covering orchestration-time decision hand-offs: when a dispatched subagent reports (via `skill/decision-triage`) that continuing requires a Tier A/B decision outside its own domain, or requires human approval before it can proceed, follow the Decision Hand-off Sub-Flow (`skill/chunk-orchestration` Step 4); never resume a chunk past the decision point until it reaches `Approved`; `Deferred` never satisfies the gate.
  - Version bump (0.4.0 → 0.5.0 — minor, backward-compatible capability addition, no breaking change to existing fields).
  - **Explicit constraint (Epic AIF-002 Section 7, non-negotiable): no `WebSearch`/`WebFetch` tool is added to `tools` or `approved_tools`.**
- `skills/chunk-orchestration/SKILL.md`:
  - New **Decision Hand-off Sub-Flow** under Step 4 (Handle Blocks), placed parallel to the existing Conflict Resolution Sub-Flow, implementing the five sub-steps from Epic AIF-002 Section 4 verbatim:
    1. Mark chunk `Blocked` with a structured `blocked_reason` (domain, tier, owning agent); log `decision_handoff_detected`.
    2. If EM owns the domain (Process), author directly via `decision-triage` → `decision-record`/`decision-brief`. Otherwise dispatch the owning agent as a subagent to author it the same way. Log `decision_authored` once the Draft is committed.
    3. Present the Draft decision to the human alongside the existing blocked-chunk escalation — the decision's own `plan-lifecycle` gate (not orchestration state) governs Approved/Deferred.
    4. Once the decision reaches `Approved`, reuse the existing generic "when human unblocks" behavior unchanged (Blocked → Ready → full pipeline redispatch) — no new resume mechanic.
    5. If `Deferred`, the chunk remains `Blocked` — `Deferred` never satisfies the gate.
  - Log `decision_handoff_resolved` at the point the sub-flow's outcome is settled (chunk successfully unblocked via the existing generic mechanic — see Key Design Decision 4 for exact placement).
- `skills/chunk-orchestration/reference/state-schema.md`:
  - Add exactly three new Log actions to the Log actions table:
    `decision_handoff_detected`, `decision_authored`, `decision_handoff_resolved`.
  - No new chunk `status` value. No new state-object field. Reuses the existing `Blocked`/`blocked_reason`/unblock mechanics documented in the Chunk status values / Status transitions sections (unchanged).

### Out of Scope

- Any change to `skills/decision-triage/`, `skills/decision-record/`, or `skills/decision-brief/` themselves (chunks AIF-002-001, 002, 003 — this chunk only references them by name and dispatches to them, per the same no-file-dependency pattern established in AIF-002-001).
- Any change to `skill/plan-lifecycle` (chunk AIF-002-004) — this chunk reuses its Draft → Approved/Deferred gate unmodified; the Decision Hand-off Sub-Flow explicitly defers to it rather than re-implementing approval semantics.
- Any change to the Tier C inline-recording convention (chunk AIF-002-005) — the Decision Hand-off Sub-Flow only triggers for Tier A/B hand-offs per Epic Section 5; Tier C decisions never reach this sub-flow (no cross-domain check applies to Tier C, per `skill/decision-triage`'s own design in AIF-002-001).
- Any new chunk `status` value, new state-object field, or new resume mechanic beyond the existing `Blocked` → `Ready` unblock path — explicitly ruled out by Epic AIF-002 Section 4 sub-step 4 and the state-schema scope note above.
- Splitting `skill/chunk-orchestration` into a generic orchestration core versus an engineering-specific pipeline layer — explicitly out of scope for the Epic as a whole (Epic AIF-002 Section 4, "Out of Scope"), flagged separately for Architect.
- Granting `WebSearch`/`WebFetch` to Engineering-Manager or any other domain-owning agent — explicitly out of scope for the Epic as a whole (Epic AIF-002 Section 4, "Out of Scope") and independently verified as an acceptance item in Section 10/12 below.
- Any enforcement mechanism that blocks an agent outside a domain's ownership from authoring a Tier A/B decision — per Epic AIF-002 Section 5 Error States, this remains a documented convention, not a tooling gate, unchanged by this chunk.

---

## 6. Prerequisites

- [x] AIF-META-001 (Decision Record: Tiering, Domain Ownership, Interconnectivity)
      is `Approved` — governs the Process (`PROC`) domain ownership assignment to Engineering-Manager and the "no `WebSearch`/`WebFetch`" non-negotiable this chunk implements/verifies.
- [x] AIF-004 (soon to be renumbered `AIF-PROC-001` by chunk AIF-002-012) is `Approved` — the precedent this chunk's Responsibilities-bullet phrasing explicitly follows (AI-Engineer's Architecture/AI-component split).
- [x] Epic AIF-002 is `Approved` and decomposed (`chunks.json`, Wave 1, no dependencies for this chunk).
- [x] `skill/agent-authoring`, `skill/skill-authoring`, and `skill/plan-lifecycle` exist and define the schemas, folder structure, and commit-gate procedure this chunk follows.
- [ ] No dependency on any sibling Wave 1 chunk's output — this chunk references `skill/decision-triage`, `skill/decision-record`, and `skill/decision-brief` by _name_ only, not by reading their finalized content, so it can be authored in parallel with AIF-002-001/002/003 without a file-level dependency (same pattern established in AIF-002-001's own Prerequisites).

---

## 7. Architecture & Design

### Project Structure Changes

```
agents/engineering-manager.yaml                       ← MODIFIED
skills/chunk-orchestration/SKILL.md                    ← MODIFIED
skills/chunk-orchestration/reference/state-schema.md    ← MODIFIED
```

No new files or folders — this chunk is entirely additive edits to three existing declarative files.

### Key Design Decisions

1. **Decision**: Bundle the `agents/engineering-manager.yaml` charter expansion and the `skill/chunk-orchestration` Decision Hand-off Sub-Flow into a single chunk, rather than splitting them across two parallel chunks.
   **Rationale**: Directly matches Epic AIF-002's own parallelization note in Section 10: "the Decision Hand-off Sub-Flow's description must stay consistent across both files, so one chunk owns both rather than risking drift between two parallel chunks describing the same behavior." This is not a decision this chunk is free to revisit — it is inherited from the Epic's chunk decomposition.

2. **Decision**: `engineering-manager.yaml`'s `skills:` field gains all three of `skill/decision-triage`, `skill/decision-record`, and `skill/decision-brief`, not just the entry point.
   **Rationale**: Epic AIF-002 Section 4 states EM "authors directly via `decision-triage` → `decision-record`/`decision-brief`" for the Process domain — meaning EM itself carries out all three skills' Steps end-to-end when self-authoring, not merely the triage step before dispatching elsewhere.
   `skill/agent-authoring` Step 6 requires every skill an agent invokes to be declared; since EM genuinely executes all three (unlike, say, an agent that only ever dispatches another agent to run a skill), all three are declared.
   This does not modify the skills themselves (out of scope, see Section 5) — only the reference from `engineering-manager.yaml`.

3. **Decision**: The Hard Rule addition references the Decision Hand-off Sub-Flow in `skill/chunk-orchestration` rather than re-stating its five sub-steps inline in the agent prompt.
   **Rationale**: Avoids two sources of truth for the same procedure — the existing Hard Rules for merge-conflict handling already follow this pattern (e.g. "When a merge conflict is detected, ALWAYS attempt automated resolution via SE first" summarizes the sub-flow rather than reproducing its six steps).
   The Hard Rule states the trigger condition and the two invariants that matter at the agent-identity level (never resume past an unapproved decision; `Deferred` never satisfies the gate) and defers full mechanics to the skill, consistent with `agents/engineering-manager.yaml`'s existing style.

4. **Decision**: `decision_handoff_resolved` is logged at the same point the existing "When human unblocks" step already logs `chunk_unblocked` — i.e.
   when the decision has reached `Approved` and the chunk transitions `Blocked` → `Ready` — rather than at some new, separate point in the flow.
   **Rationale**: Epic AIF-002 Section 4 sub-step 4 is explicit that this reuses "the existing generic 'when human unblocks' behavior unchanged... no new resume mechanic needed." Logging `decision_handoff_resolved` alongside (not instead of) the existing `chunk_unblocked` log entry keeps both the decision-specific audit trail (a decision hand-off was the reason, and it resolved) and the generic unblock trail intact, without inventing a new status or resume path. The Steps text explicitly says "log both" to avoid ambiguity about whether one log action replaces the other.

5. **Decision**: The Decision Hand-off Sub-Flow's placement in `SKILL.md` is directly after the Conflict Resolution Sub-Flow's step 6, before the shared "Blocked chunks and wave progression" note.
   **Rationale**: Matches Epic AIF-002 Section 4's explicit framing ("parallel to the existing Conflict Resolution Sub-Flow") and keeps both sub-flows grouped together ahead of the general blocked-chunk rules that apply to every sub-flow (including this new one), avoiding duplication of those shared rules.

6. **Decision**: No new chunk `status` value (e.g. no `DecisionPending`) is introduced — the sub-flow uses `Blocked` with a structured `blocked_reason` exactly as the merge-conflict-escalation path already does.
   **Rationale**: Epic AIF-002 Section 4's sub-step 1 and the state-schema scope note both explicitly rule this out ("No new chunk `status` value or state-object field is needed — reuses the existing `Blocked`/`blocked_reason`/ unblock mechanics"). `blocked_reason`'s existing type (`string | null`) already accommodates a structured-but-stringified reason (domain, tier, owning agent), consistent with how the existing merge-conflict `blocked_reason` values are already free-text descriptions embedding structured facts (branch name, conflicting files).

### Patterns & Conventions Applied

- `skill/agent-authoring`'s field schema and Step 7 self-validation checklist for the `engineering-manager.yaml` edit (tools/approved_tools subset rule, skills-exist rule, semver bump).
- The existing Conflict Resolution Sub-Flow in `skill/chunk-orchestration` Step 4 used as the direct structural precedent for the new Decision Hand-off Sub-Flow (numbered sub-steps, "Triggered by:" framing, explicit outcomes).
- `skill/plan-lifecycle`'s status vocabulary referenced (not re-defined) for how `Approved`/`Deferred` govern the hand-off decision's own gate.

---

## 8. Components

### `agents/engineering-manager.yaml` — Charter expansion

**File**: `agents/engineering-manager.yaml`
**Purpose**: Add Process-domain decision-authoring capability and the orchestration-time Hard Rule that consumes it, without altering EM's existing orchestration responsibilities or tool surface beyond the new skill references.

**Public Interface** (edits):

- `version`: `"0.4.0"` → `"0.5.0"`.
- `prompt` → Responsibilities: add — `- Author Process-domain ("PROC") decision records via skill/decision-triage -> skill/decision-record / skill/decision-brief, following the domain-ownership pattern established for AI-Engineer's Architecture/ AI-component split (AIF-PROC-001, formerly AIF-004)`
- `prompt` → Hard rules: add — `- When a dispatched subagent reports (via skill/decision-triage) that continuing requires a Tier A/B decision outside its own domain, or requires human approval before it can proceed, follow the Decision Hand-off Sub-Flow (skill/chunk-orchestration Step 4). If Engineering-Manager owns the domain (Process), author the decision directly via decision-triage -> decision-record/decision-brief. Otherwise dispatch the owning agent as a subagent to author it. Never resume a chunk past the decision point until it reaches Approved. Deferred never satisfies the gate.`
- `skills`: add `"skill/decision-triage"`, `"skill/decision-record"`, `"skill/decision-brief"` (existing `"skill/chunk-orchestration"` and `"skill/worktree-management"` entries unchanged).
- `tools` / `approved_tools`: **unchanged** — no entry added or removed. This is the explicit verification point for the Epic's non-negotiable (Section 10/12).

**Key Behaviour**:

- EM's existing orchestration Process (Steps 1–8) is not renumbered or restructured — the new decision-authoring capability is exposed only via the Responsibilities bullet and the Hard Rule, consistent with how it is a conditional sub-flow, not a core numbered step of every orchestration run.
- `blocked_commands` (`git *`, `gh *`) is unchanged — EM still never runs git directly; `decision-record`/`decision-brief`'s own commit steps (via `skill/plan-lifecycle`) use `ai-git` per the repo's git-workflow steering, same as every other artifact EM commits (plans, orchestration state).

**Dependencies**:

- `skill/decision-triage`, `skill/decision-record`, `skill/decision-brief` — referenced by name (chunks AIF-002-001/002/003, not modified here).
- `skill/chunk-orchestration` — modified in this same chunk (Component below).

### `skill/chunk-orchestration` `SKILL.md` — Decision Hand-off Sub-Flow

**File**: `skills/chunk-orchestration/SKILL.md`
**Purpose**: Implements the five-sub-step Decision Hand-off Sub-Flow under Step 4 (Handle Blocks), so that a subagent's `decision-triage` hand-off signal (domain, tier, owning agent, invoking agent, problem summary — per AIF-002-001's `reference/handoff-signal.md`) correctly blocks the chunk, gets a Draft decision authored, is presented to the human, and resumes the chunk only on `Approved`.

**Public Interface** (new subsection text, inserted after the existing Conflict Resolution Sub-Flow's step 6, before "Blocked chunks and wave progression"):

```
**Decision hand-off — Decision Hand-off Sub-Flow:**

Triggered by: a dispatched subagent reports, via `skill/decision-triage`, that
continuing requires a Tier A/B decision outside its own domain, or requires
human approval before it can proceed.

1. Update chunk status to `Blocked` with a structured `blocked_reason`
   (domain, tier, owning agent — from the `decision-triage` hand-off signal).
   Log: `decision_handoff_detected` with the domain, tier, and owning agent.
2. If Engineering-Manager itself owns the domain (Process), author the
   decision directly via `decision-triage` -> `decision-record`/
   `decision-brief`. Otherwise, dispatch the owning agent as a subagent to
   author it the same way. Log: `decision_authored` once the Draft decision is
   committed.
3. Present the Draft decision to the human alongside the existing
   blocked-chunk escalation. The decision's own `skill/plan-lifecycle` gate —
   not orchestration state — governs whether it becomes `Approved` or
   `Deferred`. Do not track a parallel approval state in the orchestration
   file.
4. Once the decision reaches `Approved`: reuse the existing generic "when
   human unblocks" behavior (see above) unchanged — chunk status `Blocked` ->
   `Ready`, `blocked_reason` cleared, escalation `resolved` set to true. Log:
   `chunk_unblocked` and `decision_handoff_resolved`. No new resume mechanic —
   the chunk's full pipeline (SE -> TE -> PE) redispatches from `Ready` exactly
   as any other unblock does.
5. If the decision is `Deferred` instead: the chunk remains `Blocked`.
   `Deferred` never satisfies the gate (per `skill/plan-lifecycle`) — do not
   clear `blocked_reason` or advance the chunk.
```

**Key Behaviour**:

- No new chunk `status` value and no new state-object field — reuses `Blocked`/`blocked_reason` exactly as the Conflict Resolution Sub-Flow does.
- The sub-flow does not itself gate on Tier — Tier A vs. Tier B only changes which skill (`decision-record` vs. `decision-brief`) sub-step 2 invokes; the orchestration-level mechanics (block, author, present, resume-on-Approved)
  are identical for both tiers.
- Sub-step 3 explicitly forbids inventing parallel approval tracking in `orchestration-state.json` — the decision artifact's own `Status` field (checked via `skill/plan-lifecycle`) is the single source of truth for whether the gate is satisfied.

**Dependencies**:

- `skill/decision-triage` — the signal source that triggers this sub-flow (chunk AIF-002-001, referenced by name only).
- `skill/decision-record` / `skill/decision-brief` — the skills EM or the dispatched owning agent runs in sub-step 2 (chunks AIF-002-002/003, referenced by name only).
- `skill/plan-lifecycle` — governs the decision artifact's own Approved/ Deferred gate, referenced not re-implemented.

### `skill/chunk-orchestration` `reference/state-schema.md` — New Log actions

**File**: `skills/chunk-orchestration/reference/state-schema.md`
**Purpose**: Documents the three new Log actions the Decision Hand-off Sub-Flow emits, added to the existing Log actions table (no other schema changes).

**Key Behaviour**:

- Table addition (inserted after the existing `chunk_unblocked` row, before `conflict_detected`, grouping all Blocked/unblock-related actions together):

| Action                      | Description                                                                                                                                                                                                  |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `decision_handoff_detected` | A dispatched subagent's `decision-triage` hand-off (cross-domain or approval-gated Tier A/B decision) was detected and the chunk was marked `Blocked`                                                        |
| `decision_authored`         | A Draft decision record (Tier A) or brief (Tier B) was authored and committed in response to a decision hand-off — either directly by Engineering-Manager (Process domain) or by the dispatched owning agent |
| `decision_handoff_resolved` | The hand-off decision reached `Approved` and the chunk was unblocked via the existing generic unblock mechanic                                                                                               |

- No change to the Chunk status values table, Status transitions diagram, or any state-object field definition — the scope note directly above the `## Rules` section already documents `blocked_reason` as `string | null`, which the hand-off's structured reason fits without a type change.

**Dependencies**:

- `skill/chunk-orchestration/SKILL.md`'s Decision Hand-off Sub-Flow (Component above, same chunk) — the sole emitter of these three actions.

---

## 9. Data Models

No new data models. This chunk reuses the existing `Chunk state object` and `Log entry object` shapes documented in `skills/chunk-orchestration/reference/state-schema.md` without modification — see Key Design Decision 6. The `blocked_reason` field (`string | null`) carries the structured domain/tier/owning-agent information as a formatted string, the same pattern already used for merge-conflict `blocked_reason` values (e.g. "Merge conflict requires human resolution on branch {branch}: {conflicting files}").

---

## 10. Security Requirements

> This section must never be empty.

This chunk produces documentation-only agent-config and skill content (`agents/engineering-manager.yaml`, `SKILL.md`, `reference/state-schema.md`) — no runtime code, no scripts, no execution path, no credential handling, and no network calls. The applicable security considerations are about the _access surface and design_ the configuration encodes:

- [x] **No `WebSearch`/`WebFetch` added to `agents/engineering-manager.yaml`.** Explicitly verified as an acceptance item (Section 4) — this is the Epic's non-negotiable (AIF-002 Section 8) and this chunk is the one that edits the file it applies to. Confirmed by diffing the final `tools:` and `approved_tools:` lists against the pre-edit file: both entries are unchanged from `agents/engineering-manager.yaml` v0.4.0 (`subagent`, `read`, `write`, `shell`, `grep`, `glob`, `@dag/dag-compute-waves`) — only the `skills:` field gains entries.
- [x] No secrets or credentials referenced anywhere in the edited content.
- [x] `blocked_commands` (`git *`, `gh *`) remains unchanged on `engineering-manager.yaml` — EM still never runs git/gh directly for any part of the new decision-authoring or hand-off capability; all commits flow through `ai-git` via `skill/plan-lifecycle`, same as every other artifact EM already commits.
- [x] The Decision Hand-off Sub-Flow never allows a chunk to resume past an unapproved Tier A/B decision — sub-step 5 explicitly keeps the chunk `Blocked` on `Deferred`, matching Epic AIF-002 Section 7's requirement that the approval gate be enforced identically here as everywhere else in `skill/plan-lifecycle`. This is called out as a security-relevant design property (not merely a workflow nicety), since the whole point of `plan-lifecycle`'s gate is that no dependent work proceeds on unapproved/deferred artifacts.
- [x] No PII or sensitive data is handled — the hand-off `blocked_reason` and log `details` fields are expected to contain only project/technical decision context (domain, tier, owning agent).

---

## 11. Logging Requirements

> This section must never be empty.

This chunk produces no runtime code, so there are no application log statements to write directly. Its actual deliverable, however, _is_ the specification of three new orchestration Log actions — documented here as the authoritative logging requirements for `skill/chunk-orchestration`'s Decision Hand-off Sub-Flow (implemented as prose steps that any agent following the skill executes, not as code):

| Event                       | Level                                                                                                      | What is logged                                                                                                                                      | What is NOT logged                                                                                 |
| --------------------------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `decision_handoff_detected` | Info (orchestration log — no severity levels in this schema, but semantically informational, not an error) | `chunk_id`, `agent` ("Engineering-Manager"), `details` including domain, tier, owning agent                                                         | No decision content itself — only the routing facts (domain/tier/owner)                            |
| `decision_authored`         | Info                                                                                                       | `chunk_id`, `agent`, `details` including which decision skill was used (`decision-record` or `decision-brief`) and the new Draft decision's ID/path | Full decision record content — the log references the artifact, it does not duplicate it           |
| `decision_handoff_resolved` | Info                                                                                                       | `chunk_id`, `agent`, `details` confirming the decision reached `Approved` and the chunk was unblocked                                               | Nothing — logged alongside `chunk_unblocked` per Key Design Decision 4, no separate sensitive data |

Per engineering steering Rule 3 ("Logging Requirements Are Never Optional"), these three log actions are mandatory Steps in the Decision Hand-off Sub-Flow, not optional or deferrable — verified as present in Section 8's `SKILL.md` Component text and as acceptance items in Section 4.

---

## 12. Testing Plan

This chunk has no executable code, so "testing" here means structural/ cross-reference self-validation, per `skill/agent-authoring` Step 7 and `skill/skill-authoring` Step 7's checklists.

### `agents/engineering-manager.yaml` Tests

| Test ID | Description                                                                                                                                                                                            | Type                     | Pass Criteria                                                          |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------ | ---------------------------------------------------------------------- |
| EM-T01  | `tools` and `approved_tools` lists are byte-identical to the pre-edit v0.4.0 file                                                                                                                      | Structural (diff)        | No entries added or removed; `web_search`/`web_fetch` absent from both |
| EM-T02  | `skills` field includes `skill/decision-triage`, `skill/decision-record`, `skill/decision-brief` in addition to the two pre-existing entries                                                           | Structural               | All five entries present                                               |
| EM-T03  | Every entry in `skills` resolves to an existing folder under `skills/` (or a Wave 1 sibling chunk's planned folder name, confirmed against `chunks.json`, per the same allowance used in AIF-002-001)  | Structural               | All entries resolve                                                    |
| EM-T04  | `version` is valid semver and incremented from `0.4.0` to `0.5.0`                                                                                                                                      | Structural               | Semver valid, bumped                                                   |
| EM-T05  | New Hard Rule text references `skill/chunk-orchestration`'s Decision Hand-off Sub-Flow by name and states both invariants (never resume past unapproved decision; `Deferred` never satisfies the gate) | Structural (manual read) | Both invariants present in prose                                       |
| EM-T06  | `blocked_commands` unchanged (`git *`, `gh *`)                                                                                                                                                         | Structural (diff)        | No change                                                              |

### `skill/chunk-orchestration` Tests

| Test ID | Description                                                                                                                                                                                                                                       | Type                         | Pass Criteria                                     |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------- |
| CO-T01  | Decision Hand-off Sub-Flow is present under Step 4, structurally parallel to the Conflict Resolution Sub-Flow (numbered sub-steps, "Triggered by:" framing)                                                                                       | Structural                   | Present, correctly placed                         |
| CO-T02  | Sub-flow implements all five sub-steps from Epic AIF-002 Section 4, matched 1:1 against the epic text                                                                                                                                             | Structural (manual diff)     | All five present, no omissions or additions       |
| CO-T03  | No new chunk `status` value referenced anywhere in the new sub-flow text; only `Blocked`/`Ready` (existing values) are used                                                                                                                       | Structural                   | Confirmed by read-through                         |
| CO-T04  | Sub-flow text references `decision-triage`, `decision-record`, `decision-brief`, and `plan-lifecycle` by name, without duplicating their internal Steps                                                                                           | Structural                   | Names present; no duplicated internal logic       |
| CO-T05  | `reference/state-schema.md`'s Log actions table gains exactly three new rows (`decision_handoff_detected`, `decision_authored`, `decision_handoff_resolved`) and no other schema tables change                                                    | Structural (diff)            | Exactly three rows added; no other table modified |
| CO-T06  | `SKILL.md`'s Decision Hand-off Sub-Flow log actions (`decision_handoff_detected`, `decision_authored`, `decision_handoff_resolved`, plus reused `chunk_unblocked`) exactly match the three new rows added to `state-schema.md` in this same chunk | Structural (cross-file diff) | Names match exactly across both files             |

---

## 13. Documentation Requirements

- [x] `agents/engineering-manager.yaml` and `skills/chunk-orchestration/SKILL.md` are themselves the documentation for these components — no separate README needed (agents and skills are self-documenting per `skill/agent-authoring`/`skill/skill-authoring`).
- [ ] File header / Plan ID reference — a brief comment noting "Authored under AIF-002-006" is added near the edited sections of `SKILL.md` and `state-schema.md` where practical, per engineering steering Rule 2 (every artifact must reference its Plan ID). `engineering-manager.yaml` has no comment convention established in the existing file (YAML frontmatter has no header-comment precedent in this repo's other agent files) — Plan ID traceability for this file is carried by this Chunk Plan and the commit message instead, consistent with how AIF-002-001 handled the equivalent case for a config-shaped file with no comment convention.
- [ ] No CHANGELOG entry from this chunk alone — Epic AIF-002's own Work Log and the Epic-level CHANGELOG entry (Acceptance Criteria item, confirmed at Epic-implementation time) cover the Epic as a whole; individual Wave 1 chunks do not each add a separate CHANGELOG line.

---

## 14. Risks & Open Questions

| #   | Risk / Question                                                                                                                                                                                                                                                                                                                                                          | Impact | Mitigation                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | This chunk references `skill/decision-triage`, `skill/decision-record`, and `skill/decision-brief` by name before those Wave 1 sibling chunks (001/002/003) have landed — if any of them lands with a materially different name or Steps shape than assumed here, the Hard Rule / Responsibilities text and the Sub-Flow's dispatch language could need a follow-up edit | L      | Names (`decision-triage`, `decision-brief`) were explicitly confirmed by the human in Epic AIF-002's Work Log before decomposition (Open Question 1), and `decision-record`'s name is unchanged from its current form — low risk of drift. This chunk has no `depends_on` on 001/002/003 in `chunks.json` (Wave 1, fully parallel), consistent with the Epic's own parallelization notes accepting this risk as acceptable. |
| 2   | `blocked_reason` remains an untyped string carrying structured domain/tier/owning-agent facts, rather than a proper structured field — a future chunk parsing `blocked_reason` programmatically (e.g. for a dashboard) would need to parse free text                                                                                                                     | L      | Explicitly the Epic's own design choice (Section 5 sub-step 1, state-schema scope note: "No new chunk status value or state-object field is needed"). Out of this chunk's authority to change; flagged here for visibility only, not a defect of this chunk's implementation.                                                                                                                                               |
| 3   | The Hard Rule text summarizes the sub-flow rather than reproducing all five sub-steps verbatim in the agent prompt (Key Design Decision 3) — a future reader of only `engineering-manager.yaml` (without also reading `skill/chunk-orchestration`) gets a partial picture                                                                                                | L      | Matches the agent's existing style for the Conflict Resolution rules (also summarized, not reproduced in full). Accepted as consistent with precedent; the full procedure is always one skill-reference away.                                                                                                                                                                                                               |

---

## 15. Work Log

[2026-08-14] [AI-Engineer] [Created] [AIF-002-006] [Self-planned Chunk 006 of Epic AIF-002 per AIF-PROC-002 (AI-track chunks self-planned by the assigned agent). Assessed Tier 2 (Standard) per `skill/complexity-tiers`: multi-file change (agent config + skill body + skill reference) modifying an existing, already-established pattern (Conflict Resolution Sub-Flow's shape for the new Decision Hand-off Sub-Flow; AIF-PROC-001/AIF-004's domain-split precedent for the charter expansion) — no new schema, no new chunk status value, no new state-object field. Read Epic AIF-002 Sections 4, 5, 6, 7, and 8 in full, `chunks.json`, the current `agents/engineering-manager.yaml` (v0.4.0), `skills/chunk-orchestration/SKILL.md` and `reference/state-schema.md`, AIF-004 (soon `AIF-PROC-001`) as the domain-split precedent, and AIF-META-001 (Approved) for the Process-domain ownership assignment, promotion threshold, and the explicit "no WebSearch/WebFetch" non-negotiable. Checked for `knowledge/index.json` and `docs/index.json` — neither exists in this repo yet, so no knowledge-consumption step applied. Checked `.aiconfig.json` standards tags (`javascript`, `node`, `all: []`) — none apply, since this chunk produces no runtime code; noted explicitly in Section 1. Confirmed `skills/decision-triage/` does not yet exist (Wave 1 sibling chunk AIF-002-001, not yet landed) — referenced by name only per the no-file-dependency pattern AIF-002-001 itself already established for forward references. Wrote full Chunk Plan per `skill/chunk-planning`'s template, matching AIF-002-001's established formatting conventions for consistency across the Epic's chunk set. Security section (8) explicitly states the no-WebSearch/WebFetch verification as a required acceptance item per this chunk's hard constraint. Saving as `Status: Draft` and committing per `skill/plan-lifecycle` Step 1 before presenting for human review — no implementation begins until `Status: Approved` is committed.]
[2026-08-17 00:00] [Jeremy] [Approved] [AIF-002-006] [Reviewed and approved manually by Jeremy. Status set to `Approved`, `Reviewed By: Jeremy`.]
[2026-08-18] [AI-Engineer] [Revised] [AIF-002-006] [Migrated this Chunk Plan to the reordered template structure approved for skill/chunk-planning: Quick Summary (new Section 3, open-item count derived from the existing Risks & Open Questions table) and Acceptance Criteria (moved from Section 12 to Section 4) now sit immediately after the Goal; all other sections renumbered accordingly (mapping: 3->5, 4->6, 5->7, 6->8, 7->9, 8->10, 9->11, 10->12, 11->13, 13->14, 14->15). Every inline "Section N" cross-reference in this file, including references into the AIF-002 Epic Plan's own renumbered sections, was remapped to match. No wording, decisions, criteria, or risk content was changed - purely structural, per human direction (no active work on these plans at the time of migration).]
