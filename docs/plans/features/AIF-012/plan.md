# Feature Plan: Project-Scoped Install for Primary Agent

## 1. Metadata

| Field               | Value                                                                       |
| ------------------- | --------------------------------------------------------------------------- |
| Feature ID          | AIF-012                                                                     |
| Project             | ai-foundation                                                               |
| Status              | Draft                                                                       |
| Author (Agent)      | Engineering Manager (drafted in a Claude Code session)                      |
| Reviewed By         | Pending                                                                     |
| Created             | 2026-09-29 00:00                                                            |
| Last Updated        | 2026-09-29 00:00                                                            |
| Standards           | javascript_base, javascript_node                                            |
| Total Tasks         | Not yet decomposed                                                          |
| Product Requirement | None                                                                        |
| ADRs                | None yet — see Section 8, item 1 (install-scope decision may need an ADR)   |

---

## 2. Goal

Let a session run as a chosen ai-foundation agent (e.g. `engineering-manager`) from its
first turn, including fresh Claude Code cloud sessions. Today `aif install` writes only to
`~/.claude/`, and the cloud `SessionStart` hook runs after the main-thread agent is
already resolved, so an installed agent can be delegated to but never be the primary agent.

> Requirement traceability: N/A

---

## 3. Quick Summary

**Open Items:** 6 open (3 High / 2 Medium / 1 Low) — see Section 8

---

## 4. Scope

### In Scope

- A project-scope install target for the Claude harness: components written under the
  project's `.claude/` instead of `~/.claude/`.
- A way to declare the primary agent for a project (Claude Code's `agent` setting in
  `.claude/settings.json`) without clobbering existing settings such as the `SessionStart` hook.
- Staleness detection for the committed project-scope copies (`aif status`, and a check CI can run).
- Updating the affected arc42 sections and README cloud-setup guidance.

### Out of Scope

- Kiro project-scope install (no confirmed native "primary agent" mechanism; revisit separately).
- Changing the existing global (`~/.claude/`) install behaviour or its default.
- Fixing the `youtrack` MCP proxy 403 seen in cloud sessions.
- New agents or changes to any agent's tool list.

---

## 5. Feature Description

### User-Facing Behaviour

A project owner runs `aif install -B engineering -H claude --scope project` (flag name is
a proposal), commits the resulting `.claude/` files, and sets the primary agent. Every new
session in that repo — local or cloud — starts with that agent as the main thread. Omitting
`--scope` keeps today's global install.

### Data Flow

`aif install` → `resolveBundle()` (unchanged) → Claude adapter with project-scope `TARGETS`
→ files under `<project>/.claude/{agents,rules,skills,standards,scripts}` → manifest
records the scope → `aif status` compares snapshots as it does today. Primary-agent
setting is merged into `<project>/.claude/settings.json`.

### Business Rules

- Global install stays the default; project scope is opt-in.
- The primary-agent setting only names an agent that the same install actually wrote.
- Existing keys in `.claude/settings.json` (hooks, permissions) are preserved on merge.
- Uninstall removes only what the manifest recorded for that scope.

### Error States

| Scenario                                        | Expected Behaviour                                          |
| ----------------------------------------------- | ----------------------------------------------------------- |
| Named primary agent not in the installed bundle | Fail before writing; name the missing agent                 |
| `.claude/settings.json` is not valid JSON       | Abort without modifying it; report the parse error          |
| Project-scope files older than bundle source    | `aif status` reports stale; check exits non-zero for CI use |

---

## 6. Architecture Overview

### New Components

| Component              | Type    | Responsibility                                                                 |
| ---------------------- | ------- | ------------------------------------------------------------------------------ |
| Scope-aware `TARGETS`  | Adapter | Resolve Claude target paths per scope (global vs project) instead of one constant |
| Settings merge (pure)  | Library | Merge the `agent` key into existing settings JSON without dropping other keys  |
| Scope in manifest      | Library | Record which scope a bundle was installed to, so status/uninstall find it      |

### Component Relationships

Extends §5.02 (adapters: `TARGETS` becomes derived from scope), §5.05 (`install`,
`uninstall`, `status` gain a scope option), §5.03/§6 (manifest and freshness carry scope).
`resolver.js` (§5.01) is unaffected.

### Integration Points

- `lib/harnesses/claude.js` — `TARGETS`, `hookScriptPath()`, `{{standards_path}}` substitution
  all currently assume `~/.claude/`.
- `lib/commands/install.js` / `uninstall.js` / `status.js` — flag parsing and manifest use.
- `.claude/settings.json` in target projects — shared with the existing `SessionStart` hook.

---

## 7. Security Considerations

- Settings merge must never overwrite or drop hooks/permissions (a dropped deny rule is a
  security regression). Covered by the settings-merge Task's tests.
- Committed `block-command` hook and agent `blocked_commands` must reference a
  project-relative path (e.g. via `$CLAUDE_PROJECT_DIR`), not an absolute home path.
- Committed files must contain no tokens or resolved secrets (`${VAR}` placeholders only).

---

## 8. Risks & Open Questions

| # | Risk / Question | Type | Impact | Source | Raised By | Resolved |
| - | --------------- | ---- | ------ | ------ | --------- | -------- |
| 1 | Is project-scope install (committed `.claude/`) the right approach, or is another route better? The Setup script can't do it (README: it runs before checkout), `SessionStart` is too late, and a container image is outside this repo. Likely needs an ADR from Architect. | Question | H | Arch | Agent | No |
| 2 | Agents must exist at startup, so project-scope files must be committed, not generated by the hook. This creates copies that can drift from source. Is a CI/`aif status` staleness gate enough? | Question | H | Arch | Agent | No |
| 3 | Unverified: how a main-thread custom agent behaves (does it get `Agent`/`Task*` tools per its `tools` list? can it dispatch subagents? does `agent` in project settings apply in cloud sessions?). Needs a spike before design is fixed. The docs-lookup answer so far is unverified. | Risk | H | Design | Agent | No |
| 4 | Scope of project install: agents only, or the full bundle (rules, skills, standards, servers)? Agents embed preloaded skills at install; rules/standards paths (`{{standards_path}}`) and MCP registration (`~/.claude.json` vs `.mcp.json`) differ by scope. | Question | M | Design | Agent | No |
| 5 | Which primary agent, and who writes the `agent` setting — `aif` (a `--primary <agent>` option) or the project owner by hand? | Question | M | Design | Agent | No |
| 6 | For this repo itself, committing generated `.claude/` copies duplicates `agents/`, `skills/`. Acceptable, or exclude ai-foundation and target consumer repos only? | Question | L | Design | Agent | No |

---

## 9. Task Decomposition

Not yet decomposed — produced after this plan is Approved (`skill/feature-planning`: "Step 5 — Decompose into Tasks").

---

## 10. Acceptance Criteria

- [ ] All Tasks complete and signed off
- [ ] Feature works end-to-end as described in Section 5
- [ ] A fresh cloud session in a repo with committed project-scope install starts with the chosen agent as main thread (verified, not assumed)
- [ ] Global install behaviour and existing tests unchanged
- [ ] No HIGH or CRITICAL findings open in any Task review
- [ ] Affected arc42 sections and `key_files` updated in the same Tasks

---

## 11. Work Log

[2026-09-29 00:00] [Engineering Manager] [Draft] [AIF-012] [Initial draft from architecture review (§5.01, 5.02, 5.05, 6) and cloud-session findings; Feature ID chosen as next after AIF-011, the highest ID found under docs/.]
