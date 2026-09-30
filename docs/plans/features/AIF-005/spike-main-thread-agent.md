# Spike: Main-Thread Custom Agent (AIF-005)

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

Each question answered with observed output (or marked untestable and why). Findings feed the risks and open questions in Section 8 of the plan.

## Findings

Run on Claude Code 2.1.285 with `claude -p ... --output-format stream-json --verbose`; the `init` event's `tools` array is the ground truth. A model's self-reported tool list was wrong (it echoed its own frontmatter), so it is not used as evidence.

| #   | Question                                                                                            | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `agent` in project `.claude/settings.json` makes the agent the main thread; `--agent` does the same | Yes, both. The tool set narrows to the agent's list and the persona applies.                                                                                                                                                                                                                                                                                                                                                                               |
| 2   | Main thread gets exactly the agent's `tools`                                                        | Partly. The agent-dispatch tool (shown as `Task`), `ListAgents`, `SendMessage`, `TaskStop`, `Skill`, `Read`, `Write`, `Edit`, `Bash` were present. `Grep`, `Glob`, `AskUserQuestion`, `EnterPlanMode`/`ExitPlanMode` and `TaskCreate`/`TaskUpdate`/`TaskGet`/`TaskList`/`TaskOutput` were absent, but they are also absent from the no-agent baseline in headless mode, so this is a headless-mode limit, not agent narrowing. Not verified interactively. |
| 3   | Main-thread agent can dispatch installed agents                                                     | Yes. `engineering-manager` dispatched `principal-engineer` and got its reply back.                                                                                                                                                                                                                                                                                                                                                                         |
| 4   | Where the agent file lives                                                                          | Both project `.claude/agents/` and user `~/.claude/agents/` work when the file exists at startup.                                                                                                                                                                                                                                                                                                                                                          |
| 4b  | Agent installed by a `SessionStart` hook                                                            | Not applied on that run (full default tool set); applied on the next run. Confirms the hook is too late for the main thread.                                                                                                                                                                                                                                                                                                                               |
| 4c  | `agent` names an agent that does not exist                                                          | Silent fallback to the default agent (41 tools), no error.                                                                                                                                                                                                                                                                                                                                                                                                 |
| 5   | Real `engineering-manager` as main thread                                                           | Works, with one defect below.                                                                                                                                                                                                                                                                                                                                                                                                                              |

### Defect found (outside AIF-005's scope, needs its own item)

The Claude adapter passes `@dag/dag-validate` style entries through unchanged, and Claude Code does not grant them. The engineering-manager's `@dag/*` and `@youtrack/*` tools were absent. Rewriting the entries to the native form `mcp__dag__dag-validate` granted them. This likely affects the manager as a subagent too. See `lib/harnesses/claude.js` (`TOOL_MAP` comment near line 101).

## Consequences for the plan

- Item 3 is largely answered: main-thread agents work and can dispatch subagents.
- The hook route is confirmed unworkable, which is why the primary agent has to be provisioned before launch (by the environment Setup script or committed files).
- Item 4c raises a new risk: a committed `agent` setting with a missing agent fails silently.

## Cloud Test 1 — committed project files (branch `cloud-sandbox`, commit e5220cb)

Result: **passed**. The first message was answered as Engineering-Manager, and the session dispatched `principal-engineer` and reported its reply, `PONG`. So committed `.claude/settings.json` (`agent`) plus `.claude/agents/*.md` work in a real cloud session on a fresh clone. The session's tool list was not captured.

## What the cloud docs say (code.claude.com: cloud-environments, settings)

- The Setup script runs as root, before Claude Code launches, on the VM. If it finishes in about five minutes, the filesystem is snapshotted and reused by later sessions (rebuilt when the script or allowed hosts change, or after about seven days). Files it writes, including under `~/.claude/`, carry over; background processes do not. It must exit 0 or the session fails to start.
- SessionStart hooks run after Claude Code launches, on every session including resumed ones.
- Repo `.claude/settings.json`, `.claude/agents/` and `.claude/skills/` reach a session that has one repository. A session with several repositories reads only the `enabledPlugins` and `extraKnownMarketplaces` keys from each repo's settings.
- The docs' "user `~/.claude/agents` — No" row means the user's own machine files, not files written inside the VM.
- Unstated in the docs: whether the Setup script runs before or after the repo is cloned, and whether the VM has GitHub access at that point. The repo README says before.

