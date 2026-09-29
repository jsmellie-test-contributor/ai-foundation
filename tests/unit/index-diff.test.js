/**
 * Unit tests for the generic index-entry comparison shared by every
 * `aif index` target (lib/index-diff.js). Synthetic in-memory fixtures only.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { entriesEqual } from '../../lib/index-diff.js';

describe('entriesEqual', () => {
  it('treats decisions-shaped entries with reordered arrays as equal', () => {
    const a = { id: 'AIF-001', supersedes: ['AIF-000'], tags: ['x', 'y'] };
    const b = { id: 'AIF-001', supersedes: ['AIF-000'], tags: ['y', 'x'] };
    assert.equal(entriesEqual(a, b), true);
  });

  it('treats architecture-shaped entries with reordered arrays as equal', () => {
    const a = { path: '01.md', tags: ['x', 'y'], key_files: ['a.js', 'b.js'] };
    const b = { path: '01.md', tags: ['y', 'x'], key_files: ['b.js', 'a.js'] };
    assert.equal(entriesEqual(a, b), true);
  });

  it('detects a real difference in a non-array field', () => {
    const a = { path: '01.md', title: 'A' };
    const b = { path: '01.md', title: 'B' };
    assert.equal(entriesEqual(a, b), false);
  });

  it('detects a real difference in an array field beyond ordering', () => {
    const a = { id: 'AIF-001', tags: ['x', 'y'] };
    const b = { id: 'AIF-001', tags: ['x', 'z'] };
    assert.equal(entriesEqual(a, b), false);
  });
});
