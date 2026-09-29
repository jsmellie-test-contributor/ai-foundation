/**
 * Kiro harness adapter — transforms and installs ai-foundation components
 * into Kiro's native formats and locations.
 */

import { join } from 'node:path';
import { homedir } from 'node:os';
import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import YAML from 'yaml';

import { createAdapter, stripSkillPrefix } from './base.js';
import { parseFrontmatter, collectFiles, writeToTarget, hashContent } from '../file-utils.js';
import { TOOLS } from '../constants.js';

// --- Target paths ---

const kiroBase = join(homedir(), '.kiro');

export const TARGETS = {
  agents: join(kiroBase, 'agents'),
  steering: join(kiroBase, 'steering'),
  skills: join(kiroBase, 'skills'),
  servers: join(kiroBase, 'servers'),
  standards: join(kiroBase, 'standards'),
  mcpSettings: join(kiroBase, 'settings', 'mcp.json'),
};

// --- Tool name map ---

/**
 * Maps ai-foundation generic tool names to Kiro's built-in tool names.
 * Our generic names are aligned with Kiro/Copilot, so most are identity mappings.
 * The map serves as documentation of supported tools and the extension point for
 * future adapters where names diverge (e.g. Claude Code: shell → Bash).
 *
 * `null` means Kiro has no confirmed native equivalent — verified absent, not
 * unresearched. It is dropped from the agent's tool list (see transformAgent)
 * rather than guessed at or passed through, so it never masquerades as a
 * working grant (the mistake Claude Code's now-corrected `code` → `LSP`
 * mapping made).
 */
export const TOOL_MAP = {
  [TOOLS.READ]: 'read',
  [TOOLS.WRITE]: 'write',
  [TOOLS.SHELL]: 'shell',
  [TOOLS.WEB_SEARCH]: 'web_search',
  [TOOLS.WEB_FETCH]: 'web_fetch',
  [TOOLS.GREP]: 'grep',
  [TOOLS.GLOB]: 'glob',
  [TOOLS.CODE]: 'code',
  [TOOLS.SUBAGENT]: 'subagent',
  [TOOLS.PLAN]: null,
  [TOOLS.ASK_USER]: null,
  [TOOLS.TASK]: null,
  [TOOLS.SKILL]: null,
};

// --- Tool mapping ---

/**
 * Map a single tool name from our format to Kiro's format. Returns `null`
 * for a generic tool explicitly unsupported on Kiro (see TOOL_MAP), or the
 * name unchanged if it isn't in the map at all (e.g. a `@server/tool`
 * reference).
 * @param {string} name
 * @returns {string|null}
 */
export function mapToolName(name) {
  return name in TOOL_MAP ? TOOL_MAP[name] : name;
}

// --- Transform functions ---

/**
 * Transform an ai-foundation agent YAML into Kiro's JSON agent format.
 * @param {import('../component-defs.js').AgentDef} agent - Parsed agent YAML object
 * @returns {object} Kiro agent JSON
 */
export function transformAgent(agent) {
  const tools = (agent.tools || []).map(mapToolName).filter((t) => t !== null);
  const allowedTools = (agent.approved_tools || []).map(mapToolName).filter((t) => t !== null);

  const resources = ['file://.kiro/steering/**/*.md'];

  if (Array.isArray(agent.skills)) {
    for (const ref of agent.skills) {
      const name = stripSkillPrefix(ref);
      if (name) {
        resources.push(`skill://.kiro/skills/${name}/SKILL.md`);
      }
    }
  }

  const result = {
    name: agent.name,
    description: agent.description,
    prompt: agent.prompt,
    tools,
    allowedTools,
    resources,
  };

  // Emit permission deny rules for blocked shell commands. Unlike Claude
  // Code, Kiro embeds this directly into the agent's own JSON — no shared
  // external script is needed, so Kiro configures no detectSharedResource.
  if (Array.isArray(agent.blocked_commands) && agent.blocked_commands.length > 0) {
    result.permissions = {
      rules: [{ capability: 'shell', match: agent.blocked_commands, effect: 'deny' }],
    };
  }

  return result;
}