## Cloud Test 2 — settings and agent from the Setup script

Question: can the environment Setup script alone make the session start as the primary agent, with no `.claude/` in the repo?

Branch state: `cloud-sandbox` after the "Stage Test 2" commit has no root `.claude/` (Test 1 files moved to `test1/`). Steps:

1. Paste `test2-setup-script.sh` from the branch into the environment's Setup script field (a copy of the environment, or the sandbox's own environment, to avoid touching the main one).
2. Start a new cloud session on `cloud-sandbox`.
3. Send: "State which agent you are running as and your first-reply marker. List every tool you can call."

Pass: the reply starts with `SETUP_SCRIPT_AGENT` and the tools match `Agent, Read, Bash` plus defaults the harness always adds. Fail modes to record: default agent (cloud ignores `~/.claude/settings.json` or the agents dir), or session fails to start (script error).

## Cloud Test 2 result — settings and agent from the Setup script

Result: **passed**. With no `.claude/` in the repo, the Setup script wrote `~/.claude/agents/engineering-manager.md` and merged `{"agent": "engineering-manager"}` into `~/.claude/settings.json`. A new cloud session on `cloud-sandbox` replied starting with `SETUP_SCRIPT_AGENT`, identified as the test Engineering-Manager, and reported only `Agent`, `Read`, `Bash` as its tools (self-reported, so not conclusive on its own; it also said the MCP servers' tools were not in its function list, which fits the narrowed tool set). It listed `engineering-manager` among the agent types it could dispatch. So user-scope settings and agents written by the Setup script are read by the cloud session, and the file cache makes them present at startup.

Implications: no new install scope is strictly needed for cloud primary-agent use; the gap is getting the real agent files onto the VM before launch, and setting `agent` in user settings. A user-level `agent` applies to every session in that environment, so use a dedicated environment.

## Cloud Test 4 — real agents from the Setup script (design)

Question: can the Setup script obtain ai-foundation and run `aif install -B engineering -H claude` itself (no repo checkout needed), then set `agent`?

Script outline: clone `starvoxel/ai-foundation` (GitHub access from the Setup script is unverified; git goes through the GitHub proxy), `npm install`, `node bin/aif.js install -B engineering -H claude`, merge `agent` into `~/.claude/settings.json`, exit 0 regardless of failure. Must finish in about five minutes to be cached. Pass: a new session on `cloud-sandbox` starts as the real Engineering-Manager (its full prompt, and `dag` MCP tools connected). Record where it fails if not: clone denied, install error, or `bws`/token needs.

## Cloud Test 3 — committed project settings without `agent`, plus Setup-script `agent` (staged)

Question: do the two settings sources combine, i.e. does the user-level `agent` (from the Setup script) apply while a committed project `.claude/settings.json` without an `agent` key is also loaded, and are committed project agents found alongside the user-scope one?

Branch state (`cloud-sandbox`): root `.claude/settings.json` sets `env.SANDBOX_MARKER=project-settings-loaded` only; `.claude/agents/principal-engineer.md` is committed; the Setup script is unchanged from Test 2. Prompt and pass criteria are in the branch's `SANDBOX.md`.

### Cloud Test 3 result

Result: **passed** on the second attempt. The first attempt's session was on `cloud-sandbox` at `542d464` (the Test 2 commit), so it had none of the project files; that run is void, most likely a continued session rather than a fresh clone (not confirmed). The valid run replied with the `SETUP_SCRIPT_AGENT` marker (user-level `agent` from the Setup script applied), `echo $SANDBOX_MARKER` printed `project-settings-loaded` (committed project `.claude/settings.json` loaded, in a file with no `agent` key), and dispatching the committed project agent `principal-engineer` returned `PONG`. So the user-level and project sources combine: the Setup-script `agent` did not suppress or replace the committed project settings or agents. That valid run did not report its checkout commit, so it is assumed to be `ad30463`.

## Summary of what the spike established

| Route                                                                           | Works in a real cloud session                                |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Committed `.claude/settings.json` (`agent`) plus `.claude/agents/`              | Yes (Test 1)                                                 |
| Setup script writes `~/.claude/settings.json` (`agent`) and `~/.claude/agents/` | Yes (Test 2)                                                 |
| Both together: user-level `agent`, committed project settings and agents        | Yes (Test 3)                                                 |
| `SessionStart` hook installs the agent                                          | No: applies from the next session, not the first (local run) |
| Setup script obtains the real agents from ai-foundation                         | Not yet tested (Test 4)                                      |

Still open for Test 4 and the plan: GitHub access from the Setup script, the five-minute cache limit, and cache staleness (resolved: bumping the pinned ref in the script rebuilds the cache).

## Real Engineering-Manager as primary (local, headless, Claude Code 2.1.285)

Run with the real installed `engineering-manager` via `--agent`, no cloud involved.

- **Works:** the persona and process apply, the installed steering rules from `~/.claude/rules/` are in context in full, and the manager describes a correct feature-planning path (ADR check, Draft plan, approval, then decomposition and `dag-validate`).
- **Tools:** as installed, `@dag/*` and `@youtrack/*` were not granted; the manager said it had no `dag-validate`. With the entries rewritten to `mcp__dag__dag-validate` and `mcp__dag__dag-compute-waves` in a copy, both were granted and it attempted the call (the headless run then denied permission, and the tool takes a `tasks_path` file, not an inline graph). See the `@server/tool` defect in the plan's Section 8.
- **Skills:** the agent's `skills:` frontmatter (`task-orchestration`, `worktree-management`) was not injected into the main thread; it reported no skill text in context in two runs and would load skills with the `Skill` tool on demand. This is a self-report, not a captured prompt. See the skills-frontmatter risk in the plan's Section 8.
- **Not tested:** the same run in a cloud session (tool set, GitHub MCP tools, permissions).

## Fetching `aif` from GitHub (local check, this container)

The human confirmed the repo is public. In a scratch project, `npm install github:starvoxel/ai-foundation#main` took 18s (161 packages) and put `aif` and `ai-git` in `node_modules/.bin`. `HOME=<throwaway> node_modules/.bin/aif install -B engineering -H claude` then took 5s and installed the full engineering bundle (5 agents, rules, skills, standards, both servers, the `block-command` hook script; 55 files). Caveats: this container's traffic goes through a proxy that may inject credentials, so anonymous access is expected but not proven here; the manifest `.installs.yaml` is written inside `node_modules/ai-foundation/`. Cloud Test 4 therefore becomes a low-risk confirmation: the same two commands plus the `agent` merge, in a real Setup script.

Note: after the plan was reframed around cloud-session primary agent selection (2026-09-30), Section 8 was renumbered, so the item numbers cited in older commits and in the plan's earlier work-log entries refer to the previous table. This document now refers to the plan's Section 8 by topic.

## Skills frontmatter on a main-thread agent (canary test, local, headless)

A scratch project had a skill `canary-skill` whose body held the token `CANARY-7F3A-91`, and an agent `canary` whose frontmatter listed `skills: [canary-skill]`. Asked, with no tools, for the token if its full text was already in context:

- Run as the main thread (`--agent canary`): `NONE`.
- Dispatched as a subagent by the default main thread: `CANARY-7F3A-91`.

So `skills:` frontmatter preloads skill text for subagents but not for a primary agent. This replaces the earlier self-report. The manager as primary must load `task-orchestration` and `worktree-management` with the Skill tool on demand.

## Install freshness ignores adapter code (observed)

After the MCP tool-name fix changed `claude.js`, `aif install -B engineering -H claude` reported `already current, skipping`, because the bundle snapshot hashes component sources, not adapter code. Installed files therefore keep the old transform until reinstalled by other means. Fresh cloud VMs are unaffected.

## Cloud test ladder (staged, pause after each)

Each stage answers one question, ends at a decision point, and only then do we move on. Setup scripts live on `cloud-sandbox` under `cloud-tests/`; paste one into the sandbox environment's Setup script field (changing it rebuilds the cached environment). All scripts pin `REF` to `main` at `95156a2` (which includes the MCP tool-name fix), always exit 0, and log to `/root/.claude/aif-setup.log`. Sessions run on `cloud-sandbox`, an empty repo with no `aif` in it, so they also stand in for a consumer repo.

| Stage | Question                                                                                                                                                                                                                                                          | Setup script                                                      | Break: if it fails                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A2    | Is a prebuilt `bws` binary faster than `cargo install bws`, and does cargo alone fit the five-minute budget?                                                                                                                                                      | `A2-toolchain.sh` (run alone; the cargo build is bounded at 280s) | Independent of the rest: the result only decides how the README's `bws` line is written. The download is checksum-verified; the release tag `bws-v2.1.0` and the asset `bws-x86_64-unknown-linux-gnu-2.1.0.zip` were read from Bitwarden's GitHub releases page. Whether the Setup stage can reach that URL is what this measures.                                                                                                                                                                              |
| B     | Can the Setup stage reach GitHub and npm anonymously and how long does it take, is the result cached, does the real bundle install, and does the real Engineering-Manager start as primary with its MCP tools and a readable log? (This absorbs the old stage A.) | `B-install.sh`                                                    | If the fetch fails, the log's diagnostics say whether git, the codeload tarball or npm is blocked: stop and choose between adding trusted hosts to the environment and a different fetch (tarball via `curl`). If install fails, read the log and fix the script. If the manager starts but the `dag` tools are missing, investigate MCP registration in the cloud (`~/.claude.json`) before Stage C. If it starts as the default agent, the agent-file check or the settings merge failed; the log says which. |
| C     | Can the manager do its real job as primary: plan, wait for approval, decompose, validate, dispatch?                                                                                                                                                               | Same as B, no change                                              | Findings here are follow-up fixes (tool set, permissions, missing GitHub tools, skills on demand), not a reason to redo A or B.                                                                                                                                                                                                                                                                                                                                                                                 |
| D     | Does bumping the pinned ref rebuild the cache, and do the failure paths behave (missing agent, bad settings)?                                                                                                                                                     | `B-install.sh` with a new `REF`, then with `AGENT` misspelled     | A failure means the cache-bust or verify-and-skip design in the plan is wrong and needs rework.                                                                                                                                                                                                                                                                                                                                                                                                                 |

### Stage A2: toolchain timing

Paste `A2-toolchain.sh`, start one new session, and send the same `cat` message. Pass: both timings are recorded. Decision after A2: use the binary in the README if it works and is clearly faster, otherwise keep cargo with the budget warning.

### Stage B: install and select

Paste `B-install.sh` and start a new session on `cloud-sandbox`. Send: "1. State which agent you are and the first sentence of your role. 2. Run `tail -40 /root/.claude/aif-setup.log; cat /root/.claude/settings.json; ls /root/.claude/agents` and paste it. 3. Create `/tmp/t/tasks.json` for feature_id AIF-999 with tasks A and B (B depends on A) and call `mcp__dag__dag-validate` on it; report the result or the exact error. 4. List every tool you can call." Pass: the agent is the Engineering-Manager, the log shows install and `agent set`, the file list has all five agents, and `dag-validate` runs. Then start a second new session on the same environment and send only step 2 (the `tail` and `cat`). Pass for the cache: the log still has a single `B start` line from before that session began, so the environment was cached and the script did not re-run. Also note whether `GITHUB_TOKEN` is logged as set (whether the fetch was anonymous) and the `npm install` and `aif install` times against the five-minute budget. Decision after B: proceed to C, or fix fetch, MCP or install issues first.

### Stage C: work as primary

Same setup as B, new session. Send: "Draft a Feature Plan for adding a `hello` command to this repo, commit it as Draft, present it, and wait." Reply "Approved" in the same session and observe: it commits the approval, decomposes into `tasks.json`, runs `dag-validate`, and reports. Watch and record: which skills it loads through the Skill tool, whether `AskUserQuestion`, plan mode and `Task*` exist, any permission prompts, whether it can use `ai-git`, and what it lacks without GitHub or cloud tools. Decision after C: the list of follow-up fixes, ordered.

### Stage D: refresh and failure paths

D1: edit `REF` in `B-install.sh` to another pinned ref (a different commit or tag), paste it, start a new session, and confirm the log shows a new `B start` with the new ref (cache rebuilt). D2: misspell `AGENT` (for example `engineering-managr`), paste, start a session: expect `agent NOT set` in the log and the default agent. D3 (optional): pre-seed an invalid `~/.claude/settings.json` from the script before the merge. Decision after D: the recipe is ready to document.

### Running stages in parallel

The Setup script is one field per environment and editing it rebuilds the cache, so stages that need different scripts need different environments. Stage A was folded into B because both depend on reaching GitHub and B's log already shows reach, timing and cache behavior.

| Wave         | Stages                                                                     | Environments                | Notes                                                                                                                        |
| ------------ | -------------------------------------------------------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 1 (parallel) | B and A2                                                                   | One each                    | B needs two sessions in order (cache check). A2 runs alone because its cargo build can consume the whole five-minute budget. |
| Review       |                                                                            |                             | Does B pass? Read the timings. Skip wave 2 if B failed.                                                                      |
| 2 (parallel) | C in B's environment (script unchanged, any number of sessions), D1 and D2 | D1 and D2 each in their own | D1 needs B's script cached first, then a session after editing `REF`. D2 uses a misspelled `AGENT`.                          |

Start the first session in a newly edited environment and wait until it is running before starting others, so two sessions do not both build the cache. Parallel sessions share the account's rate limits.

## Cloud results

### Stage B, session 1 (2026-09-30): passed

Setup script `B-install.sh`, pinned `95156a2`, new session on `cloud-sandbox`. The environment's network level was Trusted (confirmed afterward).

- **Primary agent:** the session answered as the Engineering-Manager ("Your role spans both planning and orchestration.") with no `.claude/` in the repo, so user-level provisioning by the Setup script works with the real bundle.
- **Log:** `npm install ok 15s`, `aif install ok 3s` (55 files, all five agents, twelve rules, fourteen skills, four standards, both servers, the hook script), `agent set to engineering-manager`, `B done total 19s`. The script started 7s after VM boot (`uptime -s` 10:36:39, `B start` 10:36:46).
- **Fetch was anonymous:** `HTTPS_PROXY`, `GITHUB_TOKEN` and `GH_TOKEN` were all empty in the Setup stage, and the fetch still worked against the public repo. At Setup time `bws` and `gh` were not on the path; `cargo` was.
- **MCP tools work:** `mcp__dag__dag-validate` was granted and returned `{"valid": true, "errors": []}` on a two-task graph, so the tool-name fix works in cloud and the user-scope `dag` server registration in `~/.claude.json` is honoured.
- **Interactive tool set:** `Agent`, `ListAgents`, `SendMessage`, `EnterPlanMode`, `ExitPlanMode`, `AskUserQuestion`, `TaskCreate`, `TaskUpdate`, `TaskGet`, `TaskList`, `TaskStop`, `Skill`, `Read`, `Write`, `Edit`, `Bash`, `Grep`, `Glob`, and the two `mcp__dag__*` tools. So the tools missing in headless mode are present interactively. Not callable: `TaskOutput` (listed in the agent, apparently not a tool in this Claude Code version), the `mcp__youtrack__*` tools (the YouTrack server fails to connect in cloud, the known proxy 403), and no GitHub, Gmail or Docs tools, and no `ToolSearch`.
- **Noise:** npm warned `skipping integrity check for git dependency ssh://git@github.com/...`; the install still succeeded over the public route.
- **Network level:** Trusted (confirmed afterward), so the anonymous fetch and reach results hold for the Trusted allowlist.

### Stage B, session 2 (2026-09-30): passed, cache confirmed

Started after session 1 had responded.

- **Cache proof:** `grep -c 'B start'` returned `1`, and the log has no lines after `10:37:03`, while this session's VM booted at `10:39:36` (first `date` at `10:39:48`). The Setup script did not run again; the environment was restored from the cached snapshot. The agent was still the Engineering-Manager.
- **The cached run was a separate run from session 1's:** both logs show `B start` at `10:36:46` but different step timings (session 1: npm 15s, `aif install` 3s, total 19s; session 2's log: npm 14s, `aif install` 2s, total 17s, `added 161 packages in 13s`). Inference: on the first start after a script edit, the environment build and the first session each run the script concurrently, and the snapshot comes from the build's run, not from session 1's VM. Consequence: the recipe must be idempotent and free of external side effects.
- **Timing budget:** about 17 to 19 seconds total against the roughly five-minute limit, so the cache builds comfortably.

