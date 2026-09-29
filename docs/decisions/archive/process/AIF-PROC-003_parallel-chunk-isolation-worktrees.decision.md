# Decision Record: Parallel Chunk Isolation Mechanism (Git Worktrees)

## Metadata

| Field          | Value                                                             |
| -------------- | ----------------------------------------------------------------- |
| Decision ID    | AIF-PROC-003                                                      |
| Project        | ai-foundation                                                     |
| Tier           | A                                                                 |
| Domain         | process                                                           |
| Status         | Deferred                                                          |
| Author (Agent) | Architect                                                         |
| Approved By    | Pending                                                           |
| Created        | 2026-08-13                                                        |
| Referenced By  | —                                                                 |
| References     | AIF-PROC-002, AIF-PROC-005                                        |
| Tags           | worktrees, orchestration, parallel-dispatch, chunk-isolation, git |

---

> **Archived** (process-model check 27, 2026-09-25): `Deferred` at check 26 (human call,
> this migration); dropped from MADR conversion per its row in `docs/process-model.md`'s
> Decision-record disposition table. Kept here as historical record — not converted to
> MADR.

## Problem Statement

AIF-PROC-002 confirmed that AI-track and software-track chunks both dispatch through Engineering-Manager, and AIF-PROC-005 confirmed that any Engineering-Manager-orchestrated chunk (either track) branches, regardless of `repo_type`. For wave-based parallel dispatch (`orchestration.max_concurrent`) to actually work, multiple agents must be able to implement, test, and review different chunks of the same Epic at the same time without stepping on each other's working directory or branch state.

`skill/worktree-management` and Engineering-Manager's hard rules already specify git worktrees as the mechanism for this, but no Decision Record has ever evaluated that choice against alternatives — it was built directly into the skill without being ratified. This record closes that gap explicitly, now that AIF-004/AIF-PROC-002/AIF-PROC-005 make concurrent orchestrated work (including real CLI code chunks) a live path rather than a theoretical one.

---

## Constraints & Requirements

What was non-negotiable:

- Each concurrently-dispatched chunk must have an isolated working directory and branch — no two agents may operate in the same directory or on the same branch simultaneously.
- The mechanism must work on the project's actual environment: Windows via Git Bash (per the shell tool's documented constraints), no assumption of a container runtime or CI system.
- Must not silently reduce actual parallelism (defeating the purpose of wave-based dispatch) in order to achieve isolation.

What was a preference but not a hard requirement:

- Minimize disk and setup time per concurrently active chunk.
- Reuse what already exists (`skill/worktree-management`) rather than introduce new infrastructure, unless a concrete gap is identified.

---

## Options Explored

### Option A: Git worktrees (current `skill/worktree-management` design)

**Summary**: One `git worktree add <path> -b <branch> main` per dispatched chunk.
Each chunk gets its own directory, checked out to its own branch, sharing the same `.git` object database. Subagents work exclusively inside their worktree directory.
**Strengths**: Purpose-built git feature for this exact problem. Cheap to create — shares the object store, so N worktrees cost far less disk than N full clones.
Already fully specified end-to-end in `skill/worktree-management` and required by Engineering-Manager's hard rules — no new build needed, only formal ratification.
**Weaknesses**: All worktrees share one `.git` directory, so concurrent git metadata writes (ref updates, packed-refs) carry a theoretical race risk if two worktrees are created at the exact same instant. Each worktree needs its own `npm install` (no dependency-install sharing). A corrupted `.git` (e.g. a stale lock file) can affect every worktree at once since the metadata is shared.
**Verdict**: Chosen — see Decision below.

### Option B: Separate full clones per chunk

**Summary**: `git clone` the repo independently for each active chunk instead of using worktrees.
**Strengths**: True isolation at the `.git` metadata level — no shared object store, so no race surface at all.
**Weaknesses**: Full clone per chunk costs materially more disk and time than a worktree, with no corresponding benefit here — clones still require their own `npm install`, which is the actual cost driver, not `.git` metadata. Loses the unified `ai-git worktree list` / `prune` bookkeeping the current design relies on for stale-worktree detection (`worktree-management` Step 5).
**Verdict**: Not chosen — pays a real cost to solve a risk that isn't the bottleneck.

### Option C: Serialize chunk dispatch (no true parallelism)

