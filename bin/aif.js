#!/usr/bin/env node

/**
 * aif — AI Foundation CLI
 *
 * Entry point for installing, uninstalling, and managing ai-foundation
 * components across supported harnesses.
 */

import { COMMANDS, HARNESSES } from '../lib/constants.js';

// --- Argument parsing ---

/**
 * Short flag → canonical long flag, for the options typed often enough to
 * be worth a one-letter alias. Deliberately not exhaustive — commands
 * themselves are not short-aliased (install/init/index would collide on
 * "i"), only flags.
 *
 * -h is reserved for --help alone, per near-universal CLI convention.
 * bundle/harness are aliased uppercase instead of lowercase: they combine
 * on the same commands (install, snapshot), and harness had to be
 * uppercase to avoid colliding with -h, so bundle follows it rather than
 * mixing case within one command line.
 */
const SHORT_FLAG_ALIASES = {
  h: 'help',
  B: 'bundle',
  H: 'harness',
};

/**
 * Parses raw argv into a structured command object.
 * @param {string[]} argv - process.argv.slice(2)
 * @returns {{ command: string|null, args: Record<string, string|boolean>, positional: string[] }}
 */
export function parseArgs(argv) {
  const result = { command: null, args: {}, positional: [] };

  if (argv.length === 0) {
    return result;
  }

  // First non-flag argument is the command
  let commandFound = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (!commandFound && !arg.startsWith('-')) {
      result.command = arg;
      commandFound = true;
      continue;
    }

    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      // If next arg exists and isn't a flag, treat as the value
      if (next && !next.startsWith('-')) {
        result.args[key] = next;
        i++;
      } else {
        result.args[key] = true;
      }
    } else if (arg.startsWith('-') && arg.length > 1) {
      // Single-dash short flag (e.g. -k, -d), after the command has been
      // identified. Parsed the same way as its double-dash equivalent —
      // stored under the same key convention (single-character key), with
      // an optional value if the next arg isn't itself a flag.
      const key = arg.slice(1);
      const next = argv[i + 1];
      if (next && !next.startsWith('-')) {
        result.args[key] = next;
        i++;
      } else {
        result.args[key] = true;
      }
    } else if (!commandFound) {
      // Flag before command
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('-')) {
        result.args[key] = next;
        i++;
      } else {
        result.args[key] = true;
      }
    } else {
      // Non-flag after command
      result.positional.push(arg);
    }
  }

  // Normalize short flags onto their canonical long form so every command
  // handler only ever has to read the long key. Long form wins if both
  // are somehow given.
  for (const [short, long] of Object.entries(SHORT_FLAG_ALIASES)) {
    if (short in result.args && !(long in result.args)) {
      result.args[long] = result.args[short];
    }
  }

  return result;
}

// --- Help ---

const USAGE = `
aif — AI Foundation CLI

Usage:
  aif <command> [options]

Commands:
  install     Install a bundle to a harness
  uninstall   Uninstall a bundle from a harness
  status      Show what is currently installed
  list        List available bundles, agents, skills, or servers
  validate    Check repo health (schema, refs, bundles)
  test        Run test suite (unit, integration, validation)
  snapshot    Compute source hashes for bundles, servers, and hook resources
  index       Generate a decision or architecture index for a project
  init        Scaffold a new project directory
  config      Resolve a .aiconfig.json field, falling back to its default

Options:
  -B, --bundle <name>   Bundle to install/uninstall (comma-separated for multiple, install only); bundle to snapshot (snapshot: name optional, omit for all bundles)
  --server [name]       Server to snapshot (snapshot command; omit name for all servers)
  --hook [name]         Hook resource to snapshot (snapshot command; omit name for all hooks)
  -H, --harness <name>  Target harness (${HARNESSES.join(', ')})
  --update              Update all installed bundles that are stale
  --check               Verify snapshots without writing (snapshot command)
  -h, --help            Show this help message

Init Options:
  --name <name>         Project directory name
  --language <lang>     Primary language (e.g. typescript, python, go)
  --org <organization>  Organization name
  --module-id <id>      Language-specific package/module identifier
  --repo <url>          Git repository URL
  --standards <list>    Comma-separated standard tags (e.g. csharp,avalonia)
  --interactive         Force interactive prompts (flag values as defaults)

Examples:
  aif install --bundle engineering --harness kiro
  aif install -B engineering -H kiro
  aif install --bundle engineering,product --harness kiro
  aif install --update
  aif uninstall --bundle engineering --harness kiro
  aif status
  aif list bundles
  aif validate
  aif validate schema
  aif test unit
  aif snapshot
  aif snapshot --server git
  aif snapshot --bundle
  aif snapshot --bundle --check
  aif index decisions
  aif index decisions --check
  aif init --name my-app --language typescript --org acme
  aif init --interactive
  aif config paths.decisions
  aif config paths.decisions --abs
`.trim();

function printHelp() {
  console.log(USAGE);
}

// --- Command routing ---

import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

import { runInstall } from '../lib/commands/install.js';
import { runUninstall } from '../lib/commands/uninstall.js';
import { runStatus } from '../lib/commands/status.js';
import { runList } from '../lib/commands/list.js';
import { runValidate } from '../lib/commands/validate.js';
import { runTest } from '../lib/commands/test.js';
import { runSnapshot } from '../lib/commands/snapshot.js';
import { runIndex } from '../lib/commands/index.js';
import { runInit } from '../lib/commands/init.js';
import { runConfig } from '../lib/commands/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '..');

/**
 * Routes a parsed command to the appropriate handler.
 * @param {{ command: string|null, args: Record<string, string|boolean>, positional: string[] }} parsed
 * @returns {Promise<number>} exit code
 */
export async function run(parsed) {
  if (!parsed.command || parsed.args.help) {
    printHelp();
    return parsed.args.help ? 0 : 1;
  }

  if (!COMMANDS.includes(parsed.command)) {
    console.error(`Unknown command: ${parsed.command}`);
    console.error(`Available commands: ${COMMANDS.join(', ')}`);
    return 1;
  }

  switch (parsed.command) {
    case 'install':
      return runInstall(parsed, REPO_ROOT);
    case 'uninstall':
      return runUninstall(parsed, REPO_ROOT);
    case 'status':
      return runStatus(parsed, REPO_ROOT);
    case 'list':
      return runList(parsed, REPO_ROOT);
    case 'validate':
      return runValidate(parsed, REPO_ROOT);
    case 'test':
      return runTest(parsed, REPO_ROOT);
    case 'snapshot':
      return runSnapshot(parsed, REPO_ROOT);
    case 'index':
      return runIndex(parsed, process.cwd());
    case 'init':
      return runInit(parsed, process.cwd());
    case 'config':
      return runConfig(parsed, process.cwd());
    default:
      return 1;
  }
}

// --- Main (only when run directly) ---

import { realpathSync } from 'node:fs';

function isMain() {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(__filename) === realpathSync(resolve(process.argv[1]));
  } catch {
    return false;
  }
}

if (isMain()) {
  const parsed = parseArgs(process.argv.slice(2));
  const exitCode = await run(parsed);
  process.exitCode = exitCode;
}
