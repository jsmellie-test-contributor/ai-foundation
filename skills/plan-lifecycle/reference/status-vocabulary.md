# Status Vocabulary

Single source of truth for the `Status` field values used by every human-approval-gated artifact. Producing skills and agents reference this table in their templates rather than defining their own status list.

## Core statuses (all artifact types)

| Status     | Meaning                                                                                           | Dependent work allowed?                                       |
| ---------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `Draft`    | Still being written or under revision. Not yet reviewed, or review is in progress.                | No                                                            |
| `Approved` | Human explicitly confirmed, and that confirmation is committed to git.                            | Yes — this is the only status that satisfies an approval gate |
| `Done`     | The work the artifact describes has been completed.                                               | N/A — informational only                                      |
| `Deferred` | Human explicitly chose to postpone a decision on this artifact, rather than approve or reject it. | No                                                            |

`In Progress` is deliberately not a status value. Whether an artifact's work is actively underway is answered by the orchestration state file (`{paths.features}/{FeatureID}/orchestration-state.json`), not by the plan's own status field — keeping "is this being worked on right now" in exactly one place avoids two sources of truth drifting out of sync.

## Per-artifact-type extensions

| Artifact Type | Allowed Statuses                                      | Notes                                                                                                                                                      |
| ------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Feature Plan  | `Draft`, `Approved`, `Done`, `Deferred`               | No extension needed                                                                                                                                        |
| Tier 3 plan   | `Draft`, `Approved`, `Done`, `Deferred`               | No extension needed                                                                                                                                        |
| ADR           | `Draft`, `Approved`, `Done`, `Deferred`, `Superseded` | `Superseded`: a later decision replaced this one. This is a terminal outcome reached after the record was `Approved`, not a choice made at initial review. |

## Transitions

- `Draft` → `Draft` (revision, new commit each time)
- `Draft` → `Approved` (human confirms; commit the transition)
- `Draft` → `Deferred` (human postpones; commit the transition)
- `Deferred` → `Draft` (revisited later) or `Deferred` → `Approved` (approved directly from a deferred state)
- `Approved` → `Done` (described work completes)
- `Approved` → `Superseded` (ADRs only, when a later decision replaces this one)

## Checking whether dependent work may proceed

Always check for `Status: Approved` specifically. Do not write special-case logic for `Deferred`, `Draft`, or any other non-`Approved` value — their absence from `Approved` is sufficient on its own to block dependent work.
