# Decision Record: Epic/Chunk Tracking Migration to YouTrack

## Metadata

| Field          | Value                                                               |
| -------------- | ------------------------------------------------------------------- |
| Decision ID    | AIF-ARCH-007                                                        |
| Project        | ai-foundation                                                       |
| Tier           | A                                                                   |
| Domain         | architecture                                                        |
| Status         | Deferred                                                            |
| Author (Agent) | Architect                                                           |
| Approved By    | Pending                                                             |
| Created        | 2026-08-24                                                          |
| Referenced By  | —                                                                   |
| References     | —                                                                   |
| Tags           | youtrack, epic-planning, chunk-orchestration, tracking, audit-trail |

> This record's design presumes `docs/plans/chunk-epic-planning-redesign-plan.md` (currently `Draft`) is implemented as written — the collapsed single-epic-gate model and the extended chunk schema (`tier`, `high_risk`, `goal`, `files`, `acceptance_criteria`) are treated as given. That plan has no Decision ID yet (it is a plan document, not a decision), so it cannot be cited in `References` above — see Impact on Planning for the sequencing dependency this creates. This record also draws on two research-notes files that are explicitly _not_ Decision Records and carry no authority of their own: `docs/misc/youtrack-tracking-config-notes.md` (general YouTrack-as-backend exploration) and `docs/misc/youtrack-dr-issue-setup-notes.md` (a parallel, since-resolved design for Decision-Record tracking specifically, used here only as a precedent to weigh against, per explicit human instruction — this record's project-boundary and Type decisions are made independently of it, not inherited from it).

---

> **Archived** (process-model check 27, 2026-09-25): `Deferred` at check 26 (human call,
> this migration); dropped from MADR conversion per its row in `docs/process-model.md`'s
> Decision-record disposition table. Kept here as historical record — not converted to
> MADR.

## Problem Statement

Epic/Chunk tracking currently lives entirely in git: `chunks.json` (structural decomposition), Epic/Chunk Plan `.md` files (content, approval gate), and `orchestration-state.json` (live pipeline status, PR links, escalations, and a hand-authored prose work log). This record decides how much of that model moves to YouTrack, what the resulting field/link/workflow schema looks like, and what stays local — with the explicit goals of reducing manual record-keeping (principally the hand-written `orchestration-state.json` log) and gaining a built-in, tamper-resistant audit trail for the Epic approval gate.

---

## Constraints & Requirements

