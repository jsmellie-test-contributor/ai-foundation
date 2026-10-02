# AIF-010 Verification Guide (human-run)

Plan: [`plan.md`](./plan.md). Run Parts A and B before the dependent work starts, and Part C after implementation. Record every result in the tables, then report back to the Engineering Manager. Nothing here changes this repo; use scratch directories and a throwaway PR.

Do not skip a step or merge two steps. If an observation matches none of the listed outcomes, write down exactly what you saw and stop.

## Part A: Claude Code cloud session (answers Q4 `ToolSearch`, Q5 subagent inheritance)

### Setup

1. Use a repo you can attach to a Claude Code cloud session. Branch a verification base branch (for example `AIF-010-verification`), then a feature branch off it (for example `aif010/testA`). On the feature branch, add a dummy script (for example `scratch/dummy.js`) and open a draft PR into the base branch. Note the PR number.
2. Create `.claude/agents/verify-a.md`:

   ```
   ---
   name: verify-a
   description: Verification agent A
   tools: Read, Agent, mcp__claude-code-remote__get_session, mcp__claude-code-remote__subscribe_pr_activity, mcp__claude-code-remote__unsubscribe_pr_activity
   ---
   I am verify-a. If asked which agent I am, I answer "verify-a".
   Follow the user's instructions exactly and report each tool call's raw outcome (success, error text, or "tool not available").
   ```

3. Create `.claude/agents/verify-b.md` (subagent, no claude-code-remote tools): same format, `name: verify-b`, `tools: Read`. Every agent file has an identity line in its prompt (`I am verify-<name>. If asked which agent I am, I answer "verify-<name>".`), so a session can be asked which agent loaded.
4. Create `.claude/agents/verify-c.md` (subagent, explicit grants): `name: verify-c`, `tools: Read, mcp__claude-code-remote__get_session, mcp__claude-code-remote__subscribe_pr_activity`.
5. Create `.claude/agents/verify-ts.md`: `name: verify-ts`, `tools: Read, ToolSearch`.
6. Create `.claude/agents/verify-nots.md` (control): `name: verify-nots`, `tools: Read`.
7. Commit and push these to the base branch.
8. Cloud sessions have no agent picker or `--agent` flag. Select the main agent with `.claude/settings.json` on the base branch (commit and push it):

   ```
   {
     "agent": "verify-ts"
   }
   ```

   Change the value between runs (`verify-ts`, `verify-nots`, `verify-a`) and push each time. The setting is read at session start, so start a fresh cloud session on the base branch after every change. If a session does not see the latest commit, push an empty commit or use a new branch cut from the base branch.

9. In each fresh session, first ask "Which agent are you?" and confirm the answer matches the setting before running the test. If it names a different agent, stop and record what it said.

### A1: does the allowlist block a tool loaded through `ToolSearch`? (Q4)

1. Set `"agent": "verify-ts"` in `.claude/settings.json` (see Setup step 8), start a fresh session, and confirm its identity.
2. Ask: "List the tools you can call, by exact name. Then call ToolSearch with the query `subscribe_pr_activity` and report the result. If a tool by that name was returned or loaded, call it for PR `<number>` of this repo and report the raw outcome."
3. Repeat steps 1-2 with `verify-nots` (set `"agent": "verify-nots"`, push, start a fresh session).
4. Fill in:

| Agent       | Tools it listed         | ToolSearch result                                                                               | Call to `subscribe_pr_activity`                     |
| ----------- | ----------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| verify-ts   | `Read` only (first run) | Not called: `ToolSearch` is not in the session's tool list, so "tool not available" (first run) | Not called: the tool was never surfaced (first run) |
| verify-nots | `Read` only (first run) | Not called: `ToolSearch` is not in the session's tool list, so "tool not available" (first run) | Not called: the tool was never surfaced (first run) |

