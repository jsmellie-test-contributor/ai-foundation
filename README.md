# AI Foundation

A portable, harness-agnostic framework for AI-assisted software development.
Defines agent roles, reusable procedures, enforced rules, and coding standards as plain files that any AI harness can load.

Works with Kiro, Claude Code, or any tool that can inject text into an agent's context.

---

## Goal

Provide a single source of truth for AI-assisted development workflows that isn't locked to any vendor. Define once, install anywhere.

---

## Structure

```
ai-foundation/
├── agents/          Agent definitions (.yaml)
├── skills/          Reusable procedures (folders with SKILL.md)
├── steering/        Always-on rules (global/ + {domain}/)
├── standards/       Prescriptive coding/stack rules
├── servers/         MCP tool server definitions
├── bundles/         Install bundles (per-harness deployment)
├── projects/        Per-project overrides and templates
├── docs/            Plans, ADRs, and arc42 architecture docs
├── bin/             CLI entry point (aif)
├── lib/             CLI modules
└── tests/           unit/, integration/, validation/
```

For details on component types, field requirements, and loading rules, see [`AGENTS.md`](AGENTS.md).

---

## Agents

| Agent                  | Role                                                                                                 |
| ---------------------- | ---------------------------------------------------------------------------------------------------- |
| architect              | Rare, contested, costly-to-reverse decisions — produces ADRs                                         |
| engineering-manager    | Planning (Feature/Task decomposition) and orchestration across agents                                |
| software-engineer      | Owns a Task end-to-end: design, implement, test, document — product code and AI-component work alike |
| engineering-researcher | Web research — decision-ready briefs for Architect, Engineering Manager, or Software Engineer        |
| principal-engineer     | Code review — enforces quality, security, and standards                                              |

---

## CLI

The `aif` CLI manages installation, validation, and project scaffolding.

```bash
# Install/manage bundles
aif install --bundle engineering --harness kiro
aif install --update
aif uninstall --bundle engineering --harness kiro
aif status
aif list bundles|agents|skills|servers

# Validation and testing
aif validate [schema|refs|bundles]
aif test [unit|integration|validation]

# Source freshness
aif snapshot --check
aif snapshot
aif snapshot --bundle             # every bundle's snapshot (bare flag = all of that kind)
aif snapshot --bundle engineering # one bundle's snapshot

# Decision/architecture indexing
aif index decisions             # generate {paths.decisions}/index.json
aif index decisions --check     # verify the decision index without writing
aif index architecture          # generate docs/architecture/index.json
aif index architecture --check  # verify the architecture index without writing

# Project scaffolding
aif init --name my-app --shortname myapp --language typescript --org acme
aif init --interactive

# Config field resolution
aif config paths.decisions          # resolve a .aiconfig.json field, falling back to its default
aif config paths.decisions --abs    # print an absolute path (for paths.* keys)
```

### Harness Support

| Harness     | Status    |
| ----------- | --------- |
| Kiro        | Supported |
| Claude Code | Supported |
| Copilot     | Planned   |

Installs are copies (transformed per-harness), tracked by a manifest for clean uninstall and update detection. Snapshots detect source staleness so `aif install --update` only reinstalls what changed.

---

## Project Setup

Projects that use ai-foundation agents have a `.aiconfig.json` at the repo root.
Scaffold a new project with `aif init` or create the file manually. Key fields:

```json
{
  "project_name": "my-app",
  "project_shortname": "myapp",
  "repo_type": "project",
  "ai_identity": {
    "git_author_name": "AI Agent",
    "git_author_email": "ai@example.com",
    "git_token_env": "AI_GIT_TOKEN"
  },
  "standards": {
    "engineering": ["csharp", "avalonia"],
    "all": []
  }
}
```

The `ai_identity` field enables agents to commit and push under a separate identity, keeping AI-authored work clearly distinct in git history and PRs.
The token is read from the named env var at runtime — never stored in the file.

`project_shortname` (max 5 characters) is used in Feature IDs (e.g. `MYAPP-001`)
and worktree paths, keeping them short even when `project_name` is long. It falls back to `project_name` if omitted.

See `AGENTS.md` for the full schema and `projects/_template/` for defaults.

---

## Testing

```bash
aif test unit          # Fast, no I/O
aif test integration   # Filesystem tests
aif test validation    # Real repo checks
```

Requires Node.js 22+. Install dependencies: `npm install`.

### Claude Code Cloud

This section owns the `ai-git`, `gh`, `bws` and environment-variable
parts of a cloud environment; agent selection is composed on top of it separately.
The environment's **Setup script** (set by hand in the environment settings) runs
as root before the repo is checked out, so it only provisions the VM. It must exit 0
and finish in about five minutes to be cached.

#### Setup script

