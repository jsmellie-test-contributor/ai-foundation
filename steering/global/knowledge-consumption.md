---
name: 'knowledge-consumption'
version: '0.3.3'
description: 'Instructs agents how to discover and load project knowledge before starting work.'
file_patterns: []
---

## Scope

All agents, all sessions. Knowledge consumption applies across every domain.

---

## Rules

### Before Starting Work

When beginning a task in a project that has a `knowledge/` directory:

1. Check if `knowledge/index.json` exists
2. If it does, read the index and identify entries relevant to your task:
   - Match entries where `scope` includes your agent name, your domain, or `all`
   - Match entries where `tags` overlap with the components or concepts you are working on
3. Load the matching knowledge files before proceeding

If no `knowledge/index.json` exists, scan `knowledge/` directory listings to discover relevant files by name. Prefer loading the index when available — it is faster and provides descriptions for relevance assessment without reading full files.

**Do not begin implementation without first checking for relevant knowledge.** Failing to load available knowledge leads to rework, contradicted decisions, and code that does not fit the existing architecture.

### What to Load

- **Never skip:** entries with `scope: "all"` and tags matching your current task
- **ADRs are index-only by default:** an Approved ADR relevant to your work area must be identified from the index (title, status, tags, one-line description) before proceeding — never ignored — but its full body is loaded only once you determine it is actually relevant to what you're doing, not automatically for every relevant-looking entry
- **Load if relevant:** entries scoped to your domain or agent name
- **May skip:** entries scoped to other domains/agents with no tag overlap to your task
- **Never reference:** an ADR that is not in the `Approved` status — these are not authoritative

### When Knowledge Conflicts with Standards

Standards are prescriptive rules. Knowledge is descriptive reference.
If knowledge describes a pattern that conflicts with the active standards file, follow the standards. Raise the conflict as a finding — do not silently ignore either source.

### Doc-Update Acceptance Gate

When a task extends or removes a building block an arc42 architecture doc already describes, updating that doc is part of the task's completion, not an afterthought. This explicitly includes _adding_ a new `key_files` entry for a newly created file that extends the described block, and symmetrically _removing_ a doc's description (row, mermaid node/edge, `key_files` entry) of a file the same task deletes — not only editing prose for files that stay listed.

- A new file that implements or extends a building block already described in an arc42 section must be added to that section's `key_files` list as part of the same task, not deferred
- A new file introducing a genuinely new building block not yet described anywhere needs a new arc42 entry (or subsection), not just a `key_files` addition to an unrelated section
- A file being deleted that an arc42 doc describes or lists in `key_files` must have that description and `key_files` entry removed in the same task — never left to describe something that no longer exists
- Check this before presenting a result, alongside self-validation

---

## Enforcement

- **Skipped-knowledge violations:** Caught during review. Work that contradicts an available, relevant knowledge entry — especially a confirmed ADR — that should have been loaded is a MEDIUM finding.
- **Stale-reference violations:** Caught during review. Citing an ADR not in `Approved` status as authoritative is a HIGH finding, the same severity class as citing an unapproved plan.
- **Silent-conflict violations:** Caught during review. Following knowledge over an active standard without raising the conflict as a finding is a MEDIUM finding — the standard should have won, and the conflict should have been surfaced either way.
- **Doc-update gate violations:** Caught during Principal-Engineer review. A new file extending a described building block with no corresponding `key_files` update is a MEDIUM finding.

---

## Rationale

Agents produce worse output when they ignore available context. Without knowledge consumption, agents reinvent settled decisions, miss constraints, contradict prior architecture choices, and produce code that must be reworked. The index enables efficient discovery without loading every file into context.

## Exceptions

- If no `knowledge/` directory exists, skip knowledge loading entirely.
- If context budget is severely constrained, prioritize: ADRs > architecture > reference. Never drop ADRs.
