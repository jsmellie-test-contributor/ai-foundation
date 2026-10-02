---
status: accepted
date: 2026-10-01
decision-makers: [Jeremy]
tags: [harness-adapters, tools, cross-harness, platform-tools]
links:
  supersedes: []
affects:
  - lib/constants.js
  - lib/harnesses/base.js
  - lib/harnesses/claude.js
  - lib/harnesses/kiro.js
  - agents/*.yaml
---

# Harness-Neutral Groups for Platform-Provided Tools

## Context and Problem Statement

Platform-provided tools are capabilities a harness supplies itself that this framework does not install (contrast ADR 0004, which covers framework-installed servers). They may or may not be MCP. Any harness, current or future, can expose them, and other harnesses may have no agent-callable equivalent. The motivating example is Claude Code cloud sessions, which expose claude-code-remote tools (PR subscription, `send_later`, session introspection and control, routines) that Copilot and Kiro lack. Agent yamls must grant such capabilities without leaking harness-specific concepts (ADR 0002). Adapters also handle "no native equivalent" inconsistently and never report dropped tools, so the same grant behaves differently per harness. Evidence: `docs/research/tool-tiers-and-harness-parity.md`; scope: AIF-010 Q1.

## Decision Drivers

- Source yamls stay harness-neutral (ADR 0002), with no harness names for any platform-provided tool
- Supporting a new harness's platform tools adds one adapter mapping, not a schema change
- A grant behaves uniformly on every harness, current and future, with dropped tools visible at install
- `@server/tool` (ADR 0004) refers to servers this framework installs; platform-provided tools are not servers it installs
- Reversibility: names written into agent yamls are the costly part

## Considered Options

- A: Capability-named harness-neutral groups in `lib/constants.js`, resolved per adapter
- B: Explicit `@server/tool`-style names in yamls (e.g. `@claude-code-remote/tool`) plus an adapter filter
- C: Per-harness section in agent yaml

## Decision Outcome

Chosen: A. Agent yamls grant capability-named harness-neutral groups, never tier- or harness-named, additive to the baseline tool names. Each adapter decides how to resolve a group. A single shared way to declare a tool unsupported applies to all current and future harnesses, so a grant behaves uniformly everywhere: a harness with no equivalent drops the group and reports it at install. B fails because platform-provided tools are not framework-installed servers, so ADR 0004's `@server/tool` convention does not fit, and it also depends on each harness tolerating foreign entries (Kiro's handling is unverified); C violates ADR 0002.

Resolution mechanism and install-time reporting are implementation detail owned by the AIF-010 plan and arc42 §5.02, not this decision.

## Consequences

- Harness neutrality: yamls carry no harness-specific names, so a new harness adapter adds one mapping, not a schema change.
- Reversible toward B: a group can expand to `@ref` names without editing yamls. Not reversible toward C. The group names written into yamls are the costly part to change.
- Harnesses without an equivalent (today Kiro and Copilot for claude-code-remote) drop groups rather than fail, so a grant is only effective where the harness has an equivalent.
- Dependent on pending verification: subagent inheritance and `ToolSearch` behavior decide who is granted what, and whether `ToolSearch` needs a group of its own; neither changes this decision.