What was non-negotiable (set by human direction during this record's authoring):

- Epic/Chunk **content** (Goal, Security Considerations, Epic Test Plan, per-chunk Goal/Files/Acceptance Criteria) moves fully into YouTrack as the source of truth — no parallel git-committed `.md` files for new epics going forward.
- The `Draft → Approved` gate (and the underlying pipeline status state machine) is enforced by a **hard YouTrack workflow-rule state machine** — not a convention the agent is trusted to follow, and not merely a field the agent could self-set.
- This record's schema presumes the chunk-epic-planning-redesign-plan's final field set (`tier`, `high_risk`, `goal`, `files`, `acceptance_criteria`) is already in effect.
- Scope is Epic/Chunk tracking only. The parallel, already-resolved Decision-Record-in-YouTrack design (dedicated `AIF-DR` project, Issue+Article split) is **not** a constraint here — this record's project-boundary decision is made independently on its own merits, per explicit instruction, not inherited from that precedent.
- The wave-based concurrency machinery (`chunks.json`, `dag-compute-waves`, `dag-validate`, worktrees) must be preserved unchanged, per the redesign plan's own stated goal — this record must not silently reopen that constraint.

What was a preference but not a hard requirement:

- A trimmed local file should remain for whatever the DAG tools and worktree cleanup genuinely need locally and fast — "most detail in YouTrack, minimal file for facilitating clean-up" (human direction), not zero local file.
- Visual, board-level status of epics/chunks in YouTrack (an Agile board or equivalent saved-search view) matters enough to weigh into the design, not just field storage.

---

## Options Explored

The substantive fork in this record is how much of the current git-file model each option retires, and where the dependency-graph/live-status data ends up. All four options assume the content-move and hard-gate constraints above; they differ only on this axis.

### Option A: Dual-write sync

**Summary**: `chunks.json` remains the git-committed source of truth for structure; YouTrack gets a fully populated, continuously synced mirror of everything, including live chunk status.
**Strengths**: No code path is retired; lowest short-term implementation delta.
**Weaknesses**: Every field now has two editable copies that must be reconciled by a sync step. A failed or partial sync — explicitly the failure mode the parallel DR-in-YouTrack notes warned about for Article creation — leaves one system silently stale with no single answer for "what's actually true." This is the opposite of the stated goal (less record-keeping): it adds a reconciliation burden on top of the existing hand-maintained files rather than replacing them.
**Verdict**: Not chosen — duplicate authorship of the same field is strictly worse than single ownership for every field it touches.

### Option B: Live API, no cache

**Summary**: YouTrack becomes fully authoritative, including `depends_on` as link types. `chunks.json` is retired entirely; `dag-validate`/`dag-compute-waves` are rewritten to call the YouTrack REST API directly on every invocation.
**Strengths**: True single source of truth for every field, including the dependency graph.
**Weaknesses**: Puts a network call with rate-limit exposure directly on the orchestration hot path, at up to `orchestration.max_concurrent: 10` concurrent worktrees. Requires rewriting two working MCP server tools whose current contract (read a local file, deterministic, offline) is exactly what `AIF-ARCH-005` chose an MCP server to guarantee in the first place. Most importantly: this directly contradicts the redesign plan's own stated goal — "Preserve the wave-based concurrency machinery (`chunks.json`, `dag-compute-waves`, worktrees) unchanged" — which this record is required to build on top of, not silently reopen.
**Verdict**: Not chosen — violates an existing, already-accepted constraint from the plan this record presumes implemented, for a benefit (single edit point on data that barely changes) not worth that cost.

### Option C: YouTrack authoritative + disposable local cache

**Summary**: Same end-state as Option B (YouTrack owns everything including `depends_on` links), but `dag-validate`/`dag-compute-waves`'s io layer fetches into a git-ignored, regenerated-not-edited local cache file before running their existing pure logic unchanged, avoiding B's per-call latency problem.
**Strengths**: Cleaner "one editable copy" story than B, without paying B's latency cost on every call. Reuses the pure/io split the framework already applies elsewhere (`AIF-002-014`'s `lib/decisions.js`).
**Weaknesses**: Still requires rewriting both DAG tools' io layer, still needs a cache-invalidation story (webhook vs. poll — left explicitly unresolved in the source research notes), and still changes the tools' actual operational behavior (network- and cache-dependent) even though the pure logic is untouched — so it still violates the "preserve unchanged" constraint in substance, just not in the pure-logic layer specifically.
**Verdict**: Not chosen — pays real, non-trivial engineering cost to gain single-editability of a field (`depends_on`) that, per the AIF-002 orchestration-state log reviewed for this record, is essentially write-once at decomposition time and almost never touched again. The cost isn't justified by how often that field actually needs editing.

### Option D: Permanent field split (chosen)

**Summary**: `chunks.json` keeps exactly its current role and fields (`id`, `title`, `depends_on`, `agents`) plus the redesign plan's dispatch-critical additions (`tier`, `high_risk`) — everything `dag-validate`/`dag-compute-waves`/dispatch logic needs to read fast, locally, and offline, completely unchanged from today. Everything else moves out of git and into YouTrack: Epic/Chunk content (`goal`, `files`, `acceptance_criteria`, Security Considerations, Epic Test Plan), the full pipeline status state machine, PR linkage, escalations, and the entire hand-authored work log currently maintained in `orchestration-state.json`. A trimmed local file survives for machine-local-only bookkeeping (see Design).
**Strengths**: The two git-committed files this record found in the codebase have very different write profiles — `chunks.json` changes rarely after decomposition; `orchestration-state.json` is rewritten continuously and is where the actual hand-authoring burden lives today (431+ lines of manually composed prose log entries for `AIF-002` alone). This option targets the expensive artifact, not the cheap one. Field ownership is disjoint (no field is editable in two places), so there is no sync/drift problem to design around — not "low risk," genuinely no reconciliation logic needed at all. Zero changes to the tested, working DAG tools — satisfies the redesign plan's preservation constraint by construction rather than by care. Cheapest option to actually build: no io-layer rewrite, no cache-invalidation design needed for correctness (the Engineering-Manager remains the sole writer of local state either way, per the existing state-schema rule).
**Weaknesses**: The dependency graph itself is not natively visible inside YouTrack, so a hard workflow-rule guard like "Chunk → Done blocked unless its `depends_on` chunk is Done" cannot be enforced by YouTrack directly (see Design — Workflow Rules for the mitigation adopted). Two systems still exist, even if the fields don't overlap, which is marginally more moving parts than a single system, in exchange for not rewriting the DAG tools.
**Verdict**: Chosen.