### Stage A2 (2026-09-30): passed, decision made

Setup script `A2-toolchain.sh`, its own environment, one session.

| Method                                                                                                                                 | Result              | Time                    |
| -------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ----------------------- |
| Prebuilt `bws-x86_64-unknown-linux-gnu-2.1.0.zip` from the Bitwarden GitHub release, sha256 verified against the release checksum file | ok, `bws 2.1.0` ran | 777ms                   |
| `cargo install bws --locked`                                                                                                           | ok                  | 232,755ms (about 3m53s) |

- **Decision:** use the checksum-verified release binary in the recipe; keep cargo only as a fallback. The binary is about 300 times faster, and cargo alone consumed roughly 78% of the five-minute cache budget, which leaves little room for fetching and installing `aif` in the same script.
- **The script duration is the first-start delay:** the setup log ran from `10:36:07` to `10:40:00` and the session's first `date` was `10:40:05`, so a session started right after an edit waits for the whole Setup script. A cached environment does not.
- **`bws` was not on the path in the session by design:** the test script installed the binary to `/tmp/bws-bin` and the cargo build to `/tmp/bws-cargo`, neither on `PATH`. The real recipe should install to `/usr/local/bin`. `bws` was `none` on the path before the script ran, so the image does not include it.
- **Network reach:** the Setup stage reached `github.com/bitwarden/...` and `crates.io`, so the environment is at Trusted or Full; the level was later confirmed as Trusted.

