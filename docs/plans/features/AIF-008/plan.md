# Feature Plan: `ai-git` cloud readiness

## 1. Metadata

| Field               | Value                                                 |
| ------------------- | ----------------------------------------------------- |
| Feature ID          | AIF-008                                               |
| Project             | ai-foundation                                         |
| Status              | Draft                                                 |
| Author (Agent)      | Claude Code session (standalone; no dispatched agent) |
| Reviewed By         | Pending                                               |
| Created             | 2026-09-30                                            |
| Last Updated        | 2026-10-02                                            |
| Standards           | `javascript`, `node` (per `.aiconfig.json`)           |
| Total Tasks         | Pending approval                                      |
| Product Requirement | None                                                  |
| ADRs                | None (see Section 8, question 1)                      |

Source investigations: [`docs/research/block-command-bypass.md`](../../../research/block-command-bypass.md), option (d) and its findings table; [`docs/research/plan-review-aif-005-008.md`](../../../research/plan-review-aif-005-008.md), the review that narrowed this plan on 2026-10-01.

---

## 2. Goal

Make `ai-git` and `gh` reliably usable in Claude Code cloud sessions, with `bws` still the way `ai-git` resolves its token, and in place before an agent's first Bash call. Agents are told to use `ai-git` for every git and GitHub operation (`steering/engineering/git-workflow-core.md`: "Use `ai-git` for All Git and GitHub Operations") and `AIF-007` blocks raw `git`/`gh`; enforcement only works if the sanctioned path exists, works, and tells an agent what to do when it fails. In the `AIF-Test` environment `ai-git` was not on PATH, `gh` was not installed, the `bws` re-exec mangled (and could inject through) arguments, and `gh pr *` fails in cloud because the session proxy blocks GraphQL.

> Requirement traceability: N/A. Follows from the `AIF-007` investigation and the 2026-10-01 review; human decisions 2026-09-30 and 2026-10-01: no ambient identity, no GitHub MCP tools, `ai-git` is the single GitHub path, `bws` stays required in cloud.

---

## 3. Quick Summary

**Open Items:** 0 open (0 High / 0 Medium / 0 Low) — see Section 8

**Verified facts this plan rests on** (cloud session, 2026-09-30 and 2026-10-01):

| Fact                                                                                                                                                                                                                                                                                                                                                                                                                            | Source                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `gh pr list`, `gh pr view --json …`, `gh pr checks`, `gh repo view --json …` return HTTP 403 ("GraphQL is not available") with the proxy credential and with the `bws` token. `gh api repos/{owner}/{repo}/…` works, including through `ai-git gh-api` with the real `bws` re-exec.                                                                                                                                             | Probes 2026-10-01                                        |
| The session proxy replaces the caller's token on GitHub API calls. A throwaway issue created through `ai-git gh-api` was authored by the human's account via the `claude` GitHub app, not by the `bws` token (a classic PAT); response headers were identical to the proxy-credential call. GitHub-side actions in cloud therefore carry the proxy identity. Commit authorship (`GIT_AUTHOR_*`) is unaffected.                  | Write test 2026-10-01 (issue closed)                     |
| `bws run` joins its argument vector into one string and runs it through `sh`: spaces split, `$VAR` expands, quotes and parentheses give syntax errors, and `a;echo X` runs `echo X`. Passing the arguments as JSON in an environment variable with a fixed argv delivered nine hostile arguments intact with nothing executed.                                                                                                  | Real `bws` 2.1.0, 2026-09-30 and 2026-10-01              |
| With `bws` missing, `ai-git push` and `ai-git gh-*` exit 1 with no message; with `BWS_PROJECT_ID` unset they crash with an uncaught stack trace.                                                                                                                                                                                                                                                                                | Probes 2026-09-30                                        |
| `npm install -g <package> --ignore-scripts` puts `ai-git` and `aif` symlinks on PATH (`/opt/node22/bin` is on PATH and root-writable in cloud). `npm link --ignore-scripts` from the repo does the same locally.                                                                                                                                                                                                                | Temp-prefix install and local `npm link`, 2026-10-01     |
| A pinned `gh` release binary downloads at runtime from `github.com/cli/cli/releases/download/vX/…` and verifies against its sha256 (a corrupted copy fails the check); `releases/latest` returns 403. `gh` was not pre-installed in `AIF-Test`.                                                                                                                                                                                 | Runtime probe 2026-10-01; Setup-stage run still untested |
| The harness writes `/root/.gitconfig` (`user.name Claude`, `noreply@anthropic.com`, `commit.gpgsign true`) at session start, after the Setup script. `GIT_CONFIG_GLOBAL=/dev/null` makes a raw `git commit` fail with "Author identity unknown" while an `ai-git`-style identity in the environment still commits. In a bare environment the default agent then offered to use the human's name and email from session context. | Probes and human test 2026-10-01                         |
| `git push -u origin <new branch>` from an `ai-git` worktree branch succeeds through the proxy with the AI-identity commit author; the proxy blocks deleting a remote branch (REST 403, `git push --delete` hangs up).                                                                                                                                                                                                           | Push test 2026-10-02                                     |

