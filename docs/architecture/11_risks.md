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
