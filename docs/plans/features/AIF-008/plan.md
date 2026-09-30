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
| Last Updated        | 2026-09-30                                            |
| Standards           | `javascript`, `node` (per `.aiconfig.json`)           |
| Total Tasks         | Pending approval                                      |
| Product Requirement | None                                                  |
| ADRs                | None (see Section 8, question 1)                      |

Source investigation: [`docs/research/block-command-bypass.md`](../../../research/block-command-bypass.md), option (d) and its findings table.

---

## 2. Goal

Make `ai-git` and `gh` reliably usable in Claude Code cloud sessions, authenticated through Bitwarden Secrets Manager (BWS), and in place before an agent's first Bash call. Agents are told to use `ai-git` for every git and GitHub operation (`steering/engineering/git-workflow-core.md`: "Use `ai-git` for All Git and GitHub Operations") and `AIF-007` blocks raw `git`/`gh`; enforcement only works if the sanctioned path exists and works. Today, in the `AIF-Test` environment, `ai-git` is not on PATH, `gh` is not installed, and the BWS re-exec mangles arguments.

> Requirement traceability: N/A. Follows from the `AIF-007` investigation; human decision 2026-09-30: no ambient identity, no GitHub MCP tools, focus on making `ai-git` work in cloud sessions.

---

## 3. Quick Summary

**Open Items:** 4 open (1 High / 2 Medium / 1 Low) — see Section 8

---

## 4. Scope

### In Scope

- Put an `ai-git` command on PATH in any project repo that installs the engineering bundle, not only in this repo, installed at session start by the existing `aif install` step.
- Fix the BWS re-exec so arguments with spaces, quotes, parentheses or `$` reach `ai-git` intact (`bws run` re-parses its argv through a shell).
- Warn on stderr when `secrets.run` is configured but the token is still unresolved after the re-exec, instead of proceeding silently unauthenticated.
- Guarantee `gh` is present for `ai-git gh-*` in cloud: document the Setup-script change the human makes, and have the SessionStart hook verify that `ai-git`, `gh` and `bws` resolve and warn when one does not.
- Remove the GitHub-MCP fallback from `skill/pr-stewardship` and align steering wording, so `ai-git gh-*` is the single GitHub path.
- Verify the whole chain in a fresh `AIF-Test` environment (first-run install order).
- Update README "Claude Code Cloud" and arc42 (§5.02 shared resources, §5.03 `secrets.js`/`ai-git.js`) with `key_files` changes.

### Out of Scope

- Editing the cloud environment's own settings (Setup script, environment variables, network policy). The human owns these; this Feature supplies the exact commands.
- Ambient identity (`GIT_AUTHOR_*` env vars, repo `git config`) — dropped.
- The `block-command` matching logic and the block message (`AIF-007`).
- Kiro: no verification or new install path for it here, beyond noting the launcher location is Claude-specific if it is.
- Provisioning the Bitwarden project or machine account (already done for `AIF-Test`).

---

## 5. Feature Description

### User-Facing Behaviour

In a cloud session started from an environment with `BWS_PROJECT_ID`, `BWS_ACCESS_TOKEN` and `AIF_BUNDLES` set, an agent runs `ai-git commit`, `ai-git push`, and `ai-git gh-pr-create --title "Fix the thing (again)"` from any project repo, and they work: identity applied, token resolved from BWS, arguments intact. If `ai-git`, `gh` or `bws` is missing, or the token cannot be resolved, the session says so at start or at the failing call rather than failing silently.

### Data Flow

Setup script (pre-checkout, cached): provisions `bws` and `gh` binaries → SessionStart hook: `npm install`, `aif install -B "$AIF_BUNDLES"` installs agents, steering, the `block-command` hook resource and the `ai-git` resource with its launcher on PATH → hook verifies `ai-git`/`gh`/`bws` resolve → agent calls `ai-git …` → for `push`/`fetch`/`gh-*` with no token in the environment, `ai-git` re-execs itself through `secrets.run` (`bws run …`), passing the original arguments in a way no shell re-parses → the child resolves the token and runs `git`/`gh`.

### Business Rules