---

## 4. Scope

### In Scope

- **`ai-git` and `aif` on PATH by a normal npm install**, not a bespoke launcher: the cloud Setup text installs the pinned package with `npm install -g github:starvoxel/ai-foundation#<ref> --ignore-scripts`; this repo's own SessionStart hook runs `npm link --ignore-scripts`. `AIF-005` composes the Setup text; this Feature supplies and verifies the `ai-git`, `gh` and `bws` lines.
- **Fix the `bws` re-exec argument transport**: the original arguments travel as JSON in an environment variable (for example `AIF_REEXEC_ARGS`) with a fixed argv, with a size guard (about 100 KiB; Linux caps one environment string at 128 KiB). The re-exec guard variable is retained. This is a security requirement, not polish.
- **Failure policy when the token cannot be resolved**: `push`/`fetch` warn on stderr (naming the variable, never a value) and proceed; `gh-*` stop with an error naming the variable; `bws` missing or `BWS_PROJECT_ID` unset produces one explicit line and a non-zero exit where the command cannot proceed, never a stack trace or a silent exit.
- **Add `ai-git doctor`**: reports whether `ai-git`, `gh` and `bws` resolve, whether `.aiconfig.json` is found, and whether the token resolves (yes or no, never a value). SessionStart and the Setup log call it; it is also the acceptance checker.
- **Provision `gh` and `bws` as pinned release binaries with a hardcoded sha256** in the Setup text (never `latest`). `gh` 2.102.0 (`gh_2.102.0_linux_amd64.tar.gz`, sha256 `bb766f710eef8ede859c18578c72c327597cd4c8a85b06001b1f3843c6019386`) was verified at runtime. `bws` 2.1.0 (`bws-x86_64-unknown-linux-gnu-2.1.0.zip`, sha256 `ba8233c3a4aee5d43e3c73bbd04d99e9bc5aba13bbbfd06d89b073abe732b860`) was verified against its release checksum file on 2026-10-02.
- **Make REST the cloud GitHub path**: rewrite `skill/pr-stewardship` and any steering that names the GitHub access method so they use `ai-git gh-api repos/{owner}/{repo}/…` and the proxy's `ccr/…` routes (review threads, auto-merge, ready-for-review), remove the GitHub-MCP fallback, and document that `gh pr …` and `gh repo view` subcommands are unavailable in cloud. No GitHub MCP tools.
- **Identity guard rails**: add a steering rule (and the same line in the engineering-manager and software-engineer prompts) that on a git identity error an agent uses `ai-git` and never supplies, infers or asks for a git identity, including from session context. `AIF-007`'s block message and `ai-git doctor` say the same. Document `GIT_CONFIG_GLOBAL=/dev/null` as a cloud environment variable (set by the human) in the README recipe; `AIF-005` repeats it in its own recipe.
- **README "Claude Code Cloud"** rewritten as the owner of the `ai-git`, `gh`, `bws` and environment-variable parts; `AIF-005` adds the agent-selection part on top.
- **A verification checklist** (tools resolve, `ai-git commit` shows the AI identity, a raw commit fails, `ai-git gh-api` works) that `AIF-005`'s consolidated cloud acceptance session executes.
- **arc42 updates** (§5.03 `ai-git.js`/`secrets.js`, §5 `bin/ai-git.js`) with `key_files` and `last_verified`.

### Out of Scope

- Editing the cloud environment's own settings (Setup script, variables, network policy). The human owns these; this Feature supplies the exact text.
- A bespoke `ai-git` launcher, a shared-resource install of `ai-git`, hash or uninstall changes for it, an ADR 0003 amendment, and a Windows shim: replaced by the npm install above.
- Ambient identity (`GIT_AUTHOR_*` env vars, repo `git config`) — dropped.
- The GitHub-side actor identity in cloud: the proxy replaces the token, so PRs, comments and issues carry the proxy identity. Accepted; recorded in Section 8.
- Consumer-repo onboarding (scaffolding a SessionStart hook, `.aiconfig.json` and Setup text with `aif init`): a separate Feature.
- Investigating how to turn off the platform's GitHub MCP tools with permissions: a separate investigation.
- User-level `attribution` settings (trailers): the `AIF-005` Setup helper owns them; the repo-level setting is already on `main`.
- The `block-command` matching logic and the block message wording (`AIF-007`).
- Kiro.
- Provisioning the Bitwarden project or machine account (already done for `AIF-Test`).

