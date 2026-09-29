---
name: 'bundle-authoring'
version: '0.2.1'
description: 'Creates a bundle definition that specifies what components to install for a harness.'
---

## Purpose

Creates a new bundle in `bundles/`. A bundle defines what components (agents, skills, steering, servers) get installed to a target harness. Bundles can auto-discover by domain, explicitly list components, or both.

Use this skill when adding a new installable configuration for a harness.

---

## Inputs

- **Bundle name** — kebab-case identifier (becomes the directory name)
- **What to install** — domain-based discovery, explicit lists, or a combination
- **Target audience** — which users/teams will install this bundle

---

## Steps

### Step 1 — Create the bundle file

Create `bundles/{name}/bundle.yaml`. Use the schema in `skills/bundle-authoring/reference/schema.yaml`.

### Step 2 — Choose a resolution strategy

| Strategy            | When to use                                                      |
| ------------------- | ---------------------------------------------------------------- |
| `domain` only       | Install everything for a domain (most common)                    |
| Explicit lists only | Cherry-pick specific components across domains                   |
| Both                | Domain discovery + additional components from outside the domain |

### Step 3 — Configure domain discovery (if using)

Set `domain: "{name}"`. The resolver applies `reference/schema.yaml`'s
`resolution.domain_discovery` block — see it for the exact algorithm (agents
by domain, their skills, domain steering, and server refs).

### Step 4 — Add explicit components (if needed)

Append components that domain discovery doesn't catch:

```yaml
agents: ['extra-agent.yaml']
skills: ['extra-skill']
steering: ['steering/other/file.md']
servers: ['extra-server']
```

Explicit lists are appended after discovery. Duplicates are removed automatically.

### Step 5 — Self-validate

- [ ] File is at `bundles/{name}/bundle.yaml`
- [ ] Has `name`, `version`, `description`
- [ ] Has either `domain` or at least one non-empty list (or both)
- [ ] `name` is kebab-case, matches directory name
- [ ] Referenced agents/skills/servers actually exist in the repo
- [ ] Every citation of another skill, agent, or doc is checked against `steering/engineering/core.md`: "Cite, Don't Restate"

---

## Outputs

- **`bundles/{name}/bundle.yaml`** — the bundle definition

---

## Edge Cases

- **Bundle specifies neither domain nor lists** — resolver will error. Every bundle must resolve to at least one component.
- **Domain has no agents** — valid but produces an empty bundle (only steering). Consider whether explicit lists are more appropriate.
- **Component referenced in explicit list doesn't exist** — the resolver includes it anyway (for forward references). The install command will fail when it can't find the source file.