**Summary**: Drop concurrent execution — Engineering-Manager dispatches one chunk at a time to a single working directory, completing its full pipeline before starting the next.
**Strengths**: No worktree or branch mechanics required at all.
**Weaknesses**: Defeats the purpose of wave-based orchestration and `orchestration.max_concurrent`, which exist specifically so independent chunks in a wave run simultaneously. This is not a real trade-off since Option A already provides isolation without sacrificing parallelism.
**Verdict**: Not chosen — abandons the capability the question is asking to enable, for no gain that Option A doesn't already provide.

### Option D: Containerized isolation per chunk (e.g. ephemeral container per chunk)

**Summary**: Run each chunk's agent work inside its own container (or VM), each with its own clone/worktree, for stronger isolation than the filesystem/branch level.
**Strengths**: Strongest isolation — protects against port collisions, dependency side effects, or other host-level interference between concurrently running agents.
**Weaknesses**: Substantial new infrastructure (container runtime, image maintenance, orchestration wiring) with no evidence of a concrete gap — no test suite in this repo spins up long-running servers or touches shared host state that worktree-level isolation wouldn't already handle. Heavyweight for a local Windows/Git-Bash workflow with no other containerized tooling in the repo. Would require its own Decision Record and Epic before it could be used, blocking the concurrency capability needed now.
**Verdict**: Not chosen — solves a problem not yet observed, at a cost disproportionate to the current environment.

---

## Decision

**Chosen approach**: Option A — git worktrees, as already specified in `skill/worktree-management` and required by Engineering-Manager's hard rules. This Decision Record formally ratifies that existing design rather than changing it.

**Rationale**:
The mechanism this question asks for already exists and is already wired into the orchestration pipeline — the gap was that it had never been evaluated against alternatives in a Decision Record. Option A's one real risk (concurrent `.git` metadata writes) is already mitigated by how `chunk-orchestration` Step 2 is written: worktree creation happens inside Engineering-Manager's own dispatch loop, one chunk at a time, and a chunk is only handed to a subagent after its worktree is confirmed created. Worktree creation itself is therefore never actually concurrent — only the subagents' post-creation implementation/test/review work runs in parallel across isolated directories. That is the correct place for serialization to live:
the cheap, fast git operation stays sequential; the expensive, slow agent work runs in parallel.

**Trade-offs accepted**:

- Each concurrently active chunk pays its own `npm install` cost (disk + time).
  Already an accepted, documented edge case in `skill/worktree-management` ("Disk space insufficient for worktree setup" → chunk `Blocked`). Can be optimized later (e.g. shared npm cache) without changing the underlying architecture.
- Shared `.git` metadata across worktrees means a corrupted lock file could, in principle, affect multiple active chunks at once. Mitigated by `worktree-management`'s existing lock-file edge case (`ai-git worktree unlock`)
  and by the fact that worktree creation is already serialized, minimizing the window in which this could occur.

---

## Design

No new design — this record ratifies the mechanism already specified in:

- `skills/worktree-management/SKILL.md` (creation, setup, teardown, startup validation)
- `agents/engineering-manager.yaml` hard rules ("EVERY CHUNK GETS ITS OWN BRANCH AND WORKTREE. This is non-negotiable.")
- `skills/chunk-orchestration/SKILL.md` Step 2 (serialized worktree creation preceding parallel subagent dispatch, bounded by `orchestration.max_concurrent`)

No changes to these files are required as a result of this decision.

---

## Impact on Planning

- None — this ratifies existing, already-implemented behavior. No follow-up Epic or Chunk Plan is required for Decision 1 (git worktrees) itself.
- Any future optimization (e.g. shared dependency-install cache across worktrees to reduce per-chunk `npm install` cost) would be its own separate, optional improvement — not required by this decision.

---

## Resolved Items

| #   | Item                                                                                             | Resolution                                                                                                                                                                                                           |
| --- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | What mechanism enables multiple agents to work on different chunks of the same Epic in parallel? | Git worktrees — one per dispatched chunk, per the existing `skill/worktree-management` design.                                                                                                                       |
| 2   | Does concurrent worktree creation risk racing on shared `.git` metadata?                         | No in practice — `chunk-orchestration` Step 2 creates worktrees sequentially inside Engineering-Manager's own dispatch loop before handing each chunk to a subagent; only post-creation agent work runs in parallel. |
| 3   | Is container-level isolation needed?                                                             | Not currently — no observed requirement (no long-running servers, no shared host state touched by test suites) justifies the added infrastructure cost. Revisit if that changes.                                     |