---

## 5. Feature Description

### User-Facing Behaviour

In a cloud session started from an environment with `BWS_PROJECT_ID`, `BWS_ACCESS_TOKEN` and `AIF_BUNDLES` set, an agent runs `ai-git commit`, `ai-git push` and `ai-git gh-api repos/{owner}/{repo}/pulls --method POST …` from any project repo that has `.aiconfig.json`, and they work: identity applied, token resolved from BWS, arguments intact whatever characters they contain. A raw `git commit` fails loudly. If `ai-git`, `gh` or `bws` is missing, or the token cannot be resolved, the session says so at start (`ai-git doctor`) or at the failing call, and an agent that sees a git identity error is told to use `ai-git`.

### Data Flow

Setup script (pre-checkout, cached, run as root): installs `bws` and `gh` from pinned, checksummed release binaries, installs the pinned package with `npm install -g … --ignore-scripts` (`ai-git` and `aif` on PATH) → environment variables (set by the human) include `GIT_CONFIG_GLOBAL=/dev/null` → SessionStart (this repo): `npm link --ignore-scripts`, `aif install`, `ai-git doctor` → agent calls `ai-git …` → for `push`/`fetch`/`gh-*` with no token in the environment, `ai-git` re-execs itself through `secrets.run` (`bws run … -- node <ai-git> …`) with the original arguments in an environment variable and nothing from the user in argv → the child resolves the token, parses the arguments, and runs `git` or `gh`.

### Business Rules

- `ai-git` is a normal npm-installed binary; it reads `.aiconfig.json` from the current project, as today. It is installed globally by the cloud Setup text and linked by this repo's SessionStart hook.
- Argument passing across the re-exec must be lossless and must never be interpreted by a shell; the re-exec guard variable is retained to prevent loops.
- The token is never logged, echoed or written to disk; warnings and `doctor` name the variable, never a value.
- Failure policy: `push`/`fetch` warn and proceed; `gh-*` hard-error; missing `bws` or unset `BWS_PROJECT_ID` is one explicit line, never a stack trace or silent exit.
- `BWS_ACCESS_TOKEN` is the one credential in the environment. It is scoped strictly to what the session needs (today the `ai-git` credentials) and that scope is revisited if the licence situation changes.
- Setup text downloads pinned versions only, verifies a hardcoded sha256, and uses `npm … --ignore-scripts`; the SessionStart verification only reports and never installs from the network.
- In cloud, GitHub API work uses REST through `ai-git gh-api`; GraphQL-backed `gh` subcommands are not used.

### Error States

| Scenario                                                             | Expected Behaviour                                                                      |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `ai-git`, `gh` or `bws` not on PATH at session start                 | `ai-git doctor` (or the SessionStart check) names the missing tool                      |
| `secrets.run` set, token still unresolved, command is `push`/`fetch` | Warning on stderr naming the variable; the command proceeds                             |
| `secrets.run` set, token still unresolved, command is `gh-*`         | Error naming the variable; non-zero exit                                                |
| `bws` not on PATH when the re-exec is needed                         | One explicit message naming `bws`; `push`/`fetch` proceed with the warning, `gh-*` stop |
| `BWS_PROJECT_ID` unset (placeholder in `secrets.run`)                | One explicit message naming the variable; no stack trace                                |
| Arguments contain spaces, quotes, parentheses, `$`, `;` or newlines  | Reach `git`/`gh` unchanged; nothing is executed by a shell                              |
| Arguments exceed the environment-variable size guard                 | Explicit error; nothing is truncated                                                    |
| A `gh pr …` or `gh repo view` subcommand is used in cloud            | The proxy's GraphQL 403 surfaces; the skill and steering say to use `ai-git gh-api`     |
| Raw `git commit` with `GIT_CONFIG_GLOBAL=/dev/null`                  | Git fails with "Author identity unknown"; the steering says to use `ai-git`             |

---

## 6. Architecture Overview

### New Components

| Component                                 | Type                                | Responsibility                                                                                        |
| ----------------------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Re-exec argument transport (`secrets.js`) | Pure logic                          | Encode the original argv into an environment variable and decode it in the child; size guard          |
| `ai-git doctor`                           | Pure checks plus a thin I/O wrapper | Report tool presence, config found, token resolved (yes or no)                                        |
| Cloud recipe text (README)                | Documentation                       | Exact Setup-script and environment-variable text for the `ai-git`, `gh`, `bws` and git-identity parts |

