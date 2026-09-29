/**
 * install command — resolves a bundle and delegates installation to the
 * harness adapter. Records results in the manifest.
 *
 * Shared resources (MCP servers, harness-level hook scripts) are tracked in
 * their own manifest sections with an `installedBy` list, independent of any
 * single bundle's lifecycle — see lib/manifest.js and
 * docs/decisions/0003-shared-resource-lifecycle-management.md
 *
 * Modes:
 *   aif install --bundle <name> --harness <name>       — install a specific bundle
 *   aif install --bundle <a>,<b>,... --harness <name>   — install multiple bundles to the same harness
 *   aif install --update                                — update all installed bundles that are stale
 */

import { resolveBundle, listStandards } from '../resolver.js';
import * as kiro from '../harnesses/kiro.js';
import * as claude from '../harnesses/claude.js';
import {
  readManifest,
  writeManifest,
  getSectionEntry,
  setSectionEntry,
  addOwner,
} from '../manifest.js';
import { HARNESSES, manifestKey } from '../constants.js';
import { readSnapshot, readServerSnapshot, readHookSnapshot } from './snapshot.js';
import { isFreshnessCurrent } from '../snapshot/pure.js';

const adapters = {
  kiro,
  claude,
};

/**
 * Check if an installed bundle is current: its own sources are unchanged,
 * and every shared server/hook resource it depends on is also unchanged.
 * @param {string} bundleName
 * @param {string} harness
 * @param {string} repoRoot
 * @returns {boolean} true if the bundle and all its dependencies are current
 */
function isCurrent(bundleName, harness, repoRoot) {
  const manifest = readManifest(repoRoot);
  const key = manifestKey(bundleName, harness);
  const entry = getSectionEntry(manifest, 'bundles', key);
  if (!entry) return false;

  if (!isFreshnessCurrent(entry.sourceHashes, readSnapshot(bundleName, repoRoot))) {
    return false;
  }

  for (const serverName of entry.servers || []) {
    const serverEntry = getSectionEntry(manifest, 'servers', manifestKey(serverName, harness));
    const stored = serverEntry && serverEntry.sourceHashes;
    if (!isFreshnessCurrent(stored, readServerSnapshot(serverName, repoRoot))) return false;
  }

  for (const hookName of entry.hooks || []) {
    const hookEntry = getSectionEntry(manifest, 'hooks', manifestKey(hookName, harness));
    const stored = hookEntry && hookEntry.sourceHashes;
    if (!isFreshnessCurrent(stored, readHookSnapshot(hookName, repoRoot))) return false;
  }

  return true;
}

/**
 * Install a single bundle to a harness.
 * @param {string} bundleName
 * @param {string} harness
 * @param {string} repoRoot
 * @returns {number} exit code
 */
function installBundle(bundleName, harness, repoRoot) {
  let resolved;
  try {
    resolved = resolveBundle(bundleName, repoRoot);
  } catch (err) {
    console.error(err.message);
    return 1;
  }

  const adapter = adapters[harness];

  // Bundle-owned components (all available standards; loading is gated by resolution rules)
  const standardsFiles = adapter.installStandards(listStandards(repoRoot), repoRoot);
  const agentsResult = adapter.installAgents(resolved.agents, repoRoot); // { files, sharedResources }
  const steeringFiles = adapter.installSteering(resolved.steering, repoRoot);
  const skillsFiles = adapter.installSkills(resolved.skills, repoRoot);
  const files = [...standardsFiles, ...agentsResult.files, ...steeringFiles, ...skillsFiles];

  // Shared resources — installed regardless of whether another bundle already
  // owns them (idempotent), then registered as depended-on by this bundle.
  const serverResults = adapter.installServers(resolved.servers, repoRoot); // [{ name, files }]
  const sharedResourceResults = adapter.installSharedResources(
    agentsResult.sharedResources,
    repoRoot,
  ); // [{ name, files }]

  let manifest = readManifest(repoRoot);

  for (const { name, files: serverFiles } of serverResults) {
    const serverKey = manifestKey(name, harness);
    const existing = getSectionEntry(manifest, 'servers', serverKey) || {
      files: [],
      installedBy: [],
    };
    const serverSnapshot = readServerSnapshot(name, repoRoot);
    const entry = { files: serverFiles, installedBy: addOwner(existing.installedBy, bundleName) };
    if (serverSnapshot && serverSnapshot.sources) {
      entry.sourceHashes = serverSnapshot.sources;
    }
    manifest = setSectionEntry(manifest, 'servers', serverKey, entry);
  }

  for (const { name, files: hookFiles } of sharedResourceResults) {
    const hookKey = manifestKey(name, harness);
    const existing = getSectionEntry(manifest, 'hooks', hookKey) || { files: [], installedBy: [] };
    const hookSnapshot = readHookSnapshot(name, repoRoot);
    const entry = { files: hookFiles, installedBy: addOwner(existing.installedBy, bundleName) };
    if (hookSnapshot && hookSnapshot.sources) {
      entry.sourceHashes = hookSnapshot.sources;
    }
    manifest = setSectionEntry(manifest, 'hooks', hookKey, entry);
  }

  // Record the bundle itself (include snapshot hashes for freshness detection)
  const bundleKey = manifestKey(bundleName, harness);
  const bundleSnapshot = readSnapshot(bundleName, repoRoot);
  const bundleEntry = {
    version: resolved.version,
    files,
    servers: resolved.servers,
    hooks: agentsResult.sharedResources,
  };
  if (bundleSnapshot && bundleSnapshot.sources) {
    bundleEntry.sourceHashes = bundleSnapshot.sources;
  }
  manifest = setSectionEntry(manifest, 'bundles', bundleKey, bundleEntry);

  writeManifest(repoRoot, manifest);

  const totalFiles =
    files.length +
    serverResults.reduce((n, s) => n + s.files.length, 0) +
    sharedResourceResults.reduce((n, s) => n + s.files.length, 0);
  console.log(`\nInstalled bundle "${bundleName}" to ${harness} (${totalFiles} files)`);
  return 0;
}

