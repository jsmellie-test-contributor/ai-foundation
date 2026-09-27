---
section: '05'
title: 'Building Block View'
lifecycle: published
last_verified: 5944c97
tags: [building-blocks, c4]
key_files:
  - bin/aif.js
  - bin/ai-git.js
  - lib/resolver.js
  - lib/aiconfig.js
  - lib/harnesses/base.js
  - lib/file-utils.js
  - servers/dag/dag.yaml
  - servers/dag/index.js
  - servers/dag/logic.js
  - servers/gmail/gmail.yaml
  - servers/gmail/auth.js
  - servers/youtrack/youtrack.yaml
---

> Level-1 whitebox of the `aif` CLI and the component directories it resolves,
> transforms, and installs — decomposed into black boxes, each with its
> responsibility and interface.

## Overview Diagram

```mermaid
graph TD
  subgraph Entry["Entry points"]
    CLI["bin/aif.js"]
    GitCLI["bin/ai-git.js"]
  end

  Commands["Command layer — lib/commands/* (§5.05)"]
  CoreLibs["Core libraries — lib/*.js (§5.01/§5.03/§5.04)"]
  Harnesses["Harness adapters — lib/harnesses/* (§5.02)"]

  subgraph Sources["Component sources — declarative"]
    Agents["agents/"]
    Skills["skills/"]
    Steering["steering/"]
    Standards["standards/"]
    Bundles["bundles/"]
    Template["projects/_template/"]
  end

  CLI --> Commands
  GitCLI --> CoreLibs

  Commands --> CoreLibs
  Commands --> Harnesses
  Harnesses --> CoreLibs

  CoreLibs --> Agents & Skills & Steering & Standards & Bundles & Template
```

Every group above with its own `§5.0N` whitebox is shown as a single collapsed
node here — Command layer, Core libraries, and Harness adapters each have a more
detailed diagram at that level. Entry points and Component sources stay fully
expanded since neither has one.

MCP servers (`servers/dag`, `servers/gmail`, `servers/youtrack`) aren't shown as
graph nodes here — `resolver.js` only reads their `*.yaml` definitions to resolve
which get installed; the actual MCP connection is a harness-runtime relationship
(harness ↔ server process/endpoint), not a static code dependency. See the MCP
servers table below and §3 Technical context.

## Motivation

