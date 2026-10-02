# Feature Plan: Harness-neutral tool grants and tool tiers

## 1. Metadata

| Field               | Value                                                                    |
| ------------------- | ------------------------------------------------------------------------ |
| Feature ID          | AIF-010                                                                  |
| Project             | ai-foundation                                                            |
| Status              | Draft                                                                    |
| Author (Agent)      | Engineering Manager                                                      |
| Reviewed By         | Pending                                                                  |
| Created             | 2026-10-01                                                               |
| Last Updated        | 2026-10-01                                                               |
| Standards           | `javascript`, `node` (per `.aiconfig.json`)                              |
| Total Tasks         | Not yet decomposed (Draft)                                               |
| Product Requirement | None. Source: `docs/research/tool-tiers-and-harness-parity.md`           |
| ADRs                | 0002 (accepted), 0004 (accepted). New ADR pending (see Section 8, Q1).   |

---

## 2. Goal

Make agent tool grants consistent and explainable across harnesses whose tools do not always match. Adapters currently encode "no native equivalent" two different ways and never report a dropped tool, and the `engineering-manager` agent has no way to subscribe to PR activity or schedule check-ins in Claude Code cloud sessions (the PR 83 incident: one wake, then silence). After this Feature an adapter states what it dropped at install time, and agents can be granted Claude-only claude-code-remote capabilities through harness-neutral, tiered group names.

> Requirement traceability: N/A. Human request 2026-10-01; evidence in `docs/research/tool-tiers-and-harness-parity.md`.

---

## 3. Quick Summary

**Open Items:** 9 open (4 High / 4 Medium / 1 Low) — see Section 8

---

## 4. Scope

### In Scope

- One shared "no native equivalent" contract for all adapters, with a visible install-time report of dropped tools. This is the first Task; everything else builds on it.
- Harness-neutral generic tool _group_ names for the Claude-only claude-code-remote tools, tiered T0–T5 per the brief, with only the groups an agent actually needs introduced.
- Claude adapter resolves groups to `mcp__claude-code-remote__*` names; Kiro (and a future Copilot adapter) resolve them to unsupported.
- Agent yaml updates: a T0 baseline for every agent, T1/T2 for `engineering-manager`, per the decisions in Section 8.
- Graceful degradation in skills that assume these tools (`skill/pr-stewardship`, and `skill/task-orchestration` if it assumes them).
- Tests that assert the resolved tool set per agent and harness, not only file validity.
- Doc-Update step for `docs/architecture/05_02_harness_adapters.md`.
- Verification of the brief's open/UNVERIFIED items before anything relies on them.

### Out of Scope

- Building the Copilot adapter (only the contract it will reuse is defined here).
- Specifying the Copilot or Kiro "follow-through" equivalents (`@copilot`, automations, Kiro autonomous agent). Separate future Feature.
- Changing GitHub MCP exposure to agents.
- The youtrack network-policy change (`environment.network`) or dropping the youtrack tools from the EM.
- Granting T3 and above to any agent by default (see Q3; T4/T5 never have a standing grant).
- Any claude-code-remote capability for Kiro via Kiro Crew or `introspect`, until separately verified.

---

## 5. Feature Description

### User-Facing Behaviour

The "user" is the framework maintainer running `aif install` and the agents it installs.

- `aif install --harness claude|kiro` prints, per agent, any generic tools or groups the harness cannot express ("dropped: pr_follow_through for kiro"). Today this is silent.
- A bare tool name that is neither a generic name, a known group, nor an `@server/tool` reference is an error, not a silent pass-through.
- In a Claude Code cloud session the installed `engineering-manager` can call `subscribe_pr_activity`, `unsubscribe_pr_activity` and `send_later`; every agent can call `read_documentation` and `get_session`.
- On Kiro the same agent yaml installs cleanly with those groups reported as dropped.

### Data Flow

Agent yaml `tools`/`approved_tools` (generic names, groups, `@server/tool`) → adapter resolver (three states: mapped / unsupported / passthrough) → harness-native tool list + a dropped-tool report → install output and the installed agent file.

### Business Rules

- Source agent yamls stay harness-neutral (ADR 0002): no per-harness fields.
- The harness-neutral baseline is the 13 existing generic names, which map to every harness. Groups are additive and may resolve to unsupported.
- Group members are granted all together or not at all (for example the three PR follow-through tools).
- Tier-to-agent baseline is the brief's table, subject to the Section 8 decisions: T0 all agents; T1/T2 `engineering-manager`; nobody holds T4/T5 by default.
- Only an adapter-verified "unsupported" is silent-safe; an unknown name is never guessed.

