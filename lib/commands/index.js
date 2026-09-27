/**
 * index command — scans a project's decisions or architecture directory and
 * generates an index.json with metadata for each file.
 *
 * This runs in a project directory (not the ai-foundation repo).
 * It resolves the relevant path via lib/aiconfig.js, then scans
 * the corresponding files for metadata.
 *
 * Plan: AIF-002-014 (added resolveDecisionsPath and the decision-index
 * generation path). Target selection was later switched from -k/-d flags
 * to a positional target, matching the `list`/`validate`/`test` command
 * convention (`aif` CLI subcommand consistency is the kind of secondary case
 * docs/decisions/0005-ai-git-tool-boundary.md's shell-vs-MCP test applies to).
 * The generic `knowledge` target (frontmatter `type` taxonomy) retired
 * under process-model check 13 — decisions and architecture each have
 * their own dedicated indexer, per `steering/engineering/document-types.md`.
 *
 * Usage:
 *   aif index decisions              — generate {paths.decisions}/index.json
 *   aif index decisions --check      — verify the decision index without writing
 *   aif index architecture           — generate {paths.architecture}/index.json
 *   aif index architecture --check   — verify the architecture index without writing
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import { buildDecisionIndexForDir, diffDecisionIndex } from '../decisions.js';
import {
  buildArchitectureIndexForDir,
  diffArchitectureIndex,
  findBrokenLinks,
} from '../architecture.js';
import { getConfigPath } from '../aiconfig.js';

/**
 * Resolve a project's decisions directory via the shared .aiconfig.json
 * resolver (lib/aiconfig.js): the configured paths.decisions value, or its
 * documented default.
 * @param {string} projectRoot
 * @returns {string} Absolute path to the decisions directory
 */
export function resolveDecisionsPath(projectRoot) {
  return getConfigPath(projectRoot, 'paths.decisions');
}

/**
 * Resolve a project's architecture directory via the shared .aiconfig.json
 * resolver. Mirrors resolveDecisionsPath: reads the configured
 * paths.architecture value, or its documented default (nested under the
 * resolved paths.knowledge, per lib/aiconfig-defaults.js).
 * @param {string} projectRoot
 * @returns {string} Absolute path to the architecture directory
 */
export function resolveArchitecturePath(projectRoot) {
  return getConfigPath(projectRoot, 'paths.architecture');
}

/**
 * Read an existing decisions index.json, or null if absent/unparseable.
 * @param {string} indexPath - Absolute path to the decisions index.json
 * @returns {{ generated_at: string, entries: import('../decisions.js').DecisionIndexEntry[] }|null}
 */
function readExistingDecisionIndex(indexPath) {
  if (!existsSync(indexPath)) return null;
  try {
    return JSON.parse(readFileSync(indexPath, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Run the decision-index generation/validation path (-d/--decision).
 * @param {{ args: Record<string, string|boolean>, positional: string[] }} parsed
 * @param {string} repoRoot
 * @returns {number} exit code
 */
function runDecisionIndex(parsed, repoRoot) {
  const decisionsDir = resolveDecisionsPath(repoRoot);
  const indexPath = join(decisionsDir, 'index.json');

  let index;
  try {
    index = buildDecisionIndexForDir(decisionsDir);
  } catch (err) {
    console.error(`✗ ${err.message}`);
    return 1;
  }

  if (parsed.args.check) {
    const existing = readExistingDecisionIndex(indexPath);
    const diff = diffDecisionIndex(index, existing);
    if (diff.stale) {
      console.error(`✗ Decision index is stale: ${diff.summary}`);
      return 1;
    }
    console.log('✓ Decision index is up to date.');
    return 0;
  }

  if (index.entries.length === 0) {
    console.log(`No ADR files found under: ${decisionsDir}. Writing an empty index.`);
  }

  mkdirSync(decisionsDir, { recursive: true });
  writeFileSync(indexPath, JSON.stringify(index, null, 2) + '\n', 'utf8');
  console.log(`✓ Decision index generated: ${index.entries.length} entries → ${indexPath}`);

  return 0;
}

/**
 * Read an existing architecture index.json, or null if absent/unparseable.
 * @param {string} indexPath - Absolute path to the architecture index.json
 * @returns {{ generated_at: string, entries: import('../architecture.js').ArchitectureIndexEntry[], reverse_index: Record<string, string[]> }|null}
 */
function readExistingArchitectureIndex(indexPath) {
  if (!existsSync(indexPath)) return null;
  try {
    return JSON.parse(readFileSync(indexPath, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Run the architecture-index generation/validation path.
 * @param {{ args: Record<string, string|boolean>, positional: string[] }} parsed
 * @param {string} repoRoot
 * @returns {number} exit code
 */
function runArchitectureIndex(parsed, repoRoot) {
  const architectureDir = resolveArchitecturePath(repoRoot);
  const indexPath = join(architectureDir, 'index.json');

  let index;
  try {
    index = buildArchitectureIndexForDir(architectureDir, repoRoot);
  } catch (err) {
    console.error(`✗ ${err.message}`);
    return 1;
  }

  if (parsed.args.check) {
    const existing = readExistingArchitectureIndex(indexPath);
    const diff = diffArchitectureIndex(index, existing);
    if (diff.stale) {
      console.error(`✗ Architecture index is stale: ${diff.summary}`);
      return 1;
    }
    const staleDocs = index.entries.filter((e) => e.stale).map((e) => e.path);
    if (staleDocs.length > 0) {
      console.error(`✗ Architecture docs stale against key_files: ${staleDocs.join(', ')}`);
      return 1;
    }
    const brokenLinks = findBrokenLinks(architectureDir);
    if (brokenLinks.length > 0) {
      console.error('✗ Broken relative links in docs/architecture:');
      for (const msg of brokenLinks) console.error(`    ${msg}`);
      return 1;
    }
    console.log('✓ Architecture index is up to date.');
    return 0;
  }

  if (index.entries.length === 0) {
    console.log(`No arc42 section files found under: ${architectureDir}. Writing an empty index.`);
  }

  mkdirSync(architectureDir, { recursive: true });
  writeFileSync(indexPath, JSON.stringify(index, null, 2) + '\n', 'utf8');
  console.log(`✓ Architecture index generated: ${index.entries.length} entries → ${indexPath}`);

  const staleDocs = index.entries.filter((e) => e.stale).map((e) => e.path);
  if (staleDocs.length > 0) {
    console.log(`  ⚠ stale against key_files: ${staleDocs.join(', ')}`);
  }

  const brokenLinks = findBrokenLinks(architectureDir);
  if (brokenLinks.length > 0) {
    console.log('  ⚠ broken relative links:');
    for (const msg of brokenLinks) console.log(`    ${msg}`);
  }

  return 0;
}

/**
 * Run the index command.
 * @param {{ args: Record<string, string|boolean>, positional: string[] }} parsed
 * @param {string} repoRoot
 * @returns {number} exit code
 */
export function runIndex(parsed, repoRoot) {
  const target = parsed.positional[0];

  if (!target) {
    console.error('Usage: aif index <decisions|architecture>');
    return 1;
  }

  try {
    switch (target) {
      case 'decisions':
        return runDecisionIndex(parsed, repoRoot);
      case 'architecture':
        return runArchitectureIndex(parsed, repoRoot);
      default:
        console.error(`Unknown index target: ${target}. Use: decisions, architecture`);
        return 1;
    }
  } catch (err) {
    console.error(`✗ ${err.message}`);
    return 1;
  }
}
