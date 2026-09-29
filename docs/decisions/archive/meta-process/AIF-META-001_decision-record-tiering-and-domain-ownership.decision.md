# Decision Record: Decision-Record Tiering, Domain Ownership, and Interconnectivity

## Metadata

| Field          | Value                                                              |
| -------------- | ------------------------------------------------------------------ |
| Decision ID    | AIF-META-001                                                       |
| Project        | ai-foundation                                                      |
| Tier           | A                                                                  |
| Domain         | meta-process                                                       |
| Status         | Superseded                                                         |
| Author (Agent) | Generic Agent                                                      |
| Approved By    | Jeremy Smellie                                                     |
| Created        | 2026-08-14                                                         |
| Referenced By  | —                                                                  |
| References     | AIF-004, AIF-005, AIF-011 (current numbering; see migration table) |

---

> **Archived, `Superseded`** (process-model check 27, 2026-09-25): decision-record
> tiering and domain ownership retires wholesale under MADR — no `Tier` field, no
> domain-coded ID scheme, per `docs/process-model.md`'s ADR format section and
> Decision-record disposition table. Kept here as historical record — not converted to
> MADR.

## Problem Statement

The Decision Record system (`skill/decision-record`) has one format, one weight class, and one implicit author (Architect in practice) for every decision, regardless of subject matter. This causes two concrete problems, observed directly in this repo's 11 existing records:

1. **Narrow scope, forced ceremony.** Decisions that are not architectural (process/orchestration design, planning-artifact conventions, worklog structure)
   go through the same full options-exploration template as genuine multi-component architectural trade-offs, because there is no lighter-weight home for them.
2. **Interconnectivity is manual prose, not structure.** Cross-references (`Referenced By`, `References`, `Supersedes`) are free-text fields typed by hand into a metadata table. There is no index, no registry, and no validation that a reference is bidirectional or that a referenced ID still exists. Discovering "what decisions exist" means listing a directory; discovering "what does this decision affect" means grep-and-read across a growing file set. This has already surfaced in practice — a later decision needed to reconsider an earlier one's authorship assumption with no structural link to do so, only a manually-written open question.

Additionally, decision-authorship has so far defaulted to Architect for process/orchestration decisions (AIF-005, AIF-006, AIF-009, AIF-010) that are not architectural in nature — they are about how work is dispatched, isolated, and sequenced, which is Engineering-Manager's operating domain, not Architect's.
Continuing to route every non-code decision through Architect (or, worse, through Tech-Lead as a catch-all) misassigns decisions away from the agent with the standing operational context to actually evaluate them.

---

## Constraints & Requirements

What was non-negotiable:

- Must not weaken `skill/plan-lifecycle`'s human-approval gate for any decision, regardless of tier or domain.
- Must not make Tech-Lead a catch-all owner for "everything non-architectural" — its charter is Epic/Chunk decomposition, not decision research.
- Must not silently widen web-search/fetch access across every agent that gains decision-authoring capability — tool grants stay tied to demonstrated need, not to "might need to research something someday."
- Must preserve global uniqueness of decision IDs across every project repo this framework is installed into (this repo is a framework other project repos install from — a bare domain-only ID scheme would collide across projects).

What was a preference but not a hard requirement:

- Reuse existing infrastructure (`knowledge/index.json`, the `scope` field already defined in `skill/knowledge-authoring`) rather than inventing a second, parallel discovery mechanism.
- Keep the migration cost for this repo's existing 11 records low where possible (favor renumbering `Draft` records over already-`Approved` ones when the two are otherwise equivalent).

---

## Options Explored

### Option A: Status quo — single format, single implicit author, single ID/location scheme

**Summary**: Keep `skill/decision-record` exactly as it is: one full options-exploration template for every decision, Architect as the de facto author regardless of subject matter, `{ProjectID}-{###}` IDs in a single flat `docs/decisions/` folder, and every record treated identically for `knowledge/index.json` consumption.

