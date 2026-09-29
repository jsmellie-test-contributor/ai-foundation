# Decision Record: Standards Push/Pull/Sync Mechanism

## Metadata

| Field          | Value                                                                   |
| -------------- | ----------------------------------------------------------------------- |
| Decision ID    | AIF-ARCH-004                                                            |
| Project        | ai-foundation                                                           |
| Tier           | A                                                                       |
| Domain         | architecture                                                            |
| Status         | Deferred                                                                |
| Author (Agent) | Architect                                                               |
| Approved By    | Pending                                                                 |
| Created        | 2026-08-13                                                              |
| Referenced By  | —                                                                       |
| References     | AIF-PROC-004                                                            |
| Tags           | standards-sync, cli, filesystem-sync, config-schema, conflict-detection |

---

> **Archived** (process-model check 27, 2026-09-25): `Deferred` at check 26 (human call,
> this migration); dropped from MADR conversion per its row in `docs/process-model.md`'s
> Decision-record disposition table. Kept here as historical record — not converted to
> MADR.

## Problem Statement

AIF-PROC-004 settled _who_ implements the standards push/pull/sync feature from `PLAN.md` (v1.3) — split between Software-Engineer (CLI mechanism) and AI-Engineer (schema/docs) — but explicitly deferred _how the mechanism works_, flagging it as a required follow-up given the risk of a tool that can write into a repo other than the one it's currently running in. This record resolves that design.

Confirmed context (human input, this session):

