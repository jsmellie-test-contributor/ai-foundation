/**
 * ai-git — Pure logic for AI git identity and auth injection.
 * No I/O — provides parsing, config extraction, and arg transformation.
 *
 * No Plan ID on the original code — small human-approved security bugfix (see chat approval
 * 2026-08-23) for the push/fetch auth-injection argument-order bug that
 * could echo the auth token to stdout or persist it into .git/config.
 *
 * Plan: AIF-008 (Task 002) — adds the pure `ai-git doctor` report below.
 */

/**
 * @typedef {object} AiConfig
 * @property {object} [ai_identity]
 * @property {string} [ai_identity.git_author_name]
 * @property {string} [ai_identity.git_author_email]
 * @property {string} [ai_identity.git_token_env]
 */

/**
 * Extract AI identity fields from a parsed .aiconfig.json.
 * @param {AiConfig} config - Parsed .aiconfig.json content
 * @returns {{ name: string, email: string, tokenEnvName: string|null }}
 */
export function getIdentity(config) {
  const ai = config.ai_identity || {};
  const name = ai.git_author_name || 'AI Agent';
  const email = ai.git_author_email || 'ai@localhost';
  const tokenEnvName = ai.git_token_env || null;

  return { name, email, tokenEnvName };
}

/**
 * Build git environment variables with AI identity injected.
 * @param {{ name: string, email: string }} identity
 * @param {Record<string, string>} [baseEnv={}] - Base environment to extend
 * @returns {Record<string, string>} Environment variables object
 */
export function buildGitEnv(identity, baseEnv = {}) {
  return {
    ...baseEnv,
    GIT_AUTHOR_NAME: identity.name,
    GIT_AUTHOR_EMAIL: identity.email,
    GIT_COMMITTER_NAME: identity.name,
    GIT_COMMITTER_EMAIL: identity.email,
  };
}

/**
 * Build gh environment variables with token injected.
 * @param {string|null} token - The token value
 * @param {Record<string, string>} [baseEnv={}] - Base environment to extend
 * @returns {Record<string, string>} Environment variables object
 */
export function buildGhEnv(token, baseEnv = {}) {
  const env = { ...baseEnv };
  if (token) {
    env.GH_TOKEN = token;
  }
  return env;
}

/**
 * Map a gh- prefixed command to gh CLI arguments.
 * "gh-pr-create" → ["pr", "create"]
 * "gh-pr-list"   → ["pr", "list"]
 * "gh-repo-view" → ["repo", "view"]
 * @param {string} command - The gh- prefixed command
 * @returns {string[]} gh CLI subcommand parts
 */
export function parseGhCommand(command) {
  const parts = command.slice(3).split('-');
  return parts;
}

/**
 * Determine if a command is a GitHub (gh-) command.
 * @param {string} command
 * @returns {boolean}
 */
export function isGhCommand(command) {
  return command.startsWith('gh-');
}

/**
 * Determine if a git subcommand needs push authentication.
 * @param {string} subcommand - The git subcommand (e.g. 'push', 'commit')
 * @returns {boolean}
 */
export function needsPushAuth(subcommand) {
  return subcommand === 'push' || subcommand === 'fetch';
}

/**
 * Determine the git http config scope prefix for a GitHub HTTPS remote
 * URL (e.g. "https://github.com/"). Returns null if the URL is not a
 * GitHub HTTPS URL, since auth injection only supports github.com.
 * @param {string} remoteUrl - The git remote URL
 * @returns {string|null}
 */
export function getAuthScope(remoteUrl) {
  const match = remoteUrl.match(/^(https:\/\/github\.com\/)/);
  return match ? match[1] : null;
}

/**
 * Build the value for a git `http.<scope>.extraheader` config entry that
 * authenticates over HTTPS using a Basic auth header. The token is never
 * embedded in a URL, so it cannot appear in git's "To <url>"/"From <url>"
 * progress output and is never written into .git/config as a URL
 * substring.
 * @param {string} token - The authentication token
 * @param {string} username - The username for auth (derived from identity name)
 * @returns {string} Header value, e.g. "AUTHORIZATION: basic <base64>"
 */
export function buildAuthHeaderValue(token, username) {
  const safeUsername = username.replace(/\s+/g, '-').toLowerCase();
  const encoded = Buffer.from(`${safeUsername}:${token}`, 'utf8').toString('base64');
  return `AUTHORIZATION: basic ${encoded}`;
}

/**
 * Build the `-c` config-override arguments that inject push/fetch
 * authentication for a GitHub HTTPS remote, scoped to that remote's
 * host+scheme prefix. Returns [] if the remote is not a GitHub HTTPS
 * URL. These args are transient — passed as `git -c ...` on argv only —
 * so they are never written to .git/config and never require rewriting
 * the caller's own push/fetch arguments (remote name, refspec, flags
 * like -u/--set-upstream can appear in any order and are left untouched).
 * @param {string} remoteUrl - The git remote URL
 * @param {string} token - The authentication token
 * @param {string} username - The username for auth (derived from identity name)
 * @returns {string[]} Config-override args to prepend before the subcommand
 */
export function buildAuthConfigArgs(remoteUrl, token, username) {
  const scope = getAuthScope(remoteUrl);
  if (!scope) return [];

  const headerValue = buildAuthHeaderValue(token, username);
  return ['-c', `http.${scope}.extraheader=${headerValue}`];
}

