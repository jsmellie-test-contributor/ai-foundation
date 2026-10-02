#!/usr/bin/env node

/**
 * ai-git — Git operations with AI agent identity and authentication.
 *
 * A transparent wrapper around git and gh that automatically injects:
 * - AI author/committer identity from .aiconfig.json
 * - Authentication token from the configured env var
 *
 * Usage:
 *   ai-git <command> [args...]
 *
 * Git commands (identity injected):
 *   ai-git commit -m "message"
 *   ai-git push [remote] [branch]
 *   ai-git worktree add <path> -b <branch>
 *   ai-git <any git subcommand>
 *
 * GitHub commands (GH_TOKEN injected):
 *   ai-git gh-pr-create [--title "..." --body "..."]
 *   ai-git gh-pr-list
 *   ai-git gh-<subcommand> [args...]
 *
 * All arguments after the command are passed through verbatim.
 *
 * Plan: AIF-008 (doctor command). Original header: no Plan ID — small human-approved security bugfix (see chat approval
 * 2026-08-23) for the push/fetch auth-injection argument-order bug.
 */

import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  getIdentity,
  buildGitEnv,
  buildGhEnv,
  parseGhCommand,
  isGhCommand,
  needsPushAuth,
  findRemoteName,
  buildAuthConfigArgs,
  isDoctorCommand,
  buildDoctorReport,
  DOCTOR_TOOLS,
  DOCTOR_PROBE_ENV,
  DOCTOR_PROBE_SCRIPT,
} from '../lib/ai-git.js';
import {
  getSecretsConfig,
  parseDotenv,
  resolvePlaceholders,
  isAlreadyWrapped,
  buildWrapperInvocation,
  REEXEC_GUARD_ENV,
} from '../lib/secrets.js';

const __filename = fileURLToPath(import.meta.url);

// --- Config resolution ---

/**
 * Walk up from cwd to find .aiconfig.json.
 * @returns {{ config: object, root: string } | null}
 */
function findAiConfig() {
  let dir = process.cwd();

  while (true) {
    const configPath = join(dir, '.aiconfig.json');
    if (existsSync(configPath)) {
      try {
        const content = readFileSync(configPath, 'utf8');
        return { config: JSON.parse(content), root: dir };
      } catch {
        return null;
      }
    }
    const parent = resolve(dir, '..');
    if (parent === dir) break;
    dir = parent;
  }

  return null;
}

// --- Command execution ---

/**
 * Run a git command with AI identity and optional push auth.
 * @param {string[]} args - Git arguments (e.g. ['commit', '-m', 'message'])
 * @param {{ name: string, email: string, tokenEnvName: string|null }} identity
 * @returns {number} Exit code
 */
