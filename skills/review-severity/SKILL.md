---
name: 'review-severity'
version: '0.1.1'
description: 'Shared severity taxonomy, blocking rule, and report template used by any domain-specific review skill.'
---

## Purpose

Provides the severity classification, ordering, and outcome rules shared by every review skill in this
repository, so each domain-specific skill (e.g. `skill/code-review`, `skill/ai-component-review`) defines only
what it checks, not how findings are ranked or reported. A domain skill gathers findings through its own
steps, then hands them to this skill to classify, order, and render into a Review Report.

Use this skill whenever an agent needs to classify review findings by severity and produce a Review Report —
never redefine the severity table or blocking rule locally.

---

## Inputs

- **Findings** — issues gathered by the invoking skill's own domain-specific steps
- **Subject reference** — the Plan ID, ADR, or diff being reviewed
- **Reviewer** — the agent performing the review

---

## Steps

### Step 1 — Classify each finding

| Severity | Meaning                                                                                    |
| -------- | ------------------------------------------------------------------------------------------ |
| CRITICAL | Security vulnerability, data loss risk, broken builds                                      |
| HIGH     | Security/logging requirement unmet, major standards violation, acceptance criterion missed |
| MEDIUM   | Standards violation not affecting correctness, missing docs                                |
| LOW      | Style inconsistency, minor naming deviation                                                |

A domain skill's own steps may name additional situations that are always HIGH-or-above (e.g.
`skill/ai-component-review`'s rule on `tools`/`approved_tools`/`blocked_commands` diffs) — those are
constraints on which bucket a finding falls into, not a different taxonomy.

### Step 2 — Determine the outcome

Any CRITICAL or HIGH finding blocks approval. Outcome is **Approved** only when zero CRITICAL/HIGH findings
remain; otherwise **Returned**.

### Step 3 — Write each finding to be actionable

Every finding states: what is wrong, what rule or requirement it violates, and what must be done to resolve
it. A finding missing any of the three is not yet ready to report — go back and fill in the gap.

### Step 4 — Order and render the report

Order findings CRITICAL → HIGH → MEDIUM → LOW. Render using the template at
`skills/review-severity/reference/template.md`.

### Step 5 — Never expand scope

A review produces findings against existing requirements only. Never suggest features or scope expansions as
findings — that judgment belongs elsewhere (the human, or whoever owns the plan).

---

## Outputs

- **Review Report** — markdown following the shared template
- **Outcome:** Approved (no CRITICAL/HIGH) or Returned (has CRITICAL/HIGH findings)

---

## Edge Cases

- **No findings at all** — still produce the report with outcome Approved and a brief summary of what was
  reviewed.
- **Finding interacts with another finding** — note the relationship. Fixing one may resolve or change the
  other.
- **A rule conflicts with the plan being reviewed against** — raise it as a finding citing both references.
  Do not silently pick one.
- **Domain skill flags a situation as always HIGH-or-above** — honor that floor even if this skill's own
  table would otherwise classify it lower.
