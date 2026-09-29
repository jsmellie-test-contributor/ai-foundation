/**
 * Integration tests for DAG server I/O layer.
 * Tests dagValidate and dagComputeWaves against real filesystem operations.
 *
 * Plan ID: engineering-manager-plan (Phase 1)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { dagValidate, dagComputeWaves } from '../../logic.js';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const VALID_TASKS = {
  feature_id: 'TEST-001',
  tasks: [
    { id: '001', title: 'Data models', depends_on: [] },
    { id: '002', title: 'API service', depends_on: [] },
    { id: '003', title: 'Controller', depends_on: ['001', '002'] },
    { id: '004', title: 'Tests', depends_on: ['003'] },
  ],
};

const CYCLIC_TASKS = {
  feature_id: 'TEST-CYCLIC',
  tasks: [
    { id: '001', title: 'First', depends_on: ['002'] },
    { id: '002', title: 'Second', depends_on: ['001'] },
  ],
};

const MISSING_REF_TASKS = {
  feature_id: 'TEST-MISSING',
  tasks: [
    { id: '001', title: 'First', depends_on: [] },
    { id: '002', title: 'Second', depends_on: ['999'] },
  ],
};

const EMPTY_TASKS = {
  feature_id: 'TEST-EMPTY',
  tasks: [],
};

const INVALID_SCHEMA = {
  feature_id: 'TEST-BAD',
  tasks: [
    { id: '001', depends_on: [] },
    { title: 'No ID', depends_on: [] },
  ],
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function writeTempTasks(data, filename = 'tasks.json') {
  const dir = join(tmpdir(), 'dag-test-' + Date.now() + '-' + Math.random().toString(36).slice(2));
  mkdirSync(dir, { recursive: true });
  const path = join(dir, filename);
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8');
  return { path, dir };
}

// ── dag-validate ─────────────────────────────────────────────────────────────

describe('integration: dag/dag-validate', () => {
  it('validates a well-formed tasks file as valid', () => {
    const { path, dir } = writeTempTasks(VALID_TASKS);
    try {
      const result = dagValidate(path);
      assert.equal(result.valid, true);
      assert.deepEqual(result.errors, []);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('detects cycles in task dependencies', () => {
    const { path, dir } = writeTempTasks(CYCLIC_TASKS);
    try {
      const result = dagValidate(path);
      assert.equal(result.valid, false);
      assert.ok(result.errors.some((e) => e.includes('Cycle')));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('detects missing dependency references', () => {
    const { path, dir } = writeTempTasks(MISSING_REF_TASKS);
    try {
      const result = dagValidate(path);
      assert.equal(result.valid, false);
      assert.ok(result.errors.some((e) => e.includes('999')));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('returns invalid when tasks array is empty', () => {
    const { path, dir } = writeTempTasks(EMPTY_TASKS);
    try {
      const result = dagValidate(path);
      assert.equal(result.valid, false);
      assert.ok(result.errors[0].includes('No tasks defined'));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('returns schema errors for malformed tasks', () => {
    const { path, dir } = writeTempTasks(INVALID_SCHEMA);
    try {
      const result = dagValidate(path);
      assert.equal(result.valid, false);
      assert.ok(result.errors.some((e) => e.includes('title')));
      assert.ok(result.errors.some((e) => e.includes('"id"')));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('returns error for invalid JSON content', () => {
    const dir = join(
      tmpdir(),
      'dag-test-' + Date.now() + '-' + Math.random().toString(36).slice(2),
    );
    mkdirSync(dir, { recursive: true });
    const path = join(dir, 'bad.json');
    writeFileSync(path, 'not valid json {{{', 'utf-8');
    try {
      const result = dagValidate(path);
      assert.equal(result.valid, false);
      assert.ok(result.errors.some((e) => e.includes('Invalid JSON')));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('returns error for non-existent file', () => {
    const result = dagValidate('/tmp/does-not-exist-' + Date.now() + '.json');
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('Failed to read file')));
  });
});

// ── dag-compute-waves ────────────────────────────────────────────────────────

describe('integration: dag/dag-compute-waves', () => {
  it('computes correct waves for a valid tasks file', () => {
    const { path, dir } = writeTempTasks(VALID_TASKS);
    try {
      const result = dagComputeWaves(path);
      assert.equal(result.waves.length, 3);
      assert.deepEqual(result.waves[0], ['001', '002']);
      assert.deepEqual(result.waves[1], ['003']);
      assert.deepEqual(result.waves[2], ['004']);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('returns task metadata alongside waves', () => {
    const { path, dir } = writeTempTasks(VALID_TASKS);
    try {
      const result = dagComputeWaves(path);
      assert.equal(result.tasks.length, 4);
      assert.equal(result.tasks[0].id, '001');
      assert.equal(result.tasks[0].title, 'Data models');
      assert.deepEqual(result.tasks[2].depends_on, ['001', '002']);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('returns empty waves for an empty tasks file', () => {
    const { path, dir } = writeTempTasks(EMPTY_TASKS);
    try {
      const result = dagComputeWaves(path);
      assert.deepEqual(result.waves, []);
      assert.deepEqual(result.tasks, []);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('returns errors when DAG is invalid', () => {
    const { path, dir } = writeTempTasks(CYCLIC_TASKS);
    try {
      const result = dagComputeWaves(path);
      assert.deepEqual(result.waves, []);
      assert.ok(result.errors.length > 0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
