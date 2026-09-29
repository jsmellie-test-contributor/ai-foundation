---
name: 'complexity-tiers'
version: '0.2.1'
description: "Assesses task complexity and scales process rigor accordingly, from a quick fix to a stop-and-hand-off floor. Software-Engineer's primary gate; generic enough for other agents to adopt."
---

## Purpose

Provides a shared framework for scaling process to the size of the work: small, clear changes move fast with minimal ceremony, while cross-cutting or ambiguous work stops for human sign-off, or hands off entirely rather than being planned and implemented solo. This avoids two failure modes — over-processing trivial changes, and under-processing changes that quietly reshape how other components work.

Use this skill whenever an agent needs to decide how much process a task warrants before starting work. Software-Engineer is this skill's primary user today — its universal front door for every Task — so the tier definitions below default to Software-Engineer's shape. Where a tier's mechanics genuinely vary by agent (how a Tier 2 stop works, where Tier 3 hands off to), that agent states its own specifics in the Per-agent specifics table below rather than in its own prompt — this skill stays the one place that answers "what does tier N mean for agent X," so no agent has to restate it.

---

## Inputs

- **Task description** — what the human is asking for
- **Affected components** — what the agent already knows will be touched, if anything
- **Human override signals, if any** — e.g. "just do it" or "plan this"

---

## Steps

### Step 1 — Assess complexity and state the tier

Before starting work, assess which tier applies and state it explicitly, with brief reasoning. The human can override the assessment up or down at any time.

### Step 2 — Tier 1 (Quick)

**Signals:** single-file change, clear intent, no new patterns, no schema changes.
**Examples:** fix a typo, update a version, add a tool to an existing agent, tweak wording.

**Process:**

1. Clarify (if anything is ambiguous — skip if intent is obvious)
2. Implement — follow the governing schema/standard exactly
3. Self-validate — run tests, verify cross-references
4. Present result

### Step 3 — Tier 2 (Standard)

**Signals:** multi-file change, new component (but straightforward), modifying an existing pattern without changing it.
**Examples:** author a new steering file, add a new skill following an established pattern, create a new server definition. A "plan this" override floors any task here at minimum (see Edge Cases) — it never jumps straight to Tier 3.

**Process:**

1. Clarify — ask questions if anything is unclear
2. Outline approach — brief paragraph or bullet list of what will be created/changed
3. **Stop. Wait for human approval before implementing.** Exactly what "stop" means mechanically — a live held question, or ending your turn on a reported state — depends on which tools you hold; see your row in Per-agent specifics below.
4. Implement — follow the governing schema/standard exactly
5. Self-validate — run tests, verify cross-references
6. Present result

### Step 4 — Tier 3 (Complex)

**Signals:** cross-cutting changes, new conventions or patterns, multi-component design, schema changes, anything that reshapes how other components work.
**Examples:** redesigning a component into multiple roles, creating a new interconnected set of components, introducing a new convention, changing a schema.

**Process:**

1. Clarify — ask focused questions to bound scope
2. **Stop and hand off.** This work is not yours to plan and implement solo — report it to your Tier 3 destination (Per-agent specifics below) and end your turn there. Do not proceed on your own judgment, even with a plausible plan already in mind.

This is the default because Software-Engineer, this skill's primary user, always hands off rather than self-planning Tier 3 work. An agent could instead plan-and-implement its own Tier 3 work solo — no agent does today, but one that did would state so explicitly in its Per-agent specifics row, replacing this default with: clarify → produce a written plan → stop for human approval → implement the approved plan → self-validate → present result referencing the plan.

### Step 5 — Apply tier selection rules

- State the tier and reasoning at the start of every task
- When in doubt, tier up (prefer more process over less)
- If mid-task complexity turns out higher than assessed, stop and escalate to the next tier rather than continuing under the original assessment

---

## Per-agent specifics

The tier definitions above are generic. This table is where "what does Tier 2's stop actually look like for me" and "where does Tier 3 hand off to" get answered per agent — add a row here, not a paragraph in the agent's own prompt, when a new agent adopts this skill.

| Agent             | Tier 2 stop mechanism                                                                                                                                                                   | Tier 3 destination                                                                                                                                                                                                                             |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Software-Engineer | Holds no live in-session blocking tool (no `plan`, no `ask_user`) — a stop is a reported state: present the outline and end your turn, waiting for human approval before you implement. | Not yours to plan and implement solo. Dispatched by Engineering Manager → stop and report back to it to decompose. Working standalone (no Engineering Manager in the loop) → stop and escalate directly to the human. Never proceed past this. |

---

## Outputs

- **A stated tier** (1, 2, or 3) with brief reasoning
- **The process followed for that tier**, carried out as described above

---

## Edge Cases

- **Human says "just do it"** — the human is overriding to Tier 1. Acknowledge and proceed without a plan or approval gate, regardless of the agent's own assessment.
- **Human says "plan this"** — a floor on Tier 2 (stop for human sign-off before implementing), never a jump to Tier 3. Tier 3 is for work genuinely too large to own, not for work that merely wants more rigor — that's a richer outline, still Tier 2.
- **Complexity grows mid-implementation** — stop, state the new tier assessment, and follow that tier's gate (including going back for approval, or handing off at Tier 3) before continuing. Do not finish under the original, now-incorrect tier.
