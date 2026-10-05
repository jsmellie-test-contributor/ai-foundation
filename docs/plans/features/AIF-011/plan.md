# Feature Plan: Single tool-risk source of truth

## 1. Metadata

| Field               | Value                                                                                  |
| ------------------- | -------------------------------------------------------------------------------------- |
| Feature ID          | AIF-011                                                                                |
| Project             | ai-foundation                                                                          |
| Status              | Draft                                                                                  |
| Author (Agent)      | Claude Code session (standalone; no dispatched agent)                                  |
| Reviewed By         | Pending                                                                                |
| Created             | 2026-10-03                                                                             |
| Last Updated        | 2026-10-05                                                                             |
| Standards           | `javascript`, `node` (per `.aiconfig.json`)                                            |
| Total Tasks         | Not yet decomposed                                                                     |
| Product Requirement | None. Source: `docs/research/tool-tiers-and-harness-parity.md`                         |
| Depends On          | AIF-006 (`requires_skills` and the skill-reference convention)                         |
| ADRs                | 0002, 0006, 0007 (all accepted, none amended). No new ADR; decisions are in Section 8. |

---

## 2. Goal

Each tool's risk is written once, in one hand-edited catalog that ships in the installed bundle, and reviewers and authors judge every agent's tool grants on the same scale. Today the same information lives in four places that already disagree: comments on the six AIF-010 groups in `TOOLS`, a 3-level `approval_guidance` table in `skills/agent-authoring/reference/tools.yaml`, a T0–T5 table in the research brief, and prose rules in `skill/ai-component-review` "Step 3 — Review the tool/permission surface" that carry no tier data. The built-in tools have no place on the AIF-010 scale at all.

After this Feature the catalog rates every tool on one **impact** scale and tags it with **capabilities**, `aif tools` renders the reference table and checks an agent's tool surface from that catalog, and `ai-component-review` and `agent-authoring` cite `skill/tool-tiers` instead of restating rules. A per-agent analysis, done first, records what each agent genuinely needs auto-approved so the review has a baseline other than "fewer is better".

**Distribution (verified, shapes the design):** the framework is installed as an npm package (`npm install -g github:starvoxel/ai-foundation#<ref> --ignore-scripts`, AIF-005 item 12 and AIF-008), planned to move to an Artifactory npm registry. ADR 0006 means there is no build step, so `lib/` and `bin/` ship as written. Installed skills land in `~/.claude/skills/` with no `lib/` beside them, so code is reachable only through `aif` on `PATH`; plain reference files are reachable by agents with `read`. The design needs both and nothing else. It also works unchanged if a compiled single-file binary is ever adopted (the catalog is a skill file; `aif tools` is compiled in).

> Requirement traceability: N/A. Human request 2026-10-03, revised 2026-10-04 after the human corrected the distribution premise.

---

## 3. Quick Summary

**Open Items:** 0 open; all questions in Section 8 resolved by the human on 2026-10-05 (one amended, Q5)

**Recommendation in one line:** a shared skill `skill/tool-tiers` owns a hand-edited catalog (impact tier T0–T4, capabilities, description per tool) and the rules that read it; a pure module `lib/tool-tiers.js` and an `aif tools` subcommand render and check from it; a test ties the catalog to `TOOLS`; nothing is generated or committed. A per-agent needs analysis comes first.

---

## 4. Scope

### In Scope

- A per-agent analysis of the five agents: goal, how it runs (interactive or unattended subagent), what each unattended step needs auto-approved, and which scope limits are enforced versus advisory. It is the baseline the new scale is applied against.
- A new shared skill `skill/tool-tiers` holding the catalog and the definitions of the impact ladder, the capabilities and the combination rule.
- An impact tier (T0–T4), capabilities and a description for every name in `TOOLS` (the 13 built-ins and six AIF-010 groups), with a test that the catalog's names equal `Object.values(TOOLS)`.
- `lib/tool-tiers.js` (pure functions: lookup, render, surface diff, combination check) and an `aif tools` subcommand (`table`, `check`) over it.
- `skill/ai-component-review` "Step 3 — Review the tool/permission surface" and `skill/agent-authoring` cite `skill/tool-tiers` and use `aif tools`; both declare `requires_skills: [tool-tiers]` (AIF-006).
- Retire the hand-maintained copies: `approval_guidance` and `skills/agent-authoring/reference/tools.yaml`, the tier comments on the AIF-010 groups in `lib/constants.js`, and the research brief's tier table as a maintained copy.
- Redefine AIF-010's T0–T5 as T0–T4 (T4 and T5 merge) and update the comments and test labels that carry the old numbers.
- Doc-Update for arc42 (Section 9).