/**
 * Transform steering file content for Kiro.
 * Rewrites frontmatter: file_patterns → inclusion + fileMatchPattern.
 * Strips framework-specific fields. Passes body through unchanged.
 *
 * @param {string} content - Raw markdown file content with YAML frontmatter
 * @returns {string} Transformed content with Kiro-compatible frontmatter
 */
export function transformSteering(content) {
  const { frontmatter, body } = parseFrontmatter(content);

  if (!frontmatter) {
    return content.replace(/\{\{standards_path\}\}/g, TARGETS.standards);
  }

  const kiroFrontmatter = {};

  const filePatterns = frontmatter.file_patterns;
  if (Array.isArray(filePatterns) && filePatterns.length > 0) {
    kiroFrontmatter.inclusion = 'fileMatch';
    kiroFrontmatter.fileMatchPattern = filePatterns.join(', ');
  } else {
    kiroFrontmatter.inclusion = 'always';
  }

  const yamlStr = YAML.stringify(kiroFrontmatter).trim();
  const resolvedBody = body.replace(/\{\{standards_path\}\}/g, TARGETS.standards);
  return `---\n${yamlStr}\n---\n${resolvedBody}`;
}

// --- Skill sources ---

/**
 * Get the list of files for a skill (full directory tree for Kiro).
 * @param {string} skillName
 * @param {string} repoRoot
 * @returns {Array<{ src: string, relDest: string }>}
 */
export function getSkillFiles(skillName, repoRoot) {
  const skillDir = join(repoRoot, 'skills', skillName);
  return collectFiles(skillDir).map((relPath) => ({
    src: join(skillDir, relPath),
    relDest: relPath,
  }));
}

/**
 * Get skill sources in the format expected by createAdapter.
 * @param {string} skillName
 * @param {string} repoRoot
 * @returns {Array<{src: string, targetPath: string}>}
 */
function getSkillSources(skillName, repoRoot) {
  const skillDir = join(repoRoot, 'skills', skillName);
  return collectFiles(skillDir).map((relPath) => ({
    src: join(skillDir, relPath),
    targetPath: join(TARGETS.skills, skillName, relPath),
  }));
}

// --- Create adapter instance ---

/**
 * Install an MCP server with stdio transport.
 * Copies runtime files to ~/.kiro/servers/{name}/, runs npm install,
 * and registers the server in ~/.kiro/settings/mcp.json.
 *
 * @param {string} name - Server folder name
 * @param {import('../component-defs.js').ServerDef} serverDef - Parsed server YAML definition
 * @param {string} repoRoot - Absolute path to the repository root
 * @returns {Array<{path: string, hash: string}>} Manifest entries for installed files
 */
function installMcpStdio(name, serverDef, repoRoot) {
  const installed = [];
  const serverSrcDir = join(repoRoot, 'servers', name);
  const serverTargetDir = join(TARGETS.servers, name);

  // Collect runtime files (exclude tests/ and .test.js files)
  const allFiles = collectFiles(serverSrcDir);
  const runtimeFiles = allFiles.filter((f) => !f.startsWith('tests/') && !f.endsWith('.test.js'));

  // Copy runtime files to target
  for (const relPath of runtimeFiles) {
    const src = join(serverSrcDir, relPath);
    const targetPath = join(serverTargetDir, relPath);
    const content = readFileSync(src);
    writeToTarget(targetPath, content);
    installed.push({ path: targetPath, hash: hashContent(content) });
  }

  // Run npm install in the target directory if package.json exists
  const targetPkgJson = join(serverTargetDir, 'package.json');
  if (existsSync(targetPkgJson)) {
    try {
      execSync('npm install --omit=dev', { cwd: serverTargetDir, stdio: 'pipe' });
    } catch (err) {
      console.error(`  ✗ npm install failed for server "${name}": ${err.message}`);
      return installed;
    }
  }

  // Register in mcp.json
  const entryPoint = join(serverTargetDir, 'index.js');
  const mcpEntry = {
    command: 'node',
    args: [entryPoint],
  };
  mergeMcpSettings(name, mcpEntry);

  console.log(`  ✓ server: ${name} (mcp/stdio)`);
  return installed;
}