Observed so far: with `tools: Read, ToolSearch` (`verify-ts`) and with `tools: Read` (`verify-nots`), both sessions listed only `Read`, and neither could call `ToolSearch` or `subscribe_pr_activity`. The difference is discovery: `verify-ts` was shown a list of deferred tools (including `subscribe_pr_activity`) and `verify-nots` was shown none. Working hypothesis, not yet tested: naming `ToolSearch` in `tools:` makes the harness advertise deferred tools to the agent even though the agent cannot call `ToolSearch` or load them. That would make `ToolSearch` discovery-only, but it also means it leaks the names of tools the allowlist omits. Q4 (whether `ToolSearch` can bypass an allowlist) remains untested, because no session could call it.

Interpretation: if `verify-ts` can call a tool its allowlist omits, the allowlist is bypassable through `ToolSearch` and it must not be in the baseline of any restricted agent. If the call is blocked, `ToolSearch` is discovery only.

### A2: does a subagent inherit these tools? (Q5)

1. Set `"agent": "verify-a"` in `.claude/settings.json`, start a fresh session, and confirm its identity.
2. Ask: "Dispatch subagent `verify-b`. Tell it to list its tools by exact name, then call `get_session` with no id. Report its answer verbatim."
3. Ask: "Dispatch subagent `verify-c` the same way." Record the result.
4. Ask `verify-a` itself: "Call get_session with no id. Report the result."
5. Fill in:

| Agent                                                 | Tools it reported                                                                                                                                                                      | `get_session` outcome                                                                                    |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| verify-a (main, has the tool)                         | `Read`, `Agent`, `mcp__claude-code-remote__get_session`, `mcp__claude-code-remote__subscribe_pr_activity`, `mcp__claude-code-remote__unsubscribe_pr_activity`; no deferred tools shown | Succeeded: returned session id, title, status, source repo and branch, model, tags, `turn_handoff.tools` |
| verify-b (subagent, `Read` only, parent has the tool) | `Read` only; deferred tools "may exist" but none surfaced                                                                                                                              | Not called: "tool not available"                                                                         |
| verify-c (subagent, tool listed explicitly)           | `Read`, `mcp__claude-code-remote__get_session`, `mcp__claude-code-remote__subscribe_pr_activity`                                                                                       | Succeeded: same session details as verify-a                                                              |

Interpretation: `verify-b` succeeding means subagents inherit the parent's tools regardless of their own list. `verify-c` succeeding while `verify-b` fails means each subagent needs its own grant.

Observed (run on `AIF-010-verification-A2-1`): `verify-b` did not inherit `get_session` from its parent, and `verify-c` had it only because its own `tools:` listed it. So each subagent needs its own grant. Both `verify-a` and `verify-c` reported the same session (`session_01G2b7mm2knuthNsbJZiQYwD`, origin `desktop_app`), and `get_session`'s `turn_handoff.tools` field lists a different tool set (Bash, Write, Edit, Agent, and others) from what the agent can call.

### A3: where do wakes go when a subagent subscribes? (Q5, feeds Q2)

1. With `verify-a` as the main agent (as in A2), ask it to dispatch `verify-c` with: "Call subscribe_pr_activity for PR `<number>`, report the raw result, then finish." Let `verify-c` finish and return.
2. As a human, add a comment on the PR, then wait 2 minutes.
3. Fill in:

| Observation                                                    | Result |
| -------------------------------------------------------------- | ------ |
| Did `verify-c`'s subscribe call succeed?                       |        |
| Did a `<wake>` arrive in the main (`verify-a`) session?        |        |
| Did anything arrive anywhere else? Describe.                   |        |
| After `verify-c` finished, did the subscription still deliver? |        |

4. Repeat with `verify-a` subscribing directly (ask it to call `subscribe_pr_activity` itself), add another PR comment, and record whether the wake arrives.
5. Ask `verify-a` to call `unsubscribe_pr_activity` for the PR and record the outcome. Close the throwaway PR and delete the branch.

