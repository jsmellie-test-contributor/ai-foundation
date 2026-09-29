/**
 * MCP protocol layer integration tests for DAG server.
 * Tests tool listing and invocation via the MCP protocol using in-memory transport.
 *
 * Plan ID: engineering-manager-plan (Phase 1)
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { z } from 'zod';

import { dagValidate, dagComputeWaves } from '../../logic.js';

// ── Server factory (mirrors index.js registration without stdio) ─────────────

function createDagServer() {
  const server = new McpServer({
    name: 'dag',
    version: '0.2.0',
  });

  server.registerTool(
    'dag-validate',
    {
      description:
        'Validates that a tasks.json file forms a valid DAG (acyclic, no missing refs, correct schema).',
      inputSchema: {
        tasks_path: z.string().describe('Path to the tasks.json file'),
      },
    },
    async ({ tasks_path }) => {
      const result = dagValidate(tasks_path);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.registerTool(
    'dag-compute-waves',
    {
      description:
        'Computes execution waves from a tasks.json dependency graph via topological sort.',
      inputSchema: {
        tasks_path: z.string().describe('Path to the tasks.json file'),
      },
    },
    async ({ tasks_path }) => {
      const result = dagComputeWaves(tasks_path);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  return server;
}

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

// ── Helpers ──────────────────────────────────────────────────────────────────

function writeTempTasks(data) {
  const dir = join(
    tmpdir(),
    'dag-mcp-test-' + Date.now() + '-' + Math.random().toString(36).slice(2),
  );
  mkdirSync(dir, { recursive: true });
  const path = join(dir, 'tasks.json');
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8');
  return { path, dir };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('mcp: dag server protocol layer', () => {
  let client;
  let server;
  let tempDirs;

  beforeEach(async () => {
    tempDirs = [];
    server = createDagServer();
    client = new Client({ name: 'test-client', version: '1.0.0' });

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);
  });

  afterEach(async () => {
    await client.close();
    await server.close();
    for (const dir of tempDirs) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('lists both tools with correct names', async () => {
    const result = await client.listTools();
    const names = result.tools.map((t) => t.name).sort();
    assert.deepEqual(names, ['dag-compute-waves', 'dag-validate']);
  });

  it('tools have descriptions', async () => {
    const result = await client.listTools();
    for (const tool of result.tools) {
      assert.ok(tool.description, `Tool ${tool.name} should have a description`);
      assert.ok(tool.description.length > 10, `Tool ${tool.name} description too short`);
    }
  });

  it('tools have input schemas with tasks_path', async () => {
    const result = await client.listTools();
    for (const tool of result.tools) {
      assert.ok(tool.inputSchema, `Tool ${tool.name} should have inputSchema`);
      assert.ok(
        tool.inputSchema.properties?.tasks_path,
        `Tool ${tool.name} should require tasks_path`,
      );
    }
  });

  it('dag-validate returns valid result for good input', async () => {
    const { path, dir } = writeTempTasks(VALID_TASKS);
    tempDirs.push(dir);

    const result = await client.callTool({
      name: 'dag-validate',
      arguments: { tasks_path: path },
    });
    const parsed = JSON.parse(result.content[0].text);
    assert.equal(parsed.valid, true);
    assert.deepEqual(parsed.errors, []);
  });

  it('dag-validate returns errors for cyclic input', async () => {
    const { path, dir } = writeTempTasks(CYCLIC_TASKS);
    tempDirs.push(dir);

    const result = await client.callTool({
      name: 'dag-validate',
      arguments: { tasks_path: path },
    });
    const parsed = JSON.parse(result.content[0].text);
    assert.equal(parsed.valid, false);
    assert.ok(parsed.errors.some((e) => e.includes('Cycle')));
  });

  it('dag-compute-waves returns correct waves', async () => {
    const { path, dir } = writeTempTasks(VALID_TASKS);
    tempDirs.push(dir);

    const result = await client.callTool({
      name: 'dag-compute-waves',
      arguments: { tasks_path: path },
    });
    const parsed = JSON.parse(result.content[0].text);
    assert.equal(parsed.waves.length, 3);
    assert.deepEqual(parsed.waves[0], ['001', '002']);
    assert.deepEqual(parsed.waves[1], ['003']);
    assert.deepEqual(parsed.waves[2], ['004']);
    assert.equal(parsed.tasks.length, 4);
  });

  it('dag-compute-waves returns errors for invalid DAG', async () => {
    const { path, dir } = writeTempTasks(CYCLIC_TASKS);
    tempDirs.push(dir);

    const result = await client.callTool({
      name: 'dag-compute-waves',
      arguments: { tasks_path: path },
    });
    const parsed = JSON.parse(result.content[0].text);
    assert.deepEqual(parsed.waves, []);
    assert.ok(parsed.errors.length > 0);
  });

  it('dag-validate handles non-existent file gracefully', async () => {
    const result = await client.callTool({
      name: 'dag-validate',
      arguments: { tasks_path: '/tmp/does-not-exist-' + Date.now() + '.json' },
    });
    const parsed = JSON.parse(result.content[0].text);
    assert.equal(parsed.valid, false);
    assert.ok(parsed.errors.some((e) => e.includes('Failed to read file')));
  });
});
