// ------------------------------
// agent-tool-sets.test.js
//
// Author: Starvoxel AI Agent - 2026-10-03
// Plan: AIF-010
//
// Copyright (c) StarVoxel. All rights reserved.
// ------------------------------

/**
 * Per-agent resolved tool sets. Resolves each CURRENT `agents/*.yaml`
 * `tools`/`approved_tools` through the real Claude and Kiro adapters and
 * asserts the native set, the allowlist, and the dropped-tool report.
 *
 * How to update when an agent's grant changes (e.g. AIF-010 Task 004):
 * edit that agent's entry in AGENT_GRANTS below, and nothing else. The
 * expected native sets are derived from AGENT_GRANTS through the literal
 * CLAUDE_NATIVE / KIRO_UNSUPPORTED tables, which are independent of the
 * adapters' `TOOL_MAP`. Changing an agent yaml without updating AGENT_GRANTS
 * fails the "grants match" test; adding an agent without an entry fails too.
 * The cluster literals are intentionally duplicated in tests/unit/claude-adapter.test.js and
 * tests/unit/resolved-tool-sets.test.js; a deliberate cluster change must edit all three.
 * Order is not a grant, so sets are compared sorted.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseYaml, getAgentFiles } from '../../lib/test-helpers.js';
import { parseFrontmatter } from '../../lib/file-utils.js';
import * as claude from '../../lib/harnesses/claude.js';
import * as kiro from '../../lib/harnesses/kiro.js';

const AGENTS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'agents');

/** Reviewed snapshot of each agent's source grants (generic names, groups, @server/tool refs). */
const AGENT_GRANTS = {
  architect: {
    tools: [
      'read',
      'write',
      'grep',
      'glob',
      'subagent',
      'plan',
      'ask_user',
      'task',
      'skill',
      'session_info',
    ],
    approved: ['read', 'grep', 'glob', 'plan', 'ask_user', 'task', 'skill', 'session_info'],
  },
  'engineering-manager': {
    tools: [
      'subagent',
      'plan',
      'ask_user',
      'task',
      'skill',
      'session_info',
      'pr_follow_through',
      'repo_list',
      'read',
      'write',
      'shell',
      'grep',
      'glob',
      '@dag/dag-validate',
      '@dag/dag-compute-waves',
      '@youtrack/search_issues',
      '@youtrack/get_issue',
      '@youtrack/get_issue_fields_schema',
      '@youtrack/update_issue',
    ],
    approved: [
      'subagent',
      'plan',
      'ask_user',
      'task',
      'skill',
      'session_info',
      'pr_follow_through',
      'repo_list',
      'read',
      'write',
      'shell',
      'grep',
      'glob',
      '@dag/dag-validate',
      '@dag/dag-compute-waves',
      '@youtrack/search_issues',
      '@youtrack/get_issue',
      '@youtrack/get_issue_fields_schema',
      '@youtrack/update_issue',
    ],
  },
  'engineering-researcher': {
    tools: [
      'read',
      'write',
      'grep',
      'glob',
      'web_search',
      'web_fetch',
      'task',
      'skill',
      'session_info',
    ],
    approved: [
      'read',
      'write',
      'grep',
      'glob',
      'web_search',
      'web_fetch',
      'task',
      'skill',
      'session_info',
    ],
  },
  'principal-engineer': {
    tools: ['read', 'grep', 'glob', 'code', 'shell', 'task', 'skill', 'session_info'],
    approved: ['read', 'grep', 'glob', 'code', 'shell', 'task', 'skill', 'session_info'],
  },
  'software-engineer': {
    tools: [
      'read',
      'write',
      'shell',
      'grep',
      'glob',
      'code',
      'subagent',
      'task',
      'skill',
      'session_info',
    ],
    approved: ['read', 'write', 'shell', 'grep', 'glob', 'code', 'task', 'skill', 'session_info'],
  },
};

const CCR = (...names) => names.map((n) => `mcp__claude-code-remote__${n}`);

/**
 * Independent expectation of how each name resolves on Claude. A name absent
 * from this table (and not `@server/tool`) is a test-authoring error.
 * `null` means no native equivalent (dropped and reported).
 */
const CLAUDE_NATIVE = {
  read: ['Read'],
  write: ['Write', 'Edit'],
  shell: ['Bash'],
  web_search: ['WebSearch'],
  web_fetch: ['WebFetch'],
  grep: ['Grep'],
  glob: ['Glob'],
  code: null,
  subagent: ['Agent', 'ListAgents', 'SendMessage'],
  plan: ['EnterPlanMode', 'ExitPlanMode'],
  ask_user: ['AskUserQuestion'],
  task: ['TaskCreate', 'TaskUpdate', 'TaskGet', 'TaskList', 'TaskStop'],
  skill: ['Skill'],
  session_info: CCR('read_documentation', 'get_session'),
  pr_follow_through: [
    ...CCR('subscribe_pr_activity', 'unsubscribe_pr_activity', 'send_later'),
    'ReadNotifications',
  ],
  repo_list: CCR('list_repos'),
  // Claude's `@server/tool` rewrite, for the references agents hold today.
  '@dag/dag-validate': ['mcp__dag__dag-validate'],
  '@dag/dag-compute-waves': ['mcp__dag__dag-compute-waves'],
  '@youtrack/search_issues': ['mcp__youtrack__search_issues'],
  '@youtrack/get_issue': ['mcp__youtrack__get_issue'],
  '@youtrack/get_issue_fields_schema': ['mcp__youtrack__get_issue_fields_schema'],
  '@youtrack/update_issue': ['mcp__youtrack__update_issue'],
};

