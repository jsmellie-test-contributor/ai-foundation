// ------------------------------
// base.js
//
// Author: Starvoxel AI Agent - 2026-10-02
// Plan: AIF-010
//
// Copyright (c) StarVoxel. All rights reserved.
// ------------------------------

/**
 * Base harness adapter — shared install logic for all harness adapters.
 *
 * Each harness provides a config object with its targets, tool map, and
 * transform functions. This module provides the generic install orchestration
 * that reads sources, delegates to transforms, writes outputs, and returns
 * manifest-ready records, plus the shared tool-mapping contract (UNSUPPORTED
 * marker, three-state resolver) every adapter resolves tools through.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import YAML from 'yaml';

import { TOOLS } from '../constants.js';
import { hashContent, writeToTarget } from '../file-utils.js';

// --- Shared utilities ---

/**
 * Strip the `skill/` prefix from an agent's `skills`/`preload_skills` entry,
 * giving the bare name a harness's native skill mechanism expects (e.g.
 * `Skill({skill: name})`, or a `skill://` resource URI).
 * @param {string} ref
 * @returns {string}
 */
export function stripSkillPrefix(ref) {
  return ref.startsWith('skill/') ? ref.slice('skill/'.length) : ref;
}

/**
 * Resolve which of an agent's declared `skills` should be preloaded, per
 * its `preload_skills` field:
 * - absent/undefined: preload nothing (skills stay reachable only via
 *   on-demand invocation) — adding this field must never silently change
 *   an agent's existing behavior.
 * - exactly `["*"]`: preload everything in `skills`.
 * - otherwise: preload exactly the named subset (validated elsewhere to be
 *   a subset of `skills`).
 * @param {import('../component-defs.js').AgentDef} agent
 * @returns {string[]} Skill refs (still `skill/`-prefixed) to preload
 */
export function resolvePreloadSkills(agent) {
  const declared = agent.skills || [];
  const spec = agent.preload_skills;
  if (!spec) return [];
  if (spec.length === 1 && spec[0] === '*') return declared;
  return spec;
}

// --- Tool-mapping contract ---

/**
 * The one shared marker for "this harness has verified no native equivalent".
 * A toolMap entry is either a non-empty array of native names (a "cluster")
 * or this marker; adapters never encode "nothing" any other way (`null`,
 * `[]`, ...). Resolution reports it as dropped at install time.
 */
export const UNSUPPORTED = Symbol('UNSUPPORTED');

/** Well-formed `@server/tool` MCP reference (ADR 0004). */
export const MCP_TOOL_REF = /^@([^/]+)\/(.+)$/;

/**
 * @param {string} name
 * @returns {boolean} True when `name` is a well-formed `@server/tool` reference
 */
export function isMcpToolRef(name) {
  return typeof name === 'string' && MCP_TOOL_REF.test(name);
}

/**
 * Whether a name in an agent's `tools`/`approved_tools` is acceptable at all:
 * a name in `TOOLS` (harness-neutral group names are added there, ADR 0007), or a well-formed `@server/tool` reference.
 * Harness-independent — used by `aif validate`; adapters additionally need a
 * toolMap entry for each `TOOLS` name (see the adapter contract test).
 * @param {string} name
 * @returns {boolean}
 */
export function isKnownToolName(name) {
  return Object.values(TOOLS).includes(name) || isMcpToolRef(name);
}

/** Thrown when a bare tool name is neither in `TOOLS` nor an `@server/tool` reference. */
export class UnknownToolError extends Error {
  /** @param {string} toolName */
  constructor(toolName) {
    super(`unknown tool "${toolName}" (not a known tool or @server/tool reference)`);
    this.name = 'UnknownToolError';
    this.toolName = toolName;
  }
}

