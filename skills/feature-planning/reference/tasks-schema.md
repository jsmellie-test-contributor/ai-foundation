# tasks.json Schema

The Task decomposition for a Feature is stored as a `tasks.json` file alongside the
Feature Plan. This file is the machine-parseable source of truth for the dependency
graph consumed by the DAG server tools (`dag-validate`, `dag-compute-waves`).

Start from the template at `skills/feature-planning/assets/tasks.json`.

---

## Location

```
{paths.features}/{FeatureID}/tasks.json
```

Resolved from `.aiconfig.json` at project root. Default: `plans/features/` — sibling to the Feature Plan (`plan.md`) itself.

---

## Fields

### Top-level

| Field        | Type   | Required | Description                        |
| ------------ | ------ | -------- | ---------------------------------- |
| `feature_id` | string | Yes      | Parent Feature ID for traceability |
| `tasks`      | array  | Yes      | Array of Task definitions          |

### Task object

| Field        | Type     | Required | Description                                                              |
| ------------ | -------- | -------- | ------------------------------------------------------------------------ |
| `id`         | string   | Yes      | Unique Task identifier (e.g., "001", "002")                              |
| `title`      | string   | Yes      | Short descriptive title                                                  |
| `depends_on` | string[] | Yes      | Array of Task IDs this Task depends on. Empty array for no dependencies. |

There is no `agents` field — every Task is owned end-to-end by one Software-Engineer
dispatch (see the work hierarchy in `docs/process-model.md`). Re-add a selector field
only if a second implementing agent role is ever introduced.

---

## Rules

- Every `depends_on` reference must point to an existing Task `id` in the same file.
- The dependency graph must be acyclic (no circular dependencies).
- Task IDs must be unique within the file.
- Run `dag-validate` against the file before marking the Feature as decomposed.

---

## Example

```json
{
  "feature_id": "MYAPP-001",
  "tasks": [
    {
      "id": "001",
      "title": "Data models and migrations",
      "depends_on": []
    },
    {
      "id": "002",
      "title": "API service layer",
      "depends_on": []
    },
    {
      "id": "003",
      "title": "Controller and routing",
      "depends_on": ["001", "002"]
    },
    {
      "id": "004",
      "title": "Integration tests",
      "depends_on": ["003"]
    }
  ]
}
```

This produces three execution waves:

- **Wave 1:** 001, 002 (parallel — no dependencies)
- **Wave 2:** 003 (depends on 001 + 002)
- **Wave 3:** 004 (depends on 003)
