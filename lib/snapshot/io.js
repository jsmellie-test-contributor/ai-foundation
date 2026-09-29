/**
 * I/O layer for the snapshot subsystem — filesystem reads/writes and hashing.
 * Pure decision logic (what counts as stale, what a runtime file is, how CLI
 * args map to targets) lives in lib/snapshot/pure.js and is unit tested there.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import { resolveBundle, listBundles, listServers, listHookResources } from '../resolver.js';
import { SOURCE_DIRS } from '../constants.js';
import { collectFiles, hashContent } from '../file-utils.js';
import { isRuntimeFile } from './pure.js';

/**
 * Hash a file's contents with sha256 prefix.
 * @param {string} filePath
 * @returns {string}
 */
function hashFile(filePath) {
  return hashContent(readFileSync(filePath));
}

/**
 * Hash the runtime files of a directory (excludes tests/ and .test.js), keyed
 * by a caller-supplied relative-path prefix.
 * @param {string} dir - Absolute directory path
 * @param {string} relPrefix - Prefix for relative paths in the result, e.g. "servers/git"
 * @returns {Record<string, string>}
 */
function hashRuntimeFiles(dir, relPrefix) {
  const sources = {};
  const allFiles = collectFiles(dir);
  for (const file of allFiles.filter(isRuntimeFile)) {
    sources[`${relPrefix}/${file}`] = hashFile(join(dir, file));
  }
  return sources;
}

function readJsonSnapshot(snapshotPath) {
  if (!existsSync(snapshotPath)) return null;
  try {
    return JSON.parse(readFileSync(snapshotPath, 'utf8'));
  } catch {
    return null;
  }
}

function writeJsonSnapshot(snapshotPath, snapshot) {
  writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2) + '\n', 'utf8');
}

// --- Bundle snapshots (bundle-owned sources only: agents, steering, skills) ---

/**
 * Compute source hashes for a resolved bundle's own sources.
 * Does not include servers — servers are shared resources with their own
 * snapshot (see computeServerSourceHashes).
 * @param {import('../resolver.js').ResolvedBundle} resolved
 * @param {string} repoRoot
 * @returns {Record<string, string>} relative path → hash
 */
export function computeBundleSourceHashes(resolved, repoRoot) {
  const sources = {};

  for (const file of resolved.agents) {
    const relPath = `agents/${file}`;
    const absPath = join(repoRoot, relPath);
    if (existsSync(absPath)) {
      sources[relPath] = hashFile(absPath);
    }
  }

  for (const relPath of resolved.steering) {
    const absPath = join(repoRoot, relPath);
    if (existsSync(absPath)) {
      sources[relPath] = hashFile(absPath);
    }
  }

  for (const skillName of resolved.skills) {
    const skillDir = join(repoRoot, 'skills', skillName);
    for (const file of collectFiles(skillDir)) {
      sources[`skills/${skillName}/${file}`] = hashFile(join(skillDir, file));
    }
  }

  return sources;
}

/**
 * Build a snapshot object for a bundle.
 * @param {string} bundleName
 * @param {string} repoRoot
 * @returns {{ bundle: string, version: string, computed_at: string, sources: Record<string, string> }}
 */
export function buildSnapshot(bundleName, repoRoot) {
  const resolved = resolveBundle(bundleName, repoRoot);
  return {
    bundle: bundleName,
    version: resolved.version,
    computed_at: new Date().toISOString(),
    sources: computeBundleSourceHashes(resolved, repoRoot),
  };
}

/**
 * Read the existing snapshot file for a bundle, or null if it doesn't exist.
 * @param {string} bundleName
 * @param {string} repoRoot
 * @returns {{ bundle: string, version: string, computed_at: string, sources: Record<string, string> }|null}
 */
export function readSnapshot(bundleName, repoRoot) {
  return readJsonSnapshot(join(repoRoot, SOURCE_DIRS.bundles, bundleName, 'snapshot.json'));
}

function writeSnapshot(bundleName, snapshot, repoRoot) {
  writeJsonSnapshot(join(repoRoot, SOURCE_DIRS.bundles, bundleName, 'snapshot.json'), snapshot);
}

// --- Server snapshots (shared resource — one snapshot regardless of how many bundles reference it) ---