Pinned versions only (never `latest`), each download verified against a hardcoded
sha256 before it is installed, and `--ignore-scripts` because the script runs as
root. Replace `<ref>` with the tag or commit of ai-foundation to pin. Requires
`curl`, `sha256sum`, `tar` and `unzip` in the image.

```bash
#!/bin/bash
set -euo pipefail

npm install -g github:starvoxel/ai-foundation#<ref> --ignore-scripts

tmp="$(mktemp -d)"
cd "$tmp"

# gh 2.102.0
curl -fsSL -o gh.tar.gz https://github.com/cli/cli/releases/download/v2.102.0/gh_2.102.0_linux_amd64.tar.gz
echo "bb766f710eef8ede859c18578c72c327597cd4c8a85b06001b1f3843c6019386  gh.tar.gz" | sha256sum -c -
tar -xzf gh.tar.gz
install -m 0755 gh_2.102.0_linux_amd64/bin/gh /usr/local/bin/gh

# bws 2.1.0
curl -fsSL -o bws.zip https://github.com/bitwarden/sdk-sm/releases/download/bws-v2.1.0/bws-x86_64-unknown-linux-gnu-2.1.0.zip
echo "ba8233c3a4aee5d43e3c73bbd04d99e9bc5aba13bbbfd06d89b073abe732b860  bws.zip" | sha256sum -c -
unzip -o bws.zip bws
install -m 0755 bws /usr/local/bin/bws
```

`npm install -g` puts `ai-git` and `aif` on PATH. A checksum mismatch fails the script (non-zero exit, so the
setup is not cached) before that tool is installed.

#### Environment variables

Set these in the environment's **Environment variables**, never in the script:

| Variable            | Value                                                                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `GIT_CONFIG_GLOBAL` | `/dev/null`. The harness writes `/root/.gitconfig` with its own identity; this makes a raw `git commit` fail instead of using it.           |
| `BWS_PROJECT_ID`    | Bitwarden Secrets Manager project holding the token named by `ai_identity.git_token_env` (`AI_GIT_TOKEN` here). Not a secret.               |
| `BWS_ACCESS_TOKEN`  | Machine-account token for that project. The one credential in the environment; scope it to the `ai-git` credentials only.                   |
| `AIF_BUNDLES`       | Comma-separated bundles (e.g. `engineering,generic`) that the SessionStart hook installs with `aif install -H claude`; unset installs none. |

#### SessionStart hook

`.claude/settings.json` runs `scripts/session-start.sh` at session start. In cloud
sessions only (`CLAUDE_CODE_REMOTE=true`) it runs, in order:

1. `npm ci --ignore-scripts`: this repo's lockfile-pinned dependencies, dev included so a session can run the full CI locally; `aif` needs the production ones (`npm link` alone does not install them). Fails on lockfile drift. A project's own scaffolded SessionStart hook should install production dependencies only (`--omit=dev`).
2. `npm link --ignore-scripts`: puts `ai-git` and `aif` on PATH.
3. `aif install -B $AIF_BUNDLES -H claude`, only if `AIF_BUNDLES` is set.
4. `ai-git doctor`: report only.

Step 1 is the hook's only network step; `gh`, `bws` and
the pinned package come from the Setup script, never from SessionStart. Every step
warns on failure instead of aborting, and the hook always exits 0.

#### Verification checklist

Run in a fresh session of a repo that has `.aiconfig.json`:

1. `command -v ai-git aif gh bws` resolves all four.
2. `ai-git commit` (on a throwaway branch) shows the AI identity as author.
3. A raw `git commit` fails with "Author identity unknown".
4. `ai-git gh-api repos/{owner}/{repo}/issues --method POST -f title="a title with spaces"`
   works (arguments with spaces arrive intact).
5. `ai-git doctor` exits 0 and reports the token as resolved (never prints the value).

#### Cloud limits

- **No GraphQL.** The session proxy blocks it, so `ai-git gh-pr-*`, `gh pr ...` and
  `gh repo view` fail with HTTP 403. Use REST through `ai-git gh-api repos/{owner}/{repo}/...`;
  see `skill/pr-stewardship` for the endpoints.
- **Proxy identity.** The proxy replaces the token on GitHub API calls, so PRs, comments
  and issues are authored as the proxy identity, not the `bws` token's. Commit
  authorship (the AI identity) is unaffected.
- **Branch deletion is blocked.** The proxy refuses to delete a remote branch (REST and
  `git push --delete`); delete test branches by hand.
- **No spaces in the install path.** The `bws` re-exec puts the `ai-git` script path
  unquoted into the wrapper's command line, so the install path of ai-foundation must
  not contain spaces. The default global npm prefix does not.

---

## Contributing

This repo is framework only — no application code lives here. When adding or modifying components, use the corresponding authoring skill for the guided procedure and validation checklist. See `AGENTS.md` for the full specification.

Work within this repo is recommended to be agent-authored using the authoring skills (`skill/agent-authoring`, `skill/skill-authoring`, etc.).