**Strengths**: Nothing to build. One template to maintain. One place to look.

**Weaknesses**: Directly causes both problems in the Problem Statement. Forces process/orchestration and planning-convention decisions through architecture-grade ceremony. Provides no structural interconnectivity — cross-references remain free-text and unvalidated. Concentrates decision-authorship in Architect for domains (orchestration, worktree isolation, git workflow mode) it has no particular standing expertise in, while Tech-Lead absorbs everything else by default, overloading a decomposition-focused agent with decision-research work.

**Verdict**: Not chosen — this is the system generating the problem, not a solution to it.

### Option B: Tier-only split — scale format to weight, keep single author and single ID/location scheme

**Summary**: Introduce rigor tiers (full options-exploration format for significant decisions, a slim format for lighter ones, inline recording for trivial ones) and a shared index for interconnectivity, but keep Architect as the sole author of every Tier A/B decision and a single flat `docs/decisions/` folder with one shared `{ProjectID}-{###}` counter.

**Strengths**: Fixes the ceremony-mismatch problem. Fixes interconnectivity via an index. Smallest change from today's system that still solves both stated problems.

**Weaknesses**: Does not fix authorship. Architect remains responsible for process/orchestration decisions outside its domain, and Tech-Lead remains the implicit catch-all for everything else — the exact overload problem flagged during design review. A single ID/location scheme still mixes decisions with fundamentally different audiences (an implementer working inside `chunk-orchestration` has to search a general architecture-decisions folder to find the process decision that shaped it).

**Verdict**: Not chosen — solves half the problem while leaving the authorship mismatch, which was the more consequential issue, unaddressed.

### Option C: Tier × Domain model — rigor and subject-matter ownership as independent axes (chosen)

**Summary**: Two independent axes govern every decision:

- **Tier** (rigor/format): how much options-exploration ceremony the decision needs, independent of subject matter.
- **Domain** (subject matter / ownership): which part of the system the decision concerns, which determines both the authoring agent and the template guidance for that decision's flexible sections.

Each domain gets its own ID counter/prefix and its own storage subfolder; a single cross-domain `index.json` ties every Tier A/B decision together regardless of physical location, for traceability and reference-graph validation. A promotion threshold keeps decisions that don't need independent discoverability out of the store entirely (recorded inline in the artifact that made them instead). Domains mirror agents' actual operating areas — architecture to Architect, process/orchestration to Engineering-Manager (an intentional charter expansion), planning-artifact conventions to Tech-Lead, AI-component decisions to AI-Engineer (existing precedent, AIF-004), quality-gate decisions to Principal-Engineer, test-strategy to Test-Engineer, and meta-process decisions (decisions about the decision-system itself, including this one) to a generic agent for now, with "Project-Manager" reserved as the name for a future purpose-built agent if that becomes warranted.

