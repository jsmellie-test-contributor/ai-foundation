# Chunk Plan: skill/decision-record — Scope to Tier A, Tier/Domain/Tags Metadata, Per-Domain Guidance

## 1. Metadata

| Field          | Value                                                                                                         |
| -------------- | ------------------------------------------------------------------------------------------------------------- |
| Plan ID        | AIF-002-002                                                                                                   |
| Parent Epic    | AIF-002                                                                                                       |
| Chunk          | 2 of 15                                                                                                       |
| Depends On     | None                                                                                                          |
| Can Parallel   | AIF-002-001, AIF-002-003, AIF-002-004, AIF-002-005, AIF-002-006, AIF-002-007, AIF-002-008, AIF-002-009        |
| Project        | ai-foundation                                                                                                 |
| Status         | Approved                                                                                                      |
| Author (Agent) | AI-Engineer (revised by Tech-Lead per AIF-002 rev 6)                                                          |
| Reviewed By    | Jeremy                                                                                                        |
| Created        | 2026-08-14 21:40                                                                                              |
| Last Updated   | 2026-08-17 (revised for AIF-002 rev 6 — index-update step removed,`Tags` field added)                         |
| Standards      | AGENTS.md declarative-component schemas (no code standards apply — this chunk touches only`skills/` markdown) |

---

## 2. Goal

Scope `skills/decision-record/` explicitly to Tier A ("Researched") decisions, add `Tier`/`Domain`/`Tags` metadata fields to its template, and add per-domain `Design`/`Impact on Planning` guidance stubs for all 7 decision domains — establishing the stable Tier A template contract that Wave 2 migration chunks (010–013) will reformat the 8 full-reformat legacy records against, and that chunk 014's `aif index -d` will parse.

> Requirement traceability: AIF-002 Epic Plan §3 ("`skills/decision-record/` —
> scope explicitly to Tier A only...") and §5 (Architecture Overview, New
> Components table). Implements AIF-META-001 §"Impact on Planning" bullet 1.

**Revision note (2026-08-17):** This chunk was originally drafted (2026-08-14) under a design where `decision-record` itself hand-updated `docs/decisions/index.json` as a required Output step. AIF-002 Epic Plan rev 5/6 superseded that design: `index.json` is now a generated artifact, produced by `aif index -d` (Wave 2 chunk 014) crawling every record's metadata table — `decision-record`'s only remaining responsibility toward the index is keeping its own record's metadata table (including the new `Tags` field) accurate. This revision removes the index-update Step/Output/Edge-Case content that is no longer this skill's job, and adds `Tags` (Epic rev 6, Open Question 6). All other content from the original chunk (Tier A scoping, Domain determination, per-domain guidance stubs, `References` field) is unchanged and still applies.

---

## 3. Quick Summary

**Open Items:** 3 open (0 High / 2 Medium / 1 Low) — see Section 14

---

## 4. Acceptance Criteria

- [ ] `skills/decision-record/SKILL.md` explicitly states Tier A scope and `decision-triage`/direct-invocation entry points
- [ ] `skills/decision-record/SKILL.md` documents Step 1 (Confirm Tier A, Determine Domain) — **no index-update step** (removed, rev 6)
- [ ] `skills/decision-record/reference/template.md`'s Metadata table contains exactly the 11 fields in the order specified in Section 8/7, including `Tier`, `Domain`, `References`, and `Tags`
- [ ] `skills/decision-record/reference/domain-guidance.md` exists and covers all 7 domains (Architecture, Process, Planning, AI-component, Quality, Testing, Meta-process) with Domain Code, folder, default owner, `Design` guidance, and `Impact on Planning` guidance for each
- [ ] All internal cross-references resolve (Test DR-T02)
- [ ] `npm test` passes with no new failures (Test DR-T05)
- [ ] No mention of an index-update step/output/edge-case remains in `SKILL.md` (Test DR-T06)
- [ ] No HIGH or CRITICAL findings open in review
- [ ] Plan committed with `Status: Draft`, presented, and `Status: Approved` committed as its own commit before any implementation commit, per `skill/plan-lifecycle`

---

## 5. Scope

### In Scope

