# Feature Plan: Harness-neutral tool grants and tool tiers

## 1. Metadata

| Field               | Value                                                          |
| ------------------- | -------------------------------------------------------------- |
| Feature ID          | AIF-010                                                        |
| Project             | ai-foundation                                                  |
| Status              | Approved                                                       |
| Author (Agent)      | Engineering Manager                                            |
| Reviewed By         | Jeremy S (chat approval 2026-10-02)                            |
| Created             | 2026-10-01                                                     |
| Last Updated        | 2026-10-02                                                     |
| Standards           | `javascript`, `node` (per `.aiconfig.json`)                    |
| Total Tasks         | Not yet decomposed (Draft)                                     |
| Product Requirement | None. Source: `docs/research/tool-tiers-and-harness-parity.md` |
| ADRs                | 0002 (accepted), 0004 (accepted). ADR 0007 (accepted).         |

---

## 2. Goal

Make agent tool grants consistent and explainable across harnesses whose tools do not always match. Adapters currently encode "no native equivalent" two different ways and never report a dropped tool, and the `engineering-manager` agent has no way to subscribe to PR activity or schedule check-ins in Claude Code cloud sessions (the PR 83 incident: one wake, then silence). After this Feature an adapter states what it dropped at install time, and agents can be granted Claude-only claude-code-remote capabilities through harness-neutral, tiered group names.

> Requirement traceability: N/A. Human request 2026-10-01; evidence in `docs/research/tool-tiers-and-harness-parity.md`.

---

## 3. Quick Summary

**Open Items:** 5 open (3 High / 2 Medium / 0 Low) — see Section 8

---

## 4. Scope

### In Scope

- One shared "no native equivalent" contract for all adapters, with a visible install-time report of dropped tools. This is the first Task; everything else builds on it.
- Harness-neutral generic tool _group_ names for the Claude-only claude-code-remote tools, tiered T0–T5 per the brief, all defined now (including session-control, repo-scope and routines groups), with grants limited per the Section 8 decisions.
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
- Granting any T3+ group to an agent. The T3, T4 and T5 groups are defined (Q3) but held by no agent; T4/T5 never have a standing grant.
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
- A tool may belong to more than one group (for example `ReadNotifications`, which PR follow-through needs and which its description says also reads scheduled-trigger and cross-session messages; see Section 8, Q10). The resolved tool list is deduplicated, and a tool stays granted while any group the agent holds includes it.
- Tier-to-agent baseline is the brief's table, subject to the Section 8 decisions: T0 all agents; T1/T2 `engineering-manager`; nobody holds T3/T4/T5 by default (groups exist, no grants).
- Only an adapter-verified "unsupported" is silent-safe; an unknown name is never guessed.

### Error States

| Scenario                                                   | Expected Behaviour                                                              |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Agent lists a bare name that is not generic, group, or ref | Install and validation fail with the offending agent and name                   |
| Group unsupported on the target harness                    | Install succeeds; dropped-tool report names agent, group and harness            |
| Kiro rejects an agent containing a foreign `@server/tool`  | Prevented: verification Task gates any yaml edit (Section 8, Q6); adapter drops |
| Claude Code loads an agent whose allowlist lacks a group   | Skill degrades: reports once and names the human route rather than assuming it  |

---

## 6. Architecture Overview

### New Components

| Component                       | Type                           | Responsibility                                                                                           |
| ------------------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `UNSUPPORTED` marker + resolver | Shared module (`base.js`)      | One encoding for "verified no equivalent" and a three-state resolve (mapped / unsupported / passthrough) |
| Dropped-tool report             | Install output                 | One line per agent and harness listing dropped tools                                                     |
| Tool group names                | Constants (`lib/constants.js`) | Harness-neutral names such as `session_info`, `pr_follow_through`; added only when an agent needs one    |
| Shared adapter contract test    | Test                           | One test run against every adapter asserting the three states and the resolved set                       |

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
- `ToolSearch` allowlist behaviour was verified (Q4, A1b): it did not load a tool outside the agent's allowlist. Adding it to a baseline stays a separate decision, since it changes how every allowlisted MCP tool is loaded.
- No tokens or secrets are touched. PR 83 verification (Task 8) uses existing `ai-git` identity handling only.

