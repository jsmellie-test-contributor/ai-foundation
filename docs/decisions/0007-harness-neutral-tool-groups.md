---
status: proposed
date: 2026-10-01
decision-makers: []
tags: [harness-adapters, tools, cross-harness, claude-code-remote]
links:
  supersedes: []
affects:
  - lib/constants.js
  - lib/harnesses/base.js
  - lib/harnesses/claude.js
  - lib/harnesses/kiro.js
  - agents/*.yaml
---

# Harness-Neutral Tool Groups for Claude-Only Capabilities

## Context and Problem Statement

Claude Code cloud sessions expose claude-code-remote tools (PR subscription, `send_later`, session introspection and control, routines) that Copilot and Kiro have no agent-callable equivalent for. Agent yamls must grant them without leaking harness-specific concepts (ADR 0002). Adapters also encode "no native equivalent" inconsistently (`[]` vs `null`) and never report dropped tools. Evidence: `docs/research/tool-tiers-and-harness-parity.md`; scope: AIF-010 Q1.

## Decision Drivers

- Source yamls stay harness-neutral (ADR 0002)
- A Copilot adapter adds one mapping, not a schema change
- One encoding for "unsupported", with dropped tools visible at install
- `@server/tool` (ADR 0004) refers to servers this framework installs; claude-code-remote is platform-provided
- Reversibility: names written into agent yamls are the costly part

## Considered Options

- A: Capability-named generic groups in `lib/constants.js`, resolved per adapter
- B: Explicit `@claude-code-remote/tool` names in yamls plus an adapter filter
- C: Per-harness section in agent yaml

## Decision Outcome

Chosen: A. Groups are named for capability, never tier or harness, are granted all-or-nothing, and are additive to the 13 baseline names. Claude resolves a group to a `mcp__claude-code-remote__*` cluster; Kiro and Copilot resolve it to one shared `UNSUPPORTED` marker. Adapters share one three-state contract (mapped, unsupported, passthrough): bare unknown names are rejected, only `@server/tool` passes through, and each dropped tool is reported per agent and harness at install. Groups for session control and routines are defined now but granted to no agent; they stay distinct from `subagent`, which covers in-session subagents. B fails ADR 0004's premise and makes yamls depend on Kiro's unverified handling of foreign entries; C violates ADR 0002.

## Consequences

- Claude adapter owns member lists; a Claude tool rename touches one file, guarded by `KNOWN_NATIVE_TOOLS`.
- Reversible toward B: a group can expand to `@ref` names without editing yamls. Not reversible toward C.
- Independent of the Kiro unknown-entry check, since groups never reach Kiro's output. Option B would depend on it.
- Dependent on pending verification: subagent inheritance and `ToolSearch` behavior decide who is granted what, and whether `ToolSearch` needs a group of its own; neither changes this decision.
- Mechanism detail belongs in arc42 §5.02, updated by AIF-010's implementation Task.