function runGit(args, identity) {
  const env = buildGitEnv(identity, process.env);
  let finalArgs = args;

  // Inject authentication for push/fetch. This uses a transient
  // `-c http.<scope>.extraheader=...` config override rather than
  // embedding the token in the remote URL, so the token is never
  // echoed by git's own progress output ("To <url>" / "From <url>")
  // and is never written into .git/config. Because the override is
  // prepended before the subcommand, the caller's own args (remote
  // name, refspec, flags such as -u/--set-upstream) are passed through
  // completely unchanged — auth injection no longer depends on where
  // those flags appear.
  if (needsPushAuth(args[0])) {
    const token = identity.tokenEnvName ? process.env[identity.tokenEnvName] : null;
    if (token) {
      const remoteName = findRemoteName(args);
      const result = spawnSync('git', ['remote', 'get-url', remoteName], {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      if (result.status === 0) {
        const remoteUrl = result.stdout.trim();
        const authConfigArgs = buildAuthConfigArgs(remoteUrl, token, identity.name);
        if (authConfigArgs.length > 0) {
          finalArgs = [...authConfigArgs, ...args];
        }
      }
    }
  }

  const result = spawnSync('git', finalArgs, {
    env,
    stdio: 'inherit',
    cwd: process.cwd(),
  });

  return result.status ?? 1;
}

/**
 * Run a gh CLI command with token injected.
 * @param {string} command - The gh- prefixed command name
 * @param {string[]} args - Additional arguments
 * @param {{ tokenEnvName: string|null }} identity
 * @returns {number} Exit code
 */
function runGh(command, args, identity) {
  const token = identity.tokenEnvName ? process.env[identity.tokenEnvName] : null;

  if (!token) {
    const envName = identity.tokenEnvName || 'AI_GIT_TOKEN';
    console.error(`ERROR: ${envName} environment variable is not set.`);
    console.error('Cannot execute GitHub operations without a token.');
    return 1;
  }

  const env = buildGhEnv(token, process.env);
  const ghArgs = [...parseGhCommand(command), ...args];

  const result = spawnSync('gh', ghArgs, {
    env,
    stdio: 'inherit',
    cwd: process.cwd(),
  });

  if (result.error) {
    if ('code' in result.error && result.error.code === 'ENOENT') {
      console.error('ERROR: gh CLI is not installed.');
      console.error('Install from: https://cli.github.com/');
      return 1;
    }
    console.error(`ERROR: ${result.error.message}`);
    return 1;
  }

  return result.status ?? 1;
}

// --- doctor (Plan AIF-008, Task 002) ---

/** @returns {boolean} whether `tool --help` can be spawned. */
function toolResolves(tool) {
  // Constant tool name + args; shell only on Windows so .cmd shims (npm bins) resolve.
  const r = spawnSync(tool, ['--help'], { stdio: 'ignore', shell: process.platform === 'win32' });
  return !r.error && r.status === 0;
}

/**
 * Report tool presence, config found and token resolution (yes/no only;
 * never prints a token). Returns the process exit code.
 */
function runDoctor() {
  const tools = {};
  for (const t of DOCTOR_TOOLS) tools[t] = toolResolves(t);

  const found = findAiConfig();
  let tokenEnvName = null;
  let tokenSource = null;
  if (found) {
    tokenEnvName = getIdentity(found.config).tokenEnvName;
    if (tokenEnvName) {
      const { run, allowInsecureDotenv } = getSecretsConfig(found.config);
      if (process.env[tokenEnvName]) {
        tokenSource = 'env';
      } else if (run) {
        const [cmd, ...rest] = run.map((p) => resolvePlaceholders(p, process.env));
        const r = spawnSync(cmd, [...rest, 'node', '-e', DOCTOR_PROBE_SCRIPT], {
          env: { ...process.env, [DOCTOR_PROBE_ENV]: tokenEnvName },
          stdio: 'ignore',
        });
        if (!r.error && r.status === 0) tokenSource = 'wrapper';
      }
      if (!tokenSource && allowInsecureDotenv) {
        const dotenvPath = join(found.root, '.env');
        if (existsSync(dotenvPath) && parseDotenv(readFileSync(dotenvPath, 'utf8'))[tokenEnvName]) {
          tokenSource = 'dotenv';
        }
      }
    }
  }

  const { ok, lines } = buildDoctorReport({
    tools,
    configFound: Boolean(found),
    tokenEnvName,
    tokenSource,
  });
  for (const line of lines) console.log(line);
  return ok ? 0 : 1;
}

// --- Main ---

function printUsage() {
  console.log(`ai-git — Git operations with AI agent identity

Usage:
  ai-git <command> [args...]

Git commands (identity + auth injected):
  ai-git commit -m "message"
  ai-git push [remote] [branch]
  ai-git worktree add <path> -b <branch>
  ai-git tag <name>
  ai-git <any git subcommand>

GitHub commands (GH_TOKEN injected):
  ai-git gh-pr-create [--title "..." --body "..." --base main]
  ai-git gh-pr-list [--state open]
  ai-git gh-pr-merge <number> [--squash]
  ai-git gh-pr-view <number>
  ai-git gh-repo-view

Diagnostics:
  ai-git doctor   Report whether ai-git, gh, bws, .aiconfig.json and the token resolve

Configuration:
  Reads .aiconfig.json from the current directory or any parent.
  Uses ai_identity.git_author_name, ai_identity.git_author_email,
  and the token from the env var named in ai_identity.git_token_env.
`);
}

/**
 * If the configured AI_GIT_TOKEN-equivalent env var is missing, try to
 * resolve it before any git/gh operation runs: re-exec through
 * `secrets.run` (a provider-agnostic run-wrapper, e.g. `bws run
 * --project-id X --`) if configured, else load a gitignored `.env` if
 * `secrets.allow_insecure_dotenv` is explicitly true. Re-exec never
 * returns — it replaces this process with the wrapped child's exit code.
 * Mirrors runGit/runGh's existing discipline: the token is never logged
 * or echoed, only passed via `stdio: 'inherit'` env injection.
 * @param {object} config - Parsed .aiconfig.json
 * @param {string} root - Project root (where .aiconfig.json was found)
 * @param {{ tokenEnvName: string|null }} identity
 */
function resolveSecrets(config, root, identity) {
  if (!identity.tokenEnvName || process.env[identity.tokenEnvName]) return;

  const { run, allowInsecureDotenv } = getSecretsConfig(config);

  if (run && !isAlreadyWrapped(process.env)) {
    // Bare "node" rather than process.execPath: some secrets-manager run
    // wrappers (confirmed with `bws run` on Windows) relay the wrapped
    // command through a shell without quoting, so an absolute path
    // containing spaces (e.g. "C:\Program Files\nodejs\node.exe") breaks.
    // node must already be resolvable on PATH here regardless, since
    // this script itself only runs via `node ...` or a PATH-based shim.
    const { command, args: wrapperArgs } = buildWrapperInvocation(
      run,
      'node',
      __filename,
      process.argv.slice(2),
      process.env,
    );
    const result = spawnSync(command, wrapperArgs, {
      env: { ...process.env, [REEXEC_GUARD_ENV]: '1' },
      stdio: 'inherit',
      cwd: process.cwd(),
    });
    process.exit(result.status ?? 1);
  }

  if (allowInsecureDotenv) {
    const dotenvPath = join(root, '.env');
    if (existsSync(dotenvPath)) {
      console.error(
        `⚠ secrets.allow_insecure_dotenv is enabled — loading ${dotenvPath} in plaintext. Not for production use.`,
      );
      const parsed = parseDotenv(readFileSync(dotenvPath, 'utf8'));
      for (const [key, value] of Object.entries(parsed)) {
        if (!(key in process.env)) process.env[key] = value;
      }
    }
  }
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    printUsage();
    process.exit(0);
  }

  if (isDoctorCommand(args[0])) process.exit(runDoctor());

  // Find and load config
  const found = findAiConfig();
  if (!found) {
    console.error('ERROR: No .aiconfig.json found in current directory or any parent.');
    console.error('ai-git requires a project with ai_identity configured.');
    process.exit(1);
  }

  const identity = getIdentity(found.config);
  const command = args[0];
  const commandArgs = args.slice(1);

  // Only resolve secrets for operations that actually need the token —
  // every other invocation (commit, add, status, log, worktree, ...)
  // must stay fast and must not depend on a secrets backend being
  // installed/reachable.
  if (isGhCommand(command) || needsPushAuth(command)) {
    resolveSecrets(found.config, found.root, identity);
  }

  // Route to git or gh
  if (isGhCommand(command)) {
    process.exit(runGh(command, commandArgs, identity));
  } else {
    process.exit(runGit(args, identity));
  }
}

main();