/**
 * Find the remote name argument for a git push/fetch command, ignoring
 * flags regardless of where they appear (e.g. `push -u origin main` and
 * `push origin -u main` both yield "origin"). Falls back to 'origin'
 * when no positional remote argument is present.
 * @param {string[]} args - Full git args (e.g. ['push', '-u', 'origin', 'main'])
 * @returns {string}
 */
export function findRemoteName(args) {
  for (let i = 1; i < args.length; i++) {
    if (!args[i].startsWith('-')) return args[i];
  }
  return 'origin';
}

// --- doctor (Plan AIF-008, Task 002) ---

/** Tools `ai-git doctor` checks for on PATH, in report order. */
export const DOCTOR_TOOLS = ['ai-git', 'gh', 'bws'];

/** Env var carrying the token variable name to the doctor token probe. */
export const DOCTOR_PROBE_ENV = 'AIF_DOCTOR_TOKEN_VAR';

/** Characters a wrapper-bound argv element may contain (no shell metacharacters). */
const SHELL_SAFE_ARG = /^[A-Za-z0-9_./:\\@%+=,-]+$/;

/**
 * Whether an argv element survives a shell-joining run wrapper unchanged
 * (`bws run` joins argv and runs it through a shell).
 * @param {string} arg
 * @returns {boolean}
 */
export function isShellSafeArg(arg) {
  return SHELL_SAFE_ARG.test(arg);
}

/**
 * Argv (after the `secrets.run` prefix) for the token probe: a fixed
 * `node <probe script>` pair, no inline code, so nothing in it needs
 * shell quoting. The variable name travels via DOCTOR_PROBE_ENV.
 * @param {string} probeScriptPath - Absolute path to lib/doctor-probe.js
 * @returns {string[]}
 */
export function buildDoctorProbeArgs(probeScriptPath) {
  return ['node', probeScriptPath];
}

/**
 * Determine whether a command is the `doctor` subcommand.
 * @param {string|undefined} command
 * @returns {boolean}
 */
export function isDoctorCommand(command) {
  return command === 'doctor';
}

/**
 * Candidate file names for a tool on a platform (PATHEXT on Windows).
 * @param {string} tool
 * @param {string} platform - process.platform value
 * @param {string} [pathext] - PATHEXT value
 * @returns {string[]}
 */
export function pathCandidates(tool, platform, pathext = '.COM;.EXE;.BAT;.CMD') {
  if (platform !== 'win32') return [tool];
  const exts = pathext.split(';').filter(Boolean);
  return [tool, ...exts.map((e) => tool + e.toLowerCase()), ...exts.map((e) => tool + e)];
}

/**
 * Whether a tool exists on PATH, by file lookup only (nothing is executed,
 * so no exit-code assumption). Pure given an injected existence check.
 * @param {string} tool
 * @param {{ pathVar: string, delimiter: string, platform: string, pathext?: string, exists: (file: string) => boolean, join: (dir: string, name: string) => string }} opts
 * @returns {boolean}
 */
export function isOnPath(tool, { pathVar, delimiter, platform, pathext, exists, join }) {
  const names = pathCandidates(tool, platform, pathext);
  return pathVar
    .split(delimiter)
    .filter(Boolean)
    .some((dir) => names.some((n) => exists(join(dir, n))));
}

/**
 * Build a doctor report from already-gathered facts. Pure: never receives
 * or emits a token value, only a yes/no resolution state.
 * @param {object} facts
 * @param {Record<string, boolean>} facts.tools - tool name -> resolves on PATH
 * @param {boolean} facts.configFound - whether .aiconfig.json was found
 * @param {string|null} facts.tokenEnvName - configured token env var name
 * @param {'env'|'wrapper'|'dotenv'|null} facts.tokenSource - how the token resolved, null if it did not
 * @param {string|null} [facts.unsetPlaceholder] - env var named by an unresolvable `${VAR}` in secrets.run
 * @returns {{ ok: boolean, lines: string[] }} ok is false if any check failed
 */
export function buildDoctorReport({
  tools,
  configFound,
  tokenEnvName,
  tokenSource,
  unsetPlaceholder = null,
}) {
  const lines = [];
  let ok = true;

  for (const name of DOCTOR_TOOLS) {
    const found = Boolean(tools[name]);
    if (!found) ok = false;
    lines.push(
      `${found ? 'ok  ' : 'FAIL'} ${name}: ${found ? 'found on PATH' : 'NOT found on PATH'}`,
    );
  }

  if (!configFound) ok = false;
  lines.push(
    `${configFound ? 'ok  ' : 'FAIL'} .aiconfig.json: ${configFound ? 'found' : 'NOT found in current directory or any parent'}`,
  );

  if (!configFound) {
    lines.push('FAIL token: check skipped, no .aiconfig.json');
  } else if (!tokenEnvName) {
    ok = false;
    lines.push('FAIL token: no ai_identity.git_token_env configured');
  } else if (tokenSource) {
    lines.push(`ok   token (${tokenEnvName}): resolved via ${tokenSource}`);
  } else {
    ok = false;
    const why = unsetPlaceholder
      ? `; secrets.run references unset environment variable ${unsetPlaceholder}`
      : '';
    lines.push(`FAIL token (${tokenEnvName}): NOT resolved${why}`);
  }

  lines.push(
    'Note: on any git identity error, use ai-git; never supply, infer or ask for a git identity.',
  );
  return { ok, lines };
}