### Network level: Trusted

The human confirmed the test environments used the **Trusted** network access level. Stage B (github.com, codeload, npm registry, the `dag` server's npm install) and A2 (Bitwarden's GitHub release via `release-assets`/`objects.githubusercontent.com`, and `crates.io`) therefore passed on the Trusted allowlist, not on Full access.

### Wave 2 scripts and expectations

`D1-refbump.sh` is `B-install.sh` pinned to the older commit `e2d8a5c` (before the MCP tool-name fix), so a successful ref bump is visible in the installed manager: its frontmatter carries `@dag/dag-validate` instead of `mcp__dag__dag-validate`. `D2-badagent.sh` is `B-install.sh` with `AGENT="engineering-managr"`. Local dry runs: D2 logged `agent file ... missing; agent NOT set` and wrote no `settings.json`; D1 installed the older names.

- **D1 expectation:** after pasting B (cache built) and then D1, the new session's log shows a `B start` with ref `e2d8a5c...`. The number of `B start` lines says whether the rebuild started from a clean image (1) or on top of the previous snapshot (2). The installed manager shows `@dag/` names and `dag-validate` is not callable.
- **D2 expectation:** the session runs as the default agent, the log says the agent was not set, `/root/.claude/settings.json` does not exist, and all five agents are installed.
- **C expectation:** with B's environment unchanged, the manager drafts and commits a plan, waits, then on approval commits it, writes `tasks.json`, and runs `mcp__dag__dag-validate` and `mcp__dag__dag-compute-waves`.

