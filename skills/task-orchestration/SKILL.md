---
name: 'task-orchestration'
version: '0.4.2'
description: 'Orchestrates parallel Task execution across engineering agents with wave-based dispatch and quality gates.'
---

## Purpose

Manages the end-to-end execution of a Feature's Tasks. Computes execution waves from
the dependency graph, dispatches Tasks to the implementing agent, monitors the single
implement→review pipeline, handles review loops, detects blocks, and advances waves
until the Feature is complete or fully blocked.

Engineering Manager is this skill's primary user today — the implementing and review
roles are Software-Engineer and Principal-Engineer respectively (see
`docs/process-model.md`'s Agent roster). The steps below refer to "the orchestrating
agent," "the implementing agent," and "the review agent" generically rather than
naming them, so this skill doesn't have to change every time the roster does — the
literal two-track, named-agent version of this skill is exactly what made it go stale
the last time the roster changed.

---

## Inputs

- **Approved Feature Plan** — with decomposition complete, if the Feature has more than one Task
- **tasks.json** — validated dependency graph (must have passed `dag-validate`); a single-Task Feature may skip this and be dispatched directly (see Edge Cases)
- **Branch naming convention** — `{feature-id}/{task-id}-{short-description}`

---

## Steps

### Step 1 — Initialize

1. Read `.aiconfig.json` from the project root to resolve artifact paths
2. Read the Feature Plan and confirm `Status: Approved` before proceeding. If the Feature is not `Approved` (e.g. still `Draft` or `Deferred`), stop and report to the human — do not read `tasks.json`. See `skill/plan-lifecycle` — only `Approved` satisfies this gate.
3. Read `tasks.json` for the Feature (at `{paths.features}/{FeatureID}/tasks.json`)
4. Call `dag-compute-waves` to get the ordered wave structure
5. Copy the template from `skills/task-orchestration/assets/orchestration-state.json`
6. Populate the state file:
   - Set `feature_id` from tasks.json
   - Set `total_waves` from the wave computation result
   - Set `current_wave` to 0
   - Create a Task state entry for each Task (status: `Ready`, wave assignment from computation)
7. Write the state file to `{paths.features}/{FeatureID}/orchestration-state.json` (from `.aiconfig.json`, default: `plans/features/`) — sibling to the Feature Plan and `tasks.json`
8. **Commit the Feature Plan and orchestration state to main before proceeding:**
   - Verify the Feature Plan is committed and pushed to main. If not, commit and push it now (directly to main — plans do not use branches).
   - Commit and push the orchestration state file to main.
   - This ensures all worktrees (branched from main) will have access to the plan.
9. Read `orchestration.max_concurrent` from `.aiconfig.json` (default: `4`) — use this as the concurrency limit for all dispatch decisions
10. Run worktree startup validation (`skill/worktree-management`: "Validate Existing Worktrees (Startup Check)") to detect stale worktrees
11. Log: `wave_started` for wave 0

### Step 2 — Dispatch Wave

**⚠️ PREREQUISITE GATE: Every Task MUST have a dedicated branch and worktree created BEFORE any subagent is dispatched. No exceptions. No fallback to main directory.**

**File Overlap Detection (warning only, best-effort):**

Before dispatching any Tasks in the wave, and only where a Task already has a written
outline to compare (most Tier 1 Tasks won't — see `skill/complexity-tiers` — skip
silently for those; nothing to compare pre-dispatch):

1. For each Task in the wave that does have a written outline, extract the files/components it names
2. Compare across all such Tasks in the wave for overlapping file paths
3. If overlap is found:
   - Log: `overlap_warning` with the overlapping Task IDs and file paths
   - Present the warning to the human: "Potential merge conflict — Tasks {X} and {Y} both modify {files}. Proceeding in parallel; conflicts will be handled at PR merge time."
   - **Do not block or serialize.** Proceed with parallel dispatch.

For each Task in the current wave with status `Ready`:

1. **Create branch and worktree** — determine the branch name
   (`{feature-id}/{task-id}-{short-description}`), then follow
   `skill/worktree-management`: "Resolve Worktree Path" → "Create Worktree" → "Setup Worktree" to resolve the path, create the
   worktree, and install dependencies. Once confirmed, record `worktree_path`
   and `branch` in the Task state.
   - **If worktree creation fails → mark Task as `Blocked`, do NOT dispatch**
2. **Only after the worktree is confirmed**, dispatch the implementing agent with:
   - The Task's entry from `tasks.json` (id, title, `depends_on`) and a pointer to the Feature Plan for context
   - The branch name
   - **The worktree path as the agent's working directory** (the agent works HERE, not in the main repo)
   - Instruction to implement the Task, assessing its own complexity tier per `skill/complexity-tiers` as its first step — this skill does not pre-gate on a written Task plan; whether one exists, and how detailed, is the implementing agent's own tier-driven call
3. Update Task status to `Implementing`
4. Log: `task_dispatched` with agent, branch, and worktree path details

Constraints:

- Maximum concurrent subagents is read from `orchestration.max_concurrent` (default: 4)
- If more Tasks in a wave than the concurrency limit, queue the rest and dispatch as slots free up
- Never dispatch a Task whose dependencies are not all `Done`
- If worktree creation fails, mark Task as `Blocked` with reason and do not dispatch

### Step 3 — Monitor Pipeline

As each subagent completes, advance the Task through its pipeline — one shape for
every Task, no track branching.

**After the implementing agent's first pass:**

1. Verify it reported: changes committed and pushed to the Task's branch, and the
   Task's PR opened as a **draft** (the implementing agent opens this itself, on its
   first pass only — see `docs/process-model.md` check 7)
