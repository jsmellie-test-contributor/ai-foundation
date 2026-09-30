# Feature Plan: Remove work logs from Feature Plans

## 1. Metadata

| Field               | Value                                                 |
| ------------------- | ----------------------------------------------------- |
| Feature ID          | AIF-009                                               |
| Project             | ai-foundation                                         |
| Status              | Done                                                  |
| Author (Agent)      | Claude Code session (standalone; no dispatched agent) |
| Reviewed By         | Jeremy S                                              |
| Created             | 2026-09-30                                            |
| Last Updated        | 2026-09-30                                            |
| Standards           | `javascript`, `node` (per `.aiconfig.json`)           |
| Total Tasks         | 2                                                     |
| Product Requirement | None                                                  |
| ADRs                | None                                                  |

---

## 2. Goal

Drop Section 11 "Work Log" from the Feature Plan template and every instruction that tells an agent to write one. Git history already records who did what and when, so the log duplicates it and adds a second place that drifts. The one thing the log carries that git does not cleanly carry, the rationale for minor planning decisions, moves to a home that already exists (Section 8).

> Requirement traceability: N/A. Human request 2026-09-30.

---

## 3. Quick Summary

**Open Items:** 0 open — see Section 8

---

## 4. Scope

### In Scope

- `skills/feature-planning/reference/template.md`: delete Section 11. Move the "minor decisions" convention into Section 8 (see Section 5).
- `agents/software-engineer.yaml`: delete the two "Write Work Log entry" process steps (implementation step 12, correction step 5).
- `agents/engineering-manager.yaml`: reword "Maintain orchestration state and work log" (`work log` → `orchestration log`; see Section 5, "Orchestration log length rules").
- `steering/engineering/core.md`: remove "work log entries" from the Plan ID rule; replace "noted in the work log" in the scope-expansion exception with the commit message.
- `steering/global/core.md`: replace "plan or work log" in the security-waiver exception.
- `skills/feature-planning/SKILL.md`: check for and fix any reference to Section 11 or the log (none found by search; confirm while editing).
- Live Feature Plans `AIF-007` and `AIF-008`: delete Section 11 outright (tracking only, no migration) and fix `AIF-007`'s Metadata row that points at "the Work Log".
- Strict length rules for orchestration `log` entries (see Section 5, "Orchestration log length rules"): owned by `skills/task-orchestration/reference/state-schema.md`; cited, not restated, from `skills/task-orchestration/SKILL.md` and `agents/engineering-manager.yaml` Hard rules.
- `PLAN.md` line 53 ("Work Log system (persistent activity tracking)"): mark dropped, superseded by git history.
- Run `aif validate` and the test suites; confirm no arc42 `key_files` entry is touched (none found by search; re-check).

### Out of Scope

- Removing the orchestration state file's `log` array or changing its action vocabulary. It stays (Section 8, question 1); only its entry length is tightened.
- Historical and completed Feature Plans (`AIF-001` to `AIF-004`, `docs/plans/completed/`), ADR archives, and `docs/process-model.md` history. They describe what was true when written.
- Any tooling that enforces plan section structure: none exists (`lib/` and `tests/` have no reference to plan sections).

---

## 5. Feature Description

### User-Facing Behaviour

New Feature Plans end at Section 10 (Acceptance Criteria). Agents no longer append log lines. To reconstruct a plan's history, read `git log` on the plan file: the Draft, revision, Approved and decomposition commits already required by `skill/plan-lifecycle` are that history.

### Minor planning decisions

The template currently says to record a non-ADR decision inline in a Work Log entry as `Decision: {what}. **Why:** {rationale}.`. Replacement:

- Record the decision as a row in Section 8 (Risks & Open Questions) with Type `Question`, resolved, and the decision plus `**Why:**` in the `Resolved` column. This is what `AIF-007` question 1 already does.
- The commit message for the revision names it.
- The escalation rule stays: if it turns out to be a genuine fork, escalate to Architect for an ADR.

### Orchestration log length rules

The `log` array stays as a terse event trace, nothing more. Proposed limits, written once in `state-schema.md`'s "Log entry object":

- `details` is one line, at most 100 characters.
- Identifiers and facts only: Task ID, PR number, commit SHA, counts, file names. No rationale, no narrative, no "why"; that belongs in the commit message or PR.
- One entry per event in the action vocabulary. No free-form events, no multi-event summaries.
- Entries are append-only as today; the limit applies to new entries.

### Business Rules

- No new Feature Plan section replaces Section 11.
- The Plan ID rule still binds review reports and test results; only "work log entries" leaves its list.
- Implementation progress is reported through commits, the PR description and the Test Results Report, not a log.

### Error States

| Scenario                                                                | Expected Behaviour                                                                                  |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| A `log` entry's `details` exceeds 100 characters or contains narrative  | Violates the schema rule; Principal-Engineer review finding (LOW); see question 1                   |
| An agent prompt or steering file still says "work log" after the change | `grep -ri "work log"` over `agents/ skills/ steering/` returns only the orchestration-state wording |

---

## 6. Architecture Overview

### New Components

None.

### Component Relationships

Documentation and prompt edits only. No code, no installer change, no bundle manifest change.

### Integration Points

- `aif validate` — schema and cross-reference check over the edited agents, skills and steering.
- Installed copies under `~/.claude/` are regenerated by `aif install --update`; no separate action.

---

## 7. Security Considerations

- The security-waiver exception in `steering/global/core.md` must still say where a waiver is documented; it moves to the plan or the commit message, never to nowhere. No security requirement is relaxed.

---

## 8. Risks & Open Questions

| #   | Risk / Question                                                                                                                                                                                                                                                          | Type     | Impact | Source | Raised By | Resolved                           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | ------ | ------ | --------- | ---------------------------------- |
| 1   | Does "work logs" include the orchestration state file's `log` array? No: it stays, with very strict length rules (Section 5). Human decision 2026-09-30.                                                                                                                 | Question | M      | Design | Agent     | Yes                                |
| 2   | Migrate `AIF-007`/`AIF-008` decision rationale before deleting their Work Logs? No: the logs are tracking only. Human decision 2026-09-30.                                                                                                                               | Question | L      | Design | Agent     | Yes                                |
| 3   | Enforce the `log` length limit mechanically (an `aif validate` check on orchestration-state files) or by rule only? Recommendation: rule only now; a rule with no check will drift, so add the check if violations show up. A check is code and tests, a larger Feature. | Question | L      | Design | Agent     | Yes — rule only (human 2026-09-30) |

---

## 9. Task Decomposition

Dependency graph: [`tasks.json`](./tasks.json)

Summary: 2 Tasks across 1 wave, independent of each other: 001 removes the Work Log everywhere; 002 adds the orchestration `log` length rules.

Parallelization notes:

- None. The edits are small and independent of each other; splitting further adds only overhead.

---

## 10. Acceptance Criteria

- [x] All Tasks complete and signed off
- [x] `template.md` has no Section 11 and describes where minor decisions go
- [x] `grep -ri "work log" agents skills steering` returns nothing except wording deliberately kept for the orchestration `log` (per question 1)
- [x] `AIF-007` and `AIF-008` carry no Section 11 and no dangling reference to it
- [x] `state-schema.md` states the `log` length rules once; `SKILL.md` and the Engineering Manager Hard rules cite it without restating
- [x] `aif validate` and all three test suites pass
- [x] No HIGH or CRITICAL findings open in any Task review
