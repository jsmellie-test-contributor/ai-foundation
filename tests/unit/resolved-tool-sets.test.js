// ------------------------------
// resolved-tool-sets.test.js
//
// Author: Starvoxel AI Agent - 2026-10-03
// Plan: AIF-010
//
// Copyright (c) StarVoxel. All rights reserved.
// ------------------------------

/**
 * Asserts the RESOLVED tool set, not just file validity, for each platform
 * tool group on each harness through the real adapters' `transformAgent` path:
 * the Claude cluster per group, the Kiro-unsupported result per group (dropped
 * and reported), the T0 baseline, and shared-member dedupe (plan Q10).
 *
 * The expected clusters below are deliberately literal and independent of
 * `TOOL_MAP`, so a change to a cluster fails here and must be made on purpose.
 * The cluster literals are intentionally duplicated in tests/unit/claude-adapter.test.js and
 * tests/validation/agent-tool-sets.test.js; a deliberate cluster change must edit all three.
 * Per-agent resolution lives in tests/validation/agent-tool-sets.test.js.
 */

import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { TOOLS } from '../../lib/constants.js';
import { resolveTools, UNSUPPORTED } from '../../lib/harnesses/base.js';
import * as claude from '../../lib/harnesses/claude.js';
import * as kiro from '../../lib/harnesses/kiro.js';
import { parseFrontmatter } from '../../lib/file-utils.js';

const CCR = (...names) => names.map((n) => `mcp__claude-code-remote__${n}`);

/** group name → expected Claude cluster (literal; tier T0-T5 in definition order, ADR 0007). */
const CLAUDE_GROUP_CLUSTERS = {
  // T0
  session_info: CCR('read_documentation', 'get_session'),
  // T1 (ReadNotifications is a core, non-MCP tool, plan Q10)
  pr_follow_through: [
    ...CCR('subscribe_pr_activity', 'unsubscribe_pr_activity', 'send_later'),
    'ReadNotifications',
  ],
  // T2
  repo_list: CCR('list_repos'),
  // T3
  session_control: CCR(
    'list_sessions',
    'list_events',
    'get_event',
    'create_session',
    'send_message',
    'interrupt_session',
    'set_session_title',
    'set_session_tags',
  ),
  // T4
  repo_scope: CCR('add_repo', 'register_repo_root'),
  // T5
  routines: CCR(
    'create_trigger',
    'update_trigger',
    'delete_trigger',
    'fire_trigger',
    'get_trigger',
    'list_triggers',
    'watch_url',
    'unwatch_url',
  ),
};
const GROUPS = Object.keys(CLAUDE_GROUP_CLUSTERS);

const GENERIC_NAMES = [
  'read',
  'write',
  'shell',
  'web_search',
  'web_fetch',
  'grep',
  'glob',
  'code',
  'subagent',
  'plan',
  'ask_user',
  'task',
  'skill',
];

const baseAgent = { name: 'a', description: 'd', prompt: 'p' };

/** Resolve through the real Claude adapter: frontmatter `tools` as a list, plus dropped names. */
function claudeResolve(tools, approved = []) {
  const dropped = [];
  const md = claude.transformAgent({ ...baseAgent, tools, approved_tools: approved }, dropped);
  const { frontmatter } = parseFrontmatter(md);
  const list = frontmatter.tools ? frontmatter.tools.split(', ') : [];
  return { tools: list, dropped };
}

/** Resolve through the real Kiro adapter. */
function kiroResolve(tools, approved = []) {
  const dropped = [];
  const out = kiro.transformAgent({ ...baseAgent, tools, approved_tools: approved }, dropped);
  return { tools: out.tools, allowedTools: out.allowedTools, dropped };
}