### Stage C, first attempt (2026-09-30): blocked by a recipe gap, fixed in the script

The manager, as primary, started the task and then stopped: it could not create the Draft commit or the Approved commit, because raw `git` is blocked by the installed `block-command` hook and `ai-git` was not installed. It also could not dispatch, because every Task needs its own branch and worktree from `ai-git`. It held rather than working around either block, which is the behavior the steering asks for (approval must be its own commit, no fallback to the main directory).

- **Cause:** `B-install.sh` installed `aif` and `ai-git` under `/opt/aif/node_modules/.bin`, which is not on `PATH`, so `ai-git` did not exist in the session.
- **Fix:** `B-install.sh` (and D1 and D2, kept in sync) now link `aif` and `ai-git` into `/usr/local/bin` and log where they resolve. Verified locally against a fake root: both links are created, and the linked `ai-git` commits under the AI identity from `.aiconfig.json`. (The script's own `on PATH` log line reads `none` in a local run only because the fake directory is not on the shell's `PATH`.)
- **Not yet confirmed in cloud:** Environment 1 needs the updated script pasted (the cache rebuilds), then Stage C rerun. Other things C may still hit: the sandbox repo's `.aiconfig.json` supplies the identity, but pushing needs a token or the GitHub proxy, and `bws` is not installed by the recipe yet.

