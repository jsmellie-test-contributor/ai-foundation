# Pluggable Secrets Resolution for `aif`

> Status: Done
> Created: 2026-09-25
> Approved by: Jeremy

## Goal

Give `ai-git` a provider-agnostic way to source `AI_GIT_TOKEN` from a
secrets manager instead of requiring a plain exported environment
variable, without hard-coding any specific provider (Bitwarden Secrets
Manager is the first concrete user, not a special case). Also fix MCP
header secret handling so no harness ever gets a literal secret baked
into its own config file.

## Background / Research Findings

- Claude Code's `.mcp.json` supports `${VAR}` expansion in `headers`,
  `env`, `url`, `args`, `command` — resolved from Claude Code's own
  process environment at connect time, never persisted literally to disk.
  (code.claude.com/docs/en/mcp.md)
- Kiro's `mcp.json` supports the same `${VAR}` syntax for `env` (stdio)
  and `env`/`headers` (remote), with one difference: an unapproved
  variable name is gated behind an "Mcp Approved Env Vars" allowlist in
  Kiro settings until a human approves it once. See
  `docs/kiro-mcp-env-var-expansion.md` for the full sourced writeup.
- **Existing inconsistency found in this repo:** `lib/harnesses/kiro.js`
  (`installMcpHttp`, ~line 257) already passes `serverDef.headers` through
  unresolved — it never bakes a literal secret in. `lib/harnesses/claude.js`
  is the odd one out: `resolveHeaderPlaceholders` resolves `${VAR}` against
  `process.env` and writes the literal value into `~/.claude.json`. This
  plan fixes `claude.js` to match `kiro.js`'s already-correct behavior,
  closing the plaintext-secret-at-rest gap for both harnesses rather than
  documenting it as an accepted limitation.
- Consequence: once header resolution is removed from `claude.js`, no
  `aif install`/`uninstall` code path touches a real secret value anymore.
  There is currently no install-time consumer to wrap through a secrets
  backend, so this plan does **not** add proactive secrets-wrapping to
  `bin/aif.js` — only `bin/ai-git.js` (which genuinely needs
  `AI_GIT_TOKEN`) gets wired. If a future harness or server type needs a
  secret at install time, that's new scope for a later plan, not spec work
  done speculatively here.
- No ADR for this change — a separate initiative is changing the
  decision-record format; this will be captured there later instead.

## Components Affected

