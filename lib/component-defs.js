/**
 * Shared type definitions for ai-foundation's component schemas (see
 * AGENTS.md's "Component Types" section). No runtime exports — this file
 * exists purely to give Agent/Server shapes a single, predictable owner
 * that any module can reference via
 * `@param {import('./component-defs.js').AgentDef} agent`-style JSDoc,
 * instead of duplicating the shape or pointing at whichever file happens
 * to consume it.
 */

/**
 * Parsed `agents/*.yaml` content.
 * @typedef {object} AgentDef
 * @property {string} name
 * @property {string} [version]
 * @property {string} [domain]
 * @property {string} [description]
 * @property {string} [prompt]
 * @property {string[]} [tools]
 * @property {string[]} [approved_tools]
 * @property {string[]} [skills]
 * @property {string[]} [preload_skills] - Subset of `skills` to preload
 *   into a subagent's context at startup (harness-dependent; currently
 *   realized only by the Claude Code adapter). Absent means preload
 *   nothing. The literal single-element array `["*"]` means preload all of
 *   `skills`.
 * @property {string[]} [blocked_commands]
 */

/**
 * Optional frontmatter field on skills (`SKILL.md`) and steering files.
 * @typedef {object} RequiresSkillsFrontmatter
 * @property {string[]} [requires_skills] - Skills this file tells readers to
 *   follow. Bare kebab-case names (a `skill/` prefix is accepted). Resolved
 *   transitively by `resolveBundle`; cycles are allowed. Adds to what a
 *   bundle installs and never changes an agent's `skills`/`preload_skills`.
 */

/**
 * Parsed `servers/{name}/{name}.yaml` content.
 * @typedef {object} ServerDef
 * @property {string} [name]
 * @property {string} [version]
 * @property {string} protocol
 * @property {string} [transport]
 * @property {string} [description]
 * @property {string} [url]
 * @property {Record<string, string>} [headers]
 * @property {unknown} [tools]
 */

export {};
