---
name: 'document-types'
version: '0.4.0'
description: 'Routes any new non-code document to the one home its kind owns — supersedes the retired knowledge-authoring skill.'
file_patterns: []
---

## Scope

**This steering applies to:** All agents with `domain = "engineering"`.

**Loaded when:** At session start for any engineering agent, after `steering/global/core.md`.

---

## Rules

### The four kinds

Before writing a new non-code document, identify which of these it is. Each kind has exactly one home —
never create a second file elsewhere that duplicates it.

| Kind                                         | Answers                            | Mutability                                         | Home                                                    | Owner                                                                                                 |
| -------------------------------------------- | ---------------------------------- | -------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **ADR**                                      | Why this path won over another     | Immutable once accepted — superseded, never edited | `{paths.decisions}/`                                    | Architect                                                                                             |
| **Architecture doc**                         | How the system currently works     | Living                                             | `{paths.architecture}/*`, as arc42 sections             | Architect may start a section alongside an ADR; Software-Engineer maintains it at implementation time |
| **Product doc** _(reserved — not built yet)_ | What a product area does, for whom | Living                                             | `{paths.product}/*`                                     | A future product agent                                                                                |
| **Process & ownership**                      | How we work / who's accountable    | Living                                             | `steering/`, `standards/`, agent charters, Agent roster | Engineering Manager                                                                                   |

**Product docs are a reserved slot, not current work** — nothing needs a PRD today. Do not create a
`{paths.product}` directory or file speculatively; wait until a product agent exists to own it.

**"Owner" is who directs and is accountable for the content, not who holds the pen.** Engineering
Manager owning Process & ownership changes means EM decides what changes and dispatches it as a Task —
editing a skill/steering/agent file is AI-component authoring, in-domain for the implementing agent like
any other Task (`skill/task-orchestration`: "Handle Blocks"), never something EM does itself. Same pattern as
Architect owning ADRs: the agent that dispatched Architect commits the resulting file, not Architect.

### Subject matter is not a document kind

`api` and `business-rule` are not document kinds — never assign either as a `type`. Both describe what a file
is about, not why it exists or whether it changes, and content described that way already has a real home:
code (a `key_files` entry — never restated in prose), the arc42 section that already covers that system or
component, `standards/`, or the reserved `{paths.product}` slot. If you're tempted to create a knowledge file
because the content "is an API" or "is a business rule," that impulse is wrong — find the home that already
owns it. Never create a standalone file for either.

### External reference material — the one kind still generic

Once ADRs, architecture, and product each have their arc42/MADR home, and `api`/`business-rule` route as
subject matter above, one kind of content is still genuinely homeless: reference material describing an
**external system** this project depends on or interacts with (a third-party API's actual behavior, a
vendor's constraints, prior art from outside the codebase) — not this project's own architecture, and not a
decision.

- **Home:** `{paths.knowledge}/{name}.md` (flat — no dedicated subfolder is pre-scaffolded; create the file
  where it's needed)
- **Shape:**

  ```yaml
  ---
  name: '{kebab-case-name}'
  tags: ['{tag1}', '{tag2}']
  scope: '{all | domain | agent-name}'
  description: '{One sentence — agents read this to decide whether to load the file}'
  ---
  ```

  No `type` field — this is the only generic kind left, so the field has nothing left to distinguish.
  Body: standard markdown, scannable, concise. 3-5 tags is typical.

- **Scope values:** `all` (every agent benefits), a domain name, or a comma-separated agent-name list. When
  in doubt, start with `all` and narrow later if it's consuming context unnecessarily.
- **Consumption:** `steering/global/knowledge-consumption.md` governs how agents discover and load these
  files — this rule only governs where a new one is created and what shape it takes.

---

## Enforcement

- **Wrong-home violations:** Caught during review. A new non-code document that lands outside its kind's one home (see "The four kinds") is a MEDIUM finding; consolidate into the existing home instead.
- **Subject-matter-as-kind violations:** Caught during review. A file assigned an `api`/`business-rule` "kind" (see "Subject matter is not a document kind") is a MEDIUM finding.
- **Malformed external-reference files:** Caught during review. A `{paths.knowledge}/{name}.md` file that doesn't match the required shape (see "External reference material") is a LOW finding.

---

## Rationale

The kind of a document (why does it exist, does it change) determines where it lives; the subject it covers
does not. Mixing the two — as the retired `type: decision | reference | architecture | api | business-rule`
taxonomy did — produced files that were reference material about a subject wearing an `architecture` or
`decision` label, landing nowhere near the arc42 section or ADR that already owned the real answer. One home
per kind keeps that from recurring: an agent asking "where does this go" gets one answer, not a choice
between a generic knowledge file and the arc42/MADR home that already exists for it.

## Exceptions

- If you truly cannot find a home, ask instead of guessing.
