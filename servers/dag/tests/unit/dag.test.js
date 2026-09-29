/**
 * Unit tests for DAG server pure logic.
 *
 * Plan ID: engineering-manager-plan (Phase 1)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { parseTasksFile, buildGraph, validate, computeWaves } from '../../logic.js';

// ── parseTasksFile ───────────────────────────────────────────────────────────

describe('unit: dag/parseTasksFile', () => {
  it('parses a valid tasks object', () => {
    const data = {
      feature_id: 'TEST-001',
      tasks: [
        { id: '001', title: 'Data layer', depends_on: [] },
        { id: '002', title: 'API routes', depends_on: ['001'] },
      ],
    };
    const { tasks, errors } = parseTasksFile(data);
    assert.equal(tasks.length, 2);
    assert.deepEqual(errors, []);
  });

  it('extracts task fields correctly', () => {
    const data = {
      tasks: [
        {
          id: '003',
          title: 'Integration',
          depends_on: ['001', '002'],
        },
      ],
    };
    const { tasks } = parseTasksFile(data);
    assert.equal(tasks[0].id, '003');
    assert.equal(tasks[0].title, 'Integration');
    assert.deepEqual(tasks[0].depends_on, ['001', '002']);
  });

  it('returns error for null input', () => {
    const { tasks, errors } = parseTasksFile(null);
    assert.equal(tasks.length, 0);
    assert.ok(errors[0].includes('not a valid JSON object'));
  });

  it('returns error for non-object input', () => {
    const { tasks, errors } = parseTasksFile('string');
    assert.equal(tasks.length, 0);
    assert.ok(errors[0].includes('not a valid JSON object'));
  });

  it('returns error when tasks array is missing', () => {
    const { tasks, errors } = parseTasksFile({ feature_id: 'TEST' });
    assert.equal(tasks.length, 0);
    assert.ok(errors[0].includes('Missing or invalid "tasks" array'));
  });

  it('returns error for task without id', () => {
    const data = { tasks: [{ title: 'No ID', depends_on: [] }] };
    const { errors } = parseTasksFile(data);
    assert.ok(errors.some((e) => e.includes('missing or invalid "id"')));
  });

  it('returns error for task without title', () => {
    const data = { tasks: [{ id: '001', depends_on: [] }] };
    const { errors } = parseTasksFile(data);
    assert.ok(errors.some((e) => e.includes('missing or invalid "title"')));
  });

  it('returns error when depends_on is not an array', () => {
    const data = { tasks: [{ id: '001', title: 'Test', depends_on: 'bad' }] };
    const { errors } = parseTasksFile(data);
    assert.ok(errors.some((e) => e.includes('"depends_on" must be an array')));
  });

  it('still collects valid tasks when some are invalid', () => {
    const data = {
      tasks: [
        { id: '001', title: 'Good', depends_on: [] },
        'not an object',
        { id: '002', title: 'Also good', depends_on: [] },
      ],
    };
    const { tasks, errors } = parseTasksFile(data);
    assert.equal(tasks.length, 2);
    assert.equal(errors.length, 1);
  });

  it('detects duplicate task IDs', () => {
    const data = {
      tasks: [
        { id: '001', title: 'First', depends_on: [] },
        { id: '001', title: 'Duplicate', depends_on: [] },
      ],
    };
    const { tasks, errors } = parseTasksFile(data);
    assert.equal(tasks.length, 1);
    assert.ok(errors.some((e) => e.includes('duplicate task id "001"')));
  });
});

// ── buildGraph ───────────────────────────────────────────────────────────────

describe('unit: dag/buildGraph', () => {
  it('creates nodes from task IDs', () => {
    const tasks = [
      { id: '001', depends_on: [] },
      { id: '002', depends_on: ['001'] },
    ];
    const graph = buildGraph(tasks);
    assert.equal(graph.nodes.size, 2);
    assert.ok(graph.nodes.has('001'));
    assert.ok(graph.nodes.has('002'));
  });

  it('creates edges from dependencies', () => {
    const tasks = [
      { id: '001', depends_on: [] },
      { id: '002', depends_on: ['001'] },
    ];
    const graph = buildGraph(tasks);
    assert.deepEqual(graph.edges.get('001'), []);
    assert.deepEqual(graph.edges.get('002'), ['001']);
  });
});

// ── validate ─────────────────────────────────────────────────────────────────

describe('unit: dag/validate', () => {
  it('returns valid for a simple DAG', () => {
    const graph = buildGraph([
      { id: '001', depends_on: [] },
      { id: '002', depends_on: ['001'] },
      { id: '003', depends_on: ['001', '002'] },
    ]);
    const result = validate(graph);
    assert.equal(result.valid, true);
    assert.deepEqual(result.errors, []);
  });

  it('returns valid for all-independent tasks', () => {
    const graph = buildGraph([
      { id: '001', depends_on: [] },
      { id: '002', depends_on: [] },
      { id: '003', depends_on: [] },
    ]);
    const result = validate(graph);
    assert.equal(result.valid, true);
  });

  it('detects missing dependency references', () => {
    const graph = buildGraph([
      { id: '001', depends_on: [] },
      { id: '002', depends_on: ['999'] },
    ]);
    const result = validate(graph);
    assert.equal(result.valid, false);
    assert.ok(result.errors[0].includes('999'));
    assert.ok(result.errors[0].includes('does not exist'));
  });

  it('detects a simple cycle (A→B→A)', () => {
    const graph = buildGraph([
      { id: '001', depends_on: ['002'] },
      { id: '002', depends_on: ['001'] },
    ]);
    const result = validate(graph);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('Cycle detected')));
  });

  it('detects a longer cycle (A→B→C→A)', () => {
    const graph = buildGraph([
      { id: '001', depends_on: ['003'] },
      { id: '002', depends_on: ['001'] },
      { id: '003', depends_on: ['002'] },
    ]);
    const result = validate(graph);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('Cycle detected')));
  });

  it('detects cycle even with valid nodes present', () => {
    const graph = buildGraph([
      { id: '001', depends_on: [] },
      { id: '002', depends_on: ['003'] },
      { id: '003', depends_on: ['002'] },
    ]);
    const result = validate(graph);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('002')));
    assert.ok(result.errors.some((e) => e.includes('003')));
  });

  it('reports both missing refs and cycles', () => {
    const graph = buildGraph([
      { id: '001', depends_on: ['999'] },
      { id: '002', depends_on: ['003'] },
      { id: '003', depends_on: ['002'] },
    ]);
    const result = validate(graph);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('999')));
    assert.ok(result.errors.some((e) => e.includes('Cycle')));
  });
});

// ── computeWaves ─────────────────────────────────────────────────────────────

describe('unit: dag/computeWaves', () => {
  it('puts all independent tasks in wave 1', () => {
    const graph = buildGraph([
      { id: '001', depends_on: [] },
      { id: '002', depends_on: [] },
      { id: '003', depends_on: [] },
    ]);
    const waves = computeWaves(graph);
    assert.equal(waves.length, 1);
    assert.deepEqual(waves[0], ['001', '002', '003']);
  });

  it('computes linear dependency chain as separate waves', () => {
    const graph = buildGraph([
      { id: '001', depends_on: [] },
      { id: '002', depends_on: ['001'] },
      { id: '003', depends_on: ['002'] },
    ]);
    const waves = computeWaves(graph);
    assert.equal(waves.length, 3);
    assert.deepEqual(waves[0], ['001']);
    assert.deepEqual(waves[1], ['002']);
    assert.deepEqual(waves[2], ['003']);
  });

  it('computes diamond dependency correctly', () => {
    const graph = buildGraph([
      { id: '001', depends_on: [] },
      { id: '002', depends_on: [] },
      { id: '003', depends_on: ['001', '002'] },
    ]);
    const waves = computeWaves(graph);
    assert.equal(waves.length, 2);
    assert.deepEqual(waves[0], ['001', '002']);
    assert.deepEqual(waves[1], ['003']);
  });

  it('handles complex multi-wave graph', () => {
    const graph = buildGraph([
      { id: '001', depends_on: [] },
      { id: '002', depends_on: [] },
      { id: '003', depends_on: ['001'] },
      { id: '004', depends_on: ['002'] },
      { id: '005', depends_on: ['003', '004'] },
    ]);
    const waves = computeWaves(graph);
    assert.equal(waves.length, 3);
    assert.deepEqual(waves[0], ['001', '002']);
    assert.deepEqual(waves[1], ['003', '004']);
    assert.deepEqual(waves[2], ['005']);
  });

  it('returns empty array for empty graph', () => {
    const graph = { nodes: new Set(), edges: new Map() };
    const waves = computeWaves(graph);
    assert.deepEqual(waves, []);
  });

  it('returns deterministic sorted order within waves', () => {
    const graph = buildGraph([
      { id: '003', depends_on: [] },
      { id: '001', depends_on: [] },
      { id: '002', depends_on: [] },
    ]);
    const waves = computeWaves(graph);
    assert.deepEqual(waves[0], ['001', '002', '003']);
  });

  it('handles a single-task graph', () => {
    const graph = buildGraph([{ id: '001', depends_on: [] }]);
    const waves = computeWaves(graph);
    assert.equal(waves.length, 1);
    assert.deepEqual(waves[0], ['001']);
  });
});
