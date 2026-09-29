---
name: 'code-review'
version: '0.4.1'
description: 'Reviews completed source code for completeness, security, standards, and correctness; classifies findings via skill/review-severity.'
---

## Purpose

Reviews source code against its governing plan, language standards, and project standards.
Produces a structured report that either approves the code or returns it with actionable findings for correction.

---

## Inputs

- **Source code** — files to review
- **Governing plan** — what was supposed to be built (acceptance criteria, security, logging): the Feature Plan for Task work decomposed from one, a Tier 3 plan for standalone work that rose to Tier 3, or — for standalone Tier 1/2 work, which has no separate plan artifact by default — the task description and any outline produced per `skill/complexity-tiers`, if one exists
- **Language standards** — from `standards/{stack}.md`
- **Project standards** — from `projects/{name}/project-standards.md`

---

## Steps

### Step 1 — Review Completeness

Verify every component in the plan's component list exists. Missing components are CRITICAL findings before any code quality review begins.

### Step 2 — Review Change Scope

- If the diff's author is Architect or Engineering Researcher, confirm every touched path stays within that agent's own documented write scope (`agents/architect.yaml`'s Hard rules, `agents/engineering-researcher.yaml`'s Hard rules). A path outside that scope is a HIGH finding, the same severity class as `skill/ai-component-review`'s `tools`/`approved_tools`/`blocked_commands` rule.
- If the diff adds a file under a directory an arc42 section already describes, confirm that section's building-block table and `key_files` were updated to include it, per `steering/global/knowledge-consumption.md`'s Doc-Update Acceptance Gate. A missing update is a MEDIUM finding.

### Step 3 — Review Security and Logging

Go through security and logging requirements line by line. Each unmet requirement is a finding classified HIGH or CRITICAL.

### Step 4 — Review Standards Compliance

Check naming conventions, file headers, doc comments, async patterns, error handling, and any other rules in the active standards files.

### Step 5 — Review Logic and Correctness

Does the implementation match the plan's described behaviour? Are edge cases handled?
Are interfaces implemented as specified?

### Step 6 — Produce Review Report

Hand the findings gathered in Steps 1-5 to `skill/review-severity` for severity classification, ordering, and
the report itself — this skill defines what to check, not how findings are ranked or rendered.

---

## Outputs

- **Review Report** — produced per `skill/review-severity`
- **Outcome:** Approved or Returned, per `skill/review-severity`

---

## Edge Cases

See `skill/review-severity` for severity/reporting edge cases. Code-review-specific:

- **A missing component overlaps a standards violation** — report the missing-component finding (Step 1);
  don't also flag the standards rules it would have needed to follow.
