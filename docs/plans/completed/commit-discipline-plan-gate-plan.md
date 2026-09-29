# Explicit Commit Discipline & Plan-First-Commit Gate — Implementation Plan

> Status: Done
> Created: 2026-08-13
> Approved by: Jeremy Smellie

---

## Goal

Make three things explicit and centralized in engineering steering/skills: (1) plans must be committed to git — as `Status: Draft`, updated each revision round, then `Approved` — before any implementation begins, in both project and framework repos; (2) implementation commits must be small and incremental rather than one large commit at the end; (3) the Draft/Approved/Done/Deferred commit-gate procedure and status vocabulary are defined once in a shared skill, not restated in every planning skill.

---

## Components Affected

| Component                                                    | Action | Notes                                                                                                                                                                                                  |
| ------------------------------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `skills/plan-lifecycle/SKILL.md`                             | Create | New shared skill defining the commit-gate procedure and the canonical status vocabulary                                                                                                                |
| `skills/plan-lifecycle/reference/status-vocabulary.md`       | Create | Single source of truth: core statuses (`Draft`, `Approved`, `Done`, `Deferred`) plus documented per-artifact-type extensions (e.g. Decision Record's `Superseded`)                                     |
| `skills/plan-lifecycle/reference/commit-gate-procedure.md`   | Create | The step-by-step commit procedure other skills reference instead of restating                                                                                                                          |
| `steering/engineering/core.md`                               | Modify | Strengthen Rule 1, add new Rule 8 (plan-committed-first, points to `skill/plan-lifecycle`) and Rule 9 (incremental commits)                                                                            |
| `steering/engineering/git-workflow-framework.md`             | Modify | Add plan-commit-first rule (references `skill/plan-lifecycle` for mechanics) + commit granularity checkpoints                                                                                          |
| `steering/engineering/git-workflow-projects.md`              | Modify | Promote existing plan-commit exception into an explicit rule referencing `skill/plan-lifecycle`; add commit granularity checkpoints                                                                    |
| `skills/chunk-planning/SKILL.md` + `reference/template.md`   | Modify | Status field becomes `Draft / Approved / Done / Deferred`; Step 3 references `skill/plan-lifecycle`                                                                                                    |
| `skills/epic-planning/SKILL.md` + `reference/template.md`    | Modify | Same status/reference change as chunk-planning                                                                                                                                                         |
| `skills/decision-record/SKILL.md` + `reference/template.md`  | Modify | Status field becomes `Draft / Approved / Done / Deferred / Superseded` (was `Draft / Confirmed / Superseded`); `Confirmed By` field renamed to `Approved By`; Step 3 references `skill/plan-lifecycle` |
| `skills/ai-engineering-plan/SKILL.md`                        | Modify | Outputs — Tier 3 plans saved under `paths.plans`, status field `Draft / Approved / Done / Deferred`, references `skill/plan-lifecycle`                                                                 |
| `skills/chunk-orchestration/SKILL.md`                        | Modify | Step 1 adds explicit check: Epic Plan `Status` must be `Approved` before reading `chunks.json`                                                                                                         |
| `agents/engineering-manager.yaml`                            | Modify | Hard rule referencing Decision Record `Status "Confirmed"` / `"Confirmed By"` updated to `"Approved"` / `"Approved By"`                                                                                |
| `docs/plans/commit-discipline-plan-gate-plan.md` (this file) | Modify | Adopts the vocabulary it defines                                                                                                                                                                       |
| Frontmatter `version` on all modified files                  | Modify | Minor version bump                                                                                                                                                                                     |

---

## Approach

1. **Create `skills/plan-lifecycle`.** A shared, agent-agnostic skill (no specific plan type, no specific agent) whose sole job is: given a plan/record artifact with a status field, (a) save + commit it as `Draft` before presenting for review, (b) commit each human-requested revision as a new commit before re-presenting, (c) commit the transition to `Approved` (or `Deferred`, if the human chooses to postpone rather than approve/reject) only after explicit human decision, (d) note that dependent work may not begin until the `Approved` commit exists — any non-`Approved` status (`Draft`, `Deferred`, etc.) blocks dependent work equally; no special-casing is needed downstream beyond checking for `Approved`.

2. **Define the canonical status vocabulary in `skills/plan-lifecycle/reference/status-vocabulary.md`.**
   - Core (all artifact types use these four): `Draft` (still being written/iterated), `Approved` (human explicitly confirmed, gate satisfied, dependent work may proceed), `Done` (work described by the artifact is complete), `Deferred` (explicitly postponed by human decision — distinct from `Draft`, which implies active iteration).
   - `In Progress` remains dropped — orchestration state answers "is this actively being worked," not the plan's own status field.
   - Per-type extension: Decision Record adds `Superseded` (a later decision replaced this one — a terminal outcome, not a lifecycle stage). No other current artifact type needs an extension.
   - Table format: `Artifact Type | Allowed Statuses | Notes`.
   - Explicitly document: `Deferred` can apply mid-planning (e.g., an Epic or Chunk Plan shelved for later) as well as to a Decision Record. A `Deferred` artifact can be revisited and moved to `Draft` again, or later `Approved`.

3. **Define the commit-gate procedure in `skills/plan-lifecycle/reference/commit-gate-procedure.md`.** Steps: create artifact with `Status: Draft` → commit → present to human → on requested changes, edit + commit again (never amend) → repeat until the human decides `Approved` or `Deferred` → commit that status transition → only an `Approved` commit satisfies the gate for dependent work. Chat/verbal confirmation alone never satisfies the gate.

4. **`engineering/core.md` — Rule 1 amendment.** Add a bullet: "A plan is not 'approved' for implementation purposes until the `Approved` status has been committed to git per `skill/plan-lifecycle`. Verbal/chat confirmation alone does not satisfy this rule. Any other status, including `Deferred`, is not approved and must not be implemented."

5. **`engineering/core.md` — new Rule 8: "Plans Are Committed Artifacts, Not Chat Output."** States the principle and points to `skill/plan-lifecycle` for mechanics.

6. **`engineering/core.md` — new Rule 9: "Commit Incrementally During Implementation."** Unchanged — principle-level, defers checkpoint mechanics to the git-workflow files.

7. **`git-workflow-framework.md` / `git-workflow-projects.md` updates.** Both reference `skill/plan-lifecycle` for commit-gate mechanics instead of restating. Both add commit-granularity guidance (step 10 below). `git-workflow-projects.md` promotes its existing plans/orchestration/knowledge exception into a numbered rule.

8. **Update `chunk-planning`, `epic-planning`, `decision-record`, `ai-engineering-plan` skills.**
   - Each skill's "stop for approval" step becomes a reference: "Follow the commit-gate procedure in `skill/plan-lifecycle`."
   - Each template's `Status` field row updates to: chunk/epic `Draft / Approved / Done / Deferred`; decision-record `Draft / Approved / Done / Deferred / Superseded`; ai-engineering-plan `Draft / Approved / Done / Deferred` (gains a Metadata table since `plan-schema.md` currently has none).
   - Decision Record's `Confirmed By` field renamed `Approved By` to match the renamed status.

9. **`chunk-orchestration` + `engineering-manager` — validate and close the status-check gap.**
   - **Validated as already correct:** `chunk-orchestration` Step 2.1 ("Verify the chunk plan exists and is approved") and `engineering-manager`'s hard rule ("Never dispatch without an approved chunk plan") already gate dispatch on Chunk Plan approval — this single `Approved` check is sufficient by construction; no additional handling for `Deferred` or any other non-`Approved` status is needed.
   - **Gap found and closed:** `chunk-orchestration` Step 1 (Initialize) reads `chunks.json` without first explicitly verifying the parent Epic Plan's `Status` is `Approved`. Add an explicit check as Step 1.0: read the Epic Plan, confirm `Status: Approved` before proceeding; if not, stop and report rather than reading `chunks.json`.
   - Update `engineering-manager.yaml`'s hard rule referencing Decision Record `Status "Confirmed"` / `"Confirmed By"` to `"Approved"` / `"Approved By"`.

10. **Commit granularity checkpoints — recommendation + options.** Unchanged: recommend **Option A** (commit per completed plan step), with Option B (per file) and Option C (per validation checkpoint) as alternatives.

11. **Version bumps.** Minor bump on every modified file's frontmatter `version` (new skill starts at `0.1.0`).

---

## Open Questions

None.

---

## Risks

- **Scope grew from "steering wording change" to "shared skill + 4 planning skills + orchestration skill + 1 agent definition."** Flagging per Rule 4 rather than silently expanding — a direct, intentional result of centralizing the convention and closing a validation gap you asked about.
- **Renaming Decision Record's `Confirmed` → `Approved`** is a terminology change to an existing convention (3 existing decision records use `Confirmed`/`Confirmed By`). Existing files are not retroactively renamed (see Out of Scope) — only template/skill/agent wording changes going forward, so `engineering-manager.yaml`'s hard rule must be updated in lockstep (see Validation).
- **`skill/plan-lifecycle` becomes a dependency of 5+ components** (4 planning skills + orchestration references it indirectly via the status vocabulary). Mitigated by keeping it deliberately small.

---

## Validation

- Read back all modified/created files, confirm frontmatter version bumps and that every reference to `skill/plan-lifecycle` resolves.
- Confirm no planning skill still contains inline "set status to Draft, wait for approval" prose duplicating the shared skill.
- Confirm `engineering-manager.yaml`'s Decision-Record-status hard rule matches the renamed `Approved` / `Approved By` fields.
- Confirm `chunk-orchestration` Step 1.0's new Epic-approval check is present and correctly precedes the `chunks.json` read.
- Run `npm test`; check `tests/validation/` for any assertions on skill/steering/agent content or cross-references that this touches.
- Verify the three existing `.decision.md` files under `docs/decisions/` are explicitly grandfathered (their `Confirmed`/`Confirmed By` wording is not treated as invalid by any tooling or agent rule going forward).

---

## Out of Scope

- Retroactively renaming `Confirmed` → `Approved` (or `Confirmed By` → `Approved By`) in the three existing decision records under `docs/decisions/`. Only the template/skill/agent wording changes going forward.
- Building tooling/automation to enforce the commit gate (e.g., a git hook). Steering/skill discipline only, unless requested as a follow-up.
- Touching `steering/global/core.md` or non-engineering domains.
- Changes to `chunks.json` schema (status remains out of that file; it is not a per-artifact approval record).
- Any special-cased orchestration handling for `Deferred` (or other non-`Approved`) chunk/epic statuses beyond the existing `Approved`-only gate.

---

## Revision Note

Third revision. Original scope was a single steering-wording change. First revision centralized the commit-gate procedure and status vocabulary into a new `skill/plan-lifecycle`. Second revision promoted `Deferred` to a first-class core status and proposed special orchestration handling for it. This revision simplifies that: orchestration only ever needs to check for `Approved` — no distinct handling for `Deferred` or any other non-`Approved` status is required, since the existing gate already excludes all of them equally. The Epic-approval gap in `chunk-orchestration` Step 1 remains a real, closed gap.

---

## Completion Note

Implemented in commits 6de27f1 through a0a636d on main (2026-08-13). All planned components delivered: `skill/plan-lifecycle` created; `core.md` Rules 1/8/9 added; both git-workflow steering files updated with the commit-gate reference and granularity guidance; `chunk-planning`, `epic-planning`, `decision-record`, and `ai-engineering-plan` skills updated to the shared vocabulary and commit-gate reference; `chunk-orchestration` gained the Epic-approval check; `engineering-manager.yaml` updated for the Confirmed to Approved rename and the Epic-approval check.

Discovery during validation (not in original Components Affected, fixed as a direct consequence of the approved DR rename, not new scope): `agents/tech-lead.yaml` and `agents/architect.yaml` also referenced the old `Confirmed`/`Confirmed By` wording and were updated to `Approved`/`Approved By` for consistency.

Confirmed out of scope and left untouched: `docs/decisions/*.decision.md` (existing records, grandfathered per plan), and `docs/knowledge-file-format.md` plus its associated tests (`tests/unit/knowledge.test.js`, `tests/unit/base.test.js`, `tests/integration/knowledge-index.test.js`) — a separate knowledge-index subsystem that independently uses `Confirmed` as an example status value, unrelated to the Decision Record skill/template this plan changed.

Full test suite: 489/489 passing.
