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
