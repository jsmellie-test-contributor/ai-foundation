# Gmail Filter CRUD + Batch Label + Sender Report Tools — Implementation Plan

> Status: Done
> Created: 2026-08-22
> Approved by: Jeremy

---

## Goal

Close the two gaps identified in `gmail-mcp-tool-request.md`: add Gmail filter CRUD (`gmail-create-filter`, `gmail-list-filters`, `gmail-delete-filter`) so auto-labeling rules can be created and managed programmatically, and add `gmail-batch-modify-labels` so the existing 2-year backlog can be labeled in bulk instead of one API call per message. Also add `gmail-sender-report`, a read-only aggregation tool identified during planning discussion for an upcoming inbox-triage skill (its own future plan, see Out of Scope) — it groups messages by sender over a date range/query so a categorization pass can see "who sends what, how often" as one compact summary instead of reading messages one at a time. The "other bulk maintenance tools" section of the request doc (batch-archive, batch-trash, export, storage-report, dedupe, filter export/import, batch-read/unread) remains explicitly out of scope for this plan.

---

## Components Affected

| Component                                           | Action | Notes                                                                                                   |
| --------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------- |
| `servers/gmail/auth.js`                             | Modify | Add `https://www.googleapis.com/auth/gmail.settings.basic` to `GMAIL_SCOPES`                            |
| `servers/gmail/gmail.yaml`                          | Modify | Add 5 new tool definitions                                                                              |
| `servers/gmail/logic.js`                            | Modify | Pure shaping/chunking/aggregation functions + I/O wrappers for filters, batch modify, and sender report |
| `servers/gmail/index.js`                            | Modify | Register the 5 new tools with zod schemas                                                               |
| `servers/gmail/README.md`                           | Modify | Document that the new scope requires re-running `scripts/authorize.js`                                  |
| `servers/gmail/tests/unit/gmail.test.js`            | Modify | Unit tests for new pure functions                                                                       |
| `servers/gmail/tests/integration/gmail.test.js`     | Modify | I/O tests against a fake Gmail client                                                                   |
| `servers/gmail/tests/integration/gmail.mcp.test.js` | Modify | Protocol tests for the 5 new tools                                                                      |
| `docs/plans/gmail-filter-and-batch-tools-plan.md`   | Create | This plan                                                                                               |

No changes to `steering/generic/gmail-irreversible-action-approval.md` or `bundles/generic/bundle.yaml` — see gating classification below and note that the bundle already references the whole `gmail` server by name, not an enumerated tool list.

---

## Approach

1. **Add the new OAuth scope.** Append `https://www.googleapis.com/auth/gmail.settings.basic` to `GMAIL_SCOPES` in `auth.js`. Because `scripts/authorize.js` already reads `GMAIL_SCOPES` and calls `generateAuthUrl` with `prompt: 'consent'`, no script changes are needed — re-running the existing authorize script picks up the new scope automatically. Document in `README.md`, under a new "Re-authorizing after a scope change" note, that anyone who already has a token file must re-run `scripts/authorize.js` once before the filter tools will work, and that the old token continues working for all existing tools in the meantime (only the new filter endpoints will fail with an insufficient-scope error until re-auth).