2. Record `pr_number`/`pr_url` in the Task state
3. Update Task status to `Reviewing`
4. Dispatch the review agent for the same branch, worktree path, and PR
5. Log: `pr_created`, `task_status_changed`

**After the review agent completes — APPROVED:**

1. Post its Review Report onto the Task's PR as a single PR review (one comment
   body — the review agent holds no `shell`/`gh` access, so the orchestrating agent
   posts on its behalf through the access it already holds)
2. Mark the PR ready-for-review (undraft it) — no second PR is ever created
3. Update Task status to `Done`
4. Log: `task_status_changed`
5. Check if a queued Task can now be dispatched (free slot)
6. Check if the wave is complete (Step 5)

Note: The worktree remains active until the human confirms the PR is merged.
When the human confirms merge, run worktree teardown (`skill/worktree-management`: "Teardown Worktree"):

- Remove the worktree directory
- Delete the merged branch
- Clear `worktree_path` in Task state
- Log: `worktree_removed`

**After the review agent completes — NEEDS_CHANGES:**

1. Post its Review Report onto the Task's PR as a single PR review, same as
   APPROVED — the PR stays not-ready; corrections land on this same PR, never a new one
2. Increment Task `iterations`
3. If `iterations` < 5:
   - Update Task status to `Implementing`
   - Dispatch the implementing agent back in with the review findings; it pushes fixes to the same branch/PR
   - Log: `review_loop` with iteration count
4. If `iterations` >= 5:
   - Mark Task as `Blocked` with reason: "Review loop exhausted (5 iterations)"
   - Add an escalation entry
   - Log: `escalation_raised`
   - Continue with remaining Tasks

### Step 4 — Handle Blocks

A Task may be blocked for reasons beyond review loops:

**Out-of-domain work detected:** AI-component authoring (declarative skills, agents, steering, server definitions) is in-domain for the implementing agent — it dispatches normally, not this edge case. If a Task references components, skills, or work genuinely outside engineering's domain (e.g., infrastructure provisioning), mark it as:

- Status: `Blocked`
- `blocked_reason`: description of what's needed
- Log: `task_blocked`
- Add escalation entry
- Surface to human: state what is needed and which Task is affected

**Merge conflict — Conflict Resolution Sub-Flow:**

Triggered by: human reports conflict during PR review, OR wave-boundary rebase fails (Step 5).

