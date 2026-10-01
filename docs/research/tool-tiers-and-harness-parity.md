# Research Brief: Agent Tool Tiers and Harness Parity (Claude Code cloud, Kiro, Copilot)

- **Date:** 2026-10-01
- **Requested by:** human (jsmellie), for hand-off to Engineering Manager to produce a Feature Plan
- **Status:** Findings only. No plan, ADR, or implementation exists yet. Nothing here is approved.
- **Question:** Why did the `engineering-manager` agent lack PR-activity wake-ups and other tools in a Claude Code cloud session, which of those tools should every agent have versus only specific agents, and how does that map onto Kiro and Copilot where tool names and semantics don't always match?

Evidence labels: **verified** = observed directly in this repo or session; **researched** = from external sources (linked); **UNVERIFIED** = not confirmed, must be checked before relying on it.

---

## 1. Incident: PR 83 missed wake-ups

- Test PR: `starvoxel/ai-foundation#83` (head `e-test/20261001-002928`). An `engineering-manager` session received one `subscription.created` wake (00:52:25Z), then no wakes for later activity.
- Activity that arrived with no wake (verified via REST, all by `jsmellie`): issue comment 5922687232 (01:10:50Z), inline comments 4150850890 (01:11:24Z) and 4150856180 (01:12:22Z), reviews 5373791650 (01:11:23Z) and 5373797876 (01:12:32Z). PR is open, not draft.
- That session lacked `subscribe_pr_activity`, `unsubscribe_pr_activity`, `send_later`, `ToolSearch`, `read_documentation`, all `mcp__claude-code-remote__*`, all `mcp__github__*`, and `mcp__youtrack__*`. It had `mcp__dag__*` plus core file/shell/task tools.

### Root cause (verified)

| Hypothesis                                                 | Verdict                                                             | Evidence                                                                                                                                                                                                                                                                                                                                                                    |
| ---------------------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A. EM tool allowlist excludes the claude-code-remote tools | **Confirmed**                                                       | `agents/engineering-manager.yaml` `tools:`/`approved_tools:` list only subagent, plan, ask_user, task, skill, read, write, shell, grep, glob, `@dag/*`, `@youtrack/*`. `lib/harnesses/claude.js` (`mapAgentTools`) expands that list one-to-one into the installed `~/.claude/agents/engineering-manager.md` `tools:` line, which Claude Code treats as a strict allowlist. |
| B. Tools deferred behind ToolSearch, which the agent lacks | **Not the cause** for the claude-code-remote tools                  | In a default session those tools are loaded directly, not deferred. `ToolSearch` matters only for deferred tools. Its absence is a consequence of A.                                                                                                                                                                                                                        |
| C. MCP servers failed to connect                           | **Refuted** for claude-code-remote; **confirmed for youtrack only** | claude-code-remote answered `get_session` and `read_documentation`. youtrack: `ERR_PROXY_TUNNEL 403`; proxy status shows repeated `connect_rejected` for `starvoxel.youtrack.cloud:443` (network policy denial; do not retry or route around it).                                                                                                                           |

Other facts (verified): GitHub GraphQL is deliberately unavailable from Claude Code sessions (use REST via `node bin/ai-git.js gh-api ...`; `ai-git` is not on PATH in cloud sessions). `read_documentation` and the proxy status endpoint show no connection problem for claude-code-remote.

### GitHub MCP is not linked to subscription (from tool descriptions; not empirically tested)

`subscribe_pr_activity` is a claude-code-remote tool taking only `owner`, `repo`, `pullNumber`; events are delivered server-side as `<wake>` envelopes. It needs the repo attached to the session and GitHub App access, not any `mcp__github__*` tool. GitHub MCP tools are only needed to _act on_ an event (reply to a review, etc.). GitHub MCP is otherwise out of scope for this work.

---

## 2. Tool inventory and risk tiers (Claude Code cloud / CCR tools)

Classification axes: **reach** (reads only, this session, other sessions, account/repo scope), **persistence** (ends with call vs outlives session), **reversibility**.

