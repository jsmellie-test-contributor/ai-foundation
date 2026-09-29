# Decision Record: Git Workflow Mode for `ai-foundation`

## Metadata

| Field          | Value                                  |
| -------------- | -------------------------------------- |
| Decision ID    | AIF-PROC-005                           |
| Project        | ai-foundation                          |
| Tier           | A                                      |
| Domain         | process                                |
| Status         | Deferred                               |
| Author (Agent) | Architect                              |
| Approved By    | Pending                                |
| Created        | 2026-08-13                             |
| Referenced By  | AIF-PROC-003, AIF-PROC-004             |
| References     | AIF-PROC-001, AIF-PROC-002             |
| Tags           | git-workflow, orchestration, worktrees |

---

> **Archived** (process-model check 27, 2026-09-25): `Draft` → `Deferred` — never reached
> `Approved`, so `Superseded` doesn't apply (`status-vocabulary.md`'s transition table).
> Its convention (git workflow mode) moves to `steering/` rather than remaining a standing
> decision record, per its row in `docs/process-model.md`'s Decision-record disposition
> table. Kept here as historical record — not converted to MADR.

## Problem Statement

Engineering-Manager's branch+PR cycle already contradicts the repo's declared workflow mode. `.aiconfig.json` sets `repo_type: framework`, and `git-workflow-framework.md` says direct commits to `main` are permitted with no branch or PR required. But Engineering-Manager's hard rules state "EVERY CHUNK GETS ITS OWN BRANCH AND WORKTREE. This is non-negotiable" — unconditionally, with no `repo_type` check — and `chunk-orchestration` goes further: after Principal-Engineer approves a chunk, Software-Engineer opens a PR (`gh pr create`) and the wave does not advance until the human confirms that PR is merged. This is not just "branching" — it is the full project-style cycle (branch → worktree → PR → human merge → teardown), unconditionally, for every orchestrated chunk. It also has a mechanical dependency: `git worktree` requires each active worktree to be on a distinct branch, so parallel chunk dispatch (the reason orchestration exists, per AIF-PROC-002) is not possible without branches in the first place. Now that AIF-PROC-001 routes `bin/`/`lib/` work through Tech-Lead → Engineering-Manager, this contradiction becomes live: real work is about to hit a rule ("no branch or PR needed") that Engineering-Manager will not actually follow.

---

## Constraints & Requirements

What was non-negotiable:

- The resolution must not contradict Engineering-Manager's existing hard rule without either changing the rule or changing `repo_type` — leaving both as-is is not an option.
- Whatever the resolution, it must not silently weaken the human-approval gate (`skill/plan-lifecycle`).

What was a preference but not a hard requirement:

