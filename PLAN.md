# PLAN.md — AI Foundation Roadmap

Tracks what has been done and what is planned for the ai-foundation framework.

---

## Milestones

| Version | Name                 | Status         |
| ------- | -------------------- | -------------- |
| v0.1    | Framework Foundation | ✅ Complete    |
| v1.0    | MVP                  | 🔲 In Progress |
| v1.1    | Observability        | 🔲 Planned     |
| v1.2    | Quality Gates        | 🔲 Planned     |
| v1.3    | Tooling              | 🔲 Planned     |
| v1.4    | Product Domain       | 🔲 Planned     |
| v2.0    | Self-Improving       | 🔲 Planned     |

---

## Feature Tracker

| Feature                                                                            | Size | Milestone | Status  |
| ---------------------------------------------------------------------------------- | ---- | --------- | ------- |
| AGENTS.md (framework rules, schemas, loading order)                                | M    | v0.1      | ✅ Done |
| Agent definitions (8 agents, YAML format)                                          | L    | v0.1      | ✅ Done |
| Skills system (14 skills with procedures + templates)                              | L    | v0.1      | ✅ Done |
| Steering system (global + engineering domain)                                      | M    | v0.1      | ✅ Done |
| Git workflow steering (framework + projects)                                       | S    | v0.1      | ✅ Done |
| Standards file (C#/Avalonia)                                                       | S    | v0.1      | ✅ Done |
| Server template + folder structure                                                 | S    | v0.1      | ✅ Done |
| Install script (Kiro CLI + VS Code Copilot)                                        | M    | v0.1      | ✅ Done |
| Test suite (schemas, tools, unit tests)                                            | M    | v0.1      | ✅ Done |
| Shared test library (lib/test-helpers.js)                                          | S    | v0.1      | ✅ Done |
| Directory READMEs                                                                  | S    | v0.1      | ✅ Done |
| aif CLI (install, uninstall, status, list, validate, test)                         | L    | v1.0      | ✅ Done |
| Bundle system with domain auto-discovery                                           | M    | v1.0      | ✅ Done |
| Harness adapters (Kiro + Claude Code)                                              | M    | v1.0      | ✅ Done |
| MCP server install (stdio + http, both harnesses)                                  | M    | v1.0      | ✅ Done |
| DAG MCP server (validate + compute-waves)                                          | M    | v1.0      | ✅ Done |
| Snapshot system (source freshness detection)                                       | M    | v1.0      | ✅ Done |
| Install --update and skip-if-current                                               | S    | v1.0      | ✅ Done |
| Bundle directory restructure                                                       | S    | v1.0      | ✅ Done |
| Knowledge system (project-local reference material for agents)                     | M    | v1.0      | ✅ Done |
| Standards resolution and installation (domain-mapped, harness-injected)            | M    | v1.0      | ✅ Done |
| Knowledge-authoring skill (retired — re-homed to `document-types.md` + templates)  | S    | v1.0      | ✅ Done |
| Knowledge index command (`aif index`)                                              | S    | v1.0      | ✅ Done |
| Standards: additional languages (JavaScript/Node done; TypeScript, Python pending) | M    | v1.0      | 🔲      |
| Project init command (`aif init`)                                                  | S    | v1.0      | ✅ Done |
| Code review skill maturity (checklists, structured output)                         | M    | v1.0      | 🔲      |
| Test execution skill maturity (test types, per-language patterns)                  | M    | v1.0      | 🔲      |
| Model selection per agent                                                          | S    | v1.0      | 🔲      |
| Work Log system (persistent activity tracking)                                     | M    | v1.1      | 🔲      |
| Task/progress tracking (Task status across Features)                               | L    | v1.1      | 🔲      |
| CI/CD pipeline (automated tests on push)                                           | S    | v1.1      | 🔲      |
| Error recovery / resume orchestration                                              | M    | v1.1      | 🔲      |
| Plan Reviewer agent                                                                | M    | v1.2      | 🔲      |
| Feature QA agent                                                                   | M    | v1.2      | 🔲      |
| Documentation generation (README, changelog, API docs)                             | M    | v1.2      | 🔲      |
| Security scanning server (dependency audit, secret detection)                      | M    | v1.3      | 🔲      |
| Standards distribution and sync (push/pull between aif and projects)               | M    | v1.3      | 🔲      |
| Product domain agents (PRD, UX, product decisions)                                 | L    | v1.4      | 🔲      |
| Context and memory layer (RAG, episodic memory)                                    | XL   | v2.0      | 🔲      |
| Self-improvement pipeline (outcome logging, prompt evolution)                      | XL   | v2.0      | 🔲      |

**Completed plans:** `docs/plans/completed/`

---

## Milestone Descriptions

### v0.1 — Framework Foundation ✅

Structure defined and validated. Agents, skills, steering, and tests exist as plain files.
Everything is portable and harness-agnostic.

### v1.0 — MVP

Agents load in a harness with steering applied. Install/deploy works with bundle discovery, MCP server support, and snapshot-based freshness detection. The planning flow works end-to-end on a real project. Knowledge system gives agents project context.
Standards cover common languages. Minimum needed to start using this for actual development across multiple projects.

### v1.1 — Observability

Track what happened (Work Log), what's in progress (task tracking), catch regressions automatically (CI/CD), and resume after interruptions.

### v1.2 — Quality Gates

Automated plan review, Feature-level QA agents, and documentation generation reduce the burden on human reviewers and keep docs current.

### v1.3 — Tooling

MCP servers give agents specialized capabilities: security scanning, code analysis, and domain-specific operations beyond what the harness provides natively.

### v1.4 — Product Domain

Expand beyond engineering into product requirements, UX, and design feedback.

### v2.0 — Self-Improving

The system learns from outcomes, evolves prompts based on results, and builds institutional memory across projects.