**Strengths**: Matches ceremony to actual decision weight (Tier) independently of matching authorship to actual domain expertise (Domain) — the two problems this repo hit (forced ceremony on small decisions, and misassigned authorship on process decisions) are genuinely orthogonal and this is the only option that treats them as such. Reuses the AIF-004 domain-split precedent rather than inventing a new authorship model from scratch. Keeps per-domain IDs meaningful and uncluttered (an Architecture decision's number reflects Architecture decision volume, not process-decision noise). Keeps `knowledge/index.json` consumption scoped to domains that genuinely lack a single canonical implementing artifact (Architecture, AI-component) rather than loading every decision as if it were.

**Weaknesses**: More moving parts than Option B — multiple domain folders and ID counters instead of one, a new lightweight Tier B artifact type, a documented Tier C inline-recording convention, and a charter expansion for Engineering-Manager.
Existing records AIF-001 through AIF-011 need a one-time migration to the new domain/ID/location scheme (see Impact on Planning).

**Verdict**: Chosen.

---

## Decision

**Chosen approach**: Option C — Tier × Domain model, with per-domain ID/location scoping and a single cross-domain index for interconnectivity.

**Rationale**:
The two problems motivating this decision are independent: ceremony mismatch is a question of _how much rigor a decision needs_, while authorship mismatch is a question of _who has standing context to evaluate it_. Option B's single-author assumption reproduces the authorship problem it was meant to help fix, just with better formatting. Option C is the only option that lets both axes vary independently, and it does so by extending a pattern this repo has already validated once (AIF-004's AI-Engineer/Software-Engineer split) to the rest of the agent roster rather than inventing new authorship logic from scratch. Restricting `knowledge/index.json` consumption to domains without a canonical implementing artifact (Architecture, AI-component) follows directly from how this repo's `knowledge-authoring` skill already distinguishes prescriptive material (belongs in standards/steering, loaded because it constrains future work directly) from descriptive reference (belongs in knowledge) — a Process, Planning, Quality-gate, or Test-strategy decision's real effect lives entirely in the skill/template/steering file it changed, which agents already consult; a second, driftable knowledge copy adds no information a decision's implementing artifact doesn't already carry.

**Trade-offs accepted**:

- Six domain subfolders and counters (Architecture, Process, Planning, AI-component, Quality, Testing) plus a meta-process bucket, instead of one flat folder and counter. Judged acceptable because per-domain discoverability was the explicit goal, not an incidental cost.
- Engineering-Manager's charter expands to include decision-authoring, a real capability it does not have today (no options-exploration mode in its current prompt/skill surface). This is deliberate, not incidental scope creep — it is the direct fix for the authorship-mismatch problem.
- Existing records AIF-001 through AIF-011 require a one-time migration (new ID, new folder, updated cross-references). See Impact on Planning for the full table and sequencing recommendation.
- No domain owner receives `WebSearch`/`WebFetch` by default beyond what Architect already has, even though several new agents can now author Tier A/B decisions.
  If a specific future decision genuinely cannot be reasoned about from operating knowledge alone, that is evaluated per-agent at that time, not granted preemptively to every decision-authoring agent.

---

## Design

### Tier definitions (rigor axis, independent of domain)

| Tier               | Format                                                                                                                                                                                                                                                                                                                                                                  | Gate                                                                                                                                                                        |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A — Researched** | Full options-exploration skeleton: Metadata, Problem Statement, Constraints, Options Explored (2-4 genuinely distinct options with strengths/weaknesses/verdict), Decision, optional Design, Impact on Planning, Resolved/Open Items. `Design` and `Impact on Planning` content is shaped by domain-specific guidance (see Domain table) rather than a forked template. | Full `plan-lifecycle` cycle: Draft → any number of revision commits → Approved (or Deferred), each its own commit.                                                          |
| **B — Structural** | Slim skeleton: Metadata (including Tier/Domain), Problem, Decision, Rationale, Impact. No Options-Explored ceremony.                                                                                                                                                                                                                                                    | Lighter one-shot confirmation — Draft committed, human confirms, Approved committed. No expectation of a multi-round revision cycle, though one may still happen if needed. |
| **C — Embedded**   | No standalone artifact. Recorded inline in the governing plan's own body or its sibling worklog file (per AIF-011's worklog-split convention, once migrated — see below), using a short "Decision: ... **Why:** ..." convention.                                                                                                                                        | Rides the governing plan's own `plan-lifecycle` gate. Nothing separate.                                                                                                     |

**Promotion threshold** (Tier C is the default for any decision made during planning or implementation):

1. Genuine trade-off between 2+ viable approaches with lasting cross-component impact → **Tier A**.
2. Else, can you name a plausible second, currently-unwritten piece of work that will need to cite this decision independently of the plan that made it? → **Tier B**.
3. Else → **Tier C**.
4. **Retroactive promotion**: if a Tier C decision is later cited by a second, unrelated plan, promote it — move its content into a proper Tier B (or A, if warranted) entry, assign it an ID, add it to the index — rather than letting the second plan re-explain it inline.

