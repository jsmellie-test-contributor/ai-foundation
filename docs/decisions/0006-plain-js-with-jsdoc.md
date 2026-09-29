---
status: accepted
date: 2026-09-25
decision-makers: [Jeremy]
tags: [language, typechecking, jsdoc]
links:
  supersedes: []
affects:
  - tsconfig.json
  - lib/**
  - bin/**
  - servers/**
---

# Plain JavaScript with JSDoc, Not TypeScript

## Context and Problem Statement

This repo runs `tsc --noEmit` in CI and has JSDoc typedefs throughout `lib/`, plus a
runtime schema library (`zod`, a direct dependency used in `servers/dag`/
`servers/gmail`) — real typechecking infrastructure, yet no `.ts` source file
exists anywhere. That split was never written down as a decision.

## Decision Drivers

- Zero build step — every source file must run directly under Node with no
  transpile/bundle stage
- Type safety for editor/CI feedback, without a compiled-output mismatch risk
- Runtime input validation (MCP tool arguments, CLI args) needs real schema
  checking, not just static types erased at compile time

## Considered Options

- Plain JavaScript, JSDoc types, `tsc --noEmit --allowJs --checkJs`
- TypeScript source, compiled to JS before running/publishing
- Plain JavaScript, no typechecking at all

## Decision Outcome

Chosen: plain `.js` everywhere, typed via JSDoc, checked by `tsc --noEmit` in
`allowJs`/`checkJs` mode (`tsconfig.json`) with no emit step — `bin/aif.js` runs the
exact file that was typechecked, not a compiled artifact that could drift from it.
`zod` covers what JSDoc can't: validating untrusted input (MCP tool args, parsed
YAML/JSON) at runtime, where TypeScript's erased types give no protection anyway.

## Consequences

- No build/bundle step in the install or CI pipeline — every command in
  `package.json`'s `scripts` runs source directly.
- JSDoc type annotations carry real weight (checked, not decorative) but are more
  verbose than TypeScript's inline syntax for complex generic types.
- Runtime validation (`zod`) and static checking (JSDoc + `tsc`) are two separate
  mechanisms covering two different failure classes — not redundant, each catches
  what the other can't.
