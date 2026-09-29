/**
 * Integration test for the original bug this Decision Record fixes:
 * uninstalling one bundle must not break another installed bundle that
 * shares the same MCP server.
 *
 * See docs/decisions/0003-shared-resource-lifecycle-management.md
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdtempSync } from 'node:fs';

import { runInstall } from '../../lib/commands/install.js';
import { runUninstall } from '../../lib/commands/uninstall.js';
import { readManifest } from '../../lib/manifest.js';
import { TARGETS } from '../../lib/harnesses/kiro.js';
import { createTempRepo, destroyTempRepo } from '../helpers/fixture.js';

describe('integration: uninstall (shared MCP server across bundles)', () => {
  let repo;
  let originalTargets;

  beforeEach(() => {
    repo = createTempRepo({
      servers: ['git'],
      bundles: [
        { name: 'bundle-a', version: '1.0.0', description: 'Bundle A.', servers: ['git'] },
        { name: 'bundle-b', version: '1.0.0', description: 'Bundle B.', servers: ['git'] },
      ],
    });

    const tempKiro = mkdtempSync(join(tmpdir(), 'aif-kiro-target-'));
    originalTargets = { ...TARGETS };
    TARGETS.agents = join(tempKiro, 'agents');
    TARGETS.steering = join(tempKiro, 'steering');
    TARGETS.skills = join(tempKiro, 'skills');
    TARGETS.servers = join(tempKiro, 'servers');
    TARGETS.standards = join(tempKiro, 'standards');
    TARGETS.mcpSettings = join(tempKiro, 'settings', 'mcp.json');
  });

  afterEach(() => {
    Object.assign(TARGETS, originalTargets);
    destroyTempRepo(repo);
  });

  function quiet(fn) {
    const origLog = console.log;
    const origErr = console.error;
    console.log = () => {};
    console.error = () => {};
    try {
      return fn();
    } finally {
      console.log = origLog;
      console.error = origErr;
    }
  }

  function serverDir() {
    return join(TARGETS.servers, 'git');
  }

  function mcpRegistered() {
    if (!existsSync(TARGETS.mcpSettings)) return false;
    const settings = JSON.parse(readFileSync(TARGETS.mcpSettings, 'utf8'));
    return Boolean(settings.mcpServers && settings.mcpServers.git);
  }

  it('records both bundles as owners of the shared server after both install', () => {
    quiet(() =>
      runInstall({ args: { bundle: 'bundle-a', harness: 'kiro' }, positional: [] }, repo),
    );
    quiet(() =>
      runInstall({ args: { bundle: 'bundle-b', harness: 'kiro' }, positional: [] }, repo),
    );

    const manifest = readManifest(repo);
    const serverEntry = manifest.servers['git_kiro'];
    assert.ok(serverEntry);
    assert.deepEqual(serverEntry.installedBy.sort(), ['bundle-a', 'bundle-b']);
    assert.ok(existsSync(serverDir()));
    assert.ok(mcpRegistered());
  });

  it('keeps the server installed and registered when only one owner uninstalls', () => {
    quiet(() =>
      runInstall({ args: { bundle: 'bundle-a', harness: 'kiro' }, positional: [] }, repo),
    );
    quiet(() =>
      runInstall({ args: { bundle: 'bundle-b', harness: 'kiro' }, positional: [] }, repo),
    );

    quiet(() =>
      runUninstall({ args: { bundle: 'bundle-a', harness: 'kiro' }, positional: [] }, repo),
    );

    // Server survives — bundle-b still depends on it.
    assert.ok(existsSync(serverDir()));
    assert.ok(mcpRegistered());

    const manifest = readManifest(repo);
    assert.deepEqual(manifest.servers['git_kiro'].installedBy, ['bundle-b']);
    assert.equal(manifest.bundles['bundle-a_kiro'], undefined);
    assert.ok(manifest.bundles['bundle-b_kiro']);
  });

  it('removes the server and its MCP registration once the last owner uninstalls', () => {
    quiet(() =>
      runInstall({ args: { bundle: 'bundle-a', harness: 'kiro' }, positional: [] }, repo),
    );
    quiet(() =>
      runInstall({ args: { bundle: 'bundle-b', harness: 'kiro' }, positional: [] }, repo),
    );

    quiet(() =>
      runUninstall({ args: { bundle: 'bundle-a', harness: 'kiro' }, positional: [] }, repo),
    );
    quiet(() =>
      runUninstall({ args: { bundle: 'bundle-b', harness: 'kiro' }, positional: [] }, repo),
    );

    assert.ok(!existsSync(serverDir()));
    assert.ok(!mcpRegistered());

    const manifest = readManifest(repo);
    assert.equal(manifest.servers['git_kiro'], undefined);
  });

  it('is order-independent — uninstalling in either order yields the same end state', () => {
    quiet(() =>
      runInstall({ args: { bundle: 'bundle-a', harness: 'kiro' }, positional: [] }, repo),
    );
    quiet(() =>
      runInstall({ args: { bundle: 'bundle-b', harness: 'kiro' }, positional: [] }, repo),
    );

    quiet(() =>
      runUninstall({ args: { bundle: 'bundle-b', harness: 'kiro' }, positional: [] }, repo),
    );
    assert.ok(existsSync(serverDir()));

    quiet(() =>
      runUninstall({ args: { bundle: 'bundle-a', harness: 'kiro' }, positional: [] }, repo),
    );
    assert.ok(!existsSync(serverDir()));
  });
});
