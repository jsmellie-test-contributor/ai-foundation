/**
 * init command — scaffolds a new project by copying the template directory
 * and applying project configuration substitution.
 *
 * Usage:
 *   aif init --name <project-name>
 *   aif init --name my-app --language typescript --org acme
 *   aif init --interactive  (prompt for all fields, even if flags provided)
 *   aif init  (interactive mode if run in a terminal without --name)
 *
 * Flags:
 *   --name <name>         Project directory name (required unless interactive)
 *   --shortname <name>    Short project identifier for Feature IDs and worktree paths,
 *                         max 5 characters (defaults to --name if omitted)
 *   --language <lang>     Primary language (e.g. typescript, csharp, python, go, rust)
 *   --org <organization>  Organization name
 *   --module-id <id>      Language-specific module/package identifier
 *   --repo <url>          Git repository URL
 *   --standards <list>    Comma-separated standard tags (e.g. csharp,avalonia)
 *   --interactive         Force interactive prompts (flag values used as defaults)
 *   --force               Overwrite existing directory
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';

import {
  validateProjectName,
  validateProjectShortname,
  applyProjectConfig,
  buildAiConfig,
} from '../project-init.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TEMPLATE_DIR = resolve(__dirname, '..', '..', 'projects', '_template');

/**
 * Recursively copy a directory, applying config substitution to file contents.
 * For .aiconfig.json, uses buildAiConfig to generate content instead of template.
 * @param {string} srcDir - Source directory (template)
 * @param {string} destDir - Destination directory (new project)
 * @param {import('../project-init.js').ProjectConfig} config - Project configuration
 */
function copyTemplate(srcDir, destDir, config) {
  const entries = readdirSync(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(srcDir, entry.name);
    const destPath = join(destDir, entry.name);

    if (entry.isDirectory()) {
      mkdirSync(destPath, { recursive: true });
      copyTemplate(srcPath, destPath, config);
    } else if (entry.name === '.aiconfig.json') {
      // Generate .aiconfig.json from config rather than template substitution
      const content = buildAiConfig(config);
      mkdirSync(dirname(destPath), { recursive: true });
      writeFileSync(destPath, content, 'utf8');
    } else {
      const content = readFileSync(srcPath, 'utf8');
      const transformed = applyProjectConfig(content, config);
      mkdirSync(dirname(destPath), { recursive: true });
      writeFileSync(destPath, transformed, 'utf8');
    }
  }
}

/**
 * Prompt the user for a value. Shows the default (from flags) in brackets.
 * @param {import('node:readline/promises').Interface} rl - Readline interface
 * @param {string} prompt - Prompt text shown to user
 * @param {string|undefined} defaultValue - Default value from flags
 * @param {boolean} skipIfProvided - If true and defaultValue exists, skip the prompt
 * @returns {Promise<string>} The value (user input, or default if blank)
 */
async function askField(rl, prompt, defaultValue, skipIfProvided) {
  if (skipIfProvided && defaultValue) return defaultValue;

  const suffix = defaultValue ? ` [${defaultValue}]: ` : ': ';
  const answer = await rl.question(`${prompt}${suffix}`);
  const trimmed = answer.trim();

  return trimmed || defaultValue || '';
}

/**
 * Extract ProjectConfig from parsed CLI args.
 * @param {Record<string, string|boolean>} args - Parsed CLI arguments
 * @returns {import('../project-init.js').ProjectConfig}
 */
