/**
 * snapshot command — computes source hashes for bundles, servers, and hook
 * resources, writing them alongside their sources. Used by `aif status` /
 * `aif install --update` to detect source freshness without runtime file reads.
 *
 * Bundle snapshots (bundles/{name}/snapshot.json) cover bundle-owned sources
 * only: agents, steering, skills. Servers and hooks are shared, independently
 * lived resources — each gets its own snapshot (servers/{name}/snapshot.json,
 * lib/harnesses/assets/{name}/snapshot.json) so a source change to a shared
 * resource doesn't appear to invalidate every bundle that happens to
 * reference it.
 *
 * Pure decision logic (staleness comparison, arg parsing) lives in
 * lib/snapshot/pure.js. Filesystem reads/writes/hashing live in
 * lib/snapshot/io.js. This file is the CLI orchestrator.
 *
 * See docs/decisions/0003-shared-resource-lifecycle-management.md
 *
 * Modes:
 *   aif snapshot                       — regenerate only stale snapshots (bundles + servers + hooks)
 *   aif snapshot --bundle <name>       — regenerate a specific bundle's snapshot
 *   aif snapshot --bundle              — regenerate every bundle's snapshot (bare flag = wildcard)
 *   aif snapshot --server <name>       — regenerate a specific server's snapshot
 *   aif snapshot --hook <name>         — regenerate a specific hook resource's snapshot
 *   aif snapshot --check               — verify snapshots are current, exit 1 if stale
 *
 * Kind flags (--bundle/--server/--hook) can combine in one call (e.g.
 * `--bundle engineering --server git`); repeating the same flag does not
 * accumulate (`bin/aif.js`'s parser keeps only the last value per key).
 */

import { diffSnapshot, resolveExplicitTargets } from '../snapshot/pure.js';
import { RESOURCE_KINDS } from '../snapshot/io.js';

// Re-exported for existing callers (lib/commands/install.js, lib/commands/status.js)
// and for direct use by other commands that only ever deal with bundle snapshots.
export {
  readSnapshot,
  buildSnapshot,
  readServerSnapshot,
  readHookSnapshot,
} from '../snapshot/io.js';
export { diffSnapshot };

const KIND_NAMES = Object.keys(RESOURCE_KINDS);

/**
 * Run the snapshot command.
 * @param {{ args: Record<string, string|boolean>, positional: string[] }} parsed
 * @param {string} repoRoot
 * @returns {number} exit code
 */
export function runSnapshot(parsed, repoRoot) {
  const checkMode = Boolean(parsed.args.check);

  const parsedTargets = resolveExplicitTargets(parsed.args, KIND_NAMES);
  if ('error' in parsedTargets) {
    console.error(parsedTargets.error);
    return 1;
  }

  // No kind flags at all — wildcard every kind, same as passing every
  // `--{kind}` bare would.
  const requested =
    parsedTargets.targets.length > 0
      ? parsedTargets.targets
      : KIND_NAMES.map((kind) => ({ kind, name: null }));

  const targets = expandTargets(requested, repoRoot);

  if (targets.length === 0) {
    console.log('Nothing to snapshot.');
    return 0;
  }

  return checkMode ? runCheck(targets, repoRoot) : runGenerate(targets, repoRoot);
}

/**
 * Expand wildcard targets (`name: null`, from a bare `--{kind}` flag) into
 * one target per resource of that kind, via the kind's own `list()`.
 * Targets with an explicit name pass through unchanged.
 * @param {Array<{ kind: string, name: string|null }>} targets
 * @param {string} repoRoot
 * @returns {Array<{ kind: string, name: string }>}
 */
function expandTargets(targets, repoRoot) {
  const expanded = [];
  for (const { kind, name } of targets) {
    if (name === null) {
      for (const resolvedName of RESOURCE_KINDS[kind].list(repoRoot)) {
        expanded.push({ kind, name: resolvedName });
      }
    } else {
      expanded.push({ kind, name });
    }
  }
  return expanded;
}

/**
 * Check mode — verify snapshots are current without writing.
 * @param {Array<{ kind: string, name: string }>} targets
 * @param {string} repoRoot
 * @returns {number} exit code (0 = all current, 1 = stale)
 */
function runCheck(targets, repoRoot) {
  let anyStale = false;

  for (const { kind, name } of targets) {
    const config = RESOURCE_KINDS[kind];
    let computed;
    try {
      computed = config.build(name, repoRoot);
    } catch (err) {
      console.error(`  ✗ ${config.label} ${name}: ${err.message}`);
      anyStale = true;
      continue;
    }

    const existing = config.read(name, repoRoot);
    const diff = diffSnapshot(computed, existing);

    if (diff.stale) {
      anyStale = true;
      const parts = [];
      if (diff.added.length > 0) parts.push(`${diff.added.length} added`);
      if (diff.changed.length > 0) parts.push(`${diff.changed.length} changed`);
      if (diff.removed.length > 0) parts.push(`${diff.removed.length} removed`);
      console.log(`  ⚠ ${config.label} ${name}: stale (${parts.join(', ')})`);
    } else {
      console.log(`  ✓ ${config.label} ${name}: up to date`);
    }
  }

  return anyStale ? 1 : 0;
}

/**
 * Generate mode — recompute and write only stale snapshots.
 * @param {Array<{ kind: string, name: string }>} targets
 * @param {string} repoRoot
 * @returns {number} exit code
 */
function runGenerate(targets, repoRoot) {
  let updated = 0;
  let current = 0;

  for (const { kind, name } of targets) {
    const config = RESOURCE_KINDS[kind];
    let computed;
    try {
      computed = config.build(name, repoRoot);
    } catch (err) {
      console.error(`  ✗ ${config.label} ${name}: ${err.message}`);
      continue;
    }

    const existing = config.read(name, repoRoot);
    const diff = diffSnapshot(computed, existing);

    if (diff.stale) {
      config.write(name, computed, repoRoot);
      const count = Object.keys(computed.sources).length;
      console.log(`  ✓ ${config.label} ${name}: snapshot updated (${count} sources)`);
      updated++;
    } else {
      console.log(`  ✓ ${config.label} ${name}: already current`);
      current++;
    }
  }

  if (updated > 0) {
    console.log(
      `\n${updated} snapshot(s) updated${current > 0 ? `, ${current} already current` : ''}.`,
    );
  } else {
    console.log('\nAll snapshots up to date.');
  }

  return 0;
}
