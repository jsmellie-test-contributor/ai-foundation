# Chunk Plan: skill/decision-brief — New Tier B Skill (Slim Template, Lighter Gate)

## 1. Metadata

| Field          | Value                                                                                                                                                          |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plan ID        | AIF-002-003                                                                                                                                                    |
| Parent Epic    | AIF-002                                                                                                                                                        |
| Chunk          | 3 of 15                                                                                                                                                        |
| Depends On     | None                                                                                                                                                           |
| Can Parallel   | 001, 002, 004, 005, 006, 007, 008, 009 (all other Wave 1 chunks)                                                                                               |
| Project        | ai-foundation                                                                                                                                                  |
| Status         | Approved                                                                                                                                                       |
| Author (Agent) | AI-Engineer (revised by Tech-Lead per AIF-002 rev 6)                                                                                                           |
| Reviewed By    | Jeremy                                                                                                                                                         |
| Created        | 2026-08-14                                                                                                                                                     |
| Last Updated   | 2026-08-17 (revised for AIF-002 rev 6 — index-update step removed,`Tags` field added, `scripts/` rationale corrected)                                          |
| Standards      | ai-foundation declarative-component schemas (AGENTS.md) — no code standards apply; this chunk's deliverables are`skills/decision-brief/` markdown content only |

---

## 2. Goal

Author a new skill `skills/decision-brief/` — the Tier B ("Structural") Decision Record producer per AIF-META-001's Tier × Domain model: a slim skeleton (Metadata, Problem, Decision, Rationale, Impact — no Options-Explored ceremony), the same `Tier`/`Domain`/`Tags` metadata fields as `skill/decision-record`, and a lighter `plan-lifecycle` gate (Draft → one human confirmation → Approved, no expected multi-round revision cycle).

**Revision note (2026-08-17):** This chunk was originally drafted (2026-08-14) under a design where `decision-brief` itself hand-updated `docs/decisions/index.json` as a required Step, and reasoned that this skill needed no `scripts/` folder because writing a brief (including its index update) is "judgment-driven," not "mechanical." AIF-002 Epic Plan rev 5/6 corrected that reasoning: index maintenance is now `aif index -d` (Wave 2 chunk 014) crawling every record's metadata table — a mechanical extraction the original chunk's own rationale had wrongly bundled in with the genuinely judgment-driven work of writing the brief itself. This revision removes the index-update Step/Output/Edge-Case content, corrects the superseded rationale, and adds `Tags` (Epic rev 6, Open Question 6). Everything else — the slim five-section skeleton, the Tier B abbreviated gate, the escalation/de-escalation edge cases — is unchanged and still applies.

---

## 3. Quick Summary

**Open Items:** 2 open (0 High / 0 Medium / 2 Low) — see Section 14

---

## 4. Acceptance Criteria

- [ ] `skills/decision-brief/SKILL.md` exists with valid frontmatter and all five required body sections
- [ ] `skills/decision-brief/reference/template.md` exists with exactly the five Tier B sections (Metadata, Problem, Decision, Rationale, Impact) — no Options-Explored ceremony
- [ ] Template carries the same `Tier`/`Domain`/`Tags` metadata field set as chunk 002's `decision-record` template, with `Tier` fixed at `B`
- [ ] **(Removed, rev 6)** ~~`SKILL.md` documents the `docs/decisions/index.json` update as a required Step~~ — this skill has no index-update step
- [ ] `SKILL.md` documents the Tier B abbreviated `plan-lifecycle` cadence (Draft → one human confirmation → Approved) inline, without weakening the human-approval gate
- [ ] ID/storage scheme matches AIF-META-001's Design section exactly
- [ ] No `WebSearch`/`WebFetch` reference anywhere in the new skill's content
- [ ] Escalation paths (up to Tier A, down to Tier C) are documented as Edge Cases, not silently absorbed
- [ ] Field-naming/order consistency with chunk 002's `decision-record` template is verified directly (Section 7, Key Design Decision 2) rather than merely flagged for later
- [ ] No mention of an index-update step/output/edge-case remains in `SKILL.md` (Test 003-T09)
- [ ] Security checklist (Section 10) fully satisfied
- [ ] Logging/Work-Log checklist (Section 11) fully satisfied, including the explicit non-ownership statement for `decision_authored`
- [ ] Documentation checklist (Section 13) fully satisfied
- [ ] Review approved with no CRITICAL or HIGH findings
- [ ] This Chunk Plan itself is committed with `Status: Draft` via `ai-git` before being presented for human approval, per `skill/plan-lifecycle`

---

## 5. Scope

### In Scope

- New skill folder `skills/decision-brief/`:
  - `skills/decision-brief/SKILL.md` — full five-section skill definition (Purpose, Inputs, Steps, Outputs, Edge Cases) per `skill/skill-authoring`'s schema.
  - `skills/decision-brief/reference/template.md` — the slim Tier B skeleton (Metadata, Problem, Decision, Rationale, Impact — explicitly no Options-Explored section).
