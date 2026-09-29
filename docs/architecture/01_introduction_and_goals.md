---
section: '01'
title: 'Introduction and Goals'
lifecycle: published
last_verified: a0b0214
tags: [overview]
key_files:
  - README.md
  - AGENTS.md
  - package.json
---

> What ai-foundation is, who it's for, and the quality goals its design serves.

## Requirements overview

ai-foundation is a portable, harness-agnostic framework for AI-assisted software
development. It defines agent roles, reusable procedures, enforced rules, and coding
standards as plain files — YAML agent definitions, Markdown skills/steering/standards,
JSON manifests — that any AI coding harness can load. A project adopts it by running
`aif install`, which copies and transforms the relevant components into that harness's
native format (e.g. Claude Code's `.claude/agents/`, Kiro's `.kiro/steering/`).

The framework itself is also the first consumer of its own conventions: this
repository's `.aiconfig.json`, `agents/`, `skills/`, and `docs/` follow the same
schemas a downstream project would, so changes here are validated by using them, not
just by describing them.

### Non-goals

- Not an agent runtime — `aif` installs configuration; the harness executes it.
- Not a project-tracking system — Feature/Task state lives in flat files an agent or
  human edits directly, not a hosted service.
- Not a model-provider abstraction — it doesn't wrap or proxy LLM APIs.
- Not a build system or CI runner for the projects that adopt it.

## Quality Goals

| Priority | Goal                       | Motivation                                                                                               | Measurable criterion                                                                                                                                      |
| -------- | -------------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1        | Portability                | One definition installs into multiple harnesses without per-harness rewrites.                            | Installs into 2 harnesses today (Claude Code, Kiro) from one component set — zero harness-specific source duplication in `agents/`/`skills/`/`steering/`. |
| 2        | Ease of use                | `aif install`/`init` work with sensible defaults.                                                        | `aif init --name X` needs only that one flag; `aif install` resolves a full component set from a single `--bundle` argument.                              |
| 3        | Minimal-dependency tooling | Small dependency footprint avoids the framework becoming a supply-chain or portability liability itself. | 4 runtime dependencies total (`package.json`): `@modelcontextprotocol/sdk`, `googleapis`, `yaml`, `zod`.                                                  |

## Stakeholders

| Role                 | Concern                                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Project adopter      | One set of AI-development rules, trusted across every project/harness; retains final approval over anything AI-authored. |
| Framework maintainer | Evolves the agent/skill/steering schemas and harness adapters that adopters install.                                     |
