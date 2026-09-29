/**
 * Base harness adapter — shared install logic for all harness adapters.
 *
 * Each harness provides a config object with its targets, tool map, and
 * transform functions. This module provides the generic install orchestration
 * that reads sources, delegates to transforms, writes outputs, and returns
 * manifest-ready records.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import YAML from 'yaml';

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

// --- Adapter factory ---

/**
 * @typedef {object} HarnessConfig
 * @property {Record<string, string>} targets - Mutable target path map
 * @property {Record<string, string[]|string|null>} toolMap - Generic→harness tool name map. Claude's
 *   adapter maps each generic name to an array of native tool names (possibly empty); Kiro's maps
 *   to a single native name or null.
 * @property {(agent: import('../component-defs.js').AgentDef) => string|object} transformAgent - Agent YAML → output content
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
 * @property {(agentFiles: string[], repoRoot: string) => { files: Array<{path: string, hash: string}>, sharedResources: string[] }} installAgents
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

  function installAgents(agentFiles, repoRoot) {
    const installed = [];
    const sharedResources = new Set();

    for (const file of agentFiles) {
      const srcPath = join(repoRoot, 'agents', file);
      if (!existsSync(srcPath)) {
        console.error(`  ✗ agent source not found: ${file}`);
        continue;
      }
      const content = readFileSync(srcPath, 'utf8');
      const agent = YAML.parse(content);
      const output = transformAgent(agent);

      const targetPath = join(targets.agents, `${agent.name}${agentExt}`);
      const outputStr = typeof output === 'object' ? JSON.stringify(output, null, 2) : output;
      writeToTarget(targetPath, outputStr);
      installed.push({ path: targetPath, hash: hashContent(outputStr) });
      console.log(`  ✓ agent: ${agent.name}`);

      if (typeof detectSharedResource === 'function') {
        const resourceName = detectSharedResource(agent);
        if (resourceName) {
          sharedResources.add(resourceName);
        }
      }
    }

    return { files: installed, sharedResources: [...sharedResources] };
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
