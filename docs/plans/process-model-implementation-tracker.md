# Process Model Implementation — Progress Tracker

> This is a **working checkpoint file**, not a target-model artifact. It exists so
> implementation of `docs/process-model.md` can pause and resume across sessions
> without re-deriving state. Delete it once Phase 17 / check 34 lands — git history
> is the permanent record, per the plan's own philosophy (`process-model.md` §
> Context rules).

## How this works

`docs/process-model.md` is the spec — this file never restates its content, only
tracks status against it. Each row below is one of the 37 numbered checks from that
document's **Implementation checks** table, grouped into the 17 phases from its
**Sequencing** section, plus the **structural-review phase** (checks 36–37) added
after the fact and sequenced between phases 8 and 9.

**Ground rules for this implementation pass:**

- **Direct execution, not the pipeline this plan replaces.** This work is done by a
  human + Claude Code working directly on the branch, not dispatched through
  Engineering-Manager → Software-Engineer → Principal-Engineer. Bootstrapping the new
  process through the old one it's busy retiring is circular; the human checkpoints
  below stand in for PE review.
- **One branch + one PR per phase, merged into this integration branch
  (`claude/process-model-implementation-plan-lty3ia`), not into `main`.** Branch name:
  `process-model/phase-N-{short-description}`, cut from the integration branch's
  current tip. The phase's check-implementing commits land on that branch; its last
  commit updates this tracker (check off boxes, fill in the commit SHAs and the
  Checkpoint note) so the PR's diff tells the whole story. **Claude opens the PR and
  stops — the human reviews and merges it**, same as any other PR in this repo
  (`steering/engineering/git-workflow-projects.md` Rule 11: no agent merges). Claude's
  own `npm test`/`npm run validate` pass is what makes a PR ready to hand off, not a
  license to merge it. This integration branch itself will PR into `main` once all 17
  phases are done (Phase 17 / check 34) — same rule applies there.
- **One commit per check** within a phase branch. Small, reviewable diffs, commit
  message references the check number (e.g. `process-model check 3: add
paths.architecture/paths.research`). If a check is bigger than expected, split it
  into multiple commits but keep them under that check's number — don't silently
  reorder or merge checks.
- **One human checkpoint per phase**, at minimum — reviewing the merged PR's diff and
  the tracker's Checkpoint note before the next phase's branch is cut. **Extra
  checkpoints on high-blast-radius phases:**
  - **Phase 8** (checks 12–14, skill deletion/re-homing) — pause after check 12
    (routing decided) before executing the deletions in check 13. If that pause is
    worth keeping across a PR boundary, check 12 can land as its own commit reviewed
    before check 13's commit is added to the same branch/PR.
  - **Phase 14** (checks 26–31, decision conversion) — pause after **check 26**
    specifically: it requires a human `Approved`/`Deferred` call on `ARCH-004`,
    `ARCH-007`, and `PROC-003` before any conversion proceeds. Pause again after the
    bulk rewrite (checks 28–29) before the indexer retarget (check 30).
- **Check 35 is out of scope for this tracker.** It's explicitly sequenced outside
  the 17 phases (an Architect-authored ADR on tooling, written later) — never mark it
  here.

## Resuming after a break

1. Read this file top to bottom.
2. `git log --oneline` on this branch and diff against the "Last commit" field below
   to confirm nothing drifted since the last update here. Also check for an open
   `process-model/phase-N-*` branch/PR that hasn't been merged yet — that's the
   in-progress phase, not a new one.
3. Continue at the first unchecked check, in phase order.
4. If a check's box is ticked but its commit SHA is blank, treat it as **not done** —
   re-verify before trusting the checkbox.

**Last commit at last tracker update:** `2406a50` (`process-model/phase-15-unwind-aif-003`)
**Current phase:** Phases 1–9 done and merged, plus the structural-review phase
(checks 36–37) and `process-model/arc42-no-plan-references`. Phases 1–6 merged (PRs
#35, #36, #38, #40, #41, #42). Phase 7 (checks 9–11, vocabulary rename) merged via PR
#44 (`fd077fa`) — see Phase 7 below for detail. Phase 8 (checks 12–14, skill
retirement) merged via PR #50 (merge commit `08c9cab`) — see Phase 8 below.
Structural-review phase (checks 36–37) merged via PRs #54/#55 (merge commits
`de53c26`/`83f6752`) — see that section below. Phase 9 (check 15, template alignment)
merged via PR #59 (`02c4a75`) — see Phase 9 below. `process-model/arc42-no-plan-references`
merged via PR #60 (`7a01580`) — see that section below. `docs/process-model.md` itself
approved on `main` (`910b90f`, human: Jeremy Smellie) and merged into this branch
(`5e83332`). Phase 10 (checks 16–18, steering & reference sweep) merged via PR #61 (merge commit
`75bf2f7`). Phase 11 (checks 19–21, cross-cutting process/security rules) merged via PR
#62 (merge commit `cc87c77`) — see Phase 11 above. Phase 12 (checks 22–23, regeneration
& top-level docs) merged via PR #64 (merge commit `fe6e46b`) — see Phase 12 above. Phase
13 (checks 24–25, verification) merged via PR #65 (merge commit `c02ee52`), stacked on
and restacked once more via `git rebase` after PR #64's own rebase, then automatically
retargeted onto this branch by GitHub once PR #64 merged — see Phase 13 above.

**Follow-up fixes landed alongside Phase 8, each its own small PR merged into this
integration branch before/with #50** (all from live human feedback during Phase 8
review, not pre-planned checks):

- PR #51 (`03f431c`) — `steering/engineering/core.md` Rule 10 broadened to cover
  duplication within a single document/prompt (not just across files), wired into
  `skill/agent-authoring` Step 5 + Step 8 checklist. Fixed a self-inflicted Rule 10
  violation in its own first draft before merging.
- PR #52 (`b676db5`) — check 28's tracker line (below) scoped to also cover a new
  `skill/adr-authoring` + `docs/decisions/_template.md`, distinguishing "a skill
  holding MADR format guidance" from the CLI/MCP/binary tooling
  `process-model.md`'s "ADR tooling" section declines to build.
- Folded directly into PR #50 (`61e584b`) — `skill/plan-lifecycle` swept for stale
  Chunk Plan/Epic Plan/Decision Record language and the two now-deleted
  `skill/decision-record`/`skill/decision-brief` citations, including removing an
  orphaned Tier A/B/C section from `reference/commit-gate-procedure.md`. Preempted
  part of check 17's scope for this one skill specifically — the rest landed in
  Phase 10 (checks 16–18 above).

**Structural-review phase — both checks now implemented**, on
`process-model/structural-review-36-37`, cut from the integration branch after
Phase 8/PR #50 merged: check 36 (folder consolidation) and check 37
(duplication removal) — see the section below for full detail. Also on this
same branch, per direct instruction after a full-corpus AI-component
duplication audit: a new shared `git-workflow-core.md` plus three more Rule-10
fixes (`principal-engineer.yaml`, `engineering-manager.yaml`,
`bundle-authoring/SKILL.md`) — see the section below. **Ready for PR.**