### Out of Scope

- Enforced, structured scope on agent grants (path-limited `write`, read-only `shell`, `allowed_commands`). Planned separately; kickoff prompt: `docs/research/enforced-grant-scope-em-kickoff-prompt.md`. Until it lands, this Feature treats prose scope limits as advisory and does not credit them.
- Changing which agents hold which tools or groups (AIF-010 Task 004 owns grants). This Feature edits no agent yaml.
- Any new platform tool group, or moving a tool between groups.
- A build, pack or compiled-binary pipeline. Not needed (Section 2).
- A script shipped inside the skill. `aif tools` replaces it.
- The broader docs-in-git / feature-branch process question.
- Making the catalog a first-class component type that adapters derive their `TOOL_MAP`s from. Likely long-term direction, ADR-grade, a separate Feature.
- Revising the research brief's findings. It stays a dated record; only its role as a maintained tier table ends.

---

## 5. Feature Description

### User-Facing Behaviour

The users are the framework maintainer and the review and authoring agents.

- A maintainer changes a tool's tier or capabilities by editing one catalog entry. Nothing else is regenerated.
- Adding a name to `TOOLS` without a catalog entry, or the reverse, fails a validation test naming the tool.
- When `ai-component-review` sees an agent diff touching `tools`, `approved_tools` or `blocked_commands`, it runs `aif tools check` with the before and after lists and reads a short report: each tool added or removed with its tier, tools newly in `approved_tools` with their tier, the highest tier held and the highest tier auto-approved, the capabilities held, and any combination finding. Step 3's rule that such a diff is always HIGH-or-above does not change; the command replaces the prose that identifies what to flag, not the severity.
- `agent-authoring` "Step 3 — Select tools" and its self-validation checklist point at `aif tools table` and `aif tools check` for a draft agent.
- Where `aif` is not on `PATH`, the skill tells the reader to read `reference/tool-catalog.json` directly and apply the rules in `SKILL.md`; it never falls back to remembered tiers.

### The scale

Two axes per tool, plus a judgement per agent.

**Impact (one ordinal scale, T0–T4):** rated by the worst effect of one misused call and its reversibility. It reuses AIF-010's T0–T3 meanings unchanged and merges T4 and T5.

| Tier | Meaning                                                                           | Examples                                                            |
| ---- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| T0   | Observe: no state change, no egress                                               | read, grep, glob, code, task, skill, plan, ask_user, `session_info` |
| T1   | Contained change: workspace or this session only, recoverable                     | write, `pr_follow_through`                                          |
| T2   | Reaches outside: external or untrusted content or account scope, nothing changed  | web_search, web_fetch, `repo_list`                                  |
| T3   | Acts outside or multiplies: arbitrary execution, external writes, controls agents | shell, subagent, `session_control`, `@youtrack/update_issue`        |
| T4   | Persists or widens: outlives the session or expands its reach                     | `routines`, `repo_scope`                                            |

Exposure and egress (T2) deliberately outrank a local, recoverable change (T1): git undoes a write; nothing undoes reading and acting on untrusted content. Human confirmed this ordering 2026-10-04.

**Capabilities (flags per tool):** `web` (brings in untrusted external content and can send data out), `write`, `exec`, `delegate`. They map to the Rule of Two vocabulary used in the research: untrusted input is `web`; external effect is `write`, `exec` or `delegate`; sensitive access is `read`, which every agent holds, so it is constant here and needs no flag.

**Combination rule (one check, two severities):** `web` + `write` + `exec` together is a finding, and so is `web` + `delegate`; `web` together with any of `write`, `exec` or `delegate` otherwise needs documented isolation in the agent's Hard rules. This merges the two rules that disagree today (`ai-component-review` flags write+shell+web; `agent-authoring` flags web plus write, shell or subagent). Amended by the human 2026-10-05: `delegate` now counts toward the finding, not only the documentation requirement.

**Grant judgement (per agent, in review, not a tool property):** the scope of the grant, whether it is auto-approved, and whether the agent runs unattended. Informed by the per-agent analysis. Scope that is only prose is not credited (Out of Scope).

### Data Flow

Hand-edited catalog (`skills/tool-tiers/reference/tool-catalog.json`) → `lib/tool-tiers.js` (pure) → `aif tools table|check` on stdout → read by the reviewing or authoring agent. The agent passes the `tools` and `approved_tools` lists from the diff as arguments; the report echoes them so the reviewer can compare them to the diff. Code under `lib/` now reads the catalog for the check and the test; this reverses AIF-010's "code never reads tiers" comment.

