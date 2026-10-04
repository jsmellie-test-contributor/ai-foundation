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

Each tool's risk tier is written once, on the tool, in `lib/constants.js`. Today the same information lives in four places that already disagree: comments on the six AIF-010 groups in `TOOLS`, a 3-level `approval_guidance` table in `skills/agent-authoring/reference/tools.yaml`, a T0–T5 table in the research brief, and prose rules in `skill/ai-component-review` "Step 3 — Review the tool/permission surface" that carry no tier data. After this Feature the reference tables are generated from the one source, and `ai-component-review` and `agent-authoring` check a tool diff mechanically instead of from prose.

> Requirement traceability: N/A. Human request 2026-10-03.

---

## 3. Quick Summary

**Open Items:** 9 open (4 High / 3 Medium / 2 Low) — see Section 8

---

## 4. Scope

### In Scope

- A tier (T0–T5) for every name in `TOOLS`, the 13 built-ins and the six AIF-010 groups, held in `lib/constants.js` next to `TOOLS`, with a test that every `TOOLS` name has one.
- A pure module plus a thin helper script that (a) renders the tier reference tables from that data and (b) mechanically checks an agent's tool surface: tiers of tools added or removed, newly auto-approved tools, and the write+shell+web combination.
- `skill/ai-component-review` "Step 3 — Review the tool/permission surface" and `skill/agent-authoring` consume the helper's output instead of restating tier or combination rules.
- Retire the hand-maintained `approval_guidance` table and the tier table in `docs/research/tool-tiers-and-harness-parity.md` as maintained copies.
- Doc-Update step for every arc42 section whose `key_files` or claims change.

### Out of Scope

- Changing which agents hold which tools or groups (AIF-010 Task 004 owns agent yaml grants).
- Any new platform tool group, or moving a tool between groups.
- The broader docs-in-git / feature-branch process question.
- An `aif tools` subcommand. The helper is a plain script; promoting it to a CLI command is a later, separate decision.
- Enforcing tiers at install time (blocking or warning on a grant). This Feature produces the data and a review-time check only.
- Revising the research brief's findings. It stays a dated record; only its role as a maintained tier table ends.

---

## 5. Feature Description

### User-Facing Behaviour

The users are the framework maintainer and the review and authoring agents.

- A maintainer changing a tool's tier edits one line in `lib/constants.js`. Every generated table follows with no other edit.
- Adding a name to `TOOLS` without a tier fails the unit tests with the tool's name.
- When `ai-component-review` sees a diff touching `tools`, `approved_tools` or `blocked_commands` in an agent yaml, it runs the helper on the changed agent files and reads a short report: each added or removed tool with its tier, tools newly in `approved_tools` with their tier, the highest tier added, and whether the write+shell+web check fires. Step 3's rule that such a diff is always HIGH-or-above does not change; the helper replaces the prose rules that identify what to flag, not the severity.
- `agent-authoring` "Step 3 — Select tools" and its self-validation checklist point at the same report for a draft agent, so authors see the tiers before review does.

### Data Flow

`lib/constants.js` (`TOOLS` names + tier per name) → pure module (`lib/tool-tiers.js`: tier lookup, table rendering, tool-surface diff, combination check) → thin script (`scripts/tool-tiers.js`: reads agent yaml and, for a diff, the base version; prints a report or a rendered table) → consumed by the two skills and by the install step that places the rendered tables.

### Business Rules

- One scale for every tool: integer 0–5, rendered `T0`–`T5`. A tier describes the capability and is harness-neutral (ADR 0002); a group that a harness resolves to unsupported keeps its tier.
- Tier is data only. Group names stay capability-named and never tier-named (ADR 0007).
- The tier map is the only place a tier is written. No generated or hand-written copy is maintained anywhere else.
- The write+shell+web combination is a separate named check over tool names, not a tier. It is reported alongside tiers and never derived from them.
- Generated reference output is not committed (§8 Q3).
- This reverses a line in `lib/constants.js` written under AIF-010 ("code never reads it"): code now reads tiers, still only for reference output and review checks, never to change what an adapter resolves or installs.

