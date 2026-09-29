---
section: '00'
title: 'Section title'
lifecycle: draft # draft | published — completion, not currency
last_verified: 0000000 # commit SHA the key_files claim was last checked against
tags: []
key_files:
  - path/to/file.js
---

> One-sentence summary of what this section covers.

Body content goes here, following arc42's section structure for this number.

## Notes on this template

Frontmatter shape and the `key_files` scope/split rules are defined in
`steering/engineering/architecture-authoring.md` — this file is just a
copy-paste starting point, not a second copy of the rules. Delete this file's
own frontmatter/notes when copying it for a new section — they're template
scaffolding, not content.

Body structure follows the official arc42 template
(`arc42/arc42-template` on GitHub, `EN/adoc/*.adoc`), not a freehand
convention. For a §5 whitebox section specifically (`05_building_blocks.md` and any
`05.NN` sub-section), that means: Overview Diagram, Motivation, Contained
Building Blocks, and (optional) Important Interfaces, in that order. A
repo-specific "Consumers" section may follow those four, clearly separated,
since arc42 has no built-in caller/consumer documentation of its own.
