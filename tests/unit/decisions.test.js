// ------------------------------
// decisions.test.js
//
// Author: Starvoxel AI Agent - 2026-08-19
// Plan: AIF-002-014, AIF-003-001, docs/process-model.md check 30
//
// Copyright (c) StarVoxel. All rights reserved.
// ------------------------------

/**
 * Unit tests for ADR (MADR) metadata parsing, index building, and diffing
 * (lib/decisions.js). All fixtures are synthetic in-memory strings — no real
 * disk I/O, keeping the parsing logic testable without disk fixtures.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { parseDecisionRecord, buildDecisionIndex, diffDecisionIndex } from '../../lib/decisions.js';

function wellFormedRecord({
  status = 'accepted',
  date = '2026-09-25',
  decisionMakers = '[Jeremy]',
  supersedes = '[]',
  tags = '[]',
  affects = '[]',
  title = 'A Well-Formed Decision',
} = {}) {
  return `---
status: ${status}
date: ${date}
decision-makers: ${decisionMakers}
tags: ${tags}
links:
  supersedes: ${supersedes}
affects: ${affects}
---

# ${title}

## Context and Problem Statement

Test fixture.
`;
}

// ── parseDecisionRecord ──────────────────────────────────────────────────

describe('unit: decisions/parseDecisionRecord', () => {
  it('extracts all fields from a well-formed MADR record (DEC-T01)', () => {
    const content = wellFormedRecord({ tags: '[orchestration, dispatch]' });
    const result = parseDecisionRecord(content, '0001-well-formed.md');

    assert.ok(result.record, 'expected a record, got error: ' + result.error);
    assert.equal(result.record.id, '0001');
    assert.equal(result.record.title, 'A Well-Formed Decision');
    assert.equal(result.record.status, 'accepted');
    assert.equal(result.record.date, '2026-09-25');
    assert.equal(result.record.path, '0001-well-formed.md');
    assert.deepEqual(result.record.decisionMakers, ['Jeremy']);
    assert.deepEqual(result.record.tags, ['orchestration', 'dispatch']);
  });

  it('returns { error } when the filename has no zero-padded number prefix (DEC-T02)', () => {
    const content = wellFormedRecord();
    const result = parseDecisionRecord(content, 'no-number-prefix.md');

    assert.ok(result.error);
    assert.ok(!result.record);
    assert.match(result.error, /zero-padded number/);
  });

  it('returns { error } when frontmatter is missing entirely (DEC-T03)', () => {
    const content = `# Broken Record\n\nNo frontmatter at all.\n`;
    const result = parseDecisionRecord(content, '0002-broken.md');

    assert.ok(result.error);
    assert.ok(!result.record);
    assert.match(result.error, /frontmatter/);
  });

  it('returns { error } when required field "status" is missing (DEC-T04)', () => {
    const content = `---
date: 2026-09-25
decision-makers: [Jeremy]
tags: []
links:
  supersedes: []
affects: []
---

# Missing Status

## Context and Problem Statement

Test fixture.
`;
    const result = parseDecisionRecord(content, '0003-missing-status.md');

    assert.ok(result.error);
    assert.match(result.error, /status/);
  });

  it('returns { error } when the "# {title}" heading is missing (DEC-T05)', () => {
    const content = `---
status: accepted
date: 2026-09-25
decision-makers: []
tags: []
links:
  supersedes: []
affects: []
---

## Context and Problem Statement

No H1 title at all.
`;
    const result = parseDecisionRecord(content, '0004-no-title.md');

    assert.ok(result.error);
    assert.match(result.error, /title/);
  });

  it('treats an absent decision-makers/tags/affects as empty arrays, not an error (DEC-T06)', () => {
    const content = `---
status: accepted
date: 2026-09-25
links:
  supersedes: []
---

# Minimal Record

## Context and Problem Statement

Test fixture.
`;
    const result = parseDecisionRecord(content, '0005-minimal.md');

    assert.ok(result.record, 'expected a record, got error: ' + result.error);
    assert.deepEqual(result.record.decisionMakers, []);
    assert.deepEqual(result.record.tags, []);
    assert.deepEqual(result.record.affects, []);
    assert.deepEqual(result.record.supersedes, []);
  });

  it('parses a populated links.supersedes as bare-number strings (DEC-T07)', () => {
    const result = parseDecisionRecord(
      wellFormedRecord({ supersedes: '["0002"]' }),
      '0003-supersedes.md',
    );
    assert.deepEqual(result.record.supersedes, ['0002']);
  });

  it('parses multiple links.supersedes entries in order (DEC-T08)', () => {
    const result = parseDecisionRecord(
      wellFormedRecord({ supersedes: '["0002", "0003"]' }),
      '0004-supersedes-multi.md',
    );
    assert.deepEqual(result.record.supersedes, ['0002', '0003']);
  });

  it('parses a populated affects list of file globs (DEC-T09)', () => {
    const result = parseDecisionRecord(
      wellFormedRecord({ affects: '[lib/foo.js, "lib/bar/**"]' }),
      '0006-affects.md',
    );
    assert.deepEqual(result.record.affects, ['lib/foo.js', 'lib/bar/**']);
  });
});

// ── buildDecisionIndex ───────────────────────────────────────────────────

describe('unit: decisions/buildDecisionIndex', () => {
  it('returns a valid empty index for an empty record list (DEC-T10)', () => {
    const index = buildDecisionIndex([]);
    assert.deepEqual(index.entries, []);
    assert.ok(index.generated_at);
  });

  it('carries id/title/status/date/decisionMakers/tags/affects straight through (DEC-T11)', () => {
    const records = [
      {
        id: '0001',
        title: 'A',
        status: 'accepted',
        date: '2026-09-25',
        path: '0001-a.md',
        decisionMakers: ['Jeremy'],
        tags: ['tag'],
        supersedes: [],
        affects: ['lib/a.js'],
      },
    ];

    const index = buildDecisionIndex(records);
    const [entry] = index.entries;

    assert.equal(entry.id, '0001');
    assert.equal(entry.title, 'A');
    assert.equal(entry.status, 'accepted');
    assert.equal(entry.date, '2026-09-25');
    assert.deepEqual(entry.decision_makers, ['Jeremy']);
    assert.deepEqual(entry.tags, ['tag']);
    assert.deepEqual(entry.affects, ['lib/a.js']);
  });

  it('inverts supersedes into superseded_by: 0002 supersedes 0001 (DEC-T12)', () => {
    const records = [
      {
        id: '0001',
        title: 'A',
        status: 'accepted',
        date: null,
        path: '0001-a.md',
        decisionMakers: [],
        tags: [],
        supersedes: [],
        affects: [],
      },
      {
        id: '0002',
        title: 'B',
        status: 'accepted',
        date: null,
        path: '0002-b.md',
        decisionMakers: [],
        tags: [],
        supersedes: ['0001'],
        affects: [],
      },
    ];

    const index = buildDecisionIndex(records);
    const byId = Object.fromEntries(index.entries.map((e) => [e.id, e]));

    assert.deepEqual(byId['0001'].superseded_by, ['0002']);
    assert.deepEqual(byId['0002'].supersedes, ['0001']);
    assert.deepEqual(byId['0002'].superseded_by, []);
  });

  it('does not throw on a dangling supersedes ID and contributes no superseded_by (DEC-T13)', () => {
    const records = [
      {
        id: '0003',
        title: 'C',
        status: 'accepted',
        date: null,
        path: '0003-c.md',
        decisionMakers: [],
        tags: [],
        supersedes: ['0099'],
        affects: [],
      },
    ];

    const index = buildDecisionIndex(records);
    const byId = Object.fromEntries(index.entries.map((e) => [e.id, e]));

    assert.deepEqual(byId['0003'].supersedes, ['0099']);
    for (const entry of index.entries) {
      assert.deepEqual(entry.superseded_by, []);
    }
  });

  it('accumulates superseded_by from two records superseding the same predecessor (DEC-T14)', () => {
    const records = [
      {
        id: '0001',
        title: 'A',
        status: 'accepted',
        date: null,
        path: '0001-a.md',
        decisionMakers: [],
        tags: [],
        supersedes: [],
        affects: [],
      },
      {
        id: '0002',
        title: 'B',
        status: 'accepted',
        date: null,
        path: '0002-b.md',
        decisionMakers: [],
        tags: [],
        supersedes: ['0001'],
        affects: [],
      },
      {
        id: '0003',
        title: 'C',
        status: 'accepted',
        date: null,
        path: '0003-c.md',
        decisionMakers: [],
        tags: [],
        supersedes: ['0001'],
        affects: [],
      },
    ];

    const index = buildDecisionIndex(records);
    const byId = Object.fromEntries(index.entries.map((e) => [e.id, e]));

    assert.deepEqual(byId['0001'].superseded_by.sort(), ['0002', '0003']);
  });

  it('excludes self-reference when a record names itself in supersedes (DEC-T15)', () => {
    const records = [
      {
        id: '0001',
        title: 'A',
        status: 'accepted',
        date: null,
        path: '0001-a.md',
        decisionMakers: [],
        tags: [],
        supersedes: ['0001'],
        affects: [],
      },
    ];

    const index = buildDecisionIndex(records);
    const byId = Object.fromEntries(index.entries.map((e) => [e.id, e]));

    assert.deepEqual(byId['0001'].superseded_by, []);
    assert.deepEqual(byId['0001'].supersedes, ['0001']);
  });
});

// ── diffDecisionIndex ────────────────────────────────────────────────────

const baseEntry = {
  id: '0001',
  title: 'A',
  status: 'accepted',
  date: '2026-09-25',
  path: '0001-a.md',
  decision_makers: ['Jeremy'],
  tags: [],
  supersedes: [],
  superseded_by: [],
  affects: [],
};

describe('unit: decisions/diffDecisionIndex', () => {
  it('returns stale: false when entries match, ignoring generated_at (DEC-T16)', () => {
    const computed = { generated_at: '2026-09-25T00:00:00.000Z', entries: [{ ...baseEntry }] };
    const existing = { generated_at: '2020-01-01T00:00:00.000Z', entries: [{ ...baseEntry }] };

    const diff = diffDecisionIndex(computed, existing);
    assert.equal(diff.stale, false);
  });

  it('returns stale: true with a non-empty summary when an entry changed (DEC-T17)', () => {
    const computed = { generated_at: 'now', entries: [{ ...baseEntry, status: 'deprecated' }] };
    const existing = { generated_at: 'then', entries: [{ ...baseEntry }] };

    const diff = diffDecisionIndex(computed, existing);
    assert.equal(diff.stale, true);
    assert.ok(diff.summary.length > 0);
    assert.match(diff.summary, /0001/);
  });

  it('returns stale: true with a non-empty summary when an entry is added (DEC-T18)', () => {
    const computed = {
      generated_at: 'now',
      entries: [{ ...baseEntry }, { ...baseEntry, id: '0002' }],
    };
    const existing = { generated_at: 'then', entries: [{ ...baseEntry }] };

    const diff = diffDecisionIndex(computed, existing);
    assert.equal(diff.stale, true);
    assert.match(diff.summary, /0002/);
  });

  it('returns stale: true with a non-empty summary when an entry is removed (DEC-T19)', () => {
    const computed = { generated_at: 'now', entries: [] };
    const existing = { generated_at: 'then', entries: [{ ...baseEntry }] };

    const diff = diffDecisionIndex(computed, existing);
    assert.equal(diff.stale, true);
    assert.match(diff.summary, /0001/);
  });

  it('returns stale: true against existing: null (DEC-T20)', () => {
    const computed = { generated_at: 'now', entries: [{ ...baseEntry }] };
    const diff = diffDecisionIndex(computed, null);
    assert.equal(diff.stale, true);
  });

  it('reports a supersede-only change as stale (DEC-T21)', () => {
    const computed = { generated_at: 'now', entries: [{ ...baseEntry, supersedes: ['0099'] }] };
    const existing = { generated_at: 'then', entries: [{ ...baseEntry }] };

    const diff = diffDecisionIndex(computed, existing);
    assert.equal(diff.stale, true);
    assert.match(diff.summary, /0001/);
  });
});
