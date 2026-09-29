---
status: accepted
date: 2026-08-01
decision-makers: [Jeremy]
tags: [steering, harness-adapters, schema]
links:
  supersedes: []
affects:
  - lib/harnesses/base.js
  - lib/harnesses/claude.js
  - lib/harnesses/kiro.js
  - steering/**
---

# Steering Schema & Harness Adapter Scoping

## Context and Problem Statement

Steering frontmatter needs a harness-agnostic way to scope conditional loading
(unconditional vs. file-pattern-conditional) that each harness's own install adapter
can mechanically translate to its native mechanism, without leaking any
harness-specific concept into the source files.

## Decision Drivers

- No Kiro/Copilot/Claude-specific concepts in source steering files
- Must support both unconditional and file-pattern-conditional loading
- Adapters must translate mechanically, without ambiguity
- Keep the schema minimal

## Considered Options

- Kiro-native `inclusion` field directly in source frontmatter
- Harness-agnostic `file_patterns: []` array, translated per adapter
- A separate field per harness (`kiro_inclusion`, `copilot_applyTo`, …)

## Decision Outcome

Chosen: `file_patterns: []` (empty = always load, populated = conditional). Each
adapter mechanically maps it to its own native mechanism — see arc42 §5.02's
"Steering frontmatter scoping" section (`docs/architecture/index.json` resolves
the section number to its current file) for the translation table. An earlier
`applies_to` (agent/role scoping) field was tried and removed — no harness
supports partial-file loading by agent, so role scoping happens via bundle
composition or the agent's own prompt instead.

## Consequences

- Kiro's `manual` inclusion mode has no equivalent — mitigated because anything that
  shouldn't auto-load is simply left out of a bundle.
- Every adapter owns its own translation logic; a new harness needs one new mapping,
  not a schema change.
- Kiro's `fileMatch` mode has a known reliability gap — see arc42 §11 (Risks and
  Technical Debt).
