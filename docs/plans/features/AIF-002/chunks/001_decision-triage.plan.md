# Chunk Plan: skill/decision-triage — Tier/Domain Triage + Dispatch

## 1. Metadata

| Field          | Value                                                                                                                                                                                                                                                |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plan ID        | AIF-002-001                                                                                                                                                                                                                                          |
| Parent Epic    | AIF-002                                                                                                                                                                                                                                              |
| Chunk          | 1 of 15                                                                                                                                                                                                                                              |
| Depends On     | None                                                                                                                                                                                                                                                 |
| Can Parallel   | AIF-002-002, AIF-002-003, AIF-002-004, AIF-002-005, AIF-002-006, AIF-002-007, AIF-002-008, AIF-002-009 (Wave 1 siblings, per`docs/plans/chunks/AIF-002/chunks.json`)                                                                                 |
| Project        | ai-foundation                                                                                                                                                                                                                                        |
| Status         | Approved                                                                                                                                                                                                                                             |
| Author (Agent) | AI-Engineer                                                                                                                                                                                                                                          |
| Reviewed By    | Jeremy                                                                                                                                                                                                                                               |
| Created        | 2026-08-14                                                                                                                                                                                                                                           |
| Last Updated   | 2026-08-14                                                                                                                                                                                                                                           |
| Standards      | None apply — this chunk produces only declarative skill content (`SKILL.md` + `reference/`), governed by AGENTS.md schemas and `skill/skill-authoring`, not by the project's `javascript`/`node` engineering standards (no runtime code is produced) |

---

## 2. Goal

Author `skills/decision-triage/` as the single entry point every agent uses when it identifies it needs to record a decision: it applies AIF-META-001's promotion threshold to select a Tier (A/B/C), determines Domain per the ownership table for Tier A/B, checks the invoking agent against the domain owner, and dispatches to `skill/decision-record` (Tier A), `skill/decision-brief` (Tier B), or the Tier C inline-recording convention — never writing a decision artifact itself.

---

## 3. Quick Summary

**Open Items:** 3 open (0 High / 1 Medium / 2 Low) — see Section 14

---

## 4. Acceptance Criteria

- [ ] `skills/decision-triage/SKILL.md` exists, passes `skill/skill-authoring` Step 7's self-validation checklist
- [ ] `SKILL.md` Steps correctly apply the AIF-META-001 promotion threshold to select Tier A/B/C
- [ ] `SKILL.md` Steps correctly determine Domain (Tier A/B only) per the AIF-META-001 ownership table
- [ ] `SKILL.md` Steps 4-5 implement the invoking-agent-vs-domain-owner check and dispatch to the correct target (`decision-record`, `decision-brief`, or the Tier C convention) with no artifact written by `decision-triage` itself
- [ ] `reference/tier-and-domain.md` accurately reproduces AIF-META-001's promotion threshold and Domain table, with an explicit source-of-truth note
- [ ] `reference/handoff-signal.md` defines the hand-off signal fields (`domain`, `tier`, `owning_agent`, `invoking_agent`, `problem_summary`) and documents both the orchestrated and standalone consumption contexts
- [ ] All Section 12 tests pass (structural self-validation)
- [ ] Security checklist (Section 10) fully satisfied
- [ ] Logging requirements (Section 11) — confirmed no runtime code; hand-off signal field names verified stable against Epic AIF-002 Section 4's description for the future `chunk-orchestration` consumer
- [ ] Documentation checklist (Section 13) fully satisfied
- [ ] Review approved with no CRITICAL or HIGH findings
- [ ] No agent gains `WebSearch`/`WebFetch` as a result of this chunk (Epic AIF-002 Section 7 non-negotiable — trivially satisfied, verified explicitly)

---

## 5. Scope

### In Scope

