# Feature Plan: Harness-Agnostic Project-Scope Install

## 1. Metadata

| Field               | Value                                                                       |
| ------------------- | --------------------------------------------------------------------------- |
| Feature ID          | AIF-012                                                                     |
| Project             | ai-foundation                                                               |
| Status              | Draft                                                                       |
| Author (Agent)      | Engineering Manager (drafted in a Claude Code session)                      |
| Reviewed By         | Pending                                                                     |
| Created             | 2026-09-29 00:00                                                            |
| Last Updated        | 2026-09-29 00:30                                                            |
| Standards           | javascript_base, javascript_node                                            |
| Total Tasks         | Not yet decomposed                                                          |
| Product Requirement | None                                                                        |
| ADRs                | None yet — see Section 8, item 1 (install-scope decision may need an ADR)   |

---

## 2. Goal

Let a session run as a chosen ai-foundation agent (e.g. `engineering-manager`) from its first turn, including fresh Claude Code cloud sessions. Today `aif install` writes only to the user's home directory, and the cloud `SessionStart` hook runs after the main-thread agent is already resolved, so an installed agent can be delegated to but never be the primary agent. Fix it with an optional, harness-agnostic project-scope option on `aif install`, implemented for Claude Code and Kiro together.

> Requirement traceability: N/A

---

## 3. Quick Summary

**Open Items:** 10 open (3 High / 6 Medium / 1 Low) — see Section 8

---

## 4. Scope

### In Scope

- An optional scope option on `aif install` (and `uninstall`/`status`) that any harness adapter can honour: components written under the project (`.claude/`, `.kiro/`) instead of the user's home directory. Global remains the default.
- Implementation for both Claude Code and Kiro. Kiro's part cannot be tested in this environment; it is built from the adapter contract and existing Kiro path conventions, and flagged as unverified.
- A per-harness way to declare the primary agent (Claude Code: `agent` in `.claude/settings.json`; Kiro: mechanism unverified, Section 8) without clobbering existing settings such as the `SessionStart` hook.
- Staleness detection for the committed project-scope copies (`aif status`, and a check CI can run).
- Updating the affected arc42 sections and README cloud-setup guidance.

### Out of Scope

- Harnesses other than Claude Code and Kiro.
- Changing the existing global (`~/.claude/`) install behaviour or its default.
- Fixing the `youtrack` MCP proxy 403 seen in cloud sessions.
- New agents or changes to any agent's tool list.

---

## 5. Feature Description

### User-Facing Behaviour

A project owner runs `aif install -B engineering -H claude --scope project` (flag name is a proposal; the same flag works for `-H kiro`), commits the resulting harness directory, and sets the primary agent. Every new session in that repo starts with that agent as the main thread. Omitting `--scope` keeps today's global install.

### Data Flow

`aif install` → `resolveBundle()` (unchanged) → the selected adapter, given a scope → files under the project's harness directory (Claude: `.claude/{agents,rules,skills,standards,scripts}`; Kiro: `.kiro/{agents,steering,skills,servers,standards}`) → manifest records the scope → `aif status` compares snapshots as it does today. The primary-agent setting is written by the adapter into that harness's own settings file.

### Business Rules

- Global install stays the default; project scope is opt-in and harness-independent.
- Scope handling lives in the shared adapter contract (`base.js`), not duplicated per harness.
- The primary-agent setting only names an agent that the same install actually wrote.
- Existing keys in `.claude/settings.json` (hooks, permissions) are preserved on merge.
- Uninstall removes only what the manifest recorded for that scope.

### Error States

| Scenario                                        | Expected Behaviour                                          |
| ----------------------------------------------- | ----------------------------------------------------------- |
| Named primary agent not in the installed bundle | Fail before writing; name the missing agent                 |
| Harness settings file is not valid JSON         | Abort without modifying it; report the parse error          |
| Harness has no project-scope support/primary-agent mechanism | Install files anyway; report that the primary agent was not set |
| Project-scope files older than bundle source    | `aif status` reports stale; check exits non-zero for CI use |

