# Feature Plan: Shell-aware `block-command` hook

## 1. Metadata

| Field               | Value                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------ |
| Feature ID          | AIF-007                                                                                    |
| Project             | ai-foundation                                                                              |
| Status              | Draft                                                                                      |
| Author (Agent)      | Claude Code session (standalone; no dispatched agent)                                      |
| Reviewed By         | Pending                                                                                    |
| Created             | 2026-09-30                                                                                 |
| Last Updated        | 2026-09-30                                                                                 |
| Standards           | `javascript`, `node` (per `.aiconfig.json`)                                                |
| Total Tasks         | Pending approval                                                                           |
| Product Requirement | None                                                                                       |
| ADRs                | None (see Section 8, question 1 — Architect to decide whether the parser choice needs one) |

Source investigation: [`docs/research/block-command-bypass.md`](../../../research/block-command-bypass.md).

---

## 2. Goal

Make the Claude Code `block-command` hook enforce an agent's `blocked_commands` (for example `git *`, `gh *`) against every simple command inside a shell command line, instead of only against a command string that happens to start with the pattern. Agents that must use `ai-git` can then no longer run raw `git` or `gh` by accident through compound commands, pipes, env-var prefixes, absolute paths, wrappers, multi-line commit messages, or re-entered shells.

> Requirement traceability: N/A. Motivated by a cloud session in which engineering-manager made raw-git commits authored "Claude <noreply@anthropic.com>" instead of the AI identity from `.aiconfig.json`, contrary to `steering/engineering/git-workflow-core.md`: "Use `ai-git` for All Git and GitHub Operations".

---

## 3. Quick Summary

**Open Items:** 3 open (1 High / 1 Medium / 1 Low) — see Section 8

---

## 4. Scope

### In Scope

- Rewrite the hook's matching logic to split a command into simple commands, normalize each, and apply the existing `blocked_commands` glob to each.
- Close the bypass classes reproduced in the investigation: compound commands, pipes, subshells and groups, control flow, env-var prefixes, absolute and relative paths, wrappers, `bash|sh -c` and `eval`, `xargs`, `find -exec`, command substitution, quoting and escaping of the command word, newlines (including heredoc commit messages), bare commands, and leading whitespace.
- Block command words whose executable cannot be determined statically (dynamic command words), while allowing the env-var mechanics agents legitimately need.
- Unit tests for the new logic and new integration tests that run the real hook CLI.
- Update arc42 §5.02 (and `key_files`) and the `blocked_commands` description where it states the matching semantics.

### Out of Scope

- The identity backstop (option (d) in the investigation: ambient `GIT_AUTHOR_*`/`GIT_COMMITTER_*`). Tracked as a separate decision (Section 8, question 2).
- Kiro: its `blocked_commands` handling is unchanged and unverified. Explicitly not needed for this Feature.
- Native permission deny rules, a PATH shim, a commit-time audit, or sandboxing.
- Closing gaps that cannot be closed by inspecting command text: interpreters that call git internally (`python -c`, `node -e`), scripts and build tools (`make`, `npm run x`, a repo script), shell functions and aliases defined in earlier commands.
- Any change to the `blocked_commands` schema: it stays a list of globs.

---

## 5. Feature Description

### User-Facing Behaviour

Agents with `blocked_commands` see a block (exit 2, message on stderr) whenever any part of their Bash command would run a blocked command, wherever it appears in the command line. Commands that only _mention_ a blocked word (for example `echo "git status"`, `grep git README.md`, `cat .gitignore`, `git-lfs ls-files`, or `ai-git commit -m "git push fixed"`) still run.

### Data Flow

Claude Code sends the PreToolUse payload on stdin → `cli.js` reads `tool_input.command` → `logic.js` splits it into simple commands → each is normalized → each is tested against every pattern → first match blocks with a message naming the pattern (or the dynamic-word reason).

### Business Rules

