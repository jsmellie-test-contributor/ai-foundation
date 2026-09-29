# AGENTS.md — AI Foundation Repo Guide

> Read this file first. It defines what this repo is, how it is structured,
> and the rules for loading its components.

---

## What This Repo Is

`ai-foundation` is a portable, harness-agnostic framework for AI-assisted software development.
It defines:

- **Who** does what — named agent roles with explicit responsibilities and prompts
- **What procedures they follow** — skills that define reusable step-by-step processes
- **What rules govern them** — steering files that enforce behaviour unconditionally
- **What reference material they draw on** — standards and knowledge files

Nothing here is tied to a specific AI harness.

---

## Directory Structure

```
ai-foundation/
├── AGENTS.md                        ← This file. Read first.
├── agents/                          ← Agent definitions (.yaml + optional .md)
├── skills/                          ← Reusable procedures (folders with SKILL.md)
├── steering/                        ← Always-on rules (global/ + {domain}/)
├── standards/                       ← Prescriptive coding/stack rules
├── servers/                         ← MCP tool server definitions
├── bundles/                         ← Install bundles (per-harness deployment)
├── projects/                        ← Per-project overrides
├── docs/                            ← Plans, ADRs, and arc42 architecture docs
├── bin/                             ← CLI entry point (aif)
├── lib/                             ← CLI modules
└── tests/                           ← unit/, integration/, validation/
```

---

## File Loading Rules

| File type                    | When to load                                                                                             |
| ---------------------------- | -------------------------------------------------------------------------------------------------------- |
| `steering/global/**/*.md`    | Every session, always                                                                                    |
| `steering/{domain}/**/*.md`  | Based on agent's `domain` field                                                                          |
| `steering/generic/**/*.md`   | Whenever a bundle explicitly lists it in its `steering:` field — not domain-matched (see Steering below) |
| `agents/{name}.yaml`         | To execute an agent role                                                                                 |
| `skills/{name}/SKILL.md`     | When the task requires that procedure                                                                    |
| `standards/{name}.md`        | When working in that language/stack                                                                      |
| `servers/{name}/{name}.yaml` | To understand an available tool server                                                                   |

**Do not load:** `README.md` files, files starting with `_`.

**Loading order:** This file → global steering → domain steering → generic (catch-all) steering → agent yaml → skills/standards as needed.

---

## Component Types

### Agent

A named persona with a defined role, prompt, tools, and skills.

**Lives in:** `agents/` | **Format:** `.yaml` | **Authoring:** `skill/agent-authoring`

Fields: `name`, `version`, `domain`, `description`, `prompt`, `tools`, `approved_tools`, optional `skills`, optional `preload_skills`, optional `blocked_commands`

`blocked_commands`: array of shell command glob patterns (using `*` as wildcard) that the agent is forbidden from executing directly. Each harness adapter translates these into its native denial format (e.g. Kiro `permissions.rules` deny, Claude Code `Bash()` deny rules).

### Skill

A reusable, self-contained procedure. Defines inputs, steps, and outputs.

**Lives in:** `skills/{name}/` | **Format:** `SKILL.md` + `reference/`, `assets/`, `scripts/` | **Authoring:** `skill/skill-authoring`

Front-matter: `name`, `version`, `description` Body sections: Purpose, Inputs, Steps, Outputs, Edge Cases

Steps are headed `### Step N — Name` — numbered, since order is meaningful. A citation to one specific step, from any document, must name it, never cite the number alone — see `steering/engineering/core.md`: "Cite, Don't Restate".

### Steering

Always-on rules. Unconditional within scope.

**Lives in:** `steering/{scope}/` | **Format:** `.md` | **Authoring:** `skill/steering-authoring`

