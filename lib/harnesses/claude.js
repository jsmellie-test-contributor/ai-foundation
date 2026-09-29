/**
 * Claude Code harness adapter — transforms and installs ai-foundation components
 * into Claude Code's native formats and locations.
 *
 * v1 scope: global only. All targets live under the user's home directory,
 * matching Claude Code's native "personal" (user-scope) locations — agents and
 * skills at ~/.claude/{agents,skills}, and user-scope MCP servers registered in
 * ~/.claude.json (NOT ~/.claude/mcp.json, which Claude Code silently ignores).
 */

import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import YAML from 'yaml';

import { createAdapter, stripSkillPrefix, resolvePreloadSkills } from './base.js';
import { parseFrontmatter, collectFiles, writeToTarget, hashContent } from '../file-utils.js';
import { TOOLS } from '../constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// --- Target paths ---

const claudeBase = join(homedir(), '.claude');

export const TARGETS = {
  agents: join(claudeBase, 'agents'),
  rules: join(claudeBase, 'rules'),
  skills: join(claudeBase, 'skills'),
  servers: join(claudeBase, 'servers'),
  standards: join(claudeBase, 'standards'),
  scripts: join(claudeBase, 'scripts'),
  mcpSettings: join(homedir(), '.claude.json'),
};

// --- Tool name map ---

/**
 * Maps ai-foundation generic tool names to Claude Code's built-in tool
 * names. Each value is an array — some generic tools expand to a cluster of
 * native tools that are always granted together (e.g. `write` needs both
 * `Write`, for create/overwrite, and `Edit`, for in-place modification,
 * since we don't define a separate generic `edit` tool).
 *
 * An empty array means Claude Code has no native equivalent yet. This is a
 * deliberate, verified "nothing to add" — never guess a plausible-sounding
 * native name here. An invented name is silently dropped by Claude Code at
 * install time (no error), so it would look supported but grant nothing;
 * `code` was mapped to a non-existent `LSP` tool for exactly this reason
 * before being corrected. Every name below must be checked against
 * `KNOWN_NATIVE_TOOLS` in tests/unit/claude-adapter.test.js.
 */
export const TOOL_MAP = {
  [TOOLS.READ]: ['Read'],
  [TOOLS.WRITE]: ['Write', 'Edit'],
  [TOOLS.SHELL]: ['Bash'],
  [TOOLS.WEB_SEARCH]: ['WebSearch'],
  [TOOLS.WEB_FETCH]: ['WebFetch'],
  [TOOLS.GREP]: ['Grep'],
  [TOOLS.GLOB]: ['Glob'],
  // No native code-navigation/LSP tool exists in Claude Code. Falls back to
  // whatever `read`/`grep`/`glob` the agent already has. A real fix would be
  // a code-nav MCP server (per docs/decisions/0004-dag-tool-as-mcp-server.md's
  // precedent), not a tool-name guess.
  [TOOLS.CODE]: [],
  // Spawn, enumerate, and follow up with dispatched subagents — used
  // together by orchestration (spawn a wave, check on or message one later).
  [TOOLS.SUBAGENT]: ['Agent', 'ListAgents', 'SendMessage'],
  [TOOLS.PLAN]: ['EnterPlanMode', 'ExitPlanMode'],
  [TOOLS.ASK_USER]: ['AskUserQuestion'],
  [TOOLS.TASK]: ['TaskCreate', 'TaskUpdate', 'TaskGet', 'TaskList', 'TaskOutput', 'TaskStop'],
  [TOOLS.SKILL]: ['Skill'],
};

// --- Tool mapping ---

/**
 * Map a single tool name from our format to Claude Code's format. Returns
 * the first native name in the tool's cluster, or the input unchanged if
 * there is no mapping (including an intentionally empty cluster). This is a
 * convenience for single-name lookups (tests, logging) — `mapAgentTools` is
 * the authoritative expansion used at install time.
 * @param {string} name
 * @returns {string}
 */
export function mapToolName(name) {
  const mapped = TOOL_MAP[name];
  if (mapped === undefined) return name;
  return mapped[0] ?? name;
}

/**
 * Map an agent's `tools` list to Claude Code's built-in tool names,
 * expanding each generic tool to its full native cluster. A generic tool
 * with no native equivalent (an empty array in TOOL_MAP) contributes
 * nothing — it does not fall back to a guessed or passed-through name.
 * An unrecognized generic name (not in TOOL_MAP at all, e.g. a
 * `@server/tool` reference) passes through unchanged.
 *
 * @param {string[]} tools
 * @returns {string[]}
 */
