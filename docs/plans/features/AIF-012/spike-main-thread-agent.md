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
