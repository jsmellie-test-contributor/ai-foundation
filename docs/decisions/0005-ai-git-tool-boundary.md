---
status: accepted
date: 2026-08-23
decision-makers: [Jeremy]
tags: [mcp, ai-git, tooling, cross-harness, credentials]
links:
  supersedes: []
affects:
  - bin/ai-git.js
  - lib/ai-git.js
---

# `ai-git` Tool Boundary — CLI Script vs. MCP Server

## Context and Problem Statement

`ai-git` is the mandatory wrapper for every git/GitHub operation any agent
performs, currently a CLI script invoked via the generic `shell` tool rather than a
named tool. `0004-dag-tool-as-mcp-server.md` established MCP as the default for
cross-harness, deterministic, multi-agent tooling — does that reasoning transfer to
`ai-git`, given its credential-handling responsibility?

## Decision Drivers

- Must keep supporting the full, open-ended git/gh subcommand surface already in
  active use, not a fixed handful
- Must never weaken the existing credential-injection guarantee (env-var only,
  never logged)
- Must stay invocable by every current and future consuming agent

## Considered Options

- Status quo: remain a CLI script invoked via `shell`
- Full typed MCP tool set, one tool per git/gh operation
- Single generic MCP passthrough tool (`git_exec`/`gh_exec`)

## Decision Outcome

Chosen: keep `ai-git` as a CLI script — explicitly not converted to MCP. The
DAG decision's MCP-by-default guidance rests on three properties: a fixed,
enumerable operation set, determinism that benefits from typed I/O, and an
access-narrowing benefit for callers. `ai-git`'s entire value is unconstrained
passthrough over an operation set this repo's own skills keep expanding — failing
the first property by design, the same condition that ruled out a full typed tool
set for DAG. It fails the third incidentally: every current consumer already holds
`shell` for unrelated reasons, so converting narrows nothing. Credential handling is
already correctly scoped by design (env-var injection only), independent of
invocation mechanism, so the risk that motivated re-examining this isn't actually
mitigated by converting.

## Consequences

- `ai-git` stays discoverable only as "the agent has `shell`," not a named
  `@ai-git/*` capability.
- Error handling stays exit-code/stdout based rather than a structured response —
  accepted since `lib/ai-git.js`'s logic is already unit-tested in isolation.
- Revisit trigger: if `ai-git`'s surface ever stabilizes into a small fixed set, or a
  future agent needs it without otherwise needing broad `shell`, reopen this
  decision starting from the passthrough-MCP option, not the full typed-tool-set
  option (rejected for a structural reason unlikely to change).
