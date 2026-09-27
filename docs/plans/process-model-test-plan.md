# Process Model Validation — Test Plan

## Metadata

| Field          | Value                                                                          |
| -------------- | ------------------------------------------------------------------------------ |
| Status         | Done                                                                           |
| Author (Agent) | Claude Code                                                                    |
| Approved By    | Jeremy Smellie (execution directed live, track by track)                       |
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

Executed 2026-09-27 across two sessions, against two real sandboxes: `jsmellie/placeholder` (a private throwaway GitHub repo, for Tracks A/B/F) and two isolated git worktrees of the real `ai-foundation` repo itself (`/home/user/worktrees-test/ai-foundation-track-c`, `-track-d`, for Tracks C/D). All six tracks ran. Findings below are what actually happened, including every workaround and every mistake this pass itself made — not a clean-room summary.

### Track A — project-repo feature pipeline: pass, two harness gaps found

Ran end to end for a real `wordfreq` CLI Feature (PLCH-001): Engineering Manager drafted a Feature Plan → real human `Approved` gate (4 open questions delegated to Claude Code, resolved in a separate commit — matching `skill/plan-lifecycle`'s Draft → revision → Approved separation exactly) → decomposed as a single Task (correctly applied `skill/feature-planning`'s sizing rules rather than forcing a `tasks.json` split it didn't need) → worktree/branch created per `skill/worktree-management` → Software-Engineer implemented, tested (30/30, then 32/32 after a correction round), and self-caught one file-header mistake before handoff → draft PR opened → Principal-Engineer reviewed via `skill/code-review`/`skill/review-severity` (Approved, 1 MEDIUM + 1 LOW, neither blocking) → PR flipped ready-for-review → a real correction round fixed both findings on the same PR (no new PR opened), matching the documented correction-loop mechanic exactly.

**Finding A1 — nested subagent dispatch doesn't work in this harness.** Engineering Manager, once itself running as a dispatched subagent (rather than as the top-level session), has no `Agent`/`ListAgents`/spawn tool — only `SendMessage` to address agents that already exist. `skill/task-orchestration`'s design assumes Engineering Manager itself dispatches Software-Engineer and Principal-Engineer; that assumption silently breaks the moment EM is itself a subagent rather than the top-level session. Workaround: the top-level session dispatched Software-Engineer/Principal-Engineer directly, using the brief EM had already prepared; EM retained the parts needing only `shell`/`gh` access. Environment/tooling gap, not a process-model defect.

**Finding A2 — a single shared bot identity can't produce a GitHub-native "Approved" review.** GitHub refuses self-approval (`Can not approve your own pull request`) when the same identity opened the PR and posts the review. Worked around by posting the Review Report as a `COMMENT` event with "Approved" recorded in the report text. Real limitation of single-bot-identity deployments; separate credentials per agent role would avoid it.

### Track B — decision/architecture pipeline: pass, but the first dispatch attempt was invalid, and its own output needed a real revision round

**Dispatch-design mistake, self-inflicted and corrected:** the first Architect dispatch over-specified the trigger — naming the exact skill, MADR format, file path/numbering, and the division-of-labor rule inside the prompt itself. Caught by direct human review of the prompt ("that seems overboard... do it again explicitly from the point of view of how it would be triggered from another agent"). The resulting ADR was deleted and redone with a minimal, realistic trigger: just the problem statement and context, framed as a genuine escalation per `steering/engineering/core.md`'s "Escalate Technical Approach Uncertainty to Architect" rule. The corrected dispatch is the one that actually validates the process — Architect refused to decide unilaterally, produced a genuine 4-option analysis (including a fail-fast size guard never suggested in the prompt), wrote nothing to the repo, and named exactly what it needed from the human before finalizing (ADR-0001).

**Methodology finding, generalized from that mistake:** a dispatch prompt that tells the agent which skill to invoke, which file format to use, or where to write output tests whether the agent follows instructions, not whether its own agent definition/skills produce that behavior unprompted. Every subsequent dispatch in this pass (Tracks C-F) used the corrected pattern: state the problem and context, never the mechanism.

**Finding B1 — Architect's own ADR-authoring rules exist but aren't self-enforced.** A second, real Architect dispatch (ADR-0002, Unicode tokenization for `wordfreq`, informed by a genuine Engineering Researcher brief — see Track F) produced a ~1,900-word ADR containing literal code (`new Intl.Segmenter(undefined, { granularity: 'word' })`), directly violating `agents/architect.yaml`'s own Hard rule ("Never write code, pseudocode, or method signatures") and blowing `skill/adr-authoring`'s 150-350 word budget by 5-6x — with four full sections (tokenizer mechanism, case-fold policy, chunk-boundary mechanism, pre-merge verification procedure) that are exactly the "implementer detail" the skill's own "Never put in the record" list already prohibits. The rules were adequate; nothing in either file needed new content. What's missing is a self-review step between drafting and presenting — `adr-authoring`'s Step 6 only checks `aif index decisions --check` (index freshness), never the word budget or the never-put-in-record list. A revision dispatch, given the exact same feedback a human reviewer gave in this session, correctly cut the ADR to 343 words with the decision unchanged and all code/implementer-detail removed — confirming the fix is process (add a self-check step), not content (the rules already say the right thing). A follow-up prompt requesting that self-review-gate design work was handed to a separate session; not yet built as of this report.

### Track C — framework-repo direct-commit gate: pass

Dispatched Software-Engineer into an isolated git worktree of the real `ai-foundation` repo on `main` (not a sandbox — this is the actual framework repo, exercising `steering/engineering/git-workflow-framework.md`'s real rules for the first time in this entire migration, since every check up to this point was hand-implemented under the tracker's own bootstrapping exception). SE found a genuine, non-trivial documentation gap (README's CLI section omits the shipped `aif config` command), correctly judged it past the Rule 4 trivial-fix threshold, wrote a Draft Tier 3 plan, committed it, and **stopped** — awaiting a real human Approved decision before implementing, exactly as `steering/engineering/core.md`'s "Plans Are Committed Artifacts, Not Chat Output" requires. After a real Approve decision (committed separately, `be58d9a`), SE implemented, ran the plan's own validation steps (349/349 unit tests), and pushed directly to `main` (`8cfb761`) — no branch, no PR, per the framework repo's actual rules.

**Finding C1 — `ai-git`'s secrets-resolution wrapper fails in a sandbox without `bws` configured.** `ai-foundation`'s own `.aiconfig.json` configures `secrets.run` against a Bitwarden Secrets Manager wrapper; this sandbox container has neither `bws` installed nor `BWS_PROJECT_ID` set, so `ai-git push`/`ai-git commit` fail outright. Both Software-Engineer dispatches (Track C and Track D's fix commits) correctly stopped rather than fabricating credentials or bypassing `ai-git`, reporting the exact missing prerequisite per `git-workflow-core.md`'s own rule for this case. The orchestrating session pushed the already-correct local commits via plain `git push` (this sandbox's ambient git credential proxy handles GitHub auth independently of `ai-git`'s own token path). Environment gap, not a process defect — but the same class of finding as Track A's `gh`-CLI wall: this harness's real GitHub/credential surface doesn't match what `ai-git`/`git-workflow-core.md` assume a deployed agent has.

### Track D — CI guard regression (check 33): pass, fully isolated

Deliberately introduced each of the three faults check 33's CI guards are meant to catch, one at a time, on a disposable branch of the real `ai-foundation` repo (`track-d/ci-fault-injection`), confirmed via the real GitHub Actions API (not a local simulation) that the correct step failed for each, fixed each, and confirmed a fully green run at the end:

| Fault                                                                           | CI step that failed                                                | Confirmed via                                                                 |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| Stale `last_verified` (touched a `key_files` entry without bumping frontmatter) | `Check: architecture index (key_files staleness + relative links)` | Run `36315253970`                                                             |
| Broken relative link in `docs/architecture`                                     | Same step (link-resolution half)                                   | Run `36320208875`/`36315676634`                                               |
| Malformed decision record (missing required `status` field)                     | `Check: decisions index`                                           | Run `36320255549`, isolated clean after the other two faults were fixed first |

**Process note, not a process-model finding:** GitHub Actions' `concurrency: cancel-in-progress` setting (correctly configured for feature branches) cancelled the first two fault-injection runs when pushed back-to-back without waiting — a reminder that fault-injection testing against real CI needs to wait for each run before pushing the next, not a defect in the CI config itself.

### Track E — regression/retirement checks: pass (cited, not re-run)

Confirmed via already-green automated coverage rather than manual re-verification: `tests/validation/terminology-sweep.test.js` (Chunk/Epic vocabulary), `aif validate` (schema/refs), and a direct grep confirming `Amending` no longer appears anywhere in `skills/plan-lifecycle/reference/status-vocabulary.md` or any agent prompt, now that PRs #72/#73 are merged.

### Track F — Engineering Researcher dispatch: pass

Neither Track A nor Track B's first-pass dispatches needed Researcher — that gap was caught by direct human question ("guessing so engineer researcher was used?") after Track B completed, and added to this plan as Track F. The real test came from Track B's second ADR: Engineering Manager, triaging a product request to make `wordfreq`'s tokenizer Unicode-correct, correctly refused to assert `Intl.Segmenter`/ICU facts from memory (`steering/global/core.md`: "Never Fabricate Information"), correctly identified this as an architectural-fork question outside its own authority to decide, and produced a precisely-scoped research question rather than a vague one. Engineering Researcher's brief was genuinely strong: every claim sourced, third-party npm alternatives compared on concrete axes (correctness, dependency weight, maintenance status), and — critically — two claims explicitly flagged as **unverified against a primary source** (default-locale CJK/Thai segmentation behavior; a reported large-string stack-overflow) rather than asserted as fact, with an explicit recommendation for how to verify them directly. Architect then treated that brief as evidence to scrutinize, not an instruction — rejected the brief's own implicit "just use the default" framing in one respect (deciding between two competing designs the brief didn't itself rank), and correctly declined to dispatch Researcher a second time to resolve the two flagged gaps, reasoning correctly that they need runtime code execution against Node 22, not more documentation lookup — a judgment call, not a reflex.

### Cross-cutting findings

- **Environment/harness gaps (5 total, none are process-model defects):** nested subagent dispatch unavailable to a subagent-run agent (A1); GitHub self-approval blocked for a single shared bot identity (A2); no `gh` CLI or PAT in this container for `ai-git`'s GitHub operations (Track A's original finding, reconfirmed); `ai-git`'s secrets-resolution wrapper requires infra (`bws`/`BWS_PROJECT_ID`) this container doesn't have (C1); GitHub Actions' `cancel-in-progress` needs runs spaced out during fault-injection testing (Track D). All five were correctly surfaced by the dispatched agents themselves (never silently worked around), and each time, the orchestrating session did the one mechanical step the agent genuinely couldn't (opening a PR via a different API, pushing via plain `git`) rather than the agent inventing a workaround.
- **One real process-model gap found (B1):** Architect's ADR-authoring rules (word budget, no-code Hard rule, never-put-in-record list) are correct and sufficiently precise to have caught both violations after the fact — but nothing checks a drafted ADR against them before it's presented for human review. Follow-up dispatched to design a self-review step.
- **One real methodology lesson, now applied throughout:** an over-specified dispatch prompt (naming skills/formats/file paths) tests instruction-following, not agent design. Every dispatch from Track B onward states the problem only.
- **Confirmed correct across the whole pass:** `skill/feature-planning`'s Task-sizing rules; `skill/plan-lifecycle`'s Draft/Approved separation, exercised for a Feature Plan, an ADR (twice — including a Draft revision round), and a framework-repo Tier 3 plan; `skill/complexity-tiers`; `skill/worktree-management`; `skill/code-review` + `skill/review-severity`; the draft-PR-then-review mechanic and same-PR correction loop; check 6's ADR division of labor (Architect authors, never commits); `steering/engineering/git-workflow-framework.md`'s direct-to-main gate, exercised for the first time in this migration; all three of check 33's CI guards, confirmed against real CI rather than unit tests alone; Engineering Researcher's citation discipline and willingness to flag rather than fabricate; no Chunk/Epic/Decision-Record vocabulary anywhere in any agent's output across six tracks.
- **Not exercised, worth a future pass:** a multi-Task Feature with real parallelism (DAG wave computation, 2+ concurrent worktrees); a Feature/Task large enough to trigger `skill/complexity-tiers`' Tier 2/3 gates rather than Tier 1; a Principal-Engineer-authored REQUEST_CHANGES outcome (both real reviews in this pass returned Approved with non-blocking findings); ADR supersession (`links.supersedes`); an actual multi-locale/adversarial input scenario reaching Option 3 territory instead of Option 1.

### Outstanding at time of writing

PR #1 (`jsmellie/placeholder`) awaiting human merge. ADR-0001 (large-file streaming) and ADR-0002 (Unicode tokenization, revised) both awaiting a real human Approved/Deferred decision. The Architect self-review-gate design work (Finding B1's follow-up) is a separate, not-yet-executed piece of work in another session.