| Tier                                         | Intended holders                                                  | Tools                                                                                                                                       | Rationale                                                                                                                                                                                             |
| -------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **T0 — all agents**                          | Every agent, including read-only reviewers                        | `read_documentation`, `get_session` (no id: describes the caller)                                                                           | Read-only; no side effects. `get_session` with an id reads another session's metadata (title, status, repo, model), not its transcript; low sensitivity. Human agreed these are safe for everyone.    |
| **T0\***                                     | Agents that name any deferred tool                                | `ToolSearch`                                                                                                                                | Discovery only. **UNVERIFIED:** whether the allowlist still blocks calling a tool loaded this way. Verify before making universal.                                                                    |
| **T1 — PR / task follow-through owner**      | EM; Software-Engineer only if it drives its own PR                | `subscribe_pr_activity`, `unsubscribe_pr_activity`, `send_later`                                                                            | Affect only this session; reversible. Risks: wake noise, runaway re-arming. Grant all three or none. Avoid two agents subscribing to the same PR.                                                     |
| **T2**                                       | EM                                                                | `list_repos`                                                                                                                                | Read-only, but reveals reachable repos.                                                                                                                                                               |
| **T3 — orchestrators, with a stated reason** | EM only, and only if `Agent`/`SendMessage` don't already cover it | `list_sessions`, `list_events`, `get_event`, `create_session`, `send_message`, `interrupt_session`, `set_session_title`, `set_session_tags` | Read tools expose other sessions' transcripts; write tools start/control other sessions (blast radius multiplies). EM already has `Agent`/`ListAgents`/`SendMessage`, so this probably duplicates it. |
| **T4 — scope-widening, per case**            | Needs human review; no standing grant                             | `add_repo`, `register_repo_root`                                                                                                            | Widens which repos the session can read and (with push) change.                                                                                                                                       |
| **T5 — persistent / external, human-driven** | Nobody by default                                                 | `create/update/delete/fire/get/list_trigger`, `watch_url`, `unwatch_url`, `archive_session`, `unarchive_session`, `list_environments`       | Outlive the session, run unattended, open inbound channels, or change account state.                                                                                                                  |

### Proposed groups (grant together)

| Group                 | Members                                                                   | Note                                                                                         |
| --------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| session-introspection | `read_documentation`, `get_session`                                       | T0.                                                                                          |
| pr-follow-through     | `subscribe_pr_activity`, `unsubscribe_pr_activity`, `send_later`          | T1.                                                                                          |
| repo-scope            | `list_repos` (T2) separate from `add_repo` + `register_repo_root` (T4)    | `add_repo` is useless without `register_repo_root`; `list_repos` stays separate (read-only). |
| session-control       | create/send/interrupt/list sessions and events, title/tags                | T3.                                                                                          |
| routines              | trigger CRUD/fire, `watch_url`/`unwatch_url`                              | T5.                                                                                          |
| ungrouped             | `ToolSearch`; `archive_session`, `unarchive_session`, `list_environments` |                                                                                              |

### Per-agent baseline (proposed, subject to plan/ADR review)

| Agent                  | T0  | T0\*           | T1                       | T2  | T3     | T4     | T5  |
| ---------------------- | --- | -------------- | ------------------------ | --- | ------ | ------ | --- |
| engineering-manager    | yes | yes            | yes                      | yes | review | review | no  |
| software-engineer      | yes | yes            | review (decide PR owner) | no  | no     | no     | no  |
| principal-engineer     | yes | only if needed | no                       | no  | no     | no     | no  |
| architect              | yes | only if needed | no                       | no  | no     | no     | no  |
| engineering-researcher | yes | only if needed | no                       | no  | no     | no     | no  |

Current agent skills that touch this area: `engineering-manager` and `software-engineer` both list `skill/pr-stewardship`; EM preloads `task-orchestration` and `worktree-management`. `skill/pr-stewardship` says it does one check-and-act pass per invocation and "does not loop or sleep" (verified), and it accepts either `ai-git gh-*` or the GitHub MCP for access.

---

## 3. Adapter findings: "nothing here" is encoded differently (verified)

|                                                      | Claude (`lib/harnesses/claude.js`)                           | Kiro (`lib/harnesses/kiro.js`)      |
| ---------------------------------------------------- | ------------------------------------------------------------ | ----------------------------------- |
| Verified: no native equivalent, grant nothing        | `[]` (empty cluster)                                         | `null`                              |
| Mapped value shape                                   | Array of native names (cluster)                              | Single string                       |
| Name not in map (e.g. `@server/tool`)                | Passed through as `mcp__server__tool` (`mapMcpToolRef`)      | Passed through unchanged            |
| Single-name helper `mapToolName` on a "nothing" tool | **Returns the generic name unchanged** (`mapped[0] ?? name`) | Returns `null`                      |
| Authoritative path                                   | `mapAgentTools` (empty cluster expands to nothing)           | `transformAgent` filters out `null` |

