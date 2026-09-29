---
name: 'feature-planning'
version: '0.3.2'
description: 'Produces a Feature Plan describing a complete feature at a human-reviewable level, decomposed into Tasks when more than one is needed.'
---

## Purpose

Translates a goal (human request, PRD, or ADR) into a structured Feature
Plan that describes the feature at a level a human can review and give feedback on —
coarse: _what_, not _how_. When the Feature needs more than one Task, also produces
the `tasks.json` decomposition.

Per-Task implementation detail (design, components, test cases) is not this skill's
job. Whether a Task gets a written plan before implementation, and how much detail it
holds, is `skill/complexity-tiers`: "Apply tier selection rules"'s call at dispatch time.

---

## Inputs

- **Goal** — human request, PRD, or ADR describing what to build
- **Project config** — `.aiconfig.json` at project root (for paths, project name/shortname, standards reference)
- **Project standards** — from `projects/{name}/project-standards.md` or path in `.aiconfig.json`
- **Language standards** — from `standards/{stack}.md` (stack identified by `.aiconfig.json` or ask)
- **ADRs** — any relevant prior decisions (check before writing)

---

## Steps

### Step 1 — Read Inputs

Read all available context. If an ADR exists, the Feature must not contradict it.
Identify ambiguities or conflicts to raise as open questions.

### Step 2 — Determine Feature ID

Feature IDs follow the format `{ProjectShortName}-{###}` (e.g. `MYAPP-001`), an ever-incrementing, zero-padded 3-digit number — no date segment.

1. Read `project_shortname` from `.aiconfig.json` (falls back to `project_name` if unset)
2. Scan `{paths.features}/` for existing `{ProjectShortName}-*` Feature folders
3. Take the highest existing `###` and increment by 1 (zero-padded to 3 digits)
4. If no existing features are found, start at `001`

### Step 3 — Write Feature Plan

Follow the template at `skills/feature-planning/reference/template.md`. Key sections:

- Section 3 (Quick Summary) comes right after the Goal — keep its open-item count in sync whenever Section 8 changes
- Section 5 (Feature Description) is the main reviewable content — be thorough
- Section 6 (Architecture Overview) stays high-level — no method signatures
- Section 8 (Risks & Open Questions) captures risks and anything needing human input, merged into one table
- Section 9 (Task Decomposition) is left empty until after approval

### Step 4 — Follow the Commit-Gate Procedure

Follow `skill/plan-lifecycle` to save the plan with `Status: Draft`, commit it, and present it for human approval. Do not decompose into Tasks. Do not proceed until the human's decision (`Approved` or `Deferred`) is committed.

### Step 5 — Decompose into Tasks

Apply the Task-sizing rules below first — a small Feature may be a single Task, or
skip `tasks.json` entirely. When decomposition earns its keep, after approval:

1. Copy the template from `skills/feature-planning/assets/tasks.json` (see
   `reference/tasks-schema.md` for the field shapes)
2. Set `feature_id` to this Feature's ID
3. Identify natural boundaries (data layer, service layer, UI, tests, docs) per the
   Task-sizing rules
4. Define each Task with explicit `depends_on` references
5. Run `dag-validate` against the file

If `dag-validate` fails:

- Read the errors (cycles, missing refs, schema issues)
- Fix the `tasks.json` and re-validate
- Retry up to 3 times
- If still invalid after 3 attempts, stop and escalate to the human with the validation errors

Once valid, update Section 9 of the Feature Plan with a summary (Task count, wave
count, parallelization notes) and a reference to the `tasks.json` file.

**Task-level plans are not produced here.** A Task's own plan — if its complexity
warrants one at all — is written by the agent that implements it, via
`skill/complexity-tiers` at dispatch time. What each tier means, and what it
means for that particular agent, is that skill's to state and not restated here.
This skill's job ends at the dependency graph and each Task's scope summary.

#### Task-sizing rules

- Size by interface/contract boundary — a unit of review (one sitting), not the
  smallest mergeable diff and not a duration estimate.
- Split into multiple Tasks only for real parallelism or a hard dependency boundary —
  not "different files." One Task can span product code and declarative-component
  work alike; never split by artifact type.
- A small Feature may be a single Task, or skip `tasks.json` entirely — decompose only
  when it earns its keep.

---

## Outputs

- **Feature Plan** — markdown file following the template
- **Location:** `{paths.features}/{FeatureID}/plan.md` (from `.aiconfig.json`, default: `plans/features/`)
- **Task Decomposition** — `tasks.json` file (produced after approval, when the Feature has more than one Task; validated by `dag-validate`)
- **Location:** `{paths.features}/{FeatureID}/tasks.json` — sibling to the Feature Plan itself

---

## Edge Cases

- **PRD conflicts with ADR** — raise as a HIGH priority open question. Do not silently resolve.
- **Scope too large to decompose cleanly** — suggest splitting into multiple Features.
- **No Out of Scope items** — the iteration is too large. Find something to defer.
- **DAG validation fails after 3 retries** — stop and escalate to the human. Present the validation errors and the current `tasks.json` state. Do not proceed with an invalid dependency graph.
- **A Task turns out to need work not described in the Feature** — this is the
  implementing agent's discovery, made during its own dispatch, not this skill's. It
  stops and raises the gap as an open question on the parent Feature rather than
  expanding scope; the Feature Plan gets revised and re-approved if the gap is real.
