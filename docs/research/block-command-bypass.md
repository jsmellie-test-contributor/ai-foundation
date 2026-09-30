# Brief: `block-command` hook bypasses

**Date:** 2026-09-30
**Status:** Investigation — awaiting human decision. No code changed.
**Tier:** Assessed as Tier 3 for implementation (see Recommendation); this brief is the Tier 2-style "stop for approval" deliverable.
**Plan ID:** none (standalone investigation). Proposed Feature ID for the fix: `AIF-007`.

## Summary

`blocked_commands: ["git *", "gh *"]` is enforced on Claude Code by a `PreToolUse` hook (`lib/harnesses/assets/block-command/{logic,cli}.js`) that tests the **entire command string** against a glob anchored with `^…$`. It therefore only blocks commands that _begin_ with `git ` / `gh ` and contain no newline. Almost every real-world way of running git escapes it, including the most common one: a `git commit -m "$(cat <<'EOF' … EOF)"` heredoc message, which is multi-line and so is **allowed**. That is the most likely cause of the raw-git commits observed in the cloud session (inference — the actual commands were not available to check).

Recommended fix: make the hook shell-aware (split into simple commands, normalize, match each) — option (a) — plus, as an independent backstop, make the AI identity apply regardless of how git is invoked — option (d). Neither closes every bypass; the hook stays "workflow discipline, not a security boundary", and the brief says where the residual gaps are.

## 1. Reproduction (real hook CLI)

Method: each command fed as `{"tool_name":"Bash","tool_input":{"command":…}}` on stdin to `node lib/harnesses/assets/block-command/cli.js "git *" "gh *"`; exit 2 = blocked. Probe scripts were run from the session scratchpad and are not committed.

| Class                               | Examples (all **allowed** unless noted)                                                                                   |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Baseline (blocked)                  | `git status`, `git -C /repo commit -m x`, `gh pr list`                                                                    |
| Compound: `&&` `;` `\|\|`           | `cd /repo && git add -A`, `cd /repo; git commit -m x`, `true \|\| git push`                                               |
| Pipes                               | `echo hi \| git apply`, `echo hi \|& git apply`, `echo x \| xargs git log`                                                |
| Subshell / group                    | `(git push)`, `{ git push; }`                                                                                             |
| Control flow                        | `if true; then git log; fi`, `for i in 1; do git log; done`                                                               |
| Env-var prefix                      | `GIT_DIR=. git log`, `FOO=1 BAR=2 git log`                                                                                |
| Absolute / relative path            | `/usr/bin/git status`, `./git status`                                                                                     |
| Wrappers                            | `env git log`, `command git log`, `exec git log`, `nohup git log`, `time git log`, `sudo git log`                         |
| Shell re-entry                      | `bash -c 'git log'`, `sh -c "git commit -m x"`, `eval "git log"`, `printf 'git log' \| sh`, `bash <(echo git log)`        |
| `xargs` / `find -exec`              | `xargs git log <<< x`, `find . -name x -exec git log \;`                                                                  |
| Command substitution                | `echo $(git log)`, ``echo `git log` ``                                                                                    |
| Quoting / escaping of the command   | `"git" log`, `'git' log`, `\git log`, `gi""t log`                                                                         |
| Indirection                         | `g=git; $g log`, `git=git; ${git} log`, `GIT=/usr/bin/git; $GIT log`, shell function wrapping git                         |
| Interpreters                        | `python3 -c "import subprocess; subprocess.run(['git','log'])"`, `node -e "require('child_process').execSync('git log')"` |
| Heredoc, then git                   | `cat <<EOF\nhi\nEOF\ngit push`                                                                                            |
| **Newline in the command** (new)    | `git commit -m "a\nb"`, `git log\necho x`, `echo x\ngit log`, `git commit -m "$(cat <<'EOF'\nmsg\nEOF\n)"`                |
| **Bare command / whitespace** (new) | `git`, `gh` (pattern needs a trailing space), `git<TAB>log`, ` git log` (leading space), `git<newline>log`                |

Two findings beyond the reported ones:

1. **Newlines defeat even a leading `git`.** `globToRegex` builds `^git .*$` without the dotAll flag, so `.` does not cross `\n`. Claude Code's standard commit flow (heredoc message) is exactly this shape. This alone bypasses the hook for the most common commit form, with no cleverness involved.
2. **Bare `git` / `gh`** and tab/leading-space forms are not matched (`git *` requires a literal `git ` prefix).

