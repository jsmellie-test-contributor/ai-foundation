# AIF-010 Verification Guide (human-run)

Plan: [`plan.md`](./plan.md). Run Parts A and B before the dependent work starts, and Part C after implementation. Record every result in the tables, then report back to the Engineering Manager. Nothing here changes this repo; use scratch directories and a throwaway PR.

Do not skip a step or merge two steps. If an observation matches none of the listed outcomes, write down exactly what you saw and stop.

## Part A: Claude Code cloud session (answers Q4 `ToolSearch`, Q5 subagent inheritance)

### Setup

1. Create a scratch repo you can attach to a Claude Code cloud session. On a branch `aif010-verify`, make a one-line change and open a draft PR to the default branch. Note the PR number.
2. Create `.claude/agents/verify-a.md`:

   ```
   ---
   name: verify-a
   description: Verification agent A
   tools: Read, Agent, mcp__claude-code-remote__get_session, mcp__claude-code-remote__subscribe_pr_activity, mcp__claude-code-remote__unsubscribe_pr_activity
   ---
   Follow the user's instructions exactly and report each tool call's raw outcome (success, error text, or "tool not available").
   ```

3. Create `.claude/agents/verify-b.md` (subagent, no claude-code-remote tools): same format, `name: verify-b`, `tools: Read`.
4. Create `.claude/agents/verify-c.md` (subagent, explicit grants): `name: verify-c`, `tools: Read, mcp__claude-code-remote__get_session, mcp__claude-code-remote__subscribe_pr_activity`.
5. Create `.claude/agents/verify-ts.md`: `name: verify-ts`, `tools: Read, ToolSearch`.
6. Create `.claude/agents/verify-nots.md` (control): `name: verify-nots`, `tools: Read`.
7. Commit and push these to the default branch, then start a fresh Claude Code cloud session on the repo.

### A1: does the allowlist block a tool loaded through `ToolSearch`? (Q4)

1. Run agent `verify-ts` as the main agent (for example `claude --agent verify-ts`, or the agent picker).
2. Ask: "List the tools you can call, by exact name. Then call ToolSearch with the query `subscribe_pr_activity` and report the result. If a tool by that name was returned or loaded, call it for PR `<number>` of this repo and report the raw outcome."
3. Repeat steps 1-2 with `verify-nots`.
4. Fill in:

| Agent       | Tools it listed | ToolSearch result | Call to `subscribe_pr_activity` |
| ----------- | --------------- | ----------------- | ------------------------------- |
| verify-ts   |                 |                   |                                 |
| verify-nots |                 |                   |                                 |

Interpretation: if `verify-ts` can call a tool its allowlist omits, the allowlist is bypassable through `ToolSearch` and it must not be in the baseline of any restricted agent. If the call is blocked, `ToolSearch` is discovery only.

### A2: does a subagent inherit these tools? (Q5)

1. Run agent `verify-a` as the main agent.
2. Ask: "Dispatch subagent `verify-b`. Tell it to list its tools by exact name, then call `get_session` with no id. Report its answer verbatim."
3. Ask: "Dispatch subagent `verify-c` the same way." Record the result.
4. Ask `verify-a` itself: "Call get_session with no id. Report the result."
5. Fill in:

| Agent                                                 | Tools it reported | `get_session` outcome |
| ----------------------------------------------------- | ----------------- | --------------------- |
| verify-a (main, has the tool)                         |                   |                       |
| verify-b (subagent, `Read` only, parent has the tool) |                   |                       |
| verify-c (subagent, tool listed explicitly)           |                   |                       |

Interpretation: `verify-b` succeeding means subagents inherit the parent's tools regardless of their own list. `verify-c` succeeding while `verify-b` fails means each subagent needs its own grant.

### A3: where do wakes go when a subagent subscribes? (Q5, feeds Q2)

1. Run `verify-a` as the main agent. Ask it to dispatch `verify-c` with: "Call subscribe_pr_activity for PR `<number>`, report the raw result, then finish." Let `verify-c` finish and return.
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