2. **Define the 4 tools in `gmail.yaml`**, matching the existing read-only/safe-mutating/gated three-way split:
   - Read-only: `gmail-list-filters` — no params, returns `{ filters: { id, criteria, action }[] }`.
   - Safe-mutating (ungated): `gmail-create-filter` — `criteria` (`from`, `to`, `subject`, `query`, `negated_query`, `has_attachment`, `exclude_chats`, `size`, `size_comparison`, all optional) and `action` (`add_label_ids`, `remove_label_ids`, `forward`, all optional) — returns `{ id, criteria, action }`. Description explicitly notes the endpoint only affects future mail, not existing messages (per the request doc's caveat), pointing to `gmail-batch-modify-labels` for backfilling history.
   - Safe-mutating (ungated): `gmail-delete-filter` — `filter_id` — returns `{ id, deleted: true }`.
   - Safe-mutating (ungated): `gmail-batch-modify-labels` — `message_ids` (array, up to 1000 per underlying API call — the tool itself accepts any number and chunks internally), `add_label_ids`, `remove_label_ids` — returns `{ modified_count, label_ids_added, label_ids_removed }`.
   - Read-only: `gmail-sender-report` — `query` (string, optional, default `''` — same Gmail search syntax as `gmail-list-messages`, e.g. `after:2025/01/01 before:2025/07/01 in:inbox`), `max_senders` (number, optional, default 50) — pages through matching message IDs, fetches header-only metadata (`From`, `Subject` — via `format: 'metadata', metadataHeaders: ['From', 'Subject']`, never the body), and groups server-side (in `logic.js`, not by the LLM) into `{ sender, domain, count, sample_subjects: string[] }[]`, sorted by count descending and capped at `max_senders`. `sample_subjects` holds up to 5 distinct subjects per sender specifically so a sender that spans multiple categories (e.g. an investment firm sending both tax slips and promotional email) shows that split in one pass, instead of a single flattened example hiding it. Its description explicitly states it is a **convenience/discovery tool, not a dependency** — see step 8a.

3. **Implement pure logic in `logic.js`:**
   - `buildFilterCriteria(params)` / `buildFilterAction(params)` — map the tool's snake_case inputs to the Gmail API's camelCase `criteria`/`action` objects, omitting undefined fields.
   - `chunkMessageIds(ids, chunkSize = 1000)` — pure array-chunking function; this is the piece that makes `gmail-batch-modify-labels` safe against the API's 1000-id-per-call limit without the caller needing to know about it.
   - `aggregateBySender(messages, maxSenders)` — pure function: takes an array of `{ from, subject }` (already extracted from headers by the I/O layer) and returns the grouped/sorted/capped sender report shape. Kept pure and separately testable from the I/O paging/fetching around it.
   - Response-shaping functions for filter list/create/delete and for aggregating multiple `batchModify` chunk results into one `{ modified_count, ... }` object.

4. **Implement I/O wrappers in `logic.js`** (same pattern as existing tools — take `gmail` client as first arg):
   - `listFilters(gmail)`, `createFilter(gmail, params)`, `deleteFilter(gmail, filterId)` wrapping `users.settings.filters.list/create/delete`.
   - `batchModifyLabels(gmail, { message_ids, add_label_ids, remove_label_ids })` — chunks `message_ids` via `chunkMessageIds`, issues one `users.messages.batchModify` call per chunk sequentially, aggregates results. Sequential (not parallel) to stay well under Gmail API rate limits on large backlogs.
   - `senderReport(gmail, { query, max_senders })` — pages `users.messages.list` for matching IDs, then fetches `From`/`Subject` for each via `users.messages.get` with `format: 'metadata', metadataHeaders: ['From', 'Subject']` (headers only — never a body). **Decided during implementation discussion (2026-08-22):** uses capped-concurrency `Promise.all` chunks (e.g. 25 in flight at a time, small delay between chunks) rather than the Gmail API's raw HTTP batch endpoint — same per-call quota cost either way (250 quota units/sec/user, 5 units per `messages.get`), but concurrency is easier to keep safely under that ceiling on purpose than a 100-at-once batch envelope is, and it fits the existing fake-`gmail`-client test pattern instead of requiring raw multipart HTTP construction. Includes retry-with-backoff on 429/403 rate-limit responses. Passes the extracted `{ from, subject }` pairs to `aggregateBySender`.

5. **Register the 5 tools in `index.js`** with zod input schemas, following the existing registration pattern exactly.

6. **Write tests** per `skill/server-authoring`:
   - Unit: `buildFilterCriteria`/`buildFilterAction` (all-fields, partial-fields, omits-undefined cases), `chunkMessageIds` (exact multiples, remainders, empty array, single chunk under limit), `aggregateBySender` (grouping, count-descending sort, `max_senders` cap, `sample_subjects` capped at 5 and reflecting multiple distinct subjects for one sender).
   - Integration: filter CRUD against a fake `gmail.users.settings.filters` client; `batchModifyLabels` with a fake client asserting the correct number of `batchModify` calls and correct chunk boundaries for inputs both under and over 1000 ids (e.g. 1500 ids → 2 calls); `senderReport` against a fake client asserting batched metadata-only fetches (never `format: 'full'`) and correct aggregation end-to-end.
   - MCP protocol: all 5 tools appear in `listTools()`, valid invocation, error handling (e.g. missing `filter_id`).

7. **Self-validate** against `skill/server-authoring`'s checklist, confirm the gating classification (step 8) is reflected in each tool's `description` field the same way existing tools do it, then run the full test suite.

8. **Gating classification (resolved, not escalated — follows the pattern already established in `gmail.yaml`'s existing three-way split):** all 5 new tools are ungated.
   - `gmail-list-filters` and `gmail-sender-report` are read-only.
   - `gmail-create-filter` is additive — undoable via `gmail-delete-filter`, same reasoning as `gmail-create-label`.
   - `gmail-delete-filter` removes a rule, not mail data, and is trivially re-creatable, matching the request doc's own suggestion and the existing precedent of `gmail-trash-message`/`gmail-create-*` being ungated because they're reversible or additive rather than destructive of user data.
   - `gmail-batch-modify-labels` is the batch form of the already-ungated `gmail-modify-labels` (add/remove labels is reversible) — batching doesn't change its reversibility, only its scale.
     No changes to `steering/generic/gmail-irreversible-action-approval.md` are needed since none of these tools send mail or permanently destroy data.

8a. **`gmail-sender-report` must be optional, not a hard dependency, for anything built on top of it.** Per human direction, this tool may later be removed once the large-backlog triage work is done, and any skill built on it (the future `gmail-inbox-triage` skill — see Out of Scope) must degrade to a slower fallback — paging `gmail-list-messages` + per-message `gmail-get-message` (`format: 'metadata'`) and aggregating in the agent's own reasoning — rather than failing outright if the tool is unavailable. This plan only needs to keep the tool's design decoupled enough for that (a pure aggregation function over `{from, subject}` pairs, callable from either path); the fallback logic itself is implemented later, in the triage skill's own plan, not here.

---

## Open Questions

None. Prior open question (gating classification of `gmail-delete-filter`) resolved: confirmed ungated.

---

## Risks

- **Scope change requires re-consent.** Until the human re-runs `scripts/authorize.js`, the new filter tools will fail with a Google-side insufficient-scope error. All existing tools continue working unaffected in the meantime — documented in the README update (step 1), not otherwise mitigated (this is the standard OAuth incremental-scope pattern, not something a script can bypass).
- **Verified app re-review.** Per the request doc, if this OAuth app is ever submitted for Google's app-verification process, adding `gmail.settings.basic` may trigger re-review. Not applicable today (this is a personal-use unverified/test-mode app per the existing README's consent-screen setup step), but worth remembering if that changes later.
- **`batchModify`'s 1000-id limit.** Mitigated by `chunkMessageIds` + sequential per-chunk calls in step 4; covered by an over-the-boundary integration test in step 6.
- **`gmail-sender-report` still costs one metadata fetch per message, just batched.** Batching (up to 100 per HTTP batch call) reduces round-trips, not the underlying per-message API cost — a 2-year window in a busy inbox could still be several thousand `messages.get` calls total, just far fewer HTTP round-trips than that. This is a real cost worth knowing about before running it over the full 2 years unscoped; recommend always passing a bounded `query` (date range) per run rather than the full history in one call, which also fits the checkpoint-based incremental approach discussed for the future triage skill.
- **No live mailbox for integration testing** — same as the original plan; fake Gmail client only, so chunk-boundary, call-count, and aggregation behavior is verified structurally, not against real API rate-limit or batch-endpoint behavior.

---

## Validation

- `node --test "servers/gmail/tests/unit/**/*.test.js"`
- `node --test "servers/gmail/tests/integration/**/*.test.js"`
- `node --test "tests/validation/**/*.test.js"` (repo-wide schema/cross-reference checks, run from repo root)
- Manual cross-reference check: `gmail.yaml` tool list matches implemented tools in `index.js`/`logic.js`; each new tool's `description` accurately reflects its gating classification
- `skill/server-authoring` self-validation checklist walked explicitly before declaring done

---

## Out of Scope

- Everything in the request doc's "Other bulk maintenance tools" section: `gmail-batch-archive`, `gmail-batch-trash`, `gmail-export-messages`, `gmail-storage-report`, duplicate-attachment dedupe, `gmail-export-filters`/`gmail-import-filters`, `gmail-batch-mark-read`/`gmail-batch-mark-unread` — deferred as backlog per human instruction, not built now.
- Any agent definition wiring these new tools into an existing agent's `tools`/`approved_tools`.
- Actually creating or tuning any real filters — this plan only builds the capability.
- The `gmail-inbox-triage` skill itself (checkpoint file handling, category-taxonomy proposal flow, fallback-without-`gmail-sender-report` logic) — this is a separate, later Tier 2/3 plan per human direction, once the tools in this plan exist.