---

## Decision

**Chosen approach**: Option D — permanent field split. `chunks.json` is untouched; YouTrack becomes the sole owner of Epic/Chunk content, the pipeline status state machine, and the audit trail. A trimmed local file replaces `orchestration-state.json` for machine-local bookkeeping only.

**Rationale**: The two existing git-committed files have asymmetric write-frequency and risk profiles — `chunks.json` is decomposition-time-only and essentially frozen thereafter, while `orchestration-state.json` is the actual source of the manual-record-keeping burden this migration is meant to reduce. Option D is the only option that targets the expensive artifact without also paying to rebuild the cheap one's tooling. It satisfies the redesign plan's explicit "preserve wave-based concurrency machinery unchanged" constraint by construction (no code touching `dag-validate`/`dag-compute-waves` changes), rather than contradicting it (Option B) or satisfying it only at the pure-logic layer while still changing the tools' operational contract (Option C). Disjoint field ownership means there is no drift risk to mitigate, unlike Option A's fully duplicated fields — the "getting out of sync" concern raised at the start of this decision is resolved structurally, not procedurally.

**Trade-offs accepted**:

- The dependency graph is not natively enforceable as a YouTrack workflow guard. Mitigated by a one-time mirrored push of `depends_on` edges into YouTrack link types at chunk-creation time (write-once, not synced — see Design), giving board visualization and defense-in-depth without reopening `chunks.json` as a second editable copy of anything. Wave-ordering enforcement itself remains `dag-compute-waves`/Engineering-Manager's responsibility, exactly as it is today — this is not a new gap, just an explicit statement that it isn't closed by this migration.
- Two systems (a trimmed local file + YouTrack) instead of one. Accepted because the alternative (one system) costs a DAG-tool rewrite this record has no evidence is justified by actual edit frequency on the data that would move.
- Migrating the redesign plan's own conversion into an Epic Plan is flagged (see Impact on Planning) but explicitly **not** decided or scoped by this record — raised as a follow-up per Rule 4, not silently folded in.

---

## Design

### Issue Types & Project

- Use the existing `AIF` YouTrack project — no dedicated project (per explicit instruction, independent of the `AIF-DR` precedent). Epic/Chunk IDs continue to be `AIF-###`, using YouTrack's own `idReadable` directly since there is no separate numbering scheme to preserve here (unlike the Decision-Record case, where `AIF-{n}` predates YouTrack and had to be kept as an explicit field).
- Create dedicated custom **Epic** and **Chunk** Issue Types (not the stock Bug/Feature/Task types currently on the project) so field schemas and workflow rules can be scoped per type via YouTrack's conditional-custom-fields feature, and so the Epic↔Chunk parent/child relationship can use the built-in Subtask link type for board swimlane grouping.

### Custom Fields — Epic

