---
name: 'test-execution'
version: '0.4.1'
description: 'Writes and executes automated tests, producing a Test Results Report with pass/fail/blocked status.'
---

## Purpose

Writes and executes automated tests validating a Task's implementation against its governing plan.
Produces a structured report showing pass/fail/blocked status per test case with failure analysis. Applies the testable-by-design principle from `steering/engineering/core.md`.

---

## Inputs

- **Governing plan** — the Feature Plan's Acceptance Criteria and Error States sections (`skills/feature-planning/reference/template.md`), plus a Task-level plan's own test-case detail when the Task's complexity tier produced one
- **Source code** — approved implementation to test
- **Language standards** — testing conventions from `standards/{stack}.md`
- **Project standards** — test project structure from `projects/{name}/project-standards.md`

---

## Steps

### Step 1 — Read the Governing Plan

Understand every test case before writing any tests. Identify:

- Which functions contain pure logic that can be unit tested directly
- Which behaviours require I/O and need integration tests
- Shared setup opportunities to extract into `tests/helpers/`

### Step 2 — Set Up Test Structure

Create or verify the test directory structure:

```
tests/
├── helpers/        ← Shared fixtures, factories, setup/teardown
├── unit/           ← Pure logic tests (no I/O)
├── integration/    ← Tests requiring filesystem, network, or processes
└── validation/     ← Repo/environment integrity checks
```

Category definitions:

- **Unit** — zero side effects. No filesystem reads/writes, no network, no child processes. Input is data, output is data.
- **Integration** — exercises real I/O (temp directories, actual file writes, subprocess invocation). Uses shared fixtures for setup/teardown.
- **Validation** — verifies the real repository or environment is well-formed (schema checks, cross-reference integrity). Runs against actual project files.

If shared fixtures already exist in `tests/helpers/`, use them. If new shared setup is needed, add it there — not inline in test files. Fixtures should be composable: callers pass options, helpers handle mechanics.

### Step 3 — Design for Unit Testability

Before writing tests, assess whether the source code exposes pure functions that can be tested in isolation:

- If yes: write unit tests in `tests/unit/` with plain data inputs
- If the module mixes logic with I/O: recommend refactoring to the implementation agent (extract pure functions, compose with thin I/O layer). Write integration tests for the current shape, note the refactoring opportunity as a finding.
- Integration tests go in `tests/integration/`

### Step 4 — Write Test Cases

Rules:

- Each test verifies one distinct behaviour or boundary
- Do not write tests that duplicate coverage from another test
- Do not write separate tests for trivially implied outcomes
- Name tests by what the system does, not how:
  - Good: `"resolves servers from agent tools"`
  - Bad: `"regex matches @-prefixed strings"`
- `describe` blocks group by function or feature; `it` blocks describe the scenario
- Use shared fixtures from `tests/helpers/` for setup/teardown
- Follow naming conventions in the active standards file
- Every public method needs at least one happy-path test and one
  failure/edge-case test — write these before marking the corresponding
  acceptance criterion as passing

### Step 5 — Run All Tests

Execute the full test suite. Do not stop at the first failure. Never modify
source code just to make a test pass: if a test reveals a genuine defect, fix
the defect; if the test itself is wrong, fix the test and document why — never
silently weaken either just to get green.

```bash
# Run by category for fast feedback:
node --test "tests/unit/**/*.test.js"           # Fast, no I/O
node --test "tests/integration/**/*.test.js"    # I/O tests
node --test "tests/validation/**/*.test.js"     # Repo checks
node --test "tests/**/*.test.js"                # Everything
```

### Step 6 — Produce Test Results Report

Write the report using the template at `skills/test-execution/reference/template.md`.
Classify each result and provide failure analysis.

---

## Outputs

- **Test files** — written to the correct category directory per the structure above
- **Shared fixtures** — new helpers added to `tests/helpers/` if needed
- **Test Results Report** — markdown following the template format

---

## Edge Cases

- **Test cannot pass without source code change** — classify as Failed, assess whether it's a code bug, test bug, or plan ambiguity. Recommend action.
- **Test case cannot be implemented as written** — classify as Blocked with explanation. Never silently skip.
- **External dependency required** — if a test needs infrastructure not available, mark Blocked and explain what's needed.
- **Pure logic buried in I/O code** — write the integration test but raise a finding recommending extraction of pure functions for unit testability.
- **Redundant test case in plan** — if two planned test cases verify the same behaviour, implement one and note the redundancy in the report.