Problems: two encodings for one state (a Copilot adapter would invent a third); the Claude helper leaks the generic name where Kiro returns `null`; three states exist (mapped / verified-unsupported / unknown-pass-through) but none is named; unknown **bare** names (e.g. a typo) pass through silently on both; **neither adapter reports a dropped tool**, so unsupported tools are silent. Generic vocabulary (`lib/constants.js` `TOOLS`): read, write, shell, web_search, web_fetch, grep, glob, code, subagent, plan, ask_user, task, skill. `HARNESSES = ['kiro', 'claude']`; README lists Copilot as "Planned".

Relevant constraints already in the repo: `docs/decisions/0002-steering-schema-harness-scoping.md` ("No Kiro/Copilot/Claude-specific concepts in source steering files"; no per-harness fields); `docs/decisions/0004-dag-tool-as-mcp-server.md` (`@server/tool` convention reused across harnesses); `docs/architecture/05_02_harness_adapters.md` (the arc42 section describing these adapters; the Doc-Update Acceptance Gate applies).

---

## 4. Cross-harness parity (researched, 2026-10-01)

**Evidence caveats:** the researcher could not fetch `docs.github.com`, `kiro.dev`, `github.blog` or `code.visualstudio.com` directly; it used the `github/docs` source repo on raw.githubusercontent.com, search snippets, and GitHub issues/PRs. Fetch tools return model-written summaries, not verbatim text. Kiro confidence is medium unless noted. These are public-preview, fast-moving areas.

**Headline:** no harness has an agent-callable equivalent of the CCR "subscribe / wake me later / attach repos" tool set. Below T0, everything is a platform or human feature on Copilot and Kiro.

| CCR capability                                  | Copilot (cloud/CLI)                                                                                                                                                                                                             | Kiro                                                                                                                                                        | Shared?                                               |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `read_documentation`                            | CLI only: `fetch_copilot_cli_documentation` (third-party list, medium); none found for the cloud agent                                                                                                                          | `introspect` tool (medium); `/guide` help agent is a human command                                                                                          | Partly; equivalence not proven                        |
| `get_session`                                   | Absent as a cloud-agent tool. Humans use "View session"/Agents tab; REST `GET /agents/repos/{owner}/{repo}/tasks/{task-id}`; CLI `session_store_sql`/`/chronicle`                                                               | UNVERIFIED                                                                                                                                                  | No                                                    |
| PR subscribe/unsubscribe, `send_later`          | **Platform feature:** human `@copilot` on a PR (write access, open PRs) resumes the same session; automations can fire on PR opened/synchronized. No self-schedule tool. `/schedule` for Copilot CLI is an open feature request | **Platform feature:** autonomous agent reacts to review feedback; `/kiro` commands are human. Scheduling only in Kiro Crew                                  | Capability shared; agent-callable tool is Claude-only |
| `watch_url`                                     | No arbitrary inbound webhook trigger (triggers: schedule, issue created, PR opened, PR synchronized); Actions can start a session via REST (user-to-server tokens)                                                              | Kiro Crew only (webhooks, heartbeats, HTTP trigger)                                                                                                         | No                                                    |
| `list_repos`/`add_repo`/`register_repo_root`    | Absent by design: single repo, one PR per task                                                                                                                                                                                  | Human/CLI (`--repo`, `/repo`); agent-callable UNVERIFIED                                                                                                    | No                                                    |
| Session control (create/send/interrupt/list...) | REST create/list/get, `gh agent-task`, human UI; agent-callable only via GitHub MCP `create_pull_request_with_copilot`/`get_copilot_job_status`; no interrupt endpoint found                                                    | Agent tools in **Kiro Crew** (separate open-source product, deny-by-default via `agent.session_control`): `session_create/send/steer/stop/close`, tag tools | No (Kiro Crew is closest)                             |
| Trigger/routine CRUD                            | **Automations** (UI-defined; schedule/issue/PR triggers; single repo; no documented API; sessions visible to repo readers)                                                                                                      | Crew cron jobs and workflows (separate product)                                                                                                             | Concept shared; tool not                              |
| `ToolSearch`                                    | VS Code virtual tools / deferred loading (platform optimization; snippets only)                                                                                                                                                 | UNVERIFIED; nothing found                                                                                                                                   | No                                                    |

### Allowlist expression per harness (researched)