describe('resolved tool sets: platform-tool groups', () => {
  it('covers exactly the groups `TOOLS` defines beyond the 13 generic names', () => {
    const defined = Object.values(TOOLS).filter((n) => !GENERIC_NAMES.includes(n));
    assert.deepEqual(defined.toSorted(), GROUPS.toSorted());
  });

  describe('claude: each group resolves to its claude-code-remote cluster', () => {
    for (const group of GROUPS) {
      it(group, () => {
        const result = claudeResolve([group], [group]);
        assert.deepEqual(result.tools.toSorted(), CLAUDE_GROUP_CLUSTERS[group].toSorted());
        assert.deepEqual(result.dropped, []);
      });
    }

    it('grants a group all-or-nothing: no member appears without the group', () => {
      for (const group of GROUPS) {
        const others = GROUPS.filter((g) => g !== group);
        const { tools } = claudeResolve(['read', ...others]);
        for (const member of CLAUDE_GROUP_CLUSTERS[group]) {
          assert.ok(!tools.includes(member), `${member} leaked without "${group}"`);
        }
      }
    });

    it('resolves all groups together to the union of the clusters, nothing dropped', () => {
      const result = claudeResolve(GROUPS);
      assert.deepEqual(
        result.tools.toSorted(),
        Object.values(CLAUDE_GROUP_CLUSTERS).flat().toSorted(),
      );
      assert.deepEqual(result.dropped, []);
    });
  });

  describe('kiro: each group is unsupported, dropped and reported', () => {
    for (const group of GROUPS) {
      it(group, () => {
        assert.equal(kiro.TOOL_MAP[group], UNSUPPORTED);
        assert.equal(kiro.mapToolName(group), null);
        const result = kiroResolve(['read', group], [group]);
        assert.deepEqual(result.tools, ['read']);
        assert.deepEqual(result.allowedTools, []);
        assert.deepEqual(result.dropped, [group]);
      });
    }

    it('drops a foreign @claude-code-remote reference the same way', () => {
      const result = kiroResolve(['read', '@claude-code-remote/subscribe_pr_activity']);
      assert.deepEqual(result.tools, ['read']);
      assert.deepEqual(result.dropped, ['@claude-code-remote/subscribe_pr_activity']);
    });
  });

  describe('T0 baseline (session_info)', () => {
    it('claude: grants read_documentation and get_session, nothing dropped', () => {
      const result = claudeResolve(['session_info']);
      assert.deepEqual(result.tools, CCR('read_documentation', 'get_session'));
      assert.deepEqual(result.dropped, []);
    });

    it('kiro: dropped and reported, so the T0 baseline never fails an install', () => {
      const result = kiroResolve(['read', 'session_info'], ['session_info']);
      assert.deepEqual(result.tools, ['read']);
      assert.deepEqual(result.dropped, ['session_info']);
    });
  });
});

describe('resolved tool sets: shared-member dedupe (plan Q10)', () => {
  // No two real groups share a member today (ReadNotifications is held by
  // pr_follow_through only). Every case below that overlaps groups is
  // therefore SYNTHETIC: an injected mapping, not a real group.

  describe('synthetic mapping through the shared resolver', () => {
    const toolMap = {
      grp_a: ['only_a', 'shared'],
      grp_b: ['shared', 'only_b'],
      none: UNSUPPORTED,
    };
    const config = { toolMap, mapRef: (r) => r };

    it('grants a shared tool once when two groups are held', () => {
      const { tools } = resolveTools(['grp_a', 'grp_b'], config);
      assert.deepEqual(tools, ['only_a', 'shared', 'only_b']);
    });

    it('keeps the shared tool granted while either group is held alone', () => {
      assert.ok(resolveTools(['grp_a'], config).tools.includes('shared'));
      assert.ok(resolveTools(['grp_b'], config).tools.includes('shared'));
    });

    it('does not grant the shared tool when neither group is held', () => {
      assert.deepEqual(resolveTools(['none'], config).tools, []);
    });

    it('does not report the shared tool dropped', () => {
      assert.deepEqual(resolveTools(['grp_a', 'grp_b'], config).dropped, []);
    });
  });

  describe('synthetic group injected into each real adapter (ReadNotifications overlap)', () => {
    // `ReadNotifications` is the realistic overlap: pr_follow_through already
    // holds it, and the plan expects other wake groups may need it once
    // verified. The probe group is test-only and is removed after each case.
    const PROBE = '__probe_wake_group';

    afterEach(() => {
      delete claude.TOOL_MAP[PROBE];
      delete kiro.TOOL_MAP[PROBE];
    });

    it('claude: ReadNotifications granted once with pr_follow_through and the probe', () => {
      claude.TOOL_MAP[PROBE] = [...CCR('create_trigger'), 'ReadNotifications'];
      const { tools } = claudeResolve(['pr_follow_through', PROBE]);
      assert.equal(tools.filter((t) => t === 'ReadNotifications').length, 1);
      assert.deepEqual(
        tools.toSorted(),
        [...CLAUDE_GROUP_CLUSTERS.pr_follow_through, ...CCR('create_trigger')].toSorted(),
      );
    });

    it('claude: ReadNotifications stays granted while either group is held alone', () => {
      claude.TOOL_MAP[PROBE] = [...CCR('create_trigger'), 'ReadNotifications'];
      assert.ok(claudeResolve(['pr_follow_through']).tools.includes('ReadNotifications'));
      assert.ok(claudeResolve([PROBE]).tools.includes('ReadNotifications'));
    });

    it('claude: the same dedupe holds in mapAgentTools (used for approved_tools)', () => {
      claude.TOOL_MAP[PROBE] = ['ReadNotifications'];
      const resolved = claude.mapAgentTools(['pr_follow_through', PROBE]);
      assert.equal(resolved.filter((t) => t === 'ReadNotifications').length, 1);
    });

    it('kiro: a probe group unsupported there is dropped once, never granted', () => {
      kiro.TOOL_MAP[PROBE] = UNSUPPORTED;
      const result = kiroResolve(['read', 'pr_follow_through', PROBE], [PROBE]);
      assert.deepEqual(result.tools, ['read']);
      assert.deepEqual(result.dropped, ['pr_follow_through', PROBE]);
    });
  });
});
