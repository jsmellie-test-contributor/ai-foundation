// ------------------------------
// resolver.js
//
// Author: Starvoxel AI Agent - 2026-10-04
// Plan: AIF-006
//
// Copyright (c) StarVoxel. All rights reserved.
// ------------------------------

/**
 * Bundle resolver — reads a bundle YAML and resolves all components
 * that should be installed.
 *
 * Resolution order:
 * 1. If `domain` is set, auto-discover by domain
 * 2. Append explicit lists from the bundle file
 * 3. Expand skills to the transitive closure of `requires_skills`
 *    (skills' and steering files' frontmatter)
 * 4. Deduplicate
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import YAML from 'yaml';
import { SOURCE_DIRS } from './constants.js';
import { parseFrontmatter } from './file-utils.js';

/** A skill name usable as a folder under `skills/` — kebab-case, no separators. */
const SKILL_NAME_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

/**
 * @typedef {object} ResolvedBundle
 * @property {string}   name
 * @property {string}   version
 * @property {string}   description
 * @property {string[]} agents   - Agent filenames, e.g. ["architect.yaml"]
 * @property {string[]} skills   - Skill folder names, e.g. ["plan-lifecycle"]
 * @property {string[]} steering - Relative paths from repo root, e.g. ["steering/global/core.md"]
 * @property {string[]} servers  - Server folder names, e.g. ["git"]
 */

/**
 * Resolve a bundle by name.
 * @param {string} bundleName - Name of the bundle (matches filename without .yaml)
 * @param {string} repoRoot   - Absolute path to the repository root
 * @returns {ResolvedBundle}
 */
export function resolveBundle(bundleName, repoRoot) {
  const bundlePath = join(repoRoot, SOURCE_DIRS.bundles, bundleName, 'bundle.yaml');
  if (!existsSync(bundlePath)) {
    throw new Error(`Bundle not found: ${bundleName} (looked at ${bundlePath})`);
  }

  const content = readFileSync(bundlePath, 'utf8');
  const bundle = YAML.parse(content);

  if (!bundle || typeof bundle !== 'object') {
    throw new Error(`Bundle "${bundleName}" is empty or invalid YAML.`);
  }

  const hasDomain = Boolean(bundle.domain);
  const hasExplicit =
    (Array.isArray(bundle.agents) && bundle.agents.length > 0) ||
    (Array.isArray(bundle.skills) && bundle.skills.length > 0) ||
    (Array.isArray(bundle.steering) && bundle.steering.length > 0) ||
    (Array.isArray(bundle.servers) && bundle.servers.length > 0);

  if (!hasDomain && !hasExplicit) {
    throw new Error(
      `Bundle "${bundleName}" specifies neither a domain nor explicit component lists.`,
    );
  }

  // Collect components
  let agents = [];
  let skills = [];
  let steering = [];
  let servers = [];

  // --- Domain auto-discovery ---
  if (hasDomain) {
    const discovered = discoverByDomain(bundle.domain, repoRoot);
    agents = discovered.agents;
    skills = discovered.skills;
    steering = discovered.steering;
    servers = discovered.servers;
  }

  // --- Append explicit lists ---
  if (Array.isArray(bundle.agents)) {
    agents.push(...bundle.agents);
  }
  if (Array.isArray(bundle.skills)) {
    skills.push(...bundle.skills);
  }
  if (Array.isArray(bundle.steering)) {
    steering.push(...bundle.steering);
  }
  if (Array.isArray(bundle.servers)) {
    servers.push(...bundle.servers);
  }

  // --- Deduplicate, then expand skills to the requires_skills closure ---
  const steeringList = dedupe(steering);
  const seeds = [...dedupe(skills), ...readSteeringRequiredSkills(steeringList, repoRoot)];

  return {
    name: bundle.name,
    version: bundle.version,
    description: bundle.description,
    agents: dedupe(agents),
    skills: computeSkillClosure(seeds, createSkillDepsReader(repoRoot)),
    steering: steeringList,
    servers: dedupe(servers),
  };
}

/**
 * Extract and validate the `requires_skills` list from markdown content
 * (a skill's SKILL.md or a steering file). Pure: no I/O.
 * Entries are bare kebab-case names; a `skill/` prefix is accepted and
 * normalised via parseSkillRef. Anything else (`../x`, `a/b`, non-strings)
 * throws, since names become filesystem paths.
 * @param {string} content - Raw markdown with optional YAML frontmatter
 * @param {string} label   - File label used in error messages
 * @returns {string[]} Normalised skill names (empty when the field is absent)
 */
export function parseRequiresSkills(content, label) {
  const { frontmatter } = parseFrontmatter(content);
  const raw = frontmatter?.requires_skills;
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw) || raw.some((entry) => typeof entry !== 'string')) {
    throw new Error(`${label}: requires_skills must be a list of skill names (strings)`);
  }
  return raw.map((entry) => {
    const name = parseSkillRef(entry);
    if (!name || !SKILL_NAME_PATTERN.test(name)) {
      throw new Error(
        `${label}: invalid requires_skills entry "${entry}" (expected a kebab-case skill name)`,
      );
    }
    return name;
  });
}

