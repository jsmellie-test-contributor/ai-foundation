# Feature Plan: Single tool-risk source of truth

## 1. Metadata

| Field               | Value                                                                                        |
| ------------------- | -------------------------------------------------------------------------------------------- |
| Feature ID          | AIF-011                                                                                      |
| Project             | ai-foundation                                                                                |
| Status              | Draft                                                                                        |
| Author (Agent)      | Claude Code session (standalone; no dispatched agent)                                        |
| Reviewed By         | Pending                                                                                      |
| Created             | 2026-10-03                                                                                   |
| Last Updated        | 2026-10-03                                                                                   |
| Standards           | `javascript`, `node` (per `.aiconfig.json`)                                                  |
| Total Tasks         | Not yet decomposed                                                                           |
| Product Requirement | None. Source: `docs/research/tool-tiers-and-harness-parity.md`                               |
| ADRs                | 0007 (accepted, not amended), 0002 (accepted, not amended). No new ADR; decisions are in §8. |

---

## 2. Goal

Each tool's risk tier is written once, in one hand-edited file that ships inside the installed bundle. Today the same information lives in four places that already disagree: comments on the six AIF-010 groups in `TOOLS`, a 3-level `approval_guidance` table in `skills/agent-authoring/reference/tools.yaml`, a T0–T5 table in the research brief, and prose rules in `skill/ai-component-review` "Step 3 — Review the tool/permission surface" that carry no tier data. After this Feature a helper script reads that one file, renders the reference table on demand, and checks a tool diff mechanically, and `ai-component-review` and `agent-authoring` call it instead of restating rules.

**Distribution constraint (drives the design):** the framework is intended to become an installable artifact, so a project that installs a bundle will not have this repo's `lib/` or `scripts/`. Anything an installed skill needs at run time must be plain content inside the bundle, and nothing may depend on code reading `lib/constants.js` during or after install.

> Requirement traceability: N/A. Human request 2026-10-03, revised 2026-10-03 after the human raised the distribution constraint.

---

## 3. Quick Summary

**Open Items:** 9 open (3 High / 3 Medium / 3 Low) — see Section 8

**Recommendation in one line:** a new shared skill `skill/tool-tiers` owns a hand-edited tool catalog (tier, capability legs, description per tool) and a zero-dependency checker script, both installed with the bundle; a test ties the catalog to `TOOLS`. Nothing is generated and nothing generated is committed. This moves the source of truth out of `lib/constants.js`, which departs from the original lean; §6 "Options considered" and Q2 give the reasons.

---

## 4. Scope

### In Scope

- A new shared skill `skill/tool-tiers` (pattern: `skill/review-severity`) holding the catalog and a checker script, installed with the bundle.
- A tier (T0–T5), capability legs and description for every name in `TOOLS` (the 13 built-ins and six AIF-010 groups), with a test that the catalog's names equal `Object.values(TOOLS)`.
- The helper script: `table` renders the reference table on demand; `check` reports the tool-surface diff for an agent change (tiers added and removed, newly auto-approved tools, write+shell+web combination).
- `skill/ai-component-review` "Step 3 — Review the tool/permission surface" and `skill/agent-authoring` consume the script and cite `skill/tool-tiers` instead of restating rules.
- Retire the hand-maintained copies: `approval_guidance` and `skills/agent-authoring/reference/tools.yaml` as a tier source, the tier comments on the AIF-010 groups in `lib/constants.js`, and the research brief's tier table as a maintained copy.
- Add `skill/tool-tiers` to the `skills` list of the agents that run the two consuming skills, so bundle resolution installs it.
- Doc-Update check for arc42 (§9).

### Out of Scope

- Changing which agents hold which tools or groups (AIF-010 Task 004 owns grants). Adding `skill/tool-tiers` to an agent's `skills` list is a skill reference, not a tool grant.
- Any new platform tool group, or moving a tool between groups.
- The broader docs-in-git / feature-branch process question.
- A build or pack pipeline for the future artifact. This design needs none, and none is created.
- An `aif tools` CLI subcommand, and tier enforcement at install time.
- Making the catalog a first-class component type that adapters derive their `TOOL_MAP`s from. This is the likely long-term direction (see Option E) and is ADR-grade, so it is a separate Feature.
- Revising the research brief's findings. It stays a dated record; only its role as a maintained tier table ends.