### Component Relationships

`bin/ai-git.js` calls `lib/secrets.js` for the re-exec and `lib/ai-git.js` for pure logic; `doctor` reuses `getSecretsConfig` and `getIdentity`. `scripts/session-start.sh` runs `npm link`, `aif install` and `ai-git doctor`. `skills/pr-stewardship/SKILL.md` and the engineering steering name the GitHub access method.

### Integration Points

- `bin/ai-git.js`, `lib/ai-git.js`, `lib/secrets.js` — re-exec transport, failure policy, `doctor`.
- `scripts/session-start.sh`, `tests/integration/session-start.test.js`, `.claude/settings.json`, `README.md` ("Claude Code Cloud").
- `skills/pr-stewardship/SKILL.md`, `steering/engineering/git-workflow-core.md` and any steering that names the GitHub access method, `agents/engineering-manager.yaml`, `agents/software-engineer.yaml` (identity line).
- `AIF-007` — independent; its block message says to use `ai-git`, which this Feature makes runnable. Merge order: this Feature first.
- `AIF-005` — composes the Setup recipe, owns the consolidated cloud acceptance session and the Setup helper; hard dependency on this Feature.
- `AIF-006` — lands after this Feature, because its validator checks the skill and steering files this Feature rewrites.

---

## 7. Security Considerations

- The token must never appear in logs, warnings, process arguments or files. Arguments must never be interpreted by a shell: the `bws run` injection result (`a;echo X` executed) makes the environment-variable transport a security requirement with its own tests (`;`, `$( )`, backticks, quotes, newlines).
- `BWS_ACCESS_TOKEN` is an environment variable readable by anyone who can use the environment and by the agent; it is scoped strictly to what the session needs and revisited if the licence situation changes.
- Setup-script downloads (done by the human) are pinned by version with a hardcoded sha256 and installed with `--ignore-scripts`, because the script runs as root.
- Identity: an agent must never supply, infer or ask for a git identity; the environment-level `GIT_CONFIG_GLOBAL=/dev/null` makes an accidental raw commit fail but does not stop a deliberate `git -c user.*` or `GIT_AUTHOR_*` command, which is why `AIF-007` blocks raw `git`.
- No security requirement is optional or deferrable (`steering/global/core.md`: "Security Requirements Are Never Optional").

---

## 8. Risks & Open Questions

