import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { parseSkillRef, parseServerToolRef, dedupe } from '../../lib/resolver.js';

describe('unit: resolver', () => {
  describe('parseSkillRef()', () => {
    it('extracts name from skill/ prefixed ref', () => {
      assert.equal(parseSkillRef('skill/plan-lifecycle'), 'plan-lifecycle');
    });

    it('extracts name from skill/ prefix with nested path', () => {
      assert.equal(parseSkillRef('skill/task-orchestration'), 'task-orchestration');
    });

    it('returns the string as-is when no skill/ prefix', () => {
      assert.equal(parseSkillRef('plan-lifecycle'), 'plan-lifecycle');
    });

    it('returns null for empty string', () => {
      assert.equal(parseSkillRef(''), null);
    });

    it('returns null for null/undefined', () => {
      assert.equal(parseSkillRef(null), null);
      assert.equal(parseSkillRef(undefined), null);
    });

    it('returns null for bare "skill/" with no name', () => {
      assert.equal(parseSkillRef('skill/'), null);
    });
  });

  describe('parseServerToolRef()', () => {
    it('extracts server name from @server/tool format', () => {
      assert.equal(parseServerToolRef('@git/git_status'), 'git');
    });

    it('extracts server name regardless of tool name', () => {
      assert.equal(parseServerToolRef('@npm/install'), 'npm');
    });

    it('handles server names with hyphens', () => {
      assert.equal(parseServerToolRef('@my-server/do_thing'), 'my-server');
    });

    it('returns null for plain tool names', () => {
      assert.equal(parseServerToolRef('file-read'), null);
    });

    it('returns null for empty string', () => {
      assert.equal(parseServerToolRef(''), null);
    });

    it('returns null for null/undefined', () => {
      assert.equal(parseServerToolRef(null), null);
      assert.equal(parseServerToolRef(undefined), null);
    });

    it('returns null when @ is not at start', () => {
      assert.equal(parseServerToolRef('foo@bar/baz'), null);
    });
  });

  describe('dedupe()', () => {
    it('removes duplicates preserving order', () => {
      assert.deepEqual(dedupe(['a', 'b', 'a', 'c', 'b']), ['a', 'b', 'c']);
    });

    it('returns empty array for empty input', () => {
      assert.deepEqual(dedupe([]), []);
    });

    it('returns same array when no duplicates', () => {
      assert.deepEqual(dedupe(['a', 'b', 'c']), ['a', 'b', 'c']);
    });
  });
});