### Error States

| Scenario                                                                                   | Expected Behaviour                                                                          |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| A `TOOLS` value has no tier, or a tier key is not a `TOOLS` value                          | Unit test fails naming the tool                                                             |
| A tier outside 0–5                                                                         | Unit test fails                                                                             |
| Agent yaml names a tool absent from the tier map (for example an `@server/tool` reference) | Reported as `unrated`, never guessed; non-zero exit only if the caller asks for strict mode |
| Base version of an agent yaml cannot be read (new file)                                    | Treated as an empty tool surface; every tool is reported as added                           |
| Helper run where `lib/constants.js` is unreachable (a skill running in another project)    | Skill falls back to reading the installed generated table and says so                       |

---

## 6. Architecture Overview

### New Components

| Component                | Type                            | Responsibility                                                                                                     |
| ------------------------ | ------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `TOOL_TIERS`             | Constant (`lib/constants.js`)   | Tier per `TOOLS` value. Parallel map keyed by the `TOOLS` string value (§8 Q2).                                    |
| `lib/tool-tiers.js`      | Pure module                     | Tier lookup, table rendering, tool-surface diff, combination check. No I/O, so unit-testable without a filesystem. |
| `scripts/tool-tiers.js`  | Thin script                     | Reads agent yaml (and a base version for diffs), calls the pure module, prints a report or writes rendered tables. |
| Generated tier reference | Install-time output, not in git | Rendered tier tables placed in the installed `agent-authoring` and `ai-component-review` skills (§8 Q3).           |

### Component Relationships

`lib/constants.js` → `lib/tool-tiers.js` → `scripts/tool-tiers.js` → `skill/ai-component-review` and `skill/agent-authoring` (call it) and `lib/commands/install.js` (places the rendered tables). The adapters (`lib/harnesses/*`) do not read tiers.

### Integration Points

- `lib/constants.js` `TOOLS`: read via `Object.values(TOOLS)` by `isKnownToolName` (`lib/harnesses/base.js`), `tests/unit/adapter-contract.test.js` (`NAMES`) and `tests/validation/tools.test.js` (`BUILTIN_TOOLS`). Keeping the values as plain strings leaves all three untouched, which is why the tier map is parallel (Q2).
- `skills/agent-authoring/reference/tools.yaml`: its `builtin:` descriptions and the prose rules (the `subagent` note and the trifecta rule) are hand-written content, not tier data, and stay. Only `approval_guidance` is retired. `bundles/engineering/snapshot.json` hashes this file, so the change touches the snapshot.
- `lib/commands/install.js` and the freshness check (`isFreshnessCurrent` over `sourceHashes`): rendered tier output depends on `lib/constants.js`, which is not a skill source, so a tier change would not mark a bundle stale (§8 Q7).
- `docs/architecture/05_03_core_libraries.md` (lists `lib/constants.js`), `05_05_command_layer.md` (lists `lib/commands/install.js`) and `05_02_harness_adapters.md`: see Doc-Update below.
- AIF-010 Tasks 004 and 005 are `Ready` in `orchestration-state.json` and edit `agents/*.yaml` and `05_02_harness_adapters.md`. Sequencing is §8 Q8.

---

## 7. Security Considerations

- The tier map becomes the input to the tool-surface check, so a wrong or silently missing tier weakens review. Mitigation: the every-name-has-a-tier test, an `unrated` outcome for unknown names, and no default tier.
- The existing control is unchanged: a diff touching `tools`, `approved_tools` or `blocked_commands` stays HIGH-or-above in `ai-component-review` Step 3, and a `blocked_commands` removal is still judged by the reviewer. The helper reports; it does not approve.
- The helper reads the base version of an agent yaml through git. It must run `ai-git` for any git call and never print token values (`steering/engineering/git-workflow-core.md`).
- The helper only reads files it is pointed at and writes only to the output path it is given. It does no network access.

