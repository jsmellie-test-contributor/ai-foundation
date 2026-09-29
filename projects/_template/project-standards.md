# Project Standards Template

> Copy this file to `projects/{ProjectName}/project-standards.md` and fill it in.

This file defines overrides and additions specific to one project.
It is composed on top of the universal schema and the language standards file.

---

## Project Identity

| Field        | Value          |
| ------------ | -------------- |
| Project Name | {ProjectName}  |
| Organization | {Organization} |
| Language     | {Language}     |
| Module ID    | {ModuleID}     |
| Repository   | {Repository}   |
| Created      | {YYYY-MM-DD}   |

**Module ID** is the language-specific package or module identifier for this project.
Examples: npm scope (`@org/package`), Go module (`github.com/org/repo`), Rust crate name, Python package name, .NET root namespace (`Company.Project`), Java group ID (`com.company.project`).

Standards for this project are configured in `.aiconfig.json` under the `standards` field.

---

## Project-Specific Naming Conventions

Only list overrides or additions to the base standards file.
If the base standards file already covers it, do not repeat it here.

| Construct   | Convention | Example | Reason for Override |
| ----------- | ---------- | ------- | ------------------- |
| {construct} | {rule}     | {ex}    | {why different}     |

---

## Project-Specific Folder Structure Additions

Only document additions or deviations from the base standards layout.

```
{ProjectName}/
└── {AdditionalFolder}/    ← Purpose: {why this exists}
```

---

## Project-Specific Dependencies

List the packages approved for this project.
The Coder agent must not add packages not listed here without a plan update.

| Package       | Version | Purpose               |
| ------------- | ------- | --------------------- |
| {PackageName} | {x.y.z} | {What it is used for} |

---

## Project-Specific Security Rules

Add rules specific to this project's data sensitivity, user base, or domain.
These add to the universal and language-level security rules — they do not replace them.

- [ ] {Rule specific to this project}

---

## Project-Specific Logging Rules

| Event           | Level   | What is logged | What is NOT logged |
| --------------- | ------- | -------------- | ------------------ |
| {project event} | {level} | {safe fields}  | {excluded fields}  |

---

## Project-Specific Testing Rules

Any additions to the base testing standards — e.g. required integration test scenarios, specific data fixtures, or environment setup requirements.

---

## Release Documentation

Optional. Leave "Keeps a CHANGELOG?" as `No` (or delete this section) unless this project
actually ships versioned releases where a human-facing changelog earns its keep — most
projects don't need one, and an unmaintained CHANGELOG is worse than none. Software-Engineer
follows this section as part of the active standards file; no separate opt-in mechanism exists.

| Field              | Value                                                         |
| ------------------ | ------------------------------------------------------------- |
| Keeps a CHANGELOG? | {Yes / No — default No}                                       |
| Location           | {e.g. `CHANGELOG.md` at repo root}                            |
| Format             | {e.g. Keep a Changelog — keepachangelog.com}                  |
| Entry trigger      | {e.g. every Task with user-facing impact; every version bump} |

---

## Known Constraints & Decisions

Technical decisions and constraints are stored as MADR-format ADRs in `knowledge/decisions/` — see `steering/engineering/document-types.md` for what belongs there and `skill/plan-lifecycle` for the draft-to-approved procedure.

---

## Out of Bounds

Explicit list of things that must never appear in this project's plans or code, regardless of what any agent reasons.

- {e.g. No external network calls without explicit plan approval}
- {e.g. No third-party analytics or telemetry}
- {e.g. No cloud storage of user data in v1}