- `Tier`/`Domain`/`Tags` metadata fields on the template, matching the field set chunk 002's `decision-record` template uses for the fields both skills share (Decision ID, Project, Tier, Domain, Status, Author (Agent), Approved By, Created, Referenced By, References, Tags) — see Section 7, Key Design Decision 2. _(Revision, 2026-08-17: the original chunk flagged this field set as an unresolved cross-chunk coordination risk, since chunk 002 was being planned in parallel with no dependency edge. Both chunks 002 and 003 are being revised together in this same session, so the field set is now directly cross-checked against chunk 002's actual (revised) output rather than inferred from AIF-META-001 alone — see Section 14, Risk 1, updated.)_
- ID and storage scheme, applied exactly as AIF-META-001's Design section specifies: `{ProjectID}-{DomainCode}-{###}` at `{paths.decisions}/{domain-folder}/{ID}_{ShortTitle}.decision.md`.
- Documenting, inside `decision-brief`'s own `SKILL.md`, the Tier B abbreviated `plan-lifecycle` gate (Draft → one human confirmation → Approved, no expected multi-round revision cycle, though one remains available if the human requests changes) — written directly into this skill's own Step text so it is correct and self-sufficient even though chunk 004 (parallel, no dependency)
  is the chunk responsible for documenting this same gate variant inside `skill/plan-lifecycle` itself.

### Out of Scope