### Domain ownership (subject-matter axis, independent of tier)

| Domain                                                    | Code   | Owner                                                                                                 | Template guidance for Design/Impact on Planning                    | `knowledge/index.json`?                                                                                     |
| --------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Architecture                                              | `ARCH` | Architect                                                                                             | Schemas, component boundaries, system-structure diagrams           | Yes — scope `all` or close to it                                                                            |
| Process/orchestration                                     | `PROC` | Engineering-Manager _(charter expansion)_                                                             | Dispatch/pipeline flow changes, orchestration-state effects        | No — implemented effect lives in `chunk-orchestration`/`worktree-management`/git-workflow steering directly |
| Planning-artifact conventions                             | `PLAN` | Tech-Lead                                                                                             | Chunk/Epic Plan shape, worklog structure, plan-lifecycle mechanics | No — implemented effect lives in the relevant plan template                                                 |
| AI-component/declarative-system                           | `AIC`  | AI-Engineer _(existing precedent, AIF-004)_                                                           | Agent/skill/steering/schema impact                                 | Yes — scoped to AI-Engineer + adjacent authoring skills                                                     |
| Quality-gate/review-process                               | `QA`   | Principal-Engineer                                                                                    | Review-criteria and severity-gate changes                          | No — implemented effect lives in the review skill/template                                                  |
| Test-strategy                                             | `TEST` | Test-Engineer                                                                                         | Test-execution/coverage-strategy changes                           | No — implemented effect lives in the test-execution skill                                                   |
| _(none — intentional)_                                    | —      | Software-Engineer                                                                                     | —                                                                  | Tech-Lead's Epic/Chunk process already covers Software-Engineer's decision needs                            |
| Meta-process (decisions about the decision-system itself) | `META` | Generic/catch-all agent for now; reserve **Project-Manager** as the name for a future dedicated agent | Effect on `skill/decision-record` and related skills/steering      | No                                                                                                          |

No domain owner is granted `WebSearch`/`WebFetch` solely to support decision-authoring.

### ID and storage scheme

`{ProjectID}-{DomainCode}-{###}`, e.g. `AIF-ARCH-004`, `AIF-PROC-002`. Counter is scoped per `(project, domain)` pair — independent across both projects and domains, so no domain's numbering is diluted by unrelated activity elsewhere, and no two projects installing this framework can collide on an ID.

Location: `{paths.decisions}/{domain-folder}/{ID}_{ShortTitle}.decision.md`, where `domain-folder` is the lowercase domain name (`architecture/`, `process/`, `planning/`, `ai-component/`, `quality/`, `testing/`, `meta-process/`). Tier C decisions are never stored here — they live inline per the Tier table above.

### Cross-domain index (`docs/decisions/index.json`)

One entry per Tier A/B decision, regardless of domain folder:

```json
{
  "id": "AIF-PROC-002",
  "tier": "A",
  "domain": "process",
  "title": "AI-Track Chunk Orchestration Dispatch",
  "status": "Approved",
  "path": "docs/decisions/process/AIF-PROC-002_ai-track-orchestration-dispatch.decision.md",
  "supersedes": [],
  "superseded_by": [],
  "references": ["AIF-PROC-001"],
  "referenced_by": ["AIF-PROC-004", "AIF-PROC-005", "AIF-PROC-006"],
  "tags": ["orchestration", "dispatch"]
}
```

Whichever skill produces or updates a Tier A/B record updates `index.json` in the same commit — a required output step, not a separate manual chore. A validation step (extending existing test tooling rather than adding a standalone script)
checks that every `references`/`referenced_by` pair is bidirectional and every `path` resolves.

---

## Impact on Planning

What Tech-Lead must know when decomposing the Epic that implements this decision:

**Skills/files requiring edits:**

