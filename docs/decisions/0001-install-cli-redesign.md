---
status: accepted
date: 2026-07-31
decision-makers: [Jeremy]
tags: [install, cli, harness-adapters]
links:
  supersedes: []
affects:
  - bin/aif.js
  - lib/commands/install.js
  - lib/resolver.js
  - lib/harnesses/**
  - bundles/**
---

# Install CLI Redesign

## Context and Problem Statement

The original `install.ps1` was Windows/PowerShell-only, used symlinks, assumed all
agents were Markdown (wrong for Kiro, which expects JSON), and had no structured way
to install component subsets. ai-foundation needed a portable, OS-agnostic installer
that correctly transforms components per target harness.

## Decision Drivers

- OS-agnostic — must run on Windows, macOS, Linux
- Must support multiple harnesses with different file-format expectations
- Clean install/uninstall with manifest tracking
- Minimal dependencies; no over-engineering for v1

## Considered Options

- Shell script with symlinks — can't handle format transforms or bundle resolution
- Node.js CLI with copies and per-harness adapters
- Node.js CLI, symlinking untransformed files and copying only agents

## Decision Outcome

Chosen: a Node.js CLI (`bin/aif.js`) backed by `lib/commands/*`, `lib/resolver.js`,
and per-harness adapters, installing everything as copies with a tracked manifest.
Every harness expects a different file format and location; a copy-based approach
with transform adapters handles all of them uniformly, and Node.js was already a
project dependency. See `docs/architecture/05_01_bundle_resolution.md` and
`05_building_blocks.md` for the resulting design — evolved substantially since this
decision and kept current there, not reproduced here.

## Consequences

- Files can go stale after source updates; mitigated by `aif status` and re-running
  `aif install`.
- Requires running `aif install` after pulling changes — accepted given the transform
  requirement.
- Symlinks were rejected outright, so per-harness copies are the permanent cost of
  supporting divergent native formats.