| Field                     | Status                | Type                                          | Notes                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------- | --------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Status`                  | **Needs redesign**    | enum: `Draft`, `Approved`, `Done`, `Deferred` | The currently-provisioned `Status` field (`Draft, Approved, Deferred, In Progress, Blocked, Complete, Ready`) mixes Epic and Chunk vocabulary in one enum and includes `In Progress`, which `plan-lifecycle/status-vocabulary.md` deliberately excludes as a plan-status value. Needs to become an Epic-scoped enum matching `status-vocabulary.md` exactly, separate from the Chunk-scoped enum below. |
| `Approved By`             | Exists                | string (login)                                | Workflow-gated — see Workflow Rules.                                                                                                                                                                                                                                                                                                                                                                    |
| `Security Considerations` | Exists                | long text                                     |                                                                                                                                                                                                                                                                                                                                                                                                         |
| `Test Plan`               | Exists                | long text                                     | Houses the redesign plan's Epic Test Plan (Section 9: feature verification, integration points, regression scope, sign-off).                                                                                                                                                                                                                                                                            |
| `Agent`                   | **Needs gap closure** | multi-value enum                              | Currently single-value; an Epic can involve more than one agent role across its chunks.                                                                                                                                                                                                                                                                                                                 |
| `High Risk`               | Exists                | boolean                                       | Epic-level rollup, informational; the authoritative per-chunk value stays in `chunks.json`.                                                                                                                                                                                                                                                                                                             |
| `Files Impacted`          | Exists                | text                                          |                                                                                                                                                                                                                                                                                                                                                                                                         |
| `Acceptance Criteria`     | Exists                | text                                          |                                                                                                                                                                                                                                                                                                                                                                                                         |
| `Due Date`                | Exists                | date                                          |                                                                                                                                                                                                                                                                                                                                                                                                         |
| `Priority`                | Exists                | enum                                          |                                                                                                                                                                                                                                                                                                                                                                                                         |

### Custom Fields — Chunk

| Field                                  | Status                            | Type                                                                                                   | Notes                                                                                                                                                                   |
| -------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Status`                               | **Needs redesign**                | enum: `Ready`, `Implementing`, `Testing`, `Reviewing`, `Done`, `Conflict`, `Blocked`                   | Chunk-scoped, matching `chunk-orchestration/reference/state-schema.md`'s existing state machine exactly — this is the field the hard workflow gate (below) operates on. |
| `Blocked Reason`                       | New                               | string                                                                                                 | Mirrors `orchestration-state.json`'s existing field; null-equivalent is empty string.                                                                                   |
| `PR Number` / `PR URL`                 | New                               | integer / string (or a single link field to the GitHub PR if YouTrack's GitHub integration is enabled) |                                                                                                                                                                         |
| `Iterations`                           | New                               | integer                                                                                                | Review-loop counter (0–5), same cap as today.                                                                                                                           |
| `Agent`                                | Same field as Epic's, multi-value |                                                                                                        |                                                                                                                                                                         |
| `goal`, `files`, `acceptance_criteria` | New                               | text / text / text or checklist                                                                        | Per the redesign plan's chunk schema — content fields, not dispatch-critical, read once at chunk kickoff.                                                               |

`tier`, `high_risk`, `depends_on` are **not** duplicated as YouTrack fields — they remain `chunks.json`-only (dispatch-critical, read by `dag-compute-waves`/`chunk-orchestration` locally). `depends_on` gets a one-time mirrored link (below) for visualization/defense-in-depth only, not as an editable YouTrack field.

### Link Types

- **Epic ↔ Chunk**: built-in Subtask link type — gives Agile board swimlane grouping for free, satisfying the "visually see the status of the various epics" requirement without extra config.
- **Chunk "depends on" Chunk**: custom directional link type, populated **once**, at chunk-issue-creation time, by copying `chunks.json`'s `depends_on` array for that chunk. Not re-synced after creation — if `depends_on` changes mid-epic (rare, per the AIF-002 precedent's rev-6 re-sequence), the YouTrack links become stale until the next full recreation; this is accepted because the links are visualization/defense-in-depth only, never the value `dag-compute-waves` actually reads.

### Local File Retained (trimmed)

Replaces `orchestration-state.json`. Purpose: only what `dag-compute-waves`/wave dispatch and worktree cleanup need fast and local — everything else lives in YouTrack.

