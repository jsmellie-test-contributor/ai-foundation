# Feature Plan: {Short Title}

## 1. Metadata

| Field               | Value                                          |
| ------------------- | ---------------------------------------------- |
| Feature ID          | {ProjectShortName}-{###}                       |
| Project             | {Project name}                                 |
| Status              | Draft / Approved / Done / Deferred             |
| Author (Agent)      | Engineering Manager                            |
| Reviewed By         | {human name or "Pending"}                      |
| Created             | {YYYY-MM-DD HH:mm}                             |
| Last Updated        | {YYYY-MM-DD HH:mm}                             |
| Standards           | {e.g. csharp-avalonia, project-standards link} |
| Total Tasks         | {n — filled after decomposition}               |
| Product Requirement | {PRD ID or "None"}                             |
| ADRs                | {ADR ID(s) or "None"}                          |

---

## 2. Goal

{What is being built and why? Two to four sentences. What does the user get?}

> Requirement traceability: {PRD reference or "N/A"}

---

## 3. Quick Summary

**Open Items:** {N} open ({H} High / {M} Medium / {L} Low) — see Section 8

---

## 4. Scope

### In Scope

- {High-level feature or capability included}

### Out of Scope

- {Explicitly deferred — at least one required}

---

## 5. Feature Description

### User-Facing Behaviour

{What the user sees and does. Walk through the experience.}

### Data Flow

{How data moves: entry point → processing → output/storage.}

### Business Rules

- {Rule 1}
- {Rule 2}

### Error States

| Scenario              | Expected Behaviour          |
| --------------------- | --------------------------- |
| {e.g. File not found} | {Show message, log warning} |

---

## 6. Architecture Overview

### New Components

| Component | Type                           | Responsibility |
| --------- | ------------------------------ | -------------- |
| {Name}    | {Model/Service/ViewModel/View} | {One sentence} |

### Component Relationships

{How components interact — diagram or bullet list.}

### Integration Points

- {Existing component} — used for {reason}

---

## 7. Security Considerations

- {Concern and which Tasks will address it}

---

## 8. Risks & Open Questions

| #   | Risk / Question | Type          | Impact | Source            | Raised By     | Resolved |
| --- | --------------- | ------------- | ------ | ----------------- | ------------- | -------- |
| 1   | {Describe}      | Risk/Question | H/M/L  | {PRD/Design/Arch} | {Agent/Human} | No       |

---

## 9. Task Decomposition

Dependency graph: [`tasks.json`](./tasks.json)

Summary: {N} Tasks across {M} waves. {Brief description of parallelization.}

> **Single-Task or no-decomposition Features:** if this Feature is a single Task, or
> small enough to skip `tasks.json` entirely (see Task-sizing rules in
> `skill/feature-planning`), state that here instead of a dependency graph — e.g.
> "Single Task, no decomposition needed."

Parallelization notes:

- {Constraints on parallel execution}

---

## 10. Acceptance Criteria

- [ ] All Tasks complete and signed off
- [ ] Feature works end-to-end as described in Section 5
- [ ] No HIGH or CRITICAL findings open in any Task review
- [ ] {Feature-specific criteria}

---

## 11. Work Log

{Auto-populated by agents. Format:} [{YYYY-MM-DD HH:mm}] [{Agent}] [{Action}] [{ID}] [{Details}]

> **Minor decisions made during planning.** A decision made during Feature planning
> or revision that isn't a genuine architectural/product fork
> (`docs/process-model.md`'s Decisions section) is not an ADR at all — record it
> inline in a Work Log entry, not as a standalone file: no `{paths.decisions}/`
> entry, no separate approval gate. Fold the convention into the entry's
> `[Details]`: `Decision: {what was decided}. **Why:** {rationale}.` This rides
> the Feature Plan's own `skill/plan-lifecycle` cycle. If it later turns out to
> be a genuine fork — contested, costly to reverse — escalate to Architect for
> an ADR instead of continuing to treat it as inline.
