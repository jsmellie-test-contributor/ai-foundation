# Gmail MCP Server + Generic Bundle — Implementation Plan

> Status: Done
> Created: 2026-08-21
> Approved by: Jeremy

---

## Goal

Add a `gmail` MCP server exposing the common Gmail operations (search/read/organize/label/send), with the server handling its own OAuth token acquisition end-to-end, package it into a new `generic` install bundle, and enforce — via a new steering rule — that no irreversible action (sending an email in any form, or permanently deleting a message/draft/label) may happen without an explicit, per-action human approval question asked and answered in the affirmative. No assumed consent, ever.

---

## Components Affected

| Component                                                | Action     | Notes                                                                                                                                                                                                         |
| -------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `servers/gmail/gmail.yaml`                               | Create     | Server definition, tool catalog                                                                                                                                                                               |
| `servers/gmail/index.js`                                 | Create     | MCP protocol entry point (thin wrapper)                                                                                                                                                                       |
| `servers/gmail/logic.js`                                 | Create     | Pure logic (MIME building, query building, response shaping) + I/O functions (Gmail API calls via `googleapis`)                                                                                               |
| `servers/gmail/auth.js`                                  | Create     | OAuth2 token store: loads a locally persisted token, auto-refreshes it, rewrites it on refresh. Isolated from tool logic.                                                                                     |
| `servers/gmail/scripts/authorize.js`                     | Create     | One-time interactive CLI the human runs locally: performs the full OAuth loopback consent flow and writes the resulting token to local storage. This is the "server stores everything it needs itself" piece. |
| `servers/gmail/package.json`                             | Create     | Runtime deps: `googleapis`, `@modelcontextprotocol/sdk`                                                                                                                                                       |
| `servers/gmail/tests/unit/gmail.test.js`                 | Create     | Pure logic tests (MIME construction, query building, token-expiry decision logic)                                                                                                                             |
| `servers/gmail/tests/integration/gmail.test.js`          | Create     | I/O-layer tests against a mocked/fake Gmail API client and a fake token store                                                                                                                                 |
| `servers/gmail/tests/integration/gmail.mcp.test.js`      | Create     | MCP protocol tests (tool listing + invocation)                                                                                                                                                                |
| `servers/gmail/README.md`                                | Create     | Setup instructions: links to Google's official OAuth-app-registration docs (primary source of truth) plus a condensed, dated step-by-step walkthrough of that same flow, then how to run `authorize.js` once  |
| `steering/generic/gmail-irreversible-action-approval.md` | Create     | New steering rule: explicit human approval required before any send or permanent-delete action                                                                                                                |
| `bundles/generic/bundle.yaml`                            | Create     | New bundle, explicit lists: `servers: ["gmail"]`, `steering: ["steering/generic/gmail-irreversible-action-approval.md"]`                                                                                      |
| `tests/validation/*.test.js`                             | Check only | Confirm existing repo-wide validation tests (schema/cross-ref checks) pass against the new files — no new validation test file planned unless investigation shows a gap                                       |

---

## Approach