---

## 6. Architecture Overview

### New Components

| Component              | Type    | Responsibility                                                                 |
| ---------------------- | ------- | ------------------------------------------------------------------------------ |
| Scope-aware `TARGETS`  | Adapter | Both `claude.js` and `kiro.js` derive target paths per scope (global vs project) instead of one constant |
| Primary-agent setter   | Adapter | New optional adapter-contract function; each harness merges its own setting without dropping other keys |
| Scope in manifest      | Library | Record which scope a bundle was installed to, so status/uninstall find it      |

### Component Relationships

Extends §5.02 (the shared adapter contract gains a scope input and an optional primary-agent function; `claude.js` and `kiro.js` both implement them), §5.05 (`install`, `uninstall`, `status` gain a scope option), §5.03/§6 (manifest and freshness carry scope). `resolver.js` (§5.01) is unaffected.

### Integration Points

- `lib/harnesses/claude.js` / `kiro.js` — `TARGETS`, MCP settings paths, `{{standards_path}}` substitution, and (Claude) `hookScriptPath()` all currently assume the home directory.
- `lib/commands/install.js` / `uninstall.js` / `status.js` — flag parsing and manifest use.
- Project settings files (`.claude/settings.json`, Kiro equivalent) — shared with the existing `SessionStart` hook.

---

## 7. Security Considerations

- Settings merge must never overwrite or drop hooks/permissions (a dropped deny rule is a security regression). Covered by the settings-merge Task's tests.
- Committed `block-command` hook and agent `blocked_commands` must reference a project-relative path (e.g. via `$CLAUDE_PROJECT_DIR`), not an absolute home path.
- Committed files must contain no tokens or resolved secrets (`${VAR}` placeholders only).

---

## 8. Risks & Open Questions

| # | Risk / Question | Type | Impact | Source | Raised By | Resolved |
| - | --------------- | ---- | ------ | ------ | --------- | -------- |
| 1 | Is project-scope install (committed `.claude/`) the right approach, or is another route better? Cloud-sandbox Test 1 proved committed project files work; Test 2 proved the Setup script alone works too: it wrote `~/.claude/settings.json` (`agent`) and `~/.claude/agents/engineering-manager.md` before launch and the session started as that agent, with no `.claude/` in the repo. The Setup-script route needs no new scope in `aif install` at all, only a way to get the real agent files onto the VM before launch (Test 3) and a way to set `agent` in user settings. Decide whether project scope is still needed. Likely needs an ADR from Architect. | Question | H | Arch | Agent | No |
| 2 | Agents must exist at startup, so project-scope files must be committed, not generated by the hook. This creates copies that can drift from source. Is a CI/`aif status` staleness gate enough? | Question | H | Arch | Agent | No |
| 3 | Resolved by the spike (`spike-main-thread-agent.md`): `agent` in project settings and `--agent` both make a custom agent the main thread, it can dispatch subagents, and both user- and project-scope files work if present at startup. Confirmed in a real cloud session (cloud-sandbox Test 1): committed `.claude/settings.json` plus `.claude/agents/` made the session run as Engineering-Manager and dispatch `principal-engineer`. Remaining unverified: interactive-mode tool set (headless omits `Task*`, `Grep`, `Glob` even without an agent). | Risk | H | Design | Agent | Yes |
| 4 | Scope of project install: agents only, or the full bundle (rules, skills, standards, servers)? Agents embed preloaded skills at install; rules/standards paths (`{{standards_path}}`) and MCP registration (`~/.claude.json` vs `.mcp.json`) differ by scope. | Question | M | Design | Agent | No |
| 5 | Which primary agent, and who writes the primary-agent setting — `aif` (a `--primary <agent>` option) or the project owner by hand? | Question | M | Design | Agent | No |
| 6 | Kiro: project-scope paths and any native "default/primary agent" mechanism are unverified and cannot be tested here. Build against documented Kiro conventions, mark untested, and confirm on a real Kiro install before relying on it. | Risk | M | Design | Human | No |
| 7 | A committed `agent` setting naming a missing agent silently falls back to the default agent (spike finding 4c). The install must verify the agent exists, and `aif status` should flag it. | Risk | M | Spike | Agent | No |
| 8 | Discovered defect, outside this Feature: the Claude adapter passes `@server/tool` entries through unchanged, but Claude Code only grants `mcp__server__tool`, so the manager loses its `dag`/`youtrack` tools. Needs its own Feature or fix; see the spike doc. | Question | H | Spike | Agent | No |
| 9 | Per the cloud docs, a session with several repositories (including a project thread) does not read any repo's `.claude/settings.json` except two plugin keys, so a committed `agent` setting would not apply there. The Setup-script route (Test 2) has no such limit. | Risk | M | Docs | Agent | No |
| 11 | The Setup script is cached (rebuilt on script change or after about 7 days), so agent files it installs go stale until then. A SessionStart `aif install` refreshes them, but only takes effect for the next session's main thread. Acceptable, or does the script need a version stamp to force rebuilds? | Risk | M | Docs | Agent | No |
| 10 | For this repo itself, committing generated `.claude/` copies duplicates `agents/`, `skills/`. Acceptable, or exclude ai-foundation and target consumer repos only? | Question | L | Design | Agent | No |

