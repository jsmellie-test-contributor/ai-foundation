---
name: 'gmail-irreversible-action-approval'
version: '0.2.0'
description: 'Requires explicit, per-action human approval before any Gmail tool call that sends an email or permanently deletes data.'
file_patterns: []
---

## Scope

**This steering applies to:** Any agent or session with access to the `gmail` MCP server's tools (bundle: `generic`).

**Loaded when:** Every session in which the `gmail` server is installed, always — this is not conditional on file patterns.

---

## Rules

### Rule: Every Irreversible Gmail Action Requires Its Own Explicit Approval

- Before invoking any of the following tools, the agent must first ask the human an explicit, unambiguous approval question and receive an explicit affirmative response in that same conversation exchange:
  - **Sending, in any form:** `gmail-send-message`, `gmail-send-draft`, `gmail-reply-message`
  - **Permanent deletion:** `gmail-delete-message` (bypasses Trash), `gmail-delete-draft`, `gmail-delete-label`
  - Any future tool added to the `gmail` server with equivalent send or permanent-delete effect
- The approval question must state exactly what will happen:
  - For sends: recipient(s), subject, and a summary of the body
  - For permanent deletes: precisely what is being removed and the scope of impact — for `gmail-delete-label` specifically, how many messages currently carry that label, since deleting it strips the label from all of them
- A prior general instruction (e.g. "send my emails for me," "clean up my labels") does not satisfy this rule for any individual action. Each call needs its own explicit yes, asked and answered in the turn immediately preceding the tool call.
- Silence, an unrelated reply, or a previous unrelated "yes" in the conversation does not count as approval.

**Rationale:** Sending an email and permanently deleting mailbox data are both actions with real-world, external consequences that cannot be undone by the agent afterward. Unlike most tool calls, mistakes here reach a third party's inbox or destroy data outside the repo entirely. The bar for consent has to be as high as the cost of getting it wrong.

**Exceptions:** None. This rule has no waiver path — see Enforcement.

---

### Rule: `gmail-trash-message` and Additive Tools Are Explicitly Not Gated

- `gmail-trash-message` (recoverable for 30 days), `gmail-modify-labels`, `gmail-create-draft`, and `gmail-create-label` do not require the explicit-approval question in "Every Irreversible Gmail Action Requires Its Own Explicit Approval"
- These are reversible or purely additive — trashing is recoverable, and creating a draft or label has no external effect until a separately gated action (send, or `gmail-delete-label`) acts on it

**Rationale:** Gating every mutating call regardless of consequence would make the tool unusable and would dilute the signal of the approval question for the calls that actually matter. The line is drawn at irreversibility, not at "mutation" in general.

**Exceptions:** If a future change to the Gmail API, or to this server's tool set, makes one of these tools irreversible in effect (e.g. Trash retention is removed), this rule must be revised and the tool moved to "Every Irreversible Gmail Action Requires Its Own Explicit Approval"'s gated list — do not treat the current exemption as permanent regardless of underlying behavior changes.

---

## Enforcement

- **Missing or implied approval:** Any gated tool call made without an explicit approval question and an explicit affirmative answer in the same exchange is a security-severity finding (per `steering/global/core.md`: "Security Requirements Are Never Optional"), not a style or process finding. It blocks approval of the agent's work regardless of the outcome of the send/delete.
- **Who catches it:** Principal-Engineer review, or direct human inspection of the conversation transcript.
- **No waiver path:** Unlike most steering rules, this rule has no human-waiver exception (see "Every Irreversible Gmail Action Requires Its Own Explicit Approval"). If a human wants to change this rule's scope, that requires editing this steering file through the normal `skill/steering-authoring` process, not a one-off waiver in a plan or commit message.