The six groups below split along the one boundary that actually matters for this
system: **what has to change together when a harness is added, vs. what never
should.** Entry points and the command layer are harness-agnostic orchestration;
core libraries are harness-agnostic logic reused by every command; harness adapters
are the _only_ place harness-specific knowledge is allowed to live (§1 Quality
Goals' portability goal, enforced structurally); MCP servers and component sources
are content the other five groups resolve and install, not code that runs as part
of `aif` itself. Grouping any other way (e.g. by CLI command, or by file size) would
cut across that boundary and hide it.

## Contained Building Blocks

### Entry points

| Block           | Responsibility                                                          | Interface                                     |
| --------------- | ----------------------------------------------------------------------- | --------------------------------------------- |
| `bin/aif.js`    | Parses argv, dispatches to the matching `lib/commands/*` handler.       | `run(parsed)`, `parseArgs(argv)`              |
| `bin/ai-git.js` | Transparent git/gh wrapper injecting AI author identity and token auth. | CLI passthrough: `ai-git <command> [args...]` |

### Command layer (`lib/commands/*`) — see §5.05

| Block           | Responsibility                                                                                                                                                                       | Interface                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| All 10 commands | One file per `aif <verb>` subcommand — thin orchestrators that parse their own args and call straight into Core libraries/Harness adapters. See §5.05 for the per-command breakdown. | `run{Verb}(parsed, repoRoot)` (`config.js` takes `cwd` instead) — one per file. See §5.05. |

### Core libraries (`lib/*.js`) — see §5.01/§5.03/§5.04

| Block                                                | Responsibility                                                                                                                                                                                                        | Interface                                                                             |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `resolver.js`                                        | Resolves a bundle's full component set: domain auto-discovery + explicit lists + dedupe. See §5.01.                                                                                                                   | `resolveBundle()`, `listStandards/Bundles/Servers/HookResources()`, `parseSkillRef()` |
| `decisions.js` / `architecture.js` / `index-diff.js` | Parse, index, and diff ADRs and arc42 sections respectively, sharing one generic diffing primitive. See §5.04.                                                                                                        | See §5.04.                                                                            |
| Everything else                                      | `manifest.js`, `snapshot/io.js`+`pure.js`, `project-init.js`, `ai-git.js`, `secrets.js`, `constants.js`/`component-defs.js`, `aiconfig.js`+`aiconfig-resolve.js`+`aiconfig-defaults.js`, `file-utils.js` — see §5.03. | See §5.03.                                                                            |

### Harness adapters (`lib/harnesses/*`) — see §5.02

| Block       | Responsibility                                                                                                                         | Interface                                                               |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `base.js`   | Shared install orchestration every adapter reuses: read source → transform → write → return a manifest-ready record. Adapter-agnostic. | `createAdapter(config)`, `stripSkillPrefix()`, `resolvePreloadSkills()` |
| `claude.js` | Claude Code adapter: agent/steering transforms, native-tool-cluster `TOOL_MAP`, shared block-command hook install.                     | `transformAgent()`, `transformSteering()`, `TOOL_MAP`, `TARGETS`        |
| `kiro.js`   | Kiro adapter: same `createAdapter` contract, Kiro's own JSON agent format and steering inclusion rules.                                | `transformAgent()`, `transformSteering()`, `TOOL_MAP`, `TARGETS`        |

### MCP servers (`servers/*`)

| Block      | Responsibility                                                                                                                                      | Interface                                                                                     |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `dag`      | Local Node MCP server (stdio): validates a `tasks.json` dependency graph and computes execution waves.                                              | Tools: `dag-validate`, `dag-compute-waves` (`servers/dag/index.js`, pure logic in `logic.js`) |
| `gmail`    | Local Node MCP server (stdio): Gmail read/write operations via an OAuth2-authorized client built once at startup.                                   | Tools per `gmail.yaml`; `getAuthorizedClient()` (`servers/gmail/auth.js`)                     |
| `youtrack` | Vendor-hosted — JetBrains' own remote MCP endpoint over HTTPS, bearer-token auth. No local server code at all, just a declarative `*.yaml` pointer. | Tools per `youtrack.yaml`, captured from a live `listTools()` call against the real server    |

### Component sources (declarative — resolved by `resolver.js`, transformed by a harness adapter)

| Block                 | Responsibility                                                                                  | Interface                                                    |
| --------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `agents/`             | Agent definitions: role, prompt, tool grants, skill list.                                       | One `{name}.yaml` per agent — see `AGENTS.md` for the schema |
| `skills/`             | Reusable procedures agents invoke by name.                                                      | `SKILL.md` + optional `reference/` per skill folder          |
| `steering/`           | Always-on rules, global plus per-domain.                                                        | `.md` files under `global/` and `{domain}/`                  |
| `standards/`          | Tag-matched coding/stack rules.                                                                 | `.md` files, tag-matched per `standards` in `.aiconfig.json` |
| `bundles/`            | Per-harness install bundle definitions (domain auto-discovery and/or explicit component lists). | `{name}/bundle.yaml`                                         |
| `projects/_template/` | Skeleton a new project is scaffolded from by `aif init`.                                        | Directory tree + a placeholder `.aiconfig.json`              |

## White-box expansions

- **§5.01 Bundle resolution** (`05_01_bundle_resolution.md`) — `resolver.js`'s
  domain-auto-discovery algorithm in full.
- **§5.02 Harness adapters** (`05_02_harness_adapters.md`) — the shared adapter
  contract and where Claude Code and Kiro actually diverge.
- **§5.03 Core libraries** (`05_03_core_libraries.md`) — the remaining
  harness-agnostic support libraries `resolver.js` and the decisions/architecture
  indexing pair aren't part of.
- **§5.04 Document indexing** (`05_04_document_indexing.md`) — the shared
  parse/build/diff pipeline behind `aif index decisions|architecture`, and
  exactly where the two formats diverge.
- **§5.05 Command layer** (`05_05_command_layer.md`) — the full per-command
  responsibility/interface breakdown for all 10 `lib/commands/*.js` files.

Entry points and MCP servers stay at this level — each block in those two groups
is a single, thin, single-purpose module; a further whitebox wouldn't add
information a reader doesn't already have from the table row. Component sources
are declarative directories, not code, so no whitebox applies to them at all.