/**
 * Compute the transitive closure of skill dependencies. Pure: dependency
 * lookup is injected. Depth-first from each seed in order, with a visited
 * set that deduplicates and ends any branch at the first repeated skill, so
 * cycles are legal and silent.
 * @param {string[]} seeds - Starting skill names
 * @param {(name: string) => string[]|undefined} getDeps - `requires_skills` of a
 *   skill, or undefined when the skill does not exist
 * @returns {string[]} Closure in visit order (each seed followed by its dependencies)
 * @throws {Error} Naming the chain, e.g. "feature-planning → plan-lifecycle → (missing)"
 */
export function computeSkillClosure(seeds, getDeps) {
  const visited = new Set();
  const order = [];

  const visit = (name, chain) => {
    if (visited.has(name)) return;
    const path = [...chain, name];
    const deps = getDeps(name);
    if (!deps) {
      throw new Error(`Missing skill in dependency chain: ${path.join(' → ')} → (missing)`);
    }
    visited.add(name);
    order.push(name);
    for (const dep of deps) visit(dep, path);
  };

  for (const seed of seeds) visit(seed, []);
  return order;
}

/**
 * Build a `getDeps` function for computeSkillClosure that reads each skill's
 * `skills/<name>/SKILL.md` frontmatter on demand (thin I/O wrapper).
 * @param {string} repoRoot
 * @returns {(name: string) => string[]|undefined}
 */
export function createSkillDepsReader(repoRoot) {
  const cache = new Map();
  return (name) => {
    if (!SKILL_NAME_PATTERN.test(name)) {
      throw new Error(`Invalid skill name "${name}" (expected a kebab-case skill name)`);
    }
    if (cache.has(name)) return cache.get(name);
    const skillPath = join(repoRoot, SOURCE_DIRS.skills, name, 'SKILL.md');
    const deps = existsSync(skillPath)
      ? parseRequiresSkills(readFileSync(skillPath, 'utf8'), `skills/${name}/SKILL.md`)
      : undefined;
    cache.set(name, deps);
    return deps;
  };
}

/**
 * Collect `requires_skills` across steering files (thin I/O wrapper).
 * Files that do not exist are skipped (explicit bundle entries are not
 * validated here).
 * @param {string[]} steeringPaths - Paths relative to repo root
 * @param {string} repoRoot
 * @returns {string[]} Skill names in steering order (may contain duplicates)
 */
export function readSteeringRequiredSkills(steeringPaths, repoRoot) {
  const names = [];
  for (const relPath of steeringPaths) {
    const abs = join(repoRoot, relPath);
    if (!existsSync(abs)) continue;
    names.push(...parseRequiresSkills(readFileSync(abs, 'utf8'), relPath));
  }
  return names;
}

/**
 * Auto-discover components by domain.
 * @param {string} domain
 * @param {string} repoRoot
 * @returns {{ agents: string[], skills: string[], steering: string[], servers: string[] }}
 */
function discoverByDomain(domain, repoRoot) {
  const agentsDir = join(repoRoot, SOURCE_DIRS.agents);
  const steeringDir = join(repoRoot, SOURCE_DIRS.steering);
  const serversDir = join(repoRoot, SOURCE_DIRS.servers);

  // 1. Find all agents where agent.domain == domain
  const agents = findAgentsByDomain(domain, agentsDir);

  // 2. Collect skills from those agents' skills fields
  const skills = collectSkillsFromAgents(agents, agentsDir);

  // 3. Steering: global/**/*.md + {domain}/**/*.md
  const steering = collectSteering(domain, steeringDir, repoRoot);

  // 4. Servers: resolve from agent tools that use @server/tool format
  const servers = resolveServersFromAgents(agents, agentsDir, serversDir);

  return { agents, skills, steering, servers };
}

/**
 * Find agent filenames whose domain matches.
 * @param {string} domain
 * @param {string} agentsDir
 * @returns {string[]} Agent filenames, e.g. ["architect.yaml"]
 */
function findAgentsByDomain(domain, agentsDir) {
  if (!existsSync(agentsDir)) return [];

  const files = readdirSync(agentsDir).filter((f) => f.endsWith('.yaml') && f !== '_template.yaml');

  const matched = [];
  for (const file of files) {
    const content = readFileSync(join(agentsDir, file), 'utf8');
    const agent = YAML.parse(content);
    if (agent && agent.domain === domain) {
      matched.push(file);
    }
  }

  return matched;
}

/**
 * Collect unique skill names from agents' skills fields.
 * Skills are declared as "skill/plan-lifecycle" → extract "plan-lifecycle".
 * @param {string[]} agentFiles
 * @param {string} agentsDir
 * @returns {string[]} Skill folder names
 */
function collectSkillsFromAgents(agentFiles, agentsDir) {
  const skills = new Set();

  for (const file of agentFiles) {
    const content = readFileSync(join(agentsDir, file), 'utf8');
    const agent = YAML.parse(content);
    if (agent && Array.isArray(agent.skills)) {
      for (const ref of agent.skills) {
        const name = parseSkillRef(ref);
        if (name) {
          skills.add(name);
        }
      }
    }
  }

  return [...skills];
}