- **Copilot:** custom agents are `.github/agents/*.agent.md` with `tools` frontmatter (list or comma string; omitted or `["*"]` = all; `[]` = none). Aliases (case-insensitive) accept Claude-style names: `execute` (Bash/shell), `read`, `edit` (Edit/MultiEdit/Write/NotebookEdit), `search` (Grep/Glob), `agent` (custom-agent/Task), `web` (WebSearch/WebFetch), `todo` (TodoWrite). MCP as `server/*` or `server/tool`. On the cloud agent `web`/`todo`, `handoffs`, `argument-hint` are ignored. Whether agent-profile `mcp-servers` is honored on the cloud agent is **UNVERIFIED** (two fetch summaries conflicted). CLI permissions are a separate layer (`--allow-tool`/`--deny-tool`, deny wins).
- **Kiro:** `tools` takes tool names, category tags (read, write, shell, web, subagent, knowledge, todo_list) and selectors (`@builtin`, `@mcp`, `@server`, `@server/tool`, `*`); `allowedTools` (auto-approval), `excludedTools`, `toolAliases`, `permissions`, `mcpServers`. Visibility (`tools`) and authorization (`allowedTools`/`permissions`) are separate systems in v3.
- **Both** support native grouping (aliases/tags). Names diverge, so adapters must translate, not pass through.

### Copilot cloud facts that limit design

Single repo, one branch and one PR per task, 59-minute session cap, GitHub-hosted repos only; `@copilot` limited to write-access users and open PRs; MCP tools run without approval prompts; automation sessions are visible to anyone with repo access (no secrets in prompts); `copilot-setup-steps.yml` job must be named `copilot-setup-steps`.

### Silent-failure risks to test for

