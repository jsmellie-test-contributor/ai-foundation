---
status: accepted
date: 2026-08-23
decision-makers: [Jeremy]
tags: [mcp, dag, tooling, cross-harness]
links:
  supersedes: []
affects:
  - servers/dag/**
---

# DAG Validation/Wave-Computation as an MCP Server

## Context and Problem Statement

Chunk-graph validation (cycle/reference checks) and wave computation (topological
sort for parallel dispatch) are needed by more than one agent, across every harness
this framework installs into, and must produce identical, deterministic results
regardless of caller. How should this shared, deterministic logic be exposed given
the framework's harness-agnostic design?

## Decision Drivers

- Identical behavior across every harness — no harness-specific graph logic
- Deterministic output — correctness cannot depend on an LLM re-deriving topological
  sort
- Callable by more than one agent without duplicating the implementation
- Must not weaken any existing approval gate that depends on it

## Considered Options

- MCP server exposing typed `dag-validate`/`dag-compute-waves` tools
- Standalone script invoked via the generic `shell` tool
- Logic embedded as prose/pseudocode inside the orchestration/planning skills

## Decision Outcome

Chosen: an MCP server (`servers/dag/`), following `skill/server-authoring`'s
standard shape — pure logic in `logic.js`, a thin protocol wrapper in `index.js`.
MCP is the one invocation surface every targeted harness (Kiro, Claude Code,
Copilot) can consume through the same `@server/tool` convention, reusing the
install/registration pipeline already built for other servers rather than adding a
second tool-provisioning pattern. The determinism requirement rules out prose-only
logic outright; against a shell script, the deciding factor was contract strength —
a typed, schema-validated response that fails loudly on bad input, for logic that
gates dependency-ordered dispatch.

## Consequences

- Pays the same three-layer test suite and MCP SDK dependency every server in this
  framework already pays.
- Requires an explicit install/registration step per harness, which is exactly what
  makes the capability uniformly discoverable.
- Sets default guidance: a future shared, deterministic, cross-harness capability
  should default to this MCP pattern rather than a script, unless it's genuinely
  single-agent or a thin passthrough wrapper.
- Flags `ai-git` as a candidate for the same audit — resolved separately in
  `0005-ai-git-tool-boundary.md`.