/**
 * Parse a skill reference string into its folder name.
 * "skill/plan-lifecycle" → "plan-lifecycle"
 * "plan-lifecycle" → "plan-lifecycle"
 * "" → null
 * @param {string} ref
 * @returns {string|null}
 */
export function parseSkillRef(ref) {
  if (!ref) return null;
  const name = ref.startsWith('skill/') ? ref.slice('skill/'.length) : ref;
  return name || null;
}

/**
 * Collect steering file paths (relative to repo root) for global + domain.
 * @param {string} domain
 * @param {string} steeringDir
 * @param {string} repoRoot
 * @returns {string[]} Relative paths from repo root
 */
function collectSteering(domain, steeringDir, repoRoot) {
  const paths = [];

  // Global steering
  const globalDir = join(steeringDir, 'global');
  if (existsSync(globalDir)) {
    paths.push(...collectMdFiles(globalDir, repoRoot));
  }

  // Domain steering
  const domainDir = join(steeringDir, domain);
  if (existsSync(domainDir)) {
    paths.push(...collectMdFiles(domainDir, repoRoot));
  }

  return paths;
}

/**
 * Recursively collect all .md files in a directory, returning paths relative to repoRoot.
 * @param {string} dir
 * @param {string} repoRoot
 * @returns {string[]}
 */
function collectMdFiles(dir, repoRoot) {
  const results = [];
  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectMdFiles(fullPath, repoRoot));
    } else if (entry.name.endsWith('.md') && !entry.name.startsWith('_')) {
      results.push(relative(repoRoot, fullPath).replace(/\\/g, '/'));
    }
  }

  return results;
}

/**
 * Resolve server names from agent tools that use the @server/tool format.
 * @param {string[]} agentFiles
 * @param {string} agentsDir
 * @param {string} serversDir
 * @returns {string[]} Server folder names
 */
function resolveServersFromAgents(agentFiles, agentsDir, serversDir) {
  const serverNames = new Set();

  for (const file of agentFiles) {
    const content = readFileSync(join(agentsDir, file), 'utf8');
    const agent = YAML.parse(content);
    if (agent && Array.isArray(agent.tools)) {
      for (const tool of agent.tools) {
        const server = parseServerToolRef(tool);
        if (server) {
          serverNames.add(server);
        }
      }
    }
  }

  // Only include servers that actually exist
  const existing = [];
  for (const name of serverNames) {
    const serverDir = join(serversDir, name);
    if (existsSync(serverDir)) {
      existing.push(name);
    }
  }

  return existing;
}

/**
 * Parse a tool string to extract the server name if it uses @server/tool format.
 * "@git/git_status" → "git"
 * "file-read" → null
 * @param {string} tool
 * @returns {string|null}
 */
export function parseServerToolRef(tool) {
  if (!tool) return null;
  const match = tool.match(/^@([^/]+)\//);
  return match ? match[1] : null;
}

/**
 * List available standards files (in standards/ excluding _template and README).
 * @param {string} repoRoot
 * @returns {string[]} Filenames, e.g. ["csharp-avalonia.md"]
 */
export function listStandards(repoRoot) {
  const standardsDir = join(repoRoot, SOURCE_DIRS.standards);
  if (!existsSync(standardsDir)) return [];

  return readdirSync(standardsDir).filter(
    (f) => f.endsWith('.md') && !f.startsWith('_') && f !== 'README.md',
  );
}

/**
 * List available bundle names (files in bundles/ excluding _template).
 * @param {string} repoRoot
 * @returns {string[]}
 */
export function listBundles(repoRoot) {
  const bundlesDir = join(repoRoot, SOURCE_DIRS.bundles);
  if (!existsSync(bundlesDir)) return [];

  const entries = readdirSync(bundlesDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('_'))
    .filter((entry) => existsSync(join(bundlesDir, entry.name, 'bundle.yaml')))
    .map((entry) => entry.name);
}

/**
 * List available server names (directories in servers/ with a matching {name}.yaml).
 * @param {string} repoRoot
 * @returns {string[]}
 */
export function listServers(repoRoot) {
  const serversDir = join(repoRoot, SOURCE_DIRS.servers);
  if (!existsSync(serversDir)) return [];

  const entries = readdirSync(serversDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('_'))
    .filter((entry) => existsSync(join(serversDir, entry.name, `${entry.name}.yaml`)))
    .map((entry) => entry.name);
}

/**
 * List available harness-level shared hook resource names (subdirectories of
 * lib/harnesses/assets/, e.g. "block-command").
 * @param {string} repoRoot
 * @returns {string[]}
 */
export function listHookResources(repoRoot) {
  const hookAssetsDir = join(repoRoot, SOURCE_DIRS.hookAssets);
  if (!existsSync(hookAssetsDir)) return [];

  const entries = readdirSync(hookAssetsDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('_'))
    .map((entry) => entry.name);
}

/**
 * Deduplicate an array while preserving order.
 * @param {string[]} arr
 * @returns {string[]}
 */
export function dedupe(arr) {
  return [...new Set(arr)];
}
