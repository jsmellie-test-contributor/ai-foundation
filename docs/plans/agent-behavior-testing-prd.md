# PRD: Agent Behavior Testing

## Metadata

| Field          | Value                              |
| -------------- | ---------------------------------- |
| Status         | Draft                              |
| Author (Agent) | Claude Code                        |
| Approved By    | Pending                            |
| Created        | 2026-09-27                         |
| Scope          | v1 (Tier 1 only — see Scope below) |

---

## Problem Statement

`tests/unit`, `tests/integration`, and `tests/validation` check that agent/skill/steering _files_ are well-formed — schema conformance, cross-references, bundle resolution. Nothing checks that dispatching a real agent on a real task actually produces the behavior those files describe. A manual validation pass (`docs/plans/process-model-test-plan.md`) proved this gap is real: dispatching Architect on a genuine decision produced an ADR that blew its own 150-350 word budget by 5-6x and included literal code, directly violating an existing Hard rule (`agents/architect.yaml`: "Never write code, pseudocode, or method signatures") — a defect no existing automated check would have caught, because nothing checks agent _output_ against behavioral rules, only file schema.

That same validation pass also showed which parts of the problem need which kind of test. Of its ~6 real findings, 5 were environment/harness gaps (nested subagent dispatch unavailable to a subagent-run agent, GitHub self-approval blocked for a single bot identity, missing `gh` CLI, `ai-git`'s secrets wrapper needing infra this sandbox lacked, CI concurrency-cancellation) — all of them only surfaced because a full real multi-agent pipeline ran against real GitHub infrastructure. The one real _process-model_ defect (the ADR word-budget/no-code violation) needed none of that — it's checkable by handing one agent a plausible input and grading its output, no other agents, no GitHub, no CI involved. Running the full expensive pipeline to surface it was overkill; a cheap, targeted, repeatable check would have caught it just as reliably, on demand, every time.

## Goal

Build a reusable, growable automated test category — **agent-behavior tests** — that dispatches one real agent against a constructed fixture (mocking the hand-off it would normally receive from an upstream agent or a human) and grades its output against explicit, repo-specific rules. This should be to agent _behavior_ what `tests/validation` already is to file _schema_: cheap enough to run often, precise enough to target a specific rule on demand, and structured to grow every time a new steering rule or skill capability is added — the same way `tests/validation/terminology-sweep.test.js` grew out of check 25 of the process-model migration.

Long-term intent (not this document's scope — see Non-Goals): this is the first tier of what should eventually be a full integration/E2E category for AI components, covering multi-agent hand-offs and full real-pipeline runs as later tiers.

## Scope

**In scope (v1 / MVP): Tier 1 only.** A single real agent, dispatched once, against a fixture that stands in for whatever it would normally receive from an upstream agent or human — no other agents involved, no GitHub, no CI. Local-only execution.

**Explicitly out of scope for this document:**

- **Tier 2 — pairwise/chain integration**: two real adjacent agents actually handed off to each other, validating the interface between them rather than each side's reasoning in isolation. Real future work; not designed here.
- **Tier 3 — full pipeline E2E**: the expensive, real-GitHub-sandbox, multi-agent-chain run this session did by hand. Real future work; not designed here. This is the tier that would keep catching harness/infrastructure gaps the way this session's Tracks A-D did.
- Adopting a third-party eval framework — already researched and rejected; see `docs/research/agent-eval-frameworks.md`.
- Anything about `tests/unit`/`integration`/`validation` themselves — this is a new, parallel category, not a replacement.

## Requirements

### Fixture model

A **scenario** consists of: one target agent, an input state constructed to look like a plausible real hand-off (e.g., a committed `Approved` Feature Plan, an `orchestration-state.json`, an escalation message written the way a real upstream agent would actually phrase it), and a check for what the agent does/produces in response.

Fixtures must not silently drift away from what real agents actually produce over time. This document states that as a requirement; it deliberately does not specify the mechanism (hand-maintained, periodic regeneration from a real Tier 3 run, or something else) — that is an implementation decision for whoever plans the build.

### Assertions — two kinds

- **Mechanical** (deterministic, `node:test`, same convention as the existing suites): file existence, required frontmatter fields, word counts against a stated budget, regex-based presence/absence checks (e.g., no fenced code block in an ADR body), commit ordering via `git log` (an `Approved` commit must exist before any implementation commit), banned-vocabulary checks.
- **Judgment-based** (needs an LLM grader, inherently non-deterministic): did the agent correctly refuse to fabricate a fact rather than guess; did it escalate instead of deciding unilaterally; are its options genuinely distinct; did it avoid over-specifying when dispatching a sub-agent itself. Dispatch **Principal-Engineer** as the grader, reusing `skill/review-severity`'s existing severity taxonomy and report template and `skill/code-review`'s dispatch pattern — extended to a new checklist domain (agent behavior), not a new scoring vocabulary. Likely lands as a new skill; exact name and shape left to the implementation plan.

### Execution model

- Local-only. Tier 1's fixtures are file-and-prompt constructions, not real GitHub state, so no sandbox repo, PR, or CI is needed to run a scenario.
- **A single run is authoritative for v1** — no retry-N/require-M-of-N tolerance for LLM non-determinism. Revisit only if flakiness proves to be a real, recurring problem in practice.

### Growth model

- A new steering Hard rule or skill-authored behavioral requirement that is checkable this way should land with a paired scenario in the same body of work — the same discipline `steering/global/knowledge-consumption.md`'s Doc-Update Acceptance Gate already applies to arc42 docs, extended to this new artifact type.
- A traceability record (which rule/skill each scenario covers) should exist so gaps are visible rather than silently accumulating. Exact format left to the implementation plan.

### Initial scenario set (MVP acceptance criteria)

Ship with at least these four, each directly reproducing a real finding or a real rule from this session's validation pass rather than a hypothetical:

1. **Architect ADR word-budget + no-code check** — reproduces the actual defect this session found (`skill/adr-authoring`'s 150-350 word budget; `agents/architect.yaml`'s "never write code/pseudocode/method signatures" Hard rule).
2. **Escalation-over-fabrication check** — give an agent an ambiguous or externally-dependent question and confirm it asks a clarifying question or routes to Engineering Researcher rather than asserting an unverified fact (`steering/global/core.md`: "Never Fabricate Information").
3. **Plan-approval-gate check** — give Software-Engineer a governing plan still at `Draft` (not `Approved`) and confirm it stops rather than implements (`steering/engineering/core.md`'s Uncommitted-approval enforcement).
4. **ADR division-of-labor check** — confirm Architect's own output never sets an ADR's `Status` to `Approved`/`accepted` and never attempts to commit it.

## Non-Goals

- Replacing or duplicating `tests/unit`, `tests/integration`, or `tests/validation`.
- Adopting a third-party LLM-eval framework (see `docs/research/agent-eval-frameworks.md` for the researched rejection).
- Designing Tier 2 or Tier 3 mechanics.
- Solving LLM non-determinism/flakiness tolerance beyond "single run is authoritative" for v1.

## Open Questions for the Implementation Plan

- Exact skill name/home for the judgment-grading dispatch (extend `skill/code-review`, or a new sibling skill).
- Exact fixture directory layout and traceability-record format.
- Whether `skill/test-execution` (today scoped to product-code test writing/execution) should absorb this, or a new skill is cleaner since the subject (agent behavior, not product code) is genuinely different.
- How fixtures get built/updated in practice (left open per direct instruction — an implementation decision, not specified here).

## References

- `docs/plans/process-model-test-plan.md` — the validation pass that motivated this, including Finding B1 (the actual defect)
- `docs/research/agent-eval-frameworks.md` — why no third-party framework
- `steering/engineering/core.md`, `skill/review-severity`, `skill/code-review`, `skill/ai-component-review` — existing patterns this reuses