### Business Rules

- The catalog is the only place a tier or capability is written. The table is rendered on demand and never stored.
- Tier is data about the capability and is harness-neutral (ADR 0002); a group a harness resolves to unsupported keeps its tier. Group names stay capability-named, never tier-named (ADR 0007).
- A name not in the catalog (for example an `@server/tool` reference) is reported `unrated`, never guessed.
- `aif tools` reads only the catalog and its arguments, writes only to stdout, and does no git or network access.

### Error States

| Scenario                                                               | Expected Behaviour                                                                          |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| A `TOOLS` value has no catalog entry, or an entry has no `TOOLS` value | Validation test fails naming the tool                                                       |
| Tier outside 0–4, or an unknown capability                             | Validation test fails                                                                       |
| Tool name not in catalog                                               | Reported `unrated`; non-zero exit only with `--strict`                                      |
| New agent file (no base list)                                          | Base list empty; every tool reported as added                                               |
| Catalog missing or malformed JSON                                      | `aif tools` exits non-zero with the path and parse error; the skill says it could not check |

---

## 6. Architecture Overview

### New Components

| Component                                       | Type                       | Responsibility                                                                                                                         |
| ----------------------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `skills/tool-tiers/SKILL.md`                    | Skill                      | Owns the impact ladder, capabilities, combination rule and the `subagent` note moved from `tools.yaml`; says when to call `aif tools`. |
| `skills/tool-tiers/reference/tool-catalog.json` | Hand-edited reference data | One entry per `TOOLS` name: tier, capabilities, description. JSON so code needs no parser dependency.                                  |
| `lib/tool-tiers.js`                             | Core library               | Pure functions: load and validate catalog, lookup, render table, surface diff, combination check.                                      |
| `lib/commands/tools.js`                         | Command                    | Thin wrapper: `aif tools table` and `aif tools check`; adds `tools` to `COMMANDS`.                                                     |
| Catalog-to-`TOOLS` test                         | Validation test            | In `tests/validation/tools.test.js`: catalog names equal `Object.values(TOOLS)`; tiers and capabilities valid.                         |
| Per-agent needs analysis                        | Research record            | Dated record of each agent's tool needs and enforced versus advisory limits (home: Section 8, Q8).                                     |

### Component Relationships

`skill/ai-component-review` and `skill/agent-authoring` cite `skill/tool-tiers` and declare it in `requires_skills`, so bundle resolution installs it with them (AIF-006). `lib/tool-tiers.js` reads the catalog from the package root's `skills/` directory. `lib/constants.js` keeps `TOOLS` as strings; the test is the only link between `TOOLS` and the catalog.

### Options considered

Judged against: works from an installed package, number of places a tier is written, anything generated in git, how drift is caught, and cost.

| Option                                                                        | Verdict                                                                                                                                                  |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tier in `constants.js`; tables rendered at install                            | Rejected. Needs install-time generation whose freshness the snapshot cannot see (AIF-005 item 15: snapshots hash component sources only).                |
| Tier in `constants.js`; generated tables committed                            | Rejected. Reintroduces committed-generated-file merge conflicts.                                                                                         |
| Catalog in a skill; `aif tools` over it; test ties it to `TOOLS` (**chosen**) | One place a tier is written; agents read the catalog directly, code reads the same file; no generation, no skill-bundled script; drift caught by a test. |
| Catalog in a skill; checker script shipped inside the skill                   | Rejected. Would be the first skill with a script, and duplicates logic `aif validate` and the test already need in `lib/`.                               |
| Catalog as a first-class component type that adapter `TOOL_MAP`s derive from  | Right long-term direction; ADR-grade and far larger. This catalog is its natural first step.                                                             |

Gives up "tier physically next to `TOOLS`" for a test that fails when the two diverge; adding a tool touches two places.

### Integration Points

- `lib/constants.js`: `TOOLS` shape unchanged; `COMMANDS` gains `tools`; the tier comments become a pointer to the catalog. `bin/aif.js` gains one `case`.
- `skills/agent-authoring/reference/tools.yaml`: `builtin:` descriptions, the `subagent` note and the trifecta text move into the catalog and `SKILL.md`; the file and `approval_guidance` are removed. `skills/agent-authoring/SKILL.md` and `reference/schema.md` references are updated. `docs/process-model.md` mentions are historical and left alone.
- `tests/unit/resolved-tool-sets.test.js` and `tests/unit/claude-adapter.test.js` carry T-labels in comments; relabel T5 as T4.
- `bundles/engineering/snapshot.json`: regenerated through the existing `snapshot-freshness` CI check. A catalog change marks the bundle stale with no special handling.
- `tests/validation/refs.test.js` (`aif validate refs`): citations to `skill/tool-tiers` and its removed predecessor file must resolve; AIF-006's reference rules apply to the two consuming skills.