Fail-open behaviour (by design, per the `cli.js` header) also allows: invalid JSON, empty stdin, missing `tool_input`, non-string `command`, and an invocation with no patterns on argv. Only the first two are plausible in production; the design choice is unchanged by this brief.

Hook applicability caveat (from Claude Code docs, [sub-agents](https://code.claude.com/docs/en/sub-agents)): frontmatter hooks also fire when the agent runs as the main session (`--agent` / `agent` setting), so a primary-agent engineering-manager is covered; project-level agent files additionally need the workspace-trust dialog accepted, while user-level (`~/.claude/agents/`, where `aif install` writes) do not.

## 2. Options

Evaluation criteria: closes the observed gap, false-positive risk (`echo "git status"`, `grep git`, `cat .gitignore`, `git-lfs`, `ai-git …` must pass), harness-agnostic design, effort.

### (a) Split into simple commands, normalize, match each — **recommended**

Parse the command with a small shell-aware tokenizer (quotes, `$(…)`/backticks, `<(…)`, heredocs, `;` `&` `|` `&&` `||` `|&`, newlines, `( )`/`{ }`), producing simple commands. For each: strip leading `VAR=val` assignments, strip a wrapper list (`env command builtin exec nohup time sudo nice timeout xargs …` plus their flags and `if/then/do/…` keywords), take the executable's basename, and remove quoting/escapes. Recurse into `bash|sh -c '…'`, `eval`, and `find -exec`. Then apply the **existing glob** to the normalized string; a trailing ` *` also matches the bare command.

**Prototype result** (throwaway, ~120 lines, not committed): 55 must-block cases (every class in section 1 except interpreters/indirection) and 29 must-allow cases → 2 problems: `flock /tmp/l git log` missed (wrapper with a positional argument) and `command -v git` false-positive (lookup form, not execution). Both are fixable list refinements. Allowed correctly: `echo "git status"`, `cat .gitignore`, `git-lfs ls-files`, `ai-git commit -m "git push fixed"`, quoted and unquoted heredoc bodies containing the word git, `# git push`.

- **Pros:** pure logic (fits "Design for Testability"), no schema change (`blocked_commands` stays a glob list), one code path, fixes both new findings, low false-positive risk because matching is on the executable word, not substrings.
- **Cons:** a hand-written shell parser is a maintenance surface; it must be zero-dependency (see constraints); residual gaps below.
- **Residual gaps (cannot be closed statically):** variable/dynamic command words (`$g log`, `"$GIT" log`, `eval $cmd`), interpreters and scripts that call git internally (`python -c`, `node -e`, `make`, `npm run x`, a repo script), function/alias definitions, exec-wrappers taking positional args (`flock`, `watch`, `setsid`). Blocking any `$`-prefixed command word is possible but would also block legitimate `$CMD` use — a human decision.
- **Unparseable input:** prototype falls back to a coarse word-boundary scan (may false-positive only on malformed input) instead of failing open. Choice to confirm: fail-open (today's contract) vs coarse fallback.
- **Constraints found:** `installBlockCommandResource` (`lib/harnesses/claude.js`) copies exactly `['logic.js','cli.js']` to `~/.claude/scripts/block-command/`, with no `node_modules` — a parser dependency (e.g. `shell-quote`) would not resolve there without bundling, and any new module file needs adding to that list and to the manifest/uninstall tests. Adding a dependency or bundling step is an Architect decision per `steering/engineering/core.md`: "Escalate Technical Approach Uncertainty to Architect".

### (b) Claude Code native permission deny rules

Verified against [Configure permissions](https://code.claude.com/docs/en/permissions) and [sub-agents](https://code.claude.com/docs/en/sub-agents):

- Compound handling is **better than the current hook**: separators `&&` `||` `;` `|` `|&` `&` and newlines are split; "deny and ask rules apply when any subcommand matches", including inside subshells, command substitutions and control-flow bodies. A leading env assignment is matched past for deny rules; `timeout time nice nohup stdbuf command builtin` and flagless `xargs` are stripped.
- **Still not a boundary**, per the same page: `/usr/bin/git`, `bash -c 'git …'`, `git -C . push` (for a `Bash(git push *)` rule; `Bash(git *)` covers the `-C` form), `xargs -n1 git`, `find -exec`, `env`/`sudo` wrappers (not in the strip list) all escape a rule. The docs say a deny rule "isn't a security boundary around the program".
- **Scope is the blocker:** deny rules live in settings files (user/project/managed) and "apply to the main conversation and to subagents" — they cannot be scoped to one agent. Agent frontmatter `disallowedTools: Bash(git *)` "still removes the whole tool" rather than filtering commands. A `Bash(git *)` deny in settings would therefore block git for the human's own session and every agent, including agents with no `blocked_commands`; `ai-git` would keep working only because it spawns git outside the Bash tool.
- **Fit:** only workable as a project/managed settings deny in a repo where _every_ Claude session should use `ai-git`. Not equivalent to the per-agent `blocked_commands` field, and Claude-only. Useful as an additional layer, not a replacement.

### (c) `git` shim on PATH that refuses unless invoked via `ai-git`

- Needs PATH control for the Bash tool (settings `env` or a session-start hook exporting PATH) — again session-wide, not per-agent, so the human's own `git` breaks too unless the shim consults a marker env var that `ai-git` sets.
- Bypassed by `/usr/bin/git`, `command -p git`, `env PATH=… git`, and any tool that resolves git itself. `ai-git` currently spawns bare `git`, so it would need the real path or a marker.
- Harness-agnostic in principle (works for Kiro too) but adds installation state outside the repo, on PATH, per machine. High blast radius for a discipline control. **Not recommended.**

### (d) Make the identity apply regardless

`ai-git`'s value is (1) author/committer identity, (2) push/`gh` token injection. Identity alone can be made ambient: set `GIT_AUTHOR_NAME/EMAIL` and `GIT_COMMITTER_NAME/EMAIL` in the session environment (Claude Code settings `env`, or the cloud environment's variables) so any git process, however invoked, commits as "Starvoxel AI Agent". Alternatives: a per-repo `git config user.name/email` written by `aif init`/session-start.

- **Pros:** closes the _observed harm_ (wrong author) for every bypass class including interpreters and scripts; trivial; harness-agnostic (env is universal); independent of parsing.
- **Cons:** environment is session-wide, not per-agent — in a session where the human commits as themselves it would mis-attribute their commits, so it suits cloud/agent-only sessions (scope decision for the human); explicit `--author` / `git -c user.*` can still override (not tested here); does not cover token injection or `gh`; it silently _permits_ raw git rather than steering agents to `ai-git`, so it is a backstop, not enforcement.

### (e) Other

- **Allow-list instead of deny-list:** for high-discipline agents, permit only `ai-git`/named tools. Too disruptive for engineering agents that need the rest of Bash; rejected.
- **Post-hoc audit:** a `Stop`/commit-time check (or CI job) that fails when a commit author is not the configured AI identity. Detects rather than prevents; cheap, harness-agnostic, catches every class. Worth naming as a possible later layer; not proposed for AIF-007.
- **Claude Code sandboxing** for filesystem/network enforcement independent of command text (docs recommend this for real boundaries); does not distinguish `git` from `ai-git`, so not applicable to identity.

### Harness note: Kiro

`lib/harnesses/kiro.js` embeds `blocked_commands` as `permissions.rules: [{capability:'shell', match: <patterns>, effect:'deny'}]` in the agent JSON; there is no script. **Kiro's matching semantics (anchoring, compound-command handling) were not verified** — `kiro.dev` was unreachable from this environment (egress proxy block). Treat Kiro as unknown; it may or may not share the gap. The design implication: `blocked_commands` (a glob list) stays the harness-agnostic contract, and each adapter is responsible for enforcing it as well as its harness allows; option (a) improves only the Claude adapter and should be documented as such (arc42 §5.02 already lists the two mechanisms). Follow-up: verify Kiro's behaviour and record it, out of scope for the hook change.

## 3. Current tests and what the fix needs

**Existing** (`tests/unit/block-command-logic.test.js`, 13 cases): `globToRegex` (trailing wildcard, exact match, regex-special escaping, wildcard-only, multiple wildcards) and `matchesBlockedCommand` (match, no match, empty patterns, non-string command, non-array patterns, case-sensitivity, non-string patterns, first-match order). Adapter tests (`claude-adapter.test.js`, `install-claude.test.js`) cover hook _wiring_, install and uninstall lifecycle only. **Nothing spawns `cli.js`**: exit code 2, stderr message, and every fail-open branch are untested. No test contains a compound, multi-line or wrapped command — which is why the gap went unnoticed.

**New cases for option (a):**

- Unit, per bypass class in section 1 (each must return the pattern): `&&` `;` `||` `&` pipes `|&`, subshell, brace group, control flow, env prefix (single, multiple, quoted value), absolute/relative path, each wrapper and its flags, `bash|sh -c`, `eval`, `xargs` (flagged and bare), `find -exec`, `$(…)`, backticks, `<(…)`, quoting/escaping forms, leading whitespace, tabs, bare `git`, newline-separated commands, multi-line `-m` message, heredoc commit message.
- Unit, false-positive guard (each must return `null`): `echo "git status"`, `echo 'git push'`, `grep git README.md`, `ls | grep git`, `cat .gitignore`, `git-lfs ls-files`, `git_helper`, `which git`, `command -v git`, `man git`, `ai-git …` including message text containing `git push`, quoted/unquoted heredoc bodies mentioning git, `# git push` comments, `FOO=git echo $FOO`.
- Unit, residual-gap documentation tests asserting the _known_ allowed forms (`$g log`, `python -c`) so a future change that starts blocking them is a deliberate decision.
- Unit, robustness: unbalanced quote/paren, unterminated heredoc, empty command, very long input (no catastrophic regex; parser is linear).
- Integration (new): spawn `cli.js` with a JSON payload — exit 2 + stderr text for blocked, exit 0 for allowed, exit 0 for each fail-open case; multi-pattern argv; also assert the installed copy (`~/.claude/scripts/block-command/`) works with the final file list.
- If (d) is adopted: unit test for whatever writes the env/config, and an integration check that a commit made via bare git in that environment carries the AI identity.

## Recommendation

1. **Adopt (a)** as a zero-dependency rewrite of `logic.js` matching per simple command, with the glob semantics of `blocked_commands` unchanged, plus a `cli.js` integration test suite. Fix the two new findings (newline, bare command) as part of it.
2. **Adopt (d) as a backstop** if the human wants the identity guaranteed even where (a) cannot reach — scope to be decided (agent/cloud sessions only vs everyone).
3. **Do not pursue (c)**; treat (b) as optional project-level hardening, not a per-agent solution.
4. Keep the header wording: workflow discipline, not a security boundary; document the residual gaps in arc42 §5.02.

**Effort:** (a) ≈ 1.5–2 engineer-days (parser + wrapper list, ~40 unit cases, new `cli.js` integration tests, installer file list and manifest/uninstall test updates, arc42 §5.02 and `key_files` update); (d) ≈ 0.5 day plus a decision on scope; Kiro verification ≈ 0.5 day, separate.

**Tier:** not a Tier 1/2 fix. It changes the effective semantics of an existing schema field for every agent carrying `blocked_commands` (three today: engineering-manager, software-engineer, principal-engineer), introduces a new parser and possibly a packaging change to a shared-resource installer (`docs/decisions/0003-shared-resource-lifecycle-management.md`), and is security-adjacent — `skill/complexity-tiers` "Tier 3" signals ("new conventions … reshapes how other components work"). It needs a **Feature Plan, `AIF-007`**, written under `skill/feature-planning` and committed `Status: Draft` → `Approved` per `skill/plan-lifecycle` before any implementation. Suggested Tasks: (1) hook logic + unit tests, (2) `cli.js` integration tests + installer/manifest changes, (3) arc42 §5.02 update, and optionally (4) identity backstop.

## Open decisions for the human

1. Approve drafting `AIF-007` with option (a) as the core? (Architect route for the parser vs dependency/bundling question, and whether it warrants an ADR.)
2. Include option (d), and if so for which sessions?
3. Unparseable command: keep fail-open, or coarse fallback (prototype default)?
4. Block dynamic command words (`$g log`) or accept as residual?
5. Kiro verification: include in `AIF-007` or track separately?

## Sources

- Claude Code, [Configure permissions](https://code.claude.com/docs/en/permissions) — Bash compound commands, wrappers, "not a security boundary", settings-only scope.
- Claude Code, [Subagents](https://code.claude.com/docs/en/sub-agents) — frontmatter fields, `disallowedTools` specifier behaviour, hooks in main-session mode.
- Repo: `lib/harnesses/assets/block-command/{logic,cli}.js`, `lib/harnesses/claude.js`, `lib/harnesses/kiro.js`, `lib/ai-git.js`, `tests/unit/block-command-logic.test.js`, `docs/plans/completed/ai-git-enforcement-plan.md`.
