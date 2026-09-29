# Spike: Main-Thread Custom Agent (AIF-012, open item 3)

Exploratory spike explicitly requested by the human. Output is evidence for the Feature Plan, not production code. Runs in a throwaway project under the session scratchpad, never in this repo.

## Questions

1. Does `agent` in a project `.claude/settings.json` make a custom agent the main thread, and does `--agent` override it?
2. Does the main-thread agent get exactly the tools its `tools` frontmatter lists (including `Agent`, `Task*`), and does its prompt replace the default?
3. Can a main-thread agent dispatch other installed agents as subagents?
4. Are agent files in the project's `.claude/agents/` picked up at startup, and does a user-scope `~/.claude/agents/` agent behave the same?
5. Does the real `engineering-manager` (as installed by `aif install`) work as a main thread?

## Method

Headless `claude -p` runs in a scratch project, each asking the agent to state its identity and list its tools, and (Q3) to dispatch `principal-engineer` with a trivial smoke prompt. Record raw outputs.

## Exit criteria

Each question answered with observed output (or marked untestable and why). Findings feed Section 8 items 1, 3 and 4 of the plan.

## Findings

Run on Claude Code 2.1.285 with `claude -p ... --output-format stream-json --verbose`; the `init` event's `tools` array is the ground truth. A model's self-reported tool list was wrong (it echoed its own frontmatter), so it is not used as evidence.

| # | Question | Result |
| - | -------- | ------ |
| 1 | `agent` in project `.claude/settings.json` makes the agent the main thread; `--agent` does the same | Yes, both. The tool set narrows to the agent's list and the persona applies. |
| 2 | Main thread gets exactly the agent's `tools` | Partly. The agent-dispatch tool (shown as `Task`), `ListAgents`, `SendMessage`, `TaskStop`, `Skill`, `Read`, `Write`, `Edit`, `Bash` were present. `Grep`, `Glob`, `AskUserQuestion`, `EnterPlanMode`/`ExitPlanMode` and `TaskCreate`/`TaskUpdate`/`TaskGet`/`TaskList`/`TaskOutput` were absent, but they are also absent from the no-agent baseline in headless mode, so this is a headless-mode limit, not agent narrowing. Not verified interactively. |
| 3 | Main-thread agent can dispatch installed agents | Yes. `engineering-manager` dispatched `principal-engineer` and got its reply back. |
| 4 | Where the agent file lives | Both project `.claude/agents/` and user `~/.claude/agents/` work when the file exists at startup. |
| 4b | Agent installed by a `SessionStart` hook | Not applied on that run (full default tool set); applied on the next run. Confirms the hook is too late for the main thread. |
| 4c | `agent` names an agent that does not exist | Silent fallback to the default agent (41 tools), no error. |
| 5 | Real `engineering-manager` as main thread | Works, with one defect below. |

### Defect found (outside AIF-012's scope, needs its own item)

The Claude adapter passes `@dag/dag-validate` style entries through unchanged, and Claude Code does not grant them. The engineering-manager's `@dag/*` and `@youtrack/*` tools were absent. Rewriting the entries to the native form `mcp__dag__dag-validate` granted them. This likely affects the manager as a subagent too. See `lib/harnesses/claude.js` (`TOOL_MAP` comment near line 101).

## Consequences for the plan

- Item 3 is largely answered: main-thread agents work and can dispatch subagents.
- The hook route is confirmed unworkable, which strengthens item 1's case for files present at startup.
- Item 4c raises a new risk: a committed `agent` setting with a missing agent fails silently.