---

## 7. Security Considerations

- The catalog becomes the input to the tool-surface check, so a wrong or missing tier weakens review. Mitigation: the catalog-to-`TOOLS` test, an `unrated` outcome for unknown names, and no default tier.
- The control is unchanged: a diff touching `tools`, `approved_tools` or `blocked_commands` stays HIGH-or-above in `ai-component-review` Step 3, and judging a `blocked_commands` removal stays with the reviewer. `aif tools check` reports; it does not approve.
- The command receives lists as arguments, so a transcription error by the caller could hide a tool. Mitigation: the report echoes the lists, and the review skill requires the reviewer to compare them to the diff.
- Advisory scope (prose limits on `write` or `shell`) is not credited, so a reviewer cannot be talked into a lower rating by Hard-rules text alone.
- `aif tools` reads one local file and writes only to stdout. The catalog is installed read-only content like any skill file.

---

## 8. Risks & Open Questions

| #   | Risk / Question                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Type     | Impact | Source                  | Raised By  | Resolved                                                        |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------ | ----------------------- | ---------- | --------------------------------------------------------------- |
| 1   | **Scale shape.** Recommendation: one impact scale T0–T4 plus capability flags and a per-agent grant judgement (Section 5). Rationale: published frameworks use flags plus an autonomy question, not one number; one scale lets built-ins and platform groups be compared. T4 and T5 merge, which relabels AIF-010 comments and test labels only.                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Question | H      | Human request, research | Human / EM | Yes (human 2026-10-05)                                          |
| 2   | **Where the source lives.** Resolved 2026-10-04: catalog in `skill/tool-tiers`, checker as `aif tools`, test ties it to `TOOLS`. Reasons in Section 6. Installs run `aif` (npm package), so `lib/` is available; a compiled single binary is not needed and would need a new ADR against ADR 0006.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Question | H      | Human request           | Human / EM | Yes (human 2026-10-04)                                          |
| 3   | **Generated output.** Recommendation: generate nothing and commit nothing; `aif tools table` renders on demand.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Question | M      | Human request           | Human / EM | Yes (human 2026-10-05)                                          |
| 4   | **Where the 13 built-ins sit.** Recommendation, for the human to confirm after the per-agent analysis: T0 for `read`, `grep`, `glob`, `code`, `task`, `skill`, `plan`, `ask_user`; T1 `write`; T2 `web_search`, `web_fetch`; T3 `shell`, `subagent`. Capabilities: `web` on both web tools; `write`; `exec` on `shell`; `delegate` on `subagent`.                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Question | H      | Code read, human        | EM         | Yes (human 2026-10-05): confirmed now; Task 1 may flag a change |
| 5   | **Combination rules.** Resolved: merge the two disagreeing rules into one check with two severities (Section 5). Amended by the human: `web` + `delegate` is also a finding, so `delegate` counts toward both severities.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Question | M      | Code read               | EM         | Yes, amended (human 2026-10-05): see Section 5                  |
| 6   | **What replaces `approval_guidance` for `approved_tools`.** Recommendation: an auto-approved tool at T2 or above needs a documented reason in the per-agent analysis and the agent's Hard rules, and `check` lists such entries. A rule of "T1 or above" would flag every current grant of `write`, `shell`, `subagent`, `web_search` and `web_fetch` across four of five agents, so it is rejected.                                                                                                                                                                                                                                                                                                                                                                                                      | Question | H      | Human, code read        | EM         | Yes (human 2026-10-05)                                          |
| 7   | **Capability names.** Recommendation: `web`, `write`, `exec`, `delegate`, with the Rule of Two mapping documented in the skill. Rename from "legs" agreed 2026-10-04.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Question | L      | Human                   | Human / EM | Yes (human 2026-10-05)                                          |
| 8   | **Home of the per-agent analysis and the stated reasons.** Recommendation: the analysis as a dated record in `{paths.research}`; each agent's reasons for T2-and-above auto-approvals in its own Hard rules (the existing home for grant rationale), cited not restated.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Question | L      | Document-types steering | EM         | Yes (human 2026-10-05)                                          |
| 9   | **Sequencing and overlap.** Starts after AIF-006 lands (`requires_skills` and the reference rules). AIF-010 Tasks 004 and 005 touch `agents/*.yaml` and `05_02`; this Feature edits no agent yaml. Conflicts in `bundles/engineering/snapshot.json` are resolved by regenerating it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Risk     | L      | Code read, human        | EM         | Yes (human 2026-10-04: depend on AIF-006)                       |
| 10  | **Advisory scope is uncredited.** Until the follow-up Feature enforces scope, a limit written only in prose cannot lower a rating, so architect and researcher `write` and principal-engineer `shell` rate at their full tier. Accepted trade-off, human confirmed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Risk     | M      | Code read               | EM         | Yes (human 2026-10-04)                                          |
| 11  | **Rating of `pr_follow_through`.** Members are `subscribe_pr_activity`, `unsubscribe_pr_activity`, `send_later` and `ReadNotifications`. The subscription and notification members change nothing in the repo or on GitHub, but the group is not observe-only: `send_later` creates a persisted one-shot wake that survives restarts, and subscribed PR comments are untrusted input (this repo is public). Options: (A) rate the group as a unit at T1 and flag the untrusted input; (B) rate it T0; (C) store per-member ratings, group tier derived; (D) split into an observe-only group and a deferred-wake group. Recommendation: A, with D as a follow-up if grants should differ. Decide with Q7, since flagging untrusted input would make the combination check apply to `engineering-manager`. | Question | M      | Human, code read        | Human / EM | Yes, option A (human 2026-10-05)                                |

