# Epic Plan: Chunk/Epic Planning Model Redesign

## 1. Metadata

| Field               | Value                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Epic ID             | AIF-004                                                                                                                                                                                                                                                                                                                                                                                          |
| Project             | ai-foundation                                                                                                                                                                                                                                                                                                                                                                                    |
| Status              | Deferred                                                                                                                                                                                                                                                                                                                                                                                         |
| Author (Agent)      | Tech-Lead                                                                                                                                                                                                                                                                                                                                                                                        |
| Reviewed By         | Pending                                                                                                                                                                                                                                                                                                                                                                                          |
| Created             | 2026-08-24                                                                                                                                                                                                                                                                                                                                                                                       |
| Last Updated        | 2026-09-12 (Deferred and archived per `docs/process-model.md` check 2: this Epic's planning-redesign work is superseded — its valid pieces, e.g. one gate per Feature and a tier-aware pipeline, roll into `docs/process-model.md` directly. Never dispatched — no `chunks.json`, no orchestration state, no branches or PRs to unwind. 2026-08-25 (renumbered AIF-003 → AIF-004; see Work Log)) |
| Standards           | Predominantly declarative AI-component work (`skills/`, `agents/`, `steering/`) governed by the AGENTS.md component schemas and owned by AI-Engineer per `AIF-PROC-001`. The `tests/validation/` cross-reference test (and any `servers/dag/` change, pending Open Question 2) is real runtime code under this project's `javascript`/`node` engineering standards, owned by Software-Engineer.  |
| Total Chunks        | {filled after decomposition}                                                                                                                                                                                                                                                                                                                                                                     |
| Product Requirement | None                                                                                                                                                                                                                                                                                                                                                                                             |
| Decision Records    | `AIF-PROC-001` (Approved), `AIF-PROC-002` (Approved — amendment required, see OQ1), `AIF-PROC-006` (Approved — amendment required, see OQ1), `AIF-PLAN-001` (Deferred 2026-08-24 in favour of this Epic), `AIF-ARCH-007` (Draft — not authoritative, see Risk 8)                                                                                                                                 |

---

## 2. Goal

Replace the current 14-section, individually-approved Chunk Plan — and the dedicated Software-Engineer → Test-Engineer → Principal-Engineer relay it triggers for every chunk regardless of size — with a lightweight chunk work item embedded directly in `chunks.json`, approved once as part of the epic's decomposition. Complexity tiers are applied per chunk so trivial chunks skip the Test-Engineer step, while Principal-Engineer review is retained for every chunk on every track. Security review criteria and a real, gating Epic Test Plan move up to the epic level, written and approved before any chunk implementation begins. The wave-based concurrency machinery (`chunks.json`, `dag-compute-waves`, worktrees) is preserved.

What the developer gets: one approval gate per epic instead of one per chunk, with the chunk boundaries visible _at_ that gate rather than decided unilaterally afterwards; proportionate process for small changes; and an epic-level test plan that actually blocks completion instead of a per-chunk testing section written after the fact.

> Requirement traceability: `docs/plans/chunk-epic-planning-redesign-plan.md` (source plan, Draft — superseded by this Epic on approval). `AIF-ARCH-007` Open Item 3 asked whether that plan should become an Epic; this Epic is the answer.

---

## 3. Quick Summary

**Open Items:** 3 open (1 High / 2 Medium) — see Section 8

**Blocked on:** Open Question 1 — `AIF-PROC-002` and `AIF-PROC-006` require Architect amendment before the affected chunks may be implemented.

---

## 4. Scope

### In Scope

**Chunk work item replaces the Chunk Plan**

- Extend the `chunks.json` chunk object schema with `goal` (string, one paragraph), `files` (string[]), `acceptance_criteria` (string[], 3–5 items), `tier` (1|2|3, per `skill/complexity-tiers`), and `high_risk` (boolean). Existing `id`/`title`/`depends_on`/`agents` are unchanged.
- All five new fields are **required**, with no legacy fallback and no optional-with-default accommodation (human decision — see Section 5 Business Rules). `AIF-001` and `AIF-002` are both fully `Done`, so no in-flight decomposition exists to migrate.
- Delete `skills/chunk-planning/` entirely (SKILL.md + `reference/template.md`), **explicitly rehoming** its two non-redundant assets rather than dropping them: the AI-Track Chunks procedure (the operative text of `AIF-PROC-002`) and all four Edge Cases — including the AI-track boundary-escalation case that is `AIF-PROC-006`'s entire fallback mechanism. Both move into `epic-planning`.
- Update `skills/epic-planning/reference/chunks-schema.md` and `skills/epic-planning/assets/chunks.json` to cover every new field, including the worked example.

**Decomposition moves inside the epic gate**

- Merge `epic-planning` Step 5 (decompose, currently post-approval) into Step 3 (write the plan, pre-approval). The epic author drafts the Epic Plan and `chunks.json` together, runs `dag-validate`, and a single Draft → Approved commit-gate covers both artifacts as one package. This is load-bearing, not cosmetic: removing the per-chunk gate while leaving decomposition after the epic gate would leave chunk boundaries reviewed by a human at no point at all.
- Assign `tier` and `high_risk` at decomposition time. `high_risk` is set manually by Tech-Lead, by checking each chunk's `files` against the epic's Section 7.

**Epic-level test plan and security criteria**

- New epic template Section 9 (Epic Test Plan) with four required subsections: Feature verification (`Feature | Scenario | Automated? | Test Case ID`), Integration points (`Boundary | What crosses it | Verification approach`), Regression scope (`Existing area at risk | Why this epic endangers it | Verification approach` — "run the test suite" is not acceptable content), and Sign-off (`Item | Validator (role) | When (gate point)`). Automatable rows use the `Test ID | Description | Type | Pass Criteria` shape so `test-execution` consumes them directly. Written and approved at epic-gate time, never after implementation.
- Rewrite epic template Section 7 (Security Considerations) to cover only what is specific to the feature — trust boundaries crossed, sensitive data introduced or moved, authz decisions, new attack surface. General rules already in standards are not restated, and "no epic-specific considerations beyond the standards" is documented as a valid, complete answer. Whatever is written becomes a named Principal-Engineer review criterion for chunks flagged `high_risk`.
- Renumber the remaining epic template sections accordingly.

**Tier-aware orchestration**

- `chunk-orchestration` Step 1: the gate now confirms the Epic's `Approved` status covers both the epic document and `chunks.json` as one package. Step 2: drop the per-chunk plan-approval check; read `tier`/`high_risk` to pick pipeline shape. Step 3: branch by tier — **Tier 1 and not `high_risk`** runs implementer → self-validate → **Principal-Engineer** → Done, skipping only Test-Engineer; **Tier 2/3 or `high_risk: true`** runs the full relay unchanged.
- **Principal-Engineer review is never skipped, on any tier or track.** This preserves `AIF-PROC-002`'s "only the track-specific tester step is skipped, not review" and is a deliberate narrowing of the source plan, which had proposed skipping PE for Tier 1.
- Replace the "epic has only one chunk — no shortcuts" edge case: pipeline shape is determined by `tier`/`high_risk` alone, independent of chunk count.
- Step 6 becomes a real gate. Once all chunks are `Done`, a Test-Engineer runs the Epic Test Plan in epic-acceptance mode against the merged result; manual sign-off items are presented to the human per the Sign-off table. The epic cannot reach `Complete` while any automated scenario fails or any required sign-off is outstanding.

**Two-mode test execution**

- Rewrite `test-execution` Inputs and Step 1 into chunk-level mode (test cases sourced from the chunk's `acceptance_criteria` plus Epic Test Plan rows whose scope touches that chunk's `files`) and epic-acceptance mode (the full Epic Test Plan). Both reuse the existing Test Results Report template and unit/integration/validation category structure.
- Update `skills/test-execution/reference/template.md`, which is currently keyed `# Test Results: {Chunk Plan ID}`.

**Full terminology retirement sweep** _(human decision — the source plan's 13-component table was undersized; 44 files reference the concept)_

- 6 agent YAMLs: `tech-lead.yaml` (description, prompt, responsibilities, hard rules, and its `skills:` array which literally lists `skill/chunk-planning`), plus `software-engineer.yaml`, `test-engineer.yaml`, `principal-engineer.yaml`, `engineering-manager.yaml`, `engineering-tech-writer.yaml`.
- `skills/code-review/SKILL.md` and `reference/template.md` — **pulled into scope** (human decision), overriding the source plan's Out of Scope entry. This is a functional break, not cosmetic: code-review takes "Chunk Plan" as an Input and keys its report `# Review Report: {Chunk Plan ID}`, so with Chunk Plans gone Principal-Engineer would be reviewing against a nonexistent artifact.
- `skills/plan-lifecycle/SKILL.md`, `reference/commit-gate-procedure.md`, and `reference/status-vocabulary.md` — remove Chunk Plan as an independently-gated artifact type; note that chunk work items are fields inside `chunks.json` governed by the parent Epic Plan's `Status`.
- Add the `Approved → Deferred` transition to `status-vocabulary.md`, which does not currently permit it. Rationale (human): `Approved` means _ready to implement_, not _implemented_, so an approved-but-unimplemented artifact must be able to be stood down without being falsely marked `Done` or `Superseded`. This was exercised on `AIF-PLAN-001` on 2026-08-24 ahead of the rule existing.
- `standards/javascript_base.md` and `standards/csharp_base.md` — the source-file header `Plan` field, currently defined as "the chunk plan ID", becomes `{EpicID}-{chunkId}` (e.g. `AIF-004-004`). This is already the repo's de facto convention (`AIF-002-006`, `AIF-002-014` appear in existing records) and preserves per-chunk traceability for engineering-core Rule 2.
- `README.md` (agent roster descriptions) and `install.ps1` (Tech-Lead role description).
- `steering/engineering/core.md` Rules 1, 8, 9; `steering/engineering/git-workflow-framework.md` Rule 3; `steering/engineering/git-workflow-projects.md` Rules 1–2. Approval-mechanism wording is written **tool-agnostically** (e.g. "a system that structurally prevents the agent from performing the approval transition itself") rather than hardcoding "committed to git", so `AIF-ARCH-007`'s YouTrack migration does not require a second rewrite of the same lines.
- Regenerate `bundles/engineering/snapshot.json`.
- Decision Records are **excluded** from the sweep as historical record.

**Validation**

- Add a `tests/validation/` cross-reference check that, for every `skills/{name}/SKILL.md`, resolves each `skill/{other}` reference to a real skill folder and each literal `reference/...`/`assets/...` path to a real file. Justification is on its own merits: this Epic deletes a skill referenced by six agent YAMLs, so a dangling-reference guard is protecting precisely the failure mode this Epic manufactures. (The source plan justified it as "would have caught the packaging bug" — that is not true, since the packaging defect was never a source-repo problem.)

### Out of Scope

- **Fixing the `lib/harnesses/claude.js` skill-install flattening bug.** Real and separately sized at roughly half a day — `kiro.js` already has the working `collectFiles()` pattern — but unrelated to this redesign. File as an independent Tier 1/2 fix.
- **Retroactive migration of `AIF-001`/`AIF-002`.** Both are fully `Done`; their `chunks.json` files and `AIF-002`'s 15 completed Chunk Plans stay as historical record.
- **Changes to `worktree-management`, and to `dag-compute-waves`' wave-computation logic.** Any `servers/dag/` change is confined to field validation and pass-through, and only if Open Question 2 resolves that way.
- **Redesigning the Principal-Engineer review process** beyond wiring epic Security Considerations in as a named criterion and repointing code-review at the new artifact.
- **Amending `AIF-PROC-002` and `AIF-PROC-006` themselves** — that is Architect's work, a prerequisite to this Epic rather than part of it (Open Question 1).
- **Any YouTrack integration** (`AIF-ARCH-007`) — that record is `Draft` and not authoritative.
- **`decision-record`, `decision-brief`, `decision-triage`, `knowledge-authoring`** — unaffected.

---

## 5. Feature Description

### User-Facing Behaviour

The "users" here are the human developer at the approval gate and the agents executing the pipeline.

**Today:** Tech-Lead writes an Epic and presents it with Section 9 empty and `Total Chunks` unknown. The human approves the epic without seeing how it will be split. Tech-Lead then decomposes into `chunks.json` unilaterally, and writes a separate 14-section Chunk Plan for each software-track chunk, each of which goes through its own Draft → Approved commit gate. A one-line wording fix and a cross-cutting schema change receive identical ceremony. Every chunk then runs the full SE → TE → PE relay. Testing is described per-chunk; nothing verifies the epic as a whole, and Step 6 of orchestration merely prints a summary.

**After:** Tech-Lead writes the Epic Plan and `chunks.json` together and presents them as one package. The human sees, at the single gate, the full chunk breakdown — each chunk's goal, the files it touches, its acceptance criteria, its complexity tier, and whether it is flagged high risk — alongside the Epic Test Plan that will gate completion and the epic-specific security criteria that Principal-Engineer will review against. One approval covers all of it. During execution, a Tier 1 chunk goes implementer → self-validate → Principal-Engineer → Done; anything Tier 2/3 or high-risk keeps the full relay. When the last chunk finishes, the epic does not complete until a Test-Engineer has run every automatable Epic Test Plan scenario against the merged result and the human has signed off the manual items.

### Data Flow

Goal or Decision Record → Tech-Lead drafts Epic Plan **and** `chunks.json` → `dag-validate` → single Draft → Approved commit gate (human) → Engineering-Manager reads `chunks.json`, calls `dag-compute-waves`, and reads `tier`/`high_risk` per chunk → per-chunk dispatch on the tier-appropriate pipeline, each in its own branch/worktree → all chunks `Done` → Test-Engineer epic-acceptance run against merged main → human sign-off on manual items → epic `Complete`.

### Business Rules

- A chunk work item is not an independently gated artifact. It has no `Status` of its own and is governed entirely by its parent Epic Plan's `Status`.
- Only `Approved` satisfies an approval gate. `Draft` and `Deferred` never do.
- Principal-Engineer review runs for every chunk, on every tier and every track. Tier and `high_risk` may only remove the Test-Engineer step.
- `high_risk: true` forces the full relay regardless of `tier`, and marks the chunk for review against the epic's named Section 7 concerns specifically, not just the general standards checklist.
- All five new `chunks.json` fields are required. There is no optional-with-default fallback and no legacy schema path — the implementation is unified (human decision: the framework is not yet widely adopted, so a clean break is cheaper than permanent dual-schema support).
- The Epic Test Plan is written before approval and is a completion gate, not a report. An epic with a failing automated scenario or an outstanding required sign-off stays `Blocked`/in progress.
- Chunk-level work log entries live in `orchestration-state.json` only. No per-chunk work log file is introduced (`AIF-PLAN-001`, which proposed sibling `.worklog.md` files, is Deferred; `AIF-ARCH-007` would move this to YouTrack entirely, so inventing a file now would create something immediately slated for retirement).

### Error States

| Scenario                                                                 | Expected Behaviour                                                                                                                                                            |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dag-validate` fails during decomposition                                | Fix and re-validate, up to 3 attempts. Escalate to the human with the errors and current `chunks.json` after that. Unchanged from today, but now happens **before** the gate. |
| `chunks.json` missing a required new field                               | Decomposition is not complete; the epic must not be presented for approval. Detection mechanism depends on Open Question 2.                                                   |
| Chunk turns out more complex than its assigned `tier` mid-implementation | The implementing agent stops and escalates per `complexity-tiers` Step 5, exactly as today. The chunk is re-tiered rather than finished under a stale assessment.             |
| Epic Test Plan scenario fails at Step 6                                  | Logged as a blocking finding; epic does not reach `Complete`.                                                                                                                 |
| Required manual sign-off outstanding at Step 6                           | Same — epic does not reach `Complete`.                                                                                                                                        |
| Epic Plan not `Approved` at orchestration Step 1                         | Stop before reading `chunks.json`, report to the human. Unchanged.                                                                                                            |

---

## 6. Architecture Overview

### New Components

| Component                       | Type                             | Responsibility                                                                                                             |
| ------------------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Chunk work item                 | Schema extension (`chunks.json`) | Carries goal, files, acceptance criteria, tier, and risk flag for one chunk — replacing the standalone Chunk Plan document |
| Epic Test Plan                  | Epic template Section 9          | Epic-wide verification contract, authored pre-approval, executed as the Step 6 completion gate                             |
| Epic-acceptance mode            | `test-execution` mode            | Runs the full Epic Test Plan against merged main                                                                           |
| Cross-reference validation test | `tests/validation/`              | Fails the suite on dangling `skill/{name}` or `reference/`/`assets/` references                                            |

### Component Relationships

`epic-planning` becomes the single producer of both gated planning artifacts for an epic and absorbs the AI-track procedure and edge cases previously held by `chunk-planning`. `plan-lifecycle` remains the sole owner of the gate mechanics and the status vocabulary, but now recognises one fewer artifact type. `chunk-orchestration` consumes `tier`/`high_risk` to select pipeline shape and gains a real completion gate that invokes `test-execution` in its new epic-acceptance mode. `code-review` and `test-execution` shift their input contract from "the Chunk Plan" to "the chunk work item plus the relevant Epic Test Plan rows". `complexity-tiers` is referenced, not modified — it already defines the tier semantics being applied.

### Integration Points

- `dag-validate` / `dag-compute-waves` (`servers/dag/`) — wave computation is untouched. Note that `logic.js` currently rebuilds each chunk object from only `id`/`title`/`depends_on`/`agents`, so it **silently strips unknown fields**; `chunk-orchestration` must therefore read `tier`/`high_risk` from `chunks.json` directly rather than from the tool's return value. See Open Question 2.
- `worktree-management` — unchanged; branch/worktree-per-chunk isolation is preserved exactly.
- `complexity-tiers` — supplies the Tier 1/2/3 definitions applied to chunks.
- `bundles/engineering/` — the deleted skill and every edited skill/agent ship through this bundle; the snapshot must be regenerated.

---

## 7. Security Considerations

No epic-specific security considerations beyond the active standards. This Epic changes planning documents, agent prompts, steering text, and one validation test; it introduces no new trust boundary, no sensitive data, no authz decision, and no new attack surface.

One governance-adjacent note, recorded here because it is the property most worth not regressing: the changes to `steering/engineering/core.md` and the two git-workflow files touch the mechanism that makes plan approval objectively checkable rather than a matter of conversational memory. The tool-agnostic rewording must preserve the substance of that guarantee — that the agent cannot perform its own approval transition — rather than merely generalising the words. Any chunk modifying those three files is a candidate for `high_risk: true` at decomposition time.

---

## 8. Risks & Open Questions

| #   | Risk / Question                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Type     | Impact | Source                             | Raised By | Resolved       |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------ | ---------------------------------- | --------- | -------------- |
| 1   | **`AIF-PROC-002` and `AIF-PROC-006` require Architect amendment before the affected chunks may be implemented.** `AIF-PROC-002` Resolved Item 2 gates AI-track chunk plans "at the standard chunk-plan path... exactly like a software-track Chunk Plan" — a comparator this Epic deletes. `AIF-PROC-006`'s entire escalation fallback is `chunk-planning`'s "Discovers work not in the Epic" edge case, and it states "no skill change needed" — deleting the skill invalidates that. Both are Approved Tier A records; an Epic may not contradict them. Human decision: route to Architect for review/amendment rather than absorb as a wording move.                                                                                                                                                                                                                         | Question | H      | `AIF-PROC-002`, `AIF-PROC-006`     | Tech-Lead | No — Architect |
| 2   | **Should `dag-validate` enforce the new required fields?** `servers/dag/logic.js` validates `title`/`depends_on`/`agents` and strips unknown fields, and no `tests/validation/` check covers `chunks.json` at all. With the new fields required and no legacy fallback, nothing currently fails fast when one is missing — the error would surface at dispatch instead of decomposition. Option (a): leave `servers/` untouched per the source plan's constraint; orchestration reads `chunks.json` directly and Tech-Lead is trusted to populate fields. Option (b): extend `dag-validate` to validate and pass through the new fields, leaving wave computation untouched — fail-fast exactly when Tech-Lead can still fix it, at the cost of a Software-Engineer chunk in `servers/` and a stricter reading of "preserve the machinery unchanged". Tech-Lead recommends (b). | Question | M      | `servers/dag/logic.js`             | Tech-Lead | No             |
| 3   | **Stale installed copies of the deleted skill.** `~/.claude/skills/chunk-planning/` exists on every machine that has installed the bundle and is tracked in `.installs.yaml`. Whether install/uninstall prunes files that have disappeared from the source is unverified. If it does not, agents keep resolving a retired skill from disk after this Epic ships. Needs verification during decomposition; may add a chunk.                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Question | M      | `.installs.yaml`, `lib/harnesses/` | Tech-Lead | No             |
| 4   | Moving decomposition inside the gate makes the epic gate heavier and revisions more expensive — each revision round re-runs `dag-validate` and re-presents the full chunk set. Mitigation: work-item fields are deliberately shallow (goal, files, acceptance criteria — no interfaces or signatures), so this should not reintroduce the ceremony being removed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Risk     | M      | Source plan Step 2                 | Tech-Lead | Accepted       |
| 5   | Removing the per-chunk gate removes a checkpoint where a human could catch a bad chunk boundary before implementation. Mitigation: the checkpoint moves rather than disappears — the epic gate now covers the full decomposition at once — but it is coarser-grained and happens earlier, before implementation has surfaced any surprises.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Risk     | M      | Source plan                        | Tech-Lead | Accepted       |
| 6   | Tier assignment quality depends on Tech-Lead's judgement at decomposition time, made once for the whole epic rather than reassessed as each chunk starts. Mitigation: `complexity-tiers` Step 5 already requires stopping and escalating when complexity proves higher mid-implementation, and that still applies per chunk. Note that Q1's retention of Principal-Engineer review on all tiers substantially reduces the blast radius of an under-tiered chunk.                                                                                                                                                                                                                                                                                                                                                                                                                | Risk     | L      | Source plan                        | Tech-Lead | Accepted       |
| 7   | The sweep touches ~44 files across skills, agents, steering, standards, and docs. Chunks in the same wave that edit adjacent files risk merge conflicts, and `chunk-orchestration`'s file-overlap detection will likely warn. Mitigation: decomposition should group by file cluster rather than by conceptual theme, keeping each file owned by exactly one chunk.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Risk     | M      | Sweep analysis                     | Tech-Lead | Accepted       |
| 8   | `AIF-ARCH-007` (Draft) would re-touch several of the same files — the steering approval-mechanism wording, `status-vocabulary.md`, `epic-planning`, and `chunk-orchestration` — and would move the epic/chunk content and work log into YouTrack. Mitigation: Q6's tool-agnostic wording is chosen specifically so that record's migration does not require rewriting the same lines twice. The record is `Draft` and therefore not authoritative; this Epic does not depend on it and must not implement any part of it.                                                                                                                                                                                                                                                                                                                                                       | Risk     | M      | `AIF-ARCH-007`                     | Tech-Lead | Accepted       |

---

## 9. Chunk Decomposition

Dependency graph: [`chunks.json`](../chunks/AIF-004/chunks.json)

**Not yet decomposed.** Per the _current_ `epic-planning` process (Step 4 gate, then Step 5 decomposition), this section is filled in after the human approves this Epic.

Noted deliberately: this Epic is the one that changes that ordering, and it cannot dogfood its own change — the pre-gate-decomposition rule does not exist until this Epic implements it. Likewise, this Epic uses the current epic template and therefore has no Section 9 Epic Test Plan of its own; its verification is captured in Section 10 instead.

Decomposition guidance for after approval:

- Most chunks are declarative AI-component work (`skills/`, `agents/`, `steering/`) and take `agents: ["AI-Engineer"]` per `AIF-PROC-001`. The `tests/validation/` cross-reference test — and the `servers/dag/` change if Open Question 2 resolves to (b) — are `agents: ["Software-Engineer"]`.
- Group by file cluster, not by conceptual theme, so no file is written by two chunks in the same wave (Risk 7).
- The schema extension (`chunks-schema.md`, `assets/chunks.json`) is a natural wave-1 root that several later chunks depend on.
- The full-sweep chunks (agent YAMLs, README, `install.ps1`, standards) can run largely in parallel once the skill deletions land.
- Snapshot regeneration must be last, after every skill and agent edit is final.
- Chunks touching `steering/engineering/core.md` or the two git-workflow files are candidates for `high_risk: true` per Section 7.
- Chunks whose content depends on the outcome of Open Question 1 must not be dispatched until Architect's amendment is `Approved`.

---

## 10. Acceptance Criteria

- [ ] All chunks complete and signed off
- [ ] `AIF-PROC-002` and `AIF-PROC-006` amendments are `Approved` before any chunk depending on them is implemented (Open Question 1)
- [ ] No HIGH or CRITICAL findings open in any chunk review
- [ ] `npm test` passes with no regressions across `tests/unit/`, `tests/integration/`, `tests/validation/`, and `servers/dag/tests/`
- [ ] The new cross-reference validation test passes against the updated skill set, and fails when given a deliberately dangling reference
- [ ] No file in the repo references `skill/chunk-planning`, a Chunk Plan artifact, or a per-chunk approval gate, excluding Decision Records and commit history
- [ ] `skills/epic-planning/assets/chunks.json` and the `chunks-schema.md` worked example both reflect all five new fields
- [ ] `dag-validate` and `dag-compute-waves` produce identical wave output for an unchanged input graph, confirming the concurrency machinery is preserved
- [ ] Every edited file re-read together for terminology consistency: `epic-planning`, `chunk-orchestration`, `test-execution` (+ template), `code-review` (+ template), `plan-lifecycle` (+ both reference files), `steering/engineering/core.md`, both git-workflow files, both standards files, all 6 agent YAMLs, `README.md`, `install.ps1`
- [ ] `bundles/engineering/snapshot.json` regenerated and consistent with the final file set
- [ ] Epic-level CHANGELOG entry written

---

## 11. Work Log

{Auto-populated by agents. Format:} [{YYYY-MM-DD HH:mm}] [{Agent}] [{Action}] [{ID}] [{Details}]

[2026-08-24] [Tech-Lead] [Created] [AIF-004] [Epic drafted from `docs/plans/chunk-epic-planning-redesign-plan.md` per `AIF-ARCH-007` Open Item 3. Verification found the source plan's Components Affected table undersized (13 listed vs 44 files referencing the retired concept), its Out of Scope entry for `code-review` contradicted by that skill's own Input contract, and its Step 9 justification factually wrong (the cross-reference test would not have caught the packaging bug, which was never a source-repo problem). All three corrected here.]

[2026-08-24] [Tech-Lead] [Decision] [AIF-004] [Decision: Tier 1 chunks skip Test-Engineer only; Principal-Engineer review is retained on every tier and track. **Why:** the source plan proposed skipping PE for Tier 1, directly contradicting `AIF-PROC-002` (Approved, Tier A), which states PE "remains the review gate for both tracks... only the track-specific tester step is skipped, not review." Narrowing keeps the Epic inside the existing decision rather than requiring it to be superseded.]

[2026-08-24] [Tech-Lead] [Decision] [AIF-004] [Decision: the five new `chunks.json` fields are required, with no optional-with-default fallback and no dual-schema support. **Why:** human direction — the framework is not yet widely adopted and `AIF-001`/`AIF-002` are both `Done`, so no in-flight decomposition exists to accommodate. A unified implementation is cheaper than permanent legacy handling.]

[2026-08-24] [Tech-Lead] [Decision] [AIF-004] [Decision: steering approval-mechanism wording is rewritten tool-agnostically rather than in git-specific terms. **Why:** `AIF-ARCH-007` (Draft) would otherwise require a second rewrite of the same lines once approval is gated by a workflow rule instead of a commit. Costs nothing now and does not create a dependency on that record.]

[2026-08-24] [Tech-Lead] [Decision] [AIF-004] [Decision: the source-file header `Plan` field becomes `{EpicID}-{chunkId}`. **Why:** both standards files currently define it as "the chunk plan ID", which is about to name a deleted artifact. The epic-qualified form is already the repo's de facto convention (`AIF-002-006`, `AIF-002-014`) and preserves per-chunk traceability for engineering-core Rule 2.]

[2026-08-24] [Tech-Lead] [Decision] [AIF-004] [Decision: chunk-level work log entries live in `orchestration-state.json` only; no per-chunk work log file is introduced. **Why:** `AIF-PLAN-001`, which proposed sibling `.worklog.md` files, was Deferred in favour of this Epic, and `AIF-ARCH-007` would move the log into YouTrack — creating a file now would be creating one already slated for retirement.]

[2026-08-24] [Tech-Lead] [Escalated] [AIF-004] [`AIF-PROC-002` and `AIF-PROC-006` routed to Architect for amendment per human direction. Recorded as Open Question 1; blocks implementation of the affected chunks, not this Epic's approval.]

[2026-08-25] [Tech-Lead] [Renumbered] [AIF-004] [Epic ID changed from `AIF-003` to `AIF-004` at human direction, freeing `AIF-003` for the Epic implementing `AIF-META-002` (partial amendment of approved Decision Records), which must land first — it delivers the amendment machinery this Epic's Open Question 1 depends on to amend `AIF-PROC-002`/`AIF-PROC-006`. Renumber was safe: this Epic is still `Draft`, has no `chunks.json`, no orchestration state, and no chunk plans. Updated all in-file `AIF-003` occurrences (including the `{EpicID}-{chunkId}` example in Section 5 and prior Work Log entry IDs, since they identify this same document) and the one external epic-ID reference in `AIF-PLAN-001` (a `Deferred` record). Remaining repo-wide `AIF-003` matches are the pre-AIF-META-001 _Decision Record_ `AIF-003` (now `AIF-ARCH-003`), a separate numbering scheme, and were correctly left untouched.]
