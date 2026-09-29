/**
 * Unit tests for arc42 architecture-section parsing, index building, and
 * diffing (lib/architecture.js). All fixtures are synthetic in-memory
 * strings — no real disk or git I/O, per this repo's testability convention
 * (mirrors tests/unit/decisions.test.js).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  parseArchitectureSection,
  buildReverseIndex,
  buildArchitectureIndex,
  diffArchitectureIndex,
  extractRelativeLinks,
} from '../../lib/architecture.js';

function wellFormedSection({
  section = '01',
  title = 'Introduction and Goals',
  lifecycle = 'published',
  last_verified = 'abc1234',
  tags = ['overview'],
  key_files = ['README.md'],
  summaryLines = ['One-sentence summary of what this section covers.'],
} = {}) {
  const tagsYaml = `[${tags.join(', ')}]`;
  const keyFilesYaml = key_files.map((f) => `  - ${f}`).join('\n');
  const summary = summaryLines.map((l) => `> ${l}`).join('\n');
  return `---
section: "${section}"
title: "${title}"
lifecycle: ${lifecycle}
last_verified: ${last_verified}
tags: ${tagsYaml}
key_files:
${keyFilesYaml}
---

${summary}

## Body

Some content.
`;
}

describe('parseArchitectureSection', () => {
  it('parses a well-formed section', () => {
    const result = parseArchitectureSection(wellFormedSection(), '01_introduction.md');
    assert.ok('record' in result, JSON.stringify(result));
    assert.deepEqual(result.record, {
      path: '01_introduction.md',
      section: '01',
      title: 'Introduction and Goals',
      summary: 'One-sentence summary of what this section covers.',
      lifecycle: 'published',
      tags: ['overview'],
      key_files: ['README.md'],
      last_verified: 'abc1234',
    });
  });

  it('joins a multi-line blockquote summary into one string', () => {
    const content = wellFormedSection({
      summaryLines: ['First line of the summary', 'continues on a second line.'],
    });
    const result = parseArchitectureSection(content, '01.md');
    assert.equal(result.record.summary, 'First line of the summary continues on a second line.');
  });

  it('stops the summary at the first non-blockquote line', () => {
    const content = `---
section: "01"
title: "T"
lifecycle: published
last_verified: abc1234
tags: []
key_files: []
---

> Summary line.

## Body

Not part of the summary.
`;
    const result = parseArchitectureSection(content, '01.md');
    assert.equal(result.record.summary, 'Summary line.');
  });

  it('defaults tags and key_files to [] when absent', () => {
    const content = `---
section: "01"
title: "T"
lifecycle: published
last_verified: abc1234
---

> Summary.
`;
    const result = parseArchitectureSection(content, '01.md');
    assert.deepEqual(result.record.tags, []);
    assert.deepEqual(result.record.key_files, []);
  });

  it('errors on missing frontmatter', () => {
    const result = parseArchitectureSection('no frontmatter here', '01.md');
    assert.ok('error' in result);
    assert.match(result.error, /missing YAML frontmatter/);
  });

  for (const field of ['section', 'title', 'lifecycle', 'last_verified']) {
    it(`errors when "${field}" is missing`, () => {
      const lines = wellFormedSection().split('\n');
      const filtered = lines.filter(
        (l) => !l.startsWith(`${field}:`) && !l.startsWith(`${field} `),
      );
      const content = filtered.join('\n');
      const result = parseArchitectureSection(content, '01.md');
      assert.ok('error' in result, `expected an error when ${field} is missing`);
      assert.match(result.error, new RegExp(field));
    });
  }
});

describe('buildReverseIndex', () => {
  it('inverts key_files across records, sorted', () => {
    const records = [
      { path: '01.md', key_files: ['a.js', 'b.js'] },
      { path: '02.md', key_files: ['b.js', 'c.js'] },
    ];
    const reverse = buildReverseIndex(records);
    assert.deepEqual(reverse, {
      'a.js': ['01.md'],
      'b.js': ['01.md', '02.md'],
      'c.js': ['02.md'],
    });
  });

  it('returns {} for no records', () => {
    assert.deepEqual(buildReverseIndex([]), {});
  });
});

describe('buildArchitectureIndex', () => {
  it('assembles entries with the injected stale predicate per record', () => {
    const records = [
      {
        path: '01.md',
        section: '01',
        title: 'A',
        summary: 's',
        lifecycle: 'published',
        tags: [],
        key_files: ['a.js'],
        last_verified: 'x',
      },
      {
        path: '02.md',
        section: '02',
        title: 'B',
        summary: 's',
        lifecycle: 'published',
        tags: [],
        key_files: ['b.js'],
        last_verified: 'y',
      },
    ];
    const index = buildArchitectureIndex(records, (r) => r.path === '02.md');
    assert.equal(index.entries.find((e) => e.path === '01.md').stale, false);
    assert.equal(index.entries.find((e) => e.path === '02.md').stale, true);
  });

  it('includes a reverse_index built from the same records', () => {
    const records = [
      {
        path: '01.md',
        section: '01',
        title: 'A',
        summary: 's',
        lifecycle: 'published',
        tags: [],
        key_files: ['a.js'],
        last_verified: 'x',
      },
    ];
    const index = buildArchitectureIndex(records, () => false);
    assert.deepEqual(index.reverse_index, { 'a.js': ['01.md'] });
  });

  it('stamps generated_at as an ISO timestamp', () => {
    const index = buildArchitectureIndex([], () => false);
    assert.doesNotThrow(() => new Date(index.generated_at).toISOString());
  });
});

describe('extractRelativeLinks', () => {
  it('extracts a plain inline link', () => {
    const links = extractRelativeLinks('See [Bundle resolution](05_01_bundle_resolution.md).');
    assert.deepEqual(links, [{ text: 'Bundle resolution', target: '05_01_bundle_resolution.md' }]);
  });

  it('skips absolute URLs (URI scheme present)', () => {
    const links = extractRelativeLinks('[arc42](https://arc42.org/template)');
    assert.deepEqual(links, []);
  });

  it('skips mailto: links', () => {
    const links = extractRelativeLinks('[email](mailto:someone@example.com)');
    assert.deepEqual(links, []);
  });

  it('skips pure same-page anchors', () => {
    const links = extractRelativeLinks('[Motivation](#motivation)');
    assert.deepEqual(links, []);
  });

  it('skips repo-root-absolute paths', () => {
    const links = extractRelativeLinks('[x](/docs/architecture/05_building_blocks.md)');
    assert.deepEqual(links, []);
  });

  it('keeps a target with a #fragment attached', () => {
    const links = extractRelativeLinks('[x](05_building_blocks.md#overview-diagram)');
    assert.deepEqual(links, [{ text: 'x', target: '05_building_blocks.md#overview-diagram' }]);
  });

  it('strips a quoted link title from the target', () => {
    const links = extractRelativeLinks('[x](05_building_blocks.md "Level 1 whitebox")');
    assert.deepEqual(links, [{ text: 'x', target: '05_building_blocks.md' }]);
  });

  it('does not scan inside fenced code blocks', () => {
    const content = ['```', 'See [example](not_real.md).', '```'].join('\n');
    assert.deepEqual(extractRelativeLinks(content), []);
  });

  it('finds multiple links across multiple lines', () => {
    const content = ['[a](a.md)', 'prose', '[b](b.md)'].join('\n');
    const links = extractRelativeLinks(content);
    assert.deepEqual(
      links.map((l) => l.target),
      ['a.md', 'b.md'],
    );
  });
});

describe('diffArchitectureIndex', () => {
  const entry = (overrides = {}) => ({
    path: '01.md',
    section: '01',
    title: 'A',
    summary: 's',
    lifecycle: 'published',
    tags: ['a', 'b'],
    key_files: ['x.js'],
    last_verified: 'abc',
    stale: false,
    ...overrides,
  });

  it('reports stale with no existing index', () => {
    const diff = diffArchitectureIndex({ entries: [entry()] }, null);
    assert.equal(diff.stale, true);
    assert.match(diff.summary, /No existing index found/);
  });

  it('is not stale when entries are identical (array order ignored)', () => {
    const computed = { entries: [entry({ tags: ['b', 'a'] })] };
    const existing = { entries: [entry({ tags: ['a', 'b'] })] };
    const diff = diffArchitectureIndex(computed, existing);
    assert.equal(diff.stale, false);
  });

  it('detects added, removed, and changed entries by path', () => {
    const existing = { entries: [entry({ path: '01.md' }), entry({ path: '02.md' })] };
    const computed = {
      entries: [entry({ path: '01.md', title: 'Changed' }), entry({ path: '03.md' })],
    };
    const diff = diffArchitectureIndex(computed, existing);
    assert.equal(diff.stale, true);
    assert.match(diff.summary, /Added: 03\.md/);
    assert.match(diff.summary, /Removed: 02\.md/);
    assert.match(diff.summary, /Changed: 01\.md/);
  });
});