/**
 * Parse a possibly comma-separated `--bundle` value into unique, trimmed
 * bundle names. "a, b,,a" -> ["a", "b"].
 * @param {string} bundleArg
 * @returns {string[]}
 */
function parseBundleNames(bundleArg) {
  return [
    ...new Set(
      bundleArg
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ];
}

/**
 * Install one or more bundles to a harness, skipping any that are already
 * current. The single-bundle case keeps its existing terse output (no
 * summary line); multiple bundles get the same aggregate summary as
 * `--update`, and one bundle's failure doesn't stop the rest from being
 * attempted.
 * @param {string[]} bundleNames
 * @param {string} harness
 * @param {string} repoRoot
 * @returns {number} exit code
 */
function installBundles(bundleNames, harness, repoRoot) {
  if (bundleNames.length === 1) {
    const [bundleName] = bundleNames;
    if (isCurrent(bundleName, harness, repoRoot)) {
      console.log(`✓ ${bundleName} → ${harness}: already current, skipping.`);
      return 0;
    }
    return installBundle(bundleName, harness, repoRoot);
  }

  let installed = 0;
  let skipped = 0;
  let failed = 0;

  for (const bundleName of bundleNames) {
    if (isCurrent(bundleName, harness, repoRoot)) {
      console.log(`✓ ${bundleName} → ${harness}: already current, skipping.`);
      skipped++;
      continue;
    }

    const code = installBundle(bundleName, harness, repoRoot);
    if (code === 0) {
      installed++;
    } else {
      failed++;
    }
  }

  console.log(
    `\n${installed} installed, ${skipped} current${failed > 0 ? `, ${failed} failed` : ''}.`,
  );
  return failed > 0 ? 1 : 0;
}

/**
 * Update all installed bundles that are stale.
 * @param {string} repoRoot
 * @returns {number} exit code
 */
function runUpdate(repoRoot) {
  const manifest = readManifest(repoRoot);
  const keys = Object.keys(manifest.bundles);

  if (keys.length === 0) {
    console.log('Nothing installed. Use `aif install --bundle <name> --harness <name>` first.');
    return 0;
  }

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const key of keys) {
    const [bundle, harness] = key.split('_');

    if (isCurrent(bundle, harness, repoRoot)) {
      console.log(`✓ ${bundle} → ${harness}: already current`);
      skipped++;
      continue;
    }

    console.log(`↻ ${bundle} → ${harness}: updating...`);
    const code = installBundle(bundle, harness, repoRoot);
    if (code === 0) {
      updated++;
    } else {
      failed++;
    }
  }

  console.log(`\n${updated} updated, ${skipped} current${failed > 0 ? `, ${failed} failed` : ''}.`);
  return failed > 0 ? 1 : 0;
}

/**
 * Run the install command.
 * @param {{ args: Record<string, string|boolean>, positional: string[] }} parsed
 * @param {string} repoRoot
 * @returns {number} exit code
 */
export function runInstall(parsed, repoRoot) {
  // Update mode: refresh all stale installed bundles
  if (parsed.args.update) {
    return runUpdate(repoRoot);
  }

  const bundleArg = parsed.args.bundle;
  const harness = parsed.args.harness;

  if (typeof bundleArg !== 'string' || !bundleArg) {
    console.error('Missing required option: --bundle <name>[,<name>...] (or use --update)');
    return 1;
  }
  if (typeof harness !== 'string' || !harness) {
    console.error('Missing required option: --harness <name>');
    return 1;
  }
  if (!HARNESSES.includes(harness)) {
    console.error(`Unknown harness: ${harness}. Supported: ${HARNESSES.join(', ')}`);
    return 1;
  }

  const bundleNames = parseBundleNames(bundleArg);
  if (bundleNames.length === 0) {
    console.error('Missing required option: --bundle <name>[,<name>...] (or use --update)');
    return 1;
  }

  return installBundles(bundleNames, harness, repoRoot);
}