> **Minor decisions made during planning.** None is an architectural fork: each is reversible and internal, so none escalates to an ADR. Rows awaiting the human carry a recommendation so one reply can close several.

---

## 9. Task Decomposition

Not decomposed. Per `skill/feature-planning`, decomposition happens after this plan is `Approved`.

Task outline (for review only; not a commitment, and no `tasks.json` exists):

1. **Per-agent needs analysis.** For each of the five agents: goal, run mode, what unattended steps need auto-approved, enforced versus advisory limits. Output may flag changes to Q4 and Q6, both already resolved.
2. **Catalog, skill and test.** Create `skill/tool-tiers` (`SKILL.md` and `tool-catalog.json`, 19 entries) and the catalog-to-`TOOLS` test; replace tier comments in `lib/constants.js` and relabel T5 as T4 in tests.
3. **`lib/tool-tiers.js` and `aif tools`.** Pure module with unit tests, thin command, integration test against the real CLI.
4. **Consumption and retirement.** Edit `ai-component-review` Step 3 and `agent-authoring` to cite the skill and use `aif tools`, with `requires_skills`; remove `tools.yaml` and `approval_guidance`; reduce the research brief's tier table to a pointer; regenerate the bundle snapshot.
5. **Doc-Update check.** Runs last (below).

Order is 1 → 2 → 3 → 4 → 5; the skill-text edits in 4 can overlap 3 once the command's output shape is fixed.

### Doc-Update step

New files extend described blocks, so arc42 changes are expected:

- `docs/architecture/05_05_command_layer.md`: add `lib/commands/tools.js` to `key_files` and describe the `tools` command.
- `docs/architecture/05_03_core_libraries.md`: add `lib/tool-tiers.js` to `key_files` and describe it. That list is already past 5 entries, so re-evaluate the split trigger and record the decision.
- Re-read the `TOOLS`-related rows in `05_02_harness_adapters.md` and `05_03` for any tier claim; update or record "no change needed".
- Bump each touched section's `last_verified` to the real final commit, regenerate `index.json`, and run `aif index architecture --check` exactly once as the last local step before pushing, per `steering/engineering/architecture-authoring.md`.

---

## 10. Acceptance Criteria

- [ ] All Tasks complete and signed off
- [ ] Feature works end-to-end as described in Section 5
- [ ] No HIGH or CRITICAL findings open in any Task review
- [ ] The per-agent analysis exists and any change it flags to Q4 or Q6 is raised to the human
- [ ] Every `TOOLS` name has exactly one catalog entry with a tier and capabilities, enforced by a test, and no other maintained copy of tier data remains
- [ ] `aif tools check` runs from a globally installed package with no repo checkout, and the skill degrades to reading the catalog where `aif` is absent
- [ ] `table` output is not committed anywhere
- [ ] `skill/ai-component-review` Step 3 and `skill/agent-authoring` obtain tiers and combination findings from `aif tools`, not from restated prose
- [ ] Running `check` on a real agent diff reports added tools with tiers and the combination findings
- [ ] Both consuming skills declare `requires_skills: [tool-tiers]`; bundle resolution installs `skill/tool-tiers`; `aif validate` and the snapshot check pass
- [ ] Doc-Update check done and its outcome recorded
