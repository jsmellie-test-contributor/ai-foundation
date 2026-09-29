---
name: 'plan-lifecycle'
version: '0.3.0'
description: 'Shared commit-gate procedure and status vocabulary for any artifact requiring human approval before dependent work begins.'
---

## Purpose

Defines, in one place, how a human-approval-gated artifact (Feature Plan, ADR, or a Tier 3 plan) moves from first draft to a state that other work is allowed to depend on. Other planning skills reference this skill instead of restating the procedure.

Use this skill whenever a skill produces an artifact with a `Status` field that a human must approve before implementation, decomposition, or any other dependent work may proceed.

---

## Inputs

- **Artifact file path** — where the plan/record lives (per the producing skill's `Outputs` section and the project's `.aiconfig.json` `paths.*` configuration)
- **Artifact type** — Feature Plan, ADR, or Tier 3 plan (determines which status values from `reference/status-vocabulary.md` are valid).
- **Current lifecycle stage** — first draft, a revision round, or a final human decision

---

## Steps

### Step 1 — Save as Draft and commit

Write the artifact to its configured path with `Status: Draft` and, where the template has one, `Approved by: Pending` (or the artifact's equivalent field). Commit it via `ai-git` before presenting it to the human. A plan that only exists in chat is not a plan for the purposes of any steering rule that requires "an approved plan."

### Step 2 — Present for review

Present the artifact to the human for feedback. Do not begin implementation, decomposition, or any dependent work while status is `Draft`.

### Step 3 — Commit each revision

If the human requests changes, edit the artifact and commit again as a new commit (never amend, never squash the history of a plan under review). Status remains `Draft` through as many revision rounds as needed. Each revision's commit message should make clear it is a plan revision (e.g. "Revise plan: ...").

### Step 4 — Commit the human's decision

Once the human gives an explicit decision, update the `Status` field and commit that change as its own commit, separate from any implementation:

- **Approved** — the human explicitly confirmed. This is the only status that satisfies an "approved plan" gate elsewhere in steering. Update the approver field (e.g. `Approved by: {name}`) in the same commit.
  If the artifact type is an ADR, `Superseded` (from `reference/status-vocabulary.md`) is a state the record moves to later, not a decision made at this step.
- **Deferred** — the human explicitly chose to postpone. This is not an approval; see Edge Cases.

Verbal or chat-only confirmation never satisfies the gate — only the committed `Approved` status does.

### Step 5 — Mark Done when the described work completes

When the work the artifact describes is finished (implementation merged, decision fully acted on, etc.), update `Status: Done` and commit. This is informational — it is not itself a gate for anything downstream, but it keeps the artifact's status accurate for future readers.

---

## Outputs

- A committed artifact whose `Status` field accurately reflects `Draft`, `Approved`, `Done`, `Deferred`, or (ADRs only) `Superseded` at all times — see `reference/status-vocabulary.md`.
- A git history that shows the full Draft → revision → revision → Approved (or Deferred) progression as separate commits.

---

## Edge Cases

- **Human says "just do it" / approves verbally in chat only** — still requires the committed `Approved` status update before implementation starts. Do the commit first, then proceed.
- **Human wants to defer rather than approve or reject** — set `Status: Deferred` and commit. A `Deferred` artifact is not approved; nothing may treat it as satisfying an approval gate. It can later be revisited (moved back to `Draft`) or approved directly from `Deferred`.
- **Checking whether a specific piece of dependent work may proceed** — check only for `Status: Approved` on the governing artifact. Do not add special-case handling for `Deferred`, `Draft`, or any other non-`Approved` value — the absence of `Approved` is sufficient by itself to block dependent work.
- **Repo has no `paths.plans` (or equivalent) configured in `.aiconfig.json`** — fall back to `docs/plans/` for Tier 3 plans; Feature Plans use `skill/feature-planning`'s documented path defaults, ADRs use Architect's documented `write` scope (`{paths.decisions}/`).
- **Framework repo (direct commits to main)** — the commit gate still applies. There is no branch/PR step, but the Draft and Approved commits must still exist as separate, real commits on `main` before implementation commits follow.