**Also merged into this integration branch, outside the numbered checks:**
the "Cite, Don't Restate" steering rule (core.md Rule 10 + agent-authoring/
skill-authoring checklist bullets, PR #47 → `main`, pulled in as `be51f28`)
and its deferred third piece (`ai-component-review` Step 4 extended to flag
citation/restatement duplication, PR #48, `64f600c`) — a general
authoring/review gap surfaced while implementing checks 9–11, deliberately
kept out of process-model.md's own checks since it isn't vocabulary-rename
scope.

**`process-model/arc42-no-plan-references` (merged via PR #60, `7a01580`), per
direct human instruction:** arc42 docs (`02_constraints.md`, `05_building_blocks.md`,
`_template.md`) had five citations into `docs/process-model.md` itself — a
`Status: Draft` plan that gets triaged/archived once Phase 17 lands, so a
living architecture doc depending on its path/check-numbering was a forward
reference to a temporary artifact. All five removed or reworded to describe
the pending change itself rather than naming which plan/check drives it. See
commit `05ab92c`'s message for the full per-row breakdown.

**Fixed directly, not deferred:** `skills/task-orchestration/SKILL.md`'s raw
`git` calls (both orchestrating/implementing agents declare
`blocked_commands: ["git *"]`) → `ai-git` (`d2c1e48`). This repo's own
`.aiconfig.json` missing `paths.orchestration` (silently fell back to the
wrong default) → added (`76e2521`); check 36 will collapse it into
`paths.features` regardless.

**Process note, still true:** `npm run validate` does not cover snapshot
freshness — run `node bin/aif.js snapshot --check` too, every push. A
locally-clean `validate` run failed CI on #44 once for a stale snapshot.

Phase 14 (checks 26–31, decisions conversion) is complete. Check 26 (human decision
gate: `ARCH-004`/`ARCH-007`/`PROC-003` all `Deferred`) landed on
`process-model/phase-14-decisions-conversion`, out for review as PR #67. Checks 27–31
(disposition/archive, MADR flattening + rewrite, arc42 Design-section splits, the
indexer retarget, and the three new ADRs) all landed on a new branch cut from that PR's
tip, `process-model/phase-14-check-27-disposition-records`, out for review as PR #69 —
per human direction this session, finishing the whole phase on one branch/PR rather than
splitting further or pausing at the mid-phase checkpoint after checks 28–29. Also merged
`main` into the integration branch directly (PR #68's new `.aiconfig.json` resolver /
`aif config` command; reconciled `lib/commands/index.js` and `lib/aiconfig-defaults.js`
against process-model's already-landed path vocabulary, updated the affected arc42
docs) — that merge and PR #69's branch aren't on the same branch; PR #69 will pick up
the integration branch's current tip as its base once it's ready to merge. Full
validation gate green at every commit (see Checkpoint 14 above for the one known,
expressly-scoped exception). Phase 15 (check 32, unwind merged half of `AIF-003`)
done — see Phase 15 below. Next: Phase 16 (check 33, CI guards).

---

## Phase 1 — Retire abandoned work (checks 1–2)

Branch: `process-model/phase-1-retire-abandoned-work`

- [x] **Check 1** — Tear down `AIF-003` (Epic + 8 chunk plans → `Deferred` + `archive/`).
      Commit: `0f1348d`. **Branch deletion still outstanding** — see checkpoint note.
- [x] **Check 2** — Mark `AIF-004` `Deferred`, move to `archive/`. Commit: `138dce0`.

**Checkpoint 1:** Both epics archived (`docs/plans/archive/AIF-003/`,
`docs/plans/archive/AIF-004.epic.md`), `npm test` 724/724 and `aif validate` clean.
Merged via PR #35. **Outstanding:** deleting the 5 stale remote branches named in
check 1 (`AIF-003/002-amendment-index-fields`, `AIF-003/006-plan-lifecycle-ladder-docs`,
`AIF-001/003-epic-planning-ai-track`, `AIF-002/010-migrate-aif-006`,
`AIF-002/015-backfill-decisions-index`) plus the now-merged
`process-model/phase-1-retire-abandoned-work` is blocked by the auto-mode
destructive-action classifier (retried twice, still refused). Verified all 5 first:
none merged into `origin/main` (`git branch -r --no-merged origin/main`), and PRs
#23/#24 (the two `AIF-003` branches) confirmed `closed`/`merged: false` via the GitHub
API. Needs a human to run the deletes (or grant permission):
`git push origin --delete <branch>` for each.

---

## Phase 2 — Config scaffolding (checks 3–4)

Branch: `process-model/phase-2-config-scaffolding`

- [x] **Check 3** — `.aiconfig.json` schema: `paths.features`/`paths.tasks`, add
      `paths.architecture`/`paths.research`, reserve `paths.product`; this repo's own
      `.aiconfig.json` + `AGENTS.md` field table updated. Commit: `e066376`.
      `resolveKnowledgePath`/`resolveDecisionsPath` in `lib/commands/index.js` checked
      and confirmed unaffected (neither reads `paths.epics`/`paths.chunks`, only the
      unchanged `paths.knowledge`/`paths.decisions` keys) — no code change needed
      there. `projects/_template/` and `lib/project-init.js`'s `buildAiConfig` are
      check 15's scope, not this one.
- [x] **Check 4** — `docs/architecture/` flat arc42 directory + section template;
      only §1/§2/§3/§5 created now (`01_introduction_and_goals.md`,
      `02_constraints.md`, `03_context.md`, `05_building_blocks.md`, plus
      `_template.md`). Commit: `2078c0e`.

**Checkpoint 2:** `npm test` 724/724 and `aif validate` clean after each commit.
Confirmed running the existing generic knowledge indexer (`aif index knowledge`)
against this repo silently skips the new arc42 files (no `type` frontmatter field)
rather than erroring — arc42-aware indexing is check 5's job. Merged via PR #36.

**Post-merge review pass (PR #38, `process-model/phase-2-fixup-goals-stakeholders`,
merged into #36's content):** the §1/§2/§3/§5 content got a full correctness pass
against arc42's actual official section definitions (fetched directly from
docs.arc42.org and cross-checked with user-provided reference PDFs), not just a
first-draft summary:

- §1: Goals table was restating `docs/process-model.md`'s own rework rationale
  instead of ai-foundation's product goals — replaced with real ones (portability,
  ease of use, minimal-dependency tooling), each with a measurable criterion;
  renamed Goals → Quality Goals; added the required Non-goals; Stakeholders fixed
  to human roles only (Project adopter / Framework maintainer — AI agent and
  Harness are §3 actors, not stakeholders).
- §2: added the missing Conventions category; reworded Node.js as primarily-Node,
  not Node-only (MCP servers under `servers/` may be non-Node, e.g. a third-party
  Python YouTrack MCP).
- §3: split into Business context / Technical context (arc42 keeps these separate);
  replaced the broken `C4Context`-notation diagram (renders garbled on GitHub —
  confirmed by screenshot) with a plain flowchart.
- §5: deep-reviewed the actual code (every export across `lib/`, `bin/`,
  `servers/`) and rewrote as a properly detailed whitebox with the required
  decomposition-motivation paragraph, plus two new white-box expansions —
  `05_01_bundle_resolution.md` and `05_02_harness_adapters.md` — each also given
  their own required motivation paragraph once checked against arc42's Level-2
  template (the same three-element template applies recursively).
- `docs/process-model.md` itself amended (checks 16/20): closed a real gap where
  staleness detection (checks 5/33) can never notice a _new_ file that should have
  been added to a `key_files` list but wasn't — now an explicit doc-update
  acceptance-gate/review-checklist item, since only a human/review step can catch
  that, not CI.

All fixes verified with `npm test`/`aif validate` at each step; merged via PR #38.

---

## Phase 3 — Index tooling (check 5)

Branch: `process-model/phase-3-index-tooling`

- [x] **Check 5** — `aif index architecture` (+ `--check`) added: new
      `lib/architecture.js` (mirrors `lib/decisions.js`'s pure/io split),
      generalized `entriesEqual` (decisions.js) reused for both doc sets,
      `stale` computed per-doc from `last_verified` vs. real git history of
      `key_files`, reverse index (`source path → [docs]`) built from
      `key_files`. Commit: `08b190d`.
      Docs updated to match (`05_building_blocks.md` gains the new block +
      `key_files`; `03_context.md` had an over-broad `lib/commands` directory
      entry removed after the new indexer caught it as a false-positive stale
      flag); `docs/architecture/index.json` generated for the first time and
      committed. Commit: `666e696`.
      **Follow-up fix:** `entriesEqual` living inside `decisions.js` meant
      `architecture.js` had to import from a same-level, unrelated domain
      module for a function that was already documented as generic and
      shared — decisions.js's own public API absorbing logic that isn't
      decision-record-specific. Extracted to a new `lib/index-diff.js`
      (no domain knowledge, just the structural-comparison primitive); both
      `decisions.js` and `architecture.js` now import it from there instead.

**Checkpoint 3:** 33 new tests (19 unit, 14 integration — the integration
suite spins up a real throwaway git repo to test staleness detection against
actual commit history). `npm test` 757/757, `aif validate`/`lint`/`typecheck`
all clean, `aif index architecture --check` passes against this repo's real
`docs/architecture/`. Two things worth flagging from actually dogfooding
this: (1) caught a real parsing bug before it shipped — a multi-line summary
blockquote (most of this repo's own arc42 docs use one) was silently
truncated to its first line; (2) caught a real over-broad `key_files` entry
in already-merged content (`lib/commands` as a whole directory in
`03_context.md`) the moment the tool was pointed at real data — exactly the
kind of drift check 16/20's new completeness rule exists to catch, just
demonstrated in the "too broad" direction rather than "missing entirely".

---

## Phase 4 — Agent roster (check 6)

- [x] **Check 6** — Agent YAMLs: retired `tech-lead`/`test-engineer`/
      `engineering-tech-writer`/`ai-engineer`; modified `architect`/`software-engineer`/
      `engineering-manager`/`principal-engineer`; added `engineering-researcher`. States
      explicitly which agent commits Architect's output. Commit: `8708a79`.

      Deliberately kept `skill/epic-planning`/`skill/chunk-planning`/`skill/chunk-orchestration`/`chunks.json` under their pre-rename names throughout the three affected agent prompts — checks 9-11 own that rename, not this check (per human decision during this session: "old names now, make wording in phase 5 extremely clear"). `docs/process-model.md`'s checks 6, 9, and 10 cells now say so explicitly, including that `skills/epic-planning`, `skills/chunk-planning`, and `skills/chunk-orchestration` themselves are untouched and still describe the pre-roster world (literal Tech-Lead/AI-Engineer/Test-Engineer names, software/AI-track branching) — not just the check-6 agent YAMLs.

  **Also fold in while touching these files — done, all 5 items incorporated
  into the check-6 commit above:** (2026-09-13, a parallel session added
  these framework capabilities then reverted the `agents/*.yaml` grants themselves —
  net diff from our branch point is zero, confirmed via
  `git diff 29e6018 HEAD -- agents/` — deferring them explicitly to this check):
  - **`skill` tool → all 5 agents**, universal grant. Without it an agent has zero
    skill-catalog awareness on Claude Code (confirmed empirically in the deferred
    commit) — every one of the 5 still declares a `skills:` list, so all 5 need it.
  - **`plan` + `ask_user` → Architect and Engineering Manager only.** These are the
    two agents that interact with a human live in-session (Architect: human
    confirms the ADR before it's saved; Engineering Manager: absorbs Tech-Lead's
    PRD/request intake and Feature Plan approval gate — the prior grant was to
    Architect + Tech-Lead specifically). Do **not** grant to Software Engineer,
    Engineering Researcher, or Principal Engineer — background/gated-dispatch
    agents that surface blocks asynchronously (Tier 3 hand-off, PE findings),
    never via a live blocking question.
  - **`task` → all 5 agents**, broadly granted (was broad across all 8 before) as
    each agent's own session-scoped implementation checklist; `tasks.json` /
    `orchestration-state.json` stay the sole cross-harness source of truth.
  - **`preload_skills` → set per agent once its final `skills:` list is known**
    (depends on checks 9–14 landing content into each agent's skill list, so decide
    the actual subset at execution time, not now). Principle carried over from the
    deferred commit: `["*"]` for an agent with one small list used on effectively
    every dispatch (Principal-Engineer's code-review skill is the clear case);
    a named subset for an agent whose list mixes a universal skill with
    conditional/subsystem-specific ones (Engineering Manager: preload
    orchestration/worktree-management, leave Researcher-dispatch and any
    decision-hand-off skill on-demand; Software Engineer likely lands here too
    once it absorbs AI-Engineer's subsystem skills — preload only what runs on
    every Task, e.g. `complexity-tiers`).
  - `subagent` grants are unaffected — process-model.md's own Agent roster table
    (Subagent dispatch column) already specifies who holds it; the deferred commit
    only expanded which native tools it maps to (added `ListAgents`/`SendMessage`),
    not which agents hold it.
  - Kiro's adapter maps `skill`/`plan`/`ask_user`/`task` to `null` (no confirmed
    native equivalent) — already implemented in `lib/harnesses/kiro.js`, nothing
    to redo here.

**Checkpoint 4:** 732/732 tests passing (test-helpers.test.js fixtures updated
off the two deleted agent files it referenced), `aif validate`/`lint`/
`typecheck`/`format:check` clean, `bundles/engineering` snapshot regenerated
(46 sources — the new `skill/test-execution` reference on Software-Engineer
pulled in that skill's files), `aif index architecture|decisions --check` both
clean. Everything downstream derives from this — good place to slow down even
though it's a single check.

**Post-checkpoint refinements on the same branch/PR (#41), not new checks:**

- Extracted `skill/review-severity` (severity table, blocking rule, report
  template) out of `skill/code-review`; added `skill/ai-component-review`
  (previously an inline paragraph in Principal-Engineer's prompt). Both hand
  findings to `review-severity`. `principal-engineer.yaml` prompt shrinks
  accordingly. Commit: `0181aeb`.
- Stripped "Absorbs Tech-Lead"/historical-framing language from
  `engineering-manager.yaml`/`software-engineer.yaml`/`principal-engineer.yaml`
  descriptions and prompts — an agent shouldn't need to know or care what came
  before it; decision-record citations (e.g. `AIF-PROC-001`) kept since those
  are permanent, the retired-agent-name/superseded-plan-ID context around them
  is not. Commit: `ce9df0a`.
- Trimmed `software-engineer.yaml`'s inline restatement of
  `skill/complexity-tiers`'s generic Tier 1/2/3 definitions — first pass kept
  only SE's genuine deviations as prose (commit `231de16`), second pass moved
  even those into a new **Per-agent specifics** table in the skill itself
  (Tier 2 stop mechanism, Tier 3 hand-off destination), so SE's prompt now
  just points at its row instead of restating anything. This also delivers
  most of check 14's complexity-tiers scope early — see that check's note in
  Phase 8 below. Commit: `7ade218`.

**Phase 4 + all post-checkpoint refinements merged** via PR #41 into
`claude/process-model-implementation-plan-lty3ia` (merge commit `810772a`).

---

## Phase 5 — PR/review flow (check 7)

Branch: `process-model/phase-5-pr-review-flow`

- [x] **Check 7** — Software-Engineer opens the Task's PR as a **draft**
      immediately after implementing, not after Principal-Engineer approval as
      today; Principal-Engineer's Review Report is posted onto that PR as real
      review comments/threads by **Engineering Manager** on its behalf
      (Principal-Engineer gains no `shell`/`gh`/`ai-git` access — same pattern
      as EM already committing an Architect-authored ADR). Correction loops
      happen on the same PR; Engineering Manager marks it ready-for-review once
      Principal-Engineer approves. Plan-only work (`docs/process-model.md`'s
      check text, flow diagram, roster table, resolved design question, and
      the checks-8-34/phases-6-16 renumbering) landed earlier, commit
      `66fa26d`. **This is the actual implementation**:
      `software-engineer.yaml`'s separate "Process (PR creation)" section
      removed, folded into a new step 11 (open draft PR on first pass only);
      "Process (correction)" reworded to read findings off the PR instead of
      an abstract report; two new hard rules (open as draft once, never
      undraft it yourself). `engineering-manager.yaml` gets a new
      orchestration responsibility + Process step 6 + three hard rules for
      posting PE's Review Report onto the PR and marking it ready-for-review.
      Flagged, not fixed: `skill/chunk-orchestration/SKILL.md` still creates
      the PR only after approval — check 10's full rewrite owns that fix (its
      row in `docs/process-model.md` now says so explicitly). **Tier-2
      validation** (real GitHub API calls against a throwaway draft PR,
      confirmed working then closed): draft-PR creation, the ready-for-review
      flip, and posting a Review Report as a PR review all work as designed —
      but "review comments/threads" overclaimed what `gh pr review` actually
      gives you (one comment body per review, not separate per-finding inline
      threads, which would need raw `gh api` scripting). Corrected the
      wording in both `engineering-manager.yaml` and this document to "a
      single PR review." Implementation commit: `f3fc01d`. Tier-2 validation +
      wording fix commit: `29cf36f`

**Checkpoint 5:** `npm test` 732/732, `aif validate`/`lint`/`typecheck`/
`format:check` clean, `bundles/engineering` snapshot regenerated, `aif index
architecture|decisions --check` both clean. Tier-2 mechanical validation done
against a real throwaway draft PR (#43, closed after validation) — draft
creation, review posting, and the ready-for-review flip all confirmed working
against the real GitHub API. Merged via PR #42 (merge commit `61cb210`),
which also carried a `main` merge (new `pr-descriptions.md` steering + PR
template) and two rounds of Software-Engineer prompt bloat-reduction
(duplication cut, no capability change) done while touching that file.

---

## Phase 6 — CHANGELOG mechanism cleanup (check 8)

- [x] **Check 8** — Dropped Software-Engineer's blanket CHANGELOG requirement
      (process step 9, the "mandatory for every completed Chunk Plan" hard rule,
      and the `## [{date}] {Plan ID} — {Title}` format) — no `CHANGELOG.md`
      exists anywhere in this repo despite the rule, dead process since before
      this rework. `docs/process-model.md`'s Decisions section gets a new
      callout explaining the reasoning (git commit is the record, same
      philosophy that killed the old decision-record ladder), and its
      "commit + CHANGELOG is the record" table cell drops the CHANGELOG half.
      Reworded the remaining "Engineering documentation only in
      READMEs/CHANGELOGs" hard rule to drop the dead reference while keeping
      the no-product-copy rule. Added an optional Release Documentation
      section to `projects/_template/project-standards.md` (Keeps a
      CHANGELOG? / Location / Format / Entry trigger, unfilled by default) so
      a project that ships versioned releases can opt in — Software-Engineer
      needs no new conditional logic, since "follow the active standards
      file" already covers it. Commit: `fec0820`

**Checkpoint 6:** `npm test` 732/732, `aif validate`/`lint`/`typecheck`/
`format:check` clean, `bundles/engineering` snapshot regenerated. Merged via
PR #41 (merge commit `810772a`), same PR as Phase 4/5's work above.

---

## Phase 7 — Vocabulary rename (checks 9–11)

Branch: `process-model/phase-7-vocabulary-rename`

- [x] **Check 9** — `epic-planning` + `chunk-planning` → `feature-planning`: renamed,
      Task-sizing rules added. Bigger than a rename — per-Task detailed plans (the old
      Chunk Plan template, 15 sections) are no longer produced by this skill at all;
      that moved to `skill/complexity-tiers` at dispatch time, per
      `docs/process-model.md`'s own resolved design question ("Does Software-Engineer
      need a pre-approved plan per Task? No"). `chunks.json` → `tasks.json`, `agents`
      field dropped entirely (human decision mid-implementation: no second
      implementing agent planned, so nothing left to select between).
      `skills/chunk-planning/reference/template.md` deleted outright — its content
      (Security/Logging/Components sections) is now redundant with
      Software-Engineer's own hard rules. Commit: `1733831`
- [x] **Check 10** — `chunk-orchestration` → `task-orchestration`: full pipeline
      rewrite, not just a rename. Software/AI-track branching removed — one pipeline
      (`Ready → Implementing → Reviewing → Done`) for every Task, no more `Testing`
      status (Test-Engineer retired). Per-Task plan gate replaced by
      `skill/complexity-tiers` — orchestration no longer verifies a written Task plan
      exists before dispatch. Fixed the stale post-check-7 mechanic
      `docs/process-model.md`'s own check-10 note flagged: PR creation moved from
      "after PE approval" to "the implementing agent's first pass, as a draft",
      matching check 7. Also fixed a real inconsistency found while rewriting: the old
      file spelled the branch-naming convention two different ways in the same
      document (`{chunk-number}` in Inputs vs `{chunk-id}` in Step 2) — standardized on
      one form. Commit: `ecf1a87`
- [x] **Check 11** — DAG server + `lib` renamed chunk→task: `logic.js`, `index.js`,
      and `dag.yaml` under `servers/dag/`, plus all three `servers/dag/tests/**`
      files — doc comments, error messages, and test fixtures, not just identifiers.
      `chunks_path`/`chunk_id` → `tasks_path`/`task_id`, `parseChunksFile` →
      `parseTasksFile`. Dropped the `agents` field from the schema and every fixture
      (same decision as check 9). 45/45 DAG server tests pass. Commit: `c948ebc`

**Also done on this branch, folded into checks 9–11 rather than deferred** (per
explicit instruction: watch for unneeded repetition and agent-specific content baked
into what should be generic skills, while implementing rather than as a separate
pre-review pass):

- **Generic role language throughout `feature-planning` and `task-orchestration`** —
  "the implementing agent," "the review agent," "the orchestrating agent" instead of
  hardcoded `Software-Engineer`/`Principal-Engineer`/`Tech-Lead`/`AI-Engineer`/
  `Test-Engineer` names repeated through every step and edge case, matching the
  pattern `skill/complexity-tiers` already established (Per-agent specifics table,
  current roster named once in Purpose as framing, not restated). This is the direct,
  concrete reason these two skills were so stale in the first place — check 6 retired
  three agent names months before checks 9–11 landed, and because those names were
  woven into prose instead of referenced generically, this phase had to hunt down and
  rewrite dozens of scattered mentions. Generic wording means a future roster change
  touches the dispatching agent's own prompt, not the skill.
- **Sweep of `engineering-manager.yaml`/`software-engineer.yaml`/`principal-engineer.yaml`**
  for every Chunk/Epic → Task/Feature mention, skill references updated to
  `skill/feature-planning`/`skill/task-orchestration`. `engineering-manager.yaml`'s
  "Process (orchestration)" section — an 8-step near-verbatim restatement of
  `skill/task-orchestration`'s own steps — trimmed to a short summary + pointer,
  matching how "Process (planning)" already just points at its skill instead of
  restating it. Versions bumped: `engineering-manager.yaml` 0.8.0 → 0.9.0,
  `software-engineer.yaml` 0.6.0 → 0.7.0, `principal-engineer.yaml` 0.6.0 → 0.7.0.
  Commit: `a506151`
- **Deliberately left untouched, same discipline as check 6's deferrals**:
  `skill/plan-lifecycle`, `skill/decision-triage`, `skill/decision-record`,
  `skill/decision-brief` still say `epic-planning`/`chunk-planning` — check 17's full
  vocabulary sweep owns those. `AGENTS.md`'s `project_shortname` field description
  still says "Epic IDs" — check 23 (top-level doc updates) owns that.
- **Follow-up caught after PR review (human flagged "some duplication still seems to
  be there")**: `engineering-manager.yaml`'s "Orchestration responsibilities" bullet
  list had gone untouched by the repetition pass above and restated, almost
  verbatim, content already fully covered by Hard rules (and sometimes Process) —
  the single-PR-review + mark-ready-for-review mechanic was stated in full three
  times (Responsibilities, two Hard rules, and Process), review-loop cap and
  conflict-resolution mechanics twice each, the Architect-commit rule near-verbatim.
  "Planning responsibilities" had two smaller duplicates of existing Hard rules
  ("raise open questions...", "spot Tasks that hinge on a fork..."). Trimmed both
  lists down to scope statements, removing rationale/mechanism detail that Hard
  rules/Process/the skill already state precisely — no coverage lost, one home per
  fact. Commit: `f7002a8`

**Checkpoint 7:** `npm test` 731/731 (one fewer than before — the `agents`-field
validation test in the DAG server's unit suite was removed along with the field
itself), `aif validate` (schema/refs/bundles) clean, `aif index architecture|decisions
--check` both clean, `bundles/engineering` and `servers/dag` snapshots regenerated,
`prettier --write` applied where flagged. **Open as PR #44** against the integration
branch — CI caught two real gaps my local checks missed on first push (a
`servers/dag/dag.yaml` version bump, and a Prettier instability in the tracker
itself); both fixed and pushed (`c78f851`), CI now green (8/8) and mergeable. The
Responsibilities/Hard-rules dedup follow-up above landed as `f7002a8`, also on this
PR. Not yet merged.

---

## Phase 8 — Skill retirement & re-homing (checks 12–14)

- [x] **Check 12** — Decide re-homing for what `knowledge-authoring` carried.
      New `steering/engineering/document-types.md`: the four-kind table (ADR,
      Architecture doc, Product doc reserved, Process & ownership) from
      `process-model.md`'s Document types section, the subject-matter-is-not-a-kind
      table for `api`/`business-rule` content, and external reference material (the
      one kind still generic) with its home, frontmatter shape (no `type` field —
      nothing left to distinguish), and scope rules. Templates: arc42's already
      exists (`docs/architecture/_template.md`, check 4); MADR's is check 28's
      job. External-reference's shape is embedded in the new steering file, not a
      separate asset file — no `steering/` asset-file convention exists elsewhere
      in this repo, and the shape is light enough (frontmatter + freeform body) to
      not need one. **Recommendation left for check 13, not executed here:** this
      steering rule fully supersedes `docs/knowledge-file-format.md`'s taxonomy —
      delete rather than rewrite it. Commit: `b8bf18c`.

**Mid-phase checkpoint (routing sign-off before deletions):** Cleared — check 12
merged via PR #49 (human sign-off on the `document-types.md` routing decision).
Checks 13-14 proceeded on branch `process-model/phase-8-skill-deletions`.

- [x] **Check 13** — Deleted `decision-triage`, `decision-brief`, `decision-record`,
      `ai-engineering-plan`, `knowledge-authoring` (`chunk-planning` already deleted
      in check 9). Code deleted too: `lib/knowledge.js`, `KNOWLEDGE_TYPES`, the
      `knowledge` CLI target in `lib/commands/index.js`; `docs/knowledge-file-format.md`
      deleted per check 12's recommendation; `projects/_template/knowledge/example.md`
      rewritten to point at `document-types.md`; `docs/agent-prompt-extraction-candidates.md`
      lost only its `type` field. Live-spec fixes beyond the named files:
      `agents/architect.yaml` (skills/preload_skills removed, "Decision Record" →
      "ADR" throughout for internal consistency), `agents/engineering-manager.yaml`
      (Process-domain decision-authoring bullet dropped, Decision Hand-off bullet now
      cites rather than restates), `skills/task-orchestration/SKILL.md` +
      `reference/state-schema.md` (Decision Hand-off Sub-Flow: dispatch Architect
      directly, no domain/tier routing), `skills/feature-planning/reference/template.md`
      ("Tier C decisions" → "Minor decisions made during planning", no tier ladder).
      Deliberately left for checks 14/16/17/32 per their explicit file ownership —
      see commit for the full list. `npm test`: 731 → 706 (25 removed with the two
      deleted test files, verified exact match). Commit: `a08499e`.
- [x] **Check 14** — `complexity-tiers` portion already landed early (Phase 4
      follow-on) — verified still true. `plan-lifecycle`'s own trim: removed the
      "Decision Record Tier Variants" section and its `skill/decision-triage`
      citation from `SKILL.md` (no Tier field left to assign); removed the
      corresponding Edge Case and the AIF-002-004 Tier paragraph from
      `reference/status-vocabulary.md`; "Tier 3 `ai-engineering-plan`" generalized
      to "Tier 3 plan" in both files (the per-agent-override concept survives in
      `complexity-tiers`, only the skill that used to produce it is gone).
      `reference/commit-gate-procedure.md` left untouched — explicitly check 17's
      file, still describes Tier A/B/C, a known temporary inconsistency (same
      pattern as check 6 leaving agent yamls epic/chunk-worded for checks 9-11).
      Commit: `884f695`.

**Checkpoint 8:** `npm test` 706/706, `npm run validate`/`lint`/`typecheck` clean,
`aif snapshot --check` 6/6 (engineering bundle unaffected by check 14 — confirmed
`plan-lifecycle` isn't in the bundle's tracked sources at all, pre-existing, no
agent declares it directly). Ready for PR.

---

## Structural-review phase (checks 36–37) — between phases 8 and 9

Added after the fact; outside the original 17-phase numbering but, unlike check 35,
it **does** gate: phase 9 must not begin until both checks have landed. Further
realizations surfacing during phase 8 land here as additional fully-specified
checks (38, 39, ...), each a normal check — never an extension of an existing row.
Run 36 before 37: both edit Section 9 of the Feature Plan template.

- [x] **Check 36** — Collapse the three parallel top-level directories into one
      folder per Feature (`plans/features/{FeatureID}/{plan.md,tasks.json,orchestration-state.json}`).
      `.aiconfig.json` dropped `paths.tasks`/`paths.orchestration` outright (no
      deprecated aliases — nothing in `lib/` reads either key, and this pass
      consistently favors clean breaks). `feature-planning`/`task-orchestration`
      Location/Outputs sections, `AGENTS.md`'s field table, and
      `tasks-schema.md`/`state-schema.md`'s own Location blocks all retargeted.
      Feature Plan renamed from `{FeatureID}.feature.md` to a bare `plan.md`;
      identity moves to the parent `{FeatureID}/` directory —
      `docs/architecture/02_constraints.md`'s "Artifact file naming" row reworded
      to say so explicitly, plus a `last_verified` bump (and a second one for
      `01_introduction_and_goals.md`, both caught by `aif index architecture
--check` after this AGENTS.md/git-workflow-projects.md-touching work).
      Also fixed as a direct structural consequence of dropping
      `paths.orchestration` (not vocabulary sweep — broken references to a
      deleted key): `plan-lifecycle/reference/status-vocabulary.md`'s
      parenthetical, and `git-workflow-projects.md` Rules 1/3's exemption list.
      Commit: `0abda56`.
- [x] **Check 37** — Removed four instances of duplicated specification:
      (a) `task-orchestration` Step 2 restating `worktree-management` Steps 1–3 —
      replaced with a citation, kept only what's actually task-orchestration's own
      (branch-naming convention, Task-state recording). (b) The Task state
      machine's four summary bullets in `state-schema.md` restated what
      `SKILL.md`'s Steps 3–4 already state operationally — removed, kept the
      diagram (states + legal transitions) as the one schema-owned piece.
      (c) `escalation_resolved`/`worktree_created` log actions dropped — never
      emitted anywhere (worktree creation surfaces via `task_dispatched`'s
      details, escalation resolution via `task_unblocked`'s existing write).
      (d) Feature Plan template Section 9 trimmed to just its fill-in-the-blanks
      content; the orphaned `tasks-schema.md` pointer it dropped relocated into
      `feature-planning/SKILL.md` Step 5 (its owning location) rather than lost.
      Commit: `54e8a42`.

**Checkpoint (structural review):** `npm test` 706/706, `npm run validate`/`lint`
clean, `aif snapshot --check` 6/6 (engineering bundle 40 → 41 sources — see
below), version-bump check clean (8 versioned files across this whole branch).
`aif index architecture --check` clean except the pre-existing, unrelated
`03_context.md`/`05_building_blocks.md` staleness found while validating check
36 (byproduct of Phase 7/8's agent/skill changes, flagged not fixed — check
33/17 territory).

**Also done on this branch, outside checks 36–37, per direct instruction after a
full-corpus AI-component duplication audit** (installed the engineering bundle
via `aif install`, dispatched a Principal-Engineer-persona subagent to read
every `agents/*.yaml`, `skills/**`, `steering/**`, and `standards/**` file
against `steering/engineering/core.md` Rule 10 — 4 verified findings, all
fixed):

- `steering/engineering/git-workflow-core.md` created — the atomic/incremental
  commit rules, `ai-git` usage, and token handling `git-workflow-framework.md`
  and `git-workflow-projects.md` had independently restated (and already
  drifted on — "authenticates push operations" vs "push/PR operations", same
  tool described two ways). Both files now hold only their own repo-type rules
  and overrides. Renumbering broke 3 live numbered citations (`02_constraints.md`
  ×2, this tracker's own ground rules), all updated; `git-workflow-projects.md`
  being a check-17-named file, this is a Rule-10 fix not a vocabulary sweep — no
  "chunk plan" wording touched. Commits: `1908630`, `09ea82b` (`last_verified`
  follow-up).
- `agents/principal-engineer.yaml`'s Hard rules were self-contradicting —
  delegating severity-rule-defining to `skill/review-severity` in Purpose, then
  defining one anyway verbatim in Hard rules. Now cites instead. Commit: `0539c67`.
- `agents/engineering-manager.yaml`'s PR-posting/ready-for-review rule was
  stated in full three times (Responsibilities, an unstructured "Process
  (orchestration)" paragraph, Hard rules). Kept once in Hard rules, the other
  two now point to it. Commit: `83d8b88`.
- `skills/bundle-authoring/SKILL.md` Step 3 restated `reference/schema.yaml`'s
  domain-discovery algorithm — now cites it. Commit: `b6e18ef`.

**Also done on this branch, per a second, broader Principal-Engineer pass over
the full `skill/ai-component-review` checklist** (schema conformance, tool/
permission surface, cross-reference validity) — 4 process-model-scoped
findings fixed here, a 5th (general-framework, pre-existing) documented and
routed to separate branches per direct instruction:

- All three `git-workflow-*.md` files and `document-types.md` were missing
  the `Enforcement` section `skills/steering-authoring/reference/schema.yaml`
  requires. Added. `steering/engineering/core.md`'s Rule 9 Enforcement bullet
  trimmed to cite `git-workflow-core.md`'s own new Enforcement entry instead
  of restating it a second time. Commit: `9014a9a`.
- Findings 2 (`document-types.md` Enforcement — landed on
  `process-model/document-types-enforcement-section`, PR #55) and 5
  (general-framework schema-conformance issues, unrelated to process-model —
  landed on `framework/schema-conformance-audit-fixes` off `main`, PR #56)
  tracked on their own branches; not restated here since they're outside this
  branch's diff.

**Also done on this branch, human-directed spot-check** (not from either
subagent pass): `02_constraints.md`'s "Artifact file naming" row described
`.decision.md` as a plain current fact with no note that check 28 retires the
suffix and the domain-coded prefix scheme entirely — inconsistent with the
neighboring "Frontmatter-first docs" row's existing "once conversion lands"
phrasing for the same MADR transition. Fixed to match. Commit: `ab57d7d`.

Followed by a full sweep of the other five arc42 sections for the same class
of gap (prose describing today's state silently, where a specific numbered
check will change it), per direct instruction. `01_introduction_and_goals.md`,
`03_context.md`, `05_01_bundle_resolution.md`, and `05_02_harness_adapters.md`
had none — no Epic/Chunk, decision-record, or domain-coded-prefix mentions in
any of them. `05_building_blocks.md` had two, both distinct from the
already-flagged key_files-drift staleness above (§ "03_context.md/
05_building_blocks.md staleness"): its `dag` row still said `chunks.json`
even though check 11 already renamed the real files to `tasks.json` (not a
pending gap — already-completed work the doc fell behind, since
`servers/dag/*` was never in this doc's `key_files`, so the automated
staleness check never caught it), and its `decisions.js` row claimed the
parser reads MADR frontmatter when it actually still reads the `.decision.md`
`## Metadata` table (check 30 is what retargets it) — described as
already-true rather than flagged as pending. Fixed both; added
`lib/decisions.js` and `servers/dag/dag.yaml` to `key_files` so equivalent
drift is caught automatically going forward. Commits: `ec5bf70`, `d0b0c27`
(`last_verified` follow-up).

---

## Phase 9 — Template alignment (check 15)

> **Gated:** do not begin until the structural-review phase (checks 36–37, section
> below) has landed. Check 15 rebuilds `projects/_template/` on the very layout
> check 36 redefines; building it twice is the failure this gate exists to prevent.

- [x] **Check 15** — `projects/_template/` rebuilt on the full new layout: paths
      (`.aiconfig.json`'s `paths.epics`/`paths.chunks`/`paths.orchestration` replaced
      with `paths.features`, per check 36's per-Feature folder collapse rather than the
      three-separate-dirs shape the check's original process-model.md wording predates;
      `paths.architecture` and `paths.research` added; no `paths.product`),
      `plans/features/` (replacing `plans/{epics,chunks,orchestration}/`),
      `knowledge/decisions/`, `knowledge/architecture/`, `knowledge/research/` (all
      three empty — created lazily, never pre-scaffolded), no `knowledge/product/`;
      `project-standards.md`'s stale `decision-record` skill reference updated to
      point at `document-types.md` + `plan-lifecycle`. `lib/project-init.js`'s
      `buildAiConfig()` (what `aif init` actually generates `.aiconfig.json` from, not
      a copy of the template's own file) updated to the same paths shape, plus its
      `tests/integration/init.test.js` coverage. Commit: `eb39f8e`.

**Checkpoint 9:** `npm test` 713/713, `npm run validate`/`lint` clean, `aif snapshot
--check` clean (bundle sources untouched by this check). Also fixed, trivial and
incidental to touching this exact area (Rule 4 exception):
`docs/architecture/05_building_blocks.md`'s `projects/_template` row cited "check 13"
for the `.aiconfig.json` schema — that's check 3's territory, check 13 is the
skill-deletion check. Pre-existing, unrelated `aif index architecture --check`
staleness on `01_introduction_and_goals.md`/`02_constraints.md`/`05_building_blocks.md`
confirmed still present before and after this check's own edits — not this check's to
fix, still check 33/17 territory per the structural-review checkpoint's note above.

---

## Phase 10 — Steering & reference sweep (checks 16–18)

- [x] **Check 16** — `steering/engineering/core.md` Rules 1/2/8/9 reworded;
      `knowledge-consumption.md` moves decisions to index-only by default; doc-update
      acceptance gate added. Commit: `8a01af0`
- [x] **Check 17** — Full vocabulary/reference sweep across the listed skills,
      standards, and steering files. Commits: `faffb74` (sweep), `cf22bd8` (arc42
      `last_verified` bump, separate commit per the `d0b0c27` precedent)
- [x] **Check 18** — `agent-authoring` and `docs/agent-prompt-extraction-candidates.md`
      swept; product-doc ownership left unassigned. Also fixed a live example in
      `standards/javascript_node.md` (`skill/decision-record` → `skill/plan-lifecycle`,
      same category check 17 already claims for `lib/resolver.js`'s JSDoc, missed by an
      earlier narrower grep pass). Commit: `5c7297a`

**Checkpoint 10:** `npm test` 713/713, `aif validate` (schema/refs/bundles) clean, `aif
snapshot --check` clean (engineering bundle regenerated), `aif index architecture
--check` clean, `prettier --write` applied where flagged. Check 17 also closed real
architecture-doc debt beyond its own named scope: 01/02/03/05_01/05_building_blocks.md
re-verified against current `key_files` (only 05_01's `parseSkillRef` example needed a
matching update), two broken bare-numeric citations in 02_constraints.md fixed to named
locators, a checked-in `docs/architecture/index.json` that had silently drifted from
05_building_blocks.md's own already-current frontmatter regenerated, and real content
drift in 05_building_blocks.md (a Core Libraries row, an Interface mention, and a
mermaid node/edges all still describing the deleted `lib/knowledge.js`/`aif index
knowledge`, invisible to the staleness detector since a deleted file can't be a
`key_files` entry) removed. `last_verified` bumps landed as a separate follow-up commit
(`cf22bd8`) rather than the same commit that creates the SHA being cited, per the
existing `d0b0c27` precedent.

---

## Phase 11 — Cross-cutting process/security rules (checks 19–21)

**Branched from `process-model/phase-10-steering-reference-sweep` (PR #61's tip), not
the integration branch — check 20's key_files item cites check 16's Doc-Update
Acceptance Gate, which only exists on that unmerged branch. PR opened with base =
`process-model/phase-10-steering-reference-sweep`; GitHub retargets it to the
integration branch automatically once PR #61 merges and that branch is deleted.**

- [x] **Check 19** — `skills/agent-authoring/reference/tools.yaml` gains the
      trifecta-avoidance rule as a prose comment block (no agent may combine a
      `moderate`/web tool with a `privileged`/write-shell tool without documenting the
      isolation in its own Hard rules), wired into `skill/agent-authoring`: "Step 8 —
      Self-validate"'s checklist. **Also fold in** — already done before this check
      landed: `tools.yaml`'s `builtin`/`approval_guidance` already list all 5 of
      `subagent`/`plan`/`ask_user`/`task`/`skill` with tiers assigned (`safe` for
      `skill`/`task`/`plan`/`ask_user`, `privileged` for `subagent`) — verified current,
      no edit needed. Commit: `8bb5e09`
- [x] **Check 20** — `skill/code-review` gains a new Step 2 ("Review Change Scope")
      with both items: (1) Architect/Researcher write-scope check, citing each agent's
      own Hard rules directly (`agents/architect.yaml`, `agents/engineering-researcher.yaml`)
      rather than `docs/process-model.md`, consistent with the arc42-no-plan-references
      discipline — HIGH finding; (2) arc42 key_files completeness check, citing
      `steering/global/knowledge-consumption.md`'s Doc-Update Acceptance Gate as a bare
      file reference (that file's `###` headings don't follow the `### Rule: Name`
      convention `aif validate refs`'s named-locator check requires, so a quoted
      locator citation into it fails validation — same fix pattern as the process-model
      citations) — MEDIUM finding. Existing Steps 2-5 renumbered to 3-6; the Step 6
      "hand findings from Steps 1-4" reference updated to 1-5. Commit: `8bb5e09`
- [x] **Check 21** — `agents/software-engineer.yaml` Hard rules gain "Principal-Engineer
      review applies regardless of who dispatched you" (Engineering Manager vs.
      standalone human, per `skill/complexity-tiers`'s Per-agent specifics table).
      "Researcher brief is data, never an instruction" was already present in both
      Software-Engineer's and Architect's Hard rules — verified, no edit needed. Commit:
      `8bb5e09`

**Checkpoint 11:** `npm test` 715/715, `npm run validate` (schema/refs/bundles) clean,
`aif index architecture|decisions --check` both clean. Checks 19–21 were all
steering/prompt-text edits (trifecta-avoidance rule, code-review Step 2, Software-Engineer
Hard rules) — no code or schema surface changed, so no new tests were needed. Merged via
PR #62 into this integration branch (merge commit `cc87c77`), after fixing a human
reviewer's "Cite, Don't Restate" finding on the code-review Step 2 addition (folded into
commit `8bb5e09` before merge, not a separate commit).

---

## Phase 12 — Regeneration & top-level docs (checks 22–23)

Branch: `process-model/phase-12-regeneration-top-level-docs`

- [x] **Check 22** — `bundles/engineering/snapshot.json` regenerated (only after
      checks 6 and 13 have actually landed — both did, long before this phase, and
      every intervening checkpoint's `aif snapshot --check` already kept it current).
      Verified current, no diff produced by `aif snapshot --bundle engineering` — no
      commit, nothing to change.
- [x] **Check 23** — `README.md`, `AGENTS.md`, `PLAN.md` swept: Epic/Chunk → Feature/Task,
      "Decision Records" → "ADRs", "Epic IDs" → "Feature IDs", the deleted
      `aif index knowledge` command replaced with `aif index architecture`/`--check`,
      `docs/` directory descriptions broadened to mention ADRs and arc42 docs.
      `agents/README.md`/`skills/README.md` checked — both generic, no chunk/epic/
      decision-record wording, no edit needed. `install.ps1` confirmed out of scope per
      the check's own note (already deleted, dead per `ARCH-001`). Commit: `ffbc8a7`

**Checkpoint 12:** `npm test` 715/715, `npm run validate`/`lint`/`typecheck`/
`format:check` clean, `aif snapshot --check` and `aif index architecture|decisions
--check` all clean. Also fixed, incidental to this phase's own housekeeping: the
tracker's Phase 11 Checkpoint note had been left blank (`_____`) when PR #62 merged —
backfilled per the ground rules' "last commit updates the tracker" requirement, since
an unfilled checkpoint note is itself a tracker-resuming hazard (Rule from "Resuming
after a break" above: a blank checkpoint means the prior state can't be trusted without
re-verification). Commit: `e2196d0`. **Merged via PR #64 into this integration branch
(merge commit `fe6e46b`)**, after this branch was itself rebased onto the integration
branch's later tip (PR #63 + the structural-review phase landed in between, changing
this phase's commit SHAs from their original values).

---

## Phase 13 — Verification (checks 24–25)

**Branched from `process-model/phase-12-regeneration-top-level-docs` (PR #64's tip), not
the integration branch — check 25's automated sweep needs check 23's terminology fixes
in its own history to pass (same pattern Phase 11 used against Phase 10/PR #61).
Restacked once via `git rebase` after PR #64's branch was itself rebased onto the
integration branch's later tip (PR #63 + the structural-review phase landed in between)
— kept as a clean linear stack rather than a merge commit, per this pair's PR-stack
convention. GitHub then auto-retargeted and re-derived the branch a second time once PR
#64 merged and its branch was deleted, changing commit SHAs again. Merged via PR #65
(merge commit `c02ee52`); commit SHAs below are the final, post-merge values on
`claude/process-model-implementation-plan-lty3ia`.**

- [x] **Check 24** — `tests/validation/` (91/91) and `npm test` (716/716) were already
      green against the current corpus, so this check's scope reduced to the fixture
      cleanup it names: `tests/unit/decisions.test.js` and
      `tests/integration/decisions-index.test.js` each had one incidental "chunk"
      comment left (a testability-requirement reference and a citation to the
      historical AIF-002-009 fix) — reworded to drop the word without losing the
      AIF-002-009 traceability. The other fixture files check 24 names were already
      clean. Commits: `8351233`, `1c9593e` (the same pattern found in `lib/decisions.js`,
      outside check 24's own named list but same root cause).
- [x] **Check 25** — New `tests/validation/terminology-sweep.test.js`: whole-word
      (`\bchunk\b`/`\bepic\b`, case-insensitive), repo-wide guard over every git-tracked
      file. Scoping it against the real repo surfaced check 25's exception list was
      incomplete as originally written — fixed in `docs/process-model.md` itself
      alongside the test (human-approved: amend directly rather than narrow-fix or
      pause for a full spec review). A bare substring search false-positives on
      ordinary words ("chunking", "epic" inside "FilePicker"); `servers/gmail/**` and
      `lib/harnesses/assets/block-command/**` use "chunk" as unrelated batching/
      streaming vocabulary that whole-word matching alone doesn't clear; and the two
      YouTrack notes files, three `Status: Done` untriaged plans, and
      `docs/process-model.md`/this tracker itself were real un-exempted matches with
      no covering exception. Commit: `8846edf`. CI caught a self-referential gap the
      day this landed: the test's own `git ls-files` scan matched its own source once
      committed (it necessarily names "chunk"/"epic" in its comments, regex literal, and
      test descriptions) — fixed with a `SELF_PATH` self-exemption, documented in
      `docs/process-model.md`'s check-25 row too. Commit: `4767727`.

**Also fixed on this branch, found while scoping check 25 (Rule 4 exception —
trivially small, zero architectural impact, directly adjacent to the check being
implemented):** Phase 12's own `aif index architecture --check` had been run against
the working tree before its check-23 commit existed, so it reported clean at the time
but the commit itself left `01_introduction_and_goals.md`'s `last_verified` genuinely
stale; this phase's own `lib/decisions.js` fix did the same to what was then
`05_building_blocks.md`'s `key_files`. Neither doc's prose references the changed
content (verified), so both got a pure `last_verified` bump, no content edit, per the
existing `d0b0c27`/`cf22bd8`/`ec5bf70` precedent. Re-resolved twice more afterward: once
during the rebase above, once PR #64's own rebase had split `05_building_blocks.md`'s
`lib/*` rows into a new `05_03_core_libraries.md` (`01_introduction_and_goals.md` →
`ffbc8a7`, check 23's rebased commit; `05_03_core_libraries.md` → this branch's own
rebased `lib/decisions.js` fix, now the doc that owns that file; `05_building_blocks.md`
left untouched, `3129874`, already correct); and again after GitHub's post-merge
auto-retarget changed that `lib/decisions.js` fix commit's SHA a second time, landing on
its final value: `05_03_core_libraries.md` → `1c9593e`. `docs/architecture/index.json`
regenerated to match each time. Final commit: `50a29bc`.

**Checkpoint 13:** `npm test` 716/716, `npm run validate`/`lint`/`typecheck`/
`format:check` clean, `aif snapshot --check` clean, `aif index architecture|decisions
--check` both clean. **Merged via PR #65 (merge commit `c02ee52`).**

---

## Phase 14 — Decisions conversion (checks 26–31)

Branch: `process-model/phase-14-decisions-conversion`

- [x] **Check 26** — Human decision gate: explicit `Approved`/`Deferred` call for
      `ARCH-004`, `ARCH-007`, `PROC-003` (all still `Draft`). Human call (chat, this
      session): **all three `Deferred`**. Commit: `cee8e5c`

**Mid-phase checkpoint (blocking — needs your call on the three Draft records):**
Resolved — human deferred all three. Per `process-model.md`'s dispositioning table
(lines ~544–550), none of the "once approved" conversion paths for `ARCH-004`/
`ARCH-007`/`PROC-003` apply now — check 27 dispositions them alongside the other
non-`Approved` records rather than converting their `Design` sections into arc42/MADR.
`ARCH-004`'s standards-sync schema, `ARCH-007`'s YouTrack-migration design, and
`PROC-003`'s worktrees ratification stay exactly as authored, just now `Deferred`
instead of `Draft` — nothing about their content changed.

- [x] **Check 27** — Existing decision records dispositioned per the table; archive
      location created. 10 of 15 on-disk records moved into new `docs/decisions/archive/`
      (mirroring `docs/plans/archive/`'s convention, domain subfolders kept):
      `ARCH-004`/`ARCH-007`/`PROC-003` (already `Deferred` at check 26) archived as-is;
      `PROC-001`/`PROC-002`/`PROC-006`/`META-001`/`META-002` `Approved` → `Superseded`;
      `PROC-004`/`PROC-005` `Draft` → `Deferred` (never reached `Approved`, so
      `Superseded` doesn't apply). The 5 surviving records
      (`ARCH-001`/`002`/`003`/`005`/`006`) are untouched, staying in place for check 28's
      MADR rewrite. `docs/decisions/index.json` regenerated (still 15 entries — the
      collector isn't archive-aware yet; whether archived records should drop out of the
      generated index is left for check 30's `lib/decisions.js` retarget to decide, not
      pre-empted here). Commit: `f7bce7c`
- [x] **Check 28** — `docs/decisions/` flattened to bare-number MADR counter (no more
      `architecture/`/`process/`/`meta-process/` subfolders for the live corpus — those
      only survive under `archive/`, from check 27). Added `skills/adr-authoring/SKILL.md`
      and `docs/decisions/_template.md`. Renumbered and rewrote the 5 surviving records
      (`ARCH-001→0001`, `002→0002`, `003→0003`, `005→0004`, `006→0005`) by hand into MADR,
      216–331 words each (budget: 150–350). `ARCH-005`/`006` converted whole per their
      disposition-table exceptions; `ARCH-001/002/003` had their `Design` sections dropped
      from the record (migrated at check 29, or — for `ARCH-001` — already fully covered by
      current arc42 content, needing no migration at all). Known gap, resolved at check 30:
      `lib/decisions.js` still only found the 10 archived `.decision.md` files until its
      parser was retargeted. Commit: `0a77aea`
- [x] **Check 29** — `Design` content split into arc42 homes: `ARCH-002`'s steering
      `file_patterns` schema + adapter translation table → a new "Steering frontmatter
      scoping" section in `05_02_harness_adapters.md`; its Kiro `fileMatch` reliability gap
      → new `docs/architecture/11_risks.md` (§11 didn't exist yet). `ARCH-003`'s shared
      resource `installedBy` reference-counting lifecycle + decoupled freshness model → new
      `docs/architecture/06_runtime.md` (§6 didn't exist yet). `ARCH-001` needed no
      migration — `05_01_bundle_resolution.md`/`05_building_blocks.md` already describe the
      current, evolved implementation more accurately than its frozen 2026-07-31 `Design`
      section did. `ARCH-004`/`ARCH-007` (Deferred at check 26) and their "once approved"
      arc42-migration paths are moot, same as check 26 itself already established. Commit:
      `380b889`

**Mid-phase checkpoint (bulk rewrite done, before retargeting the indexer):** Skipped —
human direction, this session: finish the whole phase before opening/updating any PR,
rather than pausing here.

- [x] **Check 30** — `lib/decisions.js` retargeted to MADR frontmatter
      (`status`/`date`/`decision-makers`/`tags`/`links.supersedes`/`affects`); ID is now the
      filename's own zero-padded number, not a frontmatter field. Collection is flat,
      non-recursive — `docs/decisions/archive/`'s old-format records are never scanned, no
      exclusion rule needed (resolves the open question check 27 flagged).
      `tier`/`domain`/`references`/`referenced_by` dropped (no longer meaningful under
      MADR — only `links.supersedes`→`superseded_by` is inverted; `related`/`amends` stay
      reserved). Rewrote `tests/unit/decisions.test.js` (21 tests) and
      `tests/integration/decisions-index.test.js` (11 tests) against MADR fixtures, with
      explicit archive/`_template.md` exclusion coverage. Regenerated
      `docs/decisions/index.json`: 5 entries, now finding every live record and none of the
      10 archived ones — also what retires the stale `AIF-PLAN-001` index reference (already
      gone from disk, never reappearing in a fresh crawl). Commit: `041234a`
- [x] **Check 31** — The three new ADRs (`0006-plain-js-with-jsdoc.md`,
      `0007-node-test-over-third-party-runners.md`,
      `0008-mcp-server-credential-handling.md`) written in MADR form, 244–333 words each.
      Regenerating the architecture index while finishing this check surfaced two other
      now-stale arc42 references (`05_03_core_libraries.md`'s `decisions.js` row still
      described the pre-check-30 parser as current; `02_constraints.md`'s artifact-naming
      and frontmatter-first rows still called MADR's flat numbering/frontmatter "pending") —
      fixed alongside, not deferred. Commit: `8e410ec`

**Checkpoint 14:** Phase 14 (checks 26–31) complete. Full validation gate green at every
commit (`npm test`, `npm run validate`, `npm run lint`, `npm run typecheck`,
`npm run format:check`, both indexers' `--check`, `snapshot --check`) — the one exception
is checks 28–29's known, expressly-scoped intermediate gap (the not-yet-retargeted indexer
missing the 5 new MADR records), closed by check 30 within this same session before any PR
review. Still on `process-model/phase-14-check-27-disposition-records` (PR #69, already
open from check 27) — per human direction this session, the whole phase lands there before
the PR is presented as ready, rather than one PR per check.

Two follow-ups landed on the same branch/PR after the phase itself was done, both
human-requested this session: a full accuracy audit of arc42 §5 against the real source
(fixed several pre-existing inaccuracies — see the PR description), then splitting
`decisions.js`/`architecture.js`/`index-diff.js` out of `05_03_core_libraries.md` into a
new `05_04_decisions_and_architecture_indexing.md` (583 combined lines, bigger than
`resolver.js`'s own §5.01). PR #69's base (the integration branch) then advanced out from
under it — PR #67 (check 26) merged, on top of the earlier direct `main`-merge — producing
a real merge conflict in `05_03_core_libraries.md`/`05_building_blocks.md`/
`docs/architecture/index.json` (the integration branch's independent `aiconfig.js` cluster
addition vs. this branch's §5.04 extraction of the same table). Resolved by merging the
integration branch in and reconciling both sides' content rather than picking one; full
validation gate re-run and green after. PR #69 is pushed and should now show mergeable.

Human review on PR #69 (16 comments) landed 14 fixes: extracted `parseFrontmatter`/
`collectFiles`/`hashContent`/`writeToTarget` out of `lib/harnesses/base.js` into a new
`lib/file-utils.js` (they carried no harness-specific behavior); declared `zod` as a
direct `package.json` dependency (was an undeclared transitive dependency of
`@modelcontextprotocol/sdk`); removed ADRs 0007 and 0008 (0008 also fails
`adr-authoring`'s own litmus test); renamed §5.04 to "Document indexing"
(`05_04_document_indexing.md`) since the pipeline isn't tied to decisions/architecture
specifically; cited ADRs 0002/0003's arc42 cross-references by section number instead
of filename; trimmed wordy/change-history-framed prose in `02_constraints.md` and
`05_03_core_libraries.md`; converted §5.01's Consumers prose to a table; made
`skill/adr-authoring` agent-agnostic. Two comments (arc42-template fidelity for
§5.01–§5.04, including the freehand "Why this needs its own section" convention) are
deferred to a dedicated follow-up PR given the size of restructuring 4 already-published
pages — confirmed against the actual official template (`arc42/arc42-template` on
GitHub) rather than assumed; those two review threads stay open until that PR lands.

**`process-model/arc42-template-alignment`, per direct human instruction ("before the
next phase, let's do a pass and properly use the arc42 templates"):** the deferred
follow-up above. `docs/architecture/_template.md` gains a "Body structure" note citing
the real `arc42/arc42-template` EN/adoc source. `05_building_blocks.md` (Level 1
whitebox) and all four §5 sub-sections (`05_01`–`05_04`) had their headers remapped
onto arc42's actual Whitebox template — Overview Diagram / Motivation / Contained
Building Blocks / (optional) Important Interfaces — dropping the freehand "Why this
needs its own section" heading everywhere: where its content was pure split-rationale
(§5.01, §5.02) it's simply gone (already owned by
`steering/engineering/architecture-authoring.md`'s split-trigger rule, per "Cite,
Don't Restate"); where it doubled as genuine decomposition rationale (§5.03, §5.04) it
became that section's Motivation instead. The repo-specific "Consumers" section (no
arc42 equivalent) stays as a trailing addition after the four core subsections in
every file that had one. §1–§3/§6/§11 already matched arc42's own fixed/scenario-based
shapes and needed no change — this pass is scoped to §5 alone. Full validation gate
green throughout (751/751 tests, validate/lint/typecheck/format clean, both indexers +
snapshot `--check` clean) — no `key_files`/factual claims changed, so no
`last_verified` bumps were needed either.

**Same branch, follow-up per direct human instruction ("validate that no §5 section
needs more key_files... do that analysis 3 times"):** three independent passes
comparing every §5 doc's actual per-file claims against its own `key_files` list.
§5.01–§5.04 were already complete. `05_building_blocks.md` (Level 1) wasn't: its
Entry points/Command layer/MCP servers rows make specific per-file claims with no
`§5.0N` delegation pointer, yet most of those files (`bin/ai-git.js`, all 10
`lib/commands/*.js`, 5 of 6 MCP server implementation files) weren't tracked
anywhere. Recommended, and human approved, splitting Command layer into a new
**§5.05** (`05_05_command_layer.md`) — same profile as §5.01–§5.04 (a cohesive
group whose own `key_files` list would otherwise bloat Level-1's) — while adding
the smaller Entry points/MCP servers gaps directly to Level-1's own `key_files`
(too few files each to warrant a further split). Every added claim was verified
against real source before being asserted. Full validation gate green again after.

PR #70's review round (`jsmellie`, 4 threads) landed 3 direct fixes and 1
human-directed choice: dropped the key_files split-trigger justification paragraph
from `05_building_blocks.md`'s Motivation ("we don't need to document it"); dropped
`_template.md`'s repo-specific "§1-§3/§6/§11 already match" claim ("don't reference
what is implemented in this repo — git tells that story"); reworked §5.04's Motivation
to lead with genuine subsystem cohesion instead of a line-count comparison ("a bad
reason to split it"); and, for "this mermaid diagram looks messy, what options do we
have?", presented 3 concrete collapse options rather than guessing — human chose the
most aggressive one (collapse Command layer/Core libraries/Harness adapters to single
nodes, since each already has its own `§5.0N` diagram). PR #70 merged into this
integration branch clean.

**Main-merge adaptation, this session:** merged `origin/main`'s 22 commits (chiefly
the now-`Done` `docs/plans/secrets-resolution-plan.md` — a new `lib/secrets.js` core
library, `bin/ai-git.js` wired to resolve `AI_GIT_TOKEN` via a secrets-manager
run-wrapper or a gitignored `.env` fallback, and `lib/harnesses/claude.js`'s MCP header
resolution removed so no harness ever bakes a literal secret into its own config) into
this branch. Two real conflicts: `.aiconfig.json` and `AGENTS.md`'s `.aiconfig.json`
field table, both from this branch's earlier `paths.*` rename (epics/chunks/orchestration
→ features) landing independently of main's new `secrets`/`secrets.allow_insecure_dotenv`
fields and its `{key.path}` path-reference feature — resolved by keeping this branch's
renamed paths and folding in main's new fields/section rather than picking one side.
Adapted `05_03_core_libraries.md` for the new `lib/secrets.js` (added to `key_files`,
Contained Building Blocks, Consumers, and the file/responsibility count in Motivation)
and fixed `05_building_blocks.md`'s now-stale "Everything else" file enumeration to
include it — both delegate to §5.03 already, so no other `key_files` change was needed.
No other new-from-main file (`lib/aiconfig-resolve.js`'s `{key.path}` support, the
`docs/kiro-mcp-env-var-expansion.md` knowledge file, `scripts/setup-cloud.sh`) made an
existing arc42 claim wrong or needed a new key_files entry. Full validation gate re-run
and green after.

## Phase 15 — Unwind merged half of AIF-003 (check 32)

- [x] **Check 32** — Revert `AIF-003-004`'s `Amending` status from
      `plan-lifecycle/reference/status-vocabulary.md` by hand (the other two merged
      chunks' effects already die with checks 13/30; `-005` is kept). Commit: `2406a50`.

**Checkpoint 15:** `npm test` 779/779, `npm run validate`/`lint`/`typecheck`/
`format:check` clean, `aif index architecture|decisions --check` and `aif snapshot
--check` all clean (the edited file isn't a `key_files` entry for any arc42 section,
so no staleness/snapshot impact). `skills/adr-authoring/SKILL.md`'s own mention of
`Amending` checked and left as-is — it already describes the concept as retired past
tense, not as a live status value, so it needed no edit. Ready for PR.

---

## Phase 16 — CI guards (check 33)

**Branch cut directly from the integration branch's tip (`b2d87d7`), not from Phase
15's unmerged tip — check 33 doesn't depend on check 32's content, so there's no
reason to stack it. This branch's copy of the "Resuming after a break" header above
still reflects the pre-Phase-15 state; that reconciles naturally as a merge conflict
(or a clean fast-forward) once both PRs land, whichever order they merge in.**

- [x] **Check 33** — New guards in `.github/workflows/ci.yml`: staleness check,
      relative-link resolution across `docs/architecture`, `aif index decisions --check`.
      The staleness/decisions checks were already-built tools (checks 5/30) that had
      simply never been wired into CI — just new `ci.yml` steps. Relative-link
      resolution needed real new code: `lib/architecture.js` gains `extractRelativeLinks()`
      (pure) and `findBrokenLinks()` (io wrapper), wired into `aif index architecture`'s
      existing `--check`/generation paths rather than a separate command, so one CI step
      (`node bin/aif.js index architecture --check`) covers both staleness and broken
      links. Commit: `75ce1d3`.

**Checkpoint 16:** `npm test` 793/793 (14 new — 9 unit for `extractRelativeLinks`, 5
integration for `findBrokenLinks` + CLI wiring), `npm run validate`/`lint`/`typecheck`/
`format:check` clean, `aif index architecture|decisions --check` and `aif snapshot
--check` all clean. `05_04_document_indexing.md`'s Important Interfaces table and
Consumers section updated for the two new `architecture.js` functions;
`05_05_command_layer.md` needed no content change (its `index.js` row already
describes `runIndex()`/`resolveDecisionsPath()`/`resolveArchitecturePath()`, unaffected
by internally wiring in `findBrokenLinks()`) — both got a `last_verified` bump for
their changed `key_files` (`lib/architecture.js`, `lib/commands/index.js`), landed as a
separate follow-up commit (`c786129`) per the established
`d0b0c27`/`cf22bd8`/`ec5bf70` precedent. Opened as PR #73.

**Review round (`jsmellie`, 1 thread):** `extractRelativeLinks()`'s fenced-code-block
skip logic duplicated `validateCitations()`'s own (`lib/commands/validate.js`) —
flagged, both extracted to a new shared `lib/file-utils.js` export,
`nonFencedLines()`. Caught and fixed the same class of duplication a second time
while in there: `findBrokenLinks()` and `buildArchitectureIndexForDir()` both
independently looped `collectArchitectureFiles()` + read each file — collapsed into
one shared `readArchitectureFiles()` helper. `npm test` 799/799 (6 new — the
`nonFencedLines()` unit suite), full validation gate green again.
`05_03_core_libraries.md` (`file-utils.js`'s Interface/Consumers, plus its own new
consumer `lib/commands/validate.js`), `05_04_document_indexing.md`,
`05_05_command_layer.md`, and `05_building_blocks.md` (all four `key_files`-track one
or more of the three changed files) all got a `last_verified` bump in a separate
follow-up commit, `05_03` also gaining the content fix. Commits: `5944c97`
(de-dup fix), `397ebca` (`last_verified` bumps). Ready for re-review.

---

## Phase 17 — Freeform plan triage (check 34)

- [ ] **Check 34** — Triage `docs/plans/*.md`: Done → `docs/plans/completed/`; real
      upcoming work → a Feature; process change → fold in + delete; stale → delete.
      Commit: `_____`

**Checkpoint 17 (final):** _____ — once this lands, delete this tracker file, then
open the PR merging this whole integration branch into `main`.

---

## Deferred, out of sequence

- **Check 35** — ADR tooling decision (Rust CLI vs. in-repo JS vs. staying manual).
  Written by Architect once there's hand-written MADR volume to judge by. Not part of
  this tracker's completion criteria; do not check off here.