---

## 9. Task Decomposition

Not yet decomposed — produced after this plan is Approved (`skill/feature-planning`: "Step 5 — Decompose into Tasks").

---

## 10. Acceptance Criteria

- [ ] All Tasks complete and signed off
- [ ] Feature works end-to-end as described in Section 5
- [ ] A fresh cloud session in a repo with committed project-scope install starts with the chosen agent as main thread (verified, not assumed)
- [ ] Global install behaviour and existing tests unchanged; Kiro project scope covered by unit tests, with real-Kiro verification recorded as pending
- [ ] No HIGH or CRITICAL findings open in any Task review
- [ ] Affected arc42 sections and `key_files` updated in the same Tasks

---

## 11. Work Log

[2026-09-29 00:00] [Engineering Manager] [Draft] [AIF-012] [Initial draft from architecture review (§5.01, 5.02, 5.05, 6) and cloud-session findings; Feature ID chosen as next after AIF-011 (see the correction entry below).]
[2026-09-29 00:30] [Engineering Manager] [Revise] [AIF-012] [Per human: project install must be harness-agnostic, include Kiro (untestable here), and be an optional install-CLI flag. Feature ID still open (AIF-005 vs AIF-012, legacy decision-record overlap).]
[2026-09-29 01:00] [Engineering Manager] [Correction] [AIF-012] [Feature IDs already in use: AIF-001 to AIF-004, the legacy Epics that `docs/process-model.md` replaced with Features, found in `docs/plans/epics/` and `docs/plans/archive/` (`docs/plans/completed/` holds no IDs; `docs/plans/features/` is empty). AIF-005 to AIF-011 are retired decision-record IDs, cited only in those Epics and their chunk plans. The next Feature ID in the series is therefore AIF-005, but the overlap with those retired IDs makes it ambiguous, so AIF-012 stays as a placeholder until the human chooses.]
[2026-09-29 02:00] [Engineering Manager] [Spike] [AIF-012] [Ran the main-thread agent spike; item 3 resolved, items 7 and 8 added. Details in `spike-main-thread-agent.md`.]
[2026-09-29 03:00] [Engineering Manager] [Spike] [AIF-012] [Cloud-sandbox Test 1 passed in a real cloud session. Read the cloud docs on Setup scripts and settings: the Setup script can persist files in `~/.claude/`, and repo settings are ignored in multi-repo sessions. Item 1 revised, item 9 added, Test 2 designed in `spike-main-thread-agent.md`.]
[2026-09-29 04:00] [Engineering Manager] [Spike] [AIF-012] [Cloud-sandbox Test 2 passed: the Setup script alone provisioned the primary agent. Item 1 revised (project scope may not be needed), item 11 added (Setup-script cache staleness). Test 3 designed in `spike-main-thread-agent.md`.]
