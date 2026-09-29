---
name: 'worktree-management'
version: '0.2.0'
description: 'Manages git worktree lifecycle for parallel agent isolation — creation, setup, and teardown.'
---

## Purpose

Provides the Engineering Manager with a structured procedure for creating, configuring, and cleaning up git worktrees. Each dispatched Task gets its own worktree so that parallel agents work in isolated directories without branch conflicts.

---

## Inputs

- **`.aiconfig.json`** — for `paths.worktrees`, `project_shortname` (falls back to `project_name`), and `ai_identity`
- **Feature ID** — parent Feature for directory grouping
- **Task ID** — identifies the specific Task
- **Branch name** — the branch to create/checkout in the worktree (e.g. `MYAPP-001/001-add-user-service`)
- **Short description** — used in the directory name

---

## Steps

### Step 1 — Resolve Worktree Path

1. Read `.aiconfig.json` from the project root
2. Read `paths.worktrees` — default: `../worktrees/{project_shortname}` (relative to repo root; `project_shortname` falls back to `project_name` if unset)
3. Construct the worktree directory:
   ```
   {worktrees_base}/{feature-id}/{task-id}-{short-description}
   ```
4. If `{project_shortname}` appears in the configured path as a literal placeholder, substitute with the actual `project_shortname` value from `.aiconfig.json` (or `project_name` if unset)

Example resolution:

- Config: `paths.worktrees: "../worktrees/myapp"`
- Feature: `MYAPP-001`, Task: `001`, Description: `add-user-service`
- Result: `../worktrees/myapp/MYAPP-001/001-add-user-service`

### Step 2 — Create Worktree

1. Verify the target path does not already exist. If it does:
   - Check if it is a valid worktree for the expected branch (`ai-git worktree list`)
   - If valid and on the correct branch, skip creation (resume scenario)
   - If stale or on wrong branch, run `ai-git worktree remove <path> --force` first
2. Create the branch and worktree:
   ```bash
   ai-git worktree add <path> -b <branch-name> main
   ```
   This creates a new branch from `main` and checks it out in the worktree directory.
3. If the branch already exists (e.g. resuming after a block):
   ```bash
   ai-git worktree add <path> <branch-name>
   ```
4. Verify creation succeeded: confirm the path exists and `ai-git worktree list` includes it.

### Step 3 — Setup Worktree

Install dependencies so the agent can build and test in the worktree:

1. Change working directory to the new worktree path
2. Detect project type and run the appropriate install:
   - `package.json` exists → `npm install`
   - `package-lock.json` exists → `npm ci` (preferred over `npm install`)
   - `requirements.txt` exists → `pip install -r requirements.txt`
   - `go.mod` exists → `go mod download`
   - No recognized file → skip (log a warning)
3. Verify the install succeeded (exit code 0)
4. Return the worktree path to the caller

### Step 4 — Teardown Worktree

Called after the human confirms the PR is merged:

1. Verify the worktree path exists
2. Remove the worktree:
   ```bash
   ai-git worktree remove <path>
   ```
3. If removal fails (locked or dirty):
   ```bash
   ai-git worktree remove <path> --force
   ```
4. Delete the merged branch (optional, only if confirmed merged):
   ```bash
   ai-git branch -d <branch-name>
   ```
   Use `-d` (not `-D`) so git refuses if the branch is not fully merged.
5. Clean up empty parent directories (e.g. if all Tasks in a Feature are torn down, remove the empty Feature directory)

### Step 5 — Validate Existing Worktrees (Startup Check)

On orchestration startup (before dispatching any new Tasks):

1. Run `ai-git worktree list` to see all active worktrees
2. Cross-reference with the orchestration state file:
   - Worktrees in state with status `Done` that still exist → teardown candidates (PR may not be merged yet — leave them, but log)
   - Worktrees on disk not in state → stale, log a warning for human
3. Run `ai-git worktree prune` to clean up any worktrees whose directories were manually deleted

---

## Outputs

- **Worktree path** — absolute or relative path to the created worktree directory
- **Success/failure status** — for each lifecycle operation
- **Warnings** — for stale worktrees or failed cleanups

---

## Edge Cases

- **Path already exists but is not a worktree** — refuse to overwrite. Log error and mark Task as `Blocked` with reason "Worktree path conflict: directory exists but is not a git worktree."
- **Worktree creation fails (branch already checked out elsewhere)** — git prevents two worktrees from having the same branch checked out. If this happens, find and remove the stale worktree first.
- **Windows path length** — if the constructed path exceeds 240 characters, log a warning. Consider shortening the description segment or using a flatter structure.
- **Disk space** — if `npm install` or equivalent fails due to disk space, mark Task as `Blocked` with reason "Disk space insufficient for worktree setup."
- **Worktree lock files** — if `.git/worktrees/<name>/locked` exists from a crashed process, run `ai-git worktree unlock <path>` before attempting removal.
- **Human deletes worktree directory manually** — `ai-git worktree prune` in Step 5 handles this gracefully.
- **Resume after crash** — Step 2 handles the case where the worktree already exists. The orchestrator can re-dispatch to an existing worktree without recreating it.