---

## 8. Risks & Open Questions

| #   | Risk / Question                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Type     | Impact | Source                   | Raised By  | Resolved |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------ | ------------------------ | ---------- | -------- |
| 1   | **One scale or two axes.** Use T0–T5 for all tools, with the write+shell+web combination as a separate check. Recommendation: **one scale plus the separate combination check** (agrees with the human's lean). The AIF-010 groups already use T0–T5, so a second axis means re-rating them. The combination check needs per-name legs (web, write, shell), not a tier, so it cannot be derived from tiers anyway and a separate check is honest about that.                                                                                                                                                                                                                                                                                                                                                                                                                                        | Question | H      | Human request            | Human / EM | No       |
| 2   | **Metadata shape.** Parallel `TOOL_TIERS` map vs richer `TOOLS` entries. Recommendation: **parallel `TOOL_TIERS` map keyed by the `TOOLS` string value, plus a test that its key set equals `Object.values(TOOLS)`**. Verified by reading the code: `isKnownToolName`, `adapter-contract.test.js` and `tools.test.js` all call `Object.values(TOOLS)` and expect strings; objects would break all three and every adapter `TOOL_MAP` key lookup. The cost is two places to touch when adding a tool, which the test turns into a failing test, not silent drift. Tiers stored as integers 0–5.                                                                                                                                                                                                                                                                                                      | Question | H      | Human request, code read | Human / EM | No       |
| 3   | **Generated reference output.** Commit it, or generate at install or CI. Recommendation: **generate at install time and in a CI test, do not commit it**. Committed generated files conflict across parallel branches (this repo already hits that with `docs/architecture/index.json` and `bundles/*/snapshot.json`). Install-time generation is chosen over CI-only because installed skills need the table where they run and nothing else places it. The CI test only renders and checks that every `TOOLS` name appears.                                                                                                                                                                                                                                                                                                                                                                       | Question | H      | Human request            | Human / EM | No       |
| 4   | **Where the 13 built-ins sit on T0–T5.** The scale was written for platform tools (reach, persistence, reversibility) and has no obvious rung for local mutation, egress or execution. Recommendation, to be confirmed by the human: T0 for `read`, `grep`, `glob`, `code`, `task`, `skill`, `plan`, `ask_user` (today's `safe` set); T1 for `write`, `web_search`, `web_fetch`, `subagent` (affect this session or workspace, reversible through VCS); `shell` at T3 because arbitrary execution has at least the blast radius of controlling another session. Known awkwardness: the scale is not monotone in risk (T2 `repo_list` is read-only and sits above T1 `write`), and `web_search` and `write` land on the same tier, so the combination check, not the tier, separates them. Alternative if the human dislikes this: add rungs by redefining tiers, which re-rates the AIF-010 groups. | Question | H      | Code read                | EM         | No       |
| 5   | **Two combination rules exist today and disagree.** `ai-component-review` flags `write` + `shell` + web together; `agent-authoring` flags web plus any of `write`, `shell`, `subagent` unless isolation is documented in Hard rules. Recommendation: **keep both as two named severities of one check** — "trifecta" (write, shell and web: a finding) and "web with a privileged leg" (needs documented isolation) — and keep `subagent` in the privileged legs to preserve current behaviour. The legs are a small constant of tool names inside `lib/tool-tiers.js`, documented as not derived from tiers.                                                                                                                                                                                                                                                                                       | Question | M      | Code read                | EM         | No       |
| 6   | **What replaces `approval_guidance` for `approved_tools` selection.** Recommendation: default `approved_tools` to T0 tools only; anything at T1 or above needs a stated reason in the agent's Hard rules, and the helper lists such entries. This keeps today's intent (safe tools auto-approved) without a second scale.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Question | M      | Code read                | EM         | No       |
| 7   | **Bundle freshness blind spot.** Rendered output depends on `lib/constants.js`, which is not a skill source, so changing a tier would not make `aif install --update` treat the bundle as stale and installed tables would go out of date silently. Recommendation: decide in the install Task, preferring to fold the rendered output's hash into the freshness inputs over adding `lib/constants.js` as a source.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Risk     | M      | Code read                | EM         | No       |
| 8   | **Overlap with AIF-010.** Its Tasks 004 and 005 are `Ready` and edit `agents/*.yaml`, `skill/pr-stewardship` and `05_02_harness_adapters.md`. Recommendation: this Feature does not touch agent grants, so its Tasks can start after AIF-010 Task 004 merges; the `05_02` doc and `index.json` edits are the only conflict surface and resolve with the rule in Q3's rationale.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Risk     | L      | Code read                | EM         | No       |
| 9   | **Skills used outside this repo.** `ai-component-review` and `agent-authoring` may run in a project repo that has neither `scripts/tool-tiers.js` nor `lib/constants.js`. Recommendation: the skills call the script when present and otherwise read the installed generated table, and say which they used.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Risk     | L      | Edge case                | EM         | No       |

> **Minor decisions made during planning.** None are resolved yet; every row above awaits the human. Each carries a recommendation so a single reply can close them. None is an architectural fork (reversible, internal, per the request), so none escalates to an ADR.

---

## 9. Task Decomposition

Not decomposed. Per `skill/feature-planning`, decomposition happens after this plan is `Approved`.

Task outline (for review only; not a commitment, and no `tasks.json` exists):

1. **Tier data and test.** `TOOL_TIERS` in `lib/constants.js` for all 19 `TOOLS` names, replace the per-group tier comments with a pointer, add the every-name-has-a-tier unit test.
2. **Pure module and helper script.** `lib/tool-tiers.js` (lookup, render, surface diff, combination check) with unit tests, and `scripts/tool-tiers.js` with an integration test for the base-version read.
3. **Generation and retirement.** Install-time placement of the rendered tables, the freshness decision from Q7, a CI render test, and removal of `approval_guidance` from `tools.yaml` and of the maintained tier table from the research brief (pointer left behind).
4. **Skill consumption.** Edits to `skill/ai-component-review` Step 3 and `skill/agent-authoring` Step 3 and checklist to call the helper and cite its output instead of restating rules, with the Q5 and Q6 outcomes.
5. **Doc-Update.** See below. Runs last.

Likely order is linear 1 → 2 → 3 → 4 → 5, since each builds on the previous output; 3 and 4 could run in parallel once 2 lands.

### Doc-Update step

- `docs/architecture/05_03_core_libraries.md`: add `lib/tool-tiers.js` to `key_files`; `lib/constants.js` is already listed and its description gains `TOOL_TIERS`. The list is already past 5 entries, so weigh the split question again and record the outcome.
- `docs/architecture/05_05_command_layer.md`: update the `install` description if install places the rendered tables; `lib/commands/install.js` is already a `key_files` entry.
- `docs/architecture/05_02_harness_adapters.md`: touched only if its text describes tiers or the `TOOLS` shape; adapters themselves do not change.
- Per the arc42 authoring rules: add `scripts/tool-tiers.js` only if a change to its logic would make a section's claims wrong; then bump `last_verified` for each touched section, regenerate `index.json`, and run `aif index architecture --check` once, as the literal last local step before pushing.

---

## 10. Acceptance Criteria

- [ ] All Tasks complete and signed off
- [ ] Feature works end-to-end as described in Section 5
- [ ] No HIGH or CRITICAL findings open in any Task review
- [ ] Every `TOOLS` name has exactly one tier in `lib/constants.js`, enforced by a test, and no other maintained copy of tier data remains
- [ ] Rendered tier tables are produced from that data and are not committed
- [ ] `skill/ai-component-review` Step 3 and `skill/agent-authoring` obtain tool tiers and the combination check from the helper, not from restated prose
- [ ] Running the helper on a real agent diff reports added tools with tiers and the combination check
- [ ] Arc42 `key_files` and descriptions match the code, and `aif index architecture --check` passes