Front-matter: `name`, `version`, `description`, optional `file_patterns` Scopes: `global/` (all agents, domain-matched), `{domain}/` (domain agents, domain-matched), or `generic/` (catch-all for non-global, non-domain-specific content — loaded via a bundle's explicit `steering:` list, not domain-matched, e.g. `steering/generic/` for the `gmail` server). Agent-specific rules go in the agent's `prompt`.

Rules are headed `### Rule: Name` — unnumbered, since rules are independent and unordered and a number would only be a drift risk. Same citation requirement as Skill steps: name it, never a number.

### Standards / Knowledge

**Standards** (`standards/`): prescriptive rules. Deviation requires an explicit exception.
**Knowledge** (`knowledge/`): descriptive reference. Informs decisions but allows deviation.

### Server

MCP tool provider definition.

**Lives in:** `servers/{name}/` | **Format:** `.yaml` | **Authoring:** `skill/server-authoring`

Fields: `name`, `version`, `protocol`, `transport`, `description`, `tools`

---

## Project Configuration

### `.aiconfig.json`

Every project that uses ai-foundation agents should have a `.aiconfig.json` file at the repository root. This file provides project-specific configuration that agents read before performing any path-dependent operation.

**Location:** Project repository root (where agents run)

**Resolution order:**

1. Read `.aiconfig.json` from the current working directory
2. If not found, fall back to default conventions (see below)

**Agents MUST check for `.aiconfig.json` before assuming any paths.** If the file exists, its values override all defaults. If it does not exist, agents use the default conventions documented in each skill.

See `projects/_template/.aiconfig.json` for the schema and default values.

### Fields

| Field                           | Type    | Required | Description                                                                                                                                                                  |
| ------------------------------- | ------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `project_name`                  | string  | Yes      | Project identifier used in file naming and human-readable metadata                                                                                                           |
| `project_shortname`             | string  | No       | Short project identifier (max 5 characters) used in Feature IDs and worktree paths. Falls back to `project_name` if unset.                                                   |
| `repo_type`                     | string  | No       | Repository type: `project` (default) or `framework`. Determines which git workflow and conventions apply.                                                                    |
| `standards`                     | object  | No       | Map of domain → tags for tag-based standard matching. See below.                                                                                                             |
| `project_standards`             | string  | No       | Path to project-specific standards override                                                                                                                                  |
| `ai_identity`                   | object  | No       | AI agent git identity for commits and push auth                                                                                                                              |
| `ai_identity.git_author_name`   | string  | No       | Name used in GIT_AUTHOR_NAME and GIT_COMMITTER_NAME env vars                                                                                                                 |
| `ai_identity.git_author_email`  | string  | No       | Email used in GIT_AUTHOR_EMAIL and GIT_COMMITTER_EMAIL env vars                                                                                                              |
| `ai_identity.git_token_env`     | string  | No       | Name of env var holding the PAT for push/PR ops                                                                                                                              |
| `secrets`                       | object  | No       | Provider-agnostic secrets resolution for `ai-git` (see below)                                                                                                                |
| `secrets.run`                   | array   | No       | Command+args prefix for a secrets manager's own "run wrapper" (e.g. `["bws", "run", "--project-id", "${BWS_PROJECT_ID}", "--"]`)                                             |
| `secrets.allow_insecure_dotenv` | boolean | No       | Explicit opt-in to a gitignored `.env` fallback when `secrets.run` is unset. Default `false` — for local testing only.                                                       |
| `paths`                         | object  | No       | Artifact output directories (relative to repo root). Any value may reference another resolved field with `{key.path}` — see below.                                           |
| `paths.plans`                   | string  | No       | Root for all plan artifacts. Default: `plans`                                                                                                                                |
| `paths.features`                | string  | No       | Root for a Feature's folder — `{paths.features}/{FeatureID}/plan.md`, `tasks.json`, and `orchestration-state.json` all live together as siblings. Default: `plans/features`  |
| `paths.decisions`               | string  | No       | ADRs (MADR format), flat directory, no domain subfolders. Default: `knowledge/decisions`                                                                                     |
| `paths.knowledge`               | string  | No       | Knowledge directory. Default: `knowledge`                                                                                                                                    |
| `paths.architecture`            | string  | No       | arc42 architecture sections, flat directory. Default: `knowledge/architecture`                                                                                               |
| `paths.research`                | string  | No       | Engineering Researcher's brief output (`.md` only). Default: `knowledge/research`                                                                                            |
| `paths.product`                 | string  | No       | Reserved for a future product-doc agent. No default — omitted from generated configs until that agent exists; set it explicitly only if you're building that agent yourself. |
| `paths.worktrees`               | string  | No       | Root directory for git worktrees used by parallel agents. Default: `../worktrees/{project_shortname}`                                                                        |
| `orchestration`                 | object  | No       | Orchestration behaviour configuration                                                                                                                                        |
| `orchestration.max_concurrent`  | number  | No       | Maximum parallel subagents the Engineering Manager may dispatch. Default: `4`                                                                                                |

#### `{key.path}` references in path values

Any string field — including a custom key not listed above, e.g. `paths.features`
may reference another field's _resolved_ value with `{key.path}`:

```json
{
  "paths": {
    "plans": "docs/plans",
    "features": "{paths.plans}/features"
  }
}
```

`paths.features` resolves to `docs/plans/features`. References resolve
recursively (a reference may itself contain a reference) and may point at a
field that falls back to its own default. A cycle — directly, or through a
chain of references — is an error rather than infinite recursion.

#### `standards` field

A map of agent domain → array of tags for tag-based standard matching:

```json
{
  "standards": {
    "engineering": ["csharp", "avalonia"],
    "product": ["ux-design"],
    "all": []
  }
}
```

- Agents collect tags from their `domain` entry plus `"all"`
- Standards declare their own tags in YAML front-matter
- A standard loads if **ALL** of its tags are present in the project's collected tags
- `depends_on` chains are resolved automatically (dependencies load first)
- Resolution: project-local `./standards/{name}.md` first, then global installed copy

#### `secrets` field

Provider-agnostic secrets resolution for `ai-git`'s `AI_GIT_TOKEN`-equivalent
token (`ai_identity.git_token_env`). Neither field is required — with
neither set, `ai-git` behaves exactly as it always has: it reads the token
from a plain, already-exported environment variable.

```json
{
  "secrets": {
    "run": ["bws", "run", "--project-id", "${BWS_PROJECT_ID}", "--"],
    "allow_insecure_dotenv": false
  }
}
```

- `secrets.run`: a command+args prefix for a secrets manager's own "run
  wrapper" — the pattern every major provider CLI already implements
  (`bws run --project-id X -- <cmd>`, `op run -- <cmd>`, `doppler run --
<cmd>`). When the configured token env var is missing and an operation
  needs it, `ai-git` re-execs itself through this wrapper; the secret is
  injected straight into the wrapped process's memory and is never
  written to disk. `${VAR}` placeholders inside individual elements (e.g.
  `${BWS_PROJECT_ID}` — a non-secret identifier) are resolved against the
  caller's own environment first. This field never names a specific
  provider — Bitwarden Secrets Manager is one example, not a special case.
- `secrets.allow_insecure_dotenv`: explicit, off-by-default opt-in to fall
  back to a gitignored `.env` file at the repo root when no `run` wrapper
  is configured or resolves the needed variable. Intended for local
  testing before a real secrets manager is wired up, never for CI or
  production — every time it's actually used, `ai-git` prints a warning to
  stderr so it's never silent.
- MCP server tokens (a server yaml's `headers` field, e.g.
  `Authorization: "Bearer ${YOUTRACK_TOKEN}"`) don't need any of this —
  both supported harnesses (Claude Code, Kiro) natively expand `${VAR}`
  placeholders from their own process environment at connect time, so
  `aif install` never resolves or needs the secret at all. See
  `skills/server-authoring/reference/schema.yaml`'s "headers and secrets"
  section.

### Defaults (when `.aiconfig.json` is absent)

If no config file exists, agents fall back to:

- `project_name`: inferred from repository directory name
- `project_shortname`: same as `project_name`
- `standards`: none (agent must ask or search `standards/`)
- `paths.plans`: `plans`
- `paths.features`: `plans/features`
- `paths.decisions`: `knowledge/decisions`
- `paths.knowledge`: `knowledge`
- `paths.architecture`: `knowledge/architecture`
- `paths.research`: `knowledge/research`
- `paths.product`: not set (reserved, no default)
- `paths.worktrees`: `../worktrees/{project_shortname}`

---

## Testing

```bash
node --test "tests/unit/**/*.test.js"          # Fast, no I/O
node --test "tests/integration/**/*.test.js"   # Filesystem tests
node --test "tests/validation/**/*.test.js"    # Real repo checks
```

---

## Discovering Components

Scan directories — don't maintain a roster:

- `agents/*.yaml` | `skills/*/SKILL.md` | `steering/**/*.md` | `standards/*.md` | `servers/*/*.yaml`

Each file's `description` field tells you what it covers without loading the full content.
