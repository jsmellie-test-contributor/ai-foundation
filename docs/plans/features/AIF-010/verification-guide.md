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

### A3: how do PR and `send_later` wakes reach a restricted agent? (Q5, feeds Q2)

The original A3 plan (a subagent subscribes, a human comments, watch where the wake goes) could not be read until the wake path itself was understood. The runs below established that path. The subagent-routing question is still open and is listed at the end.

How to read results: use `RemoteTrigger` `get_run_log` with the cloud session ID. It returns timestamped events and does not depend on the UI, which lagged badly. Wake messages carry their own fire time in a system reminder or a `current-time` attribute.

#### A3a: `send_later` reaches a restricted agent

Branch `AIF-010-verification-A3-2`, main agent `verify-a` (tools: `Read`, `Agent`, `get_session`, `subscribe_pr_activity`, `unsubscribe_pr_activity`, `send_later`). Asked to schedule a wake and then left idle.

| Test | Scheduled for (UTC) | Fired    | Delivered to the session    | Agent replied |
| ---- | ------------------- | -------- | --------------------------- | ------------- |
| 1    | 14:26:00            | 14:26:39 | 14:26:39.446 as a user turn | 14:26:41      |
| 2    | 14:38:00            | 14:38:23 | 14:38:23.620 as a user turn | 14:38:25      |

Result: `send_later` wakes work for a restricted agent, with no extra tools. The only delay is server fire jitter of 23 to 39 seconds, matching the warning shown when scheduling a routine. Delivery into the session is immediate. The earlier impression of a late wake was the UI, not the session. The wake text includes "This task fired at ... UTC", so an agent without `Bash` can read the time. The agent said it could not, and was wrong.

#### A3b: PR events need `ReadNotifications` and go to the last subscriber

PR 86 (`aif010/testB` into `AIF-010-verification`, not a draft). `subscription.created` arrives as an ordinary user turn. Every later PR event arrives as a queued notification that the agent must read with `ReadNotifications`.

| Session (agent)                     | Subscribed (UTC)        | Last subscriber at event time? | Event                             | Woke?                                    |
| ----------------------------------- | ----------------------- | ------------------------------ | --------------------------------- | ---------------------------------------- |
| `verify-a` (no `ReadNotifications`) | 14:56:42                | yes (only one)                 | comments, reviews, 15:01 to 15:12 | No; session also showed `disconnected`   |
| default agent                       | 15:10:13                | yes                            | inline comment, 15:12:47          | Yes, via `ReadNotifications`             |
| `verify-e`                          | 15:30:39                | no (`verify-f` 2 s later)      | inline comment, 15:33:46          | No                                       |
| `verify-f`                          | 15:30:41                | yes                            | inline comment, 15:33:46          | Yes                                      |
| default agent                       | 15:37:19 (resubscribed) | yes                            | inline comment, 15:38:27          | Yes                                      |
| `verify-f`                          | (15:30:41)              | no                             | inline comment, 15:38:27          | No                                       |
| `verify-e`                          | 15:40:53 (resubscribed) | yes                            | inline comment, 15:42:35          | Yes                                      |
| `verify-e`, disconnected            | (15:40:53)              | yes                            | inline comment, 15:49:21          | Yes, after a fresh sandbox was allocated |

Agents: `verify-e` is `verify-a` plus `ReadNotifications`. `verify-f` is `verify-e` plus `ToolSearch`, which was named in its `tools:` but never callable. The `verify-f` tools line is therefore not a separate result.

Findings:

1. A restricted agent needs `ReadNotifications` in its `tools:`. `verify-e` with it, and no `ToolSearch`, woke on a PR event. Whether `verify-a` without it fails for that reason alone is not isolated: it was also not the last subscriber and was disconnected. The tool is listed as core and callable in the default session, not deferred.
2. Only the most recent subscriber to a PR received events. Subscribing again moves delivery to the new session, and the earlier session goes silent, including a session that is still live. `subscribe_pr_activity` returns the same text either way, and each call queues a new `subscription.created`. Inferred from the table above, not from documentation.
3. A disconnected session is woken by a PR event. Tab A had been idle with no messages and was reported disconnected before the comment (by the human, from the session list). The log shows "Allocating sandbox" at 15:49:21 and then `ReadNotifications` with no user message before it. Sessions go disconnected after roughly 13 minutes idle.
4. Event kinds seen delivered: `pull_request_review_comment.created` and `pull_request_review.submitted` (state `commented`). The human later reported that every comment and review type woke a working subscriber in their own testing, general (issue) comments, inline comments and all review states included. That report is not checked against a log here: the logs read in these runs show only the two kinds above. CI events were not tested.
5. The desktop app's session list appears to show which session holds the subscription (a green branch icon on the subscriber, a hollow dot on the others). One observation, not confirmed.

