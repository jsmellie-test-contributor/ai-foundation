# Decision Record: Partial Amendment of Approved Decision Records

## Metadata

| Field          | Value                                                                 |
| -------------- | --------------------------------------------------------------------- |
| Decision ID    | AIF-META-002                                                          |
| Project        | ai-foundation                                                         |
| Tier           | A                                                                     |
| Domain         | meta-process                                                          |
| Status         | Superseded                                                            |
| Author (Agent) | Generic Agent                                                         |
| Approved By    | Jeremy Smellie                                                        |
| Created        | 2026-08-25 12:36                                                      |
| Referenced By  | —                                                                     |
| References     | AIF-META-001                                                          |
| Tags           | decision-record, amendment, errata, plan-lifecycle, status-vocabulary |

---

> **Archived, `Superseded`** (process-model check 27, 2026-09-25): the Errata/Amendment
> ladder this record introduced retires wholesale under MADR's single `Superseded`
> whole-record post-approval path, per `docs/process-model.md`'s Decision-record
> disposition table. The `Amending` status itself is removed from
> `skill/plan-lifecycle`'s `reference/status-vocabulary.md` separately, at check 32 (part
> of unwinding `AIF-003`). Kept here as historical record — not converted to MADR.

## Problem Statement

An `Approved` Decision Record has exactly one documented post-approval transition: `Approved → Superseded`, which replaces the entire record with a new one. There is no governed way to make a scoped change — correct a typo, fix a stale ID reference, or revise one section whose reasoning still holds — short of superseding a record that is overwhelmingly still correct.

---

## Constraints & Requirements

What was non-negotiable:

- Must not require any existing gate-checking logic to change. `skill/plan-lifecycle` and `reference/status-vocabulary.md` mandate that dependent-work gates check _positively_ for `Status: Approved` and never special-case any other value. A new status value is therefore safe to add by construction — every existing gate treats it as "not approved" without modification — but a new _kind_ of check would not be.
- Dependent work must be blocked while an amendment awaits approval. A record whose body contains unapproved content is not in an approved state, and nothing new should start against it until a human has confirmed the change.
- Must not weaken the human-approval gate for any change that alters what was decided.
- Must not require an amendment to carry its own Decision ID. A change substantial enough to need independent identity and citation is a supersede by definition — that distinction is the entire reason amendment exists as a separate concept.
- Must preserve an auditable record of what was approved and when, without relying solely on a reader's willingness to walk `git log`.
- Must reuse AIF-META-001's existing rigor ladder rather than introducing a second, parallel one.

What was a preference but not a hard requirement:

- Keep the common case (non-substantive corrections) friction-free, since these are the majority of real post-approval changes observed in this repo.
- Avoid tooling work in `lib/decisions.js` beyond what the chosen mechanism genuinely requires.

---

## Options Explored

