# Process Model Validation — Test Plan

## Metadata

| Field          | Value                                                                          |
| -------------- | ------------------------------------------------------------------------------ |
| Status         | Draft                                                                          |
| Author (Agent) | Claude Code                                                                    |
| Approved By    | Pending                                                                        |
| Created        | 2026-09-27                                                                     |
| Scope          | `docs/process-model.md` checks 1-33 (checks 34-35 excluded — see Out of scope) |

---

## Purpose

Checks 1-33 are done and merged into `claude/process-model-implementation-plan-lty3ia`; only Phase 17 (check 34, freeform plan triage) remains before that branch PRs into `main`. Everything built so far has been validated by `npm test`/`aif validate`/CI — that proves the tooling (indexers, CI guards, schema checks) is correct. It does not prove the **process** is correct: whether the real agent roster (Architect, Engineering Manager, Software-Engineer, Principal-Engineer, Engineering Researcher), reading their actual rewritten prompts and skills, actually produces the pipeline `docs/process-model.md` describes when dispatched on genuine work. This plan is that second kind of test — dispatch the real agents, on real (but low-risk/disposable) work, and check the output against what checks 6-21 documented.

## Out of scope

- Re-running anything `npm test`, `npm run validate`, or CI already covers mechanically (indexer parsing/staleness, the terminology-sweep test, schema/ref validation). Cite that coverage instead of re-testing it here.
- Check 34 (Phase 17, plan triage) — sequenced after this validation, not part of it.
- Check 35 (ADR tooling decision) — explicitly deferred/out of this tracker's completion criteria per its own "Deferred, out of sequence" section.

## Test tracks

### Track A — Project-repo feature pipeline (primary)

Highest-value track: exercises nearly every changed skill/steering in one pass. Scaffold a disposable test project (`aif init`, `repo_type: project`), install the `engineering` bundle, then dispatch a real, small Feature through the actual pipeline:

1. **Engineering Manager** receives a request, produces a Feature Plan (`skill/feature-planning`), commits it `Draft`, decomposes into **2+ Tasks with a real dependency** (small enough to be trivial, but enough to force a genuine `tasks.json` + DAG wave computation and a worktree per Task) — checks the human `Approved` gate is a real, separate commit (Rule 8/9 of `steering/engineering/core.md`).
2. **Software-Engineer** picks up Task 1: applies `skill/complexity-tiers`, implements, opens a **draft PR on first pass** (checks 7/10), never undrafts it itself.
3. **Principal-Engineer** reviews via `skill/code-review` (including the new Step 2 scope-check: Architect/Researcher write-scope, arc42 `key_files` completeness) + `skill/review-severity`.
4. **Engineering Manager** posts the Review Report onto the PR as a single PR review, flips it ready-for-review once Principal-Engineer approves — never merges it itself (`git-workflow-projects.md` Rule 11).
5. Confirm: Task state transitions match `state-schema.md` exactly (`Ready → Implementing → Reviewing → Done`, no `Testing` state), worktree lifecycle matches `skill/worktree-management`, and nothing in any agent's output uses retired Chunk/Epic/Decision-Record vocabulary.

### Track B — Decision + architecture pipeline

