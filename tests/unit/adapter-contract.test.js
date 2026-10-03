// ------------------------------
// adapter-contract.test.js
//
// Author: Starvoxel AI Agent - 2026-10-02
// Plan: AIF-010
//
// Copyright (c) StarVoxel. All rights reserved.
// ------------------------------

/**
 * Shared tool-mapping contract, run against every harness adapter: each
 * adapter encodes "no native equivalent" with the one shared UNSUPPORTED
 * marker, covers every `TOOLS` name, resolves the three states
 * (mapped / unsupported / passthrough), rejects bare unknown names, dedupes,
 * and reports dropped tools. A new adapter is added to ADAPTERS below.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { TOOLS } from '../../lib/constants.js';
import { UNSUPPORTED } from '../../lib/harnesses/base.js';
import * as claude from '../../lib/harnesses/claude.js';
import * as kiro from '../../lib/harnesses/kiro.js';

const ADAPTERS = { claude, kiro };
const NAMES = Object.values(TOOLS);

for (const [harness, adapter] of Object.entries(ADAPTERS)) {
  describe(`contract: ${harness} adapter tool mapping`, () => {
    const { TOOL_MAP, mapToolName, transformAgent } = adapter;
    const baseAgent = { name: 'a', description: 'd', prompt: 'p', tools: [], approved_tools: [] };
    const unsupported = Object.keys(TOOL_MAP).filter((k) => TOOL_MAP[k] === UNSUPPORTED);
    const mapped = Object.keys(TOOL_MAP).filter((k) => TOOL_MAP[k] !== UNSUPPORTED);

    it('has an entry for every `TOOLS` name', () => {
      for (const name of NAMES) {
        assert.ok(Object.hasOwn(TOOL_MAP, name), `${harness} TOOL_MAP missing "${name}"`);
      }
    });

    it('encodes every entry as a non-empty string array or the shared UNSUPPORTED marker', () => {
      for (const [name, entry] of Object.entries(TOOL_MAP)) {
        if (entry === UNSUPPORTED) continue;
        assert.ok(Array.isArray(entry) && entry.length > 0, `"${name}" must be a non-empty array`);
        assert.ok(entry.every((n) => typeof n === 'string' && n.length > 0));
        assert.equal(new Set(entry).size, entry.length, `"${name}" has duplicate natives`);
      }
    });

    it('state mapped: every mapped name resolves to its first native name', () => {
      for (const name of mapped) assert.equal(mapToolName(name), TOOL_MAP[name][0]);
    });

    it('state unsupported: resolves to null, never the generic name, and is reported dropped', () => {
      for (const name of unsupported) {
        assert.equal(mapToolName(name), null);
        const dropped = [];
        transformAgent({ ...baseAgent, tools: ['read', name] }, dropped);
        assert.deepEqual(dropped, [name]);
      }
    });

    it('state passthrough: a well-formed @server/tool reference resolves', () => {
      const native = mapToolName('@some-server/some_tool');
      assert.equal(typeof native, 'string');
      assert.ok(native.includes('some_tool'));
    });

    it('rejects bare unknown names and malformed references', () => {
      for (const bad of ['no-such-tool', '@server', '@/tool', '@server/']) {
        assert.throws(() => mapToolName(bad), /unknown tool/, bad);
        assert.throws(() => transformAgent({ ...baseAgent, tools: [bad] }), /unknown tool/, bad);
      }
    });

    it('resolves every `TOOLS` name through the full agent path without throwing', () => {
      const dropped = [];
      const result = transformAgent({ ...baseAgent, tools: NAMES, approved_tools: NAMES }, dropped);
      assert.deepEqual(dropped.toSorted(), unsupported.toSorted());
      assert.ok(result);
    });

    it('lists a repeated name without reporting it dropped', () => {
      const dropped = [];
      transformAgent({ ...baseAgent, tools: ['read', 'read'], approved_tools: ['read'] }, dropped);
      assert.deepEqual(dropped, []);
    });
  });
}
