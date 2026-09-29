---
name: 'adr-authoring'
version: '0.1.0'
description: 'Writes an Architecture Decision Record in MADR format — frontmatter shape, section order, word budget, the litmus test for what belongs in the record vs. arc42, and supersession mechanics.'
---

## Purpose

Guides an agent through writing a single ADR by hand, in plain MADR, and deciding
what belongs in it versus what belongs in `docs/architecture/` instead. There is no
tooling enforcing any of this (`docs/process-model.md`'s "ADR tooling — not needed for
the proof of concept") — this skill and Principal-Engineer review are the only gates.

---

## Inputs

- **The decision to record** — a real fork with genuine options and trade-offs, not a
  routine choice already covered by an existing standard or pattern
  (`steering/engineering/core.md`: "Escalate Technical Approach Uncertainty to Architect")
- **Prior ADRs** — `docs/decisions/index.json`, to check whether this decision
  supersedes one of them
- **`docs/architecture/`** — to know what already exists there, so Design content
  doesn't get duplicated across both homes

---

## Steps

### Step 1 — Confirm this is ADR-worthy

Apply the litmus test: **why this path won**, not **how the system works**. If the
question is actually "how does X work" with no real fork, it belongs in the relevant
arc42 section instead — writing an ADR for it would fail Step 4's word budget by
construction, because there's no decision to compress, only a description to relocate.

### Step 2 — Assign the ID and filename

One flat counter across `docs/decisions/`, no subfolders, no domain prefix. Take the
next unused zero-padded number after the highest one currently on disk (`0007`, not
`AIF-ARCH-007`) and build the filename as `{NNNN}-{kebab-case-slug}.md` — the slug is
a short paraphrase of the title, not the full title itself.

### Step 3 — Write the frontmatter

```yaml
---
status: proposed # proposed | rejected | accepted | deprecated | superseded
date: 2026-09-25
decision-makers: [Jeremy]
tags: [tag-one, tag-two]
links:
  supersedes: [] # bare numbers of ADRs this one replaces, e.g. ["0003"]
affects:
  - lib/some-module.js
  - some-dir/**
---
```

- `status` is MADR's own field, a different vocabulary from `skill/plan-lifecycle`'s
  status-vocabulary.md — the two aren't in conflict, they answer different questions
  at different layers. status-vocabulary.md's Draft/Approved gate ("has a human
  confirmed this, checkably in git") still governs whether this ADR may be relied on:
  `proposed` is the gate's `Draft`, `accepted` is its `Approved` — nothing may depend
  on an ADR until it reaches `accepted`. `rejected`/`deprecated`/`superseded` are
  MADR-native outcomes with no equivalent in the generic vocabulary. Never write
  `deferred` — it isn't a MADR status; leave a not-yet-decided record at `proposed`.
- `decision-makers` is who approved it — the same person status-vocabulary.md's
  `Approved By` field named, just relocated into frontmatter.
- `links.related`/`links.amends` are reserved, not populated yet — see
  `docs/plans/adr-kit-plan.md` Phase 3. Only `links.supersedes` is live.
- `affects` is file globs/paths this decision binds, for future "what ADRs touch this
  file" lookup (`docs/plans/adr-kit-plan.md`) — best-effort now, not indexed or
  validated by anything yet.

### Step 4 — Write the body within budget

**150–350 words total, excluding frontmatter.** Sections, in order:

| Section                       | Cap                                                         |
| ----------------------------- | ----------------------------------------------------------- |
| Context and Problem Statement | 2–4 sentences                                               |
| Decision Drivers              | 3–6 bullets, fragments                                      |
| Considered Options            | one line each, 2–4 options                                  |
| Decision Outcome              | 2–4 sentences tied to the drivers                           |
| Consequences                  | 3–5 one-line bullets                                        |
| Pros and Cons of the Options  | optional; 2–3 bullets, only where a rejection isn't obvious |

Title is a plain `# {title}` H1 — not a frontmatter field.

**Never put in the record**: schemas, config tables, algorithms, code beyond a 3-line
illustration, migration/rollout steps, implementer detail, or open questions about how
the system will work. Route that to the relevant `docs/architecture/` section (create
it if it doesn't exist yet — arc42 sections are created lazily) or to the
Feature/ticket that will implement it. If the source material this ADR is drawn from
already has that detail written up elsewhere (an existing arc42 section, a plan doc),
point to it instead of repeating it — same "cite, don't restate" discipline as
everywhere else (`steering/engineering/core.md`: "Cite, Don't Restate").

### Step 5 — Handle supersession, if any

An accepted ADR is never edited once written — a reversal is always a new ADR, never a
status flip on the old one. If this ADR replaces an earlier one:

1. Set this ADR's `links.supersedes: ["{old-number}"]`.
2. Leave the old ADR's file completely untouched — its own `status` stays whatever it
   already was (almost always `accepted`), forever.
3. Do not hand-write anything on the old record. `superseded_by` is computed by
   `lib/decisions.js` by inverting every record's `links.supersedes` across the whole
   corpus, the same way `referenced_by` already inverts `References`/tags — a record
   that supersedes nothing simply has an empty `links.supersedes`, and a record nobody
   supersedes has an empty computed `superseded_by`.

This is also what retires the old `Amending`/Errata-ladder concept: there is exactly
one governed post-acceptance path now (`superseded`), not a ladder of amendment
tiers — see `docs/process-model.md`'s "ADR format — MADR" section for why.

### Step 6 — Regenerate the index

Run `aif index decisions` from the project root. Confirm `aif index decisions --check`
passes before presenting the ADR for review.

---

## Outputs

- One new `docs/decisions/{NNNN}-{slug}.md` file, `status: proposed` until a human
  confirms it (commit the `proposed` version first, per `skill/plan-lifecycle`'s
  commit-before-review discipline; commit the `accepted` flip as its own separate
  commit once confirmed)
- `docs/decisions/index.json` regenerated to include it
- Any Design content that didn't fit the budget, landed in its arc42 home instead —
  written or updated as part of the same piece of work, not left as a follow-up

---

## Edge Cases

- **The decision doesn't fit in 350 words even after moving Design content out** — the
  record is trying to document more than one decision. Split it into separate ADRs,
  one fork each, and cross-link them via `tags` (there's no `links.related` yet — see
  Step 3).
- **Nothing in `docs/architecture/` covers this decision's mechanism, and there's no
  obvious section for it** — create a new numbered section rather than stuffing the
  mechanism into the ADR to avoid the work; arc42 sections are created lazily, but
  "lazily" means "when there's real content," and this is real content.
- **The decision reverses something that was never an ADR to begin with** (an informal
  choice, a stale comment) — still write a normal new ADR; there's nothing to set
  `links.supersedes` to, so leave it empty.
