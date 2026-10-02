/**
 * secrets — Pure logic for provider-agnostic secrets resolution.
 * No I/O — provides config parsing, dotenv parsing, placeholder
 * resolution, and run-wrapper invocation building.
 *
 * Plan: docs/plans/secrets-resolution-plan.md
 * Plan: AIF-008 (re-exec argument transport and failure policy)
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
 * Env var carrying the original argv, JSON-encoded, from the parent
 * ai-git process to the re-exec'd child. Secrets-manager run wrappers
 * (confirmed with `bws run`) join their argv into one string and run it
 * through a shell, so user arguments must never travel in argv.
 */
export const REEXEC_ARGS_ENV = 'AIF_REEXEC_ARGS';

/** `.code` on the error encodeReexecArgs throws when over the size guard. */
export const REEXEC_ARGS_TOO_LARGE = 'REEXEC_ARGS_TOO_LARGE';

/**
 * Maximum encoded size (bytes) of REEXEC_ARGS_ENV's value. Linux caps a
 * single environment string at 128 KiB; stay safely below it.
 */
export const MAX_REEXEC_ARGS_BYTES = 100 * 1024;

/**
 * Encode the original argv for transport in REEXEC_ARGS_ENV.
 * @param {string[]} args - Original argv (process.argv.slice(2))
 * @returns {string} JSON array of strings
 * @throws {Error} With `.code` REEXEC_ARGS_TOO_LARGE if the encoded value exceeds MAX_REEXEC_ARGS_BYTES
 */
export function encodeReexecArgs(args) {
  const encoded = JSON.stringify(args);
  const size = Buffer.byteLength(encoded, 'utf8');
  if (size > MAX_REEXEC_ARGS_BYTES) {
    throw Object.assign(
      new Error(
        `arguments are too large to pass through the secrets wrapper (${size} bytes, limit ${MAX_REEXEC_ARGS_BYTES})`,
      ),
      { code: REEXEC_ARGS_TOO_LARGE },
    );
  }
  return encoded;
}

/**
 * Decode a value produced by encodeReexecArgs.
 * @param {string} encoded - Value of REEXEC_ARGS_ENV
 * @returns {string[]}
 * @throws {Error} If the value is not a JSON array of strings
 */
export function decodeReexecArgs(encoded) {
  let parsed;
  try {
    parsed = JSON.parse(encoded);
  } catch {
    throw new Error(`${REEXEC_ARGS_ENV} is not valid JSON`);
  }
  if (!Array.isArray(parsed) || !parsed.every((a) => typeof a === 'string')) {
    throw new Error(`${REEXEC_ARGS_ENV} is not a JSON array of strings`);
  }
  return parsed;
}

/**
 * Build the command + args to re-exec the current script through a
 * configured secrets.run wrapper. Placeholders in `run`'s own elements
 * (e.g. "${BWS_PROJECT_ID}") are resolved against `env` first. The
 * resulting argv is fixed: no user-supplied argument is included (see
 * REEXEC_ARGS_ENV).
 * @param {string[]} run - secrets.run array, e.g. ["bws", "run", "--project-id", "${BWS_PROJECT_ID}", "--"]
 * @param {string} execPath - Path to the Node binary
 * @param {string} scriptPath - Absolute path to the script being re-exec'd
 * @param {Record<string, string>} env - Environment map to resolve placeholders against
 * @returns {{ command: string, args: string[] }}
 */
export function buildWrapperInvocation(run, execPath, scriptPath, env) {
  const resolved = run.map((part) => resolvePlaceholders(part, env));
  const [command, ...prefixArgs] = resolved;
  return { command, args: [...prefixArgs, execPath, scriptPath] };
}

/**
 * Failure policy when the token cannot be resolved: `gh-*` commands stop
 * with an error; every other command (push/fetch) warns and proceeds.
 * The message is a single line naming the env var, never a value.
 * @param {boolean} isGh - Whether the command is a gh-* command
 * @param {string} tokenEnvName - Name of the token env var
 * @param {string|null} cause - Why resolution failed, or null if unknown
 * @returns {{ fatal: boolean, message: string }}
 */
export function describeTokenFailure(isGh, tokenEnvName, cause) {
  const why = cause ? `${cause}; ` : '';
  if (isGh) {
    return {
      fatal: true,
      message: `ERROR: ${why}${tokenEnvName} is not set, cannot run GitHub operations.`,
    };
  }
  return {
    fatal: false,
    message: `WARNING: ${why}${tokenEnvName} is not set, continuing without authentication.`,
  };
}
