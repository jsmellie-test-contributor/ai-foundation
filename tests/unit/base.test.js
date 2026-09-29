/**
 * Unit tests for base harness pure functions (stripSkillPrefix, resolvePreloadSkills).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { stripSkillPrefix, resolvePreloadSkills } from '../../lib/harnesses/base.js';

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