#### A3c: `send_message` reaches a restricted agent without `ReadNotifications`

The default session sent a cross-session message to two sessions that had been idle and disconnected.

| Receiver                                                                   | Has `ReadNotifications`? | Sent (UTC) | Arrival                                                                                                            |
| -------------------------------------------------------------------------- | ------------------------ | ---------- | ------------------------------------------------------------------------------------------------------------------ |
| `verify-a`, `session_01QgfFCVU9z3W2H5RibM5jLL`, disconnected about an hour | No                       | 15:56:55   | Inline, as a `<cross-session-message from-session=...>` user turn; fresh sandbox allocated; read with no tool call |
| `verify-f` (Tab B)                                                         | Yes                      | 15:56:06   | Queued; fresh sandbox, then `ReadNotifications` with no user message before it                                     |

Findings: `send_message` wakes a restricted, disconnected session without `ReadNotifications`. The harness appears to deliver inline when the tool is absent and through the queue when it is present (inferred from two sessions). `verify-a` could not reply because it lacks `send_message`, so a receiver needs that tool only to answer.

This also supports finding 1 in A3b: `verify-a` was the only subscriber to PR 86 from 14:56 to 15:10, an inline comment was posted at 15:01:42, and nothing was delivered, yet the same session was woken by `send_message` an hour later. Disconnect was therefore not what blocked PR events. Still not isolated: a PR event has not been sent to `verify-a` with the tool added.

#### A3d: does a subagent's PR subscription deliver to the main session? (Q2, Q5)

Setup: base `AIF-010-verification` with `.claude/agents/verify-e.md` (main; `Read`, `Agent`, `get_session`, `subscribe_pr_activity`, `unsubscribe_pr_activity`, `send_later`, `ReadNotifications`) and `.claude/agents/verify-g.md` (subagent; `Read`, `subscribe_pr_activity`, `unsubscribe_pr_activity`, `ReadNotifications`). Run branch `AIF-010-verification-A3-1` sets `"agent": "verify-e"`. Throwaway PR C: `aif010/testC` into the base, ready for review. No other session may be subscribed to it.

1. Fresh cloud session on the run branch. Ask which agent it is and for its tool list. Expected: `verify-e`, with `ReadNotifications`.
2. Dispatch `verify-g` to subscribe to the PR and finish. Record the subscribe result and whether the `subscription.created` event reaches the main session or the subagent.
3. After `verify-g` has finished, post an inline comment on the PR. Wait 3 minutes. Record whether the main session wakes, and whether it reads the event with `ReadNotifications`.
4. Have the main agent subscribe itself, then dispatch `verify-g` to subscribe again. Post a second comment. Record whether the event arrives once or twice, and where.
5. Pull the session log with `get_run_log` and compare event times to the comment times.

| Check                                                                          | Result |
| ------------------------------------------------------------------------------ | ------ |
| `verify-g` subscribe succeeded                                                 |        |
| `subscription.created` reached (main / subagent)                               |        |
| Comment after `verify-g` finished woke the main session                        |        |
| Event count after both subscribed (expected 1 if one subscription per session) |        |

#### Earlier A3 runs on PR 85 (retracted as evidence)

A subagent (`verify-c`) subscribed to PR 85, then `verify-a` subscribed directly, and every comment, inline comment and review tried (same and different accounts, draft and ready) produced no wake. These runs lacked `ReadNotifications`, had a later subscriber in play, and the main session was disconnected. They do not show that PR comments never wake. They also did not settle whether a subagent's subscription routes to its parent. `verify-c` could not have read notifications either way.

#### Open for A3

1. Whether a subagent's subscription delivers to the parent or the subagent, now with `ReadNotifications` granted to both.
2. Whether a subagent subscribing takes delivery from its parent (last subscriber wins).
3. Whether a CI event wakes a working subscriber, and a log check of the human-reported comment and review wakes.
4. Cleanup is done: PRs 85 and 86, all `AIF-010-verification*` and `aif010/*` branches, and the worktrees were deleted. To rerun, recreate the agent files and settings from Setup above.

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
2. Open `~/.claude/agents/engineering-manager.md` and record its `tools:` line. Confirm it contains `mcp__claude-code-remote__subscribe_pr_activity`, `mcp__claude-code-remote__unsubscribe_pr_activity`, `mcp__claude-code-remote__send_later`, `mcp__claude-code-remote__get_session` and `mcp__claude-code-remote__read_documentation`, and that `ReadNotifications` is present (A3 found PR event wakes are read through it). Confirm the T0 pair also appears in at least one other installed agent.
3. Start a fresh Claude Code cloud session as `engineering-manager` on the repo and open the throwaway PR. Make sure no other session is subscribed to that PR (A3 found only the most recent subscriber receives events).
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