function configFromArgs(args) {
  const config = {};

  if (typeof args.name === 'string') config.projectName = args.name;
  if (typeof args.shortname === 'string') config.projectShortname = args.shortname;
  if (typeof args.language === 'string') config.language = args.language;
  if (typeof args.org === 'string') config.organization = args.org;
  if (typeof args['module-id'] === 'string') config.moduleId = args['module-id'];
  if (typeof args.repo === 'string') config.repository = args.repo;
  if (typeof args.standards === 'string') {
    config.standards = args.standards
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  return config;
}

/**
 * Run the interactive prompt flow. In forced interactive mode, all fields are
 * prompted with flag values shown as defaults. In auto-interactive mode (no --name
 * provided), fields with flag values are skipped.
 * @param {import('../project-init.js').ProjectConfig} config - Partial config from flags
 * @param {object} [options] - Options
 * @param {boolean} [options.forceAll] - Prompt all fields even if already provided
 * @param {import('node:readline/promises').Interface} [options.rl] - Readline interface (injected for testing)
 * @returns {Promise<import('../project-init.js').ProjectConfig>} Complete config
 */
export async function promptForConfig(config, options = {}) {
  const forceAll = options.forceAll || false;
  const skipIfProvided = !forceAll;

  const rl =
    options.rl ||
    createInterface({
      input: process.stdin,
      output: process.stdout,
    });

  try {
    config.projectName = await askField(rl, 'Project name', config.projectName, skipIfProvided);

    config.projectShortname = await askField(
      rl,
      'Project short name (max 5 chars, used in Feature IDs and worktree paths; defaults to project name)',
      config.projectShortname,
      skipIfProvided,
    );

    config.organization = await askField(rl, 'Organization', config.organization, skipIfProvided);

    config.language = await askField(
      rl,
      'Language (e.g. typescript, csharp, python, go, rust)',
      config.language,
      skipIfProvided,
    );

    config.moduleId = await askField(
      rl,
      'Module ID (npm scope, Go module, crate, namespace)',
      config.moduleId,
      skipIfProvided,
    );

    config.repository = await askField(rl, 'Repository URL', config.repository, skipIfProvided);

    if (!skipIfProvided || !config.standards) {
      const currentStd = config.standards ? config.standards.join(', ') : '';
      const stdAnswer = await askField(
        rl,
        'Standard tags (comma-separated, e.g. csharp,avalonia)',
        currentStd,
        false,
      );
      if (stdAnswer) {
        config.standards = stdAnswer
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      }
    }
  } finally {
    if (!options.rl) {
      rl.close();
    }
  }

  return config;
}

/**
 * Run the init command.
 * @param {{ args: Record<string, string|boolean>, positional: string[] }} parsed
 * @param {string} _repoRoot - Unused
 * @returns {Promise<number>} exit code
 */
export async function runInit(parsed, _repoRoot) {
  const force = Boolean(parsed.args.force);
  const interactive = Boolean(parsed.args.interactive);
  let config = configFromArgs(parsed.args);

  const isTTY = process.stdin.isTTY;

  // Determine whether to enter interactive mode:
  // 1. --interactive flag explicitly requests it
  // 2. No --name provided and we're in a terminal
  const shouldPrompt = interactive || (!config.projectName && isTTY);

  if (!config.projectName && !shouldPrompt) {
    console.error('Missing required option: --name <project-name>');
    console.error('Run interactively (in a terminal) or provide --name.');
    return 1;
  }

  if (shouldPrompt) {
    if (!isTTY) {
      console.error('Interactive mode requires a terminal (TTY).');
      return 1;
    }
    config = await promptForConfig(config, { forceAll: interactive });
  }

  // Validate project name
  if (!config.projectName) {
    console.error('Project name is required.');
    return 1;
  }

  const validation = validateProjectName(config.projectName);
  if (!validation.valid) {
    console.error(`Invalid project name: ${validation.error}`);
    return 1;
  }

  // Validate project short name, if provided (optional — falls back to project name)
  if (config.projectShortname) {
    const shortnameValidation = validateProjectShortname(config.projectShortname);
    if (!shortnameValidation.valid) {
      console.error(`Invalid project short name: ${shortnameValidation.error}`);
      return 1;
    }
  }

  const projectDir = join(process.cwd(), config.projectName);

  if (existsSync(projectDir) && !force) {
    console.error(`Directory already exists: ${projectDir}`);
    console.error('Use --force to overwrite.');
    return 1;
  }

  mkdirSync(projectDir, { recursive: true });
  copyTemplate(TEMPLATE_DIR, projectDir, config);

  console.log(`✓ Project "${config.projectName}" initialized at ./${config.projectName}/`);
  return 0;
}
