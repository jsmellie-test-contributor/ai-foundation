/**
 * Shared constants for the aif CLI.
 * Paths, filenames, directory names, and defaults used across modules.
 */

// --- Manifest ---

export const MANIFEST_FILENAME = '.installs.yaml';

// --- Source directories (relative to repo root) ---

export const SOURCE_DIRS = {
  agents: 'agents',
  skills: 'skills',
  steering: 'steering',
  servers: 'servers',
  standards: 'standards',
  bundles: 'bundles',
  // Where harness-level shared hook resources live (e.g. Claude Code's
  // block-command hook script). One subdirectory per resource name.
  // A flat forward-slash literal, not path.join() — this value is embedded
  // as a string in committed snapshot JSON keys, not just used for local fs
  // access, so it must stay platform-independent (path.join() produces
  // backslash-separated segments on Windows, corrupting those keys).
  hookAssets: 'lib/harnesses/assets',
};

// --- Harness-agnostic tool names ---

/**
 * Canonical tool identifiers used across all harness adapters.
 * Harness-specific TOOL_MAPs use these as keys, mapping to harness-native names.
 * Changing a value here updates every adapter automatically.
 */
export const TOOLS = {
  READ: 'read',
  WRITE: 'write',
  SHELL: 'shell',
  WEB_SEARCH: 'web_search',
  WEB_FETCH: 'web_fetch',
  GREP: 'grep',
  GLOB: 'glob',
  CODE: 'code',
  SUBAGENT: 'subagent',
  PLAN: 'plan', // human-in-the-loop proposal gate (e.g. Plan Mode)
  ASK_USER: 'ask_user', // blocking question to a human live in-session
  TASK: 'task', // agent's own session-scoped progress checklist
  SKILL: 'skill', // invoke an installed skill by name
};

// --- Supported harnesses ---

export const HARNESSES = ['kiro', 'claude'];

// --- CLI commands ---

export const COMMANDS = [
  'install',
  'uninstall',
  'status',
  'list',
  'validate',
  'test',
  'snapshot',
  'index',
  'init',
  'config',
];

// --- Manifest key format ---

/**
 * Generates the manifest key for a bundle/server/hook + harness combination.
 * @param {string} name
 * @param {string} harness
 * @returns {string}
 */
export function manifestKey(name, harness) {
  return `${name}_${harness}`;
}
