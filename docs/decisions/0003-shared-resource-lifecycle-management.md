---
status: accepted
date: 2026-08-13
decision-makers: [Jeremy]
tags: [manifest, servers, hooks, lifecycle]
links:
  supersedes: []
affects:
  - lib/manifest.js
  - lib/commands/install.js
  - lib/commands/uninstall.js
  - lib/commands/snapshot.js
  - lib/harnesses/base.js
---

# Shared Resource Lifecycle Management (Servers & Hooks)

## Context and Problem Statement

`aif uninstall` deleted every file and MCP registration in a bundle's manifest
entry unconditionally. A shared MCP server or the Claude Code `block-command` hook,
referenced by more than one bundle, would be silently deleted out from under a
second bundle that still needed it — neither resource type had any concept of being
installed by more than one thing.

## Decision Drivers

- Uninstalling one bundle must never remove a resource another installed bundle
  still needs
- Servers and hooks must eventually be removable once nothing depends on them — no
  permanent leaks
- `.installs.yaml` is generated and gitignored, so a schema change costs nothing
  externally
- One consistent mechanism for every shared, harness-level resource

## Considered Options

- Derived ownership: scan every other manifest entry at uninstall time, no schema change
- Persisted reference-counted manifest sections, each with an `installedBy` list
- Status quo generalized: install once, never remove any shared resource

## Decision Outcome

Chosen: split `.installs.yaml` into `bundles`/`servers`/`hooks` sections, each
shared resource tracking its own `installedBy: [bundleName, ...]` list, physically
removed only when that list empties. See arc42 §6's "Shared resource lifecycle"
and "Freshness detection" sections for the resulting install/uninstall behavior
and §5.03 for `manifest.js`'s building-block role — both kept current there, not
reproduced here. Explicit, inspectable ownership beat rescanning on every
uninstall, and it's the only option that also fixed the hook-script leak.

## Consequences

- Every command that touches the manifest (`install`, `uninstall`, `status`,
  `snapshot`) changed shape, a larger diff than the scan-based alternative — accepted
  given no external consumer of `.installs.yaml`.
- Each shared resource gets its own freshness snapshot, decoupled from any one
  bundle's snapshot.
- `aif install --update` still reinstalls at bundle granularity rather than patching
  a shared resource once — accepted as inefficiency, not correctness.
