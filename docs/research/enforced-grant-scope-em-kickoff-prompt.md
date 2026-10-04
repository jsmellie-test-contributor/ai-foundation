# Kickoff prompt: Engineering Manager — Feature Plan for enforced grant scope (write paths, read-only shell, allowed commands)

Paste everything below the line into a new session running the `engineering-manager` agent.

---

You are the Engineering Manager. Produce a **Draft Feature Plan** (via `skill/feature-planning`) that makes the scope limits on an agent's tool grants enforced instead of advisory. Do not implement anything.

## Problem

An agent's `tools` list says little about what it can actually do. The same `write` is limited to specific paths for some agents and unrestricted for others, and that limit exists only as prose in the agent's Hard rules. Only `blocked_commands` (a deny list of shell command globs) is enforced, by the Claude Code `PreToolUse` hook (`lib/harnesses/assets/block-command/`, Feature AIF-007) and by Kiro `permissions.rules`. Current advisory limits, all verified in `agents/*.yaml`:

| Agent                  | Advisory limit today                                                    | Enforced today                  |
| ---------------------- | ----------------------------------------------------------------------- | ------------------------------- |
| architect              | `write` only under `{paths.decisions}/**` and `{paths.architecture}/**` | Nothing                         |
| engineering-researcher | `write` only to `.md` files under `{paths.research}`                    | Nothing                         |
| principal-engineer     | `shell` only for read-only validation (tests, linters, validators)      | `git *` and `gh *` blocked only |
| software-engineer      | None on `write` or `shell`                                              | `git *` and `gh *` blocked      |
| engineering-manager    | None on `write` or `shell`                                              | `git *` and `gh *` blocked      |

Agents are often dispatched as unattended subagents, so a limit that depends on the model following prose is the weakest control exactly where no human is watching. The Feature AIF-011 tool-risk scale (a single impact tier per tool plus capability flags) can only credit a limit in review once it is enforced, so this Feature feeds it, but neither depends on the other.

## Goal

Three scoped controls, planned together because they share the schema, the Claude hook and the Kiro mapping:

1. **Write scope.** An agent definition can restrict `write` to path globs, enforced for the Claude native write tools (Write, Edit, NotebookEdit, and any other file-mutating native tool; verify the list) and mapped to Kiro where it supports it.
2. **Read-only shell.** An agent definition can say its `shell` is read-only (for example Principal-Engineer's validation use). Define what "read-only" means precisely and enforceably; it is not a property of a command string by itself.
3. **`allowed_commands`.** The allow-list counterpart of `blocked_commands`: when present, only matching simple commands may run. Decide whether read-only shell is simply an `allowed_commands` list of read-only commands, or a separate concept. These two overlap and the plan must resolve that explicitly.

## Constraints and process (follow the repo's own rules)

- Governing gate: `skill/complexity-tiers` and `steering/engineering/core.md`. This is cross-cutting (agent schema, two adapters, a hook, tests, arc42), so plan it as a Feature.
- Commit the plan to **main** with `Status: Draft` before presenting it, each revision as a new commit, and stop at Draft. Follow `skill/plan-lifecycle` and `steering/engineering/git-workflow-framework.md`. Use `ai-git`, never raw `git` or `gh`. Do not decompose into Tasks until the human has approved and the `Approved` commit exists.
- Read first: `docs/plans/features/AIF-007/plan.md` and `docs/research/block-command-bypass.md` (the shell-aware matcher and the bypass classes it closes), `docs/architecture/05_02_harness_adapters.md`, `docs/decisions/0002-steering-schema-harness-scoping.md` (no per-harness fields in source), `docs/decisions/0007-harness-neutral-platform-tool-groups.md`, and the `AGENTS.md` agent-schema section.
- **Contested, costly-to-reverse forks to raise as open questions, recommending Architect for an ADR (ask the human to confirm that dispatch; do not decide them yourself):** the schema shape (new fields such as `write_paths` and `allowed_commands`, or one structured `scope` block), whether read-only shell is a separate concept or an allow-list, and the fail-open versus fail-closed behaviour of a new hook.
- **Verify before relying, as explicit Task steps or open questions:**
  - Whether Claude Code's native permission rules (tool plus pattern allow and deny) could enforce path and command scope more cheaply than a custom hook. AIF-007 declined them; record why and whether that still holds.
  - Which Claude native tools mutate files, and whether a `PreToolUse` hook can see the target path for each.
  - What Kiro does with a write-scope rule and an allow-list (`permissions.rules` capability names beyond `shell`), given the reports of silent rejection of unrecognised config in `docs/research/tool-tiers-and-harness-parity.md` §4.
  - Path-matching bypass classes for write scope: `..`, absolute versus relative paths, symlinks, case-insensitive filesystems on Windows, and writes through `shell` (`tee`, redirects) that skip the write tool. State which are closed and which are out of reach, in the way AIF-007 did.
  - Whether an allow-list needs the same shell parser as AIF-007's matcher and can reuse `logic.js`.
- Remember `AGENTS.md` calls the hook "workflow discipline, not a security boundary". The plan must say what each control does and does not guarantee, and must not describe it as sandboxing.
- Include a testing approach that runs the real hook CLI against crafted tool inputs (as AIF-007 did), and asserts the resolved scope per agent and harness, not only that files validate.
- Include a Doc-Update step for `docs/architecture/05_02_harness_adapters.md` (and `06_runtime.md` where it describes the hook), with `key_files` and `last_verified` per `steering/engineering/architecture-authoring.md`.
- Include a migration step that moves each advisory limit in the table above into the new fields and removes the duplicated prose from the agent's Hard rules (cite the field, do not restate it).
- Include at least one Out of Scope item. Suggested: sandboxing or OS-level isolation, interpreters that write files internally (`python -c`, `node -e`), network egress control, and any change to which agents hold which tools.
- Do not add scope beyond this brief; additions go back to the human as suggestions.

## Decisions to put to the human in the plan's open questions

1. Schema shape and field names (needs the Architect ADR above).
2. Read-only shell as its own concept or as an `allowed_commands` list.
3. Fail-open or fail-closed when the hook cannot parse a command or path, and how that interacts with unattended subagents.
4. Rollout order if it should be split: write scope first, then allow-list and read-only shell.
5. Whether Kiro parity is required in this Feature or recorded as a gap in `docs/architecture/11_risks.md`.

Present the Draft plan for review and wait. Report the commit SHA of the Draft when done.