---

## 5. Feature Description

### User-Facing Behaviour

The users are the framework maintainer and the review and authoring agents.

- A maintainer changes a tool's tier by editing one entry in the catalog file. Nothing else needs regenerating.
- Adding a name to `TOOLS` without a catalog entry, or a catalog entry with no `TOOLS` name, fails a validation test naming the tool.
- When `ai-component-review` sees an agent diff touching `tools`, `approved_tools` or `blocked_commands`, it runs `check` with the before and after lists and reads a short report: each added or removed tool with its tier, tools newly in `approved_tools` with their tier, the highest tier added, and any combination finding. Step 3's rule that such a diff is always HIGH-or-above does not change; the script replaces the prose rules that identify what to flag, not the severity.
- `agent-authoring` "Step 3 — Select tools" and its self-validation checklist point at `table` and `check` for a draft agent.
- The script runs anywhere Node runs, from the installed skill folder, with no `npm install` and no repo checkout.

### Data Flow

Hand-edited catalog (`skills/tool-tiers/reference/tool-catalog.json`) → `skills/tool-tiers/scripts/tool-tiers.js` (pure functions plus a thin CLI wrapper) → report or table on stdout → read by the reviewing or authoring agent. The agent extracts the `tools` and `approved_tools` lists from the diff and passes them as arguments; the script echoes the lists it received so the reviewer can see them.

### Business Rules

- One scale for every tool: integer 0–5, rendered `T0`–`T5`. A tier describes the capability and is harness-neutral (ADR 0002); a group a harness resolves to unsupported keeps its tier.
- Tier is data only. Group names stay capability-named and never tier-named (ADR 0007).
- The catalog is the only place a tier is written. No other copy is maintained anywhere; the table is rendered on demand and never stored.
- Each catalog entry may carry capability legs (`web`, `write`, `exec`, `delegate`). The combination check is computed from legs by the script, not from tiers.
- A name not in the catalog (for example an `@server/tool` reference) is reported `unrated`, never guessed.
- The script reads only the catalog and its arguments, writes only to stdout, and never touches git or the network.
- This reverses a line written under AIF-010 in `lib/constants.js` ("T0-T5 ... noted per group for grant decisions only"): the comment is replaced with a pointer to the catalog. Code under `lib/` still never reads tiers.

### Error States

| Scenario                                                               | Expected Behaviour                                                                                                     |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| A `TOOLS` value has no catalog entry, or an entry has no `TOOLS` value | Validation test fails naming the tool                                                                                  |
| Tier outside 0–5, or an unknown leg                                    | Validation test fails                                                                                                  |
| Tool name not in catalog                                               | Reported `unrated`; non-zero exit only with `--strict`                                                                 |
| New agent file (no base list)                                          | Base list empty; every tool reported as added                                                                          |
| Catalog file missing or malformed JSON                                 | Script exits non-zero with the path and parse error; the skill says it could not check and does not fall back to prose |

---

## 6. Architecture Overview

### New Components

| Component                                       | Type                       | Responsibility                                                                                                                                    |
| ----------------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `skills/tool-tiers/SKILL.md`                    | Skill                      | Owns the tier definitions (T0–T5), the combination rules and the `subagent` note moved out of `tools.yaml`; says when and how to call the script. |
| `skills/tool-tiers/reference/tool-catalog.json` | Hand-edited reference data | One entry per `TOOLS` name: tier, legs, description. JSON so the script needs no parser dependency.                                               |
| `skills/tool-tiers/scripts/tool-tiers.js`       | Script                     | Zero-dependency Node. Pure functions (lookup, render, diff, combination check) exported for tests; CLI wrapper prints `table` or `check`.         |
| Catalog-to-`TOOLS` test                         | Validation test            | In `tests/validation/tools.test.js`: catalog names equal `Object.values(TOOLS)`; tiers and legs are valid.                                        |

### Component Relationships