export function mapAgentTools(tools) {
  return tools.flatMap((name) => TOOL_MAP[name] ?? [name]);
}

// --- blocked_commands → PreToolUse hook ---

/**
 * Name of the shared hook resource, used as the manifest key and as the
 * lib/harnesses/assets/{name}/ source directory name.
 */
export const BLOCK_COMMAND_RESOURCE = 'block-command';

/**
 * Source directory (within this repo's lib/) for the shared block-command
 * hook script.
 */
const HOOK_SCRIPT_SRC_DIR = join(__dirname, 'assets', BLOCK_COMMAND_RESOURCE);

/**
 * Resolve the installed path of the hook CLI entry point.
 * @returns {string}
 */
function hookScriptPath() {
  return join(TARGETS.scripts, BLOCK_COMMAND_RESOURCE, 'cli.js');
}

/**
 * Quote a single command-line argument for safe inclusion in the hook
 * `command` string (handles spaces and embedded double quotes).
 * @param {string} value
 * @returns {string}
 */
function quoteArg(value) {
  return `"${String(value).replace(/"/g, '\\"')}"`;
}

/**
 * Build the shell command string for a PreToolUse hook that blocks the
 * given patterns.
 *
 * Uses `process.execPath` (the absolute path to the Node binary running
 * `aif install` itself) rather than the bare `node` command. Claude Code
 * may execute hook commands through a shell whose PATH doesn't resolve
 * `node` (e.g. a minimal /usr/bin/bash on Windows) — the absolute path
 * removes that dependency entirely, on any OS.
 *
 * @param {string[]} patterns
 * @returns {string}
 */
function buildHookCommand(patterns) {
  const args = [hookScriptPath(), ...patterns].map(quoteArg);
  return `${quoteArg(process.execPath)} ${args.join(' ')}`;
}

/**
 * Determine whether an agent requires the shared block-command hook script.
 * Called from base.js's installAgents() loop, where each agent is already
 * parsed — this is the harness-specific half of shared-resource detection.
 * @param {import('../component-defs.js').AgentDef} agent - Parsed agent YAML object
 * @returns {string|null} The shared resource name, or null if not needed
 */
export function detectSharedResource(agent) {
  if (Array.isArray(agent.blocked_commands) && agent.blocked_commands.length > 0) {
    return BLOCK_COMMAND_RESOURCE;
  }
  return null;
}

/**
 * Install the shared block-command hook script (logic.js + cli.js) to
 * ~/.claude/scripts/block-command/. Only called when at least one installed
 * agent needs it (see detectSharedResource) — its manifest entry tracks
 * which bundles depend on it, so it is removed once none do
 * (see lib/commands/uninstall.js).
 * @param {string} _repoRoot - Unused (source lives alongside this adapter)
 * @returns {Array<{path: string, hash: string}>} Manifest entries
 */
export function installBlockCommandResource(_repoRoot) {
  const installed = [];
  const targetDir = join(TARGETS.scripts, BLOCK_COMMAND_RESOURCE);
  for (const file of ['logic.js', 'cli.js']) {
    const src = join(HOOK_SCRIPT_SRC_DIR, file);
    const content = readFileSync(src);
    writeToTarget(join(targetDir, file), content);
    installed.push({ path: join(targetDir, file), hash: hashContent(content) });
  }
  console.log(`  ✓ hook script: ${BLOCK_COMMAND_RESOURCE}`);
  return installed;
}

// --- Transform functions ---

/**
 * Transform an ai-foundation agent YAML into Claude Code's markdown agent format.
 * @param {import('../component-defs.js').AgentDef} agent - Parsed agent YAML object
 * @returns {string} Markdown with YAML frontmatter
 */
export function transformAgent(agent) {
  const tools = mapAgentTools(agent.tools || []);

  const frontmatter = {
    name: agent.name,
    description: agent.description,
    tools: tools.join(', '),
  };

  // Preload the subset of `skills` named in `preload_skills` (or all of
  // them, for the `["*"]` sentinel) into this subagent's context at
  // startup. Everything else in `skills` stays reachable only via the
  // `Skill` tool on demand — see resolvePreloadSkills for why the default
  // (preload_skills absent) is "preload nothing," not "preload all."
  const preloadSkills = resolvePreloadSkills(agent).map(stripSkillPrefix);
  if (preloadSkills.length > 0) {
    frontmatter.skills = preloadSkills;
  }

  // Enforce blocked shell commands via a PreToolUse hook on the Bash tool.
  // (Claude Code subagent frontmatter has no `permissions` field — only a
  // hook can actually intercept and block specific command patterns.)
  if (Array.isArray(agent.blocked_commands) && agent.blocked_commands.length > 0) {
    frontmatter.hooks = {
      PreToolUse: [
        {
          matcher: 'Bash',
          hooks: [
            {
              type: 'command',
              command: buildHookCommand(agent.blocked_commands),
            },
          ],
        },
      ],
    };
  }

  const yamlStr = YAML.stringify(frontmatter).trim();
  const prompt = agent.prompt || '';
  return `---\n${yamlStr}\n---\n\n${prompt.trim()}\n`;
}