_(Five options are recorded rather than the template's suggested 2-4, because all five were genuinely explored and discarding one would misrepresent the reasoning.)_

### Option A: In-record amendment log (`## Amendments`)

**Summary**: Amend the affected section in place, mark it `*(amended — see Amendment N)*`, and append a row to an append-only `## Amendments` table at the bottom of the record recording what changed, why, who approved it, and when. `Status` moves to `Amending` for the duration of the cycle and returns to `Approved` on confirmation.

**Strengths**: The record remains a single readable source of truth — no assembly required to know what is currently true. No ID churn. Near-zero tooling cost. Matches how this repo already handles worklogs.

**Weaknesses**: Originally-approved body text is mutated, so "what did we approve on the original date" is answerable only from `git log`. The log can drift from the body if an amendment is applied carelessly.

**Verdict**: Chosen — forms the middle rung of the adopted ladder.

### Option B: Amendment as a child record (`Amends` / `Amended By`)

**Summary**: Each partial change becomes its own Tier B record amending a named section of the parent. The parent stays `Approved` and textually untouched apart from an `Amended By` metadata field. New index arrays `amends`/`amended_by`, inverted the way `referenced_by` already is.

**Strengths**: The approved artifact is genuinely immutable. Every change gets its own gate, rationale, and author. Produces real graph structure the index can validate.

**Weaknesses**: Introduces the patch-chain problem — establishing current truth requires reading the parent plus N amendments in order, and that cost grows without bound. Requires index schema and validation work. Inflates the per-domain ID counter with fragments.

**Verdict**: Not chosen — eliminated outright by the constraint that amendments carry no ID, which is this option's core mechanism. A change large enough to warrant its own ID is a supersede.

### Option C: Section-level versioning inside the record

**Summary**: Each amendable section carries its own version stamp; superseded content is retained inline (struck through or collapsed) with the replacement beneath it.

**Strengths**: History and current truth coexist in one place, in context, with no chain-walking.

**Weaknesses**: Records accumulate visual noise quickly, and the noise is worst in exactly the sections readers most need to read cleanly. No clean machine-readable representation. Hardest of the five to validate automatically.

**Verdict**: Not chosen — real cost, thin marginal benefit over Option A plus `git log`.

### Option D: Errata channel for non-substantive changes

**Summary**: Separate changes by whether they alter the decision at all. Changes that provably cannot alter it — typos, dead links, ID renumbering — are ordinary edits logged in an `## Errata` list with no approval gate. Everything else routes to a gated path.

**Strengths**: Removes friction from the majority of real post-approval changes, where there is no risk to manage. The motivating case in this repo (renumbering `AIF-004` → `AIF-PROC-001` across records after AIF-META-001's ID scheme landed) falls cleanly here.

**Weaknesses**: Requires a test crisp enough that it cannot be used as a loophole to bypass both the approval gate and the domain-owner authorship requirement. Solves nothing on its own — it is a pairing, not a standalone mechanism.

**Verdict**: Chosen — forms the bottom rung of the adopted ladder, paired with Option A.

### Option E: Versioned reissue (`AIF-ARCH-004 v2`)

**Summary**: Reissue the whole record at a new version under the same ID, archiving the prior version.

**Strengths**: There is always exactly one authoritative, complete document.

**Weaknesses**: Requires re-approving unchanged content, which is precisely the all-or-nothing cost this decision exists to remove. Functionally supersede with extra bookkeeping.

**Verdict**: Not chosen — restates the problem as its solution.

---

## Decision

**Chosen approach**: A three-rung amendment ladder — Option D (Errata) and Option A (Amendment) added beneath the existing `Superseded` path.

**Rationale**:
The two problems in play are orthogonal, exactly as AIF-META-001 found for rigor and ownership: most post-approval changes carry no risk at all and should carry no ceremony, while the ones that do carry risk need a gate but rarely need a whole new record. Option D handles the first, Option A the second, and the existing `Superseded` path handles genuine reversal. Structuring them as a ladder mirrors AIF-META-001's Tier A/B/C shape, so no new judgment vocabulary is introduced. The no-ID constraint does useful work beyond its stated intent: it makes the boundary between the top two rungs self-enforcing, because "does this need to be citable on its own?" is a question authors can answer without weighing severity.

**Trade-offs accepted**:

- The originally-approved text of an amended section is no longer recoverable from the record itself, only from `git log`. Accepted because the `## Amendments` table names the section and summarises the change, so the reader knows what to look for and where; the alternatives that avoid this (Options B and C) each cost more than the audit convenience is worth.
- The errata test is semantic, not mechanically checkable. Mitigated by the default-deny tie-breaker below rather than by attempting to make it checkable.
- Three rungs is more surface area to teach than one. Accepted because the ladder's shape is already familiar from AIF-META-001.
- `Amending` blocks work that has not yet started, but does not retroactively stop work already in flight that checked `Approved` before the amendment was proposed. Accepted as inherent to a status-based gate rather than a defect of this design — the same is true of `Superseded` today.

---

## Design

### The ladder

| Change                                                           | Path                                  | Author       | Gate                                         |
| ---------------------------------------------------------------- | ------------------------------------- | ------------ | -------------------------------------------- |
| Provably cannot alter the decision                               | `## Errata` entry                     | Anyone       | None                                         |
| Alters the record, but the original rationale still holds        | `## Amendments` entry + in-place edit | Domain owner | `Amending` + two-commit confirmation (below) |
| The original rationale no longer holds, or the decision reverses | `Status: Superseded` + new record     | Domain owner | Full Tier A cycle                            |

### The errata test

> **Errata** is a change that provably leaves the rendered meaning of a record's substantive sections unchanged — `Options Explored`, `Decision, Design`, and `Impact on Planning` at Tier A; `Rationale`, `Decision`, and `Impact` at Tier B. Any change that alters, adds to, or removes from the solution space considered, the chosen approach, or how it is to be implemented is not errata — regardless of how small it appears or which section of the record it occupies.

Two properties of this test matter and are easy to get wrong:

1. **It is about meaning, not location.** A typo inside the `Decision` section is errata. A clarifying rewrite of an option's stated weakness in `Options Explored` is not, even though `Options Explored` describes work already concluded — nor is its Tier B equivalent, a rewrite of `Rationale`, which carries the reasoning a brief has in place of an options table
2. **Doubt disqualifies.** If it is not obvious that a change leaves meaning unchanged, it is not errata. This default-deny tie-breaker is what makes the ungated rung safe without making the test mechanically checkable: an author cannot reason their way into the ungated path, because uncertainty itself removes the option.

Worked examples:

| Errata                                                                      | Not errata                                                        |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Typos, grammar, formatting                                                  | Correcting a factual claim in an option's strengths or weaknesses |
| Broken or moved link/path fixes                                             | Adding an option that was not originally considered               |
| ID renumbering where the referent is identical (`AIF-004` → `AIF-PROC-001`) | Sharpening vague wording in `Decision`, `Design` or `Rationale`   |
| Metadata corrections other than `Status`, `Tier`, `Domain`                  | Any change to `Status`, `Tier`, or `Domain`                       |

The second row of the right-hand column is the case most likely to be misfiled. Discovering that "Option B cannot do X" was factually wrong is not a correction to be logged and forgotten — it undermines the reasoning that rejected Option B, so it routes to supersede consideration, not to an amendment row.

### Record-shape changes

Two optional sections are added to both the `skill/decision-record` and `skill/decision-brief` templates, placed after the closing `Resolved Items` / `Open Items` section. Both are append-only; a row's `Outcome` is filled in once when the cycle closes, and otherwise existing rows are never edited or deleted.

```markdown
## Amendments

| #   | Date       | Section  | Change              | Rationale | Outcome            |
| --- | ---------- | -------- | ------------------- | --------- | ------------------ |
| 1   | 2026-09-02 | Design   | {what changed}      | {why}     | Approved by {name} |
| 2   | 2026-09-14 | Decision | {what was proposed} | {why}     | Rejected by {name} |

## Errata

| #   | Date       | Change         | Author |
| --- | ---------- | -------------- | ------ |
| 1   | 2026-09-02 | {what changed} | {name} |
```

`Outcome` reads `Pending` while `Status: Amending`, and is filled in with `Approved by {name}` or `Rejected by {name}` when the cycle closes. Rejected rows stay in the table — that a change was proposed and declined is worth keeping, and it is the only place that fact survives outside `git log`.

An amended section carries an inline marker at the point of change: `*(amended — see Amendment N)*`. Errata carry no inline marker, since by construction there is nothing at the point of change worth flagging.

One Metadata field is added: `Last Amended | {YYYY-MM-DD} (Amendment {N})`. Errata do not touch it — they are not amendments and must not present as though a reader should re-check anything.

The field is **optional and forward-looking**. Existing records are not retrofitted; a record acquires `Last Amended` the first time it is amended and not before, so the field's presence is itself the signal that a record has ever been amended. This follows the tolerance `lib/decisions.js` already applies to `Tier`/`Domain` for the pre-AIF-META-001 records (`REQUIRED_FIELDS` is only `Decision ID` and `Status`) — `Last Amended` must not be added to `REQUIRED_FIELDS`.

### Status handling

`reference/status-vocabulary.md` gains one value, scoped to Decision Records only (alongside `Superseded`):

| Status     | Meaning                                                                                     | Dependent work allowed? |
| ---------- | ------------------------------------------------------------------------------------------- | ----------------------- |
| `Amending` | An amendment has been proposed and applied to the body, and is awaiting human confirmation. | No                      |

`Amending` is to an approved record what `Draft` is to a new one: the body contains content no human has confirmed. Because every gate checks positively for `Approved` and `reference/status-vocabulary.md` forbids special-casing any other value, this new status blocks dependent work through the existing mechanism — no gate-checking logic anywhere needs to change.

Blocking is the intended behaviour, not a cost accepted reluctantly. Amendment is partial in what it changes, but a record mid-amendment is wholly unconfirmed while it sits there, and nothing new should start against it until the human has decided.

New transitions:

- `Approved` → `Amending` (amendment proposed)
- `Amending` → `Approved` (human confirms, or rejects and the proposal is withdrawn)

Errata never touch `Status`. An errata change cannot alter the decision, so there is nothing for a gate to protect.

### Amendment gate — two commits

Mirrors Tier B's two-commit shape:

```
1. Domain owner applies the body edit, adds the inline marker, appends the
   Amendments row (Outcome: Pending), sets Status: Amending.
                                        -> commit ("Propose amendment: ...")
2. Present to human.
3a. Human confirms -> Outcome: Approved by {name}, update Last Amended,
    Status back to Approved.            -> commit ("Amend decision: ...")
3b. Human rejects  -> revert the body edit and inline marker,
    Outcome: Rejected by {name} (the row stays),
    Status back to Approved.            -> commit ("Reject amendment: ...")
```

The body edit lands in the proposal commit rather than being deferred, because `Amending` already tells any reader that the body is unconfirmed. Deferring the edit would mean holding the proposed wording somewhere other than the place it belongs, for a safety property the status now provides directly.

Errata need no sequence and no status change: edit, append the `## Errata` row, one commit (`Errata: ...`).

### Tooling

`lib/decisions.js` currently hardcodes `supersedes: []` and `superseded_by: []` in `buildDecisionIndex` (`lib/decisions.js:134`) and never reads a `Supersedes` field in `parseDecisionRecord`. The existing all-or-nothing path is therefore only half-wired today, independent of this decision. Implementing work must fix that parse before adding anything new, or the index will misrepresent the top rung of the very ladder it is being extended to describe.

Index entries gain `last_amended` (string, or `null` for any record whose Metadata table has no such field — the normal case) and `amendment_count` (integer, `0` when the `## Amendments` section is absent). Errata are deliberately not indexed — an indexed errata list would imply readers should consult it, contradicting the rung's defining property.

Sequencing of the `Supersedes`-parse fix against the rest of this work is left to Epic decomposition rather than fixed here — see Resolved Items.

---

## Impact on Planning

What every domain's decision-authoring agent must know, since a meta-process decision ripples into all of them:

- Superseding is no longer the only governed post-approval path. Before superseding a record, check the ladder: if the original rationale still holds, this is an amendment.
- Amendments never receive a Decision ID. If a change feels like it needs one, that feeling is the signal to supersede instead.
- Errata may be authored by anyone; amendments and supersedes remain the domain owner's, per AIF-META-001's ownership table. The errata test therefore gates authorship as well as approval, which is why its default-deny property is not optional.
- One `Status` value is added — `Amending`, Decision Records only. No existing gate-checking logic changes: every gate already checks positively for `Approved`, so `Amending` blocks dependent work through the mechanism that is already there. Do not add special-case handling for it, exactly as `reference/status-vocabulary.md` already forbids for `Draft` and `Deferred`.
- A record in `Amending` does not satisfy an approval gate. Work that depends on an amended record must wait for the amendment to be confirmed or rejected, even if the section being amended is unrelated to that work.
- Records predating this decision are not retrofitted. An absent `Last Amended` field means "never amended", not "unknown" — do not treat its absence as a gap to be backfilled.
- `skill/decision-triage` gains no new routing responsibility. Triage classifies new decisions; choosing a rung for an existing record is the domain owner's call at the point of change.
- Ruled out and must not reappear: child-record amendments with their own IDs (Option B), inline section-level version stamps (Option C), and whole-record versioned reissue (Option E).

---

## Resolved Items

| #   | Item                                                                                                                                        | Resolution                                                                                                                                                                                                                                                                                                                                                                      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Should an amendment carry its own Decision ID?                                                                                              | No. Needing an independent, citable identity is the definition of a supersede; this is what distinguishes the two mechanisms, rather than a severity judgment.                                                                                                                                                                                                                  |
| 2   | Who may author an amendment?                                                                                                                | Errata: anyone, given the rung cannot alter the decision. Amendments and supersedes: the domain owner per AIF-META-001.                                                                                                                                                                                                                                                         |
| 3   | Should the errata boundary be drawn by section or by meaning?                                                                               | By meaning. A section-boundary rule was proposed and rejected — it is checkable but wrong, admitting substantive rewrites in `Options Explored` while excluding typo fixes in `Decision`.                                                                                                                                                                                       |
| 4   | How is a semantic test kept from becoming a loophole?                                                                                       | Default-deny: doubt disqualifies. Uncertainty removes the ungated option rather than leaving it to the author's judgment.                                                                                                                                                                                                                                                       |
| 5   | Should a new `Status` value be added for the amendment cycle?                                                                               | Yes — `Amending`. An earlier draft ruled this out on the grounds that a new status would break downstream gates; that was wrong. Gates check positively for `Approved` and are forbidden from special-casing other values, so a new value engages them uniformly rather than breaking them. Blocking dependent work while an amendment is unconfirmed is the desired behaviour. |
| 6   | Should the body edit land in the proposal commit or the approval commit?                                                                    | The proposal commit. Deferring it was only ever a workaround for a reader mistaking unapproved content for decided content — a job `Amending` now does directly and more visibly.                                                                                                                                                                                               |
| 7   | Does the `lib/decisions.js` `Supersedes`-parse fix ship inside this decision's implementing Epic or as a standalone correction ahead of it? | Deferred to Epic decomposition, to be settled with Tech-Lead when the Epic is written. This record states only that the fix must land before the index describes the new rungs; it does not constrain how that work is packaged.                                                                                                                                                |
| 8   | Are existing records retrofitted with `Last Amended`, or do they acquire it lazily?                                                         | Forward-looking only — no retrofit. The field is optional, and a record gains it on first amendment, so its presence is itself the signal that a record has ever been amended.                                                                                                                                                                                                  |
