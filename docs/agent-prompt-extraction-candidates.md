---
name: 'agent-prompt-extraction-candidates'
tags: ['agent-authoring', 'prompt-design', 'skills']
scope: 'software-engineer'
description: "Prompt content that reads like a reusable rule/procedure but currently lives in only one agent's prompt — tracked so it can be promoted to a skill or steering rule if a second agent needs the same behavior."
---

## Purpose

Some content in an agent's prompt is genuinely agent-specific (identity, scope boundaries, judgment calls unique to that role). Other content is a self-contained procedure or rule that simply hasn't been extracted into a skill or steering file yet — usually because only one agent currently needs it, and extracting on day one would add an indirection layer with no reuse benefit (see `skill/skill-authoring` Edge Cases: "Unclear whether to use a script or prose step" — the same "don't abstract prematurely" principle applies to skill extraction).

This file is the record of that second category: things that _look_ extractable but aren't extracted _yet_, why, and the condition that should trigger extraction.
It exists so the decision not to extract is a tracked, revisitable choice — not a silent one that gets rediscovered from scratch each time.

Checked and updated per `skill/agent-authoring` Step 5 whenever a prompt is written or revised.

---

## How to use this file

- **Writing/revising a prompt:** if you're about to write a generic-sounding rule or procedure that isn't specific to the agent's identity, check this list first — it may already be tracked. If it's new, add an entry.
- **Adding a second agent that needs an existing entry's behavior:** that's the trigger condition. Extract the content into a skill or steering rule (per `skill/skill-authoring` or `skill/steering-authoring`), update both agents to reference it, and remove the entry from this file (or mark it resolved with the extraction's location).
- **This file is descriptive, not prescriptive.** Nothing here is enforced. It is a judgment aid, not a rule — see `steering/global/knowledge-consumption.md` for how descriptive knowledge differs from prescriptive standards.

---

## Current candidates

### Architect — ADR drafting constraint

**Where:** `agents/architect.yaml` Hard Rules — "Never set an ADR's Status to 'Approved' or fill in 'Approved By'. Only a human may approve. Always set Status to 'Draft' and Approved By to 'Pending'."

**Why not extracted:** This is a specific instance of the general commit-gate principle already centralized in `skill/plan-lifecycle` (only a human-committed `Approved` status satisfies the gate). Architect is currently the only agent that _drafts_ ADRs, so the instruction to leave Status/Approved-By unfilled has no second consumer yet.

**Extraction trigger:** A second agent is introduced that also drafts human-approval-gated artifacts directly (not via an existing planning skill like `skill/feature-planning`, which already encodes this via `skill/plan-lifecycle`). If that happens, promote this instruction into `skill/plan-lifecycle` itself as an explicit "drafting agents never self-approve" step, rather than repeating it per agent.

### Engineering-Manager — Task branch naming convention

**Where:** `agents/engineering-manager.yaml` Hard Rules — branch naming `{feature-id}/{task-id}-{short-description}`.

**Why not extracted:** Currently only Engineering-Manager creates Task branches; the convention is already partially covered by `skill/worktree-management` (which creates the worktree onto a branch this rule names), so extraction now would split one convention across two thin fragments for a single consumer.

**Extraction trigger:** A second agent gains the ability to create Task branches directly (e.g. a future agent that manages conflict resolution or partial re-dispatch independently). At that point, move the naming convention itself into `skill/worktree-management` so branch-naming and worktree-creation stay defined in one place.