## Part B: Kiro and a foreign `@claude-code-remote/...` entry (answers Q6)

Exact Kiro CLI/IDE commands are not documented in this repo. Use whichever you normally use to list and start custom agents, and record what you used.

### Setup

1. Create a scratch directory outside this repo and open it in Kiro. Create `.kiro/agents/verify-kiro-control.json`:

   ```
   {
     "name": "verify-kiro-control",
     "description": "Control agent without a foreign tool",
     "prompt": "List the tools you can call, by exact name, then stop.",
     "tools": ["read", "grep"],
     "allowedTools": ["read"],
     "resources": []
   }
   ```

2. Create `.kiro/agents/verify-kiro-foreign.json`: identical, with `"name": "verify-kiro-foreign"` and `"tools": ["read", "grep", "@claude-code-remote/subscribe_pr_activity"]`.
3. Create `.kiro/agents/verify-kiro-foreign-allowed.json`: as the foreign one, with `"name": "verify-kiro-foreign-allowed"` and `"allowedTools": ["read", "@claude-code-remote/subscribe_pr_activity"]`.

### Steps (for each of the three agents, in the Kiro IDE and the Kiro CLI if you use both)

1. Restart Kiro so it re-reads `.kiro/agents/`.
2. Open the agent list. Is the agent listed? Is there a warning or error indicator?
3. Start a session with that agent and ask: "List the tools you can call, by exact name."
4. Ask it to read any file with `read`. Does a basic tool still work?
5. Fill in:

| Agent                       | Listed? | Warning/error text (exact) | Tools it reported | `read` works? |
| --------------------------- | ------- | -------------------------- | ----------------- | ------------- |
| verify-kiro-control         |         |                            |                   |               |
| verify-kiro-foreign         |         |                            |                   |               |
| verify-kiro-foreign-allowed |         |                            |                   |               |

6. Check Kiro's log or output panel for lines naming these agent files and copy any relevant ones here.

Interpretation: a foreign agent that is missing from the list, listed with no tools, or flagged means a foreign `@server/tool` must never reach Kiro, so the adapter must drop it. If both foreign agents load with their normal tools, passthrough is tolerated, but dropping stays the plan's default.

## Part C: PR 83 scenario re-run (answers Q9)

Run after the implementation Tasks are merged. Use a throwaway PR in a repo the session can access.

1. On the merged code run `node bin/aif.js install -B engineering -H claude`, then the same with `-H kiro`. Record the install output. Expected: the Kiro run lists a dropped line for every group, and the Claude run drops none of the groups the EM holds.
2. Open `~/.claude/agents/engineering-manager.md` and record its `tools:` line. Confirm it contains `mcp__claude-code-remote__subscribe_pr_activity`, `mcp__claude-code-remote__unsubscribe_pr_activity`, `mcp__claude-code-remote__send_later`, `mcp__claude-code-remote__get_session` and `mcp__claude-code-remote__read_documentation`. Confirm the T0 pair also appears in at least one other installed agent.
3. Start a fresh Claude Code cloud session as `engineering-manager` on the repo and open the throwaway PR.
4. Ask the EM: "Subscribe to activity on PR `<number>`." Record whether the call succeeds.
5. As a human, add the following in order, waiting 2 minutes after each: an issue comment, an inline review comment, a review. Record each wake.
6. Ask the EM: "Schedule a check-in on this PR in 5 minutes using `send_later`." Wait and record whether it wakes.
7. Fill in:

| Step                | Expected                   | Observed |
| ------------------- | -------------------------- | -------- |
| subscribe           | success                    |          |
| issue comment wake  | `<wake>` received          |          |
| inline comment wake | `<wake>` received          |          |
| review wake         | `<wake>` received          |          |
| `send_later` wake   | wake after about 5 minutes |          |

8. Ask the EM to unsubscribe, then close the PR. Report the table, the EM's `tools:` line, and both install outputs.
