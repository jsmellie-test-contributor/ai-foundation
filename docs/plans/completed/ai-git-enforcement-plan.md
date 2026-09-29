# Enforce ai-git for All Agents — Implementation Plan

> Status: Complete
> Created: 2026-08-12
> Completed: 2026-08-12
> Approved by: Jeremy (pre-approved with outline)

---

## Overview

Replace all direct `git` and `gh` usage across agents with `ai-git`, and block agents from executing `git` or `gh` directly via harness-native command denial. This ensures all git operations use proper AI identity injection and token management automatically.

---

## Design Decisions

### `blocked_commands` Field (Per-Agent)

A new optional field on agent YAML definitions:

```yaml
blocked_commands:
  - 'git *'
  - 'gh *'
```

- Per-agent (not global) — different agents may need different restrictions in the future
- If all agents end up with the same list, a global/bundle-level mechanism can be added later
- Array of shell command glob patterns using `*` as wildcard
- Each harness adapter translates these into its native denial format

### Harness Translation

| Harness     | Native format                                                                    |
| ----------- | -------------------------------------------------------------------------------- |
| Kiro        | `permissions.rules` with `{ capability: "shell", match: [...], effect: "deny" }` |
| Claude Code | `permissions.deny` array with `"Bash(pattern)"` entries                          |
| Copilot     | Skipped for now (adapter not yet built)                                          |

### Steering Simplification

The AI Identity sections in git workflow steering files are largely obsolete now that `ai-git` handles identity injection and authentication transparently. Rules collapse:

- **Projects (was 4 rules → 2 rules):** Use `ai-git` + never echo tokens
- **Framework (was 4 rules → 2 rules):** Use `ai-git` + never echo tokens

### Scope

- All 8 agent definitions get `blocked_commands`
- All 8 agent prompts updated (where they reference git/gh directly)
- Both steering files simplified
- Worktree-management skill updated
- Harness adapters updated (Kiro + Claude Code)
- AGENTS.md schema updated
- Validation tests updated

---

## Tasks

### 1. Update AGENTS.md schema

- Add `blocked_commands` to Agent fields table
- Type: `string[]` (optional)
- Description: Shell command glob patterns blocked from direct execution

### 2. Update all agent YAML definitions

For all 8 agents, add:

```yaml
blocked_commands:
  - 'git *'
  - 'gh *'
```

Update prompts in agents that reference git/gh directly:

- **software-engineer:** Replace `gh pr create` → `ai-git gh-pr-create`, remove identity/auth hard rules
- **test-engineer:** Remove identity/auth hard rules, add "use `ai-git`" rule
- **engineering-manager:** Replace `git worktree` → `ai-git worktree` references

Agents with no git/gh prompt references (ai-engineer, architect, tech-lead, principal-engineer, engineering-tech-writer) get only the `blocked_commands` field.

### 3. Update harness adapters

**Kiro (`lib/harnesses/kiro.js`):**

- In `transformAgent()`, read `blocked_commands` from agent object
- If present, add `permissions.rules` array to output with deny entries

**Claude Code (`lib/harnesses/claude.js`):**

- In `transformAgent()`, read `blocked_commands` from agent object
- If present, add `permissions.deny` array with `Bash(pattern)` entries

### 4. Update steering files

**`steering/engineering/git-workflow-projects.md`:**

- Replace Rules 11-13 with: "Use `ai-git` for all git and GitHub operations."
- Keep Rule 14 (never echo tokens) simplified
- Update the Rationale to mention `ai-git`

**`steering/engineering/git-workflow-framework.md`:**

- Replace Rules 5-7 with: "Use `ai-git` for all git and GitHub operations."
- Keep Rule 8 (never echo tokens) simplified
- Update the Rationale to mention `ai-git`

### 5. Update worktree-management skill

- Replace all `git worktree` commands with `ai-git worktree`
- Replace `git branch -d` with `ai-git branch -d`

### 6. Update validation tests

- Schema validation: accept `blocked_commands` as optional `string[]`
- Harness adapter unit tests: verify `blocked_commands` emits correct deny rules
- Existing tests should continue passing (field is optional)

---

## Out of Scope

- Copilot harness adapter (not yet built)
- Global/bundle-level blocked commands (future enhancement if needed)
- Changes to `ai-git` itself (already complete and working)
- Changes to `.aiconfig.json` schema (no changes needed)
