# Brief: `block-command` hook bypasses

**Date:** 2026-09-30
**Status:** Investigation — decisions recorded 2026-09-30; `AIF-007` drafted, awaiting approval. No code changed.
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

**Prototype result** (throwaway, ~120 lines, not committed): 55 must-block cases (every class in section 1 except interpreters and dynamic words, which the plan blocks separately) and 29 must-allow cases → 2 problems: `flock /tmp/l git log` missed (wrapper with a positional argument) and `command -v git` false-positive (lookup form, not execution). Both are fixable list refinements. Allowed correctly: `echo "git status"`, `cat .gitignore`, `git-lfs ls-files`, `ai-git commit -m "git push fixed"`, quoted and unquoted heredoc bodies containing the word git, `# git push`.

- **Pros:** pure logic (fits "Design for Testability"), no schema change (`blocked_commands` stays a glob list), one code path, fixes both new findings, low false-positive risk because matching is on the executable word, not substrings.
- **Cons:** a hand-written shell parser is a maintenance surface; it must be zero-dependency (see constraints); residual gaps below.
- **Residual gaps (cannot be closed statically):** variable/dynamic command words (`$g log`, `"$GIT" log`, `eval $cmd`), interpreters and scripts that call git internally (`python -c`, `node -e`, `make`, `npm run x`, a repo script), function/alias definitions, exec-wrappers taking positional args (`flock`, `watch`, `setsid`). Dynamic command words are blocked by decision (see below).
- **Unparseable input (decided 2026-09-30): fail open.** The parser is best-effort and never throws; if a command still cannot be parsed the hook allows it, so new shell syntax never requires a hook change or bricks Bash use. Accepted trade-off: input crafted so the parser misreads it but bash runs it is allowed — the same class as the other residual gaps.
- **Dynamic command words (decided 2026-09-30): block.** A command word whose basename cannot be determined statically (`$g log`, `"$GIT" log`, `${cmd}`, `$(echo git) log`, `eval $x`, unquoted globs or braces in the command word) is blocked for any agent with a `blocked_commands` entry. Explicitly still allowed: leading env assignments, `export`, `env VAR=x cmd`, variables in arguments, and a variable used as a path prefix with a literal final component (`$HOME/.local/bin/tool`, `${CLAUDE_PROJECT_DIR}/scripts/x.sh`), matched by its literal basename.
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

### (d) Ambient identity — dropped in favour of making `ai-git` usable in cloud sessions

Decided 2026-09-30: do not pursue ambient identity (`GIT_AUTHOR_*` env, repo `git config`). Instead, block git in as many ways as feasible (option (a)), keep the steering that requires `ai-git` (`steering/engineering/git-workflow-core.md`: "Use `ai-git` for All Git and GitHub Operations"), and make sure `ai-git` is actually runnable, authenticated via BWS, and installed early enough in cloud sessions. Blocking `git` while `ai-git` is unusable pushes agents toward workarounds, so this is a precondition for enforcement.

