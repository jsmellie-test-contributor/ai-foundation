---
name: 'pr-stewardship'
version: '0.3.0'
description: 'Drives an open pull request to a green, mergeable state — checking CI, merge conflicts, and review feedback, and fixing or reporting what blocks it.'
---

## Purpose

Checks an open pull request's CI status, merge state, and review feedback in one pass, and acts: fixes failing CI, resolves a merge conflict, responds to review comments, or reports the specific blocker to the human. Poll-based, not subscription-based — it reads and writes GitHub through `ai-git`, and works whether it runs as a short-lived local dispatch or a long-running cloud session.

This skill does one check-and-act pass per invocation; it does not loop or sleep. Whoever dispatches it (a human, an orchestration skill, a scheduled re-check) decides how often to re-invoke it until the PR is done.

## Inputs

- **PR number or URL** — which pull request to check
- **Repository** — owner/name, if not already implied by the working directory's git remote
- **GitHub access method** — always through `ai-git`; never raw `gh`/`git`, never GitHub MCP tools. Locally, `ai-git gh-*` subcommands work. In a Claude Code cloud session use `ai-git gh-api` — see the cloud table below.

**Cloud table.** The cloud session proxy blocks GraphQL, so `gh pr ...` (every `ai-git gh-pr-*`, including `ai-git gh-pr-create`) and `gh repo view` (`ai-git gh-repo-view`) fail there with HTTP 403 and are unavailable. Use REST through `ai-git gh-api`, repository-scoped paths only (`repos/{owner}/{repo}/...`; non-repo paths are blocked too):

| Need                                         | Call                                                                                                                     |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Mergeable state                              | `ai-git gh-api repos/{owner}/{repo}/pulls/{n}` (`mergeable`, `mergeable_state`)                                          |
| CI status                                    | `ai-git gh-api repos/{owner}/{repo}/commits/{head_sha}/check-runs`                                                       |
| Review comments                              | `ai-git gh-api repos/{owner}/{repo}/pulls/{n}/comments` (also `.../reviews`, `issues/{n}/comments`)                      |
| Create a PR (draft)                          | `ai-git gh-api repos/{owner}/{repo}/pulls --method POST -f title=... -f head=... -f base=main -f body=... -F draft=true` |
| Post a comment                               | `ai-git gh-api repos/{owner}/{repo}/issues/{n}/comments --method POST ...`                                               |
| Review threads, auto-merge, ready-for-review | The proxy's `ccr/...` routes (the proxy's 403 message lists them), not GraphQL                                           |

GitHub-side actions in cloud carry the proxy's identity, not the `ai-git` token's.

## Steps

### Step 1 — Check mergeable state

Read the PR's mergeable state (locally `ai-git gh-pr-view <n> --json mergeable,mergeStateStatus`; in cloud the cloud table in Inputs). If it is not cleanly mergeable:

1. Merge the base branch into the PR branch. Regenerate lockfiles or other generated files with the repo's own tooling — never by hand.
2. Never rewrite history on a branch you did not create (no rebase, amend, or force-push — a merge commit is always safe). On a branch you created yourself, follow `steering/engineering/git-workflow-projects.md`'s branching convention instead.
3. Run the repo's own validation/tests locally, then push.
4. If both sides changed the same logic such that picking either loses behavior, stop and report to the human instead of guessing.

### Step 2 — Check CI status

Read the check-run/status results for the PR's current head commit. If any are red:

1. Rule out a failure that isn't this PR's: the same error reproduces on an unmodified rerun, or the same check is already red on the base branch.
2. If it is a pre-existing base failure with a known fix (a revert, or a fix already merged or available elsewhere), port that fix into this PR and push.
3. Otherwise, root-cause and fix it directly when the failure is in code this PR touches or breaks.
4. Never skip, disable, or quarantine a test to reach green, and never push an empty commit or close/reopen the PR to force a re-run.
5. If you cannot fix it, post one comment on the PR stating exactly what is failing, why, and what you need — do not leave it silently red.

### Step 3 — Check review feedback

Read open review threads and comments.

1. Implement and push small, unambiguous asks (a nit, a rename, an added test).
2. For larger or ambiguous asks (a design change, a multi-file refactor), reply with your assessment rather than guessing at an implementation.
3. Resolve the threads you addressed.

### Step 4 — Land a green push-check branch

Applies only to a `push-check/**` branch in a `repo_type: framework` repo (`steering/engineering/git-workflow-framework.md`: "Main Only Accepts Commits That Have Already Passed CI"), where the agent that owns the branch lands it. A PR in a project repo is merged by a human (`steering/engineering/git-workflow-projects.md`: "Human Reviews and Merges Every PR") — skip this step there.

1. Confirm every required check is green on the branch's current head commit and nothing has been pushed since.
2. Fast-forward `main` to that exact commit: `ai-git push origin push-check/{short-description}:main`. Never amend or rebase first — a new SHA has not passed CI.
3. If the push is rejected as not a fast-forward, `main` has moved: merge `main` into the branch and push it so CI runs again, then return here once it is green.
4. If it is rejected because a required check has not passed on that commit, do not bypass it — escalate per `steering/engineering/git-workflow-core.md`: "Required CI Checks Gate Main — Never Bypass Them".
5. Delete the `push-check/` branch once `main` has it.

### Step 5 — Report status

If nothing needed fixing and the PR is green and mergeable, there is nothing further to do or report. Otherwise, summarize what changed (a pushed fix) or what is blocking (a comment already posted per Steps 2–3) so the caller knows whether the PR is done or needs another pass.

## Outputs

- **A pushed fix**, if Steps 1–3 found something to fix
- **A landed `main`**, if Step 4 fast-forwarded a green `push-check/` branch
- **A PR comment**, if something is blocking that this skill cannot resolve on its own (or, for a `push-check/` branch with no PR, an escalation to the managing agent or human)
- **A status** (done / needs another pass / blocked) returned to whoever invoked this skill

## Edge Cases

- **`ai-git` is unavailable or cannot resolve its token** — stop and report to the human; this skill has no other GitHub access path.
- **CI is still running** — not a failure; report "pending" and let the caller decide when to re-check.
- **Everything is green, only waiting on a human reviewer's approval** — say so once; do not re-push or nudge repeatedly.
- **Suspected flaky failure** — re-run once if `ai-git` supports it; a second failure is treated as real, not a flake.
- **The PR was opened by a different agent or session** — still driveable the same way; nothing in this procedure assumes the invoker created the PR.