1. Update Task status to `Conflict`
2. Log: `conflict_detected` with branch name, conflicting files (if known), and trigger source
3. Dispatch the implementing agent (the same one that implemented the Task in Step 2) to the Task's worktree with instructions:
   - Fetch latest main: `ai-git fetch origin main`
   - Rebase onto main: `ai-git rebase origin/main`
   - Resolve any conflicts that arise
   - Run tests/self-validation to verify the resolution passes
   - Commit the resolution and push the branch (force-push is acceptable here — it's a feature branch with only agent commits)
   - Report success or failure
4. **If the agent reports success:**
   - Update Task status to `Implementing`
   - Reset `iterations` to 0
   - Log: `conflict_resolved` with details of which files were resolved
   - Re-dispatch the same agent to verify/complete implementation in context of the new base
   - The full pipeline restarts: Implementing → Reviewing → Done
5. **If the agent reports inability to resolve** (complex conflict, semantic ambiguity, or validation failures after resolution):
   - Mark Task as `Blocked`
   - `blocked_reason`: "Merge conflict requires human resolution on branch {branch}: {conflicting files}"
   - Log: `conflict_escalated`
   - Add escalation entry with:
     - The conflicting file paths
     - The branch name
     - Which Tasks contributed to the conflict (if known from overlap warnings)
   - Present to human: state the branch, conflicting files, and suggest `ai-git rebase origin/main` in the worktree to resolve manually
6. **When human reports conflict resolved** (after manual intervention):
   - Update Task status to `Implementing`
   - Reset `iterations` to 0
   - Set escalation `resolved` to true
   - Log: `task_unblocked`
   - Pipeline restarts from the implementing agent: Implementing → Reviewing → Done

**Decision hand-off — Decision Hand-off Sub-Flow:** (Authored under AIF-002-006)

Triggered by: a dispatched subagent reports that continuing requires an
Architect-owned decision (a genuine architectural/product fork) before it can
proceed.

1. Update Task status to `Blocked` with a structured `blocked_reason`
   describing what decision is needed. Log: `decision_handoff_detected`.
2. Dispatch Architect as a subagent to author the ADR (MADR format,
   `{paths.decisions}/`). No domain/tier routing — every hand-off reaching
   this sub-flow is, by definition, an Architect-owned fork; a Process/
   tooling/convention question isn't an ADR at all
   (`docs/process-model.md`'s Decisions section — edit the skill/steering/
   agent file directly, the commit is the record) and never reaches this
   sub-flow. Log: `decision_authored` once the Draft ADR is committed.
3. Present the Draft ADR to the human alongside the existing
   blocked-Task escalation. The decision's own `skill/plan-lifecycle` gate —
   not orchestration state — governs whether it becomes `Approved` or
   `Deferred`. Do not track a parallel approval state in the orchestration
   file.
4. Once the decision reaches `Approved`: reuse the existing generic "when
   human unblocks" behavior (see above) unchanged — Task status `Blocked` ->
   `Ready`, `blocked_reason` cleared, escalation `resolved` set to true. Log:
   `task_unblocked` and `decision_handoff_resolved`. No new resume mechanic —
   the Task's full pipeline (Implementing -> Reviewing -> Done) redispatches
   from `Ready` exactly as any other unblock does.
5. If the decision is `Deferred` instead: the Task remains `Blocked`.
   `Deferred` never satisfies the gate (per `skill/plan-lifecycle`) — do not
   clear `blocked_reason` or advance the Task.

**Blocked Tasks and wave progression:**

- A blocked Task does NOT prevent other Tasks in the wave from completing
- A blocked Task DOES prevent any Task that depends on it from dispatching
- If all remaining undone Tasks are blocked and no progress is possible, set overall status to `Blocked` and escalate

**When human unblocks:**

- Set Task status back to `Ready`
- Clear `blocked_reason`
- Set escalation `resolved` to true
- Log: `task_unblocked`
- Resume dispatch if the Task's wave is current or past

### Step 5 — Advance Wave

After each Task completion, check wave status:

1. Are all non-blocked Tasks in the current wave `Done`?
2. If yes:
   - Present all open PRs for the wave to the human
   - Wait for human to confirm all PRs in the wave are merged
   - Once confirmed, tear down worktrees for all merged Tasks (`skill/worktree-management`: "Teardown Worktree")
   - Log: `wave_completed`
   - Increment `current_wave`
   - If more waves remain:
     - **Wave-Boundary Rebase** — ensure next wave's branches are up-to-date with main:
       1. Run `ai-git fetch origin main` in the main repository
       2. For each Task in the new wave that already has a worktree (resumed/unblocked Tasks only):
          - In the Task's worktree, run `ai-git rebase origin/main`
          - If rebase succeeds cleanly: log `wave_rebase` with Task ID, proceed normally
          - If rebase conflicts: enter the Conflict Resolution Sub-Flow (Step 4) for that Task.
            The Task cannot be dispatched until conflict is resolved.
       3. For new Tasks (no worktree yet): no action needed — they will branch from the current main when their worktree is created in Step 2, so they naturally get the latest code.
     - Set all Tasks in the new wave whose dependencies are `Done` to `Ready` (except any currently in `Conflict` from the rebase above)
     - Log: `wave_started`
     - Go to Step 2 (dispatch new wave)
   - If no more waves remain:
     - Go to Step 6

### Step 6 — Complete

1. Set overall status to `Complete`
2. Log: `orchestration_complete`
3. Produce a summary:
   - Total Tasks completed
   - Total review iterations across all Tasks
   - Any Tasks still blocked (with reasons)
   - Total elapsed time (first log entry to last)
4. Present summary to human

---

## Outputs

- **Orchestration state file** — continuously updated at `{paths.features}/{FeatureID}/orchestration-state.json`
- **Completion summary** — presented to human when all waves are done or fully blocked

---

## Edge Cases

- **All Tasks in a wave are blocked** — set overall status to `Blocked`, present all escalations to human, wait for unblock before continuing.
- **Human unblocks a Task mid-wave** — resume immediately if the Task's wave is current. If it's a past wave, dispatch it now (it's overdue).
- **Feature Plan not `Approved`** — stop at Step 1 before reading `tasks.json`; report to the human. Do not treat `Draft` or `Deferred` as sufficient.
- **Subagent fails unexpectedly** — mark Task `Blocked` with reason "Agent failure: {error}". Log and escalate. Do not retry automatically.
- **Feature has only one Task, or skips `tasks.json` entirely** — a single-Task Feature can be dispatched directly, without wave computation: one branch, one worktree, the same Implementing → Reviewing → Done pipeline as any Task in a larger graph. No shortcuts to the pipeline itself.
- **Task depends on a blocked Task** — remains in `Ready` but cannot be dispatched. Will dispatch once the dependency is unblocked and completed.
- **Human requests early termination** — set overall status to `Blocked`, log the reason, stop dispatching. State file preserves progress for later resumption.
- **Worktree creation fails** — mark Task as `Blocked` with reason from worktree-management. Do not dispatch. Common causes: path conflict, disk space, branch already checked out in another worktree.
- **Agent needs to resume in existing worktree** — when a blocked Task is unblocked and re-dispatched, the worktree may already exist. Worktree-management Step 2 handles this (detects existing valid worktree and reuses it).
- **Merge conflict during PR review** — human reports the conflict. The orchestrating agent enters the Conflict Resolution Sub-Flow (Step 4). The Task goes from `Done` → `Conflict` → `Implementing` (pipeline restarts). The existing PR should be updated by the force-push after resolution.
- **Wave-boundary rebase conflicts on multiple Tasks** — each conflicting Task enters the sub-flow independently. Non-conflicting Tasks in the wave proceed normally with dispatch.
- **Conflict resolution introduces test failures** — handled naturally because the pipeline restarts from the implementing agent: it re-runs its own test-writing/self-validation (`skill/test-execution`) before the review agent sees the code again.
- **Human resolves conflict but doesn't push** — the implementing agent is re-dispatched and will detect the branch state. If the rebase is incomplete or uncommitted, the agent completes it. Instruct the human to commit and push their resolution before reporting "unblocked."
- **Overlap warning false positive** — two Tasks touch the same file but different sections. No action needed; the warning is informational. Actual conflicts are handled reactively if they occur at merge time.
