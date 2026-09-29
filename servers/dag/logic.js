/**
 * DAG MCP server — validates and computes execution waves from Feature task
 * dependency graphs stored as tasks.json files.
 *
 * Plan ID: engineering-manager-plan (Phase 1)
 */

import { readFileSync } from 'node:fs';

// ── Pure Logic ───────────────────────────────────────────────────────────────

/**
 * Parse and validate the structure of a tasks.json object.
 * Expected format:
 * {
 *   "feature_id": "PROJECT-001",
 *   "tasks": [
 *     { "id": "001", "title": "Data layer", "depends_on": [] },
 *     ...
 *   ]
 * }
 *
 * @param {Record<string, any>|null|undefined} data - Parsed JSON content
 * @returns {{ tasks: Array<{ id: string, title: string, depends_on: string[] }>, errors: string[] }}
 */
export function parseTasksFile(data) {
  const errors = [];

  if (!data || typeof data !== 'object') {
    return { tasks: [], errors: ['File content is not a valid JSON object'] };
  }

  if (!Array.isArray(data.tasks)) {
    return { tasks: [], errors: ['Missing or invalid "tasks" array'] };
  }

  const tasks = [];
  const seenIds = new Set();

  for (let i = 0; i < data.tasks.length; i++) {
    const task = data.tasks[i];
    const prefix = `tasks[${i}]`;

    if (!task || typeof task !== 'object') {
      errors.push(`${prefix}: not an object`);
      continue;
    }
    if (typeof task.id !== 'string' || !task.id) {
      errors.push(`${prefix}: missing or invalid "id"`);
      continue;
    }
    if (seenIds.has(task.id)) {
      errors.push(`${prefix}: duplicate task id "${task.id}"`);
      continue;
    }
    seenIds.add(task.id);
    if (typeof task.title !== 'string' || !task.title) {
      errors.push(`${prefix} (${task.id}): missing or invalid "title"`);
    }
    if (!Array.isArray(task.depends_on)) {
      errors.push(`${prefix} (${task.id}): "depends_on" must be an array`);
    }

    tasks.push({
      id: task.id,
      title: task.title || '',
      depends_on: Array.isArray(task.depends_on) ? task.depends_on : [],
    });
  }

  return { tasks, errors };
}

/**
 * Build an adjacency list from parsed tasks.
 * @param {Array<{ id: string, depends_on: string[] }>} tasks
 * @returns {{ nodes: Set<string>, edges: Map<string, string[]> }}
 */
export function buildGraph(tasks) {
  const nodes = new Set(tasks.map((t) => t.id));
  const edges = new Map();

  for (const task of tasks) {
    edges.set(task.id, task.depends_on);
  }

  return { nodes, edges };
}

/**
 * Validate that a graph is a valid DAG.
 * Checks: no cycles, no references to non-existent tasks.
 *
 * @param {{ nodes: Set<string>, edges: Map<string, string[]> }} graph
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validate(graph) {
  const { nodes, edges } = graph;
  const errors = [];

  // Check for missing references
  for (const [node, deps] of edges) {
    for (const dep of deps) {
      if (!nodes.has(dep)) {
        errors.push(`Task "${node}" depends on "${dep}" which does not exist`);
      }
    }
  }

  // Cycle detection via Kahn's algorithm
  const inDegree = new Map();
  for (const node of nodes) {
    inDegree.set(node, 0);
  }

  // Rebuild as forward adjacency: dep -> [nodes that depend on it]
  const forward = new Map();
  for (const node of nodes) {
    forward.set(node, []);
  }
  for (const [node, deps] of edges) {
    for (const dep of deps) {
      if (nodes.has(dep)) {
        forward.get(dep).push(node);
      }
    }
    inDegree.set(node, deps.filter((d) => nodes.has(d)).length);
  }

  const queue = [];
  for (const [node, degree] of inDegree) {
    if (degree === 0) queue.push(node);
  }

  let visited = 0;
  while (queue.length > 0) {
    const current = queue.shift();
    visited++;
    for (const neighbor of forward.get(current) || []) {
      const newDegree = inDegree.get(neighbor) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) queue.push(neighbor);
    }
  }

  if (visited < nodes.size) {
    const cycleNodes = [...nodes].filter((n) => inDegree.get(n) > 0);
    errors.push(`Cycle detected involving tasks: ${cycleNodes.join(', ')}`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Compute execution waves via topological sort grouped by depth.
 * Each wave contains tasks whose dependencies are all in earlier waves.
 *
 * @param {{ nodes: Set<string>, edges: Map<string, string[]> }} graph
 * @returns {string[][]} Array of waves, each wave is an array of task IDs
 */