1. **Define the tool catalog in `gmail.yaml`.** Tools, split into read-only, safe-mutating, and gated (irreversible — see step 5):
   - Read-only: `gmail_list_messages` (query/label/pagination), `gmail_get_message` (full content + headers by id), `gmail_get_attachment`, `gmail_list_labels`, `gmail_list_drafts`, `gmail_get_draft`
   - Safe-mutating (reversible, ungated): `gmail_modify_labels` (add/remove labels on a message — covers archive, mark read/unread, star), `gmail_trash_message` (moves to Trash, recoverable for 30 days — distinct from permanent delete), `gmail_create_draft`, `gmail_create_label`
   - Gated — irreversible (steering-gated, see step 5): `gmail_send_message`, `gmail_send_draft`, `gmail_reply_message`, `gmail_delete_message` (permanent delete, bypasses Trash), `gmail_delete_draft` (permanent), `gmail_delete_label` (permanent, and removes the label from every message it's applied to)
     Every gated tool's `description` field explicitly states "Irreversible action — requires prior explicit human approval per steering; never call without it" so the rule is visible at the tool-definition layer, not just in steering text.

2. **Design OAuth2 handling so the server is self-sufficient after one-time setup.** Google requires a registered OAuth app (Client ID/Secret) — this one external prerequisite (a few minutes in Google Cloud Console) cannot be automated away, but it will not leave the human guessing:
   - `README.md` links directly to Google's own official, Google-maintained documentation for the two things the human needs to do — create a Cloud project + OAuth client credentials (Google Identity docs: `https://developers.google.com/identity/protocols/oauth2` and `https://developers.google.com/workspace/guides/create-credentials`) and enable the Gmail API (`https://developers.google.com/gmail/api/quickstart/nodejs`, which also documents the Desktop-app OAuth client type this server needs) — as the primary, authoritative source, since Google's own console UI changes over time and Google keeps these pages current.
   - In addition, `README.md` includes our own condensed, numbered walkthrough of that same flow (create project → enable Gmail API → configure OAuth consent screen → create OAuth client ID of type "Desktop app" → copy Client ID/Secret) so the human isn't forced to leave the repo to get started. This walkthrough carries an explicit dated disclaimer, e.g. _"Steps verified against the Google Cloud Console as of 2026-08-21 — if the console's UI has since changed, defer to the official docs linked above."_
     Everything after credential creation is automated by us:
   - `scripts/authorize.js`: a one-time interactive script the human runs locally. It starts a short-lived local loopback HTTP listener, opens the Google consent screen in the browser, receives the auth code on the loopback redirect, exchanges it for a refresh token via `googleapis`, and writes `{ client_id, client_secret, refresh_token }` to a local token file (default `~/.aif/gmail-token.json`, override via `GMAIL_TOKEN_PATH`). This file is never written into the repo and is git-ignored by virtue of living outside the repo entirely by default.
   - `auth.js`: at server runtime, reads the token file, exchanges the refresh token for short-lived access tokens via `google.auth.OAuth2`, and transparently persists any rotated refresh token back to the same file. If the token file is missing, tool calls fail with a clear error directing the human to run `authorize.js`.
   - Net effect: after the one Google Cloud Console step + one `node scripts/authorize.js` run, the server needs no further human involvement to authenticate — matching "have the server store everything it needs itself."

3. **Split `logic.js` per Rule 6 (design for testability).** Pure functions: building a MIME `RFC 2822` message from `{to, cc, bcc, subject, body, inReplyTo}`, building Gmail search query strings from structured filters, shaping raw Gmail API responses into the tool's documented `outputs`, deciding whether a stored token is expired. I/O functions: thin wrappers that call the Gmail API client (via `googleapis`) and the token store, passing results through the pure shaping functions. Unit tests exercise only the pure functions; integration tests exercise the I/O wrappers against a fake/mock Gmail client and a fake token store (no real network calls, no real mailbox, no real filesystem token required).

4. **Implement `index.js`** as the MCP entry point per `skill/server-authoring`'s standard pattern — imports from `logic.js`, registers each tool with zod input schemas, connects `StdioServerTransport`.

5. **Write the new steering rule** at `steering/generic/gmail-irreversible-action-approval.md` per `skill/steering-authoring`. Core rule: before invoking any tool that sends an email in any form (`gmail_send_message`, `gmail_send_draft`, `gmail_reply_message`) or permanently deletes data (`gmail_delete_message`, `gmail_delete_draft`, `gmail_delete_label`) — or any future tool with equivalent irreversible effect — the agent must ask the human an explicit, unambiguous approval question describing exactly what will happen (for sends: recipient(s), subject, body summary; for deletes: what is being permanently removed and its scope of impact, e.g. "this label is applied to N messages and will be removed from all of them") and must receive an explicit affirmative response in that same conversation exchange. A prior general instruction ("send my emails for me," "clean up my labels") does not count as approval for an individual action — each irreversible action needs its own explicit yes. `gmail_trash_message` and `gmail_create_*` tools are explicitly excluded from this gate because they are reversible/additive, not irreversible. No exceptions. Enforcement section: violating this rule is a security-severity finding, not a style finding, consistent with `steering/global/core.md` Rule 3's treatment of security requirements.

6. **Create the `generic` bundle** at `bundles/generic/bundle.yaml` using the explicit-list resolution strategy (no `domain` field — no agent domain named "generic" exists, and none is being created by this plan). Lists: `servers: ["gmail"]`, `steering: ["steering/generic/gmail-irreversible-action-approval.md"]`. `agents` and `skills` left empty — this bundle is for direct MCP tool installation into a harness (e.g. Claude Desktop/Claude Code) without an ai-foundation agent persona attached.

7. **Write tests** per `skill/server-authoring` Step 6: unit tests for MIME/query building and token-expiry logic, integration tests for the I/O wrappers (Gmail API + token store) against fakes, and MCP protocol tests (tool listing, valid invocation, error handling) using `InMemoryTransport`.

8. **Self-validate** against both `skill/server-authoring` and `skill/bundle-authoring` checklists, then run the full test suite.

---

## Open Questions

1. **Bundle naming casing** — bundle folder/`name` field will be `generic` (kebab-case, per schema) even though referred to as "Generic" — confirm this is fine, since bundle names are lowercase identifiers throughout the repo.

---

## Risks

- **OAuth app registration friction** — the human must still complete a one-time Google Cloud Console app registration (Client ID/Secret) before `authorize.js` can run. This step cannot be automated by any local script — it requires the human's Google account and Cloud Console access. Mitigated by pairing an official-docs link (authoritative, stays current) with our own dated walkthrough (convenient, but may drift if Google changes its console UI — the dated disclaimer tells the human when to trust the official link over our steps instead). Everything past credential creation is automated, per step 2.
- **Local loopback OAuth flow environment assumptions** — `authorize.js` assumes a local browser is reachable from the machine running it (standard for a developer workstation, not for a headless server). Will be documented as a prerequisite in `README.md`; not a blocker for the primary use case (human's own machine).
- **Token file is a local secret at rest** — `~/.aif/gmail-token.json` contains a long-lived refresh token. It's kept outside the repo by default and never logged, but the file itself is only as safe as the local filesystem's permissions — documented, not further mitigated in this plan.
- **No production Gmail account available for integration testing** — integration tests will use a mocked/fake Gmail API client rather than a real mailbox, per `skill/server-authoring`'s "external infrastructure" edge case. This means send/delete behavior is verified structurally (correct API calls made) but not against a live inbox.

---

## Validation

- `node --test "servers/gmail/tests/unit/**/*.test.js"`
- `node --test "servers/gmail/tests/integration/**/*.test.js"`
- `node --test "tests/validation/**/*.test.js"` (repo-wide schema/cross-reference checks, run from repo root)
- Manual cross-reference check: bundle's `servers`/`steering` entries resolve to real files; server YAML tool list matches implemented tools in `index.js`/`logic.js`; every gated tool's description explicitly flags the approval requirement
- Self-validation checklists from `skill/server-authoring`, `skill/bundle-authoring`, and `skill/steering-authoring` walked explicitly before declaring done

---

## Out of Scope

- Google Calendar, Google Contacts, or any non-Gmail Google API
- Any agent definition wiring this server into an existing agent's `tools`/`approved_tools` (this plan only creates the server + bundle; attaching it to an agent persona is a separate, future decision)
- Automating Google Cloud Console app (Client ID/Secret) registration itself — this remains a documented one-time manual step; everything after it (consent flow, token storage, refresh) is automated per step 2
- Extending the approval gate beyond sends and permanent deletes (e.g. `gmail_trash_message`, `gmail_modify_labels`, `gmail_create_draft`, `gmail_create_label` remain ungated as reversible/additive actions)
