# Agent Schema Reference

## File

`agents/{name}.yaml` — optional companion `agents/{name}.md` for extended docs.

## Fields

```yaml
name: 'agent-name' # Required. Kebab-case, matches filename.
version: '0.1.1' # Required. Semver.
domain: 'engineering' # Required. Must match a steering/{domain}/ directory.
description: 'One sentence.' # Required. What this agent does.
prompt: | # Required. Direct instruction to the agent.
  ...
tools: # Required. From tools.yaml canonical list.
  - 'read'
  - 'write'
approved_tools: # Required. Subset of tools, runs without confirmation.
  - 'read'
skills: # Optional. References to skills/{name}/ folders.
  - 'skill/plan-lifecycle'
preload_skills: # Optional. Subset of skills (or ["*"]) to preload; see Step 7.
  - 'skill/plan-lifecycle'
blocked_commands: # Optional. Shell command glob patterns this agent may not run directly.
  - 'git *'
```

## Prompt guidelines

Write as a direct instruction. Include:

- Identity and role
- Operating process (numbered steps)
- Hard rules (never violate)
- Scope boundaries (what it does NOT do)

Do not include:

- Steering rules (loaded automatically from domain)
- Tool documentation (harness provides)
- Other agents' responsibilities

## Skills format

`"skill/{folder-name}"` — every entry must have a corresponding `skills/{name}/SKILL.md`.