---

## 8. Risks & Open Questions

| #   | Risk / Question                                                                                                                                                                                                                                                                                                           | Type     | Impact | Source       | Raised By | Resolved                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------ | ------------ | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Abstraction choice:** (A) generic group names mapped per adapter, (B) explicit `@server/tool` names plus an adapter filter, (C) per-harness yaml section. The brief recommends A; C conflicts with ADR 0002; B depends on Q6. Contested and costly to reverse, no accepted ADR covers it.                               | Question | H      | Brief §6     | EM        | Yes. Decision: option A, capability-named generic groups (ADR 0007, accepted by human 2026-10-01). Dependent Tasks may proceed once this plan is Approved.                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 2   | **PR subscription owner:** EM only, or also Software-Engineer (SE opens the Task's draft PR and pushes corrections; EM posts the Review Report and marks it ready). Brief recommends EM only; two agents must not subscribe to the same PR. Depends on Q5 (does a subagent-held subscription deliver wakes, and to whom). | Question | M      | Brief §6     | EM        | Yes. Decision: EM only subscribes (human, 2026-10-02). **Why:** subagents share the EM's session, so a subscription held by a subagent is the EM's and wakes only the EM (A3d); across separate sessions only the most recent subscriber receives events (A3b). Giving each agent its own session would let SE and PE loop on issues themselves, but costs a cloud instance per agent, which is too much overhead for now; revisit as a future change.                                                                                                                                                   |
| 3   | **Tiers T3 and above.** `session-control` (spawning and controlling other, self-contained cloud sessions) is distinct from the `subagent` generic tool (in-session subagents).                                                                                                                                            | Question | L      | Brief §6     | EM        | Yes. Decision: define all groups now (session-control, repo-scope incl. `add_repo`/`register_repo_root`, routines incl. `watch_url`) and grant T3+ to no agent. **Why:** distinct capabilities, cheap to add together (human, 2026-10-01).                                                                                                                                                                                                                                                                                                                                                               |
| 4   | **Can `ToolSearch` be in a universal baseline?** UNVERIFIED whether the allowlist still blocks calling a tool loaded through it.                                                                                                                                                                                          | Question | H      | Brief §2, §7 | EM        | Verified safe for the allowlist (`verification-guide.md` A1b, 2026-10-02; agent-reported, one session). `ToolSearch` only searched and loaded the agent's own allowlisted tools: an omitted tool returned "No matching deferred tools found". It is callable only when the granted tool list is long enough to trigger deferral, which switches on only when `ToolSearch` is granted; the same 40 tools cost 18.7k context with it and 31.1k without (human measurement). Whether it goes in a baseline is a separate decision (human); it is Claude-only and only useful to agents with many MCP tools. |
| 5   | **Subagent inheritance:** whether subagents inherit these tools, and how wakes and `send_later` behave when called from a subagent. Feeds Q2.                                                                                                                                                                             | Question | H      | Brief §7     | EM        | Yes (human, 2026-10-02; `verification-guide.md` A2 and A3d). Subagents do not inherit the parent's tools; each needs its own grant. A subagent has no session of its own, so a subscription it makes belongs to the parent session: wakes go to the parent and the subagent is never woken. Subscription tools are only useful on the agent that runs the session.                                                                                                                                                                                                                                       |
| 6   | **Kiro behaviour with an unknown `@claude-code-remote/...` entry** (reports of silent agent rejection, Kiro #11411). Must be known before any agent yaml adds one.                                                                                                                                                        | Risk     | H      | Brief §4, §7 | EM        | Yes (human, 2026-10-02; `verification-guide.md` Part B). Kiro (output looks like the CLI; IDE not tested) lists and runs an agent whose `tools` or `allowedTools` contains `@claude-code-remote/subscribe_pr_activity`, silently ignoring it: the agent reported only `grep` and `read`, and `read` worked. No warning or rejection seen. So a foreign entry is tolerated, but the agent does not hold it. The adapter still drops it and reports the drop (the plan default), since passthrough gives a false impression of a grant.                                                                    |
| 7   | **Brief §7 repo checks.** (a) Does `mapMcpToolRef` map `claude-code-remote` correctly? (b) Does `aif validate` reject unknown bare names?                                                                                                                                                                                 | Question | M      | Brief §7     | EM        | Yes. (a) Verified: `mapAgentTools(['@claude-code-remote/subscribe_pr_activity'])` returns `mcp__claude-code-remote__subscribe_pr_activity`; Task 1/4 still adds a unit test. (b) Verified no: `aif validate` checks only that `tools`/`approved_tools` exist and `approved_tools` is a subset of `tools`; a bare typo passes through the Claude adapter unchanged. `tests/validation/tools.test.js` catches it only in tests, against built-ins and server definitions. Task 1 closes the gap.                                                                                                           |
| 8   | **Copilot / Kiro UNVERIFIED items** from the brief.                                                                                                                                                                                                                                                                       | Risk     | L      | Brief §7     | EM        | Not needed for this Feature (human, 2026-10-01). This Feature maps Kiro and Copilot to unsupported.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 9   | **PR 83 re-run** needs a fresh Claude Code cloud session as EM and cannot run in CI.                                                                                                                                                                                                                                      | Risk     | M      | Brief §8     | EM        | No. Decision: human runs it using `verification-guide.md` Part C.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

| 10 | **`ReadNotifications` is required for PR wakes, and may sit in several groups.** Verification (`verification-guide.md` A3) showed PR events after `subscription.created` arrive as queued notifications read with `ReadNotifications`; a restricted agent that held it woke live and from a disconnected state. The tool description says it reads three kinds of queued notification: PR activity (`subscribe_pr_activity`), scheduled triggers (`send_later`, `create_trigger`, `update_trigger`, `fire_trigger`), and messages from other sessions (`send_message`). Observed: `send_later` wakes and `send_message` cross-session messages both reached a restricted agent without the tool, as ordinary user turns (`send_message` even to a disconnected session); the same `send_message` reached an agent that held the tool through the queue. PR events were the only source that did not reach an agent without it. Any group that delivers wakes (`pr_follow_through`, scheduling or routines, `session-control`) may need it, so the group maps must dedupe a shared member. `CronCreate`, `ScheduleWakeup` and `watch_url` are not named in the description and are not assumed to use the queue. Also: only the most recent subscriber to a PR receives events, which bears on Q2 and Q5. | Question | H | A3 findings | Human | No. Decision: `ReadNotifications` is added to the PR follow-through group and to any other wake-delivering group once its need is verified. Task 1 resolver dedupes shared members; Task 5 tests a tool shared by two groups is granted once and stays granted while either group is held. |

> **Not decided here:** Q1 is a genuine fork and belongs to Architect's ADR, not to this plan.

---

## 9. Task Decomposition

Not yet decomposed. Decomposition into `tasks.json` happens only after this plan is `Approved`. Expected shape, for review only (the brief's suggested decomposition, refined):

1. Shared tool-mapping contract (first, blocks all others): one `UNSUPPORTED` marker, three-state resolver in `base.js`, arrays on both adapters, bare unknown names rejected (only `@server/tool` passes through), one dropped-tool install report, deduplication of a tool shared by several groups, one shared contract test over every adapter. Also reconciles the Claude `mapToolName` leak.
2. Verification (parallel with 1): the human runs the Kiro and cloud-session tests in `verification-guide.md` Parts A and B (Q4, Q5, Q6); the repo checks Q7(a)(b) are already done (Section 8). Output is recorded findings, not code; gates the agent yaml edit.
3. Architect ADR for Q1 (accepted: ADR 0007), then all group names (T0–T5) in `lib/constants.js`.
4. Claude adapter group clusters and T0 baseline; Kiro groups to unsupported.
5. Resolved-tool-set tests per agent and harness (including a tool shared by two groups, such as `ReadNotifications`); extend `KNOWN_NATIVE_TOOLS`.
6. Agent yaml updates (after 3 and 2).
7. Graceful-degradation edits to `skill/pr-stewardship` (and `skill/task-orchestration` if needed). Includes the Doc-Update step for `docs/architecture/05_02_harness_adapters.md` (`key_files` and mapping description) per the Doc-Update Acceptance Gate, in the same Task as the code it describes.
8. PR 83 scenario re-run: human runs `verification-guide.md` Part C.

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
