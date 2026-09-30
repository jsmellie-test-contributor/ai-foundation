# Feature Plan: Cloud Session Primary Agent Selection

## 1. Metadata

| Field               | Value                                                              |
| ------------------- | ------------------------------------------------------------------ |
| Feature ID          | AIF-005                                                            |
| Project             | ai-foundation                                                      |
| Status              | Draft                                                              |
| Author (Agent)      | Engineering Manager (drafted in a Claude Code session)             |
| Reviewed By         | Pending                                                            |
| Created             | 2026-09-29 00:00                                                   |
| Last Updated        | 2026-09-30 03:30                                                   |
| Standards           | javascript_base, javascript_node                                   |
| Total Tasks         | Not yet decomposed                                                 |
| Product Requirement | None                                                               |
| ADRs                | None yet — see Section 8, item 7 (Setup-script route may need one) |

---

## 2. Goal

A Claude Code cloud session can start as a chosen ai-foundation agent, such as the Engineering-Manager, from its first turn, with the agent selected by the cloud environment. It works for ai-foundation's own sessions and for repos that consume the framework, which need the framework loaded before their code is checked out. Today the `SessionStart` hook installs bundles after the main-thread agent is already resolved, so an installed agent can be dispatched to but never be the primary agent.

Spike evidence is in [`spike-main-thread-agent.md`](./spike-main-thread-agent.md).

> Requirement traceability: N/A

---

## 3. Quick Summary

**Open Items:** 9 open (1 High / 4 Medium / 4 Low) — see Section 8

---

## 4. Scope

### In Scope

- A documented, repeatable environment Setup-script recipe that fetches a pinned ai-foundation from GitHub, installs the chosen bundles for the Claude harness, and merges the primary `agent` into the user's `~/.claude/settings.json` without clobbering other settings.
- Making the real Engineering-Manager viable as a primary agent: the MCP tool-name defect, the tool allowlist, and skill loading found in the spike (Section 8, items 1 to 3), decided and fixed as the plan settles them.
- Verifying the result in a real cloud session, including the recipe's time and network behavior.
- README cloud-setup guidance and any arc42 sections touched by code changes.

### Out of Scope

- Project-scope install (`aif install --scope project`, generating a committed `.claude/`) and the harness-agnostic scope option in the adapter contract: deferred as a possible follow-up Feature (Section 8, item 8). Spike Tests 1 and 3 show committed project files work.
- Kiro implementation of project scope and default agent: deferred, recorded as a Kiro gap in `docs/architecture/11_risks.md`.
- Publishing `aif` to npm: not needed, the public GitHub repo is the source.
- Choosing different primary agents per repo within one environment.
- Fixing the `youtrack` MCP proxy 403 seen in cloud sessions.

---

## 5. Feature Description

### User-Facing Behaviour

An environment owner saves a short Setup script once, naming the pinned ai-foundation ref, the bundles to install, and the primary agent. Every new cloud session in that environment starts as that agent from turn 1, with its persona, tools, and installed rules. To use a different primary agent, use a different environment. To pick up a new ai-foundation version, change the pinned ref in the script, which rebuilds the cached environment.

### Data Flow

The environment Setup script runs before Claude Code launches and before the repo is cloned, as root, and its result is cached. It fetches ai-foundation with `npm install github:starvoxel/ai-foundation#<ref>`, runs `aif install -B <bundles> -H claude` to write agents, rules, skills, standards, servers and the hook script under `~/.claude/`, verifies the named agent file exists, and merges `{"agent": "<name>"}` into `~/.claude/settings.json`. When a session starts, Claude Code reads the user settings and runs the named agent as the main thread. Any repo `SessionStart` hook, such as this repo's `aif install`, runs afterward and only refreshes files for later sessions.

### Business Rules

- The script always exits 0, because a non-zero exit fails session start, but it must never silently leave a half-provisioned agent: it sets `agent` only after confirming the agent file was installed.
- The settings merge preserves every existing key, especially permission and deny rules.
- The ai-foundation ref is pinned to a tag or commit SHA; a shared environment never tracks an unpinned branch.
- No secrets go in the script, since anyone who can use the environment can read it.
- One environment provides one primary agent.

### Error States

| Scenario                                          | Expected Behaviour                                                        |
| ------------------------------------------------- | ------------------------------------------------------------------------- |
| GitHub or npm unreachable at Setup time           | Log the failure, skip install and the `agent` setting; session runs as the default agent |
| Named agent not in the installed bundle           | Do not set `agent`; log which agent was missing                           |
| `~/.claude/settings.json` is not valid JSON       | Leave it untouched, skip the merge, log the parse error                   |
| Script runs longer than about five minutes        | Environment is not cached, so every session pays the setup cost           |
| Manager runs without its `dag` tools              | Decomposition blocked until the tool-name defect is fixed (item 1)        |

---

## 6. Architecture Overview

### New Components

| Component                  | Type          | Responsibility                                                                                     |
| -------------------------- | ------------- | -------------------------------------------------------------------------------------------------- |
| Cloud Setup-script recipe  | Documentation | Fetch a pinned `aif`, install bundles, verify and set the primary agent, in a form an owner pastes |

