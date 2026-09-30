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

**Open Items:** 1 open (0 High / 0 Medium / 1 Low) — see Section 8

---

## 4. Scope

### In Scope

- A documented, repeatable environment Setup-script recipe that fetches a pinned ai-foundation from GitHub, installs the chosen bundles for the Claude harness, puts `aif` and `ai-git` on the `PATH` (the steering requires `ai-git` and the installed `block-command` hook blocks raw `git`), and merges the primary `agent` into the user's `~/.claude/settings.json` without clobbering other settings.
- Making the real Engineering-Manager viable as a primary agent: the MCP tool-name defect is fixed on `main`; skill loading for a main-thread agent is documented (Section 8, item 3).
- Verifying the result in a real cloud session, including the recipe's time and network behavior, the manager's tools, and a readable setup log.
- README cloud-setup guidance and any arc42 sections touched by code changes.

### Out of Scope

- Project-scope install (`aif install --scope project`, generating a committed `.claude/`) and the harness-agnostic scope option in the adapter contract: deferred by the human as a follow-up Feature (Section 8, item 8). Spike Tests 1 and 3 show committed project files work.
- Kiro implementation of project scope and default agent: deferred, recorded as a Kiro gap in `docs/architecture/11_risks.md`.
- Publishing `aif` to npm: not needed, the public GitHub repo is the source.
- Choosing different primary agents per repo within one environment.
- Fixing the `youtrack` MCP proxy 403 seen in cloud sessions.
- The `block-command` hook only blocking commands that start with a blocked pattern (item 18, tracked separately as AIF-007).
- The `engineering` bundle not installing `skill/plan-lifecycle` and `adr-authoring` (item 19, tracked separately as AIF-006).
- Install freshness ignoring adapter code (item 15): cloud environments refresh by bumping the pinned ref.
- Whether `TaskOutput` is a real Claude Code tool (item 16): investigated separately and fixed on `main` if it is not.

---

## 5. Feature Description

### User-Facing Behaviour

An environment owner saves a short Setup script once, naming the pinned ai-foundation ref, the bundles to install, and the primary agent. Every new cloud session in that environment starts as that agent from turn 1, with its persona, tools, and installed rules. To use a different primary agent, use a different environment. To pick up a new ai-foundation version, change the pinned ref in the script, which rebuilds the cached environment.

### Data Flow

The environment Setup script runs before Claude Code launches and before the repo is cloned, as root, and its result is cached. It fetches ai-foundation with `npm install github:starvoxel/ai-foundation#<ref>`, runs `aif install -B <bundles> -H claude` to write agents, rules, skills, standards, servers and the hook script under `~/.claude/`, links `aif` and `ai-git` into `/usr/local/bin`, verifies the named agent file exists, and merges `{"agent": "<name>"}` into `~/.claude/settings.json`. When a session starts, Claude Code reads the user settings and runs the named agent as the main thread. Any repo `SessionStart` hook, such as this repo's `aif install`, runs afterward and only refreshes files for later sessions.

### Business Rules

- The script always exits 0, because a non-zero exit fails session start, but it must never silently leave a half-provisioned agent: it sets `agent` only after confirming the agent file was installed.
- The settings merge preserves every existing key, especially permission and deny rules.
- The script logs what it did and what it skipped to a file a session can read.
- The ai-foundation ref is pinned to a tag or commit SHA; a shared environment never tracks an unpinned branch.
- No secrets go in the script, since anyone who can use the environment can read it.
- One environment provides one primary agent.
- The script is idempotent and has no external side effects, because on the first start after an edit the environment build and the first session appear to run it concurrently.

### Error States

| Scenario                                          | Expected Behaviour                                                        |
| ------------------------------------------------- | ------------------------------------------------------------------------- |
| GitHub or npm unreachable at Setup time           | Log the failure, skip install and the `agent` setting; session runs as the default agent |
| Named agent not in the installed bundle           | Do not set `agent`; log which agent was missing                           |
| `~/.claude/settings.json` is not valid JSON       | Leave it untouched, skip the merge, log the parse error                   |
| Script runs longer than about five minutes        | Environment is not cached, so every session pays the setup cost           |

---

## 6. Architecture Overview

### New Components

| Component                  | Type          | Responsibility                                                                                     |
| -------------------------- | ------------- | -------------------------------------------------------------------------------------------------- |
| Cloud Setup-script recipe  | Documentation | Fetch a pinned `aif`, install bundles, verify and set the primary agent, in a form an owner pastes |