/**
 * Install an MCP server with HTTP transport.
 * No files to copy — just registers the server URL in ~/.kiro/settings/mcp.json.
 *
 * @param {string} name - Server folder name
 * @param {import('../component-defs.js').ServerDef} serverDef - Parsed server YAML definition
 * @param {string} _repoRoot - Absolute path to the repository root (unused)
 * @returns {Array<{path: string, hash: string}>} Manifest entries
 */
function installMcpHttp(name, serverDef, _repoRoot) {
  const installed = [];

  if (!serverDef.url) {
    console.error(`  ✗ server "${name}" has transport: http but no url field`);
    return installed;
  }

  const mcpEntry = {
    type: 'http',
    url: serverDef.url,
  };

  if (serverDef.headers) {
    mcpEntry.headers = serverDef.headers;
  }

  mergeMcpSettings(name, mcpEntry);

  const mcpContent = readFileSync(TARGETS.mcpSettings, 'utf8');
  installed.push({ path: TARGETS.mcpSettings, hash: hashContent(mcpContent) });

  console.log(`  ✓ server: ${name} (mcp/http)`);
  return installed;
}

/**
 * Read, merge, and write an entry into the MCP settings file.
 * Creates the file if it doesn't exist.
 *
 * @param {string} serverName - Key for the mcpServers object
 * @param {object} entry - The server config entry to merge
 */
function mergeMcpSettings(serverName, entry) {
  let settings = { mcpServers: {} };

  if (existsSync(TARGETS.mcpSettings)) {
    try {
      const content = readFileSync(TARGETS.mcpSettings, 'utf8');
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === 'object') {
        settings = parsed;
        if (!settings.mcpServers) settings.mcpServers = {};
      }
    } catch {
      // Corrupted file — overwrite
    }
  }

  settings.mcpServers[serverName] = entry;
  const output = JSON.stringify(settings, null, 2);
  writeToTarget(TARGETS.mcpSettings, output);
}

/**
 * Remove a server entry from the MCP settings file.
 *
 * @param {string} serverName - Key to remove from mcpServers
 */
export function removeMcpSetting(serverName) {
  if (!existsSync(TARGETS.mcpSettings)) return;

  try {
    const content = readFileSync(TARGETS.mcpSettings, 'utf8');
    const settings = JSON.parse(content);
    if (settings && settings.mcpServers) {
      delete settings.mcpServers[serverName];
      const output = JSON.stringify(settings, null, 2);
      writeToTarget(TARGETS.mcpSettings, output);
    }
  } catch {
    // If we can't parse it, leave it alone
  }
}

/**
 * MCP protocol installer — dispatches by transport type.
 *
 * @param {string} name - Server folder name
 * @param {import('../component-defs.js').ServerDef} serverDef - Parsed server YAML
 * @param {string} repoRoot - Repo root path
 * @returns {Array<{path: string, hash: string}>}
 */
function installMcpServer(name, serverDef, repoRoot) {
  const transport = serverDef.transport || 'stdio';
  switch (transport) {
    case 'stdio':
      return installMcpStdio(name, serverDef, repoRoot);
    case 'http':
      return installMcpHttp(name, serverDef, repoRoot);
    default:
      console.error(`  ✗ server "${name}" has unsupported MCP transport: ${transport}`);
      return [];
  }
}

const adapter = createAdapter({
  targets: TARGETS,
  toolMap: TOOL_MAP,
  transformAgent,
  transformSteering,
  agentExt: '.json',
  steeringDir: 'steering',
  getSkillSources,
  serverInstallers: {
    mcp: installMcpServer,
  },
  // No detectSharedResource / sharedResourceInstallers — Kiro has no
  // harness-level shared resources today (blocked_commands is embedded
  // directly into each agent's own JSON above).
});

// --- Re-export adapter install methods and shared utilities ---

export const installAgents = adapter.installAgents;
export const installSteering = adapter.installSteering;
export const installSkills = adapter.installSkills;
export const installServers = adapter.installServers;
export const installSharedResources = adapter.installSharedResources;
export const installStandards = adapter.installStandards;
export { parseFrontmatter } from '../file-utils.js';
