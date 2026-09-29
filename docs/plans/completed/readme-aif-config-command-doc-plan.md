# Document `aif config` in README's CLI Section — Plan

> Status: Done
> Created: 2026-09-27
> Approved by: Jeremy Smellie

Plan ID (this repo has no numeric Tier-3 ID scheme yet): `readme-aif-config-command-doc-plan`. Reference this filename in commits per `steering/engineering/core.md`: "Every Artifact Must Reference Its Plan ID".

This plan follows `skill/ai-engineering-plan`'s schema as the closest available Tier 3 template in this repo, adapted for a plain documentation gap (README.md is not itself an AI component).

---

## Goal

Add the `aif config <key> [--abs]` subcommand — real, implemented (`lib/commands/config.js`), tested (`tests/unit/config-command.test.js`), and listed in `bin/aif.js --help` — to README.md's "CLI" section, which currently omits it entirely.

## Components Affected

| Component   | Action | Notes                                                                |
| ----------- | ------ | -------------------------------------------------------------------- |
| `README.md` | Modify | Add `aif config` to the CLI command block and its usage example list |

## Approach

1. Add `aif config <key>` and `aif config <key> --abs` to README's CLI fenced code block, as their own small group (a config-resolution utility doesn't fit "Validation and testing," "Source freshness," or "Knowledge/decision indexing" — the existing groups are all about a specific artifact kind, not a generic field lookup). This grouping choice is genuinely arbitrary among "own group" vs. "tack onto an existing group"; documented here rather than raised as an open question.
2. Base the wording strictly on `lib/commands/config.js`'s doc comment and `bin/aif.js`'s existing `--help` text (already shown for this exact command) — never invent behavior.
3. Do not touch `AGENTS.md` — its `secrets` field section already documents the underlying resolution mechanism this command wraps, and `AGENTS.md` itself is separately under active regeneration by the process-model migration (`process-model/phase-12-regeneration-top-level-docs`); adding one CLI line to `README.md` does not require touching it.

## Open Questions

None.

## Risks

None. Read-only documentation change — no code, schema, or behavior is touched.

## Validation

- Manual: re-run `node bin/aif.js --help` and diff its `aif config` lines against the new README text for exact-match wording.
- Run `node --test "tests/unit/**/*.test.js"` to confirm the doc-only change introduced no regression (expected: unaffected, since no source file changes).

## Out of Scope

- `AGENTS.md` and any other file the process-model migration tracker (`docs/plans/process-model-implementation-tracker.md`, and the in-flight `process-model/*` branches) is currently changing.
- Any change to `lib/commands/config.js` or its tests — behavior is already correct; only the doc gap is being closed.