### Error States

| Scenario                                                    | Expected Behaviour                                                              |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Agent lists a bare name that is not generic, group, or ref  | Install and validation fail with the offending agent and name                   |
| Group unsupported on the target harness                     | Install succeeds; dropped-tool report names agent, group and harness            |
| Kiro rejects an agent containing a foreign `@server/tool`   | Prevented: verification Task gates any yaml edit (Section 8, Q6); adapter drops |
| Claude Code loads an agent whose allowlist lacks a group    | Skill degrades: reports once and names the human route rather than assuming it  |

---

## 6. Architecture Overview

### New Components

| Component                        | Type                    | Responsibility                                                                                          |
| -------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------- |
| `UNSUPPORTED` marker + resolver  | Shared module (`base.js`) | One encoding for "verified no equivalent" and a three-state resolve (mapped / unsupported / passthrough) |
| Dropped-tool report              | Install output          | One line per agent and harness listing dropped tools                                                    |
| Tool group names                 | Constants (`lib/constants.js`) | Harness-neutral names such as `session_info`, `pr_follow_through`; added only when an agent needs one |
| Shared adapter contract test     | Test                    | One test run against every adapter asserting the three states and the resolved set                      |

### Component Relationships

`lib/constants.js` (names) → `lib/harnesses/base.js` (marker, resolver, report) → `claude.js` / `kiro.js` (group maps) → `lib/commands/install.js` (prints the report). Agent yamls consume names only.

### Integration Points

- `lib/harnesses/claude.js` `mapAgentTools`/`mapMcpToolRef` and `lib/harnesses/kiro.js` `transformAgent`: both rewritten onto the shared resolver. The Claude single-name helper `mapToolName` currently returns the generic name for a "nothing" tool; it must stop.
- `tests/unit/claude-adapter.test.js` `KNOWN_NATIVE_TOOLS`: extended with the claude-code-remote names.
- `tests/validation/tools.test.js`: currently validates agent tools against built-in names and server definitions; groups and the stricter bare-name rule must be reflected.
- `docs/architecture/05_02_harness_adapters.md`: its `TOOL_MAP` shape, "Tools with no native equivalent" and `mapToolName` rows change.
- ADR 0004: the `@server/tool` convention stays the way real MCP servers are referenced; this Feature does not change it.

---

## 7. Security Considerations

- Tier assignment is the control: T3+ tools expose other sessions' transcripts, start or control other sessions, widen repo scope, or outlive the session. Those tiers get no standing grant unless Q3 says otherwise, and any grant carries a stated reason (Task: agent yaml updates).
- Dropped-tool reporting removes the failure mode where an agent is installed believing it holds a tool it does not (or the reverse); addressed by Task 1.
- `ToolSearch` stays out of the universal baseline until verified (Q4); an allowlist bypass via deferred loading would undermine every tier.
- No tokens or secrets are touched. PR 83 verification (Task 8) uses existing `ai-git` identity handling only.

---

## 8. Risks & Open Questions