- `skills/decision-record/` — scope explicitly to Tier A; add `Tier`/`Domain` metadata fields; add "update `index.json`" as a required Output step; add per-domain guidance stubs for `Design`/`Impact on Planning` content.
- New skill (or extension of `skills/knowledge-authoring`) for Tier B — slim template, same `Tier`/`Domain` fields, same index-update requirement, lighter gate per the Tier table.
- `skills/plan-lifecycle/` — document the Tier B abbreviated gate; reference the index-update step; document that Tier C rides its parent plan's gate.
- `skills/chunk-planning/` and `skills/epic-planning/` templates — add the Tier C inline-recording convention as documented guidance, not an implicit assumption.
- `agents/engineering-manager.yaml` — charter expansion to include decision-authoring (Process domain), following the pattern already used for AI-Engineer's Architecture/AI-component split.
- `skills/knowledge-authoring/` — update Step 2's `decision` type guidance to reflect the domain-scoped `knowledge/index.json` rule (Architecture/AI-component only) instead of a blanket "use decision-record instead."
- One-time creation of `docs/decisions/index.json`, backfilled from the 11 existing records per the migration table below.

**Migration of existing records (AIF-001 through AIF-011):**

> **Note (added AIF-002-015):** The table below is this decision's original, point-in-time proposal and remains valid as historical record, but it is no longer the current source of truth for the old→new ID mapping. Epic `AIF-002` Section 4 (migration table) is the authoritative, up-to-date reference — see it for the final resolved IDs, domains, and migration treatment actually applied.

| Old ID  | Title                                     | Status   | New Domain       | New ID         | New Folder      | `knowledge/index.json`? | Notes                                                                                                                                                                                        |
| ------- | ----------------------------------------- | -------- | ---------------- | -------------- | --------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AIF-001 | Install CLI Redesign                      | Approved | Architecture     | `AIF-ARCH-001` | `architecture/` | Yes                     |                                                                                                                                                                                              |
| AIF-002 | Steering Schema & Harness Adapter Scoping | Approved | Architecture     | `AIF-ARCH-002` | `architecture/` | Yes                     | `Referenced By: AIF-001` → update to `AIF-ARCH-001`                                                                                                                                          |
| AIF-003 | Shared Resource Lifecycle Management      | Approved | Architecture     | `AIF-ARCH-003` | `architecture/` | Yes                     | Originally authored by AI-Engineer, predating the AIF-004 boundary and this domain-ownership model. Historical inconsistency — no retroactive re-authorship, note only.                      |
| AIF-004 | AI-Engineer/Software-Engineer Boundary    | Approved | Process          | `AIF-PROC-001` | `process/`      | No                      | `Referenced By: AIF-005, AIF-007, AIF-009` → update IDs                                                                                                                                      |
| AIF-005 | AI-Track Chunk Orchestration Dispatch     | Approved | Process          | `AIF-PROC-002` | `process/`      | No                      | References/Referenced By set needs updating (AIF-004, AIF-007, AIF-009, AIF-010)                                                                                                             |
| AIF-006 | Parallel Chunk Isolation (Worktrees)      | Draft    | Process          | `AIF-PROC-003` | `process/`      | No                      | Still Draft — cheapest of the batch to renumber                                                                                                                                              |
| AIF-007 | Standards Sync Ownership                  | Draft    | Process          | `AIF-PROC-004` | `process/`      | No                      | Still Draft                                                                                                                                                                                  |
| AIF-008 | Standards Sync Mechanism                  | Draft    | **Architecture** | `AIF-ARCH-004` | `architecture/` | Yes                     | Reclassified — this is concrete mechanism/system design (sync protocol, conflict handling, config schema), not process/orchestration, despite sitting numerically inside the 004–011 cluster |
| AIF-009 | Git Workflow Mode                         | Draft    | Process          | `AIF-PROC-005` | `process/`      | No                      | Still Draft                                                                                                                                                                                  |
| AIF-010 | Who Sets AI-Track Chunk Boundaries        | Approved | Process          | `AIF-PROC-006` | `process/`      | No                      | Borderline Process/Planning — classified Process because it concerns `chunks.json`/orchestration authorship, not artifact shape                                                              |
| AIF-011 | Epic/Chunk Colocation, Worklog Split      | Approved | Planning         | `AIF-PLAN-001` | `planning/`     | No                      |                                                                                                                                                                                              |

