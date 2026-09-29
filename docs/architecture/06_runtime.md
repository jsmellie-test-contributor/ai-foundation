---
section: '06'
title: 'Runtime View'
lifecycle: published
last_verified: 11b4da8
tags: [runtime, manifest, snapshot]
key_files:
  - lib/manifest.js
  - lib/commands/install.js
  - lib/commands/uninstall.js
  - lib/commands/snapshot.js
---

> How installing and uninstalling a bundle actually behaves at runtime, where that
> behavior isn't obvious from §5's static block list — specifically, shared-resource
> lifecycle (MCP servers, the Claude Code hook script) and freshness detection.

## Shared resource lifecycle (servers and hooks)

`.installs.yaml` has three top-level sections: `bundles`, `servers`, `hooks`.
`bundles` entries hold only bundle-owned files (agents, steering, skills,
standards); `servers` and `hooks` are independently-lived resources, each tracking
its own `installedBy: [bundleName, ...]` list rather than being owned by any single
bundle's file list.

```mermaid
sequenceDiagram
  participant Install as aif install
  participant Manifest as .installs.yaml
  participant Uninstall as aif uninstall

  Install->>Manifest: bundle resolves to server/hook X
  Install->>Manifest: create X's entry if absent; add bundleName to X.installedBy
  Note over Install: files for X are (re)written every install — idempotent

  Uninstall->>Manifest: remove bundleName from X.installedBy
  alt installedBy now empty
    Uninstall->>Manifest: delete X's files, deregister MCP config, drop the entry
  else installedBy still non-empty
    Uninstall->>Manifest: leave X installed — another bundle still needs it
  end
```

This is what makes uninstalling one bundle safe when a second bundle shares a server
(via an agent's `@server/tool` reference) or the Claude Code `block-command` hook
(via an agent's `blocked_commands`) — the shared resource is only physically removed
once nothing references it, instead of being deleted out from under the bundle that
still needs it.

**Detection**: server usage is resolved per bundle the same way it always was
(`resolveBundle()` / `resolveServersFromAgents()`, §5.01). Hook usage is detected
where agent YAML is already parsed, in `base.js`'s `installAgents()` loop, via an
optional harness-supplied `detectSharedResource(agent)` predicate — `claude.js`
returns `'block-command'` when an agent's `blocked_commands` is non-empty; `kiro.js`
has no detector, since it embeds `blocked_commands` directly into each agent's own
JSON and needs no shared external asset.

## Freshness detection

Each bundle, server, and hook resource has its own snapshot of source-file hashes,
computed independently — a bundle's snapshot covers only bundle-owned sources, never
a shared server/hook's files, so a source change to one shared server doesn't appear
to invalidate every bundle that happens to reference it.

`isCurrent(bundleName, harness, repoRoot)` (used by `aif status` and to decide
whether `aif install` is a no-op) checks two things: the bundle's own snapshot
freshness, and — for every server/hook the bundle depends on — whether that
resource's manifest-recorded hashes still match a freshly computed snapshot of its
own files. Either being stale marks the bundle not-current. `aif status` reports a
shared resource's staleness once, rather than duplicating the signal once per
referencing bundle.

`aif install --update`'s reinstall granularity stays at the bundle level: if a
shared resource's source changes, every bundle depending on it is independently
marked stale and reinstalled — safe and idempotent (reinstalling just re-upserts the
same shared content), but not optimized to patch the resource once. Accepted as
inefficiency, not a correctness gap.