- `ai-foundation` will always be cloned locally alongside project repos, for the foreseeable future — no artifactory, no requirement to support a machine that only has the project repo checked out. Team growth is handled by every member cloning `ai-foundation` locally, not by a hosted package registry.
- Pushing a **brand-new** standard (one that doesn't yet exist in `ai-foundation`)
  must be in scope for v1 — projects are expected to be where new frameworks/stacks get integrated first, making them the most likely origin of new standards, not just refinements of existing ones.

---

## Constraints & Requirements

What was non-negotiable:

- Must not require network access, hosted PR automation, or cross-repo git credentials — the local-sibling-clone assumption is confirmed and should be exploited to keep the mechanism simple.
- Must not create a new commit-authority path. Any change that lands in `ai-foundation` still goes through the same human-approval gate every other change there goes through (`skill/complexity-tiers` + `skill/plan-lifecycle`) — the sync tool moves file content, it never commits on `ai-foundation`'s behalf.
- Must support pushing an entirely new standard, not just updating an existing one.
- Must detect and refuse silent overwrites when both sides changed since the last sync (no auto-merge).
- Must reuse existing hash/diff infrastructure (`lib/snapshot/pure.js`) rather than building parallel logic.

What was a preference but not a hard requirement:

- Command surface should match the existing CLI's shape (`lib/commands/`, same argument-parsing conventions as `install`/`status`/`list`).

---

## Options Explored

### Option A: Local filesystem sync, no auto-commit (recommended)

**Summary**: `pull`/`push` operate purely as local file copies between two paths on the same machine — the project repo and a configured local path to the `ai-foundation` clone. Neither direction touches git directly; each side's own existing commit workflow picks up the resulting working-tree change.
**Strengths**: No cross-repo git credentials or PR automation needed at all — eliminates the entire risk category AIF-007 flagged as needing resolution. Reuses `diffSnapshot`/`isFreshnessCurrent` unchanged. Small, auditable implementation surface (file copy + hash bookkeeping). Commit authority never moves — every landed change is still a normal, human-reviewed commit in whichever repo it lands in.
**Weaknesses**: Depends on the sibling-clone assumption holding — confirmed true for now, but would need Option B-style work later if that ever changes (e.g. CI runners without a local `ai-foundation` clone). A pushed change that nobody notices and commits in `ai-foundation`'s working tree is inert, not actively synced — requires clear CLI output telling the human what to do next.

### Option B: Remote/git-based sync with automated PR creation

**Summary**: `pull` fetches file content over the network (raw fetch or a temp shallow clone); `push` uses `ai-git` to create a branch, commit, and PR directly against the real `ai-foundation` remote.
**Strengths**: Works without a local `ai-foundation` clone; produces a reviewable PR automatically, which is a stronger built-in review signal than "an uncommitted file sitting in a working tree."
**Weaknesses**: Solves a problem that's been explicitly ruled out for the foreseeable future (no artifactory, always-local-clone). Requires resolving exactly the cross-repo git-identity and PR-governance questions AIF-007 flagged — commit authority moving across repos is a materially larger risk surface. Meaningfully larger v1 scope for a capability with no near-term need.
**Verdict**: Not chosen now — revisit if the local-clone assumption ever stops holding (e.g. CI-driven sync, or a future artifactory). Not deleted as a future option, just deferred.

### Option C: Version-pinned pull only, no automated push

**Summary**: Projects pin a version/tag of `ai-foundation`'s standards; `pull` is a tag-based re-copy. Contributing a new or improved standard back is entirely manual — a human edits `ai-foundation` directly, not tooled from within a project.
**Strengths**: Simplest possible implementation — no push mechanism to design at all.
**Weaknesses**: Directly contradicts the now-confirmed requirement that pushing new standards, sourced from project work, must be supported — this option doesn't build that. Re-narrows the feature the same way AIF-007's rejected Option C did.
**Verdict**: Not chosen — fails a stated requirement.

---

## Decision

**Chosen approach**: Option A — local filesystem sync between a project repo and a locally-cloned `ai-foundation`, with no automated git commit on either side.

**Rationale**: Every constraint in this record points at Option A: the sibling-clone assumption is confirmed indefinitely, network/PR automation solves a problem that doesn't currently exist, and keeping commit authority exactly where it already lives avoids inventing new governance rather than reusing what AIF-PROC-001/ `skill/plan-lifecycle` already established. The only real cost — a human needs to notice and commit the resulting working-tree change — is a UX concern (clear CLI output), not an architectural one.

**Trade-offs accepted**:

- If the sibling-clone assumption is ever invalidated (artifactory, CI-driven sync, contributors without a local `ai-foundation` clone), this mechanism needs a v2 extension along the lines of Option B. Not a blocker now; flagged for future revisit if that happens.
- A `push` that lands in `ai-foundation`'s working tree but is never noticed/ committed is silently inert. Mitigated by CLI output design (see below), not by the sync mechanism itself.

---

## Design

### Configuration

New `.aiconfig.json` field: `ai_foundation_path` — path to the local `ai-foundation` clone, resolved relative to the project root. Default convention if unset: `../ai-foundation` (sibling directory), matching the existing `paths.worktrees` sibling-path convention. Overridable per project.

New `.aiconfig.json` field: `paths.standards` — where a project's synced standard copies live, default `standards/`. Distinct from `project_standards` (which remains a single override file, unsynced, hand-maintained).

### Sync state tracking

New sidecar file per repo, `.standards-sync.yaml` (gitignored, same treatment as `.installs.yaml`), recording per standard name: the hash of its content as of the last successful sync. Computed and compared via the existing `diffSnapshot`/`isFreshnessCurrent` functions in `lib/snapshot/pure.js` — no new hashing logic.

### Conflict rule (applies to both directions)

Given source hash (at last sync), and current hashes on both sides:

- Only the _remote_ side (the one being pulled/pushed _from_) changed → clean copy, update both sides' sync-state hash.
- Only the _local_ side changed → no-op (nothing new to pull/push), or in the `push` direction, this **is** the change being pushed — proceed.
- Both changed since last sync → refuse. Report both file paths and both hashes.
  Human resolves manually (edit one side, re-run). No auto-merge.

### New-standard handling (push only)

If the pushed standard name does not exist in `ai-foundation`'s `standards/` directory:

- No baseline hash exists — treat as an unconditional add, not a conflict case.
- Validate front-matter (`name`, `tags`, `depends_on`) against the schema documented in `AGENTS.md` / enforced by `tests/validation/schemas.test.js` **before** writing the file into `ai-foundation`'s working tree — a malformed standard should not land even as an uncommitted change.
- Check for a name collision against `resolver.js`'s existing `listStandards()` output (case-insensitive) — refuse if a differently-scoped standard already uses that filename.

### Command surface

`lib/commands/`, alongside `install`/`status`/`list`:

- `aif pull --standard <name> | --all`
- `aif push --standard <name> | --all`

Both print an explicit next-step message rather than silently succeeding:

- `pull`: confirms the file was written into the project's `paths.standards` directory; reminds the human it's an uncommitted change in _this_ repo.
- `push`: confirms the file was written into `ai-foundation`'s working tree at `{ai_foundation_path}`; explicitly states it has **not** been committed, and that it needs to go through `ai-foundation`'s normal AI-Engineer/plan-lifecycle process before landing.

### Explicit non-goals (v1)

- No automatic propagation of a pushed standard to _other_ projects — each project pulls independently, on its own schedule.
- No automated commit, PR, or notification in `ai-foundation` triggered by `push` — purely a file-content handoff.
- No support for syncing without a local `ai-foundation` clone (see Option B, deferred).

---

## Impact on Planning

- Tech-Lead can now decompose the Epic from AIF-007 with this mechanism as the binding design for the software-track chunk(s): new `lib/commands/pull.js` / `push.js` (or a combined `sync.js`), sync-state file handling, conflict detection, new-standard validation path, and their tests.
- AI-Engineer's chunk (per AIF-007) now has concrete scope: add `ai_foundation_path` and `paths.standards` to the `.aiconfig.json` schema in `AGENTS.md`, and document the push/pull workflow (likely a new skill, e.g. `skill/standards-sync`, describing when/how an agent or human should run these commands and what to do with an unstaged `push` landing in `ai-foundation`).
- No further Architect engagement is required before Tech-Lead writes the Epic Plan, unless decomposition surfaces a new cross-cutting question.

---

## Resolved Items

| #   | Item                                                   | Resolution                                                                                                                                                                   |
| --- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Does sync require network/cross-repo git credentials?  | No — local filesystem copy between a project repo and a locally-cloned `ai-foundation`, per the confirmed always-local-clone assumption.                                     |
| 2   | Who/what commits a pushed change into `ai-foundation`? | Nobody, automatically. `push` stages the file in `ai-foundation`'s working tree only; a human/AI-Engineer commits it through the existing, unchanged governance process.     |
| 3   | Is pushing a brand-new standard in scope for v1?       | Yes — treated as an unconditional add (no baseline hash to conflict against), gated by front-matter schema validation and a name-collision check before the file is written. |
| 4   | How are conflicting concurrent edits handled?          | Refused outright if both sides changed since the last recorded sync hash — no auto-merge, human resolves manually.                                                           |