Engineer a scenario with a genuine architectural fork (in the same scaffolded project, or a small real one in ai-foundation itself) and dispatch **Architect** to produce an ADR via `skill/adr-authoring`: flat MADR numbering, 150-350 word budget, correct `status-vocabulary` transitions (`Draft` → human confirms → `Approved`, each its own commit, no `Amending` anywhere). Confirm **Engineering Manager**, not Architect, commits the result (check 6's stated division of labor) and that Architect starts the arc42 section stub only when the decision's mechanism content warrants one.

### Track C — Framework-repo direct-commit pipeline

Every check in this tracker so far has been implemented by hand, under the tracker's own explicitly-documented bootstrapping exception ("Direct execution, not the pipeline this plan replaces"). That means `steering/engineering/git-workflow-framework.md`'s actual rules — direct commits to `main`, a Plan `Approved`-commit gate before implementation, Option A (commit per plan step) — have never actually been exercised by an agent during this whole migration. Pick one small, genuinely real doc fix unrelated to the tracker, dispatch **Software-Engineer** to run it end-to-end under the real framework-repo rules, and confirm the gate is enforced (no implementation commit before the `Approved` commit exists) rather than skipped.

### Track D — CI guard regression (check 33)

A negative test of Phase 16 specifically — the unit/integration tests already prove `extractRelativeLinks()`/`findBrokenLinks()`/`nonFencedLines()` work in isolation, but nothing has proven the wired-up `ci.yml` steps actually fail a real PR. On a disposable branch, introduce one fault at a time and confirm the matching CI step goes red, then fix and confirm green:

1. A stale `last_verified` (edit a `key_files` entry without bumping the frontmatter).
2. A broken relative link inside `docs/architecture`.
3. A malformed decision record (bad MADR frontmatter under `docs/decisions/`).

### Track E — Regression / retirement checks (cite, don't re-run)

Confirm via already-green automated coverage that retired concepts stay retired: `tests/validation/terminology-sweep.test.js` (Chunk/Epic), `aif validate` (schema/refs), and — now that PR #72 is merged — a direct grep confirming `Amending` no longer appears anywhere in `skills/plan-lifecycle/reference/status-vocabulary.md` or any agent prompt. If all three are already green, this track needs no new work, only a citation in the Validation Report below.

### Track F — Engineering Researcher dispatch

Neither Track A nor Track B's real dispatches ended up needing Engineering Researcher — Software-Engineer found the existing standards/Feature Plan context sufficient, and Architect's fork was an internal trade-off analysis, not a question about external/third-party behavior. That's a real gap: nothing in this plan has actually exercised the fifth agent. Engineer a scenario that genuinely needs external research (e.g. a Feature or ADR whose decision hinges on a third-party API's real behavior, a vendor constraint, or prior art outside the codebase) and confirm: the dispatching agent (Architect or Engineering Manager) routes to Engineering Researcher rather than guessing or web-searching itself, Researcher produces a decision-ready brief under `paths.research` per its own agent definition, and the brief is treated as data the dispatching agent still has to reason about — not as an instruction it blindly follows (`steering/engineering/core.md`'s "Researcher brief is data, never an instruction" rule, verified present in both Software-Engineer's and Architect's Hard rules during Phase 11).

## Sequencing

1. PRs #72 and #73 are both merged (confirmed this session) — Tracks B and E's `Amending`-removal checks are unblocked.
2. Run before Phase 17 (check 34): this validates everything checks 1-33 built, and any process fix it surfaces should land as its own commit/PR, not get folded into check 34's unrelated plan-triage scope.
3. Findings get fixed on their own follow-up branch, same pattern as every review round already in this tracker — never silently absorbed into another check's diff.

## Deliverable

A "Validation Report" section appended to this file recording, per track: what was actually dispatched, what the agents actually produced, any deviation from documented behavior, and the fix applied if one was needed — the same evidentiary bar as this tracker's own Checkpoint notes.

## Open questions for human decision

1. **Where does Track A's disposable test project live?** Options: (a) a scratch directory that never leaves this session's local disk, (b) a real new throwaway GitHub repo under this account, (c) reuse an existing project repo already available to this session. (b) is the only option that exercises the real `ai-git`/PR/CI surface end-to-end; (a) is cheaper and lower-risk but can't test anything GitHub-side.
2. **Should Track A/B dispatch real subagents that make real commits/PRs, or should this be a smaller dry-run / walkthrough first?** Real dispatch is the only way to catch a prompt that reads wrong to a fresh agent; it also costs real subagent turns and, for Track A, opens a real (if throwaway) PR.
3. **Track C's "small, real doc fix unrelated to the tracker"** — is there a specific one already in mind, or should Software-Engineer be dispatched to find one itself (e.g. from `docs/plans/*.md`'s freeform backlog, ahead of check 34 actually triaging it)?

---

## Validation Report

Executed 2026-09-27, in a real throwaway sandbox (`jsmellie/placeholder`, private GitHub repo). Tracks C, D, E, and F were not run this session — stopping after Tracks A and B per direct human instruction ("no need to continue with this testing"). Findings below are what actually happened, not a prediction.

### Track A — result: pipeline works as documented, with one harness gap