### Stage D2 (2026-09-30): passed

Setup script `D2-badagent.sh` (`AGENT="engineering-managr"`), Trusted network, new session. The report was a summary rather than the raw output.

- **Verify-and-skip works in cloud:** the session ran as the default Claude Code agent (its system prompt names no agent), and the setup log said the agent file `engineering-managr.md` was missing and the agent was not set. The installed file on disk is `engineering-manager.md`.
- **No settings file:** `/root/.claude/settings.json` does not exist, so the failed check left user settings untouched.
- **Known YouTrack failure:** the session reported the YouTrack server failing to connect with a proxy 403 (`ERR_PROXY_TUNNEL`), although the install log lists it as installed. This is the known limitation, unrelated to the agent setting.

### Stage C rerun (2026-09-30): the manager did its job as primary, with two framework findings

Environment 1 with the updated `B-install.sh`, new session on `cloud-sandbox`. The manager's own report was partly wrong, so the facts below are checked against the pushed commits on `origin/cloud-sandbox`.

- **It works as primary end to end:** it loaded `feature-planning` through the Skill tool (the only skill it loaded), drafted a Feature Plan at `plans/features/cloud-sandbox-001/plan.md` (the default path; the Feature ID is `cloud-sandbox-001` because the sandbox `.aiconfig.json` has no `project_shortname`), committed it as `2609129` with `Status: Draft` and `Reviewed By: Pending`, waited, and on "Approved." committed `a296562` as its own commit with `Status: Approved`. It correctly judged a one-file feature to be a single Task and skipped `tasks.json`, so neither dag tool was called in this flow (`dag-validate` itself was proven in stage B). It did not dispatch, as instructed.
- **`ai-git` is now on `PATH`:** the manager's `ai-git log` retry worked, so the stage C fix in `B-install.sh` is confirmed in cloud.
- **Finding 1, raw `git` got through under the wrong identity:** its `git add`, `git commit` and `git push` ran without a block, and both commits are authored `Claude <noreply@anthropic.com>`, not the `Starvoxel AI Agent` identity that `ai-git` applies from `.aiconfig.json`. Only a later plain `git log` was blocked. Cause, reproduced locally: `block-command` matches its `git *` pattern only when the command starts with `git `. A compound command such as `cd /repo && git commit`, `(git push)` or `/usr/bin/git status` matches nothing and is allowed, while `git status` and `git -C /repo commit` are blocked. The hook's own header calls it workflow discipline, not a security boundary, but the effect is that the "use ai-git, not raw git" rule can be bypassed by accident.
- **Finding 2, `skill/plan-lifecycle` is not installed:** the manager reported `/root/.claude/skills/plan-lifecycle` missing. The `engineering` bundle installs only skills listed in some agent's `skills:` field, and none lists `plan-lifecycle` (nor `adr-authoring`), although the steering and `feature-planning` tell agents to follow `skill/plan-lifecycle` for the commit gate. Local installs are affected too.
- **Benign:** two Bash surveys hit `ls: cannot access` for paths that did not exist in the empty sandbox repo.
- **Not reported:** permission prompts. Not exercised: a multi-Task decomposition, dispatch, and worktrees.

