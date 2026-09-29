---
name: 'agent-authoring'
version: '0.6.0'
description: 'Creates a well-formed agent definition with proper tool selection and prompt design.'
---

## Purpose

Creates a new agent in the `agents/` directory. An agent is a named persona with a defined role, prompt, tools, and skills. Agents have a specific job in the workflow and operate within their domain's steering rules.

Use this skill when you need to define a new agent or restructure an existing one.

---

## Inputs

- **Agent name** — kebab-case identifier (becomes the filename)
- **Domain** — which steering scope applies (e.g. `engineering`)
- **Role description** — what this agent does in one sentence
- **Capabilities needed** — what actions the agent must perform
- **Skills needed** — which existing skills the agent should invoke (if any)

---

## Steps

### Step 1 — Create the agent file

Create `agents/{name}.yaml`.

### Step 2 — Fill required fields

Use the schema documented in `skills/agent-authoring/reference/schema.md`:

```yaml
---
name: 'agent-name'
version: '0.1.0'
domain: 'engineering'
description: 'One sentence.'
prompt: |
  Full system prompt.
tools: [...]
approved_tools: [...]
---
```

### Step 3 — Select tools

Choose from the canonical tool list in `skills/agent-authoring/reference/tools.yaml`.

Rules:

- Only include tools the agent genuinely needs for its role
- A read-only agent doesn't need `write` or `shell`
- Include `grep` and `glob` for any agent that searches code

### Step 4 — Set approved_tools conservatively

`approved_tools` is the subset of `tools` that run without human confirmation.

- Start with read-only tools: `read`, `grep`, `glob`
- Add `write`, `shell`, `code` only if the agent operates autonomously
- When in doubt, leave it out — the human can always approve at runtime

### Step 5 — Write the prompt

The prompt is a direct instruction to the agent. It must include:

- Who the agent is and what its role is
- Its operating process (numbered steps)
- Hard rules it must never violate
- What it does NOT do (scope boundaries)

Write it as if speaking to the agent. Use imperative mood.

Applies within the prompt itself, not just across documents: `steering/engineering/core.md`: "Cite, Don't Restate".

If the prompt contains a self-contained procedure or rule that is not specific to this agent's identity, check `docs/agent-prompt-extraction-candidates.md` (location per `.aiconfig.json` `paths.knowledge`, default `knowledge/`) — either it already covers this case, or add an entry recording why it wasn't extracted into a skill or steering rule now.

### Step 6 — Declare skills

Only reference skills that exist in `skills/`. Format: `"skill/{name}"`.

If the agent needs no skills, set `skills: []` or omit the field.

### Step 7 — Set preload_skills (if any skill should preload)

`preload_skills` controls which of the agent's declared `skills` get their
full content loaded into context automatically at startup on Claude Code,
versus staying reachable only via on-demand `Skill` invocation. Omitting
the field means **preload nothing** — adding or changing `preload_skills`
must never be the only way an agent gets a skill's content; it only changes
whether that content is already in context up front or has to be fetched
on demand.

- Use the literal single-element array `preload_skills: ["*"]` to preload
  every skill in `skills` — this is the right choice for an agent whose
  skill list is small and used on effectively every dispatch (e.g. one
  skill it always follows for its core deliverable).
- Use a named subset (e.g. `preload_skills: ["skill/plan-lifecycle"]`) when the
  agent's `skills` list mixes something used on every dispatch with others
  that are conditional or subsystem-specific — preload only the universal
  one(s), leave the rest for on-demand discovery.
- Every entry (other than the `["*"]` sentinel) must also appear in
  `skills` — validated as a subset, same as `approved_tools ⊆ tools`.
- `"*"` must be the sole entry when used — never mixed with named skills.
- Kiro ignores this field entirely; it always resources the full `skills`
  list regardless.

### Step 8 — Self-validate

Verify against the checklist:

- [ ] File is at `agents/{name}.yaml`
- [ ] `name` is kebab-case and matches the filename (without `.yaml`)
- [ ] `version` is valid semver
- [ ] `description` is one sentence
- [ ] `domain` is a valid domain with corresponding steering in `steering/{domain}/`
- [ ] `prompt` is written as a direct instruction to the agent
- [ ] `tools` only contains tools from the canonical list or `@server/tool` refs
- [ ] `approved_tools` is a subset of `tools`
- [ ] All entries in `skills` reference existing folders in `skills/`
- [ ] `preload_skills`, if present, is either `["*"]` or a subset of `skills`
- [ ] Every citation of another skill, agent, or doc is checked against `steering/engineering/core.md`: "Cite, Don't Restate" — cited, not also restated
- [ ] Purpose/Responsibilities/other narrative sections don't restate an enumerated constraint that Hard rules already states (`steering/engineering/core.md`: "Cite, Don't Restate") — point to Hard rules instead
- [ ] `tools` combining a `moderate` and a `privileged` entry has the isolation documented in Hard rules (`skills/agent-authoring/reference/tools.yaml`'s trifecta-avoidance rule) — otherwise drop one side or add the documentation

---

## Outputs

- **`agents/{name}.yaml`** — the agent definition
- **`agents/{name}.md`** (optional) — extended documentation for complex agents

---

## Edge Cases

- **Agent needs a tool not in the canonical list** — if it's an MCP server tool, use `@server/tool_name` format. If it's a genuinely new built-in tool, add it to the tool list in `skills/agent-authoring/reference/tools.yaml`.
- **Skill doesn't exist yet** — create the skill first using `skill/skill-authoring`, then reference it.
- **Unsure about domain** — check what steering directories exist in `steering/`. If none fit, the agent may need a new domain (which means creating corresponding steering files).
- **Two agents overlap in responsibility** — clarify scope boundaries in both prompts. Each agent should have a distinct, non-overlapping job.
- **Prompt contains a generic-sounding rule used by only one agent** — don't extract preemptively; record it in `docs/agent-prompt-extraction-candidates.md` instead and revisit when a second agent needs it.