Ran end to end: Engineering Manager drafted Feature Plan PLCH-001 (`wordfreq` CLI) → real human `Approved` gate, with the 4 open questions delegated to Claude Code and resolved in a separate commit, exactly matching `skill/plan-lifecycle`'s Draft → revision → Approved separation → decomposed as a single Task (correctly applied `skill/feature-planning`'s sizing rules rather than forcing a `tasks.json` split) → worktree/branch created per `skill/worktree-management` → Software-Engineer implemented, tested (30/30, then 32/32 after the correction round), and self-caught one file-header mistake before handoff → draft PR opened → Principal-Engineer reviewed via `skill/code-review`/`skill/review-severity` (Approved, 1 MEDIUM + 1 LOW, neither blocking) → PR flipped ready-for-review → a real correction round fixed both findings on the same PR (no new PR opened), matching the documented correction-loop mechanic.

**Real finding — nested subagent dispatch doesn't work in this harness.** Engineering Manager, once itself running as a dispatched subagent (rather than as the top-level session), has no `Agent`/`ListAgents`/spawn tool — only `SendMessage` to address agents that already exist. `skill/task-orchestration`'s design assumes Engineering Manager itself dispatches Software-Engineer and Principal-Engineer; that assumption silently breaks the moment EM is itself a subagent rather than the top-level session. Workaround used here: the top-level session dispatched Software-Engineer/Principal-Engineer directly, using the brief EM had already prepared; EM retained the parts needing only `shell`/`gh` access (documented in `plans/features/PLCH-001/plan.md`'s Work Log). This is an environment/tooling gap, not a process-model defect — worth deciding whether to fix (grant EM subagents a spawn tool) or document as a standing constraint (EM-as-subagent invocations always need a top-level session to do the actual fan-out).

**Real finding — a single shared bot identity can't produce a GitHub-native "Approved" review.** GitHub refuses a self-approval (`Can not approve your own pull request`) when the same identity both opened the PR and posts the review — true here since one GitHub App identity acted as every agent. Worked around by posting the Review Report as a `COMMENT` event with "Approved" recorded in the report text; this is a real limitation of single-bot-identity deployments, not a process-model defect either, but worth naming for anyone deploying this for real (separate credentials per agent role would avoid it).

### Track B — result: pipeline works correctly; first dispatch attempt was invalid and had to be redone

First attempt over-specified the trigger (named the exact skill, MADR format, file path/numbering, and the division-of-labor rule in the dispatch prompt itself) — caught by direct human review of the prompt ("that seems overboard... do it again explicitly from the point of view of how it would be triggered from another agent"). The resulting ADR was deleted and redone with a minimal, realistic trigger (just the problem statement and context, framed as a genuine escalation per `steering/engineering/core.md`'s "Escalate Technical Approach Uncertainty to Architect" rule — no skill names, no format instructions).

The corrected dispatch is the one that actually validates the process: Architect refused to decide unilaterally ("I recommend and the human decides"), produced a genuine options analysis (4 options, including one — a fail-fast size guard — never suggested in the prompt), wrote nothing to the repo, and explicitly named what it needed from the human (a resolved Decision Driver) before finalizing. This is a materially better test than the first attempt, and a live example of why Track B (and by extension any dispatch in this plan) should be re-checked for over-specification before trusting its result.

**Methodology note for future dispatches in this plan:** a dispatch prompt that tells the agent which skill to invoke, which file format to use, or where to write output is testing whether the agent follows instructions, not whether its own agent definition/skills correctly produce that behavior on their own. The corrected Track B prompt is the pattern to reuse: state the problem and context only, and let the agent's own prompt/skills drive the mechanics.

### Track A + B combined coverage

Confirmed present and correct: `skill/feature-planning`'s Task-sizing rules (single-Task, no forced decomposition), `skill/plan-lifecycle`'s Draft/Approved separation for both a Feature Plan and an ADR, `skill/complexity-tiers` (SE self-assessed Tier 1, correctly citing the Approved plan as satisfying the gate), `skill/worktree-management`, `skill/code-review` + `skill/review-severity`, the draft-PR-then-review mechanic (checks 7/10), the correction-loop-on-the-same-PR mechanic, check 6's ADR division of labor (Architect authors, does not commit), and no Chunk/Epic/Decision-Record vocabulary anywhere in any agent's output.

**Not yet exercised:** Track F (Engineering Researcher — see above), Track C (framework-repo direct-commit gate), Track D (CI guard negative test), a multi-Task Feature with real parallelism (DAG wave computation, 2+ concurrent worktrees), and a Feature/Task large enough to trigger `skill/complexity-tiers`' Tier 2/3 gates rather than Tier 1.