- **Matching unit.** Each simple command is matched after normalization. The existing glob semantics are unchanged; additionally a trailing ` *` also matches the bare command (`git *` matches `git`).
- **Normalization.** Strip leading `VAR=value` assignments; strip a fixed wrapper list and each wrapper's own flags; take the executable's basename; remove quoting and escaping of the command word (`"git"`, `\git`, `gi""t` all normalize to `git`).
- **Re-entry.** Recurse into `bash|sh -c '…'`, `eval` with a literal argument, `find -exec`, command substitution (`$(…)`, backticks), process substitution, subshells and groups, control-flow bodies, and heredoc bodies that are subject to expansion. Text that is only quoted data (for example a quoted heredoc body or an `echo` argument) is not executed and is not matched.
- **Env vars that must keep working.** Leading env assignments (`GIT_AUTHOR_NAME=x cmd`, `env VAR=x cmd`), `export`, variables in arguments, and a variable used as the prefix of a path whose final component is literal (`$HOME/.local/bin/tool`, `"$PWD/node_modules/.bin/eslint"`, `${CLAUDE_PROJECT_DIR}/scripts/x.sh`) are never blocked by themselves; the literal basename is what is matched.
- **Dynamic command words are blocked.** A command word whose basename cannot be determined statically is blocked for any agent that has at least one `blocked_commands` entry, because it could expand to a blocked command: a variable or substitution as the whole word or its final path component (`$g log`, `"$GIT" log`, `${cmd}`, `$(echo git) log`, `` `x` log ``, `/usr/bin/$x`), `eval` with a non-literal argument, an unquoted glob or brace pattern in the command word (`/usr/bin/g?t`, `{git,x}`), and ANSI-C or other quoting that cannot be resolved. The block message states that the command word is dynamic and asks for it to be written literally.
- **Failure behaviour.** The parser is best-effort and never throws on odd input: an unbalanced construct is treated as literal text. If the command still cannot be parsed, or an internal error occurs, the hook **fails open** (allows), so new shell syntax never bricks an agent's Bash use. A malformed hook payload also fails open, as today.
- **Positioning unchanged.** The hook remains workflow discipline, not a security boundary; the header comment and arc42 say so and list the residual gaps.

### Error States

| Scenario                                                 | Expected Behaviour                                                  |
| -------------------------------------------------------- | ------------------------------------------------------------------- |
| Simple command matches a pattern                         | Exit 2; stderr names the matched pattern                            |
| Dynamic command word for an agent with blocked entries   | Exit 2; stderr says the command word is dynamic and must be literal |
| Command cannot be parsed, or internal parser error       | Exit 0 (fail open)                                                  |
| Invalid JSON, empty stdin, missing or non-string command | Exit 0 (fail open), unchanged                                       |

---

## 6. Architecture Overview

### New Components

| Component                                                          | Type       | Responsibility                                                                       |
| ------------------------------------------------------------------ | ---------- | ------------------------------------------------------------------------------------ |
| Command splitter / normalizer (in `logic.js`, or a sibling module) | Pure logic | Turn a command string into normalized simple commands and flag dynamic command words |
| `cli.js` integration tests                                         | Test       | Spawn the real hook CLI with PreToolUse payloads and assert exit code and stderr     |

### Component Relationships

`lib/harnesses/claude.js` (`buildHookCommand`, `installBlockCommandResource`) installs `logic.js` and `cli.js` to `~/.claude/scripts/block-command/` and wires the hook into each agent's frontmatter. `cli.js` calls `matchesBlockedCommand` in `logic.js`; only the internals of `logic.js` change, plus a possible extra module.

### Integration Points