- Keep ceremony proportional to risk (declarative one-line changes shouldn't cost as much process as a resolver rewrite).

---

## Options Explored

### Option A: Switch `repo_type` to `project`

**Summary**: Adopt the branch-per-change, PR-and-human-merge workflow (`git-workflow-projects.md`) repo-wide. Plans, orchestration state, and knowledge continue to commit directly to `main` (already true under the `project` workflow's own Rule 1); everything else — including declarative AI-component edits made outside the Epic/Chunk pipeline — moves to branch + PR + human merge.
**Strengths**: Removes the contradiction with Engineering-Manager's existing "every chunk gets a branch, non-negotiable" rule entirely — one workflow, no exceptions to remember. Matches the repo's growing risk profile: real, testable CLI code, multiple agents contributing, actual breakage possible on `main`.
**Weaknesses**: Every declarative change — including a Tier 1 one-line steering wording fix — now requires a branch and a human-merged PR, a large ceremony increase for what is today (and will remain) the majority of this repo's edits.

### Option B: Keep `repo_type: framework`; scope the full branch→PR→merge cycle to Epic/Chunk-orchestrated work only

**Summary**: Leave direct-to-`main` commits as the default for ad-hoc/Tier 1/Tier 2 AI-Engineer work (the common case, and the only case this repo's `repo_type: framework` classification is actually describing). Document an explicit, named exception in `git-workflow-framework.md`: any chunk dispatched through Tech-Lead → Engineering-Manager — software-track or AI-track — always uses the complete project-style cycle Engineering-Manager already enforces (branch, worktree, PR via `gh pr create`, human-confirmed merge, teardown), regardless of `repo_type`.
`git worktree`'s one-branch-per-worktree constraint is satisfied as a direct consequence — every dispatched chunk already gets its own branch under this exception, which is what makes concurrent worktrees (AIF-PROC-003) possible at all. This codifies what Engineering-Manager already does today rather than changing it, and this repo already has a real GitHub remote (`origin`), so `gh pr create`/merge is mechanically usable, not aspirational.
**Strengths**: No change to Engineering-Manager or `chunk-orchestration` behavior — it already always branches and already opens/waits on PRs; this only makes the steering documentation match reality instead of contradicting it. Preserves low-ceremony direct commits for the bulk of routine declarative changes, keeping process proportional to risk. AIF-PROC-001 already routes all `bin/`/`lib/` work through the Epic/Chunk pipeline, so the risky code path is already covered by the full branch+PR+merge cycle under this option.
**Weaknesses**: Two workflows coexist in one repo, distinguished by "was this orchestrated through an Epic/Chunk" rather than a single repo-wide switch — a subtler rule to hold in mind than Option A's uniform default. Relies on AIF-PROC-001 having correctly routed all code-touching work through the pipeline; an agent that skips Tech-Lead entirely for a `lib/`/`bin/` change would (correctly, per Rule 1 of `engineering-core.md`) already be blocked for lacking an approved plan, so this risk is bounded by an existing rule rather than a new one.

### Option C: Path-scoped branching inside a single declared mode

**Summary**: Keep `repo_type: framework` and narrow Engineering-Manager's branching requirement itself to software-track chunks only; AI-track chunks dispatched inside the same Epic commit directly to `main` even mid-orchestration.
**Strengths**: Lowest ceremony specifically for declarative content, which changes often and rarely conflicts.
**Weaknesses**: Splits Engineering-Manager's "every chunk gets a branch" hard rule into a per-track exception, adding real branching logic inside worktree-management and chunk-orchestration (mixed worktree/non-worktree dispatch within one wave) — more moving parts than Option B for a narrower benefit. The risk premise is also weaker than it looks: declarative components (agent prompts, steering rules)
directly govern every future agent's behavior across every repo that installs them, so an unreviewed direct-to-main edit there is not obviously lower-risk than an unreviewed code edit.

---

## Decision

**Chosen approach**: Option B — keep `repo_type: framework`, document the existing Engineering-Manager branch→PR→merge cycle as an explicit exception for any Epic/Chunk-orchestrated work.

**Rationale**: Engineering-Manager's "non-negotiable" branch-per-chunk rule — and the PR-and-human-merge cycle that follows it — already exists and already runs today for any orchestrated work; this decision does not change agent behavior, it resolves a documentation contradiction so the steering files stop asserting something Engineering-Manager doesn't do. It also directly answers the mechanical question of how `git worktree` (AIF-PROC-003) is even possible under a `framework` classification:
worktrees require distinct branches, and this exception is what guarantees every orchestrated chunk has one, regardless of what `repo_type` says about the repo's _default_ workflow. Given AIF-PROC-001 already funnels all `bin`/`lib` code work through Tech-Lead's Epic/Chunk pipeline, the actually-risky path is already covered by the full cycle under this option, without imposing PR ceremony on the routine declarative edits that make up most of this repo's activity.

**Trade-offs accepted**:

- The repo now has a documented conditional rule ("full branch→PR→merge cycle if orchestrated, direct commit otherwise") instead of one flat rule. Mitigated by making the condition itself unambiguous: any work dispatched via `chunk-orchestration` goes through the full cycle; any work done directly by an agent outside that pipeline does not.

---

## Impact on Planning

- `steering/engineering/git-workflow-framework.md` needs a new rule documenting this exception (full branch → worktree → PR → human-merge cycle for any Engineering-Manager-orchestrated work), so the contradiction with Engineering-Manager's hard rule is resolved in the text, not just in practice.
- No `.aiconfig.json` change is required — `repo_type` stays `framework`.

---

## Resolved Items

| #   | Item                                                                                                                                            | Resolution                                                                                                                                                                                                                                                                                                                                                                                                     |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Should `ai-foundation` switch `repo_type` to `project`?                                                                                         | No — stays `framework`. Engineering-Manager's existing branch → worktree → PR → human-merge cycle is documented as an explicit exception for orchestrated work instead.                                                                                                                                                                                                                                        |
| 2   | If `repo_type` stays `framework`, how can `git worktree` work for parallel orchestrated chunks, given each worktree requires a distinct branch? | It already does — this exception guarantees every Engineering-Manager-dispatched chunk gets its own branch unconditionally, regardless of `repo_type`. The `framework` classification only ever described the _default_ (non-orchestrated) path; it never applied to Engineering-Manager's dispatch loop, which has never checked `repo_type` at all. See also AIF-PROC-003 for the worktree mechanism itself. |