- New skill `skills/decision-triage/` with `SKILL.md` (five required sections per `skill/skill-authoring`: Purpose, Inputs, Steps, Outputs, Edge Cases).
- `reference/tier-and-domain.md` — the promotion threshold (Tier A/B/C selection logic) and the Domain ownership table, both sourced from AIF-META-001's `Design` section, reproduced here for at-a-glance use during triage and explicitly marked as derived from AIF-META-001 (not a second source of truth — AIF-META-001 remains authoritative; this file is kept in sync with it by whichever chunk next touches either).
- `reference/handoff-signal.md` — the structured "Decision Hand-off" signal format this chunk designs (per Epic AIF-002 Section 5, Open Question 4 resolution: exact hand-off mechanics deferred to this chunk). Defines the fields an agent surfaces when the invoking agent does not match the domain owner: `domain`, `tier`, `owning_agent`, `invoking_agent`, `problem_summary`. Documents the two contexts this signal is consumed in: (a) orchestrated — surfaced to `skill/chunk-orchestration`'s Decision Hand-off Sub-Flow (authored separately in chunk AIF-002-006, out of this chunk's scope — this chunk only defines the signal shape those consumers rely on); (b) standalone — the invoking agent reports the same fields directly to the human.
- Dispatch logic in `SKILL.md` Steps: Tier A → `skill/decision-record`, Tier B → `skill/decision-brief`, Tier C → no dispatch, points to the Tier C inline convention documented in `skill/chunk-planning`/`skill/epic-planning` (that convention's own documentation is chunk AIF-002-005's scope, not this one's — this chunk only points to it by name).

### Out of Scope

- Any change to `skills/decision-record/` or creation of `skills/decision-brief/` (Tier A/B scoping and the Tier B skill itself — chunks AIF-002-002 and AIF-002-003).
- Documenting the Tier C inline convention inside `skill/chunk-planning`/ `skill/epic-planning` templates (chunk AIF-002-005).
- Implementing `skill/chunk-orchestration`'s Decision Hand-off Sub-Flow or the `agents/engineering-manager.yaml` charter/Hard Rule expansion that consumes this chunk's hand-off signal (chunk AIF-002-006). This chunk defines the signal shape only; it does not implement the orchestration-side consumer.
- Any tooling-level enforcement that blocks an agent outside a domain's ownership from authoring a Tier A/B decision — per Epic AIF-002 Section 5 Error States, this is a documented convention, not a hard gate, and no enforcement mechanism is specified anywhere in this Epic.
- `{paths.decisions}/index.json` creation/backfill (chunk AIF-002-014) and its validation tooling (chunk AIF-002-015) — `decision-triage` never touches the index itself; only `decision-record`/`decision-brief` do.

---

## 6. Prerequisites

- [x] AIF-META-001 (Decision Record: Tiering, Domain Ownership, Interconnectivity)
      is `Approved` — governs the Tier promotion threshold and Domain ownership table this skill implements.
- [x] Epic AIF-002 is `Approved` and decomposed (`chunks.json`, Wave 1, no dependencies for this chunk).
- [x] `skill/skill-authoring` and `skill/plan-lifecycle` exist and define the folder structure, required sections, and commit-gate procedure this chunk follows.
- [x] No dependency on any sibling Wave 1 chunk's output — this chunk references `skill/decision-record`, `skill/decision-brief`, and the Tier C convention by _name_ only, not by reading their finalized content, so it can be authored in parallel with AIF-002-002/003/005 without a file-level dependency.

---

## 7. Architecture & Design

### Project Structure Changes

```
skills/decision-triage/          ← NEW
├── SKILL.md                     ← NEW — entry point, Steps 1-5 below
└── reference/
    ├── tier-and-domain.md       ← NEW — promotion threshold + domain table (sourced from AIF-META-001)
    └── handoff-signal.md        ← NEW — structured hand-off signal format (this chunk's design)
```

No `assets/` or `scripts/` subfolder — nothing in this skill is copied into an output artifact (the skills it dispatches to own their own templates/assets), and Tier/Domain selection requires judgment (genuine trade-off assessment, plausible future citation), not a deterministic, scriptable check — so per `skill/skill-authoring`'s Edge Cases guidance, this stays a prose-driven skill.

### Key Design Decisions

1. **Decision**: `decision-triage` never writes a decision artifact itself — it only selects Tier/Domain and either dispatches to `decision-record`/ `decision-brief` or points back to the Tier C convention.
   **Rationale**: Matches Epic AIF-002 Section 5 (Data Flow) exactly and keeps a clean separation of concerns: triage decides _what kind_ of record is needed, the target skill decides _how_ to produce it. Avoids duplicating `plan-lifecycle` gating logic inside `decision-triage`.
2. **Decision**: The Domain ownership table and promotion threshold are reproduced in `reference/tier-and-domain.md` rather than requiring every invocation to re-read the full AIF-META-001 record.
   **Rationale**: AIF-META-001 is a full options-exploration Decision Record (Tier A shape) with substantial narrative content around the Design section this skill actually needs operationally. A trimmed, purpose-built reference file is faster to consult during triage and matches the existing pattern of `skill/decision-record/reference/template.md` being a distinct, focused file from the decision that motivated the skill. The file explicitly cites AIF-META-001 as the source of truth so a future edit to the table only needs to flow one direction (AIF-META-001 is Approved and stable; this chunk does not plan to further revise it).
3. **Decision**: The cross-domain hand-off is a structured signal (`domain`, `tier`, `owning_agent`, `invoking_agent`, `problem_summary`) rather than free prose, even though this chunk does not implement anything that parses it yet.
   **Rationale**: Epic AIF-002 Section 5 (Open Question 4 resolution) explicitly defers "exact hand-off mechanics" to this chunk, and Section 5 already commits a downstream chunk (AIF-002-006) to building a Decision Hand-off Sub-Flow in `skill/chunk-orchestration` that acts on this signal ("chunk is Blocked" with a "structured `blocked_reason` (domain, tier, owning agent)"). Defining the fields now, even before the consumer exists, avoids AIF-002-006 having to invent (and potentially diverge from) a hand-off shape under time pressure while also modifying two other files. A human-readable standalone-report path (fields presented as plain text to the human) is documented alongside the structured version so the same signal serves both consumption contexts without two separate designs.
4. **Decision**: Domain-mismatch handling stops and reports rather than silently proceeding to author outside the agent's own domain.
   **Rationale**: Directly implements Epic AIF-002 Section 5's resolved Open Question 4 ("stop and report if mismatched") and Section 6's Error States table ("An agent outside a domain's ownership attempts to author a Tier A/B decision in that domain" → "Not blocked at a tooling level... documented convention"). `decision-triage` is the one and only place this check happens; it is a convention enforced by the skill's own Steps, not a script-level gate, consistent with the Epic's explicit statement that no enforcement mechanism is specified.
5. **Decision**: Ambiguous domain classification does not block triage.
   **Rationale**: Directly implements Epic AIF-002 Section 5's Error States row for "A decision doesn't clearly belong to exactly one domain" — select the closest match, note the ambiguity in the eventual record's `Design`/`Impact on Planning` section (an instruction passed through to `decision-record`/ `decision-brief`, not something `decision-triage` itself writes), and only escalate to the human if the ambiguity is severe enough to genuinely affect who should author it (global Rule 2).

### Patterns & Conventions Applied

- `skill/skill-authoring`'s folder structure and five-section `SKILL.md` template.
- `skill/decision-record`'s existing `SKILL.md` shape (Purpose/Inputs/Steps/ Outputs/Edge Cases prose style) used as the direct precedent for tone and section granularity.
- `skill/plan-lifecycle`'s status vocabulary referenced (not re-defined) for how the artifacts `decision-triage` dispatches to are gated.

---

## 8. Components

### `decision-triage` SKILL.md — Entry-point procedure

**File**: `skills/decision-triage/SKILL.md`
**Purpose**: Defines the ordered procedure an agent follows to classify a decision by Tier and Domain and route it to the correct producing skill (or the Tier C convention), including the cross-domain hand-off check.

**Public Interface** (Steps, in order):

1. **Gather decision context** — problem being decided, the plan/chunk it arose in, the invoking agent's identity.
2. **Apply the promotion threshold** (per `reference/tier-and-domain.md`, sourced from AIF-META-001 Design section) to select Tier A, B, or C. Tier C is the default absent a genuine trade-off or a plausible independent future citation.
3. **For Tier A/B only, determine Domain** using the ownership table in `reference/tier-and-domain.md`. If ambiguous, select the closest match and flag the ambiguity for the target skill to note (see Key Design Decision 5); escalate to the human only if materially unclear who should author it.
4. **Check invoking agent against the domain owner.** If they match, continue to Step 5. If they do not match, do not dispatch — produce the hand-off signal described in `reference/handoff-signal.md` and stop (see Key Design Decision 4).
5. **Dispatch:**
   - Tier A + owner match → invoke `skill/decision-record`.
   - Tier B + owner match → invoke `skill/decision-brief`.
   - Tier C → no dispatch; point the agent to the Tier C inline-recording convention documented in `skill/chunk-planning`/`skill/epic-planning`.

**Key Behaviour**:

- Never writes a decision artifact and never touches `{paths.decisions}/index.json` itself — those are the dispatched skill's responsibility.
- Runs identically whether invoked interactively by a single agent or as part of an orchestrated chunk — the difference is only in how the hand-off signal (Step 4) gets surfaced onward (see Edge Cases).

**Dependencies**:

- `skill/decision-record` — dispatch target for Tier A.
- `skill/decision-brief` — dispatch target for Tier B (authored in AIF-002-003; referenced here by name only).
- `skill/chunk-planning` / `skill/epic-planning` — dispatch target (by reference, not invocation) for Tier C.

### `reference/tier-and-domain.md` — Promotion threshold + Domain table

**File**: `skills/decision-triage/reference/tier-and-domain.md`
**Purpose**: Fast-reference copy of AIF-META-001's Tier promotion threshold and Domain ownership table, explicitly marked as derived from AIF-META-001 (source of truth) rather than a competing definition.

**Key Behaviour**:

- Reproduces the 4-step promotion threshold verbatim from AIF-META-001's Design section.
- Reproduces the Domain table (Domain, Code, Owner, Template guidance, `knowledge/index.json`?) verbatim from AIF-META-001's Design section.
- Carries a visible header note: "Source of truth: AIF-META-001. If this file and AIF-META-001 ever disagree, AIF-META-001 governs — file an update here to resync."

### `reference/handoff-signal.md` — Decision Hand-off signal format

**File**: `skills/decision-triage/reference/handoff-signal.md`
**Purpose**: Defines the structured signal an agent produces when Step 4 detects a domain-owner mismatch, and how it is consumed in orchestrated vs. standalone contexts.

**Key Behaviour**:

- Structured fields: `domain` (Domain code, e.g. `PROC`), `tier` (`A` or `B`), `owning_agent` (agent name from the Domain table), `invoking_agent` (agent that called `decision-triage`), `problem_summary` (one to two sentences).
- **Orchestrated context**: this signal is exactly what `skill/chunk-orchestration` (AIF-002-006, not this chunk) reads to populate a chunk's structured `blocked_reason` (domain, tier, owning agent) per Epic AIF-002 Section 4's Decision Hand-off Sub-Flow description. This file documents the signal shape as a contract other chunks build against; it does not implement the sub-flow.
- **Standalone context**: an agent running outside orchestration (e.g. a human working directly with a single agent) presents the same fields as a plain-text stop-and-report message to the human, per Epic AIF-002 Section 5's Data Flow and Open Question 4 resolution ("stop and report if mismatched").

---

## 9. Data Models

### Decision Hand-off Signal

**Purpose**: The structured payload `decision-triage` produces on a domain-owner mismatch (Key Design Decision 3). Consumed by chunk AIF-002-006's Decision Hand-off Sub-Flow when orchestrated, or presented directly to the human otherwise.
This is a documented shape for other skills/prose to follow — not a JSON Schema enforced by any script, since this skill has no `scripts/` (see Section 7).

| Field             | Type                                           | Required | Notes                                                                                                                    |
| ----------------- | ---------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------ |
| `domain`          | string (Domain code, e.g.`PROC`, `ARCH`)       | Yes      | From the AIF-META-001 Domain table                                                                                       |
| `tier`            | string (`A` or `B`)                            | Yes      | Tier C never reaches this signal — no domain check applies to Tier C                                                     |
| `owning_agent`    | string (agent name, e.g.`Engineering-Manager`) | Yes      | From the AIF-META-001 Domain table                                                                                       |
| `invoking_agent`  | string (agent name)                            | Yes      | The agent that invoked`decision-triage`                                                                                  |
| `problem_summary` | string                                         | Yes      | One to two sentences — enough for the domain owner or human to understand what decision is needed without re-deriving it |

---

## 10. Security Requirements

> This section must never be empty.

This chunk produces documentation-only skill content (`SKILL.md` + `reference/` markdown files) — no runtime code, no scripts, no execution path, no credential handling, and no network calls. The applicable security considerations are therefore about the _design_ the documentation encodes, not code-level hardening:

- [x] No new attack surface — no code execution, no `scripts/` folder (per Section 7, deterministic-vs-judgment analysis), no network-facing behavior.
- [x] No secrets or credentials referenced anywhere in the skill content.
- [x] `decision-triage` does not grant, reference, or imply any change to tool access for any agent — it is pure routing logic. In particular, it does not add `WebSearch`/`WebFetch` to any agent, consistent with AIF-META-001's Resolved Item 6 and Epic AIF-002 Section 7's non-negotiable.
- [x] The cross-domain hand-off check (Step 4) is a documented convention, not an enforcement mechanism — this is a deliberate, Epic-confirmed choice (Section 6 Error States), not a gap this chunk silently introduces. It is called out here so it is not mistaken for a security control it isn't.
- [x] No PII or sensitive data is handled — `problem_summary` in the hand-off signal is expected to contain only project/technical decision context.

---

## 11. Logging Requirements

> This section must never be empty.

This chunk produces no runtime code, so there are no application log statements to define here. The relevant logging is defined and implemented elsewhere:

| Event                               | Level | What is logged | What is NOT logged |
| ----------------------------------- | ----- | -------------- | ------------------ |
| N/A — no runtime code in this chunk | —     | —              | —                  |

The three log actions that consume this chunk's hand-off signal (`decision_handoff_detected`, `decision_authored`, `decision_handoff_resolved`) are defined in `skill/chunk-orchestration/reference/state-schema.md`, which is chunk AIF-002-006's scope, not this chunk's. This chunk's only obligation toward that future logging is that `reference/handoff-signal.md`'s field names (`domain`, `tier`, `owning_agent`) are stable and match what Epic AIF-002 Section 4 already describes those log entries carrying — verified in Section 4 below.

---

## 12. Testing Plan

This chunk has no executable code (no `scripts/`), so "testing" here means structural/cross-reference self-validation rather than unit tests, per `skill/skill-authoring` Step 7's checklist.

### `decision-triage` Skill Tests

| Test ID | Description                                                                                                                                                                                                                                                                    | Type                     | Pass Criteria                                                |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------ | ------------------------------------------------------------ |
| DT-T01  | `SKILL.md` frontmatter has `name`, `version`, `description`; `name` is kebab-case and matches folder name; `version` is valid semver                                                                                                                                           | Structural               | All fields present and well-formed                           |
| DT-T02  | `SKILL.md` has all five required sections (Purpose, Inputs, Steps, Outputs, Edge Cases) in order                                                                                                                                                                               | Structural               | All five present, correctly ordered                          |
| DT-T03  | `SKILL.md` Steps reference `skill/decision-record` and `skill/decision-brief` by name and do not embed their internal logic                                                                                                                                                    | Structural               | Names present; no duplicated Steps content from either skill |
| DT-T04  | `reference/tier-and-domain.md` promotion threshold and Domain table match AIF-META-001's Design section content                                                                                                                                                                | Structural (manual diff) | No divergence; source-of-truth note present                  |
| DT-T05  | `reference/handoff-signal.md` field list matches what Epic AIF-002 Section 4 describes the Decision Hand-off Sub-Flow's `blocked_reason` needing (domain, tier, owning agent)                                                                                                  | Structural (manual diff) | Fields present and named consistently                        |
| DT-T06  | Skill is self-contained — no hardcoded reference to a single specific agent's identity in`SKILL.md` prose (agent names appear only inside the Domain table, as data)                                                                                                           | Structural               | Confirmed by read-through                                    |
| DT-T07  | Cross-reference check — every skill named in`SKILL.md` (`decision-record`, `decision-brief`, `chunk-planning`, `epic-planning`) exists (or is a sibling Wave 1 chunk not yet landed, in which case its target folder name is confirmed against `chunks.json`, not its content) | Structural               | All named skills resolve to a real or planned folder         |

---

## 13. Documentation Requirements

- [x] `SKILL.md` itself _is_ the documentation for this component — no separate README needed (skills are self-documenting per `skill/skill-authoring`).
- [ ] File header / Plan ID reference — `SKILL.md` and both `reference/` files will note "Authored under AIF-002-001" in a brief comment or footer line, per engineering steering Rule 2 (every artifact must reference its Plan ID).
- [ ] No CHANGELOG entry from this chunk alone — Epic AIF-002's own Work Log and the Epic-level CHANGELOG entry (Acceptance Criteria item, confirmed at Epic-implementation time) cover the Epic as a whole; individual Wave 1 chunks do not each add a separate CHANGELOG line.

---

## 14. Risks & Open Questions

| #   | Risk / Question                                                                                                                                                                                                                                                                  | Impact | Mitigation                                                                                                                                                                                                                                    |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `reference/tier-and-domain.md` duplicates content from AIF-META-001 — risk of drift if AIF-META-001 is ever superseded or amended                                                                                                                                                | M      | Explicit source-of-truth note directs future editors back to AIF-META-001; since AIF-META-001 is`Approved` and this Epic does not plan to revise it further, near-term drift risk is low. Flagged, not blocking.                              |
| 2   | The hand-off signal format (Section 9) is designed here but has no consumer until AIF-002-006 lands — if AIF-002-006 finds the shape insufficient once it designs the actual Decision Hand-off Sub-Flow, this chunk's`reference/handoff-signal.md` may need a follow-up revision | L      | Acceptable per dependency graph — AIF-002-006 has no`depends_on` this chunk (both are Wave 1, parallel, no file dependency), so it is free to request a revision to this file if needed. Not a blocking risk for this chunk's own completion. |
| 3   | Domain-mismatch handling is a documented convention only, not enforced by tooling (Key Design Decision 4) — an agent could, in practice, ignore Step 4 and self-author outside its domain                                                                                        | L      | Explicitly accepted by the Epic (Section 6 Error States: "not blocked at a tooling level... deviations are caught in review"). No mitigation needed beyond what this chunk already documents.                                                 |

---

## 15. Work Log

[2026-08-14] [AI-Engineer] [Created] [AIF-002-001] [Self-planned Chunk 001 of Epic AIF-002 per AIF-PROC-002 (AI-track chunks self-planned by the assigned agent). Assessed Tier 2 (Standard) per `skill/complexity-tiers`: new skill following the established `skill/skill-authoring` pattern and closely mirroring `skill/decision-record`'s existing shape; the one genuinely novel piece of design — the cross-domain hand-off signal format — was explicitly deferred to this chunk by Epic AIF-002's resolution of Open Question 4, but is bounded in scope (five named fields, two consumption contexts) rather than an open-ended architectural question, so it does not rise to Tier 3. Read AIF-META-001 (Approved) in full for the promotion threshold and Domain ownership table this skill implements. Checked for `knowledge/index.json` — none exists in this repo yet, so no knowledge-consumption step applied. Checked `.aiconfig.json` standards tags (`javascript`, `node`, `all: []`) — none apply, since this chunk produces no runtime code; noted explicitly in Section 1. Wrote full Chunk Plan per `skill/chunk-planning`'s template. Saving as `Status: Draft` and committing per `skill/plan-lifecycle` Step 1 before presenting for human review — no implementation begins until `Status: Approved` is committed.]
[2026-08-16 11:18] [Jeremy] [Approved] [AIF-002-001] [Reviewed and approved manually by Jeremy. Status set to `Approved`, `Reviewed By: Jeremy`, committed as part of "Approved AIF-002 chunk plan 01 to 04" (commit `bbd6a1e`). This Work Log entry added retroactively by Engineering-Manager on 2026-08-17 to close a traceability gap — the original approval commit updated the Metadata table but did not append a corresponding Work Log entry, per engineering steering Rule 3 (logging requirements are never optional).]
[2026-08-18] [AI-Engineer] [Revised] [AIF-002-001] [Migrated this Chunk Plan to the reordered template structure approved for skill/chunk-planning: Quick Summary (new Section 3, open-item count derived from the existing Risks & Open Questions table) and Acceptance Criteria (moved from Section 12 to Section 4) now sit immediately after the Goal; all other sections renumbered accordingly (mapping: 3->5, 4->6, 5->7, 6->8, 7->9, 8->10, 9->11, 10->12, 11->13, 13->14, 14->15). Every inline "Section N" cross-reference in this file, including references into the AIF-002 Epic Plan's own renumbered sections, was remapped to match. No wording, decisions, criteria, or risk content was changed - purely structural, per human direction (no active work on these plans at the time of migration).]
