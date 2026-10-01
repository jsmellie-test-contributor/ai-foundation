# Kickoff prompt: Engineering Manager — Feature Plan for harness-neutral tool mapping and tool tiers

Paste everything below the line into a new session running the `engineering-manager` agent.

---

You are the Engineering Manager. Produce a **Draft Feature Plan** (via `skill/feature-planning`) for the work described in `docs/research/tool-tiers-and-harness-parity.md`. Read that brief in full first; it holds the incident evidence, tool risk tiers, adapter analysis, cross-harness research, open questions and a suggested Task decomposition.

## Goal

Make agent tool grants consistent and explainable across harnesses, where tools do not always match:

1. Standardize how adapters say "no native equivalent" (Claude uses `[]`, Kiro uses `null`) into one shared contract, and make dropped tools visible at install time. **This is the first Task; everything else builds on it.**
2. Introduce harness-neutral generic tool _group_ names for the Claude-only claude-code-remote capabilities, tiered from "every agent" to "specific agents only" (tiers T0-T5 in the brief), so the EM can subscribe to PR activity and schedule check-ins, which it could not in the PR 83 session.
3. Keep the harness-neutral baseline to the existing generic tool names; Kiro and a future Copilot adapter resolve the Claude-only groups to unsupported.

## Constraints and process (follow the repo's own rules)

- Governing gate: `skill/complexity-tiers` / `steering/engineering/core.md`. This is cross-cutting (schema, two adapters, agent yamls, skills), so plan it as a Feature; do not implement anything.
- Commit the plan to **main** with `Status: Draft` before presenting it, each revision as a new commit, and stop at Draft. Follow `skill/plan-lifecycle` and `steering/engineering/git-workflow-framework.md` (framework repo: direct commits to main are permitted). Use `ai-git`, never raw `git`/`gh`. Do not implement or decompose into Tasks until the human has approved and the `Approved` commit exists.
- The abstraction choice (generic group names vs explicit `@server/tool` names plus a filter vs a per-harness yaml section) is a contested, costly-to-reverse fork not covered by an Approved ADR. **Raise it as an open question and recommend dispatching Architect (gated: ask the human to confirm that dispatch).** Do not decide it yourself. The brief recommends generic group names (it matches the existing `null`/`[]` precedent and respects `docs/decisions/0002-steering-schema-harness-scoping.md`), but that is a recommendation, not a decision.
- Check `docs/decisions/` for relevant Approved ADRs (notably 0002 and 0004) before writing the plan; only Approved ADRs are authoritative.
- Raise every item in the brief's section 7 ("Open / UNVERIFIED") as open questions or as explicit Task steps that verify before relying. In particular: verify what Kiro does with an unknown `@claude-code-remote/...` entry _before_ any agent-yaml edit that adds one, and verify subagent inheritance of these tools.
- Include a testing approach that asserts the **resolved tool set** per agent and harness, not only file validity, and a Doc-Update step for `docs/architecture/05_02_harness_adapters.md` (`key_files` and description) per the Doc-Update Acceptance Gate.
- Include at least one Out of Scope item. The brief suggests: building the Copilot adapter, changing GitHub MCP exposure, and the youtrack network-policy change.
- Do not add scope beyond the brief; additions go back to the human as suggestions.

## Decisions to put to the human in the plan's open questions

1. Abstraction option (A/B/C) — needs the Architect ADR above.
2. Who owns a PR subscription (EM only vs also Software-Engineer).
3. Whether tiers T3 and above should exist at all, given the `subagent` generic tool already grants Agent/ListAgents/SendMessage.
4. Whether `ToolSearch` can be part of a universal baseline.

Present the Draft plan for review and wait. Report the commit SHA of the Draft when done.