| #  | Risk / Question                                                                                                                                                                                                                                                                                                                                                                    | Type     | Impact | Source          | Raised By | Resolved |
| -- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------ | --------------- | --------- | -------- |
| 1  | **Abstraction choice:** (A) generic group names mapped per adapter, (B) explicit `@server/tool` names plus an adapter filter, (C) per-harness yaml section. The brief recommends A (matches the `null`/`[]` precedent, respects ADR 0002; C conflicts with ADR 0002; B depends on Q6). This is contested and costly to reverse and no Approved ADR covers it. **Recommend dispatching Architect for an ADR.** Human: please confirm that dispatch. Task 1 (the contract) does not depend on the answer; Tasks 2+ do. | Question | H      | Brief §6        | EM        | No       |
| 2  | **PR subscription owner:** EM only, or also Software-Engineer. Brief recommends EM only; SE gets T1 only under an explicit owner rule. Two agents must not subscribe to the same PR.                                                                                                                                                                                                | Question | M      | Brief §6        | EM        | No       |
| 3  | **Do T3 and above exist at all?** `subagent` already grants Agent/ListAgents/SendMessage, so `session-control` (T3) likely duplicates it. Brief leans drop T3. Also whether T4 (`add_repo`, `register_repo_root`) and T5 (routines) are defined now or only when an agent needs one.                                                                                                | Question | M      | Brief §6        | EM        | No       |
| 4  | **Can `ToolSearch` be in a universal baseline?** UNVERIFIED whether the allowlist still blocks calling a tool loaded through it. Verify first (Task 2); decide after.                                                                                                                                                                                                              | Question | H      | Brief §2, §7    | EM        | No       |
| 5  | **Subagent inheritance:** whether subagents inherit these tools, and how wakes and `send_later` behave when called from a subagent. Affects whether T1 can sit with a subagent-dispatched EM. UNVERIFIED; Task 2 verifies before the yaml edit.                                                                                                                                     | Question | H      | Brief §7        | EM        | No       |
| 6  | **Kiro behaviour with an unknown `@claude-code-remote/...` entry** (reports of silent rejection of agents, Kiro #11411). Must be verified before any agent yaml adds one; if group names (Q1 option A) are chosen the adapter drops them and the risk is bounded to the adapter's output, but still verify.                                                                       | Risk     | H      | Brief §4, §7    | EM        | No       |
| 7  | **Resolution of remaining brief §7 items by verifying, not assuming:** (a) does `mapMcpToolRef` map `claude-code-remote` to `mcp__claude-code-remote__*` (its documented regex keeps hyphens; confirm by unit test); (b) does `aif validate` reject unknown bare names (repo finding: `tests/validation/tools.test.js` checks bare names against built-ins and server definitions only when server definitions exist; whether the CLI command does is unconfirmed). | Risk     | M      | Brief §7        | EM        | No       |
| 8  | **Copilot / Kiro UNVERIFIED items** (cloud-agent self-describing tool, cancel endpoint, `mcp-servers` honoured, Kiro `--repo` agent-callable, ToolSearch analogue, `introspect` vs `get_session`, 14th Kiro Crew tool name). Only matter for a later mapping; this Feature maps Kiro and Copilot to unsupported, so these stay unverified and are recorded, not blocking.                  | Risk     | L      | Brief §7        | EM        | No       |
| 9  | **Scope risk of the PR 83 re-run (Task 8):** needs a fresh Claude Code cloud session as EM; cannot be done in CI. Acceptance depends on a human-run check.                                                                                                                                                                                                                       | Risk     | M      | Brief §8        | EM        | No       |

> **Not decided here:** Q1 is a genuine fork and belongs to Architect's ADR, not to this plan.

---

## 9. Task Decomposition

Not yet decomposed. Decomposition into `tasks.json` happens only after this plan is `Approved`. Expected shape, for review only (the brief's suggested decomposition, refined):

1. Shared tool-mapping contract (first, blocks all others): one `UNSUPPORTED` marker, three-state resolver in `base.js`, arrays on both adapters, bare unknown names rejected (only `@server/tool` passes through), one dropped-tool install report, one shared contract test over every adapter. Also reconciles the Claude `mapToolName` leak.
2. Verification spike (parallel with 1): Q4, Q5, Q6, Q7(a)(b). Output is a recorded finding, not code; gates the yaml edit.
3. Architect ADR for Q1 (gated on human confirmation), then group names in `lib/constants.js`.
4. Claude adapter group clusters and T0 baseline; Kiro groups to unsupported.
5. Resolved-tool-set tests per agent and harness; extend `KNOWN_NATIVE_TOOLS`.
6. Agent yaml updates (after 3 and 2).
7. Graceful-degradation edits to `skill/pr-stewardship` (and `skill/task-orchestration` if needed). Includes the Doc-Update step for `docs/architecture/05_02_harness_adapters.md` (`key_files` and mapping description) per the Doc-Update Acceptance Gate, in the same Task as the code it describes.
8. PR 83 scenario re-run in a fresh cloud session as EM (human-assisted).

Parallelization notes:

- Task 1 and the verification spike can run together; the rest follow the ADR and spike results.
- Tasks 4 and 5 both touch adapter files and tests; likely sequential to avoid file overlap.

---

## 10. Acceptance Criteria

- [ ] All Tasks complete and signed off
- [ ] Feature works end-to-end as described in Section 5
- [ ] No HIGH or CRITICAL findings open in any Task review
- [ ] Every adapter resolves "no native equivalent" through one shared marker and reports dropped tools at install
- [ ] Resolved tool sets per agent and harness are asserted by tests, including the Claude cluster for each group and Kiro-unsupported for each group
- [ ] `docs/architecture/05_02_harness_adapters.md` `key_files` and description match the code
- [ ] A fresh Claude Code cloud session as `engineering-manager` can subscribe to PR activity and receive wakes