Copilot ignores unsupported frontmatter on the cloud agent. Kiro can silently reject a custom agent with an unrecognised config value (Kiro issue #11411) and a report exists of the IDE giving custom agents almost no tools despite `tools: ["*"]` (Kiro issue #11186). One issue claims Kiro IDE ignores an agent's `hooks` field while the CLI honors it (apm #2671). Adapter tests must assert the **resolved tool set**, not just file validity.

### Sources

- Copilot custom agents configuration: https://raw.githubusercontent.com/github/docs/main/content/copilot/reference/custom-agents-configuration.md
- Copilot cloud agent concept/limits: https://raw.githubusercontent.com/github/docs/main/content/copilot/concepts/agents/cloud-agent/about-cloud-agent.md
- Copilot automations: https://raw.githubusercontent.com/github/docs/main/content/copilot/concepts/agents/cloud-agent/about-automations.md and https://raw.githubusercontent.com/github/docs/main/content/copilot/how-tos/use-copilot-agents/cloud-agent/create-automations.md
- Copilot agent-tasks REST API: https://github.com/github/docs/blob/main/content/copilot/how-tos/use-copilot-agents/cloud-agent/use-cloud-agent-via-the-api.md
- Copilot cloud agent via GitHub MCP: https://raw.githubusercontent.com/github/docs/main/content/copilot/how-tos/use-copilot-agents/cloud-agent/use-cloud-agent-with-mcp.md
- Copilot agent management/steering: https://raw.githubusercontent.com/github/docs/main/content/copilot/concepts/agents/cloud-agent/agent-management.md
- Copilot CLI tool permissions: https://raw.githubusercontent.com/github/docs/main/content/copilot/how-tos/copilot-cli/use-copilot-cli/allowing-tools.md
- Copilot CLI `/schedule` request: https://github.com/github/copilot-cli/issues/2056
- Kiro built-in tools: https://kiro.dev/docs/tools/ and https://kiro.dev/docs/reference/built-in-tools/
- Kiro custom-agent config: https://kiro.dev/docs/custom-agents/configuration-reference/
- Kiro cloud sessions: https://kiro.dev/docs/cloud-sessions/
- Kiro autonomous agent (GitHub): https://kiro.dev/docs/autonomous-agent/github/
- Kiro Crew repo and session-control PR: https://github.com/kirodotdev/KiroCrew and https://github.com/kirodotdev/KiroCrew/pull/12508
- Kiro issues: https://github.com/kirodotdev/Kiro/issues/11411, https://github.com/kirodotdev/Kiro/issues/11186, https://github.com/kirodotdev/Kiro/issues/7995
- apm #2671 (Kiro agent file format claims): https://github.com/microsoft/apm/issues/2671

---

## 5. Conclusions for planning

1. **T1-T5 are Claude-only capabilities.** Do not assume Copilot or Kiro can express them as agent tools. Their adapters should resolve every such group to `unsupported`; the behavior (react to PR feedback) is a platform setup on those harnesses, documented separately.
2. **Keep the harness-neutral baseline to the 13 existing generic names**, which map to all three harnesses.
3. **Use generic group names, not per-harness yaml fields.** This follows the existing `null`/`[]` precedent for tools that don't match and respects ADR 0002. (This reverses an earlier suggestion in this investigation not to add generic names; the adapter precedent made the group-name approach the better fit.)
4. **Standardize "nothing here" first**, because groups, baselines and a Copilot adapter all build on it.
5. **Make skills degrade gracefully** when a tool group is absent (e.g. `skill/pr-stewardship` reports once and names the human route rather than assuming a tool).

## 6. Decisions for the human / EM / Architect

| #   | Decision                                                                                                                                        | Recommendation                                                                                                                                                         |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Abstraction: (A) generic group names mapped per adapter, (B) explicit `@server/tool` names plus an adapter filter, (C) per-harness yaml section | A. C conflicts with ADR 0002. B only after confirming Kiro tolerates the foreign name. This is a contested, costly-to-reverse fork: **Architect ADR**, human approval. |
| 2   | Who owns a PR subscription: EM only, or Software-Engineer too                                                                                   | EM only; SE gets T1 only with an explicit owner rule                                                                                                                   |
| 3   | Do T3 and above exist at all, given `subagent` (Agent/ListAgents/SendMessage)                                                                   | Likely drop T3; decide in the plan                                                                                                                                     |
| 4   | Where the Copilot "follow-through" equivalent is specified (automations, `@copilot`)                                                            | Separate future Feature; out of scope here                                                                                                                             |
| 5   | Whether `ToolSearch` can be baseline                                                                                                            | Only after verifying allowlist behavior                                                                                                                                |

## 7. Open / UNVERIFIED items (settle during planning, do not assume)

- Whether subagents inherit these tools, and how wakes / `send_later` behave when called from a subagent.
- Whether the allowlist still blocks calling a tool loaded via `ToolSearch`.
- What a Kiro install does with an unknown `@claude-code-remote/...` entry (Kiro has reports of silently rejecting agents with unrecognised values). **Check before any yaml edit that adds such a name.**
- Whether `mapMcpToolRef` in `lib/harnesses/claude.js` correctly maps `claude-code-remote` (hyphenated) to `mcp__claude-code-remote__*`.
- Whether `aif validate` already rejects unknown bare tool names.
- Copilot: whether any cloud-agent tool describes its own session; whether a cancel/interrupt endpoint exists; whether agent-profile `mcp-servers` is honored on the cloud agent.
- Kiro: whether `--repo` is agent-callable; a ToolSearch analogue; Kiro `introspect` vs `get_session` equivalence; the exact 14th Kiro Crew tool name.
- Whether the youtrack host should be allowed in the network policy (`environment.network`) or the youtrack tools dropped from the EM until then.

## 8. Suggested Task decomposition (for EM to refine)

1. **Shared tool-mapping contract (first):** one `UNSUPPORTED` marker and a three-state resolver (`mapped` / `unsupported` / `passthrough`) in `lib/harnesses/base.js`; mapped values are arrays on both adapters; bare unknown names rejected, only `@server/tool` may pass through; one install report of dropped tools per agent and harness; one shared contract test run against every adapter.
2. Generic group names in `lib/constants.js` (`session_info`, `pr_follow_through` first; others only when an agent needs one).
3. Claude adapter: group-to-`mcp__claude-code-remote__*` clusters and a baseline set every agent receives (T0).
4. Kiro adapter: groups map to unsupported; optional later `introspect` mapping only after verified.
5. Resolved-tool-set tests per agent and harness; extend `KNOWN_NATIVE_TOOLS` in `tests/unit/claude-adapter.test.js`.
6. Agent yaml updates (EM T1/T2; per-agent baseline) once the ADR settles the abstraction.
7. Graceful-degradation changes to `skill/pr-stewardship` (and `skill/task-orchestration` if it assumes the tools).
8. Update `docs/architecture/05_02_harness_adapters.md` (`key_files`, mapping description) per the Doc-Update Acceptance Gate.
9. Re-run the PR 83 scenario in a fresh cloud session as the EM to confirm subscribe and wakes work.
10. Out of scope: building the Copilot adapter; changing GitHub MCP exposure; youtrack network policy.