export function computeWaves(graph) {
  const { nodes, edges } = graph;

  // Build forward adjacency and in-degree
  const forward = new Map();
  const inDegree = new Map();
  for (const node of nodes) {
    forward.set(node, []);
    inDegree.set(node, 0);
  }
  for (const [node, deps] of edges) {
    for (const dep of deps) {
      if (nodes.has(dep)) {
        forward.get(dep).push(node);
      }
    }
    inDegree.set(node, deps.filter((d) => nodes.has(d)).length);
  }

  const waves = [];
  const remaining = new Set(nodes);

  while (remaining.size > 0) {
    // Current wave: all nodes with in-degree 0 among remaining
    const wave = [];
    for (const node of remaining) {
      if (inDegree.get(node) === 0) {
        wave.push(node);
      }
    }

    if (wave.length === 0) {
      // Cycle — shouldn't reach here if validate() was called first
      break;
    }

    waves.push(wave.sort()); // Sort for deterministic output

    // Remove wave nodes and update in-degrees
    for (const node of wave) {
      remaining.delete(node);
      for (const neighbor of forward.get(node) || []) {
        inDegree.set(neighbor, inDegree.get(neighbor) - 1);
      }
    }
  }

  return waves;
}

// ── I/O Layer ────────────────────────────────────────────────────────────────

/**
 * Read and parse a tasks.json file.
 * @param {string} tasksPath - Path to tasks.json
 * @returns {{ tasks: Array<{ id: string, title: string, depends_on: string[] }>, errors: string[] }}
 */
export function readTasksFile(tasksPath) {
  let content;
  try {
    content = readFileSync(tasksPath, 'utf-8');
  } catch (err) {
    return { tasks: [], errors: [`Failed to read file: ${err.message}`] };
  }
  let data;
  try {
    data = JSON.parse(content);
  } catch (err) {
    return { tasks: [], errors: [`Invalid JSON: ${err.message}`] };
  }
  return parseTasksFile(data);
}

/**
 * Tool: dag-validate — validates a tasks.json dependency graph.
 * @param {string} tasksPath - Path to tasks.json
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function dagValidate(tasksPath) {
  const { tasks, errors: parseErrors } = readTasksFile(tasksPath);
  if (parseErrors.length > 0) {
    return { valid: false, errors: parseErrors };
  }
  if (tasks.length === 0) {
    return { valid: false, errors: ['No tasks defined in file'] };
  }
  const graph = buildGraph(tasks);
  return validate(graph);
}

/**
 * Tool: dag-compute-waves — computes execution waves from a tasks.json file.
 * @param {string} tasksPath - Path to tasks.json
 * @returns {{ waves: string[][], tasks: Array<{ id: string, title: string, depends_on: string[] }>, errors?: string[] }}
 */
export function dagComputeWaves(tasksPath) {
  const { tasks, errors: parseErrors } = readTasksFile(tasksPath);
  if (parseErrors.length > 0) {
    return { waves: [], tasks: [], errors: parseErrors };
  }
  if (tasks.length === 0) {
    return { waves: [], tasks: [] };
  }
  const graph = buildGraph(tasks);
  const validation = validate(graph);
  if (!validation.valid) {
    return { waves: [], tasks, errors: validation.errors };
  }
  const waves = computeWaves(graph);
  return {
    waves,
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      depends_on: t.depends_on,
    })),
  };
}