/** Names Kiro has no equivalent for; everything else resolves to itself. */
const KIRO_UNSUPPORTED = new Set([
  'plan',
  'ask_user',
  'task',
  'skill',
  'session_info',
  'pr_follow_through',
  'repo_list',
  'session_control',
  'repo_scope',
  'routines',
]);

/** Platform-server references Kiro cannot hold: dropped, never passed through (plan Q6). */
const isKiroForeign = (n) => n.startsWith('@claude-code-remote/');

const sorted = (xs) => [...xs].toSorted();
const unique = (xs) => [...new Set(xs)];

/** Expected Claude native set and dropped names for a list of source names. */
function expectClaude(names) {
  const native = [];
  const dropped = [];
  for (const name of names) {
    assert.ok(
      Object.hasOwn(CLAUDE_NATIVE, name),
      `test table has no Claude expectation for "${name}"`,
    );
    if (CLAUDE_NATIVE[name] === null) dropped.push(name);
    else native.push(...CLAUDE_NATIVE[name]);
  }
  return { native: sorted(unique(native)), dropped: sorted(unique(dropped)) };
}

/** Expected Kiro native set and dropped names for a list of source names. */
function expectKiro(names) {
  const isDropped = (n) => KIRO_UNSUPPORTED.has(n) || isKiroForeign(n);
  const native = names.filter((n) => !isDropped(n));
  const dropped = names.filter(isDropped);
  return { native: sorted(unique(native)), dropped: sorted(unique(dropped)) };
}

const agentFiles = getAgentFiles(AGENTS_DIR);

describe('per-agent resolved tool sets', () => {
  it('has a reviewed grant snapshot for every agent, and none for a missing one', () => {
    const names = agentFiles.map((f) => f.replace(/\.yaml$/, ''));
    assert.deepEqual(
      sorted(Object.keys(AGENT_GRANTS)),
      sorted(names),
      'AGENT_GRANTS must list exactly the agents in agents/',
    );
  });

  for (const file of agentFiles) {
    const name = file.replace(/\.yaml$/, '');
    const grants = AGENT_GRANTS[name];

    describe(name, () => {
      if (!grants) {
        it('has a grant snapshot', () => assert.fail(`add "${name}" to AGENT_GRANTS`));
        return;
      }
      const agent = parseYaml(join(AGENTS_DIR, file));

      it('grants match the reviewed snapshot (update AGENT_GRANTS if this change is intended)', () => {
        assert.deepEqual(sorted(agent.tools ?? []), sorted(grants.tools), 'tools changed');
        assert.deepEqual(
          sorted(agent.approved_tools ?? []),
          sorted(grants.approved),
          'approved_tools changed',
        );
      });

      it('claude: resolved tool set and dropped report', () => {
        const dropped = [];
        const md = claude.transformAgent(agent, dropped);
        const { frontmatter } = parseFrontmatter(md);
        const resolved = frontmatter.tools ? frontmatter.tools.split(', ') : [];
        const expected = expectClaude(grants.tools);
        assert.deepEqual(sorted(resolved), expected.native);
        assert.deepEqual(
          sorted(dropped),
          sorted(unique([...expected.dropped, ...expectClaude(grants.approved).dropped])),
        );
      });

      it('claude: approved_tools resolve to a subset of the granted native set', () => {
        const granted = new Set(claude.mapAgentTools(agent.tools ?? []));
        const approved = claude.mapAgentTools(agent.approved_tools ?? []);
        assert.deepEqual(sorted(approved), expectClaude(grants.approved).native);
        for (const t of approved) assert.ok(granted.has(t), `${t} approved but not granted`);
      });

      it('kiro: resolved tools, allowedTools and dropped report', () => {
        const dropped = [];
        const out = kiro.transformAgent(agent, dropped);
        assert.deepEqual(sorted(out.tools), expectKiro(grants.tools).native);
        assert.deepEqual(sorted(out.allowedTools), expectKiro(grants.approved).native);
        assert.deepEqual(
          sorted(dropped),
          sorted(
            unique([...expectKiro(grants.tools).dropped, ...expectKiro(grants.approved).dropped]),
          ),
        );
      });
    });
  }
});
