---
name: 'git-workflow-projects'
version: '0.7.2'
description: 'Git workflow for project repositories where agents produce code.'
file_patterns: []
---

## Scope

All agents working in repositories where `.aiconfig.json` specifies `"repo_type": "project"` (this is the default when `repo_type` is not set).

**Also see `steering/engineering/git-workflow-core.md`** — atomic/incremental commit rules, `ai-git` usage, and token handling apply here unchanged and are not restated below.

---

## Rules

### Plans

### Rule: Plans, Orchestration State, and Knowledge Are Committed Directly to Main

Files under `paths.plans` (which the orchestration state file lives under, via `paths.features`) and `paths.knowledge` are planning and reference artifacts, not deployable code — they do NOT require a branch or PR. Follow `skill/plan-lifecycle` for the full procedure:

- Commit and push each version to main BEFORE presenting it to the human for review (Draft, each revision, and the final Approved/Deferred decision are all separate commits).
- Include the Plan ID or document name in the commit message.
- The human approval step is the review conversation; the `Approved` status commit is what actually satisfies the gate — the conversation alone does not.

### Rule: Implementation Must Not Begin Until the Governing Plan Is Approved

A `Draft` or `Deferred` plan does not satisfy this — see `steering/engineering/core.md`: "Implementation Follows the Complexity-Tiers Gate" → "Plans Are Committed Artifacts, Not Chat Output".

### Branching

### Rule: All Work Happens on a Branch

Never commit directly to `main` (except plans/knowledge per "Plans, Orchestration State, and Knowledge Are Committed Directly to Main" above).

### Rule: Branch Naming Convention

`{plan-id}/{short-description}` (e.g. `PROJ-001/add-user-service`).

### Rule: One Task Per Branch

Do not mix unrelated work.

### Commits

### Rule: Never Force Push

No `--force` or `--amend` on pushed commits.

### Rule: Include Plan ID in the First Commit

Include the Plan ID in the first commit message on a branch.

### Commit Granularity — Option A (this repo type's default)

**Option A (recommended): Commit per completed plan step/task.** Each task in the Feature Plan's `tasks.json` is its own commit once verified. Directly traceable to the plan; commits naturally carry the Plan ID (`steering/engineering/core.md`: "Every Artifact Must Reference Its Plan ID"). See `git-workflow-core.md`: "Commit Implementation Incrementally" for Options B and C.

### Merging

### Rule: Main Is Always Deployable

Do not merge broken code.

### Rule: Squash Merge Preferred

Keeps main history clean.

### Rule: Delete Branch After Merge

### Rule: Human Reviews and Merges Every PR

No agent may merge to main.

---

## Enforcement

- **Plan-approval violations:** Same as `steering/engineering/core.md`'s Uncommitted-approval entry.
- **Direct-to-main violations:** Caught at review or by direct observation of `main`'s history. Any non-plan/non-knowledge commit landing on `main` outside a PR is a HIGH finding.
- **Force-push violations:** A HIGH finding, same as `git-workflow-framework.md`'s own entry.
- **Missing Plan ID:** Caught during Principal-Engineer review — same MEDIUM severity as `steering/engineering/core.md`: "Every Artifact Must Reference Its Plan ID"'s own enforcement entry.
- **Broken-main or agent-merge violations:** Caught immediately. A human reverts or fixes forward; a commit merged by an agent rather than a human is treated as a process failure requiring retroactive human review.

---

## Rationale

Branches contain blast radius. Human-only merges ensure nothing ships without oversight. Plans are committed ahead of implementation so the approval gate is a verifiable git artifact rather than a claim, and implementation is committed incrementally (`git-workflow-core.md`: "Commit Implementation Incrementally") so a squash-merged PR's construction can still be reviewed commit-by-commit before it lands.

## Exceptions

- Trivial fixes (typos, comment corrections) may use a branch without a full plan but still require a PR and human merge.
