/**
 * Manifest module — reads and writes .installs.yaml.
 *
 * The manifest has three top-level sections:
 *   - bundles: what each installed bundle owns exclusively (agents, steering,
 *     skills, standards) — keyed by "{bundle}_{harness}"
 *   - servers: MCP servers, which may be shared across multiple bundles —
 *     keyed by "{server}_{harness}", tracks an `installedBy` list of bundle
 *     names currently depending on it
 *   - hooks: harness-level shared script resources (e.g. Claude Code's
 *     block-command hook script), same shape as servers — keyed by
 *     "{hookResource}_{harness}"
 *
 * Servers and hooks are only physically removed when their `installedBy`
 * list becomes empty (see lib/commands/uninstall.js).
 *
 * See docs/decisions/0003-shared-resource-lifecycle-management.md
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import YAML from 'yaml';
import { MANIFEST_FILENAME } from './constants.js';

// --- Manifest sections ---

export const SECTIONS = ['bundles', 'servers', 'hooks'];

/**
 * @typedef {object} ManifestData
 * @property {Record<string, Record<string, any>>} bundles
 * @property {Record<string, Record<string, any>>} servers
 * @property {Record<string, Record<string, any>>} hooks
 */

/**
 * Returns a fresh, empty manifest with all sections present.
 * @returns {ManifestData}
 */
function emptyManifest() {
  return { bundles: {}, servers: {}, hooks: {} };
}

/**
 * Normalize a parsed manifest object, ensuring all sections exist.
 * @param {Record<string, any>|null|undefined} manifest
 * @returns {ManifestData}
 */
function normalizeManifest(manifest) {
  const base = emptyManifest();
  if (!manifest || typeof manifest !== 'object') return base;
  return {
    bundles: manifest.bundles && typeof manifest.bundles === 'object' ? manifest.bundles : {},
    servers: manifest.servers && typeof manifest.servers === 'object' ? manifest.servers : {},
    hooks: manifest.hooks && typeof manifest.hooks === 'object' ? manifest.hooks : {},
  };
}

// --- Pure data operations (no I/O) ---

/**
 * Resolves the manifest file path for a given repo root.
 * @param {string} repoRoot
 * @returns {string}
 */
export function manifestPath(repoRoot) {
  return join(repoRoot, MANIFEST_FILENAME);
}

/**
 * Parse manifest YAML content into a normalized { bundles, servers, hooks } object.
 * @param {string} content - Raw YAML string
 * @returns {ManifestData}
 */
export function parseManifest(content) {
  const parsed = YAML.parse(content);
  return normalizeManifest(parsed);
}

/**
 * Serialize a manifest object to YAML.
 * @param {ManifestData} data
 * @returns {string}
 */
export function serializeManifest(data) {
  return YAML.stringify(normalizeManifest(data));
}

/**
 * Get a single entry from a given section of a manifest object.
 * @param {ManifestData} manifest
 * @param {'bundles'|'servers'|'hooks'} section
 * @param {string} key
 * @returns {Record<string, any>|undefined}
 */
export function getSectionEntry(manifest, section, key) {
  const normalized = normalizeManifest(manifest);
  return normalized[section][key];
}

/**
 * Set (create or update) an entry in a section of a manifest object. Returns a new object.
 * @param {ManifestData} manifest
 * @param {'bundles'|'servers'|'hooks'} section
 * @param {string} key
 * @param {object} entry
 * @returns {ManifestData}
 */
export function setSectionEntry(manifest, section, key, entry) {
  const normalized = normalizeManifest(manifest);
  return {
    ...normalized,
    [section]: { ...normalized[section], [key]: entry },
  };
}

/**
 * Remove an entry from a section of a manifest object. Returns { manifest, removed }.
 * @param {ManifestData} manifest
 * @param {'bundles'|'servers'|'hooks'} section
 * @param {string} key
 * @returns {{ manifest: ManifestData, removed: boolean }}
 */
export function removeSectionEntry(manifest, section, key) {
  const normalized = normalizeManifest(manifest);
  if (!(key in normalized[section])) {
    return { manifest: normalized, removed: false };
  }
  const { [key]: _, ...rest } = normalized[section];
  return { manifest: { ...normalized, [section]: rest }, removed: true };
}

/**
 * Add a bundle name to a shared resource's `installedBy` list, if not
 * already present. Pure — used when installing a bundle that depends on a
 * server or hook resource.
 * @param {string[]|undefined} installedBy
 * @param {string} bundleName
 * @returns {string[]}
 */
export function addOwner(installedBy, bundleName) {
  const list = Array.isArray(installedBy) ? installedBy : [];
  return list.includes(bundleName) ? list : [...list, bundleName];
}

/**
 * Remove a bundle name from a shared resource's `installedBy` list.
 * Pure — used when uninstalling a bundle that depends on a server or hook
 * resource. An empty result means the resource has no remaining owners and
 * should be physically removed.
 * @param {string[]|undefined} installedBy
 * @param {string} bundleName
 * @returns {string[]}
 */
export function removeOwner(installedBy, bundleName) {
  const list = Array.isArray(installedBy) ? installedBy : [];
  return list.filter((name) => name !== bundleName);
}

// --- I/O operations ---

/**
 * Reads the manifest from disk. Returns a normalized empty manifest if the file doesn't exist.
 * @param {string} repoRoot
 * @returns {ManifestData}
 */
export function readManifest(repoRoot) {
  const filePath = manifestPath(repoRoot);
  if (!existsSync(filePath)) {
    return emptyManifest();
  }
  const content = readFileSync(filePath, 'utf8');
  return parseManifest(content);
}

/**
 * Writes the manifest to disk.
 * @param {string} repoRoot
 * @param {ManifestData} data
 */
export function writeManifest(repoRoot, data) {
  const filePath = manifestPath(repoRoot);
  const content = serializeManifest(data);
  writeFileSync(filePath, content, 'utf8');
}

/**
 * Gets a single entry from a section of the manifest on disk.
 * @param {string} repoRoot
 * @param {'bundles'|'servers'|'hooks'} section
 * @param {string} key - e.g. "engineering_kiro" or "git_kiro"
 * @returns {Record<string, any>|undefined}
 */
export function getEntry(repoRoot, section, key) {
  const manifest = readManifest(repoRoot);
  return getSectionEntry(manifest, section, key);
}

/**
 * Sets (creates or updates) a single entry in a section of the manifest on disk.
 * @param {string} repoRoot
 * @param {'bundles'|'servers'|'hooks'} section
 * @param {string} key
 * @param {object} entry
 */
export function setEntry(repoRoot, section, key, entry) {
  const manifest = readManifest(repoRoot);
  const updated = setSectionEntry(manifest, section, key, entry);
  writeManifest(repoRoot, updated);
}

/**
 * Removes a single entry from a section of the manifest on disk.
 * @param {string} repoRoot
 * @param {'bundles'|'servers'|'hooks'} section
 * @param {string} key
 * @returns {boolean} true if the entry existed and was removed
 */
export function removeEntry(repoRoot, section, key) {
  const manifest = readManifest(repoRoot);
  const { manifest: updated, removed } = removeSectionEntry(manifest, section, key);
  if (removed) {
    writeManifest(repoRoot, updated);
  }
  return removed;
}
