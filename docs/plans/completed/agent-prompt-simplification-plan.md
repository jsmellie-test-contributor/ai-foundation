# Agent Prompt Simplification — Implementation Plan

> Status: Done
> Created: 2026-08-13
> Approved by: Jeremy Smellie

---

## Goal

Remove confirmed duplication between agent prompts and the skills/steering those agents already load, shrinking prompts to identity + agent-specific rules only.
Extract the one genuinely reusable, non-agent-specific block (`ai-engineer`'s complexity-tier framework) into a skill. Establish a durable, lightweight place to record prompt content that is agent-specific _today_ but procedural enough to become a shared skill if a second agent needs the same behavior later (relevant given possible future specialized agents).

---

## Components Affected

| Component                                           | Action | Notes                                                                                                                                          |
| --------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `agents/principal-engineer.yaml`                    | Modify | Collapse restated `skill/code-review` Steps into a pointer; remove inline severity table (moves to the skill)                                  |
| `agents/test-engineer.yaml`                         | Modify | Collapse restated `skill/test-execution` Steps into a pointer; drop restated ai-git rule                                                       |
| `agents/tech-lead.yaml`                             | Modify | Collapse restated `skill/epic-planning`/`skill/chunk-planning` Steps into a pointer; drop restated Decision-Record-approval sentence           |
| `agents/engineering-manager.yaml`                   | Modify | Drop restated Decision-Record-approval sentence; remove intra-file duplication of the branch/worktree creation steps                           |
| `agents/software-engineer.yaml`                     | Modify | Drop restated ai-git rule (keep the commit-before-done rule — not duplicated elsewhere)                                                        |
| `agents/ai-engineer.yaml`                           | Modify | Replace inline Tier 1/2/3 framework with a pointer to the new skill                                                                            |
| `skills/complexity-tiers/SKILL.md`                  | Create | New shared skill housing the tier definitions, signals, and per-tier process                                                                   |
| `docs/agent-prompt-extraction-candidates.md`        | Create | Knowledge file (type: `reference`) codifying prompt blocks that are agent-specific today but are candidates for skill extraction if reused     |
| `skills/agent-authoring/SKILL.md`                   | Modify | Add a checkpoint in Step 5 (write the prompt) referencing the extraction-candidates file, and an Edge Case describing when/how to add an entry |
| `skills/code-review/SKILL.md`                       | Modify | Add CRITICAL/HIGH/MEDIUM/LOW severity definitions (moved from `principal-engineer.yaml`) so the skill is self-contained                        |
| Frontmatter `version` on all modified/created files | Modify | Minor version bump (patch for the new skill: `0.1.0`)                                                                                          |

---

## Approach

1. **`principal-engineer.yaml` and `test-engineer.yaml` — remove restated skill Steps.** Both agents' "Process" sections are near line-for-line restatements of `skill/code-review` Steps 1-5 and `skill/test-execution` Steps 1-6 respectively.
   Replace each Process block with a one-line pointer ("Follow `skill/code-review`" / "Follow `skill/test-execution`"). Keep Hard Rules unchanged — those are genuine constraints, not step mechanics, and are not duplicated in the skills.

2. **`tech-lead.yaml` — remove restated skill Steps.** Same pattern against `skill/epic-planning` and `skill/chunk-planning`. Collapse the 6-step Process into a short summary (Epic → human approval → Chunk decomposition → human approval) plus a pointer to both skills for mechanics.
   Keep Hard Rules unchanged.

3. **Remove the duplicated Decision-Record-approval sentence.** `engineering-manager.yaml` and `tech-lead.yaml` both restate, near verbatim:
   "Only reference Decision Records with Status 'Approved' and a named human in 'Approved By'." This is already the single source of truth in `skill/plan-lifecycle/reference/status-vocabulary.md`, which both agents already load transitively (`chunk-orchestration`, `epic-planning`/`chunk-planning`).
   Delete the restated sentence from both; if a pointer is wanted, use one line:
   "See `skill/plan-lifecycle` — only `Approved` status is authoritative."

4. **Extract `ai-engineer.yaml`'s Tier 1/2/3 framework into `skill/complexity-tiers`.** This block (tier signals, examples, and per-tier process) is fully generic — it contains no ai-engineer-specific content and is not currently referenced from any skill, so no other agent can reuse it even though the concept is broadly applicable. Create `skills/complexity-tiers/SKILL.md` with the tier definitions as its Steps (Purpose: assess complexity and scale process accordingly; Inputs:
   task description; Steps: Tier 1/2/3 definitions + process; Outputs: stated tier
   - process followed; Edge Cases: override signals — "just do it" / "plan this").
     `ai-engineer.yaml`'s prompt shrinks to: identity, responsibilities, a pointer ("Assess complexity per `skill/complexity-tiers` before starting work"), and the Hard Rules that are genuinely ai-engineer-specific (e.g. "never modify application code," "never decide what agents should exist").