### Modified Components

| Component                         | Change                                                                                   |
| --------------------------------- | ---------------------------------------------------------------------------------------- |
| Claude adapter tool mapping       | Map `@server/tool` to `mcp__server__tool`, with unit tests (done on `main`, item 1)      |
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
| 1 | Resolved: the `@server/tool` defect is fixed on `main` (`f167784`, arc42 §5.02 in `95156a2`). `mapAgentTools()` now rewrites `@server/tool` to `mcp__server__tool` (characters outside `[A-Za-z0-9_-]` become `_`), covered by unit tests; the generated manager frontmatter now carries `mcp__dag__dag-validate` and the other MCP tool names. Not yet seen granted in a cloud session (covered by item 5). | Question | H | Spike | Agent | Yes |
| 2 | Resolved as moot by the human: each agent gets its own environment, and each agent definition owns its own `tools` list, so no single primary-agent tool variant needs deciding. | Question | M | Spike | Human | Yes |
| 3 | Accepted by the human: a canary test (local, headless) showed a skill named in an agent's `skills:` frontmatter reaches a subagent's context (it returned the canary token) but not a main-thread agent (`NONE`), so the manager as primary does not get `task-orchestration` and `worktree-management` preloaded. Those skills are still installed and the manager loads them on demand with the Skill tool, so this is not a blocker. Note it in the recipe docs. | Risk | M | Spike | Human | Yes |
| 4 | Resolved by the human, with a design requirement: the recipe verifies the agent file exists before setting `agent` and writes a log file (`/root/.claude/aif-setup.log`) that a session can read. Confirmed in cloud stage D2: a misspelled agent name left the default agent running, the log said the agent was not set, and no `settings.json` was written. | Question | M | Spike | Human | Yes |
| 5 | Resolved by cloud stage C: the real Engineering-Manager, as primary in a real cloud session, loaded `feature-planning` through the Skill tool, drafted and committed a plan as Draft, waited, then committed the approval as its own commit, and treated a one-file feature as a single Task. Not exercised: multi-Task decomposition with both `dag` tools, dispatch, and worktrees (optional rerun, item 20). Permission prompts were not reported. | Risk | M | Spike | Human | Yes |
| 6 | Resolved by cloud tests B, A2 and D1 (Trusted network level): the Setup stage fetched the public repo anonymously in 15s with `aif install` taking 3s (19s total), a second session confirmed the environment was cached, a checksum-verified `bws` release binary installed in under a second versus about 3m53s for `cargo install` (decision: use the binary, cargo as fallback only), and bumping the pinned ref rebuilt the environment from a clean image and installed the new ref. The install manifest `.installs.yaml` lands inside `node_modules/ai-foundation/`. | Risk | L | Spike | Human | Yes |
| 7 | Accepted by the human: no ADR for provisioning through the environment Setup script. The decision and evidence are recorded inline (work log, this plan, the spike doc, README recipe); reopen as an ADR only if the follow-up project-scope Feature revives the fork. | Question | L | Arch | Agent | Yes |
| 8 | Resolved by the human: project-scope install (`aif install --scope project`, committed `.claude/`) is a follow-up Feature, not part of this one. Spike Tests 1 and 3 show it is feasible. | Question | L | Design | Human | Yes |
| 9 | Resolved by design: one environment provides one primary agent, chosen per environment, so the untested project-level `agent` override is not needed. | Risk | L | Docs | Human | Yes |
| 10 | Resolved by spike: a custom agent can be the main thread via `agent` in settings or `--agent`, and it can dispatch installed agents as subagents. An agent installed by a `SessionStart` hook is not applied on that run, so the hook cannot provision the primary agent. | Question | H | Arch | Agent | Yes |
| 11 | Resolved by cloud tests: the environment Setup script alone provisions the primary agent (user-level `~/.claude/settings.json` plus `~/.claude/agents/`), and that combines with committed project files. | Question | H | Arch | Human | Yes |
| 12 | Resolved by the human: how `aif` is obtained. The repo is public, so the Setup script fetches it with `npm install github:starvoxel/ai-foundation#<ref>`; no npm publish is needed. | Question | M | Design | Human | Yes |
| 13 | Resolved: editing the Setup script (or allowed hosts) rebuilds the cached environment, so bumping the pinned ref in the script busts the cache. | Risk | M | Docs | Human | Yes |
| 14 | Resolved by the human: the cloud environment sets the primary agent at build time; `aif` needs no `--primary` option for cloud. Kiro is deferred and recorded as a Kiro gap in `docs/architecture/11_risks.md`. | Question | M | Design | Human | Yes |
| 15 | Out of scope for this Feature, per the human: install freshness snapshots hash component sources only, not adapter code, so after an adapter fix `aif install` still reports a bundle "already current" and the installed files keep the old transform (observed after the tool-name fix). Cloud environments are unaffected because a fresh VM installs from scratch, and a pinned-ref change (the D1 mechanism, item 6) is how a cloud environment refreshes. Note the constraint: only a human can edit the environment's Setup script, so a refresh always needs a human to bump the ref. | Risk | L | Spike | Human | Yes |
| 16 | Removed from this plan, per the human, and fixed on `main` (`5065036`, arc42 re-verified in `c04bbdb`): a background investigation confirmed `TaskOutput` is deprecated in Claude Code's docs (use `Read` on the task's output file) and removed from the installed CLI (2.1.285), which silently ignores it; the Claude adapter's `task` tool map no longer lists it. | Risk | L | Spike | Human | Yes |
| 17 | Resolved: cloud stage C found `ai-git` was not on the `PATH`, so the manager could not commit. The recipe now links `aif` and `ai-git` into `/usr/local/bin`, and the rerun confirmed `ai-git` works in the session. Still to settle for the recipe: pushing needs a token or the GitHub proxy (a raw `git push` worked through the proxy), and `bws` for `ai-git`'s `secrets.run` is not installed yet. | Risk | M | Spike | Human | Yes |
| 18 | Out of scope for this Feature, per the human: the installed `block-command` hook matches a `blocked_commands` pattern only at the start of the command, so `cd /repo && git commit`, `(git push)` and `/usr/bin/git status` are allowed. In cloud stage C the manager's raw `git` commits went through under `Claude <noreply@anthropic.com>` instead of the AI identity, contrary to the steering. Affects every agent with `blocked_commands`. Tracked separately (investigation planned as AIF-007); AIF-005 does not address it. | Risk | M | Spike | Agent | Yes |
| 19 | Out of scope for this Feature, per the human: the `engineering` bundle does not install `skill/plan-lifecycle` (or `adr-authoring`) because no agent lists them in `skills:`, yet the steering and `skill/feature-planning` tell agents to follow `skill/plan-lifecycle`; the manager reported it missing in cloud, and local installs are affected too. Tracked separately (optional skill-dependency frontmatter field, planned as AIF-006); AIF-005 does not address it. | Risk | M | Spike | Agent | Yes |
| 20 | To test, per the human: rerun cloud stage C with a two-part feature so multi-Task decomposition runs with `dag-validate` and `dag-compute-waves`, plus dispatch of the Tasks and their worktrees. Stage C's single-Task feature skipped all of that. | Question | L | Spike | Human | No |

