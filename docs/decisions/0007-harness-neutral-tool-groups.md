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

Chosen: A. Agent yamls grant capability-named generic groups, never tier- or harness-named, additive to the baseline tool names. Each adapter decides how to resolve a group; a harness with no equivalent drops it, and the drop is reported at install. B fails ADR 0004's premise (claude-code-remote is platform-provided, not a framework-installed server) and makes yamls depend on Kiro's unverified handling of foreign entries; C violates ADR 0002.

Scope: all groups are defined now, including repo-scope (`add_repo`, `register_repo_root`), session-control, and routines (including `watch_url`). `list_repos` stays a separate read-only member or group. None of the T3+ groups are granted to any agent yet.

Resolution mechanism, the unsupported-marker contract, and install-time reporting are implementation detail owned by the AIF-010 plan and arc42 §5.02, not this decision.

## Consequences

- Harness neutrality: yamls carry no Claude-specific names, so a Copilot adapter adds one mapping, not a schema change.
- Reversible toward B: a group can expand to `@ref` names without editing yamls. Not reversible toward C. The group names written into yamls are the costly part to change.
- Unsupported harnesses (Kiro, Copilot) drop groups rather than fail, so a grant is only effective where the harness has an equivalent.
- Dependent on pending verification: subagent inheritance and `ToolSearch` behavior decide who is granted what, and whether `ToolSearch` needs a group of its own; neither changes this decision.
