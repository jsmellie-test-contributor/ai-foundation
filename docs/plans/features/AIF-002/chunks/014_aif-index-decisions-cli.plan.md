# Chunk Plan: `aif index -k`/`-d` CLI Split + `lib/decisions.js` (Decision Index Generation/Validation)

## 1. Metadata

| Field          | Value                                                                                                                                                                                                                                                                                                  |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Plan ID        | AIF-002-014                                                                                                                                                                                                                                                                                            |
| Parent Epic    | AIF-002                                                                                                                                                                                                                                                                                                |
| Chunk          | 14 of 15                                                                                                                                                                                                                                                                                               |
| Depends On     | AIF-002-002 (needs the finalized `decision-record` Tier A metadata-table field set to parse against)                                                                                                                                                                                                   |
| Can Parallel   | AIF-002-010, AIF-002-011, AIF-002-012, AIF-002-013 (Wave 2 — no file overlap; this chunk touches `lib/`/`tests/unit/`/`tests/integration/`, migration chunks touch `docs/decisions/`)                                                                                                                  |
| Project        | ai-foundation                                                                                                                                                                                                                                                                                          |
| Status         | Approved                                                                                                                                                                                                                                                                                               |
| Author (Agent) | Tech-Lead (drafted directly, not self-planned by Software-Engineer — see Work Log)                                                                                                                                                                                                                     |
| Reviewed By    | Jeremy Smellie                                                                                                                                                                                                                                                                                         |
| Created        | 2026-08-17                                                                                                                                                                                                                                                                                             |
| Last Updated   | 2026-08-18                                                                                                                                                                                                                                                                                             |
| Standards      | `javascript`/`node` (this repo's engineering standards) — **not** the AGENTS.md declarative-component schemas the rest of AIF-002 uses. Per AIF-004 ("AI-Engineer/Software-Engineer Boundary", Approved), this chunk is Software-Engineer's domain, reviewed by Principal-Engineer, not AI-Engineer's. |

---

## 2. Goal

Generalize the existing `aif index` CLI command (`lib/commands/index.js`) into two explicit modes — `-k`/`--knowledge` (existing `knowledge/index.json` behavior, unchanged, remains the default) and `-d`/`--decision` (new) — where `-d` resolves the decisions directory from `.aiconfig.json`'s `paths.decisions` (falling back to `docs/decisions/` if unset, exactly as `-k` already resolves `paths.knowledge`), crawls `**/*.decision.md` under it, parses each record's Metadata table, and generates/refreshes `index.json` in that same directory, computing `referenced_by`/`superseded_by` by inversion across the whole corpus. `-d --check` diffs the committed index against a fresh crawl for drift detection. Pure parsing/inversion/diff logic lives in a new `lib/decisions.js`, mirroring the existing `lib/snapshot/{pure,io}.js` split.

> Requirement traceability: AIF-002 Epic Plan §3 ("Extend the existing `aif
index` CLI command...") and §5 (Architecture Overview, `lib/commands/index.js`
> and `lib/decisions.js` rows). Resolves Open Question 5.

---

## 3. Quick Summary

**Open Items:** 5 open (0 High / 3 Medium / 2 Low) — see Section 14

---

## 4. Acceptance Criteria

- [ ] `aif index` with no `-k`/`-d` flag is a usage error — prints a usage message to `stderr` and exits non-zero; it does **not** silently behave as `-k` (human-directed breaking change, 2026-08-18 — see Section 15 Work Log)
- [ ] `aif index -k`/`--knowledge` explicitly selects the same, unchanged knowledge-index behavior
- [ ] `aif index -d`/`--decision` resolves the decisions directory via `resolveDecisionsPath(repoRoot)` (reading `.aiconfig.json`'s `paths.decisions`; if unset, falling back to `{resolved paths.knowledge directory}/decisions` — derived from `resolveKnowledgePath`'s own resolved value, not a fresh hardcoded literal) and generates `index.json` in that resolved directory from its `.decision.md` files, with correct `referenced_by` computed by inversion
- [ ] `resolveDecisionsPath` correctly reads a configured non-default `paths.decisions` value (Test DEC-IT01) and correctly falls back to `{resolved paths.knowledge}/decisions` when `paths.decisions` is unset (Test DEC-IT07), including the nested case where `paths.knowledge` is also unset (its own default applies first) — verified for all cases, not assumed from the default alone
- [ ] `aif index -d --check` correctly detects drift (non-zero exit + diff summary) and correctly confirms freshness (zero exit)
- [ ] Malformed records cause a loud, non-zero-exit failure naming the offending file — never a silent skip or partial write
- [ ] `lib/decisions.js`'s exported pure functions (`parseDecisionRecord`, `buildDecisionIndex`, `diffDecisionIndex`) perform no direct file I/O
- [ ] All tests in Section 12 pass (`tests/unit/decisions.test.js`, `tests/integration/decisions-index.test.js`)
- [ ] `npm test` (full repo suite) passes with no regressions
- [ ] Security checklist (Section 10) fully satisfied
- [ ] Logging checklist (Section 11) fully satisfied
- [ ] Documentation checklist (Section 13) fully satisfied
- [ ] Review approved by Principal-Engineer with no CRITICAL or HIGH findings (this chunk follows the standard Software-Engineer → Principal-Engineer review pipeline per AIF-004, not AI-Engineer self-review)
- [ ] This Chunk Plan itself is committed with `Status: Draft` via `ai-git` before being presented for human approval, per `skill/plan-lifecycle`

---

## 5. Scope

### In Scope

- `lib/commands/index.js` — generalize the existing single-mode command:
  - Add `-k`/`--knowledge` and `-d`/`--decision` flag parsing. **(Revised 2026-08-18, human-directed breaking change)** No flag is no longer an implicit alias for `-k` — bare `aif index` with neither flag prints a usage error to `stderr` and exits non-zero. Existing callers of bare `aif index` are affected by this change; the human has confirmed this is intentional.
  - `-d`/`--decision` branch: calls into the new `lib/decisions.js` to crawl, parse, and generate `{paths.decisions}/index.json`, where `{paths.decisions}` is resolved from `.aiconfig.json` exactly as `-k` already resolves `paths.knowledge` (see the new `resolveDecisionsPath` function below — mirrors the existing `resolveKnowledgePath`'s configured-value resolution, but **(revised 2026-08-18)** not its fallback-default: `resolveDecisionsPath`'s own fallback is derived from `resolveKnowledgePath`'s resolved directory, not a fresh hardcoded default).
  - `-d --check` (composable with `-d`): calls the diff function instead of writing; exits non-zero and prints a human-readable diff summary if the committed index doesn't match a fresh crawl.
  - Existing `-k`/default branch (knowledge index) is untouched in behavior — only the flag-dispatch wrapper around it changes.

**(Design gap found and closed, 2026-08-17 revision):** The original draft of this chunk described `-d` as crawling a hardcoded `docs/decisions/**` and writing a hardcoded `docs/decisions/index.json`, with no mention of reading `.aiconfig.json`'s `paths.decisions` key at runtime — unlike `-k`, which already resolves `paths.knowledge` dynamically via `resolveKnowledgePath(repoRoot)` (see `lib/commands/index.js` today). Chunk AIF-002-008 exists specifically to introduce a dedicated `paths.decisions` config key; a CLI that ignores it and always looks in `docs/decisions/` regardless of what a project's `.aiconfig.json` says would defeat the entire point of that config key for any project whose decisions don't live at the literal path `docs/decisions/`. This revision adds `resolveDecisionsPath` and updates every other spec in this chunk that previously assumed a hardcoded `docs/decisions/` path.

**(Fallback path revised, 2026-08-18 human direction):** `resolveDecisionsPath`'s configured-value resolution still mirrors `resolveKnowledgePath` exactly (reads `paths.decisions` if present, joins it onto `projectRoot`). Its _fallback_, however, no longer mirrors `resolveKnowledgePath`'s own hardcoded-default pattern with a fresh `docs/decisions` literal. Instead, when `paths.decisions` is unset, `resolveDecisionsPath` falls back to `{resolveKnowledgePath(projectRoot)}/decisions` — i.e. it resolves `paths.knowledge` the same way `resolveKnowledgePath` already does (configured value, or `<projectRoot>/knowledge` if `paths.knowledge` itself is also unset — see `lib/commands/index.js`'s existing `resolveKnowledgePath` default), then appends `decisions` to that resolved directory. This makes `resolveDecisionsPath`'s fallback _depend on_ `resolveKnowledgePath`, not merely resemble its shape — a real behavioral coupling, not cosmetic mirroring. Note this means `resolveDecisionsPath`'s fallback is **not** necessarily `<projectRoot>/docs/decisions` for every project: it is `<projectRoot>/docs/decisions` only when `paths.knowledge` resolves to `<projectRoot>/docs` (true for this repo's own `.aiconfig.json` today), but would be e.g. `<projectRoot>/knowledge/decisions` for a project that leaves `paths.knowledge` unset entirely.

- **New file** `lib/decisions.js` — pure logic (no direct file I/O in the exported functions consumed by tests) plus a thin io-facing layer, mirroring `lib/snapshot/{pure,io}.js`'s split:
  - Parse a `.decision.md` file's Metadata table into a structured object (`Decision ID`, `Tier`, `Domain`, `Status`, `Author (Agent)`, `Approved By`, `Created`, `Referenced By`, `References`, `Tags`).
  - Given the full set of parsed records, compute each record's `referenced_by` (inverse of every other record's `References`) and `superseded_by` (inverse of every other record's `Supersedes`, where present — see Section 14, Risk 3, for the `Supersedes` field gap).
  - Split `Tags` on commas into a trimmed array; treat `"—"`/empty as no tags.
  - Build the full `index.json` structure (`{ generated_at, entries: [...] }`, matching the shape convention already used by `buildKnowledgeIndex` in `lib/commands/index.js` for `knowledge/index.json`).
  - Diff a freshly-built index against a previously-read one (structural equality on `entries`, ignoring `generated_at`) for `--check` mode.
- **New function** `resolveDecisionsPath(repoRoot)` in `lib/commands/index.js`: reads `.aiconfig.json`'s `paths.decisions` key if present (`join(projectRoot, config.paths.decisions)`, mirroring `resolveKnowledgePath`'s configured-value resolution exactly); if unset, falls back to `join(resolveKnowledgePath(projectRoot), 'decisions')` — i.e. `resolveKnowledgePath`'s own resolved directory (configured `paths.knowledge`, or its own `<projectRoot>/knowledge` default if that too is unset) with `decisions` appended, **not** a fresh hardcoded `docs/decisions` literal (revised 2026-08-18, human direction — see Section 15 Work Log).
- I/O wiring in `lib/commands/index.js` (or a small io-layer inside `lib/decisions.js`, per the `lib/snapshot/{pure,io}.js` precedent): resolve the decisions directory via `resolveDecisionsPath(repoRoot)`, recursively collect `**/*.decision.md` under it (excluding `index.json` itself and any non-`.decision.md` file), read each, parse via `lib/decisions.js`, write `index.json` into that same resolved directory.
- New tests: `tests/unit/decisions.test.js` (pure parsing/inversion/diff logic — synthetic in-memory fixtures, no real disk I/O) and `tests/integration/decisions-index.test.js` (end-to-end `aif index -d` run against a temp directory of fixture `.decision.md` files, mirroring `tests/integration/knowledge-index.test.js`'s structure).
- `npm test` passes with these additions.

### Out of Scope

- Any change to the existing `-k`/knowledge-index code path's _behavior_ — only the flag-dispatch wrapper changes; `buildKnowledgeIndex`, `parseKnowledgeEntry`, `collectMdFiles`, etc. in the current `lib/commands/index.js` are untouched.
- Backfilling the real `docs/decisions/index.json` for this repo's own 11 migrated records — that is chunk 015, which depends on this chunk's tool existing plus all migration chunks (009–013) landing first.
- Any change to `skills/decision-record/` or `skills/decision-brief/` (chunks 002, 003) beyond depending on chunk 002's already-finalized Metadata table field order/names as the parsing contract.
- Defining or adding a `Supersedes`/`Superseded By` field to the decision-record/decision-brief templates — neither chunk 002 nor 003 currently include this field explicitly in their Metadata table (only `Referenced By`/`References`); see Section 14, Risk 3, for how this chunk handles that gap without silently inventing new template scope.
- Wiring `aif index -d` into `skill/plan-lifecycle` as a documented required step — that is chunk 004's concern (`skills/plan-lifecycle` documentation), not this chunk's code.
- Any CI-pipeline wiring — this repo has no CI system (per AIF-002 Epic §3, Out of Scope); `-d --check` is designed to be runnable locally/via `npm test`-adjacent invocation, not integrated into a CI config that doesn't exist.
- Any `docs/`, `skills/`, or `agents/` content change — this chunk is `lib/`/`tests/` only, per the AIF-004 boundary this chunk exists to respect.

---

## 6. Prerequisites

- [x] AIF-002 Epic Plan `Status: Approved (rev 6)` (verified — `docs/plans/epics/AIF-002.epic.md` §1)
- [x] AIF-004 ("AI-Engineer/Software-Engineer Boundary") `Status: Approved` (verified — establishes this chunk belongs to Software-Engineer/`javascript`-`node` standards, not AI-Engineer)
- [ ] AIF-002-002 (`decision-record` Tier A Metadata table finalized) — **Approved**, not just Draft, before this chunk's implementation begins, since this chunk parses against that exact field set/order. This chunk's own planning proceeds against AIF-002-002's current Draft content (Section 8/7 of that plan), since both are being drafted in the same session, but implementation should not start until 002 is Approved (chunks.json dependency).
- [x] `lib/commands/index.js` (existing `-k`/knowledge-index implementation) read in full, as the direct structural precedent
- [x] `lib/snapshot/{pure.js,io.js}` read in full, as the pure/io split precedent this chunk mirrors
- [x] `tests/unit/knowledge.test.js` and `tests/integration/knowledge-index.test.js` read in full, as the direct testing-structure precedent
- [x] `standards/javascript_node.md` and `standards/javascript_base.md` read in full

---

## 7. Architecture & Design

### Project Structure Changes

- `lib/commands/index.js` ← MODIFIED (flag dispatch added; existing knowledge-index logic untouched)
- `lib/decisions.js` ← NEW
- `tests/unit/decisions.test.js` ← NEW
- `tests/integration/decisions-index.test.js` ← NEW

### Key Design Decisions

1. **Decision**: Generalize the existing `index` command with `-k`/`-d` flags rather than adding a second, separate CLI command (e.g. `aif decisions-index`).
   **Rationale**: Direct human direction during AIF-002 Epic rev 6 planning — one command surface for "regenerate a project's index," regardless of which kind, mirroring how `knowledge/index.json` and `docs/decisions/index.json` are structurally the same kind of problem (crawl structured files, derive an index). **(Revised 2026-08-18, human direction, rev 7 of the Epic — breaking change)** No flag no longer defaults to `-k`. The human decided bare `aif index` should require an explicit `-k`/`--knowledge` or `-d`/`--decision` flag, printing a usage error and exiting non-zero otherwise, rather than silently picking `-k` for backward compatibility. This is an intentional break from any existing caller of bare `aif index`; the human confirmed this trade-off directly.

2. **Decision**: Pure parsing/inversion/diff logic lives in `lib/decisions.js`, separate from the CLI orchestration in `lib/commands/index.js`, mirroring `lib/snapshot/{pure,io}.js`.
   **Rationale**: Global engineering steering Rule 6 (Design for Testability) — pure functions (metadata-table parsing, inversion computation, structural diffing) take data in and return data out, enabling `tests/unit/decisions.test.js` to run fully in-memory against synthetic fixtures with no filesystem mocking. The CLI orchestrator (`lib/commands/index.js`) becomes a thin wrapper: collect files, read them, call pure functions, write the result.

3. **Decision**: `referenced_by`/`superseded_by` are always computed by inversion across the _entire_ crawled set on every run — never read from a previous `index.json` and merged.
   **Rationale**: AIF-002 Epic Plan Section 5/4 (rev 5/6) — a hand-maintained inbound list is less reliable than one computed by inversion, since no single record's author has visibility into the full cross-reference graph. Recomputing fully from source on every run (rather than incrementally patching) also matches the Epic's Error States requirement ("regenerate the whole index fresh from the source records on every run") and avoids a class of bugs where a deleted/renamed record leaves a stale inbound reference behind.

4. **Decision**: Malformed or unparseable `.decision.md` files (missing required Metadata fields, malformed table) cause the whole `-d` run to fail loudly (non-zero exit, clear error naming the offending file) rather than being silently skipped.
   **Rationale**: Direct implementation of AIF-002 Epic Plan Section 6's Error States table ("surface any parse failure... to the human rather than guessing or dropping the offending record silently"). A silently-dropped record would produce an incomplete index that looks valid, which is worse than a loud failure.

5. **Decision**: `Tags` parsing splits on commas and trims whitespace; an empty string or literal `"—"` placeholder produces an empty `tags` array, not `["—"]` or `[""]`.
   **Rationale**: `"—"` is this repo's established placeholder-for-empty convention (used throughout every existing Decision Record's Metadata table, e.g. `Referenced By | —`) — treating it as a literal tag value would pollute the index with a meaningless entry present on every record that has no real tags.

### Patterns & Conventions Applied

- `javascript_node.md`'s CLI conventions: thin `bin/`/command-orchestrator, `node:path` for all path construction, `node:fs` synchronous calls acceptable for this CLI's startup-time I/O (matches existing `lib/commands/index.js` and `lib/snapshot/io.js` precedent).
- `javascript_node.md`'s pure/IO split and `node:test`/`node:assert/strict` testing conventions.
- **Flagged deviation from `javascript_node.md`'s literal test-location text** ("Tests are colocated... unless a project standard specifies a separate `test/` tree"): this chunk places tests in `tests/unit/`/`tests/integration/`, not colocated as `lib/decisions.test.js`. This matches the _actual_ dominant pattern already established across this repo's existing `lib/` code (`lib/knowledge.js` → `tests/unit/knowledge.test.js`, `lib/snapshot/` → `tests/unit/snapshot.test.js`, `lib/resolver.js` → `tests/unit/resolver.test.js`, etc.) — only `lib/test-helpers.js` is actually colocated. Following the repo's real precedent rather than the standard's literal default wording, consistent with `javascript_node.md`'s own escape clause ("unless a project standard specifies a separate `test/` tree" — this repo's own established practice functions as that specification, even though no separate document states it explicitly). Flagged here per global standards-loading guidance rather than silently deviating — see Section 14, Risk 4.

---

## 8. Components

### `lib/commands/index.js` — CLI flag dispatch (`-k`/`-d`)

**File**: `lib/commands/index.js`
**Purpose**: CLI orchestrator for `aif index`; dispatches to knowledge-index (existing) or decision-index (new) generation based on flags.

**Public Interface**:

```js
/**
 * Run the index command.
 * @param {{ args: Record<string, string|boolean>, positional: string[] }} parsed
 * @param {string} repoRoot
 * @returns {number} exit code
 */
export function runIndex(parsed, repoRoot)

/**
 * Read .aiconfig.json from a directory and return the decisions path.
 * Configured-value resolution mirrors resolveKnowledgePath exactly: reads
 * paths.decisions if present. If unset (or .aiconfig.json is
 * missing/unparseable), falls back to '{resolveKnowledgePath(projectRoot)}/decisions'
 * — resolveKnowledgePath's own resolved directory (its configured
 * paths.knowledge value, or its own '<projectRoot>/knowledge' default if
 * that too is unset) with 'decisions' appended. This is not a fresh
 * hardcoded default; it depends on resolveKnowledgePath's resolution
 * (revised 2026-08-18, human direction).
 * @param {string} projectRoot
 * @returns {string} Absolute path to the decisions directory
 */
export function resolveDecisionsPath(projectRoot)
```

Signature of `runIndex` unchanged from today. Internally: **(revised 2026-08-18, human direction, breaking change)** if neither `-k`/`--knowledge` nor `-d`/`--decision` is present, print a usage error to `stderr` and return exit code 1 — no implicit default. If `parsed.args.d || parsed.args.decision`, delegate to a new `runDecisionIndex(parsed, repoRoot)`; else if `parsed.args.k || parsed.args.knowledge`, run the existing knowledge-index logic unchanged (renamed internally if needed for clarity, e.g. `runKnowledgeIndex`, but the exported `runIndex` entry point signature does not change). `runDecisionIndex` calls `resolveDecisionsPath(repoRoot)` first, exactly as the existing knowledge-index path calls `resolveKnowledgePath(repoRoot)` today — this is not new design, it is applying the same existing pattern to the new mode.

**Key Behaviour**:

- **(Revised 2026-08-18, human-directed breaking change)** No flag → usage error: prints a usage message to `stderr` (e.g. "Error: aif index requires -k/--knowledge or -d/--decision") and returns exit code 1. Bare `aif index` no longer silently behaves as `-k`.
- `-k`/`--knowledge` → knowledge-index behavior (explicit, unchanged from today's implementation).
- `-d`/`--decision` → decision-index generation; resolves the decisions directory via `resolveDecisionsPath(repoRoot)` (reads `.aiconfig.json`'s `paths.decisions`; if unset, falls back to `{resolved paths.knowledge directory}/decisions` — see `resolveDecisionsPath`'s JSDoc above, revised 2026-08-18), then writes `index.json` into that resolved directory.
- `-d --check` → decision-index validation; does not write; exit code 1 and a diff summary to `stderr` if stale, exit 0 with a confirmation message if current.
- `-k -d` together (or `--check` with `-k`) → not a supported combination; print a usage error to `stderr` and exit 1 rather than silently picking one (avoids ambiguous behavior). Same usage-error mechanism as the no-flag case above.

**Dependencies**:

- `lib/decisions.js` (this chunk, new) — for decision-index parsing/generation/diff
- Existing knowledge-index helpers already in this file, including `resolveKnowledgePath`, which `resolveDecisionsPath`'s fallback now calls directly (not merely mirrors) — unchanged

---

### `lib/decisions.js` — pure parsing, inversion, diff, plus thin io helpers

**File**: `lib/decisions.js`
**Purpose**: All decision-record-metadata-table parsing and index-building logic for the decisions index (`{paths.decisions}/index.json`, resolved by `resolveDecisionsPath` in `lib/commands/index.js`), split into pure functions (unit-testable without disk I/O) and thin io wrappers (mirroring `lib/snapshot/{pure,io}.js`).

**Public Interface**:

```js
/**
 * Parse a .decision.md file's Metadata table into a structured record.
 * @param {string} content - Raw file content
 * @param {string} relPath - Path relative to paths.decisions, used for `path` and error messages
 * @returns {{ record: object } | { error: string }}
 */
export function parseDecisionRecord(content, relPath)

/**
 * Compute referenced_by/superseded_by for every record by inverting
 * References/Supersedes across the whole set, and assemble the final
 * index.json structure.
 * @param {Array<object>} records - Parsed records (from parseDecisionRecord)
 * @returns {{ generated_at: string, entries: object[] }}
 */
export function buildDecisionIndex(records)

/**
 * Diff a freshly built index against a previously-read one.
 * @param {{ entries: object[] }} computed
 * @param {{ entries: object[] }|null} existing
 * @returns {{ stale: boolean, summary: string }}
 */
export function diffDecisionIndex(computed, existing)

/**
 * Recursively collect all .decision.md files under a directory (io wrapper).
 * @param {string} decisionsDir - Absolute path to paths.decisions
 * @returns {string[]} Relative paths
 */
export function collectDecisionFiles(decisionsDir)

/**
 * Read, parse, and build the full index for a directory (io wrapper,
 * composes the pure functions above). Throws with a clear message
 * naming the offending file on any parse failure (Key Design Decision 4).
 * @param {string} decisionsDir - Absolute path to paths.decisions
 * @returns {{ generated_at: string, entries: object[] }}
 */
export function buildDecisionIndexForDir(decisionsDir)
```

**Key Behaviour**:

- `parseDecisionRecord`: extracts the Metadata table's `Decision ID`, `Tier`, `Domain`, `Status`, `Author (Agent)`, `Approved By`, `Created`, `Referenced By`, `References`, `Tags` (per chunk 002's finalized field set — Prerequisites). Missing any of `Decision ID`/`Tier`/`Domain`/`Status` (the fields `index.json`'s schema requires per AIF-META-001's Design section) returns `{ error }`, not a partial record. `Tags`, `References` are optional (absent/`—` → empty).
- `buildDecisionIndex`: for each record, `references` = parsed `References` field (already a list from `parseDecisionRecord`); `referenced_by` = every other record whose `references` includes this record's `id`; `supersedes`/`superseded_by` = empty arrays for this chunk (Section 14, Risk 3 — no `Supersedes` field exists in the current template to invert from; this is a documented, not silent, gap). `title` is read from the record's `# Decision Record: {Short Title}` / `# Decision Brief: {Short Title}` H1 heading. `path` is the `relPath` passed through unchanged.
- `diffDecisionIndex`: structural comparison of `entries` (order-independent, by `id`), ignoring `generated_at`. Returns a human-readable one-line-per-difference summary for `--check` mode's error output.
- **Edge case, empty resolved decisions directory (no records found)**: `buildDecisionIndexForDir` returns `{ generated_at, entries: [] }` — a valid, empty index, not an error. (Relevant before any migration chunk lands, and for any fresh project installing this framework's decision skills with no records authored yet.)
- **Edge case, malformed Metadata table** (Key Design Decision 4): `buildDecisionIndexForDir` throws an `Error` naming the specific file and the missing/malformed field; the CLI layer (`lib/commands/index.js`) catches this, prints to `stderr`, and returns a non-zero exit code — never a partial write.

**Dependencies**:

- `node:fs`, `node:path` — io wrapper functions only; the four exported functions above the io wrappers take/return plain data, no I/O.

---

## 9. Data Models

### Parsed Decision Record (internal, `parseDecisionRecord`'s return shape)

**Purpose**: Intermediate structure between a raw `.decision.md` file and an `index.json` entry.

| Field        | Type     | Required | Notes                                             |
| ------------ | -------- | -------- | ------------------------------------------------- |
| `id`         | string   | Yes      | From `Decision ID`                                |
| `tier`       | string   | Yes      | `"A"` or `"B"`                                    |
| `domain`     | string   | Yes      | lowercase domain-folder name                      |
| `title`      | string   | Yes      | From the H1 heading                               |
| `status`     | string   | Yes      | `Draft`/`Approved`/`Done`/`Deferred`/`Superseded` |
| `path`       | string   | Yes      | Passed through from the caller                    |
| `references` | string[] | No       | Parsed from `References`, empty if `—`/absent     |
| `tags`       | string[] | No       | Parsed from `Tags`, empty if `—`/absent           |

### Decisions index entry — `{paths.decisions}/index.json` (output shape)

**Purpose**: One entry per record, per AIF-META-001's Design section schema — see that record for the authoritative field list. This chunk populates every field except `supersedes`/`superseded_by`, which are emitted as empty arrays pending Section 14 Risk 3's resolution.

| Field           | Type   | Required | Notes                                    |
| --------------- | ------ | -------- | ---------------------------------------- |
| `id`            | string | Yes      |                                          |
| `tier`          | string | Yes      |                                          |
| `domain`        | string | Yes      |                                          |
| `title`         | string | Yes      |                                          |
| `status`        | string | Yes      |                                          |
| `path`          | string | Yes      |                                          |
| `supersedes`    | array  | Yes      | Always `[]` in this chunk — see Risk 3   |
| `superseded_by` | array  | Yes      | Always `[]` in this chunk — see Risk 3   |
| `references`    | array  | Yes      | From the record's own `References` field |
| `referenced_by` | array  | Yes      | Computed by inversion                    |
| `tags`          | array  | Yes      | From the record's own `Tags` field       |

---

## 10. Security Requirements

> This section must never be empty.

- [ ] All external inputs validated before use — every path under the resolved decisions directory (from `resolveDecisionsPath`) is joined via `node:path`'s `join`, never string concatenation; file content is read as UTF-8 text and only parsed as a markdown table (no `eval`, no dynamic `require`/`import` of file content).
- [ ] No secrets or credentials in source code or logs — this chunk reads/writes only decision-record markdown and `index.json`; no credential-shaped content is introduced or handled.
- [ ] Errors exposed to users contain no internal system details beyond the offending file's relative path and the specific missing/malformed field — no stack traces or absolute filesystem paths leaked to `stdout`/`stderr` in the normal error path (per `javascript_node.md`'s error-handling conventions).
- [ ] File paths built with `node:path` (`join`/`resolve`) — never string concatenation (per `javascript_node.md` Security Requirements).
- [ ] No `child_process` usage in this chunk — decision-index generation is pure file read/parse/write, no shell invocation.
- [ ] No `WebSearch`/`WebFetch` or network calls anywhere in this chunk — local, deterministic, file-system-only, consistent with AIF-002 Epic Plan Section 8.
- [ ] Dependencies — this chunk introduces no new npm dependency; uses only `node:fs`/`node:path` already in use elsewhere in `lib/`.

---

## 11. Logging Requirements

> This section must never be empty.

Per `javascript_node.md`: "CLI tools and scripts: `console.log`/`console.error` is acceptable — output _is_ the product." This chunk is CLI code, so console output (not a structured logger) is the correct mechanism, matching the existing `lib/commands/index.js` knowledge-index behavior.

| Event                                                                                                                            | Level                              | What is logged                                                                                                                                                                                                                                                           | What is NOT logged                                                     |
| -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| `aif index -d` completes successfully                                                                                            | `console.log` (info-equivalent)    | Entry count, the actual resolved output path (`✓ Decision index generated: N entries → {resolved-path}/index.json`, matching the existing knowledge-index success message shape — the path printed is whatever `resolveDecisionsPath` resolved, not a hardcoded literal) | File contents                                                          |
| `aif index -d` finds no `.decision.md` files                                                                                     | `console.log` (info-equivalent)    | A message stating none were found and the index was still written (empty), or the directory doesn't exist yet                                                                                                                                                            | —                                                                      |
| `aif index -d` hits a malformed record                                                                                           | `console.error` (error-equivalent) | The offending file's relative path and the specific missing/malformed field name                                                                                                                                                                                         | Full file contents, stack trace                                        |
| `aif index -d --check` finds drift                                                                                               | `console.error` (error-equivalent) | The diff summary from `diffDecisionIndex` (which entries are added/removed/changed)                                                                                                                                                                                      | Full entry contents beyond what's needed to identify the drifted entry |
| `aif index -d --check` finds no drift                                                                                            | `console.log` (info-equivalent)    | A confirmation message, exit 0                                                                                                                                                                                                                                           | —                                                                      |
| **(Added 2026-08-18, human-directed breaking change)** `aif index` invoked with no `-k`/`-d` flag, or with both `-k -d` together | `console.error` (error-equivalent) | A usage message naming the required flag(s), exit code 1                                                                                                                                                                                                                 | Stack traces                                                           |

---

## 12. Testing Plan

### `lib/decisions.js` Tests (`tests/unit/decisions.test.js`)

| Test ID | Description                                                                                                                                                                                | Type | Pass Criteria                                                    |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---- | ---------------------------------------------------------------- |
| DEC-T01 | `parseDecisionRecord` extracts all fields from a well-formed Metadata table (happy path)                                                                                                   | Unit | Returns `{ record }` with all fields correctly parsed            |
| DEC-T02 | `parseDecisionRecord` returns `{ error }` when `Decision ID` is missing                                                                                                                    | Unit | No thrown exception; `error` field describes the missing field   |
| DEC-T03 | `parseDecisionRecord` returns `{ error }` when the Metadata table is malformed (not a valid markdown table)                                                                                | Unit | `{ error }` returned, not a crash                                |
| DEC-T04 | `parseDecisionRecord` treats `References: —` and `References:` (empty) both as an empty `references` array                                                                                 | Unit | `references` is `[]` in both cases                               |
| DEC-T05 | `parseDecisionRecord` treats `Tags: —` and empty `Tags` both as an empty `tags` array; a real value like `Tags: orchestration, dispatch` splits/trims into `["orchestration", "dispatch"]` | Unit | Matches exactly                                                  |
| DEC-T06 | `buildDecisionIndex` computes `referenced_by` correctly by inversion across 3+ synthetic records with a mix of cross-references                                                            | Unit | Every record's `referenced_by` matches the expected inverted set |
| DEC-T07 | `buildDecisionIndex` on an empty record list returns `{ generated_at, entries: [] }`                                                                                                       | Unit | No error; valid empty structure                                  |
| DEC-T08 | `diffDecisionIndex` returns `stale: false` when computed and existing entries match (ignoring `generated_at`)                                                                              | Unit | `stale === false`                                                |
| DEC-T09 | `diffDecisionIndex` returns `stale: true` with a non-empty `summary` when an entry is added/removed/changed                                                                                | Unit | `stale === true`, summary names the affected entry               |
| DEC-T10 | `diffDecisionIndex` against `existing: null` (no prior index) returns `stale: true`                                                                                                        | Unit | `stale === true`                                                 |

### `aif index -d` Integration Tests (`tests/integration/decisions-index.test.js`, mirrors `tests/integration/knowledge-index.test.js`)

| Test ID                                                                       | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Type        | Pass Criteria                                                                                                                                                                                                                                                                                                                                                          |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DEC-IT01                                                                      | `aif index -d` against a temp project directory with `.aiconfig.json`'s `paths.decisions` pointing at a fixture directory of 2-3 `.decision.md` files writes a correct `index.json` at that resolved location                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Integration | File written at the resolved (non-default) path, entries match fixtures, `referenced_by` correctly inverted                                                                                                                                                                                                                                                            |
| DEC-IT02 (rewritten 2026-08-18, human-directed breaking change)               | `aif index` with no `-k`/`-d` flag is a usage error, not a knowledge-index regression check — no flag is no longer an implicit alias for `-k`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Integration | Exit code 1, usage message printed to `stderr` naming the required flag(s); `knowledge/index.json` is **not** written                                                                                                                                                                                                                                                  |
| DEC-IT03                                                                      | `aif index -d --check` against a freshly-generated, unmodified index exits 0                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Integration | Exit code 0                                                                                                                                                                                                                                                                                                                                                            |
| DEC-IT04                                                                      | `aif index -d --check` against a deliberately staled index (one fixture file changed after generation) exits non-zero with a diff summary on `stderr`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Integration | Exit code 1, summary printed                                                                                                                                                                                                                                                                                                                                           |
| DEC-IT05                                                                      | `aif index -d` against a directory with a malformed fixture file exits non-zero, names the offending file, and does not write a partial `index.json`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Integration | Exit code 1, error message names the file, `index.json` either untouched or absent, never partially written                                                                                                                                                                                                                                                            |
| DEC-IT06                                                                      | `aif index -k -d` (both flags) exits non-zero with a usage error                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Integration | Exit code 1, clear usage message                                                                                                                                                                                                                                                                                                                                       |
| DEC-IT07 (added 2026-08-17, revised 2026-08-18 — fallback derivation changed) | `resolveDecisionsPath` with no `paths.decisions` key in `.aiconfig.json` (or no `.aiconfig.json` at all) falls back to `{resolveKnowledgePath(projectRoot)}/decisions`, not a fresh hardcoded `docs/decisions` literal. Two sub-cases: (a) `paths.knowledge` is configured to a non-default value (e.g. `"notes"`) and `paths.decisions` is unset — resolved decisions path must equal `join(projectRoot, 'notes', 'decisions')`, not `join(projectRoot, 'docs/decisions')`; (b) both `paths.knowledge` and `paths.decisions` are unset (or `.aiconfig.json` is entirely absent) — resolved decisions path must equal `join(resolveKnowledgePath's own default, 'decisions')`, i.e. `join(projectRoot, 'knowledge', 'decisions')`, per `resolveKnowledgePath`'s existing `'<projectRoot>/knowledge'` default (see `lib/commands/index.js` today) | Integration | (a) Resolved path equals `join(projectRoot, 'notes', 'decisions')`. (b) Resolved path equals `join(projectRoot, 'knowledge', 'decisions')`. Neither case equals a hardcoded `join(projectRoot, 'docs/decisions')` unless that happens to coincide with `paths.knowledge`'s own resolution, as it does for this repo's own `.aiconfig.json` (`paths.knowledge: "docs"`) |

---

## 13. Documentation Requirements

- [ ] Inline documentation on all public members — JSDoc on every exported function in `lib/decisions.js` and the modified `runIndex`/new `runDecisionIndex` in `lib/commands/index.js`, per `javascript_base`'s mandatory JSDoc tags.
- [ ] File headers on all new source files — `lib/decisions.js`, `tests/unit/decisions.test.js`, `tests/integration/decisions-index.test.js` each carry the standard file-header block (per `javascript_base`) including this Chunk Plan's ID (AIF-002-014), per engineering-core Rule 2.
- [ ] README updated if user-facing — `README.md`'s CLI reference (if it documents `aif index`) should mention the `-k`/`-d` split; confirmed at implementation time whether `README.md` documents `aif index` today.
- [ ] CHANGELOG entry written — deferred to Epic-level sign-off (AIF-002 Acceptance Criteria), consistent with the treatment of every other chunk in this Epic.

---

## 14. Risks & Open Questions

| #   | Risk / Question                                                                                                                                                                                                                                                                                                                                             | Impact | Mitigation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | This chunk depends on AIF-002-002's Metadata table field set being finalized (Decision ID, Tier, Domain, Status, Author (Agent), Approved By, Created, Referenced By, References, Tags, in that order/naming). If chunk 002 changes during its own review, this chunk's parser needs to change too.                                                         | M      | `chunks.json` already encodes this dependency (`depends_on: ["002"]`); this chunk's implementation should not start until AIF-002-002 reaches `Approved`, not merely Draft, even though both were planned in the same session.                                                                                                                                                                                                                                                                                                                                                          |
| 2   | This chunk was authored directly by Tech-Lead rather than self-planned by Software-Engineer, which is a deviation from this Epic's otherwise-uniform "AI-Engineer self-plans via `skill/complexity-tiers`" pattern (per AIF-PROC-002/AIF-005) — because AIF-004 assigns this work to Software-Engineer's pipeline, not AI-Engineer's self-planning pattern. | M      | Flagged explicitly here and in the Epic's rev 6 Work Log. Human should confirm whether this Chunk Plan should instead be handed to Software-Engineer to re-plan/refine before implementation, or whether this Tech-Lead-authored plan is sufficient to dispatch directly to Software-Engineer for implementation. Not assumed either way.                                                                                                                                                                                                                                               |
| 3   | `supersedes`/`superseded_by` are always empty in this chunk's output, since neither `decision-record`'s nor `decision-brief`'s current Metadata table (chunks 002/003) includes a `Supersedes` field to invert from — only `Status: Superseded` exists as a status value, with no structured pointer to _which_ record superseded it.                       | M      | Documented as a known gap, not silently worked around. `index.json`'s schema (AIF-META-001) does define `supersedes`/`superseded_by`, so this is a real gap between the schema and what the current templates can supply — flagged for the human/Tech-Lead to decide whether chunks 002/003 need a follow-up field addition (a small, low-risk template change) or whether this is accepted as a known limitation for now. Not blocking this chunk's own correctness, since `[]` is a valid, honest answer to "what does this record supersede" when the template can't yet express it. |
| 4   | Test-file location (`tests/unit/`/`tests/integration/`) deviates from `javascript_node.md`'s literal colocation guidance, following the repo's actual dominant pattern instead (Section 7, Patterns & Conventions).                                                                                                                                         | L      | Flagged transparently per global standards-loading guidance rather than silently deviating. If Principal-Engineer review disagrees, this is a straightforward file-relocation with no logic change.                                                                                                                                                                                                                                                                                                                                                                                     |
| 5   | This chunk emits `title` by reading the record's H1 heading, which is not itself a Metadata-table field — a mismatch between the H1 text and the `{Short Title}` implied by the filename is possible if an author edits one without the other.                                                                                                              | L      | Accepted as low-risk: this mirrors how `title` would need to come from _somewhere_ not currently in the Metadata table, and H1-heading extraction is the same general approach used for other markdown-derived metadata in this repo. Not enforced/validated against the filename in this chunk; a future validation pass could add that check if it proves to be a real-world problem.                                                                                                                                                                                                 |

---

## 15. Work Log

[2026-08-17 00:00] [Tech-Lead] [Created] [AIF-002-014] [Drafted directly by Tech-Lead (not self-planned by Software-Engineer) while revisiting AIF-002's chunk plans following Epic rev 6 approval, since AI-Engineer had originally been assigned this chunk before the human flagged that it's real application code, not a declarative AI component. Checked AIF-004 ("AI-Engineer/Software-Engineer Boundary", Approved) — confirmed `lib/`/`tests/unit/`/`tests/integration/` changes belong to Software-Engineer's pipeline (Tech-Lead Epic/Chunk Plan → Software-Engineer implementation → Principal-Engineer review, `javascript`/`node` standards), not AI-Engineer's self-planning pattern. Drafted this Chunk Plan directly to keep the revisit moving, mirroring the existing `lib/commands/index.js` (knowledge-index) and `lib/snapshot/{pure,io}.js` structural precedents. Flagged as Risk 2: whether this Tech-Lead-authored plan should instead be handed to Software-Engineer to review/re-plan before implementation, consistent with how AI-Engineer self-plans its own chunks rather than receiving Tech-Lead-authored ones. Flagged as Risk 3: `supersedes`/`superseded_by` cannot currently be populated from source, since neither chunk 002 nor 003's Metadata table has a `Supersedes` field — documented as a known schema/template gap, not silently worked around. Depends on AIF-002-002 (Approved, not just Draft) before implementation begins. `Status: Draft`, not yet presented for human review.]
[2026-08-17 00:00] [Engineering-Manager] [Revised] [AIF-002-014] [Found and closed a real design gap during a repo-wide sweep for hardcoded `docs/decisions/` paths that should instead honor the `paths.decisions` config key (same class of issue as AIF-002-007's fix, but here it was a runtime-behavior gap, not just wording): the original draft never described `-d` reading `.aiconfig.json`'s `paths.decisions` at runtime, unlike `-k`, which already resolves `paths.knowledge` via the existing `resolveKnowledgePath`. Added a new `resolveDecisionsPath(repoRoot)` function to `lib/commands/index.js`'s Public Interface, mirroring `resolveKnowledgePath` exactly (same fallback-default behavior when the key is unset). Updated Section 2 (Goal), Section 5 (Scope), Section 8 (`lib/commands/index.js`/`lib/decisions.js` Components), Section 10 (Security), Section 11 (Logging), Section 12 (Testing — added DEC-IT07 for the fallback-default path, revised DEC-IT01 to test a configured non-default path), and Section 4 (Acceptance Criteria) to reflect config-driven resolution throughout, rather than a hardcoded literal. No change to the pure-function signatures already specified for `lib/decisions.js` (`decisionsDir` was already documented as a parameter, consistent with the pure/io split) — only the caller-side resolution logic was missing. Still `Status: Draft`, not yet presented for human review.]
[2026-08-18] [AI-Engineer] [Revised] [AIF-002-014] [Migrated this Chunk Plan to the reordered template structure approved for skill/chunk-planning: Quick Summary (new Section 3, open-item count derived from the existing Risks & Open Questions table) and Acceptance Criteria (moved from Section 12 to Section 4) now sit immediately after the Goal; all other sections renumbered accordingly (mapping: 3->5, 4->6, 5->7, 6->8, 7->9, 8->10, 9->11, 10->12, 11->13, 13->14, 14->15). Every inline "Section N" cross-reference in this file, including references into the AIF-002 Epic Plan's own renumbered sections, was remapped to match. No wording, decisions, criteria, or risk content was changed - purely structural, per human direction (no active work on these plans at the time of migration).]
[2026-08-18] [Tech-Lead] [Revised] [AIF-002-014] [Applied two explicit, human-directed breaking-change requirements. Verified before revising that `lib/commands/index.js` has no `-k`/`-d`/`resolveDecisionsPath` code yet (still today's single-mode knowledge-index implementation) and this Chunk Plan is still `Status: Draft`, not implemented — so this is a plan-only revision with nothing built to rework. (1) No implicit default flag: `aif index` with no `-k`/`-d` flag now requires an explicit flag and errors (usage message to `stderr`, exit non-zero) rather than silently behaving as `-k`. Human confirmed this is an intentional breaking change. Updated Acceptance Criteria (Section 4, first bullet rewritten), Scope (Section 5, `lib/commands/index.js` bullet), Key Design Decision 1 (Section 7), the `runIndex` Public Interface/Key Behaviour (Section 8, JSDoc-adjacent prose and Key Behaviour bullets), Logging Requirements (Section 11, added a new row for the usage-error path), and Testing Plan (Section 12, DEC-IT02 rewritten from a knowledge-index regression check into a no-flag-usage-error assertion). (2) Fallback path change: `resolveDecisionsPath(repoRoot)`'s fallback (when `.aiconfig.json`'s `paths.decisions` is unset) no longer mirrors `resolveKnowledgePath`'s own hardcoded `docs/decisions`-shaped default with a fresh literal. It now derives from `resolveKnowledgePath`'s own resolved directory: `{resolveKnowledgePath(projectRoot)}/decisions`. This is a real dependency on `resolveKnowledgePath`'s resolution (including its own further fallback to `<projectRoot>/knowledge` if `paths.knowledge` is also unset), not merely a cosmetic mirror of its pattern — for this repo's own `.aiconfig.json` (`paths.knowledge: "docs"`), the result still happens to be `docs/decisions`, but this is no longer true in general (e.g. a project with `paths.knowledge` unset would resolve to `knowledge/decisions`). Updated Scope (Section 5, `resolveDecisionsPath` bullet and the "Design gap found and closed" callout, which gained a follow-on "Fallback path revised" callout rather than being rewritten in place, to preserve the original 2026-08-17 discovery narrative), the Public Interface JSDoc for `resolveDecisionsPath` (Section 8), the `runIndex` Key Behaviour bullet describing `-d`'s resolution (Section 8), and Testing Plan DEC-IT07 (Section 12, rewritten to assert the two-level fallback with both sub-cases: `paths.knowledge` configured non-default, and both `paths.knowledge`/`paths.decisions` unset). Ripple-checked chunks AIF-002-008 and AIF-002-015 and the AIF-002 Epic Plan for the same class of stale assumption: 008 needed no change (it only adds the static `paths.decisions: "docs/decisions"` config entry itself, with no CLI-default or fallback-mechanics content to contradict). 015 needed no change (it only ever invokes `aif index -d` explicitly — never relies on the no-flag default — and this repo's own `.aiconfig.json` will have `paths.decisions` set explicitly by chunk 008 before 015 runs, so the fallback-derivation change is never exercised for this repo's own backfill). The AIF-002 Epic Plan _did_ need a change for requirement (1) only (its Section 5 Architecture Overview `aif index` bullet, Component Relationships/Integration Points table rows, Open Question 5's resolution text, and Section 6 Acceptance Criteria all previously stated "no flag defaults to `-k`" as an intentional backward-compatibility property) — revised as its own rev 7 entry in that file's own Work Log; the Epic contained no fallback-mechanics detail for requirement (2) to revise, since that specificity lives entirely in this chunk. `Status` remains `Draft` on this file and unchanged (`Approved (rev 6)`, narrowly revised via rev 7 content) on the Epic — neither is "approved" for these new requirements until the human reviews and confirms this revision, per `skill/plan-lifecycle`.]
[2026-08-18] [Engineering-Manager] [Approved] [AIF-002-014] [Human (Jeremy Smellie) explicitly confirmed in chat that chunks AIF-002-007 through AIF-002-015 are approved — this includes the rev-8 breaking-change revision (no implicit default flag; `{paths.knowledge}/decisions` fallback) applied immediately prior by Tech-Lead. Per skill/plan-lifecycle and engineering-core Rule 8, recorded that decision as a committed status change: `Status` updated from `Draft` to `Approved`, `Reviewed By` updated from `Pending` to `Jeremy Smellie`. No plan content changed beyond the status fields. Committed as its own commit, separate from the prior revision history.]
[2026-08-23] [Test-Engineer] [Tested] [AIF-002-014] [Ran `npm test` in the implementation worktree: 510/510 passing, no regressions. Verified `tests/unit/decisions.test.js` covers DEC-T01 through DEC-T10 meaningfully (not placeholder assertions) and `tests/integration/decisions-index.test.js` covers DEC-IT01 through DEC-IT07, including the two-subcase DEC-IT07 fallback derivation. Manually exercised `lib/decisions.js`/`lib/commands/index.js` against this repo's real `docs/decisions/` tree: `aif index --decision` correctly fails loudly naming the offending file for records predating chunk 002's finalized field set (expected — backfill is chunk 015's scope, out of this chunk's scope), and `aif index --knowledge` succeeds. Confirmed `-d --check` behaves correctly for drift detection in the integration suite (DEC-IT03/DEC-IT04). **Finding (functional gap, not caught by existing tests)**: `bin/aif.js`'s `parseArgs()` was never updated to recognize single-dash short flags — it only parses `--knowledge`/`--decision`/`--check` (double-dash); `-k`/`-d` are captured as positional arguments instead of `parsed.args.k`/`.d`, so a real user typing `aif index -d` or `aif index -k` hits the no-flag usage error, not the documented behavior. This is a genuine end-to-end break of an explicit Acceptance Criterion ("`aif index -k`/`--knowledge`", "`aif index -d`/`--decision`" — Section 4) and every Testing-Plan integration test silently avoids it by hand-constructing `{ args: { d: true } }` / `{ args: { k: true } }` objects directly, bypassing the real CLI parser rather than exercising it. Added a new regression test to `tests/integration/decisions-index.test.js` (routes `['index', '-d']` through the real `parseArgs` from `bin/aif.js` into `runIndex`) that fails, demonstrating the gap without modifying production code — per Test-Engineer scope boundary (never modify source to make tests pass; report defects as findings). Committed (`1918f7d`) and pushed to `AIF-002/014-aif-index-decisions-cli`. Recommend Software-Engineer add short-flag parsing to `bin/aif.js`'s `parseArgs()` (pre-existing function, not new in this chunk, but the short-flag forms it's expected to support are new here) before this chunk is considered functionally complete against its own Acceptance Criteria; Principal-Engineer review should treat this as a HIGH finding (documented behavior does not work end-to-end) pending that fix.]
[2026-08-23] [Software-Engineer] [Fixed] [AIF-002-014] [Resolved the HIGH-severity finding from the preceding Test-Engineer entry: `bin/aif.js`'s `parseArgs()` only recognized double-dash flags (`--knowledge`/`--decision`/`--check`); single-dash short flags (`-d`/`-k`) were captured as positional arguments rather than `parsed.args.d`/`.k`, so a real user typing `aif index -d`/`-k` hit the no-flag usage error instead of the documented short-flag behavior — breaking Acceptance Criteria Section 4's `-k`/`-d` bullets end-to-end. Added a new branch to `parseArgs()` (`bin/aif.js`) handling any single-dash token of length > 1 the same way its double-dash equivalent is handled (key = token minus the leading dash, optional value if the following token isn't itself a flag), applied uniformly whether the flag appears before or after the command word — this also incidentally fixes a pre-existing `slice(2)` bug in the old "flag before command" branch for single-dash tokens, which is now unreachable and superseded by the new branch; no other behavior changed. Did not modify Test-Engineer's new regression test in `tests/integration/decisions-index.test.js` (routes `['index', '-d']` through the real `parseArgs`) — it now passes unmodified, confirming the fix satisfies the exact contract it was written against. Ran `npm test` in the worktree: 511/511 passing, no regressions (up from 510 prior to Test-Engineer's added regression test).]