- `lib/harnesses/claude.js` — the installer copies exactly `['logic.js','cli.js']` today with no `node_modules`; the parser must be dependency-free, and any new module file must be added to that list and to the manifest/uninstall tests.
- `docs/decisions/0003-shared-resource-lifecycle-management.md` — governs the shared-resource install/uninstall lifecycle the hook relies on.
- `docs/architecture/05_02_harness_adapters.md` — describes the hook and must be updated, including `key_files`.
- Agents carrying `blocked_commands` today: engineering-manager, software-engineer, principal-engineer.

---

## 7. Security Considerations

- This is a discipline control, not a security boundary. The plan does not claim otherwise, and the residual gaps (Section 4, Out of Scope) are documented in arc42.
- Fail-open on unparseable input is a deliberate, human-approved choice: an input crafted so the parser misreads it but bash runs it would be allowed. It is the same class as the other accepted residual gaps and is mitigated by making the parser lenient rather than throwing.
- Dynamic command words are blocked to close deliberate evasion (`g=git; $g log`); blocking is a Task acceptance criterion, not optional.
- No token or credential handling changes; the hook never logs command text beyond the matched pattern name.

---

## 8. Risks & Open Questions

| #   | Risk / Question                                                                                                                                                                                     | Type     | Impact | Source       | Raised By | Resolved |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------ | ------------ | --------- | -------- |
| 1   | Parser approach: hand-written zero-dependency tokenizer (prototype ~120 lines) vs a third-party parser that would need bundling into the installed hook. Route to Architect; ADR only if contested. | Question | H      | Architecture | Agent     | No       |
| 2   | Identity backstop (option (d)): include in a follow-up Feature or drop? Scope (agent/cloud sessions vs everyone) and mechanism need a human decision. See investigation brief, option (d).          | Question | M      | Design       | Agent     | No       |
| 3   | A hand-written shell parser can drift from bash syntax; mitigated by fail-open on parse failure and a broad false-positive test suite.                                                              | Risk     | L      | Design       | Agent     | No       |
| 4   | Fail-open on unparseable commands (human decision 2026-09-30).                                                                                                                                      | Question | M      | Design       | Human     | Yes      |
| 5   | Block dynamic command words, allowing env-var injection and variable-prefixed paths with a literal basename (human decision 2026-09-30).                                                            | Question | M      | Design       | Human     | Yes      |

---

## 9. Task Decomposition

Pending approval. Sizing intent: about three Tasks — (1) splitter/normalizer, dynamic-word rule and unit tests; (2) `cli.js` integration tests plus installer/manifest changes if a module is added; (3) arc42 §5.02 and semantics documentation. Decomposed with `tasks.json` and `dag-validate` only after `Status: Approved` is committed.

---

## 10. Acceptance Criteria

- [ ] All Tasks complete and signed off
- [ ] Every bypass class in the investigation brief (section 1) that is in scope is blocked by a unit test, including the heredoc commit message and bare `git`/`gh`
- [ ] The false-positive guard list (quoted mentions, `grep git`, `cat .gitignore`, `git-lfs`, `ai-git …`, `command -v git`) still runs
- [ ] Dynamic command words are blocked; leading env assignments, `export`, and variable-prefixed paths with a literal basename still run
- [ ] Unparseable input and malformed payloads fail open (tested through the real CLI)
- [ ] The installed copy under `~/.claude/scripts/block-command/` works with the final file list; install and uninstall lifecycle tests pass
- [ ] arc42 §5.02 and its `key_files` updated; residual gaps documented; `aif index architecture --check` passes as the final local step
- [ ] `npm test` passes
- [ ] No HIGH or CRITICAL findings open in any Task review

---

## 11. Work Log

[2026-09-30] [Claude Code session] [Draft] [AIF-007] [Drafted from `docs/research/block-command-bypass.md`. Decision: fail open on unparseable commands. **Why:** shell syntax changes must not require a hook change and must not brick agent Bash use. Decision: block dynamic command words while allowing env assignments and variable-prefixed literal paths. **Why:** dynamic words are deliberate evasion with no normal agent use; env injection is required.]