5. **Remove the restated "use ai-git" rule from `software-engineer.yaml` and `test-engineer.yaml`.** This exact rule is already the explicit subject of `steering/engineering/git-workflow-framework.md` (Rule 5) and `git-workflow-projects.md` (Rule 11), loaded for every engineering agent, and is separately enforced mechanically via `blocked_commands: ["git *", "gh *"]` on every agent. Drop the sentence from both prompts. Keep "always commit and push before reporting completion" — that behavioral emphasis is not stated anywhere else.

6. **Collapse `engineering-manager.yaml`'s intra-file duplication.** Process step 5 (a-d) and the first Hard Rule bullet both spell out "create branch → create worktree → confirm → dispatch" in nearly identical wording.
   Keep the emphatic Hard Rule version (marked non-negotiable). Collapse Process step 5 to: "Create the chunk's branch and worktree per the Hard Rules below and `skill/worktree-management`, then dispatch." Renumber subsequent Process steps.

7. **Create `docs/agent-prompt-extraction-candidates.md` — codify agent-specific-but-rule-like blocks.** A knowledge file (`type: reference`, `scope: ai-engineer`, tags:
   `["agent-authoring", "prompt-design", "skills"]`) listing prompt content that reads like a reusable procedure/rule but currently lives in only one agent's prompt because only one agent needs it today. Each entry: which agent, what the content is, why it isn't extracted yet, and the condition under which it should be (a second agent needing the same behavior). Seed it with candidates found during this investigation:
   - `architect.yaml`'s Decision Record drafting rule (never set Status to Approved / Approved By; always Draft / Pending) — candidate if a second drafting-and-proposing agent is introduced.
   - `engineering-tech-writer.yaml`'s CHANGELOG entry format — candidate if a second documentation-focused agent (e.g. a product-docs agent) is introduced.
   - `engineering-manager.yaml`'s branch-naming convention (`{epic-id}/{chunk-id}-{short-description}`) — candidate if a second orchestration-capable agent is introduced.
   - `test-engineer.yaml`'s "every public method needs a happy-path and a failure/edge-case test" rule — currently agent-specific hard rule, but conceptually closer to a testing standard than an agent identity trait; candidate for promotion to `standards/` or `steering/engineering/` rather than a skill, if a second test-writing agent is introduced or if it proves to need enforcement outside Test-Engineer specifically.

8. **Add an authoring-time checkpoint in `skill/agent-authoring`.** In Step 5 ("Write the prompt"), add: "If the prompt contains a self-contained procedure or rule that is not specific to this agent's identity, check `docs/agent-prompt-extraction-candidates.md` — either it already covers this case, or add an entry recording why it wasn't extracted now." Add a matching Edge Case: "Prompt contains a generic-sounding rule used by only one agent — don't extract preemptively; record it in the extraction-candidates file instead and revisit when a second agent needs it." This makes the codification durable and discoverable rather than a one-off document nobody re-checks.

9. **Move the severity table from `principal-engineer.yaml` into `skill/code-review`.** `skill/code-review` Step 5 says "classify each finding by severity" but never defines the levels — `principal-engineer.yaml` is currently the only place CRITICAL/HIGH/MEDIUM/LOW are defined, so the skill is not self-contained.
   Add the definitions to the skill (e.g. as part of Step 5, or a short "Severity Levels" subsection) using the exact wording currently in the agent prompt. Remove the table from `principal-engineer.yaml`, replacing it with a pointer if needed ("severity levels are defined in `skill/code-review`").
   Per human direction: if `skill/code-review` is ever split into domain-specific variants, the per-domain skills can revisit/diverge the descriptions at that time — for now, one shared definition keeps the skill self-contained.

