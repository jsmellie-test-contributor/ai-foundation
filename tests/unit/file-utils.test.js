/**
 * Unit tests for lib/file-utils.js's pure functions (parseFrontmatter, hashContent).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { parseFrontmatter, hashContent, nonFencedLines } from '../../lib/file-utils.js';

// ── parseFrontmatter ─────────────────────────────────────────────────────────

describe('unit: file-utils/parseFrontmatter', () => {
  it('parses simple key-value frontmatter', () => {
    const { frontmatter, body } = parseFrontmatter('---\nname: "test"\n---\nBody.\n');
    assert.equal(frontmatter.name, 'test');
    assert.equal(body, 'Body.\n');
  });

  it('parses frontmatter with arrays', () => {
    const content = '---\ntags: ["api", "rest"]\n---\nContent.\n';
    const { frontmatter } = parseFrontmatter(content);
    assert.deepEqual(frontmatter.tags, ['api', 'rest']);
  });

  it('parses frontmatter with multi-line arrays', () => {
    const content = '---\ntags:\n  - api\n  - rest\n---\nContent.\n';
    const { frontmatter } = parseFrontmatter(content);
    assert.deepEqual(frontmatter.tags, ['api', 'rest']);
  });

  it('returns null frontmatter when no delimiters present', () => {
    const content = '# No frontmatter\nJust text.';
    const { frontmatter, body } = parseFrontmatter(content);
    assert.equal(frontmatter, null);
    assert.equal(body, content);
  });

  it('returns null frontmatter for empty string', () => {
    const { frontmatter, body } = parseFrontmatter('');
    assert.equal(frontmatter, null);
    assert.equal(body, '');
  });

  it('handles empty frontmatter block', () => {
    const content = '---\n\n---\nBody here.\n';
    const { frontmatter, body } = parseFrontmatter(content);
    // Empty YAML parses as null
    assert.equal(frontmatter, null);
    assert.equal(body, 'Body here.\n');
  });

  it('handles CRLF line endings', () => {
    const content = '---\r\nname: "test"\r\n---\r\nBody.\r\n';
    const { frontmatter, body } = parseFrontmatter(content);
    assert.equal(frontmatter.name, 'test');
    assert.ok(body.includes('Body.'));
  });

  it('preserves body content exactly (no trimming)', () => {
    const content = '---\nname: "x"\n---\n\n  indented\n\nspaced\n';
    const { body } = parseFrontmatter(content);
    assert.equal(body, '\n  indented\n\nspaced\n');
  });

  it('handles frontmatter with all knowledge fields', () => {
    const content = `---
name: "api-schema"
type: "api"
tags: ["api", "rest", "users"]
scope: "software-engineer"
description: "User service API schema."
status: "Confirmed"
---

## Endpoints
`;
    const { frontmatter, body } = parseFrontmatter(content);
    assert.equal(frontmatter.name, 'api-schema');
    assert.equal(frontmatter.type, 'api');
    assert.deepEqual(frontmatter.tags, ['api', 'rest', 'users']);
    assert.equal(frontmatter.scope, 'software-engineer');
    assert.equal(frontmatter.description, 'User service API schema.');
    assert.equal(frontmatter.status, 'Confirmed');
    assert.ok(body.includes('## Endpoints'));
  });
});

// ── hashContent ──────────────────────────────────────────────────────────────

describe('unit: file-utils/hashContent', () => {
  it('returns sha256-prefixed hash', () => {
    const hash = hashContent('hello');
    assert.ok(hash.startsWith('sha256:'));
    assert.equal(hash.length, 7 + 64); // "sha256:" + 64 hex chars
  });

  it('produces consistent hashes for same input', () => {
    assert.equal(hashContent('test'), hashContent('test'));
  });

  it('produces different hashes for different input', () => {
    assert.notEqual(hashContent('a'), hashContent('b'));
  });

  it('handles empty string', () => {
    const hash = hashContent('');
    assert.ok(hash.startsWith('sha256:'));
    assert.equal(hash.length, 7 + 64);
  });

  it('handles Buffer input', () => {
    const hash = hashContent(Buffer.from('hello'));
    assert.equal(hash, hashContent('hello'));
  });
});

// ── nonFencedLines ───────────────────────────────────────────────────────────

describe('unit: file-utils/nonFencedLines', () => {
  it('returns every line with its 1-indexed line number when there is no fence', () => {
    const result = nonFencedLines('a\nb\nc');
    assert.deepEqual(result, [
      { line: 'a', lineNumber: 1 },
      { line: 'b', lineNumber: 2 },
      { line: 'c', lineNumber: 3 },
    ]);
  });

  it('omits lines inside a fenced code block, and the fence markers themselves', () => {
    const content = ['before', '```', 'inside', '```', 'after'].join('\n');
    const result = nonFencedLines(content);
    assert.deepEqual(
      result.map((r) => r.line),
      ['before', 'after'],
    );
  });

  it('preserves original line numbers across an omitted fence', () => {
    const content = ['one', '```', 'two', '```', 'three'].join('\n');
    const result = nonFencedLines(content);
    assert.deepEqual(
      result.map((r) => r.lineNumber),
      [1, 5],
    );
  });

  it('treats an unclosed fence as extending to the end of the content', () => {
    const content = ['before', '```', 'never closes'].join('\n');
    const result = nonFencedLines(content);
    assert.deepEqual(
      result.map((r) => r.line),
      ['before'],
    );
  });

  it('handles multiple separate fenced blocks', () => {
    const content = ['a', '```', 'x', '```', 'b', '```', 'y', '```', 'c'].join('\n');
    const result = nonFencedLines(content);
    assert.deepEqual(
      result.map((r) => r.line),
      ['a', 'b', 'c'],
    );
  });

  it('returns a single empty line for empty content, not []', () => {
    assert.deepEqual(nonFencedLines(''), [{ line: '', lineNumber: 1 }]);
  });
});
