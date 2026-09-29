# Orchestration State Schema

The orchestrating agent maintains an orchestration state file throughout execution.
This is the single source of truth for Task pipeline status, wave progression,
escalations, and the coordination work log.

Start from the template at `skills/task-orchestration/assets/orchestration-state.json`.

---

## Location

```
{paths.features}/{FeatureID}/orchestration-state.json
```

Resolved from `.aiconfig.json` at project root. Default: `plans/features/` — sibling to
the Feature Plan (`plan.md`) and `tasks.json`.

---

## Fields

### Top-level

| Field          | Type   | Required | Description                                          |
| -------------- | ------ | -------- | ---------------------------------------------------- |
| `feature_id`   | string | Yes      | Parent Feature ID for traceability                   |
| `status`       | string | Yes      | Overall status: `In Progress`, `Complete`, `Blocked` |
| `current_wave` | number | Yes      | Index of the active wave (0-based)                   |
| `total_waves`  | number | Yes      | Total number of waves computed from DAG              |
| `tasks`        | array  | Yes      | Array of Task state objects                          |
| `escalations`  | array  | Yes      | Array of issues raised to human                      |
| `log`          | array  | Yes      | Chronological work log entries                       |

### Task state object

| Field            | Type         | Required | Description                                              |
| ---------------- | ------------ | -------- | -------------------------------------------------------- |
| `id`             | string       | Yes      | Task ID (matches tasks.json)                             |
| `wave`           | number       | Yes      | Which wave this Task belongs to (0-based)                |
| `status`         | string       | Yes      | Current status (see transitions below)                   |
| `branch`         | string       | Yes      | Branch name, empty string if not yet started             |
| `worktree_path`  | string       | Yes      | Worktree directory path, empty string if not yet created |
| `pr_number`      | number\|null | Yes      | PR number once opened (as a draft), null before then     |
| `pr_url`         | string\|null | Yes      | PR URL once opened, null before then                     |
| `iterations`     | number       | Yes      | Review loop count (0–5)                                  |
| `blocked_reason` | string\|null | Yes      | Null when not blocked, reason string when blocked        |

There is no `agents` field — every Task is owned end-to-end by one implementing
agent (Software-Engineer today; see `docs/process-model.md`'s Agent roster). Re-add a
selector field only if a second implementing agent role is ever introduced.

### Task status values

| Status         | Meaning                                          |
| -------------- | ------------------------------------------------ |
| `Ready`        | Dependencies satisfied, waiting for dispatch     |
| `Implementing` | The implementing agent is working                |
| `Reviewing`    | The review agent is reviewing                    |
| `Done`         | Approved and complete                            |
| `Conflict`     | Merge conflict detected — resolution in progress |
| `Blocked`      | Cannot proceed — see `blocked_reason`            |

### Status transitions

```
Ready → Implementing → Reviewing → Done
                            │
                            ▼
                    Implementing (review loop, iterations++)

Any pipeline status → Conflict (when merge conflict detected)
Conflict → Implementing (when resolved — pipeline restarts, iterations reset to 0)
Conflict → Blocked (when the implementing agent cannot resolve — human intervention needed)

Any status → Blocked (with reason)
Blocked → Ready (when human unblocks)
```

This diagram is the single source of truth for which transitions are legal. What
triggers each one, and what else happens alongside it (iteration caps, PR
draft/ready-for-review timing, conflict-resolution restart behavior), is `SKILL.md`'s
Steps 3–4 — not restated here.

### Escalation object

| Field       | Type    | Required | Description                         |
| ----------- | ------- | -------- | ----------------------------------- |
| `task_id`   | string  | Yes      | Which Task triggered the escalation |
| `reason`    | string  | Yes      | Why it was escalated                |
| `raised_at` | string  | Yes      | ISO 8601 timestamp                  |
| `resolved`  | boolean | Yes      | Whether the human has resolved it   |

### Log entry object

| Field       | Type         | Required | Description                             |
| ----------- | ------------ | -------- | --------------------------------------- |
| `timestamp` | string       | Yes      | ISO 8601 timestamp                      |
| `agent`     | string       | Yes      | Which agent performed the action        |
| `action`    | string       | Yes      | What happened (see actions below)       |
| `task_id`   | string\|null | Yes      | Which Task (null for wave-level events) |
| `details`   | string       | Yes      | Human-readable description              |

### Log actions

<!-- decision_handoff_detected, decision_authored, decision_handoff_resolved rows below: Authored under AIF-002-006 -->

| Action                      | Description                                                                                                                             |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `wave_started`              | A new wave began dispatching                                                                                                            |
| `wave_completed`            | All Tasks in a wave are Done                                                                                                            |
| `task_dispatched`           | Task assigned to an agent                                                                                                               |
| `task_status_changed`       | Task transitioned to a new status                                                                                                       |
| `pr_created`                | Draft PR opened for a Task; `pr_number`/`pr_url` recorded in Task state                                                                 |
| `review_loop`               | Task returned from review for correction                                                                                                |
| `escalation_raised`         | Issue escalated to human                                                                                                                |
| `task_blocked`              | Task marked as blocked                                                                                                                  |
| `task_unblocked`            | Task unblocked and returned to Ready                                                                                                    |
| `decision_handoff_detected` | A dispatched subagent reported a genuine architectural/product fork requiring an Architect-owned ADR, and the Task was marked `Blocked` |
| `decision_authored`         | A Draft ADR was authored and committed by Architect in response to a decision hand-off                                                  |
| `decision_handoff_resolved` | The hand-off decision reached `Approved` and the Task was unblocked via the existing generic unblock mechanic                           |
| `conflict_detected`         | Merge conflict detected on a Task branch                                                                                                |
| `conflict_resolved`         | The implementing agent successfully resolved the merge conflict                                                                         |
| `conflict_escalated`        | Conflict could not be auto-resolved, escalated to human                                                                                 |
| `overlap_warning`           | File overlap detected between Tasks in the same wave                                                                                    |
| `wave_rebase`               | Wave boundary rebase performed on existing branches                                                                                     |
| `worktree_removed`          | Worktree torn down after PR merge confirmed                                                                                             |
| `orchestration_complete`    | All waves done, Feature fully implemented                                                                                               |

---

## Rules

- The orchestration state file is updated after every status transition.
- Log entries are append-only — never delete or modify past entries.
- Only the orchestrating agent writes to this file.
- The `current_wave` only advances when all non-blocked Tasks in the wave are `Done`.
- Overall `status` is `Blocked` if all remaining Tasks are blocked and no progress can be made.
- Overall `status` is `Complete` when all Tasks are `Done`.
