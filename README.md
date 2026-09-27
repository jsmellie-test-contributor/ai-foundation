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
├── docs/            Plans and decision records
├── bin/             CLI entry point (aif)
├── lib/             CLI modules
└── tests/           unit/, integration/, validation/
```

For details on component types, field requirements, and loading rules, see [`AGENTS.md`](AGENTS.md).

---

## Agents

| Agent                   | Role                                                                       |
| ----------------------- | -------------------------------------------------------------------------- |
| ai-engineer             | Builds and maintains AI infrastructure — agents, skills, steering, servers |
| architect               | Technical decision-making, produces Decision Records                       |
| engineering-manager     | Orchestrates parallel chunk plan execution across agents                   |
| tech-lead               | Planning and decomposition — Epic Plans and Chunk Plans                    |
| software-engineer       | Implements code from approved Chunk Plans                                  |
| test-engineer           | Writes and executes tests against plan test cases                          |
| principal-engineer      | Code review — enforces quality, security, and standards                    |
| engineering-tech-writer | Documentation — inline docs, READMEs, changelogs                           |

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

# Knowledge/decision indexing
aif index knowledge          # generate knowledge/index.json
aif index decisions          # generate {paths.decisions}/index.json
aif index decisions --check  # verify the decision index without writing

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

`project_shortname` (max 5 characters) is used in Epic IDs (e.g. `MYAPP-001`)
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

`scripts/setup-cloud.sh` is the environment's **Setup script** — paste its
path into the cloud environment config. It only installs tooling (`npm ci`,
`gh`, `bws`) and runs lint/typecheck/validate; its output is cached in the
environment snapshot and reused across sessions, so it must never touch real
secrets. Put those in the environment's **Environment variables** field
instead. See `docs/plans/secrets-resolution-plan.md` ("Cloud Testing Setup")
for the reasoning.

---

## Contributing

This repo is framework only — no application code lives here. When adding or modifying components, use the corresponding authoring skill for the guided procedure and validation checklist. See `AGENTS.md` for the full specification.

Work within this repo is recommended to be agent-authored using the authoring skills (`skill/agent-authoring`, `skill/skill-authoring`, etc.).