| Component                                       | Action                   | Notes                                                                                                                                                     |
| ----------------------------------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/secrets.js`                                | Create                   | Pure logic: `getSecretsConfig`, `resolvePlaceholders`, `parseDotenv`, wrapper-invocation building, re-exec guard                                          |
| `lib/harnesses/claude.js`                       | Modify                   | Remove `resolveHeaderPlaceholders`; `installMcpHttp` passes `serverDef.headers` through unresolved, matching `kiro.js`                                    |
| `bin/ai-git.js`                                 | Modify                   | Reactive secrets resolution before token use (wrapper, then `.env` fallback)                                                                              |
| `.aiconfig.json` (this repo)                    | Modify                   | Add `secrets.run` wired to `bws run`                                                                                                                      |
| `.gitignore`                                    | Modify                   | Ignore `.env` / `.env.*`, keep `.env.example`                                                                                                             |
| `.env.example`                                  | Create                   | Documents expected var names, insecure-fallback opt-in                                                                                                    |
| `AGENTS.md`                                     | Modify                   | Document `secrets.run` / `secrets.allow_insecure_dotenv` fields                                                                                           |
| `projects/_template/.aiconfig.json`             | Modify                   | Add commented example `secrets` block                                                                                                                     |
| `skills/server-authoring/reference/schema.yaml` | Modify                   | Update "headers and secrets" note: harness expands `${VAR}` natively at connect time; installer never resolves it. Note Kiro's approval-allowlist caveat. |
| `docs/kiro-mcp-env-var-expansion.md`            | Keep (already committed) | Sourced research backing the schema.yaml update                                                                                                           |
| `tests/unit/secrets.test.js`                    | Create                   | Unit coverage for `lib/secrets.js`                                                                                                                        |
| `tests/unit/claude-adapter.test.js`             | Modify                   | Remove/replace `resolveHeaderPlaceholders` tests with a pass-through assertion                                                                            |
| `tests/integration/ai-git-auth.test.js`         | Modify                   | Add wrapper re-exec case + dotenv fallback case                                                                                                           |

## Approach

1. **`lib/secrets.js`** — pure module (no I/O), mirroring `lib/ai-git.js`'s
   split: `getSecretsConfig(config)`, `resolvePlaceholders(value, env)`
   (used only for `secrets.run`'s own non-secret placeholders, e.g.
   `${BWS_PROJECT_ID}`; throws on unset var), `parseDotenv(text)`,
   `REEXEC_GUARD_ENV`, `isAlreadyWrapped(env)`,
   `buildWrapperInvocation(run, execPath, scriptPath, args, env)`.
2. **Fix `claude.js`** — delete `resolveHeaderPlaceholders` and its call
   site in `installMcpHttp`; assign `serverDef.headers` straight to
   `mcpEntry.headers`, identical to `kiro.js`. No secret ever needs to be
   present in `process.env` during `aif install` for this to work.
3. **`bin/ai-git.js` wiring** — after identity is loaded, if
   `identity.tokenEnvName` is set and missing from `process.env`: re-exec
   through `secrets.run` (guarded, once) if configured, else load `.env`
   if `allow_insecure_dotenv` is `true` (warn on stderr), else proceed
   unchanged (today's "token missing" errors still fire downstream).
4. **`.gitignore` + `.env.example`** — add `.env`/`.env.*` ignores; commit
   a `.env.example` with placeholder var names and a comment describing
   the insecure-fallback opt-in.
5. **Dogfood this repo** — add
   `"secrets": {"run": ["bws", "run", "--project-id", "${BWS_PROJECT_ID}", "--"]}`
   to this repo's own `.aiconfig.json`. Actual Bitwarden project/secret
   provisioning (`bws` install, `BWS_ACCESS_TOKEN`/`BWS_PROJECT_ID`,
   registering `AI_GIT_TOKEN` as a secret) is a manual step outside this
   session's tool access — will be called out explicitly, not claimed as
   done. `YOUTRACK_TOKEN` no longer needs any secrets-manager plumbing on
   our side at all — set it directly in the shell that launches the
   harness (Claude Code / Kiro), per each harness's own approval flow.
6. **Docs** — `AGENTS.md` field table + short prose describing the
   run-wrapper-first / `.env`-opt-in-fallback contract, explicitly
   provider-agnostic; `projects/_template/.aiconfig.json` gets a
   bracket-placeholder example matching the template's existing
   `ai_identity` convention; `schema.yaml`'s "headers and secrets" section
   updated to describe native harness expansion instead of install-time
   resolution.
7. **Tests** — new `tests/unit/secrets.test.js`; update
   `tests/unit/claude-adapter.test.js` for the removed function; extend
   `tests/integration/ai-git-auth.test.js` with a fake-wrapper-script case
   (never-log-the-token guarantee holds through the wrapper path too) and
   a `.env`-fallback case.

## Open Questions

None.

## Risks

- **Re-exec adds one extra subprocess hop** for `ai-git` token-needing
  calls when `secrets.run` is configured. Accepted — negligible cost,
  scoped away from the common no-token commands (status, diff, plain
  commits).
- **`secrets.allow_insecure_dotenv` could be left on accidentally.**
  Mitigated: defaults to `false`, requires explicit opt-in, prints a
  stderr warning every time it's actually used.
- **Removing `resolveHeaderPlaceholders` is a behavior change**, not just
  an addition: any project currently relying on `aif install` erroring out
  when a referenced header env var is unset loses that early failure —
  the failure now surfaces later, at the harness's own connect time,
  inside the harness's own UI/logs instead of `aif install`'s output.
  Accepted: this repo has exactly one consumer of this today
  (`servers/youtrack/youtrack.yaml`), and matching `kiro.js`'s existing
  behavior (already shipped, presumably already relied on) is worth more
  than keeping the two harness adapters inconsistent.

## Validation

- `npm test` (unit + integration) — new `secrets.test.js`, updated
  `claude-adapter.test.js`, extended `ai-git-auth.test.js`.
- Manual regression: with no `secrets` config, confirm `ai-git` behaves
  exactly as before.
- Manual: `aif install --bundle engineering --harness claude` writes
  `${YOUTRACK_TOKEN}` literally into `~/.claude.json` (not a resolved
  value) — confirm by inspecting the file after install.
- Manual (once the user provisions BWS locally): `ai-git gh-repo-view`
  with `AI_GIT_TOKEN` unset in the shell but present as a BWS secret named
  `AI_GIT_TOKEN` succeeds via the wrapper.
- Manual: `.env` fallback path prints its warning and never appears in
  `git status`.

## Cloud Testing Setup

A Claude Code Cloud environment is a good place to exercise the real `bws
run` wrapper path end-to-end. Confirmed via docs
(`code.claude.com/docs/en/cloud-environments.md`): environments are
account-scoped, not repo-scoped, so one environment can be reused across
repos.

Considered three options for getting `BWS_ACCESS_TOKEN` into a live
session without it sitting untouched in the environment's cached
filesystem snapshot (a setup script's output is snapshotted and reused
across sessions — never decrypt/export a real secret there):

1. **Chosen: put the token directly in the environment's "Environment
   variables" field**, scoped to a disposable test Bitwarden project and
   a short-lived, scoped machine-account token (Bitwarden access tokens
   support an optional expiration, confirmed via Bitwarden's docs). No
   broker infrastructure, no per-session manual step. The environment's
   own "anyone who uses the environment can read the values" caveat is
   aimed at shared/org environments — for a personal environment "anyone"
   is just the account owner, the same trust level as GitHub Actions
   secrets or Vercel env vars.
2. A self-hosted token-broker + `SessionStart` hook, authenticated via
   the environment's "API credential" feature (Pro/Max) so no long-lived
   secret ever touches Claude's stored config at all — rejected for this
   pass as more infrastructure than a hobby project needs; noted as the
   fully-automated option if that trust boundary ever matters more.
3. Encrypt the token with `age`, commit the ciphertext, decrypt with a
   manually-typed private key each session — rejected as too cumbersome
   for routine testing; the encryption doesn't reduce exposure unless the
   key is kept out of Claude's own storage entirely.

**Setup**, once a disposable Bitwarden test project + scoped short-lived
token exist:

- Cloud environment → **Environment variables**:
  ```
  BWS_PROJECT_ID=<test project id>
  BWS_ACCESS_TOKEN=<scoped, short-lived test token>
  ```
- **Setup script** (tooling only — cached in the snapshot; `crates.io` is
  in the default Trusted allowlist, no network-access changes needed):
  ```bash
  #!/usr/bin/env bash
  set -euo pipefail
  cargo install bws --locked || true
  ```
- Exercise: `node bin/ai-git.js gh-repo-view` with `AI_GIT_TOKEN` unset —
  should re-exec through `bws run --project-id "$BWS_PROJECT_ID" --` and
  succeed via the injected token.
- Afterward: revoke the test BWS token/project, clear the environment's
  `BWS_ACCESS_TOKEN`.

## Out of Scope

- Provisioning an actual Bitwarden Secrets Manager account/project — a
  manual step for the human.
- Any install-time secrets-wrapper wiring in `bin/aif.js` — no current
  consumer needs it; revisit if one appears.
- A local per-developer `.aiconfig.json` override file (e.g.
  `.aiconfig.local.json`) for toggling `allow_insecure_dotenv` without
  touching the committed config — possible future enhancement, not built
  now.
