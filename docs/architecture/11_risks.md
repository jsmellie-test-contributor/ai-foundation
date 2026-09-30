---
section: '11'
title: 'Risks and Technical Debt'
lifecycle: published
last_verified: 863273a
tags: [risks]
key_files:
  - lib/harnesses/kiro.js
---

> Known gaps and reliability risks this project accepts rather than solves, and why.

## Kiro `fileMatch` steering is unreliable

Kiro's `inclusion: "fileMatch"` mode is documented as conditionally loading a
steering file only when the agent reads a file matching a glob pattern, but as of
the last check the actual matching-pattern frontmatter field is undocumented by
Kiro, and community reports ([kirodotdev/Kiro#6171](https://github.com/kirodotdev/Kiro/issues/6171),
closed as duplicate) say `fileMatch` files are never injected into context
regardless of matching files — for both global and workspace-level steering.

**Impact on the Kiro adapter** (`lib/harnesses/kiro.js`): a populated
`file_patterns` still emits `inclusion: "fileMatch"` with the pattern — optimistic,
not a silent downgrade to always-load or a skipped install. If Kiro fixes the
feature, conditional steering starts working automatically with no adapter change.
If not, the file simply never loads, which is acceptable because conditional
steering is an optimization, not a correctness requirement — anything with rules an
agent must always see uses `file_patterns: []` (always load) regardless of harness.

## Kiro: project-scope install and default agent are not built or verifiable

Kiro currently installs only to the user's home directory (`~/.kiro/`), and nothing in the adapter sets a default or primary agent. AIF-005 (docs/plans/features/AIF-005/plan.md) adds an optional project-scope install and a primary-agent setting for Claude Code first. The Kiro side is deferred: we cannot run Kiro in this environment, and it is unverified whether Kiro has a project-level install location beyond `.kiro/settings/` conventions or any native "default agent" mechanism.

**Impact on the Kiro adapter** (`lib/harnesses/kiro.js`): once the shared adapter contract gains a scope input, `kiro.js` keeps home-directory-only behavior until someone can verify its project paths and default-agent support against a real Kiro install. Kiro users cannot yet have a project-committed agent set or a cloud-style primary agent. This joins the `fileMatch` gap above and the tool-map entries with no confirmed Kiro equivalent (see §5.02) as known, accepted Kiro gaps rather than something the Claude path can prove out.