Findings from this session (environment `AIF-Test`, checked with read-only commands; the environment's own settings are not readable with the tools available here):

| #   | Finding                                                                                                                                                                                                                                                                                         | Evidence                                                                                                                              | Impact                                                                                                                                                                                                    |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `ai-git` is **not on PATH**. `package.json` declares a `bin`, but SessionStart runs only `npm install --no-save`, which does not link it. Skills and steering say `ai-git …`; the hook blocks `git`.                                                                                            | `which ai-git` empty; `scripts/session-start.sh`                                                                                      | An agent told to use `ai-git` gets "command not found" and is pushed towards raw git. Likely contributor to the original incident (inference). Other project repos have no `bin/ai-git.js` at all.        |
| 2   | BWS works here.                                                                                                                                                                                                                                                                                 | `bws` 2.1.0 on PATH; `BWS_ACCESS_TOKEN`/`BWS_PROJECT_ID` set; the project holds `AI_GIT_TOKEN` (40 characters); `bws run` injects it. | Confirms the setup described for `AIF-Test`.                                                                                                                                                              |
| 3   | `bws run` re-parses its arguments through a shell, so `ai-git`'s re-exec corrupts arguments containing spaces, quotes or parentheses.                                                                                                                                                           | Direct `node argv.js 'a b' 'x"y'` prints them intact; via `bws run -- node argv.js …` fails with a shell syntax error.                | Applies to `push`/`fetch`/`gh-*` when the token is not already exported, e.g. `gh-pr-create --title "Fix x"` splits the title. `lib/secrets.js` `buildWrapperInvocation` passes argv straight through.    |
| 4   | With `secrets.run` configured but the token still unresolved, `ai-git` proceeds without auth and says nothing.                                                                                                                                                                                  | `bin/ai-git.js` `resolveSecrets`/`runGit`                                                                                             | In cloud the push still succeeds through the session's git proxy, so a missing or empty token goes unnoticed until a `gh-*` call.                                                                         |
| 5   | `gh` is **not installed** in the cloud image (checked here: not in `/usr/bin` or `/usr/local/bin`), so `ai-git gh-*` fails ("gh CLI is not installed") while `gh *` is blocked. Decided 2026-09-30: use `gh`, not the GitHub MCP tools.                                                         | `which gh` empty                                                                                                                      | Steering says "use `ai-git` for GitHub operations" but there is no working path in cloud today. `skill/pr-stewardship` falls back to MCP when `gh` is missing; with `gh` guaranteed that fallback can go. |
| 6   | Install timing is unverified for a fresh environment. The Setup script runs before checkout (only provisions `bws`); the SessionStart hook runs `npm install` then `aif install` for `AIF_BUNDLES`. This session reported "already current, skipping", so the first-run path was not exercised. | `README.md` "Claude Code Cloud"; hook output                                                                                          | Need a test in a fresh environment: are agents, hook script and `ai-git` in place before the first Bash call?                                                                                             |

**Options for making `ai-git` available:**

- **Stopgap:** the SessionStart script runs `npm link` (this repo only; `/opt/node22/bin` is writable as root here). Does nothing for other project repos.
- **Recommended:** `aif install` installs `ai-git` as a shared resource, the same pattern as the `block-command` hook (`docs/decisions/0003-shared-resource-lifecycle-management.md`): a self-contained copy of `bin/ai-git.js`, `lib/ai-git.js` and `lib/secrets.js` (both pure, dependency-free) under `~/.claude/scripts/ai-git/`, plus a launcher named `ai-git` in a directory already on PATH (`/root/.local/bin` is on PATH here). It then works in any project repo and is removed by the existing uninstall lifecycle. Because the SessionStart hook already runs `aif install`, installation happens at session start.

**Options for the `bws run` argument problem:** (i) pass the original arguments to the re-exec'd process through an environment variable (for example JSON) with a fixed argv, so no shell parsing occurs on any OS; (ii) quote each argument per platform (POSIX single-quoting; Windows differs, see the note in `bin/ai-git.js`). Option (i) is preferred; an integration test with a fake wrapper that shell-joins argv should pin it.

**Getting `gh` and `bws` into cloud sessions (checked from inside `AIF-Test`):** at runtime this session's network policy denies `github.com`, `api.github.com`, `crates.io` and `static.crates.io` (HTTP 403), while `archive.ubuntu.com`, `security.ubuntu.com`, PyPI and npm are reachable. So installing from GitHub release downloads or `cargo` must happen in the environment **Setup script** (its result is cached in the snapshot; the script today is `command -v bws >/dev/null || cargo install bws --locked || true`), not from the SessionStart hook, unless the release hosts are added to the environment's allowed domains. Options for `gh`: (i) download the release binary in the Setup script alongside `bws` (the direction already planned for `bws`); (ii) `apt-get install gh` — the Ubuntu 24.04 archive is reachable and lists `gh` 2.45.0 (older, but sufficient for `pr create`/`view`/`merge`); not installed here, to avoid changing the container. `gh` needs no login: `ai-git` injects `GH_TOKEN`. The SessionStart hook should only verify (`command -v gh bws`) and warn, so a missing tool is visible immediately.

**Proposed follow-up Feature (not drafted): "ai-git cloud readiness"** — next free ID after `AIF-007` if `AIF-005`/`AIF-006` remain taken (verify at draft time). Scope: findings 1, 3, 4, 5 (guarantee `gh`, drop the MCP fallback in `skill/pr-stewardship`) and a fresh-environment test for 6, plus a SessionStart check that `ai-git`, `gh` and `bws` resolve. Independent of `AIF-007`, though `AIF-007` enforcement is most useful once it lands.

### (e) Other

- **Allow-list instead of deny-list:** for high-discipline agents, permit only `ai-git`/named tools. Too disruptive for engineering agents that need the rest of Bash; rejected.
- **Post-hoc audit:** a `Stop`/commit-time check (or CI job) that fails when a commit author is not the configured AI identity. Detects rather than prevents; cheap, harness-agnostic, catches every class. Worth naming as a possible later layer; not proposed for AIF-007.
- **Claude Code sandboxing** for filesystem/network enforcement independent of command text (docs recommend this for real boundaries); does not distinguish `git` from `ai-git`, so not applicable to identity.

### Harness note: Kiro (out of scope — decided 2026-09-30)

`lib/harnesses/kiro.js` embeds `blocked_commands` as `permissions.rules: [{capability:'shell', match: <patterns>, effect:'deny'}]` in the agent JSON; there is no script. **Kiro's matching semantics (anchoring, compound-command handling) were not verified** — `kiro.dev` was unreachable from this environment (egress proxy block). Treat Kiro as unknown; it may or may not share the gap. The design implication: `blocked_commands` (a glob list) stays the harness-agnostic contract, and each adapter is responsible for enforcing it as well as its harness allows; option (a) improves only the Claude adapter and should be documented as such (arc42 §5.02 already lists the two mechanisms). Kiro verification is not needed for this work.

## 3. Current tests and what the fix needs

**Existing** (`tests/unit/block-command-logic.test.js`, 13 cases): `globToRegex` (trailing wildcard, exact match, regex-special escaping, wildcard-only, multiple wildcards) and `matchesBlockedCommand` (match, no match, empty patterns, non-string command, non-array patterns, case-sensitivity, non-string patterns, first-match order). Adapter tests (`claude-adapter.test.js`, `install-claude.test.js`) cover hook _wiring_, install and uninstall lifecycle only. **Nothing spawns `cli.js`**: exit code 2, stderr message, and every fail-open branch are untested. No test contains a compound, multi-line or wrapped command — which is why the gap went unnoticed.

**New cases for option (a):**

- Unit, per bypass class in section 1 (each must return the pattern): `&&` `;` `||` `&` pipes `|&`, subshell, brace group, control flow, env prefix (single, multiple, quoted value), absolute/relative path, each wrapper and its flags, `bash|sh -c`, `eval`, `xargs` (flagged and bare), `find -exec`, `$(…)`, backticks, `<(…)`, quoting/escaping forms, leading whitespace, tabs, bare `git`, newline-separated commands, multi-line `-m` message, heredoc commit message.
- Unit, false-positive guard (each must return `null`): `echo "git status"`, `echo 'git push'`, `grep git README.md`, `ls | grep git`, `cat .gitignore`, `git-lfs ls-files`, `git_helper`, `which git`, `command -v git`, `man git`, `ai-git …` including message text containing `git push`, quoted/unquoted heredoc bodies mentioning git, `# git push` comments, `FOO=git echo $FOO`.
- Unit, dynamic command words (each must be blocked with the dynamic-word reason): `$g log`, `"$GIT" log`, `${cmd} x`, `$(echo git) log`, `` `x` log ``, `/usr/bin/$x`, `eval $x`, `/usr/bin/g?t`, `{git,x} log`.
- Unit, env-injection allowances (each must return `null` unless it also runs a blocked command): `GIT_AUTHOR_NAME=x npm test`, `env FOO=bar npm test`, `export FOO=bar && npm test`, `$HOME/.local/bin/tool`, `"$PWD/node_modules/.bin/eslint" .`, `${CLAUDE_PROJECT_DIR}/scripts/x.sh`, `echo $FOO`; and `GIT_AUTHOR_NAME=x git commit` must still be blocked.
- Unit, residual-gap documentation tests asserting the _known_ allowed forms (`python -c`, `node -e`, `make`) so a future change that starts blocking them is a deliberate decision.
- Unit, robustness: unbalanced quote/paren and unterminated heredoc must not throw and must fail open; empty command; very long input (no catastrophic regex; parser is linear).
- Integration (new): spawn `cli.js` with a JSON payload — exit 2 + stderr text for blocked, exit 0 for allowed, exit 0 for each fail-open case; multi-pattern argv; also assert the installed copy (`~/.claude/scripts/block-command/`) works with the final file list.

## Recommendation

1. **Adopt (a)** as a zero-dependency rewrite of `logic.js` matching per simple command, with the glob semantics of `blocked_commands` unchanged, plus a `cli.js` integration test suite. Fix the two new findings (newline, bare command) as part of it.
2. **Instead of ambient identity, make `ai-git` cloud-ready** (see (d)): on PATH, arguments intact through `bws run`, a warning when the token is unresolved, and a decision on `gh`. Separate Feature; not part of `AIF-007`.
3. **Do not pursue (c)**; treat (b) as optional project-level hardening, not a per-agent solution.
4. Keep the header wording: workflow discipline, not a security boundary; document the residual gaps in arc42 §5.02.

**Effort:** (a) ≈ 1.5–2 engineer-days (parser + wrapper list, ~40 unit cases, new `cli.js` integration tests, installer file list and manifest/uninstall test updates, arc42 §5.02 and `key_files` update); `ai-git` cloud readiness ≈ 1–1.5 days (shared-resource install + launcher, re-exec fix with test, warning, fresh-environment test), plus the `gh` decision.

**Tier:** not a Tier 1/2 fix. It changes the effective semantics of an existing schema field for every agent carrying `blocked_commands` (two today: engineering-manager and software-engineer), introduces a new parser and possibly a packaging change to a shared-resource installer (`docs/decisions/0003-shared-resource-lifecycle-management.md`), and is security-adjacent — `skill/complexity-tiers` "Tier 3" signals ("new conventions … reshapes how other components work"). It needs a **Feature Plan, `AIF-007`**, written under `skill/feature-planning` and committed `Status: Draft` → `Approved` per `skill/plan-lifecycle` before any implementation. Suggested Tasks: (1) hook logic + unit tests, (2) `cli.js` integration tests + installer/manifest changes, (3) arc42 §5.02 update, and optionally (4) identity backstop.

## Decisions

Decided 2026-09-30: option (a) is the solution — `AIF-007` drafted (`docs/plans/features/AIF-007/plan.md`, Status: Draft); fail open on unparseable commands; block dynamic command words while allowing env-var injection and variable-prefixed literal paths; Kiro verification not needed; ambient identity (d) dropped in favour of steering plus `ai-git` cloud readiness.

Architect decided 2026-09-30: hand-written zero-dependency tokenizer, no ADR (recorded in AIF-007's Section 8). Still open: approve `AIF-007`; approve `AIF-008`; how `gh` and `bws` reach the cloud image (Setup script binary download vs `apt`, or allow the GitHub release hosts);

## Sources

- Claude Code, [Configure permissions](https://code.claude.com/docs/en/permissions) — Bash compound commands, wrappers, "not a security boundary", settings-only scope.
- Claude Code, [Subagents](https://code.claude.com/docs/en/sub-agents) — frontmatter fields, `disallowedTools` specifier behaviour, hooks in main-session mode.
- Repo: `lib/harnesses/assets/block-command/{logic,cli}.js`, `lib/harnesses/claude.js`, `lib/harnesses/kiro.js`, `lib/ai-git.js`, `tests/unit/block-command-logic.test.js`, `docs/plans/completed/ai-git-enforcement-plan.md`.