`skill/ai-component-review` and `skill/agent-authoring` cite `skill/tool-tiers` and call its script. The bundle includes `skill/tool-tiers` because the agents that run those two skills list it in `skills`. `lib/constants.js` and the adapters are untouched except for the comment change; the test is the only link between `TOOLS` and the catalog.

### Options considered

Each option was judged against the distribution constraint (works from an installed bundle with no `lib/` access), the number of places a tier is written, whether anything generated is committed, how drift is caught, and cost. The brief's evidence that `ai-git` is not on `PATH` in Claude Code cloud sessions (`docs/research/tool-tiers-and-harness-parity.md` §1) applies to any option that needs a CLI at review time.

| Option                                                                                        | Installed artifact, no `lib/`                               | Tier written in | Generated files in git | Drift caught by         | Verdict                                                                                                                                                                                                    |
| --------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | --------------- | ---------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A. `lib/constants.js` is the source; install renders tables from it (this plan's first draft) | Fails: install needs `lib/`; plugin-style copy can't run it | 1               | No                     | Test                    | Rejected                                                                                                                                                                                                   |
| B. Shared skill with hand-edited catalog and shipped script                                   | Works: plain content plus Node                              | 1 (catalog)     | No                     | Catalog-to-`TOOLS` test | **Chosen**                                                                                                                                                                                                 |
| C. `lib/constants.js` is the source; a pack-time build writes tables into the artifact        | Works only once a build pipeline exists; none does          | 1               | No                     | Test                    | Rejected now. Source-tree skills hold no data until built; invents packaging ahead of its own design. Revisit if a pipeline arrives (the catalog's stable JSON shape is what such a generator would emit). |
| D. `lib/constants.js` is the source; generated tables are committed into the skills           | Works                                                       | 1 plus copies   | Yes                    | CI regenerate-and-diff  | Rejected. Reintroduces the committed-generated-file merge conflicts the request set out to avoid.                                                                                                          |
| H. `aif tools` subcommand over `constants.js`; skills tell the agent to run it                | Depends on `aif` on `PATH` at review time                   | 1               | No                     | Test                    | Rejected as primary: unreliable in cloud sessions, and ties every skill to the CLI.                                                                                                                        |
| E. Catalog as a first-class component type; adapter `TOOL_MAP`s derive from it                | Works                                                       | 1               | No                     | Build/validate          | Right long-term direction, ADR-grade and far larger. B's catalog is its natural first step.                                                                                                                |

Why B over the original lean (tier in `lib/constants.js`): the only options that keep it there (C, D, H) either need a build pipeline that does not exist, commit generated copies, or need a CLI on `PATH`. B gives up "tier physically next to `TOOLS`" and replaces it with a test that fails when the two lists diverge, which is the property that matters.

### Integration Points

- `lib/constants.js` `TOOLS`: unchanged shape. `isKnownToolName`, `tests/unit/adapter-contract.test.js` and `tests/validation/tools.test.js` keep reading `Object.values(TOOLS)` as strings.
- `skills/agent-authoring/reference/tools.yaml`: its `builtin:` descriptions, the `subagent` note and the trifecta text move into the catalog and `skills/tool-tiers/SKILL.md`; the file and `approval_guidance` are removed. `skills/agent-authoring/SKILL.md` and `reference/schema.md` references to `tools.yaml` are updated. `docs/process-model.md` mentions are historical and left alone.
- `agents/principal-engineer.yaml` and `agents/software-engineer.yaml`: `skills` gains `skill/tool-tiers` (these are the only agents listing `ai-component-review` or `agent-authoring`). AIF-010 Task 004 also edits agent yamls (§8 Q9).
- `bundles/engineering/snapshot.json`: new and removed skill files change it; it is regenerated through the existing `snapshot-freshness` CI check. Because the catalog is an ordinary skill source, a tier change marks the bundle stale with no special handling.
- `tests/validation/refs.test.js` (`aif validate refs`): citations to `skill/tool-tiers` and its removed predecessor file must resolve.

---

## 7. Security Considerations

- The catalog becomes the input to the tool-surface check, so a wrong or missing tier weakens review. Mitigation: the catalog-to-`TOOLS` test, an `unrated` outcome for unknown names, and no default tier.
- The existing control is unchanged: a diff touching `tools`, `approved_tools` or `blocked_commands` stays HIGH-or-above in `ai-component-review` Step 3, and judging a `blocked_commands` removal stays with the reviewer. The script reports; it does not approve.
- The script receives lists as arguments, so a transcription error by the caller could hide a tool. Mitigation: the report echoes the lists it received, and the review skill requires the reviewer to compare them to the diff.
- The script reads one local file, writes only to stdout, and does no network or git access. The catalog is installed read-only content like any skill file.

---

## 8. Risks & Open Questions

| #   | Risk / Question                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Type     | Impact | Source                                 | Raised By  | Resolved |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------ | -------------------------------------- | ---------- | -------- |
| 1   | **One scale or two axes.** Recommendation: **one scale T0–T5 plus a separate combination check** (agrees with the human's lean). The AIF-010 groups already use T0–T5, so a second axis means re-rating them. The check needs per-tool capability legs (`web`, `write`, `exec`, `delegate`), which are catalog fields and not a tier.                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Question | H      | Human request                          | Human / EM | No       |
| 2   | **Where the single source lives, and its shape.** Original lean: parallel `TOOL_TIERS` map in `lib/constants.js`. Recommendation: **change it** to a hand-edited catalog in a shared skill (`skill/tool-tiers`), tied to `TOOLS` by a test, because the framework will ship as an installable artifact with no `lib/` access (§6 Options considered). Costs: a tool is added in two places, and a test turns forgetting the second into a failure; tier is no longer next to the name. If the human still wants `constants.js` as the source, the viable path is Option C, which needs a pack-time build step that does not exist today. A richer-`TOOLS`-entries shape is rejected either way: `Object.values(TOOLS)` is read as strings by `isKnownToolName`, the adapter contract test and `tools.test.js`. | Question | H      | Human request, distribution constraint | Human / EM | No       |
| 3   | **Generated output.** Recommendation: **generate nothing and commit nothing**; `table` renders from the catalog on demand. This replaces the earlier install-time-generation proposal, which cannot work if install has no `lib/` access, and avoids committed generated files and `index.json`-style merge conflicts.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Question | M      | Human request                          | Human / EM | No       |
| 4   | **Where the 13 built-ins sit on T0–T5.** The scale was written for platform tools and has no obvious rung for local mutation, egress or execution. Recommendation, for the human to confirm: T0 for `read`, `grep`, `glob`, `code`, `task`, `skill`, `plan`, `ask_user` (today's `safe` set); T1 for `write`, `web_search`, `web_fetch`, `subagent`; `shell` at T3 because arbitrary execution has at least the blast radius of controlling another session. Known awkwardness: the scale is not monotone in risk (T2 `repo_list` is read-only yet above T1 `write`), and `write` and `web_search` share a tier, so the combination check, not the tier, separates them.                                                                                                                                       | Question | H      | Code read                              | EM         | No       |
| 5   | **Two combination rules exist today and disagree.** `ai-component-review` flags `write` + `shell` + web together; `agent-authoring` flags web plus any of `write`, `shell`, `subagent` unless isolation is documented. Recommendation: **keep both as two named severities of one check**: "trifecta" (all three legs, a finding) and "web with a privileged leg" (needs documented isolation). `subagent` keeps its current privileged status through its own `delegate` leg, counted as privileged for the second severity but not for the trifecta, so behaviour is preserved.                                                                                                                                                                                                                              | Question | M      | Code read                              | EM         | No       |
| 6   | **What replaces `approval_guidance` for `approved_tools`.** Recommendation: default `approved_tools` to T0 tools only; anything T1 or above needs a stated reason in the agent's Hard rules, and `check` lists such entries.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Question | M      | Code read                              | EM         | No       |
| 7   | **Catalog format: JSON or YAML.** Recommendation: **JSON**. The script must run from an installed skill folder with no `npm install`, and Node parses JSON natively; other reference data in this repo is YAML, which would need a bundled parser.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Question | L      | Design                                 | EM         | No       |
| 8   | **Script input.** Recommendation: **lists passed as arguments** (`--base`, `--head`, `--approved-base`, `--approved-head`), echoed in the report, not parsing agent yaml. A yaml parse would need a dependency the installed skill cannot assume. The risk is transcription error, mitigated in §7. A later optional `--agent <file>` mode can use `yaml` when resolvable.                                                                                                                                                                                                                                                                                                                                                                                                                                     | Question | L      | Design                                 | EM         | No       |
| 9   | **Overlap with AIF-010.** Its Tasks 004 and 005 are `Ready` in `orchestration-state.json` and edit `agents/*.yaml` and `docs/architecture/05_02_harness_adapters.md`. This Feature also edits two agent yamls (`skills` list only). Recommendation: start this Feature's agent-yaml edit after AIF-010 Task 004 merges; the other work is independent. Conflicts in `bundles/engineering/snapshot.json` are resolved by regenerating it.                                                                                                                                                                                                                                                                                                                                                                       | Risk     | L      | Code read                              | EM         | No       |

> **Minor decisions made during planning.** None are resolved yet; every row awaits the human, with a recommendation so a single reply can close them. None is an architectural fork: the choice is reversible and internal (moving the catalog data later is a file move), so none escalates to an ADR. Rows dropped from the first draft: install freshness blind spot (gone, the catalog is an ordinary skill source) and skills used outside this repo (gone, the script is self-contained).

---

## 9. Task Decomposition

Not decomposed. Per `skill/feature-planning`, decomposition happens after this plan is `Approved`.

Task outline (for review only; not a commitment, and no `tasks.json` exists):

1. **Catalog, skill and test.** Create `skill/tool-tiers` (`SKILL.md` and `tool-catalog.json`, 19 entries) and the catalog-to-`TOOLS` validation test; replace the tier comments in `lib/constants.js` with a pointer.
2. **Checker script.** `scripts/tool-tiers.js` with pure functions (lookup, render, surface diff, combination check) and unit tests, plus a CLI test.
3. **Consumption and retirement.** Edit `ai-component-review` Step 3 and `agent-authoring` to call the script and cite `skill/tool-tiers`; add the skill to the two agents' `skills`; remove `tools.yaml`/`approval_guidance`; reduce the research brief's tier table to a pointer; regenerate the bundle snapshot.
4. **Doc-Update check.** See below. Runs last.

Order is linear 1 → 2 → 3 → 4; Tasks 2 and the skill-text edits in 3 could overlap once 1 lands.

### Doc-Update step

No `key_files` entry for any arc42 section is expected to change: the new files are skill content, and arc42 sections list only `lib/` files. `lib/constants.js` is a `key_files` entry of `05_02_harness_adapters.md` and `05_03_core_libraries.md`, and this Feature changes only a comment in it, so their claims about `TOOLS` stay accurate. The Task must still: (1) re-read the `TOOLS`-related rows in `05_02` and `05_03` and confirm they make no tier claim; (2) if any claim is affected, update it, bump that section's `last_verified` to the real final commit, regenerate `index.json`, and run `aif index architecture --check` exactly once as the last local step before pushing; (3) record "no change needed" in the Task's review notes when (1) finds nothing.

---

## 10. Acceptance Criteria

- [ ] All Tasks complete and signed off
- [ ] Feature works end-to-end as described in Section 5
- [ ] No HIGH or CRITICAL findings open in any Task review
- [ ] Every `TOOLS` name has exactly one catalog entry with a tier, enforced by a test, and no other maintained copy of tier data remains
- [ ] The installed `skill/tool-tiers` runs from the installed skill folder on a machine with Node and no repo checkout
- [ ] `table` output is not committed anywhere
- [ ] `skill/ai-component-review` Step 3 and `skill/agent-authoring` obtain tiers and combination findings from the script, not from restated prose
- [ ] Running `check` on a real agent diff reports added tools with tiers and the combination findings
- [ ] Bundle resolution includes `skill/tool-tiers` for the engineering bundle, and `aif validate` and the snapshot check pass
- [ ] Doc-Update check done and its outcome recorded
