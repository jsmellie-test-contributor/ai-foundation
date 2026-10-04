import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  parseSkillRef,
  parseServerToolRef,
  dedupe,
  parseRequiresSkills,
  computeSkillClosure,
} from '../../lib/resolver.js';

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

describe('unit: requires_skills', () => {
  const fm = (yaml) => `---\nname: x\n${yaml}\n---\nbody\n`;
  const depsFrom = (map) => (name) => map[name];

  describe('parseRequiresSkills()', () => {
    it('returns [] when the field or frontmatter is absent', () => {
      assert.deepEqual(parseRequiresSkills('# no frontmatter\n', 'f'), []);
      assert.deepEqual(parseRequiresSkills(fm('version: 1.0.0'), 'f'), []);
    });

    it('reads bare names and normalises a skill/ prefix', () => {
      const out = parseRequiresSkills(
        fm('requires_skills: [plan-lifecycle, skill/adr-authoring]'),
        'f',
      );
      assert.deepEqual(out, ['plan-lifecycle', 'adr-authoring']);
    });

    it('rejects path traversal and separators', () => {
      for (const bad of ['../x', 'a/b', 'skill/a/b', 'skill/../x', 'Upper', 'skill/']) {
        assert.throws(
          () => parseRequiresSkills(fm(`requires_skills: ["${bad}"]`), 'f.md'),
          /f\.md: invalid requires_skills entry/,
          bad,
        );
      }
    });

    it('rejects a non-list value', () => {
      assert.throws(
        () => parseRequiresSkills(fm('requires_skills: plan-lifecycle'), 'f.md'),
        /f\.md: requires_skills must be a list/,
      );
    });

    it('rejects a list holding non-strings', () => {
      assert.throws(
        () => parseRequiresSkills(fm('requires_skills: [a, 3]'), 'f.md'),
        /must be a list of skill names/,
      );
    });
  });

  describe('computeSkillClosure()', () => {
    it('returns seeds with transitive dependencies, deduplicated', () => {
      const deps = { a: ['b'], b: ['c'], c: [], d: ['c'] };
      assert.deepEqual(computeSkillClosure(['a', 'd'], depsFrom(deps)), ['a', 'b', 'c', 'd']);
    });

    it('returns [] for no seeds', () => {
      assert.deepEqual(computeSkillClosure([], depsFrom({})), []);
    });

    it('terminates on cycles without error and installs each once', () => {
      const deps = { a: ['b'], b: ['a'] };
      assert.deepEqual(computeSkillClosure(['a'], depsFrom(deps)).sort(), ['a', 'b']);
      assert.deepEqual(computeSkillClosure(['b'], depsFrom(deps)).sort(), ['a', 'b']);
    });

    it('handles a self-reference', () => {
      assert.deepEqual(computeSkillClosure(['a'], depsFrom({ a: ['a'] })), ['a']);
    });

    it('names the chain when a dependency is missing', () => {
      const deps = { 'feature-planning': ['plan-lifecycle'] };
      assert.throws(
        () => computeSkillClosure(['feature-planning'], depsFrom(deps)),
        /feature-planning → plan-lifecycle → \(missing\)/,
      );
    });

    it('names a missing seed', () => {
      assert.throws(() => computeSkillClosure(['ghost'], depsFrom({})), /ghost → \(missing\)/);
    });
  });
});
