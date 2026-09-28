/**
 * secrets — Pure logic for provider-agnostic secrets resolution.
 * No I/O — provides config parsing, dotenv parsing, placeholder
 * resolution, and run-wrapper invocation building.
 *
 * Plan: docs/plans/secrets-resolution-plan.md
 *
 * Contract: `.aiconfig.json`'s `secrets.run` names a command+args prefix
 * (a secrets manager's own "run wrapper", e.g. `bws run --project-id X
 * --`) that spawns a given program with secrets injected directly into
 * its environment in memory — never written to disk. `secrets.run` is
 * provider-agnostic by design: this module never knows which provider is
 * configured. `secrets.allow_insecure_dotenv` is an explicit, off-by-
 * default opt-in fallback to a gitignored `.env` file for local testing
 * before a real secrets manager is wired up.
 */

/**
 * @typedef {object} SecretsConfig
 * @property {string[]|null} run - Command+args prefix, or null if unset.
 * @property {boolean} allowInsecureDotenv
 */

/**
 * @typedef {object} AiConfig
 * @property {object} [secrets]
 * @property {string[]} [secrets.run]
 * @property {boolean} [secrets.allow_insecure_dotenv]
 */

/**
 * Extract secrets configuration from a parsed .aiconfig.json.
 * @param {AiConfig} config - Parsed .aiconfig.json content
 * @returns {SecretsConfig}
 */
export function getSecretsConfig(config) {
  const secrets = config.secrets || {};
  const run = Array.isArray(secrets.run) && secrets.run.length > 0 ? secrets.run : null;
  const allowInsecureDotenv = secrets.allow_insecure_dotenv === true;
  return { run, allowInsecureDotenv };
}

/**
 * Resolve "${VAR_NAME}" placeholders in a string against an environment
 * map. Used for `secrets.run`'s own non-secret placeholders (e.g. a
 * project ID) — not for resolving the secret values themselves, which
 * are injected by the wrapper command, never by this module.
 * @param {string} value - String that may contain ${VAR} placeholders
 * @param {Record<string, string>} env - Environment map to resolve against
 * @returns {string} Value with placeholders resolved
 * @throws {Error} If a referenced variable is not set in env
 */
export function resolvePlaceholders(value, env) {
  return value.replace(/\$\{([A-Z0-9_]+)\}/g, (_match, varName) => {
    const envValue = env[varName];
    if (envValue === undefined) {
      throw new Error(`references unset environment variable ${varName}`);
    }
    return envValue;
  });
}

/**
 * Parse dotenv-format text into a plain object. Simple line-based parser:
 * skips blank lines and `#`-prefixed comments, strips a single matching
 * pair of surrounding quotes from the value. No dependency added.
 * @param {string} text - Raw .env file content
 * @returns {Record<string, string>}
 */
export function parseDotenv(text) {
  const result = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const eq = line.indexOf('=');
    if (eq === -1) continue;

    const key = line.slice(0, eq).trim();
    if (!key) continue;

    let value = line.slice(eq + 1).trim();
    const isQuoted =
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")));
    if (isQuoted) {
      value = value.slice(1, -1);
    }

    result[key] = value;
  }
  return result;
}

/**
 * Env var marker set on a re-exec'd child process to prevent it from
 * wrapping itself again (infinite re-exec loop guard).
 */
export const REEXEC_GUARD_ENV = 'AIF_SECRETS_WRAPPED';

/**
 * Determine whether the current process is already running inside a
 * secrets-wrapper re-exec (see REEXEC_GUARD_ENV).
 * @param {Record<string, string|undefined>} env
 * @returns {boolean}
 */
export function isAlreadyWrapped(env) {
  return env[REEXEC_GUARD_ENV] === '1';
}

/**
 * Build the command + args to re-exec the current script through a
 * configured secrets.run wrapper. Placeholders in `run`'s own elements
 * (e.g. "${BWS_PROJECT_ID}") are resolved against `env` first.
 * @param {string[]} run - secrets.run array, e.g. ["bws", "run", "--project-id", "${BWS_PROJECT_ID}", "--"]
 * @param {string} execPath - Absolute path to the Node binary (process.execPath)
 * @param {string} scriptPath - Absolute path to the script being re-exec'd
 * @param {string[]} args - Original argv (process.argv.slice(2))
 * @param {Record<string, string>} env - Environment map to resolve placeholders against
 * @returns {{ command: string, args: string[] }}
 */
export function buildWrapperInvocation(run, execPath, scriptPath, args, env) {
  const resolved = run.map((part) => resolvePlaceholders(part, env));
  const [command, ...prefixArgs] = resolved;
  return { command, args: [...prefixArgs, execPath, scriptPath, ...args] };
}
