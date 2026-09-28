---
name: 'architecture-authoring'
version: '0.2.0'
description: 'Defines the arc42 section frontmatter schema and the key_files scope/split rules, so any engineering-domain agent can author or maintain architecture docs consistently, in any project.'
file_patterns: []
---

## Scope

All agents with `domain = "engineering"`, in any project. Loaded at session start, after `steering/global/core.md`.

Architect starts a new arc42 section under `{paths.architecture}` when a decision's mechanism content warrants one; Software-Engineer maintains an existing section at implementation time. See `steering/engineering/document-types.md`'s "The four kinds" table for the full ownership split.

---

## Rules

### Rule: Frontmatter Schema

Every arc42 section file under `{paths.architecture}` (default `knowledge/architecture`, flat directory — no subfolders, since arc42 already numbers its own sub-levels) opens with this frontmatter. Structured values only — prose belongs in the body, never duplicated into a field.

```yaml
---
section: '05.01' # zero-padded ("01", "05"), or "05.01" for a §5 white-box sub-section
title: 'Bundle resolution'
lifecycle: published # draft | published — completion, not currency
last_verified: 8f3c2a1 # commit SHA the key_files claim was last checked against, never a date
tags: [install, bundles]
key_files:
  - lib/resolver.js
  - lib/commands/install.js
---
```

- `lifecycle` is the only currency-adjacent value an author ever sets by hand. Never write `current`/`stale` here — that's a separate, computed value tooling derives from `last_verified` vs. each `key_files` entry's real state, not a claim a frontmatter field makes.
- The doc's one-line summary is a body convention (a blockquote after the H1) — never lifted into frontmatter.

**Rationale:** Structured frontmatter is what lets tooling (or an agent) build an index or a staleness check without parsing prose. Letting the same value live in both frontmatter and prose is exactly the drift this schema exists to prevent.

**Exceptions:** None — every arc42 section file uses this shape.

### Rule: key_files Scope

List a file in `key_files` only if a change to _that file's logic_ would make the doc's claims wrong. Excludes:

- Callers/consumers of the described behavior
- Test files — they validate behavior, they don't define it, and including them false-positives on every refactor
- Incidentally-touched config/types

**Rationale:** `key_files` is the thing a staleness check actually tests — has any listed file changed since `last_verified`? A list padded with callers or tests turns every unrelated refactor into a false staleness flag; a list that's too narrow lets real drift go undetected.

**Exceptions:** None. A file that doesn't pass the scope test doesn't belong in the list, however related it feels.

### Rule: key_files Split Trigger — No Hard Cap

There is no maximum length for `key_files`. Past 5 entries, treat every new addition as a prompt to re-evaluate whether the section should split into a finer `NN.MM` subsection (`05.01`, `05.02`, …) — not a fixed ceiling that forces a split at a specific count, a judgment call made fresh each time the list grows.

**Rationale:** A short, tight list is what keeps a rename or deletion of a `key_files` entry a meaningful signal instead of routine noise — but some building blocks legitimately need more files to stay accurate, and splitting purely to satisfy a number produces sections with no coherent boundary.

**Exceptions:** None — the re-evaluation is what's required, not a specific outcome. Deciding not to split after weighing it is a valid result of following this rule.

### Rule: `--check` Is a Final Validation, Not a Mid-Sequence One

When a unit of work touches one or more `key_files` and bumps the affected doc's `last_verified` to match, run `aif index architecture --check` (and regenerate `index.json`) exactly once — as the literal last local step before pushing, after every edit to every `key_files` entry in that unit of work is finished. A pass earlier in the sequence does not carry forward: any further edit to the same `key_files` entry afterward, even in a separate follow-up commit, invalidates the SHA that was just set, since `last_verified` must name a commit that already contains everything it claims to have verified — and no commit can name itself, or a later commit, before that commit exists.

Do not work around this by having tooling auto-rewrite a stale `last_verified` to the current `HEAD`. That would set the field without a human or agent actually re-checking the doc's claims against the file's current state, which defeats the reason the field exists — it is a verification record, not a bookkeeping stamp. The bump is only ever correct when someone has actually looked at both and confirmed they still match.

**Rationale:** A SHA-based `last_verified` is deliberately chosen over a self-reported date because it is objectively checkable against real git history — but that same property means it can never point at a commit that doesn't exist yet. Bumping mid-sequence and then touching the same key_file again in a later commit silently invalidates the bump before it ever reaches `HEAD`, and this has caused avoidable CI failures more than once. The fix belongs in when `--check` is run, not in what it does — automating the rewrite would remove the verification the field is for, not just the timing mistake.

**Exceptions:** None. If a unit of work needs another edit to a key_file after `--check` already passed, treat that as a new touch — re-run `--check` again as the new final step; don't assume the earlier pass still holds.

---

## Enforcement

- **Malformed frontmatter:** Caught during Principal-Engineer review. A section missing a required field, or using a freeform `lifecycle`/`last_verified` value, is a MEDIUM finding.
- **Out-of-scope key_files entries:** Caught during Principal-Engineer review. A `key_files` entry that's a caller, test, or incidental config file is a LOW finding — remove it.
- **Unconsidered growth:** Caught during Principal-Engineer review. A `key_files` list that grows past 5 entries with no evidence the split question was weighed (see "key_files Split Trigger — No Hard Cap") is a LOW finding — not "must split," but "must show the trade-off was considered."
- **Premature `last_verified` bump:** Caught mechanically by CI's `aif index architecture --check` step if missed locally — not a Principal-Engineer review finding, since it's a verifiable git-history fact rather than a judgment call. The fix is always a follow-up commit re-bumping to the real final SHA; never worth reverting other work over.

---

## Notes

This file is the portable version of the schema — the one every engineering-domain agent carries into any project, since `_template.md`-style scaffolding files are never part of a bundle install (`lib/resolver.js` only resolves `agents/`, `skills/`, `steering/`, and `servers/`). `docs/process-model.md`: "Writing docs agents can consume" is this repo's own design record for _why_ the schema looks this way — how `aif index` consumes it, why `lifecycle` isn't named `status`, why a code graph was rejected — and stays repo-local; this file is what actually travels.