- Authoring `skill/decision-triage` (chunk 001) — this chunk assumes `decision-triage` exists as documented in the Epic Plan (dispatches to `decision-brief` once Tier B and Domain are already selected) but does not define or modify it.
- Modifying `skill/decision-record`'s own scoping/Tier-A-only restriction, metadata fields, or per-domain guidance stubs — that is chunk 002.
- Modifying `skill/plan-lifecycle`, `reference/commit-gate-procedure.md`, or `reference/status-vocabulary.md` to document the Tier B/C variants at the `plan-lifecycle` level — that is chunk 004. This chunk only needs its own `SKILL.md` to correctly describe the Tier B cadence it follows; it does not own or edit `plan-lifecycle`'s files.
- Modifying `skills/chunk-planning/reference/template.md` or `skills/epic-planning/reference/template.md` for the Tier C inline-recording convention — that is chunk 005 and does not involve Tier B at all.
- `agents/engineering-manager.yaml` / `skill/chunk-orchestration`'s Decision Hand-off Sub-Flow — chunk 006. This chunk does not reference or depend on orchestration-specific dispatch behavior; `decision-brief` is invocable by any domain-owning agent directly, with or without orchestration in the loop.
- `skill/knowledge-authoring` Step 2 update — chunk 007. Per AIF-META-001's Domain table, only Architecture and AI-component decisions are proactively loaded via `knowledge/index.json` — most Tier B decisions from other domains will not be. This chunk does not add any `knowledge/index.json` integration.
- `.aiconfig.json` `paths.decisions` entry — chunk 008. This chunk references `{paths.decisions}` as a placeholder resolved elsewhere (falls back to `docs/decisions/` per existing convention if unset), consistent with how `skill/decision-record`'s existing `SKILL.md` already references `{paths.decisions}` today.
- Migration of any existing AIF-001–AIF-011 records (chunks 009–013) — no existing record is Tier B; migrated records are Tier A per the Epic's migration table.
- **(Revised, rev 6)** Creating, backfilling, or generating `docs/decisions/index.json`, or any `aif index -d` CLI/tooling code — that is chunk 014 (tool) and chunk 015 (backfill run). `decision-brief` has no runtime relationship to index generation beyond keeping its own metadata table accurate; this chunk does not need to reason about index-file existence/sequencing at all (the original chunk's sequencing risk about this, Section 14 Risk 2, is removed as a result).
- Creating any of the seven `{paths.decisions}/{domain}/` subfolders. This chunk writes no actual decision-brief instance (only the skill and its template), so no folder needs to exist yet as a result of this chunk's own work. Folder creation happens naturally the first time any agent (via `decision-record` or `decision-brief`) writes an actual record into a domain that doesn't yet have a folder — not gated to any single chunk.
- Any change to `plan-lifecycle`'s core Draft → Approved mechanics — explicitly out of scope for the whole Epic (Section 5).
- Any `lib/`, `bin/`, or other runtime-code change — this chunk remains documentation-only (`skills/` markdown), even though the Epic as a whole now includes runtime code (chunk 014).

---

## 6. Prerequisites

- [x] AIF-002 Epic Plan is `Approved` (verified: `docs/plans/epics/AIF-002.epic.md`, Status: Approved (rev 6), Work Log entry 2026-08-17 [Approved])
- [x] AIF-META-001 Decision Record is `Approved` (verified:
      `docs/decisions/meta-process/AIF-META-001_decision-record-tiering-and-domain-ownership.decision.md`, Status: Approved)
- [x] Existing `skills/decision-record/SKILL.md` and `skills/decision-record/reference/template.md` (as revised by chunk 002, AIF-002-002) read in full, as the closest structural precedent for a decision-producing skill
- [x] `skills/skill-authoring/SKILL.md` and `reference/schema.md` read in full, for the general skill-folder/frontmatter/five-section schema this new skill must satisfy
- [x] `skills/plan-lifecycle/SKILL.md` and its two `reference/` files read in full, to describe the Tier B cadence accurately even though chunk 004 (not this chunk) is the chunk that documents it inside `plan-lifecycle` itself
- [x] No dependency chunks — this chunk has `depends_on: []` in `chunks.json`; chunk 002's revised Metadata table (Section 8/7 of AIF-002-002) is used directly as the field-set reference for this chunk's own template, since both are being revised in the same session (rev 6) rather than planned fully independently

---

## 7. Architecture & Design

### Project Structure Changes

- `skills/decision-brief/SKILL.md` ← NEW
- `skills/decision-brief/reference/template.md` ← NEW
- No `assets/` or `scripts/` subfolder in _this skill_ — writing a Decision Brief (the judgment calls of Problem/Decision/Rationale/Impact) is a judgment-driven authoring task with no deterministic transform to script. **(Corrected, rev 6, 2026-08-17):** the original chunk additionally justified this by folding the index-update step into "judgment-driven... not a mechanical transform" — that reasoning no longer applies and has been removed, since index maintenance is not this skill's job at all (see Key Design Decision 5, revised). The absence of a `scripts/` folder here is now justified solely by the authoring task itself, consistent with how `skill/decision-record` also has no `scripts/` folder.

### Key Design Decisions

1. **Decision**: Follow the Tier table in AIF-META-001's Design section verbatim for the slim skeleton's five sections (Metadata, Problem, Decision, Rationale, Impact) — no `## Options Explored` section, no `## Design` section, no `## Constraints & Requirements` section, and no `## Resolved Items`/`## Open Items` closing section.
   **Rationale**: AIF-META-001 explicitly enumerates exactly these five sections for Tier B ("Metadata, Problem, Decision, Rationale, Impact. No Options-Explored ceremony"). Adding any of `decision-record`'s other sections back in (even in optional/abbreviated form) would blur the Tier A/B distinction the whole Epic exists to introduce. If a future decision needs a `Resolved Items`/`Open Items` table, that is itself a signal the decision may not actually be Tier B — handled by the "escalate to Tier A" edge case in Section 8, not by quietly widening the Tier B template.
2. **Decision**: Metadata table field set mirrors chunk 002's `decision-record` template exactly for the fields both skills share — `Decision ID`, `Project`, `Tier`, `Domain`, `Status`, `Author (Agent)`, `Approved By`, `Created`, `Referenced By`, `References`, `Tags` (with `Tier` fixed at `B` here) — rather than inventing a different field order/set independently.
   **Rationale (revised, rev 6)**: The original chunk mirrored AIF-META-001's own example record by best judgment, since chunk 002 was being planned in parallel with no dependency edge (flagged as Risk 1). Both chunks are now being revised together in the same session, so this chunk uses chunk 002's actual field set directly — including the `References` field (needed so `aif index -d`, chunk 014, has outbound-citation data to read for Tier B records too) and the new `Tags` field (rev 6, Open Question 6). This removes the original cross-chunk coordination risk rather than merely flagging it for later verification.
3. **Decision**: `Author (Agent)` in the template is a placeholder (`{Domain-owning agent}`), not hardcoded to a single agent name.
   **Rationale**: Unlike `skill/decision-record`'s current template (which hardcodes `Architect` in the example row — a pre-existing artifact of Architect being the historical default author before this Epic), Tier B decisions are explicitly multi-domain and multi-author per AIF-META-001's Domain ownership table (Architect, Engineering-Manager, Tech-Lead, AI-Engineer, Principal-Engineer, Test-Engineer, or a generic/catch-all agent for Meta-process). Hardcoding one agent name in a brand-new template would misrepresent the model this Epic introduces.
4. **Decision**: The Tier B abbreviated gate description is written directly into `decision-brief`'s own `SKILL.md` Step, rather than only referencing `skill/plan-lifecycle` by name and assuming the reader already knows the variant.
   **Rationale**: Chunk 004 (parallel, no dependency edge) is the chunk that adds the Tier B/C variant documentation to `plan-lifecycle` itself. Since this chunk cannot depend on chunk 004 landing first (both are Wave 1, no ordering guarantee), `decision-brief`'s own `SKILL.md` must describe the abbreviated cadence (Draft → one human confirmation → Approved, no expected multi-round revision cycle) inline, so the skill is correct and usable immediately even if chunk 004 hasn't merged yet.
5. **Decision (rev 6, 2026-08-17 — supersedes the original chunk's Key Design Decision 5)**: This skill has **no index-update step**. `docs/decisions/index.json` is generated, not hand-edited — `aif index -d` (chunk 014) crawls every Tier A/B record's metadata table (Tier A and Tier B alike) and (re)builds the whole index, computing `referenced_by`/`superseded_by` by inversion across the corpus.
   **Rationale**: Identical reasoning to chunk 002's Key Design Decision 5 (AIF-002-002, revised) — AIF-002 Epic Plan rev 5/6 corrected the original design after review found index-field derivation is mostly mechanical, not judgment-driven, and that hand-maintaining `referenced_by` is less reliable than computing it by inversion. This chunk's only remaining obligation toward the index is keeping the metadata table (Section 8/7) accurate. This also **removes** the original chunk's sequencing risk (Section 14, old Risk 2) about invoking `decision-brief` before `docs/decisions/index.json` exists — that concern no longer applies, since this skill never touches the index file at all, regardless of whether it exists yet.
   **Removed as a result**: the "Update the Cross-Domain Index" Step, the index-entry line in `Outputs`, the index-missing/malformed `Edge Case`, and the corresponding Security/Logging checklist items about failing loudly on a missing index file.

### Patterns & Conventions Applied

- Skill folder structure and five required `SKILL.md` body sections (Purpose/Inputs/Steps/Outputs/Edge Cases) per `skill/skill-authoring`.
- Frontmatter shape (`name`/`version`/`description`) per `skill/skill-authoring/reference/schema.md` — `name: "decision-brief"`, kebab-case, matches folder name; `version: "0.1.0"` (new skill, matches the `0.1.0` starting point already used by `decision-record` and other recently-created skills in this repo's git history); one-sentence `description`.
- Commit-gate delegation pattern already used by `skill/decision-record` ("Follow `skill/plan-lifecycle`... do not treat the record as authoritative until the human's decision... is committed") — reused verbatim in spirit, with the Tier B cadence spelled out per Key Design Decision 4 above.

---

## 8. Components

### decision-brief SKILL.md

**File**: `skills/decision-brief/SKILL.md`
**Purpose**: Defines the full procedure for producing a Tier B Decision Brief:
confirm the tier fits, write the slim record, follow the abbreviated commit-gate.

**Full section content specification:**

_Frontmatter:_

```yaml
---
name: 'decision-brief'
version: '0.1.0'
description: "Produces a slim Tier B Decision Brief for structural decisions that don't need full options-exploration ceremony."
---
```

_Purpose section:_ Captures a Tier B ("Structural") decision — one with a plausible future cross-plan citation, per AIF-META-001's promotion threshold, but not a multi-option architectural trade-off — without the full options-exploration ceremony of `skill/decision-record`. Produces a durable record, discoverable via `docs/decisions/index.json` once `aif index -d` (AIF-002-014) next regenerates it, lighter than a Tier A Decision Record but heavier than a Tier C inline note. Normally invoked by `skill/decision-triage` once it has already selected Tier B and determined Domain; may also be invoked directly by an agent that already knows a decision is Tier B (see Edge Cases).

_Inputs section:_

- **Problem statement** — what question this decision answers
- **The decision already made** — Tier B skips options-exploration; the brief documents what was decided and why, not a menu of alternatives to evaluate
- **Domain** — one of Architecture, Process, Planning, AI-component, Quality, Testing, Meta-process, per AIF-META-001's ownership table (determines both the folder/ID prefix and, normally, the authoring agent)
- **Project context** — existing stack, standards, relevant repo patterns needed to state the Rationale/Impact accurately

_Steps section:_

- Step 1 — Confirm Tier B Fits: sanity-check against AIF-META-001's promotion threshold before writing. If a genuine multi-option trade-off with lasting cross-component impact is discovered, stop and escalate to `skill/decision-record` (Tier A) instead of force-fitting the slim skeleton.
  If actually no plausible second citation exists, escalate down to the Tier C inline convention instead (`skill/chunk-planning`/`skill/epic-planning`) — do not write a standalone file for a decision that doesn't need one.
- Step 2 — Write the Decision Brief: write the record using the template at `skills/decision-brief/reference/template.md`. Exactly five sections — Metadata (including `Tier: B`, `Domain`, and `Tags` if applicable), Problem, Decision, Rationale, Impact. No Options Explored, Design, or Constraints & Requirements sections. Ensure the Metadata table is complete and accurate — this is the sole source `aif index -d` (AIF-002-014) reads when it later builds `docs/decisions/index.json`.
- Step 3 — Follow the Abbreviated Commit-Gate Procedure: commit the Brief with `Status: Draft` via `ai-git`, present it to the human for confirmation. On confirmation, update `Status: Approved` and the approver field, and commit that as its own commit — a lighter, expected one-shot cycle (Draft → confirm → Approved) rather than `decision-record`'s full multi-round options-exploration review, though a revision round remains available and should be followed exactly like `skill/plan-lifecycle`'s standard Step 3 if the human requests changes instead of confirming outright.

_Outputs section:_

- **Decision Brief** — markdown file following the template format
- **Location:** `{paths.decisions}/{domain-folder}/{ProjectID}-{DomainCode}-{###}_{ShortTitle}.decision.md` (from `.aiconfig.json`; falls back to `docs/decisions/` if `paths.decisions` is unset, consistent with `skill/decision-record`'s existing fallback convention)
- **Note:** `{paths.decisions}/index.json` is not produced by this skill. It is a
  generated artifact, rebuilt by running `aif index -d` (see AIF-002-014),
  which reads every record's Metadata table directly (Tier A and Tier B
  alike) — this skill's only obligation toward the index is keeping that
  table accurate.

_Edge Cases section:_

- **Decision turns out to need Options-Explored ceremony mid-write** — stop, do not force the slim skeleton; escalate to `skill/decision-record` (Tier A)
  instead.
- **Decision turns out not to need independent discoverability at all** — stop, do not create a standalone file; point back to the Tier C inline-recording convention instead.
- **Invoked directly, without going through `skill/decision-triage` first** — the invoking agent must still determine Domain per AIF-META-001's ownership table before writing; do not default to a Domain arbitrarily.
- **Domain is genuinely ambiguous** — select the closest matching domain, note the ambiguity in the Impact section rather than blocking; if it materially affects who should author the record, raise it to the human (global Rule 2).
- **Human disagrees with the drafted content during confirmation** — update the Brief with their input and continue the (unexpected but not prohibited)
  revision round per `skill/plan-lifecycle` Step 3, same as Tier A.

**Key Behaviour:**

- No Options-Explored, Design, or Constraints & Requirements sections are ever produced by this skill — that is the structural line between Tier A and Tier B.
- **(Removed, rev 6)** The former "index-update step is never skipped" behaviour note no longer applies — this skill has no index-update step at all.

**Dependencies:**

- `skill/plan-lifecycle` — governs the commit-gate; this skill's Step 3 describes the Tier B cadence inline (Key Design Decision 4) rather than assuming chunk 004's documentation of it already exists.
- `skill/decision-triage` (chunk 001) — the normal caller; not a hard dependency for this chunk's own file content, since `decision-brief` must also work correctly if invoked directly (Edge Cases).
- AIF-META-001 — source of the Tier/Domain definitions, promotion threshold, and ID/storage scheme referenced throughout.

### decision-brief reference/template.md

**File**: `skills/decision-brief/reference/template.md`
**Purpose**: The slim Tier B skeleton document agents fill in when writing a Decision Brief.

**Full template content specification:**

```markdown
# Decision Brief: {Short Title}

## Metadata

| Field          | Value                                                                                 |
| -------------- | ------------------------------------------------------------------------------------- |
| Decision ID    | {ProjectID}-{DomainCode}-{###}                                                        |
| Project        | {Project name}                                                                        |
| Tier           | B                                                                                     |
| Domain         | {architecture / process / planning / ai-component / quality / testing / meta-process} |
| Status         | Draft / Approved / Done / Deferred / Superseded                                       |
| Author (Agent) | {Domain-owning agent}                                                                 |
| Approved By    | {human name or "Pending"}                                                             |
| Created        | {YYYY-MM-DD HH:mm}                                                                    |
| Referenced By  | {Decision ID(s) that cite this decision, or "—"}                                      |
| References     | {Decision ID(s) this decision cites, or "—"}                                          |
| Tags           | {comma-separated free-text tags for discovery, or "—"}                                |

---

## Problem

{One to three sentences. What question does this decision answer?}

---

## Decision

**Chosen approach**: {What was decided.}

---

## Rationale

{Two to four sentences: why this was decided, grounded in the constraints or
context that mattered. Tier B does not require an Options Explored section —
if you find yourself needing to weigh 2+ genuinely distinct alternatives with
lasting cross-component impact, this decision may actually be Tier A; escalate
to `skill/decision-record` instead of listing alternatives here.}

---

## Impact

{What this decision affects: components/plans that must reflect it, anything
explicitly ruled out, and any domain ambiguity noted per the Edge Cases in
`skill/decision-brief`'s SKILL.md.}
```

**Key Behaviour:**

- Exactly five sections, in this order: Metadata, Problem, Decision, Rationale, Impact. No sixth section is added by this template.
- `Tier` is fixed at `B` in the template (not a placeholder) — a Decision Brief is, by construction, always Tier B; if it needs to be Tier A, the correct action is to use `skill/decision-record` instead of relabeling.
- `Tags` (rev 6, new) matches chunk 002's `decision-record` template exactly: free-text, comma-separated, no controlled vocabulary, author's judgment. `aif index -d` (chunk 014) splits it into `index.json`'s `tags` array the same way for both Tier A and Tier B records.

**Dependencies:**

- AIF-META-001's Design section (ID/storage scheme).
- Chunk 002's `decision-record` template (AIF-002-002) — for the exact shared field set/order (Section 7, Key Design Decision 2).

---

## 9. Data Models

### `docs/decisions/index.json` entry (referenced, not modified or produced by this chunk)

**Purpose**: The schema `aif index -d` (chunk 014) produces for a Tier B Decision Brief once it crawls this skill's output. Fully specified by AIF-META-001's Design section and AIF-002 Epic Plan rev 6; this chunk does not define, own, produce, or modify this schema or any index-generation code — it only ensures its own template's Metadata table (Section 8) carries the data the generator needs.

| Field                          | Type   | Notes                                                                                                       |
| ------------------------------ | ------ | ----------------------------------------------------------------------------------------------------------- |
| `id`                           | string | `{ProjectID}-{DomainCode}-{###}`                                                                            |
| `tier`                         | string | `"B"` for every entry derived from this skill's output                                                      |
| `domain`                       | string | lowercase domain name, e.g.`"process"`                                                                      |
| `title`                        | string | matches the`# Decision Brief: {Short Title}` heading                                                        |
| `status`                       | string | `Draft`/`Approved`/`Done`/`Deferred`/`Superseded`                                                           |
| `path`                         | string | repo-relative path to the`.decision.md` file                                                                |
| `supersedes` / `superseded_by` | array  | Decision IDs, if any                                                                                        |
| `references`                   | array  | parsed from this record's own`References` field                                                             |
| `referenced_by`                | array  | computed by`aif index -d` via inversion across the whole corpus — not something this record's author writes |
| `tags`                         | array  | parsed from this record's own`Tags` field                                                                   |

---

## 10. Security Requirements

> This section must never be empty.

- [ ] No new attack surface — this chunk creates only markdown documentation inside `skills/decision-brief/`; it introduces no code execution paths, no credential handling, and no network-facing behavior (consistent with Epic Plan Section 8, first bullet).
- [ ] No secrets or credentials in the skill or template content — the added text references only public artifact paths (`{paths.decisions}/index.json`, `{paths.decisions}`) and skill/decision names, nothing environment- or credential-specific.
- [ ] This chunk grants no `WebSearch`/`WebFetch` capability to any agent and does not reference such a grant anywhere in the new skill's content — a direct carry-forward of AIF-META-001's non-negotiable ("no domain owner is granted `WebSearch`/`WebFetch` solely to support decision-authoring")
      and of Epic Plan Section 8, second bullet. `decision-brief` is a pure-authoring skill; it does not itself invoke any tool.
- [ ] The Tier B abbreviated gate is documented in a way that does not weaken the human-approval requirement — "abbreviated" refers only to the expected number of revision rounds (one-shot vs. multi-round), never to skipping human confirmation itself.
- [ ] **(Revised, rev 6)** `docs/decisions/index.json` data-integrity handling (missing/malformed file) is **not** this chunk's responsibility — that error path belongs entirely to `aif index -d`'s own implementation (chunk 014). Verified this chunk's `SKILL.md` does not claim to own or handle that failure mode.
- [ ] Errors/ambiguity surfaced to a human via this skill's Edge Cases (domain ambiguity, tier mismatch) contain no internal system details beyond what is already documented elsewhere in this repo (verified as N/A in practice for a docs-only skill).

---

## 11. Logging Requirements

> This section must never be empty.

This chunk produces static documentation content with no runtime component — `skills/decision-brief/` is read by agents as reference material and followed as a procedure, not executed as code, so there are no application log statements for this chunk itself to define. Two distinct "logging" concerns apply instead, and both are addressed below rather than left unaddressed:

1. **This chunk's own plan-level Work Log entries** (per `steering/engineering/core.md` Rule 2/Rule 9 and `skill/plan-lifecycle` Steps 1-4 commit requirements) — the only logging genuinely owned by this chunk.
2. **Runtime log actions for `decision-brief` invocations during orchestrated execution** (`decision_authored`, per chunk 006's Decision Hand-off Sub-Flow) — explicitly **not** owned by this chunk. `decision-brief` itself performs no orchestration-state logging; when Engineering-Manager dispatches or invokes `decision-brief` mid-chunk-orchestration, chunk 006's Decision Hand-off Sub-Flow (in `skill/chunk-orchestration`, not in this skill) is responsible for emitting `decision_handoff_detected`/`decision_authored`/`decision_handoff_resolved` to `orchestration-state.json`. This is called out explicitly here so responsibility for that log action is not silently assumed by both chunks or by neither.

| Event                                                                                                   | Level (Work Log Action)                                         | What is logged                                           | What is NOT logged                                                   |
| ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------- |
| Plan drafted/revised                                                                                    | `[Created]`/`[Revised]`                                         | Plan ID, agent, tier assessed, summary of scope/change   | No content of unrelated chunks/plans                                 |
| Plan approved/deferred                                                                                  | `[Approved]`/`[Deferred]`                                       | Human decision, approver name if approved                | Nothing beyond the decision itself                                   |
| Implementation commits (future, post-approval)                                                          | `[Implemented]` (one per Component in Section 8)                | Files touched, brief description referencing AIF-002-003 | No secrets; N/A here since no secrets exist in this chunk            |
| Orchestration-level`decision_authored` (future, if `decision-brief` is invoked mid-chunk-orchestration) | Owned by chunk 006's Decision Hand-off Sub-Flow, not this chunk | (see chunk 006 Chunk Plan)                               | This chunk's`SKILL.md` must not claim to emit this log action itself |

---

## 12. Testing Plan

This chunk has no executable code, so "tests" are documentation-validation checks performed during self-validation (Section 4) rather than automated unit tests. No automated schema validation currently exists in `tests/validation/` for skill folder structure (confirmed by inspection of `tests/validation/schemas.test.js`, which validates agent/server definitions only) — self-validation against `skill/skill-authoring`'s checklist is the correct and sufficient verification method for this chunk.

### decision-brief Documentation Tests

| Test ID                           | Description                                                                                                                                                                                                                                  | Type                                                                    | Pass Criteria                                                                                                                                        |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 003-T01                           | `SKILL.md` frontmatter has `name`/`version`/`description`; `name` is kebab-case and matches folder name (`decision-brief`); `version` is valid semver                                                                                        | Manual/self-validate against`skill/skill-authoring/reference/schema.md` | All three fields present and well-formed                                                                                                             |
| 003-T02                           | `SKILL.md` has all five required body sections in order: Purpose, Inputs, Steps, Outputs, Edge Cases                                                                                                                                         | Manual review                                                           | All five present, correctly ordered                                                                                                                  |
| 003-T03                           | `reference/template.md` has exactly five sections (Metadata, Problem, Decision, Rationale, Impact) and no Options Explored/Design/Constraints & Requirements/Resolved-Open-Items section                                                     | Manual diff against AIF-META-001's Tier B row                           | Matches exactly                                                                                                                                      |
| 003-T04                           | Template's Metadata table field set matches chunk 002's`decision-record` template's field set exactly, for shared fields (Decision ID, Project, Tier, Domain, Status, Author (Agent), Approved By, Created, Referenced By, References, Tags) | Manual cross-check against AIF-002-002 §6/§7                            | Field names/order match                                                                                                                              |
| 003-T05                           | `Tier` field in the template is fixed at `B`, not a placeholder                                                                                                                                                                              | Manual review                                                           | Literal`B`, no `{...}`                                                                                                                               |
| 003-T06                           | ID/path scheme in`SKILL.md` Outputs matches AIF-META-001's Design section exactly (`{ProjectID}-{DomainCode}-{###}` at `{paths.decisions}/{domain-folder}/{ID}_{ShortTitle}.decision.md`)                                                    | Manual cross-check                                                      | Matches verbatim                                                                                                                                     |
| 003-T07                           | `SKILL.md` does not grant or reference `WebSearch`/`WebFetch` anywhere                                                                                                                                                                       | Grep-based self-validation                                              | Zero matches                                                                                                                                         |
| 003-T08                           | `SKILL.md` Edge Cases correctly describe escalation to Tier A (`decision-record`) and de-escalation to Tier C (inline convention), not silent absorption into the Tier B template                                                            | Manual review                                                           | Both escalation paths present                                                                                                                        |
| 003-T09 (rev 6, replaces old T09) | `SKILL.md` contains no "Update the Cross-Domain Index" step and no index-update Output/Edge-Case content                                                                                                                                     | Manual/self-validate                                                    | Grep for "index.json" returns only the informational Outputs note pointing to`aif index -d`, no step/edge-case instructing this skill to write to it |

---

## 13. Documentation Requirements

- [ ] Inline documentation on all sections (clear headers, no orphaned prose) — applies to markdown structure since there is no code
- [ ] File headers — not applicable in the source-code sense; `SKILL.md` uses YAML frontmatter as its structured header (name/version/description), consistent with every other skill in this repo; `reference/template.md` has no header convention, matching `skill/decision-record`'s existing `reference/template.md`. Traceability to this Chunk Plan (AIF-002-003)
      is carried via commit messages, consistent with this repo's established practice (no existing skill file embeds an in-body Plan ID reference; confirmed by inspection of `skills/decision-record/SKILL.md` and recent skill-authoring commits in git history).
- [ ] README updated if user-facing — not applicable; no README exists for skills beyond their own `SKILL.md`
- [ ] CHANGELOG entry written — deferred to the Epic-level decision (Epic Acceptance Criteria: "Epic-level CHANGELOG entry written (if this repo maintains one — confirm at implementation time)"); this chunk does not add a chunk-level CHANGELOG entry unilaterally. Confirmed by inspection:
      no top-level `CHANGELOG.md` currently exists in this repo.

---

## 14. Risks & Open Questions

| #   | Risk / Question                                                                                                                                                                                                                                                                                                                                     | Impact | Mitigation                                                                                                                                                                                                |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **(Revised, rev 6 — was a coordination risk, now resolved)** This chunk's Metadata field set for `decision-brief`'s template is cross-checked directly against chunk 002's (revised) `decision-record` template, since both are being revised together in this session.                                                                             | —      | Resolved: field set matches chunk 002's exactly for shared fields (Section 7, Key Design Decision 2; Test 003-T04). No remaining action for the human reviewer beyond the normal chunk-plan review.       |
| 2   | **(Removed, rev 6)** ~~`decision-brief` documents an index-update step that would fail before chunk 014/015 land~~ — no longer applies; this skill has no index-update step at all, regardless of `docs/decisions/index.json`'s existence.                                                                                                          | —      | N/A                                                                                                                                                                                                       |
| 3   | This chunk's own`SKILL.md` inlines the Tier B abbreviated-gate description (Key Design Decision 4) rather than solely referencing `skill/plan-lifecycle`, to stay correct regardless of chunk 004's landing order. If chunk 004's eventual wording in `plan-lifecycle` differs materially from this chunk's inline description, the two could drift | L      | Both describe the same AIF-META-001 Design section Tier table content, so drift risk is low by construction. Flagged for review to cross-check once both chunks 003 and 004 are implemented.              |
| 4   | Domain subfolder creation (`{paths.decisions}/{domain}/`) is not assigned to any single chunk in `chunks.json`; this chunk explicitly defers it (Out of Scope) since it writes no actual decision instance                                                                                                                                          | L      | No action needed by this chunk. Folders are created naturally by whichever chunk/agent first writes an actual record into a domain lacking one — consistent with git's own lack of empty-folder tracking. |

---

## 15. Work Log

[2026-08-14 00:00] [AI-Engineer] [Created] [AIF-002-003] [Self-planned Chunk 003 of Epic AIF-002 per Tech-Lead's decomposition (`chunks.json`). Read Epic Plan Sections 5/4/5/8, AIF-META-001 in full, `skill/decision-record` (SKILL.md + template.md), `skill/skill-authoring` (SKILL.md + schema.md), `skill/plan-lifecycle` (SKILL.md + both reference files), `skill/chunk-planning` (SKILL.md + template.md), and chunk 004's already-drafted Chunk Plan as a format/style precedent. Assessed Tier 2 (Standard) per `skill/complexity-tiers`: new skill following an already-established structural pattern (`skill/decision-record`), multi-file change (SKILL.md + reference/template.md), no schema changes to shared infrastructure. Drafted full Chunk Plan following `skills/chunk-planning/reference/template.md`. Flagged an explicit open coordination point (Risk 1): Tier/Domain metadata field-naming was chosen by best judgment mirroring AIF-META-001's own example record, since chunk 002 has no dependency edge to this chunk and is being planned/implemented in parallel — needs human-reviewer verification for consistency once both chunks land. Saving as Status: Draft per `skill/plan-lifecycle` before presenting for human approval. No implementation performed.]
[2026-08-17 00:00] [Tech-Lead] [Revised] [AIF-002-003] [Revised per AIF-002 Epic Plan rev 6 (Approved 2026-08-17): removed the "Update the Cross-Domain Index" Step 3, the index-entry line in Outputs, and the index-missing/malformed Edge Case — `docs/decisions/index.json` is now a generated artifact built by `aif index -d` (new chunk 014), not something this skill writes to. Corrected Section 7's Project Structure Changes note, which had justified the absence of a `scripts/` folder partly by calling the index-update step "judgment-driven... not a mechanical transform" — that reasoning was wrong even under the original design (extracting structured fields into an index entry is largely mechanical) and is now moot regardless, since this skill has no index-update step at all; the note now cites only the genuinely judgment-driven authoring task as justification. Added `Tags` as an eleventh Metadata table field (rev 6, Open Question 6), matching chunk 002 exactly. Resolved the original Risk 1 (field-set coordination with chunk 002) directly, since both chunks are being revised together in this session — the field set now matches chunk 002's revised template exactly rather than being independently inferred from AIF-META-001. Removed the original Risk 2 (index-doesn't-exist-yet sequencing concern), since it no longer applies. Updated Section 5 (In/Out of Scope), Section 7 (Key Design Decisions 2 and 5 rewritten), Section 8 (Step 3 removed, Outputs/Edge Cases/Key Behaviour rewritten), Section 9 (Data Model table reframed as "not produced by this chunk," Tags row added), Section 10 (index-integrity checklist item rewritten to state non-ownership), Section 12 (Test 003-T09 replaced), Section 4 (Acceptance Criteria updated), Section 14 (Risks 1 and 2 resolved/removed). No change to the five-section Tier B skeleton, the abbreviated gate, or the escalation/de-escalation edge cases — all still apply as originally drafted. Still `Status: Draft`, not yet re-presented for human review.]
[2026-08-16 11:18] [Jeremy] [Approved] [AIF-002-003] [Reviewed and approved manually by Jeremy. Status set to `Approved`, `Reviewed By: Jeremy`, committed as part of "Approved AIF-002 chunk plan 01 to 04" (commit `bbd6a1e`). This Work Log entry added retroactively by Engineering-Manager on 2026-08-17 to close a traceability gap — the original approval commit updated the Metadata table but did not append a corresponding Work Log entry, per engineering steering Rule 3 (logging requirements are never optional).]
[2026-08-18] [AI-Engineer] [Revised] [AIF-002-003] [Migrated this Chunk Plan to the reordered template structure approved for skill/chunk-planning: Quick Summary (new Section 3, open-item count derived from the existing Risks & Open Questions table) and Acceptance Criteria (moved from Section 12 to Section 4) now sit immediately after the Goal; all other sections renumbered accordingly (mapping: 3->5, 4->6, 5->7, 6->8, 7->9, 8->10, 9->11, 10->12, 11->13, 13->14, 14->15). Every inline "Section N" cross-reference in this file, including references into the AIF-002 Epic Plan's own renumbered sections, was remapped to match. No wording, decisions, criteria, or risk content was changed - purely structural, per human direction (no active work on these plans at the time of migration).]
[2026-08-18] [AI-Engineer] [Implemented] [AIF-002-003] [Implemented this Approved Chunk Plan in isolated worktree `AIF-002/003-decision-brief` on branch `AIF-002/003-decision-brief`. Created `skills/decision-brief/SKILL.md` and `skills/decision-brief/reference/template.md` exactly per Section 8's content specification: five-section Tier B skeleton (Metadata, Problem, Decision, Rationale, Impact), `Tier` fixed literal `B`, Metadata field set cross-checked directly against chunk 002's (AIF-002-002) Approved plan text (Decision ID, Project, Tier, Domain, Status, Author (Agent), Approved By, Created, Referenced By, References, Tags — field-for-field match), no index-update step/Output/Edge-Case content, Tier A/Tier C escalation paths documented as Edge Cases, Tier B abbreviated plan-lifecycle cadence documented inline in Step 3. No `assets/` or `scripts/` subfolder created, per Section 7. Self-validated: frontmatter well-formed (name/version/description present, kebab-case name matches folder), all five SKILL.md body sections present in order, all five template.md sections present in order with no sixth section, grep confirms zero `WebSearch`/`WebFetch` matches, grep confirms the three `index.json` mentions are all informational (Purpose, Step 2 note, Outputs note) with no step/edge-case instructing this skill to write to the index (Test 003-T09 pass), `npm test` run from repo root: 489/489 passing, 0 failures. Acceptance Criteria in Section 4 verified against produced files but left unchecked in this plan document per tool-permission constraints encountered during this session (edits to Section 4's checkboxes were denied) — verification results are recorded here in the Work Log instead. Review approved with no CRITICAL/HIGH findings remains open, pending Principal-Engineer review. Test-Engineer skipped per Decision Record AIF-005 (Approved, AI-track chunk). Branch pushed to origin for review.]
