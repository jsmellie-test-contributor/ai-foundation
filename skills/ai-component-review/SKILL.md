---
name: 'ai-component-review'
version: '0.2.4'
description: 'Reviews an agent, skill, steering, server, or bundle definition against its AGENTS.md schema; classifies findings via skill/review-severity.'
---

## Purpose

Reviews a completed AI-component diff — an agent definition, skill, steering file, server definition, or
bundle definition — against the schema AGENTS.md defines for that component type, this repo's own
conventions, and (when the change implements one) its governing plan or ADR. Gets the same review as
product code, just a different checklist: branch by artifact type the same way `skill/code-review` branches
by language standard.

---

## Inputs

- **Component diff** — the changed file(s) under `agents/`, `skills/`, `steering/`, `servers/`, or `bundles/`
- **Governing schema** — AGENTS.md's entry for that component type
- **Related plan, if any** — the Feature Plan (Task work decomposed from one), a Tier 3 plan (standalone work that rose to Tier 3), or an ADR the change implements — standalone Tier 1/2 work has no separate plan artifact by default

---

## Steps

### Step 1 — Identify artifact type and branch

Determine which component type changed (agent, skill, steering, server, bundle) and apply the matching
checklist below. A diff spanning multiple types gets each type's checklist applied to its own files.

### Step 2 — Review schema conformance

Front-matter fields present and correctly typed; body sections match AGENTS.md's required structure for that
component type exactly. A missing required section or field is a finding before any deeper review begins.

### Step 3 — Review the tool/permission surface (agent definitions only)

Any diff touching `tools`, `approved_tools`, or `blocked_commands` in an agent definition is always
HIGH-or-above severity, never lower — this is what keeps write access to `agents/*.yaml` safe. Check
specifically for:

- A tool re-appearing in `approved_tools` without a justification for why it no longer needs gating
- Any agent gaining `write` + `shell` + (`web_search` or `web_fetch`) together — the lethal-trifecta pattern
  this repo's roster is designed to avoid
- A `blocked_commands` entry removed without an equivalent safeguard replacing it

### Step 4 — Review cross-references

Every `skills`/`tools` entry an agent, bundle, or server definition names actually exists; every Decision
Record ID cited resolves. Treat a broken cross-reference the same as a schema violation — it is a finding,
not a note.

Where the diff cites another skill, agent, or steering file by name, also check it isn't restating that
source's content alongside the citation — `steering/engineering/core.md`: "Cite, Don't Restate".
A citation next to a paraphrase is a finding even though the reference itself resolves cleanly.

### Step 5 — Produce Review Report

Hand the findings gathered in Steps 1-4 to `skill/review-severity` for severity classification, ordering, and
the report itself.

---

## Outputs

- **Review Report** — produced per `skill/review-severity`
- **Outcome:** Approved or Returned, per `skill/review-severity`

---

## Edge Cases

See `skill/review-severity` for severity/reporting edge cases. AI-component-specific:

- **New component type not yet covered by a checklist branch** — treat conservatively: flag structural
  deviations from the closest existing pattern as findings rather than assuming they're fine.
- **Diff spans both product code and an AI-component file in the same change** — apply `skill/code-review` to
  the code and this skill to the component file; combine findings into one Review Report.
- **Only `tools`/`approved_tools`/`blocked_commands` changed, nothing else in the file** — still HIGH-or-above
  per Step 3, even though the rest of the diff is trivial.