10. **Version bumps.** Minor bump on every modified file's frontmatter `version`; new skill starts at `0.1.0`.

---

## Open Questions

None. The severity-table gap raised in the prior revision was resolved by the human: fold it into this plan as Approach step 9. If `skill/code-review` is later split into domain-specific review skills, the severity descriptions can be revisited per-domain at that time — out of scope for now.

---

## Risks

- **Trimming Process sections could lose agent-specific nuance if not careful.** Mitigated by keeping every Hard Rules section untouched — only the step-by-step mechanics that duplicate skill content are removed, never the constraints.
- **`skill/complexity-tiers` becomes a new dependency with only one current consumer (`ai-engineer`).** Accepted — the extraction is justified by size (over half of `ai-engineer.yaml`) and by removing duplication between this agent's prompt and this very planning framework it's being asked to follow, independent of whether a second consumer ever appears.
- **`docs/agent-prompt-extraction-candidates.md` could go stale** if agent authors don't check it. Mitigated by step 8 wiring it into `skill/agent-authoring` itself rather than leaving it as a standalone, easily-forgotten document.

---

## Validation

- Read back all modified/created agent YAMLs and confirm no Hard Rules were lost, only restated Process/prose duplication.
- Confirm every skill pointer added (`skill/code-review`, `skill/test-execution`, `skill/epic-planning`, `skill/chunk-planning`, `skill/plan-lifecycle`, `skill/complexity-tiers`, `skill/worktree-management`) resolves to an existing skill folder.
- Confirm `skills/complexity-tiers/SKILL.md` is fully self-contained (an agent other than `ai-engineer` could adopt it by reference alone).
- Confirm `docs/agent-prompt-extraction-candidates.md` follows `docs/knowledge-file-format.md` frontmatter schema.
- Confirm `skill/code-review` now defines all four severity levels and that `principal-engineer.yaml` no longer duplicates them.
- Run `npm test`; check `tests/validation/` for cross-reference assertions (skills referenced by agents must exist, etc.) this touches.

---

## Out of Scope

- Any schema-level change to deduplicate identical `blocked_commands` across all 8 agents (would require an inheritance/default mechanism in the agent schema — a separate, larger change, mentioned in the prior discussion but not proposed here).
- Modifying `architect.yaml` or `engineering-tech-writer.yaml` beyond adding their entries to the extraction-candidates file — no duplication was found in either that warrants a prompt change.
- Splitting `skill/code-review` into domain-specific variants, or diverging severity-level descriptions per domain — deferred until that split actually happens.
- Any change to agent behavior — this plan only removes duplicated _prose_; no process, rule, or constraint changes are intended.

---

## Completion Note

Implemented in commits a6da212 through e39ca17 on main (2026-08-13). All ten approach steps delivered:

1. Collapsed `principal-engineer.yaml` and `test-engineer.yaml` Process sections to pointers at `skill/code-review` and `skill/test-execution`.
2. Collapsed `tech-lead.yaml` Process to a pointer at `skill/epic-planning` and `skill/chunk-planning`.
3. Removed the duplicated Decision-Record-approval sentence from `engineering-manager.yaml` and `tech-lead.yaml` (kept a `skill/plan-lifecycle` pointer on tech-lead, where the rule is load-bearing; omitted on engineering-manager, where it wasn't actually used by that agent's process).
4. Extracted `ai-engineer.yaml`'s Tier 1/2/3 framework into new `skill/complexity-tiers` (`ai-engineer.yaml` shrank from 115 to 69 lines).
5. Removed the redundant "use ai-git" sentence from `software-engineer.yaml` and `test-engineer.yaml`.
6. Collapsed `engineering-manager.yaml`'s intra-file worktree/branch duplication, keeping the emphatic Hard Rule version.
7. Created `docs/agent-prompt-extraction-candidates.md`, seeded with the four candidates identified during investigation.
8. Wired a checkpoint into `skill/agent-authoring` (Step 5 + Edge Cases) so the extraction-candidates file is checked/updated during future agent authoring.
9. Moved the CRITICAL/HIGH/MEDIUM/LOW severity table from `principal-engineer.yaml` into `skill/code-review` Step 5, per human direction.
10. Version-bumped every modified/created file.

Full test suite (unit + integration + validation): 409/409 passing. No Hard Rules were removed from any agent — only restated Process/prose duplication with skills, steering, or intra-file content.
