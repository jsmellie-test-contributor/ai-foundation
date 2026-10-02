// ------------------------------
// base.test.js
//
// Author: Starvoxel AI Agent - 2026-10-02
// Plan: AIF-010
//
// Copyright (c) StarVoxel. All rights reserved.
// ------------------------------

/**
 * Unit tests for base harness pure functions (stripSkillPrefix, resolvePreloadSkills).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  stripSkillPrefix,
  resolvePreloadSkills,
  UNSUPPORTED,
  UnknownToolError,
  isKnownToolName,
  isMcpToolRef,
  resolveTool,
  resolveTools,
  mapSingleTool,
} from '../../lib/harnesses/base.js';

// ── stripSkillPrefix ─────────────────────────────────────────────────────────

describe('unit: base/stripSkillPrefix', () => {
  it('strips a leading "skill/" prefix', () => {
    assert.equal(stripSkillPrefix('skill/code-review'), 'code-review');
  });

  it('passes through a ref with no prefix unchanged', () => {
    assert.equal(stripSkillPrefix('code-review'), 'code-review');
  });
});

// ── resolvePreloadSkills ─────────────────────────────────────────────────────

describe('unit: base/resolvePreloadSkills', () => {
  it('preloads nothing when preload_skills is absent', () => {
    const agent = { skills: ['skill/a', 'skill/b'] };
    assert.deepEqual(resolvePreloadSkills(agent), []);
  });

  it('preloads nothing when skills itself is absent', () => {
    assert.deepEqual(resolvePreloadSkills({}), []);
  });

  it('preloads everything in skills for the ["*"] sentinel', () => {
    const agent = { skills: ['skill/a', 'skill/b'], preload_skills: ['*'] };
    assert.deepEqual(resolvePreloadSkills(agent), ['skill/a', 'skill/b']);
  });

  it('preloads exactly the named subset otherwise', () => {
    const agent = { skills: ['skill/a', 'skill/b', 'skill/c'], preload_skills: ['skill/b'] };
    assert.deepEqual(resolvePreloadSkills(agent), ['skill/b']);
  });
});

// ── tool-mapping contract ────────────────────────────────────────────────────

describe('unit: base/tool resolver', () => {
  // Two synthetic groups share the member NOTIFY, as AIF-010 Q10 requires.
  const config = {
    toolMap: {
      read: ['Read'],
      code: UNSUPPORTED,
      group_a: ['A1', 'NOTIFY'],
      group_b: ['B1', 'NOTIFY'],
    },
    mapRef: (ref) => `native:${ref}`,
  };

  it('resolves a mapped name', () => {
    assert.deepEqual(resolveTool('read', config), { state: 'mapped', native: ['Read'] });
  });

  it('resolves an UNSUPPORTED name', () => {
    assert.deepEqual(resolveTool('code', config), { state: 'unsupported', native: [] });
  });

  it('passes a well-formed @server/tool reference through mapRef', () => {
    assert.deepEqual(resolveTool('@s/t', config), {
      state: 'passthrough',
      native: ['native:@s/t'],
    });
  });

  it('rejects bare unknown names, malformed references, and prototype keys', () => {
    for (const bad of ['typo', '@dag', '@/tool', '@dag/', 'constructor', '__proto__']) {
      assert.throws(() => resolveTool(bad, config), UnknownToolError, bad);
    }
  });

  it('deduplicates a tool shared by several groups', () => {
    assert.deepEqual(resolveTools(['group_a', 'group_b'], config).tools, ['A1', 'NOTIFY', 'B1']);
  });

  it('keeps a shared tool granted while either group is held', () => {
    assert.ok(resolveTools(['group_a'], config).tools.includes('NOTIFY'));
    assert.ok(resolveTools(['group_b'], config).tools.includes('NOTIFY'));
  });

  it('collects unsupported names as dropped, once each, excluded from tools', () => {
    assert.deepEqual(resolveTools(['read', 'code', 'code'], config), {
      tools: ['Read'],
      dropped: ['code'],
    });
  });

  it('mapSingleTool returns null for unsupported, never the generic name', () => {
    assert.equal(mapSingleTool('code', config), null);
    assert.equal(mapSingleTool('read', config), 'Read');
  });

  it('isKnownToolName accepts generic names and references, rejects bare typos', () => {
    assert.ok(isKnownToolName('read'));
    assert.ok(isKnownToolName('@dag/dag-validate'));
    assert.ok(!isKnownToolName('typo'));
    assert.ok(!isKnownToolName('@dag'));
    assert.ok(isMcpToolRef('@a/b'));
  });
});
