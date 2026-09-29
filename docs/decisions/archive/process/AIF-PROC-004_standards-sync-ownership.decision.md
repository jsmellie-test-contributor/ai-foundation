# Decision Brief: Ownership of Standards Push/Pull/Sync (PLAN.md v1.3)

## Metadata

| Field          | Value                                    |
| -------------- | ---------------------------------------- |
| Decision ID    | AIF-PROC-004                             |
| Project        | ai-foundation                            |
| Tier           | B                                        |
| Domain         | process                                  |
| Status         | Deferred                                 |
| Author (Agent) | Architect                                |
| Approved By    | Pending                                  |
| Created        | 2026-08-13                               |
| Referenced By  | AIF-ARCH-004                             |
| References     | AIF-PROC-001, AIF-PROC-002, AIF-PROC-005 |
| Tags           | standards-sync, ownership                |

---

> **Archived** (process-model check 27, 2026-09-25): `Draft` → `Deferred` — never reached
> `Approved`, so `Superseded` doesn't apply (`status-vocabulary.md`'s transition table).
> Its ownership question moves to `steering/` rather than remaining a standing decision
> record, per its row in `docs/process-model.md`'s Decision-record disposition table.
> Kept here as historical record — not converted to MADR.

## Problem

`PLAN.md` lists, under v1.3 (Tooling): "Standards distribution and sync (push/pull between aif and projects)" — currently unscoped beyond that one line. Before Tech-Lead can write an Epic Plan for it, ownership needs to be settled: is this Software-Engineer's work (it sounds like a CLI feature), AI-Engineer's work (it's about `standards/` content), or split — and if split, along what line.

Today, `aif install` performs a one-way, install-time copy of `standards/*.md` into a harness's install target; `.aiconfig.json`'s `project_standards` field points to a project-local override file. Neither of those lets a project repo pull the latest standards content into its own repo, or push a locally-refined standard back up to `ai-foundation` for other projects to benefit from.

This record is scoped to **ownership** only — not the sync mechanism's design (conflict handling, cross-repo git identity), which is resolved separately in AIF-ARCH-004.

---

## Decision

**Chosen approach**: Split by artifact type, following the boundary AIF-PROC-001 already established and the dual-track chunk model AIF-PROC-002 already provides.
Tech-Lead decomposes this as an Epic with a software-track chunk — the CLI mechanism itself (new command(s), diff/hash logic reusing `snapshot.js`, any cross-repo file operations, and their tests) — assigned to Software-Engineer; and an AI-track chunk — the `.aiconfig.json` schema additions, `AGENTS.md` documentation, and (if warranted) a new skill documenting the sync workflow — assigned to AI-Engineer.

---

## Rationale

This repo already has a settled answer for "which agent owns which kind of change" (AIF-PROC-001) and a settled mechanism for expressing a mixed-track Epic (AIF-PROC-002). This feature is declarative-schema-plus-CLI-code by nature — exactly the shape those decisions were built for. Assigning it entirely to one agent would mean re-litigating a boundary that's already decided: putting schema/doc authorship in the wrong agent's hands, or narrowing the feature until it no longer needs real engineering work just to avoid a two-agent split. This decision does not weigh genuinely distinct technical designs against each other — it applies an already-settled precedent to a new feature, which is why it is recorded at Tier B rather than Tier A.

**Trade-offs accepted**:

- This Epic may need to be sequenced manually (AI-track chunk before/alongside the software-track chunk, without automatic track-aware dispatch) if planned before AIF-PROC-002's orchestration-skill updates land. Tech-Lead should check whether that follow-up work is done before decomposing this Epic.

---

## Impact

- This record settles **who** builds the sync feature, not **how it works**. The mechanism design was deliberately out of scope here and has since been resolved in AIF-ARCH-004 — Tech-Lead should treat AIF-ARCH-004 as the binding mechanism design when writing the software-track Chunk Plan.
- Confirm whether AIF-PROC-002's `chunk-orchestration` track-aware dispatch update has landed before decomposing this Epic; if not, sequence the AI-track and software-track chunks manually rather than relying on automatic dispatch.
- Who implements the CLI mechanism for standards push/pull/sync? Software-Engineer, via Tech-Lead's Epic/Chunk process, per AIF-PROC-001.
- Who implements the schema/doc changes (`.aiconfig.json` fields, `AGENTS.md`, any new skill)? AI-Engineer, per AIF-PROC-001/AIF-PROC-002.
- Is the sync mechanism's design (conflict handling, cross-repo git identity) decided by this record? No — explicitly out of scope. Resolved separately in AIF-ARCH-004.
