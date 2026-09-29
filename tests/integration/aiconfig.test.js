/**
 * Integration tests for lib/aiconfig.js — the I/O layer around
 * .aiconfig.json (reading the file off disk, resolving a project root by
 * walking up the directory tree). Filesystem tests belong here rather than
 * tests/unit/ per AGENTS.md's Testing section ("tests/unit -- Fast, no
 * I/O" vs "tests/integration -- Filesystem tests"). The pure "config
 * value, else default" merge logic these build on is tested separately,
 * without any filesystem access, in tests/unit/aiconfig.test.js.
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  loadAiConfig,
  getConfigValue,
  getConfigPath,
  findProjectRoot,
} from '../../lib/aiconfig.js';

describe('integration: aiconfig', () => {
  let projectRoot;

  beforeEach(() => {
    projectRoot = mkdtempSync(join(tmpdir(), 'aiconfig-test-'));
  });

  afterEach(() => {
    rmSync(projectRoot, { recursive: true, force: true });
  });

  describe('loadAiConfig()', () => {
    it('returns {} when .aiconfig.json is absent', () => {
      assert.deepEqual(loadAiConfig(projectRoot), {});
    });

    it('parses an existing .aiconfig.json', () => {
      writeFileSync(join(projectRoot, '.aiconfig.json'), JSON.stringify({ project_name: 'x' }));
      assert.deepEqual(loadAiConfig(projectRoot), { project_name: 'x' });
    });

    it('throws a descriptive error for invalid JSON', () => {
      writeFileSync(join(projectRoot, '.aiconfig.json'), '{ not json');
      assert.throws(() => loadAiConfig(projectRoot), /not valid JSON/);
    });
  });

  describe('getConfigValue()', () => {
    it('loads .aiconfig.json and resolves a configured field', () => {
      writeFileSync(
        join(projectRoot, '.aiconfig.json'),
        JSON.stringify({ paths: { features: 'custom/features' } }),
      );
      assert.equal(getConfigValue(projectRoot, 'paths.features'), 'custom/features');
    });

    it('falls back to the default when .aiconfig.json is absent', () => {
      assert.equal(getConfigValue(projectRoot, 'paths.features'), 'plans/features');
    });
  });

  describe('getConfigPath()', () => {
    it('joins the resolved value onto projectRoot', () => {
      assert.equal(getConfigPath(projectRoot, 'paths.knowledge'), join(projectRoot, 'knowledge'));
    });

    it('reflects a configured override', () => {
      writeFileSync(
        join(projectRoot, '.aiconfig.json'),
        JSON.stringify({ paths: { decisions: 'archive/decisions' } }),
      );
      assert.equal(
        getConfigPath(projectRoot, 'paths.decisions'),
        join(projectRoot, 'archive/decisions'),
      );
    });
  });

  describe('findProjectRoot()', () => {
    it('returns the start directory when it directly contains .aiconfig.json', () => {
      writeFileSync(join(projectRoot, '.aiconfig.json'), '{}');
      assert.equal(findProjectRoot(projectRoot), projectRoot);
    });

    it('walks up parent directories to find .aiconfig.json', () => {
      writeFileSync(join(projectRoot, '.aiconfig.json'), '{}');
      const nested = join(projectRoot, 'a', 'b', 'c');
      mkdirSync(nested, { recursive: true });
      assert.equal(findProjectRoot(nested), projectRoot);
    });

    it('returns null when no ancestor has .aiconfig.json', () => {
      const nested = join(projectRoot, 'a', 'b');
      mkdirSync(nested, { recursive: true });
      assert.equal(findProjectRoot(nested), null);
    });
  });
});