### Modified Components

| Component                         | Change                                                                                   |
| --------------------------------- | ---------------------------------------------------------------------------------------- |
| Claude adapter tool mapping       | Map `@server/tool` to `mcp__server__tool` (if item 1 is fixed here), with its unit test  |
| Engineering-Manager agent for primary use | Tool list and skill loading per the decisions on items 2 and 3                |
| README cloud section              | Replace the `AIF_BUNDLES` guidance with the recipe                                       |

### Component Relationships

Builds on §5.02 (Claude adapter) and §6 (install runtime). `resolver.js` and the install pipeline are unchanged. The repo's `SessionStart` hook (`scripts/session-start.sh`) stays as a refresh path.

### Integration Points

- The cloud environment's Setup script field and its caching behavior.
- The public GitHub repository and the npm registry, fetched at Setup time.
- `~/.claude/settings.json` and `~/.claude/agents/` as read by Claude Code at session start.

---

## 7. Security Considerations

- The Setup script runs as root: pin the ref, and note that installing from GitHub runs npm lifecycle scripts, so an unpinned ref lets upstream changes run as root.
- Environment variables and the script are readable by anyone who uses the environment: keep tokens out, and leave `bws` secrets handling to `secrets.run`.
- The settings merge must never drop permission or deny rules.
- Verifying the agent file exists before setting `agent` avoids an unintended fallback to a broader default.

---

## 8. Risks & Open Questions

| # | Risk / Question | Type | Impact | Source | Raised By | Resolved |
| - | --------------- | ---- | ------ | ------ | --------- | -------- |
| 1 | Defect, prerequisite for a useful primary manager: `agents/engineering-manager.yaml` lists `@dag/*` and `@youtrack/*` tools, and `mapAgentTools()` in `lib/harnesses/claude.js` deliberately passes `@server/tool` through unchanged (a unit test asserts it). Claude Code only recognises `mcp__<server>__<tool>`, so the tools are silently not granted. Confirmed twice on the real installed manager: it reported `dag-validate` unavailable, and with the names rewritten it had the tools. Without them the manager cannot validate `tasks.json`, which `skill/feature-planning` requires. Fix inside this Feature or as a separate fix first? | Question | H | Arch | Agent | No |
| 2 | As primary, the manager's `tools` allowlist drops every tool it does not list (in cloud: GitHub and Claude Code Remote MCP tools, file-send and artifact tools). Decide whether a primary variant needs a broader or omitted `tools` list, or whether `ai-git` via Bash is enough. | Question | M | Spike | Agent | No |
| 3 | The agent's `skills:` frontmatter (`task-orchestration`, `worktree-management`) was not injected as full text into the main thread in the local test (self-reported in two runs); the manager must load skills with the Skill tool. Decide whether that is acceptable or a primary variant needs its skills loaded another way. | Risk | M | Spike | Agent | No |
| 4 | Setting `agent` to a name that is not installed silently falls back to the default agent, with no error. The recipe must verify the agent file exists before writing the setting, and log when it does not. | Risk | M | Spike | Agent | No |
| 5 | The real Engineering-Manager has only been run as primary locally in headless mode. Not yet seen in a real cloud session: the interactive tool set, permission prompts for MCP tools (the headless run was denied permission for `dag-validate`), and behavior with the cloud's default tooling absent. | Risk | M | Spike | Agent | No |
| 6 | Setup-script confirmation still to do in a real environment: network access at that stage, total time under about five minutes, anonymous fetch of the public repo, pinned ref. From this container, `npm install github:starvoxel/ai-foundation#main` took 18s and `aif install -B engineering -H claude` took 5s. The install manifest `.installs.yaml` lands inside `node_modules/ai-foundation/`. | Risk | L | Spike | Human | No |
| 7 | Does the choice to provision through the environment Setup script, rather than committed project files, warrant an ADR from Architect? | Question | L | Arch | Agent | No |
| 8 | Is the deferred project-scope install (`aif install --scope project`, committed `.claude/`) worth its own follow-up Feature? Tests 1 and 3 show committed project files work and combine with the Setup-script route. | Question | L | Design | Human | No |
| 9 | A user-level `agent` applies to every session in the environment, including ad hoc ones and other repos, so one environment serves one primary agent. A project-level `agent` should override it (documented precedence) but that is untested. | Risk | L | Docs | Agent | No |
| 10 | Resolved by spike: a custom agent can be the main thread via `agent` in settings or `--agent`, and it can dispatch installed agents as subagents. An agent installed by a `SessionStart` hook is not applied on that run, so the hook cannot provision the primary agent. | Question | H | Arch | Agent | Yes |
| 11 | Resolved by cloud tests: the environment Setup script alone provisions the primary agent (user-level `~/.claude/settings.json` plus `~/.claude/agents/`), and that combines with committed project files. | Question | H | Arch | Human | Yes |
| 12 | Resolved by the human: how `aif` is obtained. The repo is public, so the Setup script fetches it with `npm install github:starvoxel/ai-foundation#<ref>`; no npm publish is needed. | Question | M | Design | Human | Yes |
| 13 | Resolved: editing the Setup script (or allowed hosts) rebuilds the cached environment, so bumping the pinned ref in the script busts the cache. | Risk | M | Docs | Human | Yes |
| 14 | Resolved by the human: the cloud environment sets the primary agent at build time; `aif` needs no `--primary` option for cloud. Kiro is deferred and recorded as a Kiro gap in `docs/architecture/11_risks.md`. | Question | M | Design | Human | Yes |