| Field                                                                                   | Kept? | Where it goes if not kept                                                                                                                     |
| --------------------------------------------------------------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `epic_id`, `current_wave`, `total_waves`                                                | Kept  | — (needed synchronously by dispatch logic)                                                                                                    |
| `chunks[].id`, `.wave`, `.branch`, `.worktree_path`                                     | Kept  | — (`branch`/`worktree_path` are machine-local filesystem/git state, meaningless outside this machine; needed for cleanup per human direction) |
| `chunks[].status`, `.pr_number`, `.pr_url`, `.iterations`, `.blocked_reason`, `.agents` | Moved | YouTrack Chunk Issue fields (above)                                                                                                           |
| `escalations[]`                                                                         | Moved | YouTrack comments on the relevant Chunk/Epic Issue, or a dedicated `Escalated` boolean + comment thread                                       |
| `log[]`                                                                                 | Moved | YouTrack's native per-issue activity/history stream + comments — this is the field that eliminates the hand-authored prose burden             |

The exact final shape of this trimmed file (e.g. whether `agents` needs a local copy for dispatch decisions vs. an API read) is left to the implementing Epic Plan, not pinned further here — this record establishes the ownership boundary, not the byte-level schema.

### Workflow Rules — State Machine

Two YouTrack workflow rules, both scoped per Issue Type via the conditional-fields feature:

- **Epic**: `Draft → Approved` blocked unless `context.currentUser` is a member of an Epic/Chunk approvers group (mirrors the `DR Approvers` group pattern from the Decision-Record precedent, but its own group — no shared membership assumption made here) AND `Security Considerations`/`Test Plan` are non-empty. `Approved By` is itself guarded the same way, so the agent's service account can populate every other field but never write its own name into `Approved By`. `Approved → Done` allowed once all child Chunks are `Done` and the Epic Test Plan sign-off is recorded (mirrors the redesign plan's Step 6 gate).
- **Chunk**: full state machine per `state-schema.md`: `Ready → Implementing → Testing → Reviewing → Done`, with `Reviewing → Implementing` (review loop, capped at 5 iterations) and `Any → Conflict → Implementing|Blocked`. Guard: `→ Ready` blocked unless the parent Epic's `Status = Approved`. `→ Done` is **not** guarded on `depends_on` (see Trade-offs accepted) — that ordering is enforced upstream by `dag-compute-waves`/dispatch, not by this state machine.
- Per the parallel DR-in-YouTrack notes' still-open risk: **the actual guard-condition capability on this specific YouTrack instance/tier has not yet been verified** (workflow scripts are not visible via the current MCP tool surface, per the live-state check). This is carried forward as an Open Item, not assumed resolved just because the Decision-Record design assumed it.

### Permission Scheme

- Agent service account (the existing `starvoxelBot` account already used for the live-state check) is granted create/edit on Epic/Chunk issues but excluded from the Epic/Chunk approvers group — same enforcement boundary pattern as `ai-git` identity separation and the DR-in-YouTrack precedent, applied independently here.

### Field/Config Gap Closure Required

Confirmed against the live `AIF` project state at authoring time:

1. No custom Epic/Chunk Issue Types exist — must be created.
2. `Status` enum needs to split into two type-scoped enums (Epic vs. Chunk vocabulary) — current single enum matches neither cleanly.
3. `Agent` field must become multi-value.
4. `Tier` field does not exist on the YouTrack side — not needed, since `tier` stays `chunks.json`-only per this design.
5. "Depends on" link type does not exist — must be created.
6. Workflow-rule guard capability on this instance/tier is unverified — must be confirmed before the implementing Epic proceeds (see Open Items).

### API/Automation Plumbing

- `dag-validate`, `dag-compute-waves`: **no changes** — continue reading `chunks.json` exactly as today.
- `epic-planning`, `chunk-orchestration`: gain YouTrack REST API calls (create/update Issues, transition Status, add comments) in place of the current git-commit-the-`.md`-file and hand-write-`orchestration-state.json`-log steps. This is genuinely new plumbing, scoped to the implementing Epic, not detailed further here.
- Dedicated YouTrack service account + permanent API token, env var, never logged — same rule as `AI_GIT_TOKEN`.

---

## Impact on Planning

What Tech-Lead must know when writing the Epic that implements this decision:

- **Sequencing dependency**: `docs/plans/chunk-epic-planning-redesign-plan.md` must reach `Approved` (and ideally be implemented) before this record's implementing Epic begins — this record's schema is built directly on top of its chunk fields (`tier`, `high_risk`, `goal`, `files`, `acceptance_criteria`) and its collapsed single-gate model. Do not decompose an implementing Epic for this record against the current pre-redesign model.
- **Recommendation, not a decision made here**: given its scope (9 Approach steps, 13 affected components, 3 steering files), the redesign plan itself is a strong candidate to be converted into an Epic Plan rather than implemented as a flat Tier 3 plan. This is flagged for human/Tech-Lead judgment, not decided or scoped by this record.
- **Steering wording changes needed**, per the redesign plan's Step 8 pattern but now widened to cover this migration: `engineering-core.md` Rule 1 ("Approved" status committed to git) and Rule 8 (plan-lifecycle commit-gate procedure) currently hardcode "committed to git" as the approval-objectivity mechanism. Once Epic/Chunk approval is gated by a YouTrack workflow rule instead, these rules need tool-agnostic wording (e.g. "a system that structurally prevents the agent's identity from performing the Approved transition") so they describe the actual mechanism rather than being contradicted by it. `plan-lifecycle/reference/status-vocabulary.md`'s per-artifact-type table and `git-workflow-framework.md`/`git-workflow-projects.md`'s "governing plan... committed to git" language need the equivalent update, scoped to Epic Plans specifically (Decision Records and Tier 3 plans are unaffected by this record and keep the existing git-commit gate).
- **Components that will not exist as a result**: no new `servers/` MCP tool for YouTrack is ruled in or out by this record — whether the REST calls in `epic-planning`/`chunk-orchestration` go through a new dedicated MCP server (consistent with `AIF-ARCH-005`'s general guidance for cross-harness deterministic-logic needs) or a simpler integration is a decision for the implementing Epic, not this record.
- **Options explicitly ruled out** — must not reappear in the implementing Epic: dual-write sync (Option A), full API replacement of the DAG tools (Options B/C), a dedicated `AIF-EPIC`-style project (out of scope per explicit instruction), and any workflow-guard design relying on `depends_on` being visible to YouTrack as an editable field.
- **Migration of in-flight work**: consistent with the redesign plan's own Open Question 4 recommendation, already-`Approved`/`Done` git-based epics (`AIF-001`, `AIF-002`) are grandfathered as-is — this record's schema applies to epics decomposed after the implementing Epic ships. No retroactive migration is in scope.

---

## Open Items

| #   | Item                                                                                                                                                                                                                                                                                                                                                                                                                                  | Owner             |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| 1   | Workflow-rule guard capability (hard `Draft → Approved` and per-status-transition gating) has not been verified against this specific YouTrack instance/tier — workflow scripts are not visible via the current MCP tool surface. Must be confirmed via direct UI check before the implementing Epic proceeds; if unavailable, this record's "hard state-machine" requirement cannot be met as designed and must return to Architect. | Human / Architect |
| 2   | Exact byte-level schema of the trimmed local file (successor to `orchestration-state.json`) is intentionally left to the implementing Epic Plan, not pinned here.                                                                                                                                                                                                                                                                     | Tech-Lead         |
| 3   | Whether the redesign plan itself should be converted into an Epic Plan given its scope — flagged, not decided.                                                                                                                                                                                                                                                                                                                        | Human             |
| 4   | Whether `epic-planning`/`chunk-orchestration`'s new YouTrack REST calls should go through a dedicated MCP server (per `AIF-ARCH-005`'s general guidance) or a simpler integration — deferred to the implementing Epic.                                                                                                                                                                                                                | Tech-Lead         |
| 5   | Webhook vs. polling for the Engineering-Manager to notice human-initiated changes made directly in the YouTrack UI (e.g. a human approving an Epic via the board rather than through agent-mediated flow) — deferred to the implementing Epic; not a correctness blocker since the EM remains the sole writer of the trimmed local file either way.                                                                                   | Tech-Lead         |