---

## 9. Task Decomposition

Not yet decomposed — produced after this plan is Approved (`skill/feature-planning`: "Step 5 — Decompose into Tasks").

---

## 10. Acceptance Criteria

- [ ] All Tasks complete and signed off
- [ ] Feature works end-to-end as described in Section 5
- [ ] A new cloud session in an environment provisioned by the documented recipe starts as the configured agent from turn 1, verified in a real cloud session
- [ ] The manager as primary can call `dag-validate` and `dag-compute-waves` in a real cloud session
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
[2026-09-30 04:00] [Engineering Manager] [Revise] [AIF-005] [Per human: item 1 fixed directly on `main` (`f167784`, `95156a2`); item 2 moot (one environment per agent); item 4 resolved with a log-file requirement; item 5 folded into the next cloud test; item 6 to compare fetch options and binary versus cargo installs by measured time; item 8 is a follow-up Feature; item 9 closed by design. Canary test answered item 3: `skills:` frontmatter reaches subagents, not a main-thread agent. Decision: provision through the environment Setup script rather than committed project files. **Why:** it needs no code change, works before checkout, applies to consumer repos, and was verified in cloud Tests 1 to 3. Item 15 added (install freshness ignores adapter code).]
[2026-09-30 05:00] [Engineering Manager] [Revise] [AIF-005] [Per human: no ADR accepted (item 7 resolved). Replaced the single combined cloud test with a staged ladder A, A2, B, C, D with a decision point after each (spike doc). Scripts for A, A2 and B are on `cloud-sandbox` under `cloud-tests/`.]
[2026-09-30 06:00] [Engineering Manager] [Revise] [AIF-005] [Per human: folded cloud test stage A into B, since B's log already shows fetch reach, timing and cache behavior; B now logs env facts and diagnoses which fetch path is blocked on failure. Added a parallel-run plan (waves) to the spike doc.]
[2026-09-30 07:00] [Engineering Manager] [Spike] [AIF-005] [Cloud stage B session 1 passed: real Engineering-Manager is primary from turn 1 via the Setup script, dag-validate works, fetch anonymous, 19s total. Cache proof (session 2), A2, network level pending. Item 16 added (TaskOutput likely not a real tool).]
[2026-09-30 08:00] [Engineering Manager] [Spike] [AIF-005] [Cloud stage B session 2 passed: environment cached, script did not re-run (count 1, log ends before the VM booted). The snapshot came from a separate run, concurrent with session 1's, so the recipe must be idempotent. Added that business rule.]
[2026-09-30 09:00] [Engineering Manager] [Spike] [AIF-005] [Cloud stage A2 passed: verified bws binary 777ms versus cargo install 232.8s. Decision: the recipe installs the binary to /usr/local/bin and keeps cargo only as a fallback. **Why:** cargo alone used about 78% of the five-minute cache budget. Script duration also equals the first-start delay after an edit.]
[2026-09-30 10:00] [Engineering Manager] [Spike] [AIF-005] [Human confirmed the test environments used Trusted network access, so B and A2 results hold for the Trusted allowlist. Wave 2 scripts D1 and D2 added to `cloud-sandbox`.]
[2026-09-30 11:00] [Engineering Manager] [Spike] [AIF-005] [Cloud stage C first attempt blocked: ai-git was not on PATH, so the manager correctly held (no Draft or Approved commit possible, no worktrees). Fixed the recipe to link aif and ai-git into /usr/local/bin; rerun pending. Item 17 added.]
[2026-09-30 12:00] [Engineering Manager] [Spike] [AIF-005] [Cloud stage D2 passed: a misspelled agent name is skipped and logged, the default agent runs, no settings file written. Item 4 design confirmed in cloud.]
[2026-09-30 13:00] [Engineering Manager] [Spike] [AIF-005] [Cloud stage C rerun: the real manager worked as primary end to end (Draft commit, wait, separate Approved commit, single-Task judgement); ai-git on PATH confirmed. Verified against the pushed commits. Two framework findings raised outside this Feature: block-command only blocks leading git (items 18) and plan-lifecycle is not installed by the engineering bundle (item 19). Items 5 and 17 resolved, item 20 added.]
[2026-09-30 14:00] [Engineering Manager] [Revise] [AIF-005] [Per human: items 18 (block-command hook only blocks leading commands) and 19 (engineering bundle omits plan-lifecycle and adr-authoring) are not addressed by AIF-005. Marked resolved as out of scope and added to Out of Scope; they are tracked separately as AIF-007 and AIF-006.]
[2026-09-30 15:00] [Engineering Manager] [Revise] [AIF-005] [Fixed the Data Flow sentence so linking aif and ai-git into /usr/local/bin is its own step, separate from the bundle install.]
[2026-09-30 16:00] [Engineering Manager] [Revise] [AIF-005] [Per human: item 3 accepted (skills are still available on demand); item 15 out of scope (refresh uses the pinned-ref bump, and only a human can edit the Setup script); item 16 removed from this plan and handed to a background investigation, to be fixed on main if TaskOutput is not a real tool; item 20 will be tested (two-part feature run); item 6 (D1) still to run.]
[2026-09-30 17:00] [Engineering Manager] [Revise] [AIF-005] [Item 16 resolved outside this plan: TaskOutput confirmed removed from Claude Code (docs deprecate it, the 2.1.285 CLI ignores it); dropped from the adapter's task tool map directly on main per human instruction.]
[2026-09-30 18:00] [Engineering Manager] [Spike] [AIF-005] [Cloud stage D1 passed: bumping the pinned ref rebuilt the cached environment from a clean image and installed the new ref (old pre-fix tool names visible); PATH links confirmed in cloud; about 20 to 30 seconds first-start delay. Item 6 resolved. Only item 20 (two-part feature run) remains open.]