---

## 9. Task Decomposition

Not yet decomposed — produced after this plan is Approved (`skill/feature-planning`: "Step 5 — Decompose into Tasks").

---

## 10. Acceptance Criteria

- [ ] All Tasks complete and signed off
- [ ] Feature works end-to-end as described in Section 5
- [ ] A new cloud session in an environment provisioned by the documented recipe starts as the configured agent from turn 1, verified in a real cloud session
- [ ] The manager as primary can call `dag-validate` and `dag-compute-waves`, or the decision to defer that is recorded
- [ ] The recipe is documented in the README with a pinned ref, the cache-busting note, and a measured run time under five minutes
- [ ] Existing tests pass; any adapter change is covered by unit tests
- [ ] Affected arc42 sections and `key_files` updated
- [ ] No HIGH or CRITICAL findings open in any Task review

---

## 11. Work Log

[2026-09-29 00:00] [Engineering Manager] [Draft] [AIF-005] [Initial draft from architecture review (§5.01, 5.02, 5.05, 6) and cloud-session findings; Feature ID chosen as next after AIF-011 (see the correction entry below).]
[2026-09-29 00:30] [Engineering Manager] [Revise] [AIF-005] [Per human: project install must be harness-agnostic, include Kiro (untestable here), and be an optional install-CLI flag. Feature ID still open (AIF-005 vs AIF-005, legacy decision-record overlap).]
[2026-09-29 01:00] [Engineering Manager] [Correction] [AIF-005] [Feature IDs already in use: AIF-001 to AIF-004, the legacy Epics that `docs/process-model.md` replaced with Features, found in `docs/plans/epics/` and `docs/plans/archive/` (`docs/plans/completed/` holds no IDs; `docs/plans/features/` is empty). AIF-005 to AIF-011 are retired decision-record IDs, cited only in those Epics and their chunk plans. The next Feature ID in the series is therefore AIF-005, but the overlap with those retired IDs made it ambiguous, so AIF-012 was used as a placeholder until the human chose. Renumbered to AIF-005 on 2026-09-30 (see the renumber entry below).]
[2026-09-29 02:00] [Engineering Manager] [Spike] [AIF-005] [Ran the main-thread agent spike; item 3 resolved, items 7 and 8 added. Details in `spike-main-thread-agent.md`.]
[2026-09-29 03:00] [Engineering Manager] [Spike] [AIF-005] [Cloud-sandbox Test 1 passed in a real cloud session. Read the cloud docs on Setup scripts and settings: the Setup script can persist files in `~/.claude/`, and repo settings are ignored in multi-repo sessions. Item 1 revised, item 9 added, Test 2 designed in `spike-main-thread-agent.md`.]
[2026-09-29 04:00] [Engineering Manager] [Spike] [AIF-005] [Cloud-sandbox Test 2 passed: the Setup script alone provisioned the primary agent. Item 1 revised (project scope may not be needed), item 11 added (Setup-script cache staleness). Test 3 designed in `spike-main-thread-agent.md`.]
[2026-09-30 00:00] [Engineering Manager] [Spike] [AIF-005] [Cloud-sandbox Test 3 passed: user-level `agent` from the Setup script and committed project settings and agents load together. A first attempt started at a stale commit (a continued session, not a real result). Recorded in `spike-main-thread-agent.md`.]
[2026-09-30 01:00] [Engineering Manager] [Revise] [AIF-005] [Per human: goal is a pre-checkout load path; cloud env sets the primary agent (item 5); Kiro deferred and added to arc42 risks (item 6); cache busts on script edit (item 11); aif distribution is a separate dependency (item 12). Real-manager local test added items 13-14 and refined item 8.]
[2026-09-30 02:00] [Engineering Manager] [Spike] [AIF-005] [Human noted ai-foundation is public on GitHub. Verified `npm install github:...#main` plus `aif install` works end to end from node_modules in a throwaway home; item 12 downgraded to a low-risk confirmation.]
[2026-09-30 03:00] [Engineering Manager] [Renumber] [AIF-005] [Per human: renumbered from placeholder AIF-012 to AIF-005, the next Feature ID after AIF-004. Earlier entries above that say AIF-012 refer to this Feature. The retired decision-record IDs AIF-005 to AIF-011 are historical and cited only in the legacy Features AIF-001 to AIF-004.]
[2026-09-30 03:30] [Engineering Manager] [Reframe] [AIF-005] [Per human: the goal is cloud-session primary agent selection; project install location was a small idea inside it. Rewrote the plan around the environment Setup-script route, moved project-scope install and Kiro to Out of Scope, and renumbered Section 8 (older item numbers in earlier entries and in the spike doc refer to the previous table).]
