# Kickoff prompt: Engineering Manager — Feature Plan for consumer-project onboarding to cloud sessions

Paste everything below the line into a new session running the `engineering-manager` agent.

---

You are the Engineering Manager. Produce a **Draft Feature Plan** (via `skill/feature-planning`) for making a project that consumes ai-foundation ready to run in Claude Code cloud sessions without hand-assembling the setup. Start from the review in `docs/research/plan-review-aif-005-008.md` (the "Revised recommendations" section and its evidence) and from the plans `AIF-005` and `AIF-008` on `main`; read them in full first.

## Goal

Today a consumer repo gets cloud support only if a human assembles it by hand. Investigate and plan how `aif init` (or an equivalent flow) should set a consumer project up so a cloud session in it works:

1. **A SessionStart hook in the consumer repo.** Hooks cannot easily be added unless they exist in the `aif init` flow. Plan what `aif init` scaffolds (for example a `.claude/settings.json` hook that runs `ai-git doctor` and refreshes the install), and how it differs from this repo's own `scripts/session-start.sh`.
2. **`.aiconfig.json` for a consumer repo.** `ai-git` exits with "No .aiconfig.json found" without `ai_identity`, and `secrets.run` is needed for the `bws` token. Plan what `aif init` writes and what it asks the human.
3. **Cloud environment Setup text for a consumer project.** `AIF-005` supplies the Setup helper and recipe and `AIF-008` supplies the `ai-git`, `gh` and `bws` lines; plan how a consumer project obtains the exact text for its own pinned ref, bundles and primary agent (the human pastes it into the environment; agents only supply the text).
4. **Project-level settings a consumer repo needs**, for example `attribution` (trailers off) at repo level, and which cloud environment variables the human must set (`GIT_CONFIG_GLOBAL=/dev/null`, `BWS_PROJECT_ID`, `BWS_ACCESS_TOKEN`, `AIF_BUNDLES`).

## Constraints and process (follow the repo's own rules)

- Governing gate: `skill/complexity-tiers` / `steering/engineering/core.md`. This is cross-cutting (init flow, templates, docs, tests), so plan it as a Feature; do not implement anything.
- Commit the plan to **main** with `Status: Draft` before presenting it, each revision as a new commit, and stop at Draft. Follow `skill/plan-lifecycle` and `steering/engineering/git-workflow-framework.md` (framework repo: direct commits to main are permitted). Use `ai-git`, never raw `git`/`gh`. Do not implement or decompose into Tasks until the human has approved and the `Approved` commit exists.
- **Investigate before planning.** Read what `aif init` (`lib/commands/init.js`, `lib/project-init.js`, `projects/_template/`) writes today, and what a consumer repo would still be missing. State what you verified and what you could not.
- Treat these as already decided and do not relitigate them: `ai-git` and `aif` are installed with `npm install -g … --ignore-scripts` in the Setup text; `gh` and `bws` are pinned release binaries with a hardcoded sha256; `ai-git` is the single GitHub path (REST via `ai-git gh-api`, no GitHub MCP); no ambient git identity; the human edits cloud environment settings and agents only supply the exact text; Kiro and project-scope install (`aif install --scope project`) are deferred; `BWS_ACCESS_TOKEN` is the one credential in the environment, scoped strictly to what the session needs.
- Do not duplicate `AIF-005` (Setup helper, primary agent, consolidated acceptance) or `AIF-008` (`ai-git` runtime, `doctor`, README cloud section); cite them and declare them as dependencies. This Feature lands after both.
- Check `docs/decisions/` for relevant Approved ADRs before writing the plan. If the hook scaffolding or init flow raises a contested, costly-to-reverse fork not covered by an Approved ADR, raise it as an open question and recommend dispatching Architect (ask the human to confirm that dispatch); do not decide it yourself.
- Include a testing approach (what is unit-testable locally, and what needs a real cloud session), a Doc-Update step for the affected arc42 sections per the Doc-Update Acceptance Gate, and at least one Out of Scope item (suggested: Kiro, project-scope install, the GitHub MCP permissions investigation, changing the Setup helper).
- Do not add scope beyond this prompt; additions go back to the human as suggestions.

## Questions to put to the human in the plan's open questions

1. Should `aif init` write a SessionStart hook by default, or only on request?
2. Where does the consumer repo's cloud Setup text live (README section, a generated file, printed by `aif init`)?
3. How should a consumer repo's `.aiconfig.json` get its `ai_identity` and `secrets.run` values without committing anything sensitive?
4. Should `ai-git doctor` be what the scaffolded hook runs, and should a failing check block or only warn?

Present the Draft plan for review and wait. Report the commit SHA of the Draft when done.