Sequencing recommendation: migrate the four still-`Draft` records (AIF-006, AIF-007, AIF-008, AIF-009) first — cheapest, since no downstream work has been built against their current IDs yet. Migrate the seven `Approved` records afterward, and as part of that pass, grep the repo for each old ID string (`AIF-001` through `AIF-011`) to catch any prose reference outside the `docs/decisions/` tree itself (commit messages are historical and are not rewritten; live documentation and skills are).

**Not required by this decision:**

- No `.aiconfig.json` path changes beyond adding the domain subfolders under the existing `paths.decisions` (or its equivalent) resolution.
- No change to `plan-lifecycle`'s core Draft → Approved mechanics — only which artifacts use the full cycle versus the Tier B abbreviated one.

---

## Resolved Items

| #   | Item                                                                                              | Resolution                                                                                                                                                                                                                                                                                                                                                             |
| --- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Should ceremony scale independently of who owns a decision?                                       | Yes — Tier (rigor) and Domain (ownership) are independent axes, not a single combined classification.                                                                                                                                                                                                                                                                  |
| 2   | Who owns process/orchestration decisions?                                                         | Engineering-Manager, via a deliberate charter expansion — not Architect, and not Tech-Lead as a catch-all.                                                                                                                                                                                                                                                             |
| 3   | Who owns planning-artifact-convention decisions?                                                  | Tech-Lead, narrowly scoped to the shape of its own output artifacts — not "everything non-architectural."                                                                                                                                                                                                                                                              |
| 4   | Does Software-Engineer need its own decision domain?                                              | No — intentional. Tech-Lead's Epic/Chunk process already covers Software-Engineer's decision needs.                                                                                                                                                                                                                                                                    |
| 5   | Who owns meta-process decisions (decisions about the decision-system itself, including this one)? | A generic/catch-all agent for now. "Project-Manager" is reserved as the name for a future purpose-built agent if that becomes warranted.                                                                                                                                                                                                                               |
| 6   | Should every domain-owning agent gain research tools (`WebSearch`/`WebFetch`)?                    | No — none are added by default. Widening web access across every decision-authoring agent was judged a real security-surface cost for a benefit not yet demonstrated. Revisit per-agent only if a specific decision genuinely requires it.                                                                                                                             |
| 7   | Should decision IDs be domain-only (e.g. `PROC-002`), or retain the project prefix?               | Retain the project prefix — `{ProjectID}-{DomainCode}-{###}`. This repo is a framework other project repos install from; a domain-only prefix would collide across projects.                                                                                                                                                                                           |
| 8   | Should every decision live in the same folder with the same naming convention?                    | No — each domain gets its own subfolder and its own `(project, domain)`-scoped ID counter. A single cross-domain `index.json` provides unified discoverability without requiring uniform physical location.                                                                                                                                                            |
| 9   | Should all Decision Records be loaded via `knowledge/index.json`?                                 | No — only Architecture and AI-component, the two domains without a single canonical implementing artifact that already captures the decision's effect. The other domains' decisions are traceable via `index.json` for history/audit, but not proactively loaded — their implemented effect already lives in the skill/template/steering file agents consult directly. |
| 10  | What domain do AIF-004 through AIF-011 fall under?                                                | See the migration table above. Ten of the eleven existing records fall into Architecture (4) or Process (6); one (AIF-011) falls into Planning.                                                                                                                                                                                                                        |