/**
 * @typedef {object} ResolverConfig
 * @property {Record<string, string[]|symbol>} toolMap - `TOOLS` name → native names, or UNSUPPORTED
 * @property {(ref: string) => string} mapRef - Rewrites a well-formed `@server/tool` reference to the harness's native form
 * @property {readonly string[]} [foreignServers] - Servers whose `@server/tool` references the harness cannot hold (platform tools of another harness); resolved as unsupported, not passed through
 */

/**
 * Resolve one name to one of three states.
 * - mapped: in `toolMap` with an array of native names
 * - unsupported: in `toolMap` as UNSUPPORTED (verified no equivalent)
 * - passthrough: a well-formed `@server/tool` reference, rewritten by `mapRef`,
 *   unless its server is in `foreignServers` (then unsupported: passing it
 *   through would look like a grant the harness does not honor)
 * Anything else is rejected — an unknown name is never guessed.
 * @param {string} name
 * @param {ResolverConfig} config
 * @returns {{state: 'mapped'|'passthrough', native: string[]}|{state: 'unsupported', native: []}}
 * @throws {UnknownToolError}
 */
export function resolveTool(name, { toolMap, mapRef, foreignServers = [] }) {
  if (Object.hasOwn(toolMap, name)) {
    const entry = toolMap[name];
    if (entry === UNSUPPORTED) return { state: 'unsupported', native: [] };
    return { state: 'mapped', native: /** @type {string[]} */ (entry) };
  }
  if (isMcpToolRef(name)) {
    const server = /** @type {RegExpMatchArray} */ (name.match(MCP_TOOL_REF))[1];
    if (foreignServers.includes(server)) return { state: 'unsupported', native: [] };
    return { state: 'passthrough', native: [mapRef(name)] };
  }
  throw new UnknownToolError(name);
}

/**
 * Resolve a tool list to the harness-native list, deduplicated (a tool shared
 * by several `TOOLS` entries is granted once, and stays granted while any held entry
 * includes it), plus the names dropped as unsupported.
 * @param {string[]} names
 * @param {ResolverConfig} config
 * @returns {{tools: string[], dropped: string[]}}
 * @throws {UnknownToolError}
 */
export function resolveTools(names, config) {
  const tools = new Set();
  const dropped = new Set();
  for (const name of names) {
    const result = resolveTool(name, config);
    if (result.state === 'unsupported') dropped.add(name);
    else for (const native of result.native) tools.add(native);
  }
  return { tools: [...tools], dropped: [...dropped] };
}

/**
 * Single-name convenience lookup (tests, logging): the first native name,
 * or `null` when unsupported. Never returns the generic name as a stand-in.
 * @param {string} name
 * @param {ResolverConfig} config
 * @returns {string|null}
 * @throws {UnknownToolError}
 */
export function mapSingleTool(name, config) {
  const result = resolveTool(name, config);
  return result.state === 'unsupported' ? null : (result.native[0] ?? null);
}

// --- Adapter factory ---

/**
 * @typedef {object} HarnessConfig
 * @property {Record<string, string>} targets - Mutable target path map
 * @property {string} harness - Harness name used in the dropped-tool report (e.g. 'claude', 'kiro')
 * @property {Record<string, string[]|symbol>} toolMap - `TOOLS` name → array of native tool names, or UNSUPPORTED
 * @property {(agent: import('../component-defs.js').AgentDef, dropped?: string[]) => string|object} transformAgent - Agent YAML → output content; pushes the names it dropped as unsupported onto `dropped`
 * @property {(content: string) => string} transformSteering - Steering md → output content
 * @property {string} agentExt - File extension for agents (e.g. '.json', '.md')
 * @property {string} steeringDir - Key in targets for steering output (e.g. 'steering', 'rules')
 * @property {(skillName: string, repoRoot: string) => Array<{src: string, targetPath: string}>} getSkillSources
 * @property {Record<string, (serverName: string, serverDef: import('../component-defs.js').ServerDef, repoRoot: string) => Array<{path: string, hash: string}>>} [serverInstallers] - Protocol → installer function map
 * @property {(agent: import('../component-defs.js').AgentDef) => string|null} [detectSharedResource] - Given a parsed agent, returns the name of a harness-level shared resource it requires (e.g. "block-command"), or null
 * @property {Record<string, (repoRoot: string) => Array<{path: string, hash: string}>>} [sharedResourceInstallers] - Shared resource name → installer function map
 */