/**
 * Compute source hashes for a server's own runtime files.
 * @param {string} serverName
 * @param {string} repoRoot
 * @returns {Record<string, string>}
 */
export function computeServerSourceHashes(serverName, repoRoot) {
  const serverDir = join(repoRoot, SOURCE_DIRS.servers, serverName);
  return hashRuntimeFiles(serverDir, `${SOURCE_DIRS.servers}/${serverName}`);
}

/**
 * Build a snapshot object for a server.
 * @param {string} serverName
 * @param {string} repoRoot
 * @returns {{ server: string, computed_at: string, sources: Record<string, string> }}
 */
export function buildServerSnapshot(serverName, repoRoot) {
  return {
    server: serverName,
    computed_at: new Date().toISOString(),
    sources: computeServerSourceHashes(serverName, repoRoot),
  };
}

/**
 * Read the existing snapshot file for a server, or null if it doesn't exist.
 * @param {string} serverName
 * @param {string} repoRoot
 * @returns {{ server: string, computed_at: string, sources: Record<string, string> }|null}
 */
export function readServerSnapshot(serverName, repoRoot) {
  return readJsonSnapshot(join(repoRoot, SOURCE_DIRS.servers, serverName, 'snapshot.json'));
}

function writeServerSnapshot(serverName, snapshot, repoRoot) {
  writeJsonSnapshot(join(repoRoot, SOURCE_DIRS.servers, serverName, 'snapshot.json'), snapshot);
}

// --- Hook resource snapshots (shared resource, e.g. Claude Code's block-command script) ---

/**
 * Compute source hashes for a harness-level shared hook resource's own source files.
 * @param {string} hookName
 * @param {string} repoRoot
 * @returns {Record<string, string>}
 */
export function computeHookSourceHashes(hookName, repoRoot) {
  const hookDir = join(repoRoot, SOURCE_DIRS.hookAssets, hookName);
  return hashRuntimeFiles(hookDir, `${SOURCE_DIRS.hookAssets}/${hookName}`);
}

/**
 * Build a snapshot object for a hook resource.
 * @param {string} hookName
 * @param {string} repoRoot
 * @returns {{ hook: string, computed_at: string, sources: Record<string, string> }}
 */
export function buildHookSnapshot(hookName, repoRoot) {
  return {
    hook: hookName,
    computed_at: new Date().toISOString(),
    sources: computeHookSourceHashes(hookName, repoRoot),
  };
}

/**
 * Read the existing snapshot file for a hook resource, or null if it doesn't exist.
 * @param {string} hookName
 * @param {string} repoRoot
 * @returns {{ hook: string, computed_at: string, sources: Record<string, string> }|null}
 */
export function readHookSnapshot(hookName, repoRoot) {
  return readJsonSnapshot(join(repoRoot, SOURCE_DIRS.hookAssets, hookName, 'snapshot.json'));
}

function writeHookSnapshot(hookName, snapshot, repoRoot) {
  writeJsonSnapshot(join(repoRoot, SOURCE_DIRS.hookAssets, hookName, 'snapshot.json'), snapshot);
}

// --- Resource kind registry — drives the CLI's generic generate/check loop ---

/**
 * @typedef {object} ResourceKindConfig
 * @property {string} label
 * @property {(repoRoot: string) => string[]} list
 * @property {(name: string, repoRoot: string) => { sources: Record<string, string> }} build
 * @property {(name: string, repoRoot: string) => { sources: Record<string, string> }|null} read
 * @property {(name: string, snapshot: object, repoRoot: string) => void} write
 */

/** @type {Record<string, ResourceKindConfig>} */
export const RESOURCE_KINDS = {
  bundle: {
    label: 'bundle',
    list: listBundles,
    build: buildSnapshot,
    read: readSnapshot,
    write: writeSnapshot,
  },
  server: {
    label: 'server',
    list: listServers,
    build: buildServerSnapshot,
    read: readServerSnapshot,
    write: writeServerSnapshot,
  },
  hook: {
    label: 'hook',
    list: listHookResources,
    build: buildHookSnapshot,
    read: readHookSnapshot,
    write: writeHookSnapshot,
  },
};