| #   | Risk / Question                                                                                                                                                                                                                                   | Type     | Impact | Source       | Raised By | Resolved                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------ | ------------ | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | How `ai-git` gets on PATH: bespoke launcher and shared resource vs a normal npm install.                                                                                                                                                          | Question | H      | Architecture | Agent     | Yes — human 2026-10-01: normal npm install (`npm install -g … --ignore-scripts` in Setup, `npm link --ignore-scripts` in this repo's SessionStart). No ADR.                                                                                                                                                                                                                                                                                         |
| 2   | How `gh` and `bws` reach the image.                                                                                                                                                                                                               | Question | M      | Design       | Agent     | Yes — pinned release binaries with a hardcoded sha256 (`gh` verified at runtime 2026-10-01). The `bws` 2.1.0 hash is recorded in Section 4 (verified 2026-10-02).                                                                                                                                                                                                                                                                                   |
| 3   | Fresh-environment verification needs a human-started session.                                                                                                                                                                                     | Risk     | M      | Design       | Agent     | Yes — one consolidated cloud acceptance session owned by `AIF-005`; this Feature supplies the checklist.                                                                                                                                                                                                                                                                                                                                            |
| 4   | Re-exec argument transport: environment variable with a fixed argv vs per-platform quoting.                                                                                                                                                       | Question | L      | Design       | Agent     | Yes — environment JSON with a fixed argv and a size guard; quoting rejected after the injection result.                                                                                                                                                                                                                                                                                                                                             |
| 5   | The proxy replaces the `bws` token, so GitHub-side actions in cloud carry the proxy identity.                                                                                                                                                     | Risk     | M      | Test         | Agent     | Yes — human 2026-10-01: `bws` stays required in cloud (installed in Setup, token path in acceptance); the actor-identity consequence is accepted.                                                                                                                                                                                                                                                                                                   |
| 6   | `gh pr …` GraphQL subcommands fail in cloud.                                                                                                                                                                                                      | Risk     | H      | Test         | Agent     | Yes — human 2026-10-01: REST through `ai-git gh-api` is the cloud path; no thin PR commands, no MCP.                                                                                                                                                                                                                                                                                                                                                |
| 7   | `npm link --ignore-scripts` in SessionStart is validated locally but not in a real cloud session.                                                                                                                                                 | Risk     | M      | Test         | Agent     | Yes — validated 2026-10-02 in a real cloud container: `npm link --ignore-scripts` put `ai-git` and `aif` in `/opt/node22/bin` and `ai-git` ran from another directory. The SessionStart-hook run itself is exercised in `AIF-005`'s acceptance session.                                                                                                                                                                                             |
| 8   | The `gh` release download is verified at runtime but not in the Setup stage (docs say release-asset requests reach only repositories attached to the session; the runtime test for `cli/cli` succeeded).                                          | Risk     | M      | Docs         | Agent     | Accepted — human 2026-10-02: no separate Setup-stage test. The runtime result stands, `bws` was verified in the Setup stage in the spike (A2), and a failure would show in `AIF-005`'s acceptance session.                                                                                                                                                                                                                                          |
| 9   | Whether `git push` through the proxy works from an `ai-git` worktree branch (docs: push works only against the session's current working branch) and whether the proxy also replaces the `extraheader` credential `ai-git` adds for `github.com`. | Question | M      | Docs         | Agent     | Yes — tested 2026-10-02: from an `ai-git` worktree branch, `ai-git commit` was authored by the AI identity and `ai-git push -u origin <new branch>` succeeded through the proxy, so the docs' "current working branch only" limit did not apply to a new branch. The recorded pusher identity was not determined. The proxy blocks deleting a remote branch, both via REST (403) and `git push --delete`, so test branches must be deleted by hand. |

---

## 9. Task Decomposition

Pending approval. Sizing intent: about five Tasks, code first so they can be verified locally before any cloud step — (1) re-exec argument transport and failure policy in `secrets.js`/`bin/ai-git.js`, including an integration test with a fake wrapper that shell-joins its argv and injection cases; (2) `ai-git doctor` with pure checks and tests; (3) REST path: `skill/pr-stewardship` and steering rewrite, the identity rule in `git-workflow-core.md` and the engineering-manager and software-engineer prompts, version bumps; (4) README "Claude Code Cloud" and exact Setup text (`npm install -g`, `gh`, `bws`, `GIT_CONFIG_GLOBAL=/dev/null`), `scripts/session-start.sh` (`npm link`, `ai-git doctor`) and its test; (5) arc42 updates, with `aif index architecture --check` as the final local step. Tasks 1 and 2 precede 4; 3 runs in parallel; 5 is last. Cloud verification is executed in `AIF-005`'s consolidated session. Decomposed with `tasks.json` and `dag-validate` only after `Status: Approved` is committed.

---

## 10. Acceptance Criteria

- [ ] All Tasks complete and signed off
- [ ] `ai-git` and `aif` resolve on PATH after the documented npm install in a clean environment, and after `npm link --ignore-scripts` in this repo's SessionStart
- [ ] `ai-git push` and `ai-git gh-*` with arguments containing spaces, quotes, parentheses, `$`, `;`, backticks and newlines behave identically with and without the secrets wrapper, and nothing in an argument is ever executed (integration test with a shell-joining fake wrapper)
- [ ] With `bws` missing or `BWS_PROJECT_ID` unset, the failure policy holds: `push`/`fetch` warn and proceed, `gh-*` error, one explicit line, no stack trace, no silent exit; no output ever contains a token value
- [ ] `ai-git doctor` reports tool presence, config found and token resolved (yes or no) and never prints a token
- [ ] `skill/pr-stewardship` and steering use `ai-git gh-api` over REST, no longer route GitHub operations through MCP tools, and state that `gh pr …` subcommands are unavailable in cloud; component versions bumped per repo convention
- [ ] The identity rule is in `steering/engineering/git-workflow-core.md` and the engineering-manager and software-engineer prompts
- [ ] README "Claude Code Cloud" contains the exact Setup text (pinned `gh` and `bws` with sha256, `npm install -g … --ignore-scripts`) and the environment variables including `GIT_CONFIG_GLOBAL=/dev/null`
- [ ] The verification checklist runs in `AIF-005`'s consolidated cloud acceptance session: tools resolve, `ai-git commit` shows the AI identity, a raw `git commit` fails, `ai-git gh-api` works with arguments containing spaces, the `bws` token path resolves (`doctor` reports it)
- [ ] arc42 §5.03 and §5 updated; `aif index architecture --check` passes as the final local step
- [ ] `npm test` passes
- [ ] No HIGH or CRITICAL findings open in any Task review