- `ai-git` is installed as a shared resource following `docs/decisions/0003-shared-resource-lifecycle-management.md`: tracked in the manifest, removed when the last bundle needing it is uninstalled, refreshed by `aif install`.
- The installed copy is self-contained (only `bin/ai-git.js`, `lib/ai-git.js`, `lib/secrets.js`, all dependency-free) and reads `.aiconfig.json` from the current project, as today.
- Argument passing across the re-exec must be lossless on every supported OS; the re-exec guard variable is retained to prevent loops.
- The token is never logged, echoed or written to disk; the unresolved-token warning names the variable, never a value.
- The SessionStart verification only reports; it never installs from the network at runtime (github.com and crates.io are denied by the environment's network policy at runtime; installs belong in the Setup script).
- `gh` needs no login; `ai-git` injects `GH_TOKEN`.

### Error States

| Scenario                                                    | Expected Behaviour                                                             |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `ai-git`, `gh` or `bws` not on PATH at session start        | SessionStart prints a one-line warning naming the missing tool                 |
| `secrets.run` set, token still unresolved after the re-exec | Warning on stderr naming the env var; the operation proceeds, as it does today |
| `bws` missing or `BWS_ACCESS_TOKEN` invalid                 | The wrapper's own error surfaces; `ai-git` adds the unresolved-token warning   |
| Arguments contain spaces, quotes, parentheses or `$`        | Reach `git`/`gh` unchanged                                                     |
| `aif install` of the `ai-git` resource fails                | Existing install error path; the hook's verification then reports the tool     |

---

## 6. Architecture Overview

### New Components

| Component                                 | Type            | Responsibility                                                               |
| ----------------------------------------- | --------------- | ---------------------------------------------------------------------------- |
| `ai-git` shared resource + launcher       | Installer asset | Self-contained copy of `ai-git` plus a launcher named `ai-git` on PATH       |
| Re-exec argument transport (`secrets.js`) | Pure logic      | Carry the original argv through the secrets wrapper without shell re-parsing |
| SessionStart tool check                   | Script          | Verify `ai-git`, `gh`, `bws` resolve; warn otherwise                         |

### Component Relationships

`aif install` (`lib/harnesses/claude.js`, shared-resource path used today for `block-command`) installs the `ai-git` resource; `bin/ai-git.js` calls `lib/secrets.js` for the re-exec; `scripts/session-start.sh` runs `aif install` and then the tool check.

### Integration Points

- `lib/harnesses/claude.js`, `lib/harnesses/base.js`, `lib/manifest.js`, `lib/commands/uninstall.js` — shared-resource detection, install and lifecycle.
- `bin/ai-git.js`, `lib/ai-git.js`, `lib/secrets.js` — re-exec and warning.
- `scripts/session-start.sh`, `README.md` ("Claude Code Cloud"), `.claude/settings.json`.
- `skills/pr-stewardship/SKILL.md` and steering that names the GitHub access method.
- `AIF-007` — independent; its block message points agents at `ai-git`, which this Feature makes runnable.

---

## 7. Security Considerations

- The token must never appear in logs, warnings, process arguments or files. Arguments are passed through the environment or another non-argv channel only if they carry no secret; the token itself continues to arrive only through the secrets wrapper.
- The installed launcher and copy must not widen what runs: it executes only the installed `ai-git`, with no path or command taken from untrusted input.
- The Setup-script binary downloads (done by the human) should be pinned by version and checksum-verified; this Feature documents that.
- No security requirement is optional or deferrable (`steering/global/core.md`: "Security Requirements Are Never Optional").

---

## 8. Risks & Open Questions

| #   | Risk / Question                                                                                                                                                                                                                       | Type     | Impact | Source       | Raised By | Resolved |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------ | ------------ | --------- | -------- |
| 1   | Where the launcher lives and how it generalizes: a directory already on PATH (`/root/.local/bin` in cloud), Windows shim, and whether the resource is Claude-only or per-harness. Route to Architect; ADR 0003 may need an amendment. | Question | H      | Architecture | Agent     | No       |
| 2   | How `gh` and `bws` reach the image: release binary in the Setup script (pinned, checksummed) vs `apt-get install gh` (Ubuntu archive is reachable at runtime; 2.45.0). Human decision; environment settings are human-owned.          | Question | M      | Design       | Agent     | No       |
| 3   | Fresh-environment verification needs a human-started session (the current environment reports "already current"), and its results cannot be gathered from inside a running session.                                                   | Risk     | M      | Design       | Agent     | No       |
| 4   | Re-exec argument transport: environment variable with a fixed argv (preferred) vs per-platform quoting.                                                                                                                               | Question | L      | Design       | Agent     | No       |

---

## 9. Task Decomposition

Pending approval. Sizing intent: about four Tasks — (1) `ai-git` shared resource, launcher and lifecycle tests; (2) re-exec argument fix, unresolved-token warning and tests, including an integration test with a fake wrapper that shell-joins its argv; (3) SessionStart tool check, README and Setup-script documentation, `skill/pr-stewardship` and steering wording; (4) fresh-environment verification checklist and arc42 updates. Decomposed with `tasks.json` and `dag-validate` only after `Status: Approved` is committed.

---

## 10. Acceptance Criteria

- [ ] All Tasks complete and signed off
- [ ] In a project repo that installs the engineering bundle, `ai-git` resolves on PATH after `aif install`, and is removed by uninstall when no bundle needs it
- [ ] `ai-git push` and `ai-git gh-*` with arguments containing spaces, quotes, parentheses and `$` behave identically with and without the secrets wrapper (integration test with a shell-joining fake wrapper)
- [ ] An unresolved token with `secrets.run` configured produces a warning that never contains a token value
- [ ] SessionStart reports a missing `ai-git`, `gh` or `bws`
- [ ] `skill/pr-stewardship` and steering no longer route GitHub operations through MCP tools; component versions bumped per repo convention
- [ ] A fresh `AIF-Test` session (human-started) passes the verification checklist: tools resolve, `ai-git commit` shows the AI identity, `ai-git push` and `ai-git gh-pr-view` authenticate through BWS
- [ ] README "Claude Code Cloud" and arc42 updated; `aif index architecture --check` passes as the final local step
- [ ] `npm test` passes
- [ ] No HIGH or CRITICAL findings open in any Task review
