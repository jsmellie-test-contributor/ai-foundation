---
name: 'git-workflow-framework'
version: '0.8.0'
description: 'Git workflow for framework-style repositories (no PRs required; every commit passes CI on a push-check branch before landing on main).'
file_patterns: []
---

## Scope

All agents working in repositories where `.aiconfig.json` specifies `"repo_type": "framework"`.

**Also see `steering/engineering/git-workflow-core.md`** — atomic/incremental commit rules, `ai-git` usage, and token handling apply here unchanged and are not restated below.

---

## Rules

### Rule: Main Only Accepts Commits That Have Already Passed CI

No PR is required, but a commit cannot land on `main` untested — the repo's required status checks reject a push to `main` unless that exact commit already has passing checks. The path is:

1. Commit to a branch named `push-check/{short-description}` and push it. CI runs on every push to `push-check/**` (and to `main`).
2. Wait for the required checks to go green on that commit.
3. Fast-forward `main` to that same commit: `ai-git push origin push-check/{short-description}:main`.
4. Delete the `push-check/` branch.

Opening a PR from the branch is equally valid and follows the same CI gate.

If `main` has moved since the branch was cut and the push is no longer a fast-forward, merge `main` into the branch, wait for CI again, then push — see "Do Not Rewrite a Commit After CI Passes".

### Rule: A Governing Plan Must Be Approved Before Implementation

A governing plan must be committed with `Status: Approved` before implementation begins. Follow `skill/plan-lifecycle` for the full Draft → revision → Approved procedure. The plan's Approved commit and the implementation commits are still just ordinary commits to `main` — no branch/PR is implied — but the Approved commit must exist first, as its own commit, before any implementation commit that depends on it.

### Rule: Never Force Push Main

Use `git revert` to undo mistakes.

### Rule: CI Must Pass Before Pushing

CI must be green on a commit before it is pushed to `main`. Run `npm test` locally first as a cheap pre-check — it does not replace CI.

If CI fails, fix the cause. If it is failing for a valid reason you cannot or should not fix in this change (a pre-existing breakage, an infrastructure fault, a check that is wrong), do not bypass, skip, or weaken it — escalate to the managing agent or the human and wait for direction. See `git-workflow-core.md`: "Required CI Checks Gate Main — Never Bypass Them".

### Rule: Do Not Rewrite a Commit After CI Passes

Amending or rebasing changes the commit's SHA, and the green result belongs to the old one. Once CI has passed on a commit, push exactly that commit. If a change is needed or `main` has moved, add a new commit (or merge `main` in) and let CI run again.

### Commit Granularity — Option A (this repo type's default)

**Option A (recommended): Commit per completed plan step.** Each numbered step in the plan's Approach section is its own commit once verified. Directly traceable to the plan; commits naturally carry the Plan ID (`steering/engineering/core.md`: "Every Artifact Must Reference Its Plan ID"). See `git-workflow-core.md`: "Commit Implementation Incrementally" for Options B and C.

---

## Enforcement

- **Plan-approval violations:** Same mechanism as `steering/engineering/core.md`'s Uncommitted-approval entry — implementation without a committed `Approved` status stops immediately; the approval commit is created before continuing.
- **Force-push violations:** Caught at review or by direct observation of `main`'s history. A force-pushed `main` is a HIGH finding regardless of intent.
- **Unverified-push violations:** Mechanically blocked — the required status checks reject a push to `main` whose commit has not passed CI. A push that gets through anyway (a bypass, an admin override, a disabled or weakened check) is a HIGH finding.
- **Post-CI rewrite:** A commit pushed to `main` that differs from the one CI verified is a HIGH finding; the block above normally prevents it.

---

## Rationale

Framework repos are docs and plain text — low risk, easy to revert, so PR overhead isn't justified. What is justified is making sure `main` only ever holds commits CI has verified: the `push-check/` branch step gives a commit its CI run before it lands, without a PR. The plan-commit gate and incremental-commit rules (`git-workflow-core.md`: "Commit Implementation Incrementally") exist even in a low-branching-overhead repo because the risk they mitigate (unverifiable approval, unreviewable giant commits) has nothing to do with branching — it's about the commit history being a trustworthy record on its own.

## Exceptions

- A commit that fixes broken CI still has to pass CI itself — there is no exception to the gate for fixes. If `main` is red and the fix cannot go green, escalate per "CI Must Pass Before Pushing".
- Trivial fixes (typos, comment corrections) with zero architectural impact do not require a governing plan — see `steering/engineering/core.md`: "Raise Discoveries Rather Than Silently Expanding Scope"'s exception for the same threshold.