### Stage D1 (2026-09-30): passed

Environment 3 (Trusted): first a session on `B-install.sh` pinned to `95156a2` to build the cache, then the `REF=` line changed to the older `e2d8a5c` and a new session. The first reply gave only a summary, so the raw output was requested and pasted.

- **The bump rebuilt the environment and took effect:** the log's `B start` line shows ref `e2d8a5c24a64afca5e6bcc472f87e03e928c7a64`, and the installed manager's frontmatter has `@dag/dag-validate` and `@dag/dag-compute-waves` (the pre-fix names), so the old commit really was installed over the earlier one.
- **Clean rebuild:** only one `B start` line appears in the log, so the rebuild started from a clean image, not on top of the previous snapshot. (The pasted output did not include a count, only the matching lines.)
- **The `PATH` links work in cloud:** `on PATH: aif=/usr/local/bin/aif ai-git=/usr/local/bin/ai-git`.
- **Timing:** VM booted `17:03:18`, the script ran `17:03:24` to `17:03:39` (15s total, `aif install` 2s), and the session's first command ran at `17:03:46`. So the first start after a script edit waits roughly 20 to 30 seconds with this recipe, and the script ran in the session's own VM, as expected for a cache miss.
- **Consequence for refresh:** bumping the pinned ref in the script is enough to refresh a cloud environment, and it replaces the old install. Only a human can edit the script, so each refresh needs the human to bump the ref.