- `skills/decision-record/SKILL.md`:
  - Update `description` front-matter and Purpose section to state this skill is scoped explicitly to **Tier A** decisions, invoked by `skill/decision-triage` (or directly, by an agent that already knows it needs Tier A).
  - Add a new Step ("Confirm Tier A and Determine Domain") before option generation, that (a) confirms Tier A applies (redirecting to `skill/decision-triage` if the invoking agent has not already triaged), and (b) determines the Domain per AIF-META-001's Domain ownership table, loading the matching guidance stub from the new `reference/domain-guidance.md`.
  - Update the `Outputs` section: state that `docs/decisions/index.json` is a derived artifact maintained by `aif index -d` (AIF-002-014), not an output this skill produces directly; correct the stale default location (`knowledge/decisions/`) to match this repo's actual convention (`docs/decisions/`) and the new per-domain path shape.
  - Add/adjust `Edge Cases` for: a decision that doesn't clearly belong to exactly one domain. _(Removed, 2026-08-17: the "index.json missing/malformed when this step runs" edge case — this skill no longer touches `index.json`, so that failure mode belongs to `aif index -d`'s own error handling, not this skill's Edge Cases.)_
- `skills/decision-record/reference/template.md`:
  - Add `Tier`, `Domain`, and `Tags` fields to the Metadata table, in the exact field order specified in Section 8 below (matches the precedent already set by `AIF-META-001`'s own Metadata table, plus `Tags` per AIF-002 rev 6/Open Question 6).
  - Add a `References` field alongside the existing `Referenced By` field (see Section 7, Key Design Decision 2, for why this is in scope even though the Epic bullet names only `Tier`/`Domain`).
  - Update the `Decision ID` row's placeholder to the new `{ProjectID}-{DomainCode}-{###}` scheme.
  - Update the `Author (Agent)` row's placeholder from the hardcoded `Architect` default to reflect domain-owner authorship.
- **New file** `skills/decision-record/reference/domain-guidance.md`: per-domain `Design`/`Impact on Planning` guidance stubs for all 7 domains (Architecture, Process, Planning, AI-component, Quality, Testing, Meta-process), each paired with its Domain Code and default owning agent, per AIF-META-001's Domain ownership table.
- Self-validation: `npm test` (existing validation suite has no skill-schema checks today, so this chunk's own review is the primary gate — see Section 12); manual verification that every internal reference (`SKILL.md` → `reference/template.md`, `SKILL.md` → `reference/domain-guidance.md`) resolves.

### Out of Scope

- Creating, backfilling, or generating `docs/decisions/index.json` itself, or any `aif index -d` CLI/tooling code — that is chunk 014 (tool) and chunk 015 (backfill run), neither of which this chunk depends on or blocks (rev 6: `decision-record` has no runtime relationship to `index.json` generation beyond keeping its own metadata table accurate).
- Adding `paths.decisions` to `.aiconfig.json` (chunk 008, parallel Wave 1 chunk — this chunk documents the fallback default independently and does not block on 008 landing first).
- `skills/decision-triage/` itself (chunk 001, parallel Wave 1 chunk) — this chunk only documents that `decision-record` expects to be invoked by it (or directly by an agent that already knows it needs Tier A); it does not define triage's own dispatch logic.
- `skills/decision-brief/` (Tier B producer, chunk 003) — no changes to that skill are made here.
- Migrating any of the 11 existing Decision Records to the new template shape (chunks 009–013) — this chunk only establishes the shape they will be migrated against.
- Extending `tests/validation/` to add automated schema checks for `skills/decision-record/` itself — no such check exists for any skill today (confirmed by reading `tests/validation/schemas.test.js`, which validates agents and servers only) and adding one is not in this chunk's Epic-scoped bullet. Not raised as a discovery since it is a pre-existing gap orthogonal to this chunk's deliverable, not new scope this chunk creates.
- Any `lib/`, `bin/`, or other runtime-code change — this chunk remains documentation-only (`skills/` markdown), even though the Epic as a whole now includes runtime code (chunk 014).

---

## 6. Prerequisites

- [x] AIF-002 Epic Plan `Status: Approved` (verified — rev 6, `docs/plans/epics/AIF-002.epic.md` §1)
- [x] AIF-META-001 Decision Record `Status: Approved` (verified — provides the Tier/Domain model, Domain ownership table, and ID/storage scheme this chunk implements)
- [x] Current `skills/decision-record/SKILL.md` and `skills/decision-record/reference/template.md` read and understood
- [ ] None of this chunk's file changes are blocked on any other Wave 1 chunk landing first (all Wave 1 chunks touch disjoint files except 006, which does not overlap this chunk)

---

## 7. Architecture & Design

### Project Structure Changes

- `skills/decision-record/SKILL.md` ← MODIFIED
- `skills/decision-record/reference/template.md` ← MODIFIED
- `skills/decision-record/reference/domain-guidance.md` ← NEW

### Key Design Decisions

1. **Decision**: Metadata table field order is `Decision ID, Project, Tier, Domain, Status, Author (Agent), Approved By, Created, Referenced By, References, Tags`.
   **Rationale**: The first nine fields already exist as a real, human-approved precedent in `AIF-META-001`'s own Metadata table (see `docs/decisions/meta-process/AIF-META-001_...decision.md` lines 3-16). Reusing it verbatim — rather than inventing a new order — gives Wave 2 migration chunks (010–013) a contract that is already proven against a real record. `Tags` is appended as the tenth field (rev 6, Epic §3/Open Question 6) — placed last since it's the newest field and its position doesn't collide with anything AIF-META-001 already established.
2. **Decision**: Add a `References` field to the template, not just `Tier`/`Domain` as the Epic bullet names explicitly.
   **Rationale**: The Epic's own migration-treatment text (§3: "updating every `Referenced By`/`References` field to the new ID scheme") and AIF-META-001's own record (which carries both fields) both already assume `References` exists as a template field — the current template only has `Referenced By`.
   `aif index -d` (chunk 014) needs both `references` and `referenced_by` populated in `index.json` — `referenced_by` it computes itself by inversion, but `references` (outbound citations) can only come from what the record's own author writes, since no crawler can infer "this record cites that one" without the author saying so. This is treated as necessary infrastructure the index-generation tool depends on, not an independent scope expansion, since the Epic text already presumes the field's existence. Flagged here for transparency rather than silently added.
3. **Decision**: Domain metadata field value is the lowercase domain-folder name (`architecture`, `process`, `planning`, `ai-component`, `quality`, `testing`, `meta-process`), not the capitalized domain label or the 3-4 letter Domain Code.
   **Rationale**: Matches `AIF-META-001`'s own `Domain` field value (`meta-process`) and the `index.json` schema's `"domain"` field example (`"process"`) exactly. The Domain Code (`ARCH`, `PROC`, etc.) appears only inside the Decision ID string, not as a separate metadata row — one value per concept, no duplicate encoding.
4. **Decision**: Per-domain `Design`/`Impact on Planning` guidance lives in a new standalone reference file (`reference/domain-guidance.md`), not inlined into `template.md` or duplicated per-domain template variants.
   **Rationale**: `template.md` remains a single universal skeleton (per AIF-META-001 Design: "`Design` and `Impact on Planning` content is shaped by domain-specific guidance... rather than a forked template"). A standalone reference file keeps the template itself short and lets `SKILL.md` Step 1 point any domain-owning agent at the matching stub without maintaining 7 near-duplicate template files.
5. **Decision (rev 6, 2026-08-17 — supersedes the original chunk's Key Design Decision 5)**: This skill has **no index-update step**. `docs/decisions/index.json` is generated, not hand-edited — `aif index -d` (chunk 014) crawls every Tier A/B record's metadata table and (re)builds the whole index, computing `referenced_by`/`superseded_by` by inversion across the corpus.
   **Rationale**: AIF-002 Epic Plan rev 5/6 corrected the original design after review found that most index fields are mechanically derivable from a record's own metadata table and file path, and that hand-maintaining `referenced_by` is actually _less_ reliable than computing it by inversion, since no single record's author can see the whole cross-reference graph. This chunk's only remaining obligation toward the index is indirect: keep the metadata table (Section 8/7) accurate and complete, since `aif index -d` depends on it as its sole source of truth. This chunk does not need to know anything about `aif index -d`'s implementation, sequencing relative to chunk 014/015, or CLI mechanics — that is chunk 014's and 015's concern entirely, decoupled from this skill's own documentation.
   **Removed as a result**: the "Update the Decision Index" Step, the index-entry line in `Outputs`, and the index-missing/malformed `Edge Case` from the original chunk draft — see Section 5 and the Work Log.

### Patterns & Conventions Applied

- AGENTS.md declarative-component schema for skills (`SKILL.md` front-matter + Purpose/Inputs/Steps/Outputs/Edge Cases structure) — unchanged, only content within existing sections is edited/added.
- `skill/plan-lifecycle` commit-gate procedure, referenced (not modified) by `decision-record`'s existing Step 4 (renumbered, unchanged in substance).

---

## 8. Components

### `skills/decision-record/SKILL.md` — Tier A scoping, domain determination

**File**: `skills/decision-record/SKILL.md`
**Purpose**: Entry-workflow documentation for producing a Tier A Decision Record.

**Content changes**:

Front-matter `description` becomes:

```
"Produces a structured Tier A ('Researched') Decision Record capturing options explored and the chosen approach. Invoked by skill/decision-triage, or directly by an agent that already knows it needs Tier A."
```

Purpose section gains an explicit opening statement:

```
This skill is scoped to Tier A ("Researched") decisions only — see
AIF-META-001's Tier definitions. Tier B ("Structural") decisions use
skill/decision-brief; Tier C ("Embedded") decisions are recorded inline per
skill/chunk-planning / skill/epic-planning and never reach this skill. This
skill is normally invoked by skill/decision-triage after it has already
selected Tier A and determined the Domain; an agent that already knows with
certainty it needs a Tier A record for a specific Domain may invoke this skill
directly.
```

Steps become (renumbered; new step marked NEW; original Step 6 "Update the Decision Index" is **removed**, rev 6):

- **Step 1 (NEW) — Confirm Tier A and Determine Domain**: If not already triaged via `skill/decision-triage`, confirm Tier A genuinely applies (a genuine multi-option trade-off with lasting cross-component impact — the AIF-META-001 promotion-threshold test #1). Determine the Domain from AIF-META-001's Domain ownership table (Architecture/`ARCH`, Process/`PROC`, Planning/`PLAN`, AI-component/`AIC`, Quality/`QA`, Testing/`TEST`, Meta-process/`META`) and load the matching stub from `reference/domain-guidance.md` for use when writing `Design`/`Impact on Planning` in Step 5. If the decision doesn't clearly belong to exactly one domain, select the closest match and note the ambiguity in `Impact on Planning`/`Design` rather than blocking (see Edge Cases).
- **Step 2 — Generate Options** (was Step 1, unchanged in substance)
- **Step 3 — Recommend** (was Step 2, unchanged in substance)
- **Step 4 — Write the Decision Record** (was Step 3): writes the record using `reference/template.md`, applying the domain guidance loaded in Step 1 to the `Design`/`Impact on Planning` sections. Ensure the Metadata table (including `Tier`, `Domain`, `References`, and `Tags` if applicable) is complete and accurate — this is the sole source `aif index -d` (AIF-002-014) reads when it later builds `docs/decisions/index.json`.
- **Step 5 — Follow the Commit-Gate Procedure** (was Step 4, unchanged in substance): `skill/plan-lifecycle`, `Status: Draft` → human confirmation → `Approved`/`Deferred`.

`Outputs` section becomes:

```
- **Decision Record** — markdown file following the template format
- **Location:** `{paths.decisions}/{domain-folder}/{ID}_{ShortTitle}.decision.md`
  (`paths.decisions` from `.aiconfig.json`, default `docs/decisions/` if unset;
  `{domain-folder}` is the lowercase Domain value — `architecture/`, `process/`,
  `planning/`, `ai-component/`, `quality/`, `testing/`, `meta-process/`; `{ID}`
  is `{ProjectID}-{DomainCode}-{###}`, e.g. `AIF-ARCH-004`, `AIF-PROC-002`,
  counter scoped per `(project, domain)` pair)
- **Note:** `{paths.decisions}/index.json` is not produced by this skill. It is a
  generated artifact, rebuilt by running `aif index -d` (see AIF-002-014),
  which reads every record's Metadata table directly — this skill's only
  obligation toward the index is keeping that table accurate.
```

`Edge Cases` gains:

```
- **Decision doesn't clearly belong to exactly one domain** — select the
  closest matching domain per Step 1 and note the ambiguity in `Impact on
  Planning`/`Design`. If genuinely unclear and materially affects who should
  author the record, raise to the human rather than guessing (global Rule 2).
```

**Dependencies**:

- `skills/decision-record/reference/template.md` — for the record skeleton
- `skills/decision-record/reference/domain-guidance.md` (NEW, this chunk) — for per-domain `Design`/`Impact on Planning` guidance
- `skill/plan-lifecycle` — for the commit-gate procedure (unchanged reference)
- `skill/decision-triage` (AIF-002-001, parallel chunk) — upstream caller; no hard dependency, since this skill documents accepting direct invocation too

---

### `skills/decision-record/reference/template.md` — Tier/Domain/References/Tags metadata fields

**File**: `skills/decision-record/reference/template.md`
**Purpose**: Canonical Tier A record skeleton every `decision-record` output follows, and the shape Wave 2 migration chunks (010–013) reformat existing records against, and `aif index -d` (chunk 014) parses.

**Exact target Metadata table** (replaces the current table, lines 3-14 today):

```
| Field | Value |
|---|---|
| Decision ID | {ProjectID}-{DomainCode}-{###} |
| Project | {Project name} |
| Tier | A |
| Domain | {architecture / process / planning / ai-component / quality / testing / meta-process} |
| Status | Draft / Approved / Done / Deferred / Superseded |
| Author (Agent) | {Domain owner agent — see reference/domain-guidance.md} |
| Approved By | {human name or "Pending"} |
| Created | {YYYY-MM-DD HH:mm} |
| Referenced By | {Decision ID(s) that cite this record, or "—"} |
| References | {Decision ID(s) this record cites, or "—"} |
| Tags | {comma-separated free-text tags for discovery, or "—"} |
```

No other section of `template.md` changes (Problem Statement, Constraints & Requirements, Options Explored, Decision, Design, Impact on Planning, Resolved/Open Items all remain structurally as-is — only the Metadata table changes).

**Key Behaviour**:

- `Tier` is always literally `A` in this template (Tier B/C never reach this file — enforced by which skill is invoked, not by validation here).
- `Domain` value must be one of the 7 lowercase domain-folder names; no free-text domain names.
- `Decision ID` and `Domain` must agree — the Domain Code embedded in the ID (`ARCH`, `PROC`, `PLAN`, `AIC`, `QA`, `TEST`, `META`) must correspond to the `Domain` field's folder name.
- `Tags` (rev 6, new) is free-text, author's judgment, comma-separated — no controlled vocabulary is enforced by this chunk or this Epic. `aif index -d` (chunk 014) splits this field on commas into `index.json`'s `tags` array.

**Dependencies**: None (this is the leaf template file).

---

### `skills/decision-record/reference/domain-guidance.md` — per-domain Design/Impact-on-Planning stubs (NEW)

**File**: `skills/decision-record/reference/domain-guidance.md`
**Purpose**: Per-domain guidance for what belongs in a Tier A record's `Design` and `Impact on Planning` sections, keyed by Domain/Domain Code, derived from AIF-META-001's Domain ownership table.

**Content** (full text to be written verbatim as this chunk's deliverable):

```markdown
# Decision Record — Per-Domain Guidance

Guidance for the `Design` and `Impact on Planning` sections of a Tier A
Decision Record, by Domain. Loaded in `skill/decision-record` Step 1 once the
Domain has been determined. Derived from AIF-META-001's Domain ownership table
— see that record for the authoritative source if this stub and AIF-META-001
ever appear to disagree.

| Domain       | Domain Code | Folder          | Default Owner                                                                          |
| ------------ | ----------- | --------------- | -------------------------------------------------------------------------------------- |
| Architecture | `ARCH`      | `architecture/` | Architect                                                                              |
| Process      | `PROC`      | `process/`      | Engineering-Manager                                                                    |
| Planning     | `PLAN`      | `planning/`     | Tech-Lead                                                                              |
| AI-component | `AIC`       | `ai-component/` | AI-Engineer                                                                            |
| Quality      | `QA`        | `quality/`      | Principal-Engineer                                                                     |
| Testing      | `TEST`      | `testing/`      | Test-Engineer                                                                          |
| Meta-process | `META`      | `meta-process/` | Generic/catch-all agent (name "Project-Manager" reserved for a future dedicated agent) |

## Architecture (`ARCH`)

**Design**: Schemas, component boundaries, system-structure diagrams — the
concrete shape of what's being built or changed.
**Impact on Planning**: What Tech-Lead must know when decomposing an Epic that
depends on this decision — components that will/won't exist, constraints on
file/module boundaries, options explicitly ruled out.

## Process (`PROC`)

**Design**: Dispatch/pipeline flow changes, orchestration-state effects —
sequence diagrams or state-transition tables for how work moves between agents.
**Impact on Planning**: Effects on chunk/wave sequencing, blocking/unblocking
mechanics, or agent dispatch order that Tech-Lead or Engineering-Manager must
account for in future Epic/Chunk decomposition.

## Planning (`PLAN`)

**Design**: Chunk/Epic Plan shape changes, worklog structure, plan-lifecycle
mechanics — template diffs or new required sections/fields.
**Impact on Planning**: How this changes what a Chunk Plan or Epic Plan must
contain going forward; whether existing plans need any retroactive note (they
are not rewritten, per Epic-level precedent, but the gap should be named).

## AI-component (`AIC`)

**Design**: Agent/skill/steering/schema impact — which declarative components
change shape, new fields, new cross-reference requirements.
**Impact on Planning**: What AI-Engineer (or Tech-Lead decomposing an Epic that
touches AI components) must know about new/changed schemas before authoring or
modifying agents, skills, or steering files.

## Quality (`QA`)

**Design**: Review-criteria and severity-gate changes — what moves a finding
from LOW to HIGH, what becomes a new blocking check.
**Impact on Planning**: Which existing review checklists (Principal-Engineer's)
change, and whether any currently-passing work would now fail review under the
new criteria.

## Testing (`TEST`)

**Design**: Test-execution/coverage-strategy changes — new required test
types, changed pass/fail criteria, new tooling in the test pipeline.
**Impact on Planning**: What Test-Engineer (or a Chunk Plan's Testing Plan
section) must include going forward as a result of this decision.

## Meta-process (`META`)

**Design**: Effect on `skill/decision-record` and related skills/steering
themselves — this is the domain for decisions _about_ the decision-system.
**Impact on Planning**: What every other domain's decision-authoring agent
must know changed about how decisions themselves are tiered, owned, stored, or
indexed — since a Meta-process decision can ripple into every other domain's
authoring workflow (as AIF-META-001 itself does).
```

**Dependencies**: None (leaf reference file). Referenced by `skills/decision-record/SKILL.md` Step 1.

---

## 9. Data Models

### Decision Record Metadata (template contract)

**Purpose**: The exact field set and order every Tier A record's Metadata table must follow — the contract Wave 2 migration chunks (010–013) build against, and `aif index -d` (chunk 014) parses.

| Field          | Type            | Required | Notes                                                                                                      |
| -------------- | --------------- | -------- | ---------------------------------------------------------------------------------------------------------- |
| Decision ID    | string          | Yes      | `{ProjectID}-{DomainCode}-{###}`, e.g. `AIF-ARCH-004`                                                      |
| Project        | string          | Yes      | Project name, e.g.`ai-foundation`                                                                          |
| Tier           | string          | Yes      | Always`A` for records produced by this skill                                                               |
| Domain         | string          | Yes      | One of`architecture`, `process`, `planning`, `ai-component`, `quality`, `testing`, `meta-process`          |
| Status         | string          | Yes      | One of`Draft`, `Approved`, `Done`, `Deferred`, `Superseded` (per `skill/plan-lifecycle` status vocabulary) |
| Author (Agent) | string          | Yes      | Domain owner agent name (see`reference/domain-guidance.md`)                                                |
| Approved By    | string          | Yes      | Human name or`Pending`                                                                                     |
| Created        | datetime string | Yes      | `YYYY-MM-DD HH:mm`                                                                                         |
| Referenced By  | string          | Yes      | Decision ID(s) that cite this record, or`—`                                                                |
| References     | string          | Yes      | Decision ID(s) this record cites, or`—`                                                                    |
| Tags           | string          | No       | Comma-separated free-text tags, or`—`. New in rev 6 (Open Question 6).                                     |

---

## 10. Security Requirements

> This section must never be empty.

- [ ] All external inputs validated before use — N/A, this chunk produces only static markdown documentation/reference content; no external input is parsed or executed.
- [ ] No secrets or credentials in source code or logs — verified; no credential-shaped content is introduced by this chunk.
- [ ] Errors exposed to users contain no internal system details — N/A, no runtime error paths are introduced (documentation only).
- [ ] No `WebSearch`/`WebFetch` grant is introduced or implied by this chunk — this chunk does not touch any agent's tool grants at all (that is chunk 006's scope, for Engineering-Manager only); explicitly verified as out of scope here to guard against accidental drift given AIF-META-001's non-negotiable on this point.
- [ ] `docs/decisions/index.json` data-integrity handling (missing/malformed file) is **not** this chunk's responsibility (rev 6) — that error path now belongs entirely to `aif index -d`'s own implementation (chunk 014). Verified this chunk's `SKILL.md` does not claim to own or handle that failure mode, avoiding two components silently disagreeing about who's responsible for it.

---

## 11. Logging Requirements

> This section must never be empty.

This chunk produces only static documentation/reference artifacts consumed by agents at plan/record-authoring time — it introduces no runtime software component, so there is no application log stream to define events for.
Logging requirements applicable here are the ones already mandated by `skill/plan-lifecycle`'s Work Log convention:

| Event                        | Level (Work Log equivalent)     | What is logged                                                          | What is NOT logged                             |
| ---------------------------- | ------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------- |
| Chunk Plan Draft committed   | Work Log entry, this file's §14 | Timestamp, Agent, Action=`Created`/`Revised`, Plan ID, one-line summary | No file contents duplicated into the log entry |
| Chunk Plan revised (if any)  | Work Log entry, this file's §14 | Timestamp, Agent, Action=`Revised`, Plan ID, what changed and why       | —                                              |
| Chunk Plan Approved/Deferred | Work Log entry, this file's §14 | Timestamp, Agent, Action=`Approved`/`Deferred`, Plan ID, approver name  | —                                              |

---

## 12. Testing Plan

This chunk has no executable code — "testing" here means self-validation of the produced markdown artifacts.

### `skills/decision-record/` Tests

| Test ID             | Description                                                                                                                      | Type                 | Pass Criteria                                                                                                                                                      |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DR-T01              | `SKILL.md` front-matter still parses as valid YAML after edits                                                                   | Manual/self-validate | Front-matter block parses cleanly; no broken YAML syntax                                                                                                           |
| DR-T02              | Every internal reference in`SKILL.md` resolves to a real file                                                                    | Manual/self-validate | `reference/template.md` and `reference/domain-guidance.md` both exist at the paths `SKILL.md` cites                                                                |
| DR-T03              | `template.md`'s Metadata table matches the Section 8/7 contract exactly (field names, order, including `Tags`)                   | Manual/self-validate | Diff against Section 9's Data Model table shows no discrepancy                                                                                                     |
| DR-T04              | `domain-guidance.md` covers all 7 domains with matching Domain Code/Folder/Owner values as AIF-META-001's Domain ownership table | Manual/self-validate | Side-by-side comparison against AIF-META-001 lines 236-245 shows no discrepancy                                                                                    |
| DR-T05              | `npm test` (repo-wide validation suite) still passes after these changes                                                         | Automated            | Exit code 0, no new failures introduced                                                                                                                            |
| DR-T06 (rev 6, new) | `SKILL.md` contains no "Update the Decision Index" step and no index-update Output/Edge-Case content                             | Manual/self-validate | Grep for "index.json" in`SKILL.md` returns only the informational Outputs note pointing to `aif index -d`, no step/edge-case instructing this skill to write to it |

---

## 13. Documentation Requirements

- [ ] Inline documentation on all public members — N/A (markdown skill files, not source code)
- [ ] File headers on all new source files — N/A; per Rule 2's own text, "file header comments" apply to source files. This chunk's new file (`reference/domain-guidance.md`) is a markdown reference doc; its opening `# Decision Record — Per-Domain Guidance` heading plus this Chunk Plan's Work Log entry (Rule 2) provide the Plan ID traceability instead of an embedded comment, consistent with how the sibling `reference/template.md` is treated today (no file-header comment either).
- [ ] README updated if user-facing — N/A, no README references `skills/decision-record/` internals directly
- [ ] CHANGELOG entry written — to confirm at Epic-level sign-off per AIF-002 Acceptance Criteria (does this repo maintain one); not duplicated per chunk

---

## 14. Risks & Open Questions

| #   | Risk / Question                                                                                                                                                                                                                            | Impact | Mitigation                                                                                                                                                                                                                                                                                                                                                            |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Adding a`References` field to the template beyond the Epic bullet's explicit `Tier`/`Domain` wording could be read as scope expansion (Rule 4).                                                                                            | M      | Documented explicitly as Key Design Decision 2 (Section 7) with rationale tracing directly to the Epic's own migration-treatment text, AIF-META-001's own record, and`aif index -d`'s dependency on outbound `references` data; flagged transparently rather than silently added. If the human disagrees, this is a one-field, low-cost revert before implementation. |
| 2   | Wave 2 migration chunks (010, 011, 012, 013) and chunk 014 (`aif index -d`) depend on this chunk's exact field layout; if this plan's contract changes during revision, those chunks would need to account for whichever shape lands here. | M      | This plan states the exact field names/order in two places (Section 8 component spec and Section 9 Data Model table) precisely so it is unambiguous once Approved; downstream chunk authors read this Approved plan (or the resulting`template.md`) directly rather than re-deriving the shape.                                                                       |
| 3   | This chunk does not add automated schema validation for`skills/decision-record/`'s own structure (no such check exists for any skill in `tests/validation/` today).                                                                        | L      | Out of scope per Section 5; not a regression introduced by this chunk. If the human wants skill-schema validation added, that is a separate, cross-cutting piece of work affecting every skill, not specific to this chunk.                                                                                                                                           |

---

## 15. Work Log

[2026-08-14 21:40] [AI-Engineer] [Created] [AIF-002-002] [Drafted Chunk Plan for skill/decision-record Tier A scoping, Tier/Domain metadata, index-update step, and per-domain guidance stubs. Read AIF-002 Epic Plan (Sections 5, 6, 7, 10), chunks.json, and AIF-META-001 (Approved) for the Tier/Domain model and ID/storage scheme. Assessed complexity as Tier 2 (Standard) per skill/complexity-tiers — modifying an existing skill following an established, human-approved pattern (AIF-META-001), not inventing a new one. Key contract decisions for downstream Wave 2 migration chunks (010-013): Metadata table field order (Decision ID, Project, Tier, Domain, Status, Author (Agent), Approved By, Created, Referenced By, References) reused verbatim from AIF-META-001's own precedent; Domain field value is the lowercase domain-folder name, not the Domain Code or capitalized label; added a References field alongside the existing Referenced By field as necessary infrastructure for the explicitly-scoped index-update step (flagged transparently in Section 7 and Section 14, not silently added). Not yet presented for human review.]
[2026-08-17 00:00] [Tech-Lead] [Revised] [AIF-002-002] [Revised per AIF-002 Epic Plan rev 6 (Approved 2026-08-17): removed the "Update the Decision Index" Step 6, the index-entry line in Outputs, and the index-missing/malformed Edge Case — `docs/decisions/index.json` is now a generated artifact built by `aif index -d` (new chunk 014), not something this skill writes to. Added `Tags` as an eleventh Metadata table field (rev 6, Open Question 6 — authored the same way `Domain`/`Tier` are, free-text/comma-separated, no controlled vocabulary). Updated Section 5 (In/Out of Scope), Section 7 (Key Design Decision 5 rewritten; Decision 2's rationale updated to explain `References` in terms of `aif index -d`'s dependency on it rather than "the index-update step this chunk is scoped to add"), Section 8 (Step 6 removed, Outputs/Edge Cases rewritten), Section 9 (Tags row added), Section 10 (index-integrity checklist item rewritten to state non-ownership), Section 11 (removed the now-nonexistent future runtime-log row), Section 12 (added Test DR-T06), Section 4 (Acceptance Criteria updated), Section 14 (Risk 3 — the old "index doesn't exist yet" sequencing risk — removed, since this skill no longer touches the index at all; that risk now belongs to chunk 014/015 if it exists there). No change to Tier A scoping, Domain determination, per-domain guidance content, or the `References` field itself — all still apply as originally drafted. Still `Status: Draft`, not yet re-presented for human review.]
[2026-08-16 11:18] [Jeremy] [Approved] [AIF-002-002] [Reviewed and approved manually by Jeremy. Status set to `Approved`, `Reviewed By: Jeremy`, committed as part of "Approved AIF-002 chunk plan 01 to 04" (commit `bbd6a1e`). This Work Log entry added retroactively by Engineering-Manager on 2026-08-17 to close a traceability gap — the original approval commit updated the Metadata table but did not append a corresponding Work Log entry, per engineering steering Rule 3 (logging requirements are never optional).]
[2026-08-18] [AI-Engineer] [Revised] [AIF-002-002] [Migrated this Chunk Plan to the reordered template structure approved for skill/chunk-planning: Quick Summary (new Section 3, open-item count derived from the existing Risks & Open Questions table) and Acceptance Criteria (moved from Section 12 to Section 4) now sit immediately after the Goal; all other sections renumbered accordingly (mapping: 3->5, 4->6, 5->7, 6->8, 7->9, 8->10, 9->11, 10->12, 11->13, 13->14, 14->15). Every inline "Section N" cross-reference in this file, including references into the AIF-002 Epic Plan's own renumbered sections, was remapped to match. No wording, decisions, criteria, or risk content was changed - purely structural, per human direction (no active work on these plans at the time of migration).]
