---
name: 'git-workflow-framework'
version: '0.7.0'
description: 'Git workflow for framework-style repositories (direct commits to main).'
file_patterns: []
---

## Scope

All agents working in repositories where `.aiconfig.json` specifies `"repo_type": "framework"`.

**Also see `steering/engineering/git-workflow-core.md`** — atomic/incremental commit rules, `ai-git` usage, and token handling apply here unchanged and are not restated below.

---

## Rules

### Rule: Direct Commits to Main Are Permitted

No branch or PR required.

### Rule: A Governing Plan Must Be Approved Before Implementation

A governing plan must be committed with `Status: Approved` before implementation begins. Follow `skill/plan-lifecycle` for the full Draft → revision → Approved procedure. The plan's Approved commit and the implementation commits are still just ordinary commits to `main` — no branch/PR is implied — but the Approved commit must exist first, as its own commit, before any implementation commit that depends on it.

### Rule: Never Force Push Main

Use `git revert` to undo mistakes.

### Rule: Tests Must Pass Before Pushing

Run `npm test` first.

### Commit Granularity — Option A (this repo type's default)

**Option A (recommended): Commit per completed plan step.** Each numbered step in the plan's Approach section is its own commit once verified. Directly traceable to the plan; commits naturally carry the Plan ID (`steering/engineering/core.md`: "Every Artifact Must Reference Its Plan ID"). See `git-workflow-core.md`: "Commit Implementation Incrementally" for Options B and C.

---

## Enforcement

- **Plan-approval violations:** Same mechanism as `steering/engineering/core.md`'s Uncommitted-approval entry — implementation without a committed `Approved` status stops immediately; the approval commit is created before continuing.
- **Force-push violations:** Caught at review or by direct observation of `main`'s history. A force-pushed `main` is a HIGH finding regardless of intent.
- **Untested-push violations:** Caught during review or CI. A push with failing tests, when the push itself doesn't fix the breakage (per Exceptions), is a HIGH finding.

---

## Rationale

Framework repos are docs and plain text — low risk, easy to revert. Branching overhead isn't justified. The plan-commit gate and incremental-commit rules (`git-workflow-core.md`: "Commit Implementation Incrementally") exist even in a low-branching-overhead repo because the risk they mitigate (unverifiable approval, unreviewable giant commits) has nothing to do with branching — it's about the commit history being a trustworthy record on its own.

## Exceptions

- When a code review bot or CI is added, this file will be replaced with a PR-based workflow.
- Pushing with broken tests is only acceptable if the commit itself fixes the breakage.
- Trivial fixes (typos, comment corrections) with zero architectural impact do not require a governing plan — see `steering/engineering/core.md`: "Raise Discoveries Rather Than Silently Expanding Scope"'s exception for the same threshold.