/**
 * @typedef {object} Adapter
 * @property {(agentFiles: string[], repoRoot: string) => { files: Array<{path: string, hash: string}>, sharedResources: string[], dropped: Array<{agent: string, tools: string[]}> }} installAgents
 * @property {(steeringPaths: string[], repoRoot: string) => Array<{path: string, hash: string}>} installSteering
 * @property {(skillNames: string[], repoRoot: string) => Array<{path: string, hash: string}>} installSkills
 * @property {(serverNames: string[], repoRoot: string) => Array<{name: string, files: Array<{path: string, hash: string}>}>} installServers
 * @property {(resourceNames: string[], repoRoot: string) => Array<{name: string, files: Array<{path: string, hash: string}>}>} installSharedResources
 * @property {(standardsFiles: string[], repoRoot: string) => Array<{path: string, hash: string}>} installStandards
 */

/**
 * Create a harness adapter with standard install methods.
 *
 * Each adapter provides its own self-contained transformAgent/transformSteering that
 * already close over their own TOOL_MAP. The base just orchestrates the read/write loop.
 *
 * @param {HarnessConfig} config
 * @returns {Adapter}
 */
export function createAdapter(config) {
  const {
    harness,
    targets,
    transformAgent,
    transformSteering,
    agentExt,
    steeringDir,
    getSkillSources,
    serverInstallers,
    detectSharedResource,
    sharedResourceInstallers,
  } = config;

  /**
   * Install agents. Every agent is transformed before anything is written, so
   * an agent naming an unknown tool fails the whole install with no partial
   * agent output. Dropped (unsupported) tools are reported once per agent.
   * @throws {Error} naming the offending agent and tool
   */
  function installAgents(agentFiles, repoRoot) {
    const prepared = [];

    for (const file of agentFiles) {
      const srcPath = join(repoRoot, 'agents', file);
      if (!existsSync(srcPath)) {
        console.error(`  ✗ agent source not found: ${file}`);
        continue;
      }
      const agent = YAML.parse(readFileSync(srcPath, 'utf8'));
      const droppedRaw = [];
      let output;
      try {
        output = transformAgent(agent, droppedRaw);
      } catch (err) {
        if (err instanceof UnknownToolError) {
          throw new Error(`agent "${agent.name}": ${err.message}`, { cause: err });
        }
        throw err;
      }
      prepared.push({ agent, output, dropped: [...new Set(droppedRaw)] });
    }

    const installed = [];
    const sharedResources = new Set();
    const dropped = [];

    for (const { agent, output, dropped: agentDropped } of prepared) {
      const targetPath = join(targets.agents, `${agent.name}${agentExt}`);
      const outputStr = typeof output === 'object' ? JSON.stringify(output, null, 2) : output;
      writeToTarget(targetPath, outputStr);
      installed.push({ path: targetPath, hash: hashContent(outputStr) });
      console.log(`  ✓ agent: ${agent.name}`);

      if (agentDropped.length > 0) {
        dropped.push({ agent: agent.name, tools: agentDropped });
        console.log(`    ⊘ dropped for ${harness}: ${agentDropped.join(', ')}`);
      }

      if (typeof detectSharedResource === 'function') {
        const resourceName = detectSharedResource(agent);
        if (resourceName) {
          sharedResources.add(resourceName);
        }
      }
    }

    return { files: installed, sharedResources: [...sharedResources], dropped };
  }

  function installSteering(steeringPaths, repoRoot) {
    const installed = [];

    for (const relPath of steeringPaths) {
      const srcPath = join(repoRoot, relPath);
      if (!existsSync(srcPath)) {
        console.error(`  ✗ steering source not found: ${relPath}`);
        continue;
      }
      const content = readFileSync(srcPath, 'utf8');
      const transformed = transformSteering(content);

      const targetName = relPath.replace(/^steering\//, '').replace(/\//g, '-');
      const targetPath = join(targets[steeringDir], targetName);
      writeToTarget(targetPath, transformed);
      installed.push({ path: targetPath, hash: hashContent(transformed) });
      console.log(`  ✓ ${steeringDir === 'rules' ? 'rule' : 'steering'}: ${targetName}`);
    }

    return installed;
  }

  function installSkills(skillNames, repoRoot) {
    const installed = [];

    for (const skillName of skillNames) {
      const sources = getSkillSources(skillName, repoRoot);
      for (const { src, targetPath } of sources) {
        if (!existsSync(src)) {
          console.error(`  ✗ skill source not found: ${skillName}`);
          continue;
        }
        const content = readFileSync(src);
        writeToTarget(targetPath, content);
        installed.push({ path: targetPath, hash: hashContent(content) });
      }
      if (sources.length > 0) {
        console.log(`  ✓ skill: ${skillName}`);
      }
    }

    return installed;
  }

  /**
   * Install MCP servers, grouped per server so each can be tracked as an
   * independently-owned, shared manifest resource.
   * @param {string[]} serverNames
   * @param {string} repoRoot
   * @returns {Array<{ name: string, files: Array<{path: string, hash: string}> }>}
   */
  function installServers(serverNames, repoRoot) {
    const results = [];

    for (const name of serverNames) {
      const yamlPath = join(repoRoot, 'servers', name, `${name}.yaml`);
      if (!existsSync(yamlPath)) {
        console.error(`  ✗ server definition not found: ${name}`);
        continue;
      }

      const content = readFileSync(yamlPath, 'utf8');
      const serverDef = YAML.parse(content);

      if (!serverDef || !serverDef.protocol) {
        console.error(`  ✗ server "${name}" has no protocol field`);
        continue;
      }

      if (!serverInstallers || !serverInstallers[serverDef.protocol]) {
        console.log(
          `  ⊘ server: ${name} (protocol "${serverDef.protocol}" not supported by this harness)`,
        );
        continue;
      }

      const installer = serverInstallers[serverDef.protocol];
      const files = installer(name, serverDef, repoRoot);
      results.push({ name, files });
    }

    return results;
  }

  /**
   * Install harness-level shared resources (e.g. Claude Code's block-command
   * hook script), grouped per resource so each can be tracked as an
   * independently-owned, shared manifest resource.
   * @param {string[]} resourceNames
   * @param {string} repoRoot
   * @returns {Array<{ name: string, files: Array<{path: string, hash: string}> }>}
   */
  function installSharedResources(resourceNames, repoRoot) {
    const results = [];

    for (const name of resourceNames) {
      if (!sharedResourceInstallers || !sharedResourceInstallers[name]) {
        console.error(`  ✗ shared resource "${name}" has no installer for this harness`);
        continue;
      }

      const files = sharedResourceInstallers[name](repoRoot);
      results.push({ name, files });
    }

    return results;
  }

  function installStandards(standardsFiles, repoRoot) {
    const installed = [];

    for (const file of standardsFiles) {
      const srcPath = join(repoRoot, 'standards', file);
      if (!existsSync(srcPath)) {
        console.error(`  ✗ standards source not found: ${file}`);
        continue;
      }
      const content = readFileSync(srcPath, 'utf8');
      const targetPath = join(targets.standards, file);
      writeToTarget(targetPath, content);
      installed.push({ path: targetPath, hash: hashContent(content) });
      console.log(`  ✓ standard: ${file.replace(/\.md$/, '')}`);
    }

    return installed;
  }

  return {
    installAgents,
    installSteering,
    installSkills,
    installServers,
    installSharedResources,
    installStandards,
  };
}
