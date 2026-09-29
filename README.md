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

Cloud setup is split in two, matching when each step can run:

- **Environment Setup script** — set by hand in the cloud environment's
  settings (not a repo file). It runs as root before Claude Code launches,
  before the repo is checked out, and its result is snapshotted and reused by
  later sessions, so it must never reference repo files or real secrets. It
  must exit 0 (a non-zero exit fails session start) and finish in roughly five
  minutes (otherwise the environment isn't cached). `gh`, Node 22 and `cargo`
  are pre-installed; only `bws` is missing:

  ```bash
  #!/usr/bin/env bash
  command -v bws >/dev/null 2>&1 || cargo install bws --locked || true
  exit 0
  ```

  Put secrets in the environment's **Environment variables** field instead.

- **SessionStart hook** — `.claude/settings.json` runs `scripts/install-deps.sh`
  (`npm install`) in cloud sessions only, once the repo is checked out.

See `docs/plans/secrets-resolution-plan.md` ("Cloud Testing Setup") for the
secrets reasoning.

---

## Contributing

This repo is framework only — no application code lives here. When adding or modifying components, use the corresponding authoring skill for the guided procedure and validation checklist. See `AGENTS.md` for the full specification.

Work within this repo is recommended to be agent-authored using the authoring skills (`skill/agent-authoring`, `skill/skill-authoring`, etc.).