/**
 * Transform steering file content for Claude Code.
 * Rewrites frontmatter: file_patterns → paths.
 * Strips framework-specific fields. Passes body through unchanged.
 *
 * @param {string} content - Raw markdown file content with YAML frontmatter
 * @returns {string} Transformed content with Claude Code-compatible frontmatter
 */
export function transformSteering(content) {
  const { frontmatter, body } = parseFrontmatter(content);

  if (!frontmatter) {
    return content.replace(/\{\{standards_path\}\}/g, TARGETS.standards);
  }

  const filePatterns = frontmatter.file_patterns;
  if (Array.isArray(filePatterns) && filePatterns.length > 0) {
    const claudeFrontmatter = { paths: filePatterns };
    const yamlStr = YAML.stringify(claudeFrontmatter).trim();
    const resolvedBody = body.replace(/\{\{standards_path\}\}/g, TARGETS.standards);
    return `---\n${yamlStr}\n---\n${resolvedBody}`;
  }

  // No file_patterns or empty = always loaded = no frontmatter needed
  return body.replace(/\{\{standards_path\}\}/g, TARGETS.standards);
}

// --- Skill sources ---

/**
 * Get skill sources for Claude Code (full directory tree — SKILL.md plus
 * any reference/, assets/, scripts/ subdirectories). Claude Code natively
 * supports the directory-based skill format: ~/.claude/skills/{name}/SKILL.md
 * with optional bundled subdirectories alongside it.
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

// --- MCP server installation ---

/**
 * Install an MCP server with stdio transport for Claude Code.
 * Copies runtime files to ~/.claude/servers/{name}/, runs npm install,
 * and registers the server (user scope) in ~/.claude.json.
 *
 * @param {string} name - Server folder name
 * @param {import('../component-defs.js').ServerDef} serverDef - Parsed server YAML definition
 * @param {string} repoRoot - Absolute path to the repository root
 * @returns {Array<{path: string, hash: string}>} Manifest entries
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

  // Register in ~/.claude.json
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
 * Install an MCP server with HTTP transport for Claude Code.
 * No files to copy — just registers the server URL (user scope) in ~/.claude.json.
 *
 * @param {string} name - Server folder name
 * @param {import('../component-defs.js').ServerDef} serverDef - Parsed server YAML definition
 * @param {string} _repoRoot - Unused
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
    // Passed through unresolved, matching kiro.js's installMcpHttp:
    // Claude Code itself expands "${VAR_NAME}" placeholders from its own
    // process environment at connect time (confirmed live — see
    // docs/plans/secrets-resolution-plan.md's Key Findings), so no
    // secret value needs to be present during `aif install`, and none is
    // ever written into ~/.claude.json.
    mcpEntry.headers = serverDef.headers;
  }

  mergeMcpSettings(name, mcpEntry);

  console.log(`  ✓ server: ${name} (mcp/http)`);
  return installed;
}

/**
 * Read, merge, and write an entry into the MCP settings file.
 * Creates the file if it doesn't exist. Preserves any other top-level keys
 * already present in the file (e.g. Claude Code's own config state).
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

// --- Create adapter instance ---

const adapter = createAdapter({
  targets: TARGETS,
  toolMap: TOOL_MAP,
  transformAgent,
  transformSteering,
  agentExt: '.md',
  steeringDir: 'rules',
  getSkillSources,
  serverInstallers: {
    mcp: installMcpServer,
  },
  detectSharedResource,
  sharedResourceInstallers: {
    [BLOCK_COMMAND_RESOURCE]: installBlockCommandResource,
  },
});

// --- Re-export adapter install methods and shared utilities ---

export const installAgents = adapter.installAgents;
export const installSteering = adapter.installSteering;
export const installSkills = adapter.installSkills;
export const installServers = adapter.installServers;
export const installSharedResources = adapter.installSharedResources;
export const installStandards = adapter.installStandards;
export { parseFrontmatter } from '../file-utils.js';
