// ------------------------------
// decisions-index.test.js
//
// Author: Starvoxel AI Agent - 2026-08-19
// Plan: AIF-002-014, docs/process-model.md check 30
//
// Copyright (c) StarVoxel. All rights reserved.
// ------------------------------

/**
 * Integration tests for `aif index decisions` decision-index
 * generation/validation (filesystem operations).
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { runIndex, resolveDecisionsPath } from '../../lib/commands/index.js';
import { parseArgs } from '../../bin/aif.js';

function decisionFixture({ status = 'accepted', supersedes = '[]', title }) {
  return `---
status: ${status}
date: 2026-09-25
decision-makers: [Jeremy]
tags: []
links:
  supersedes: ${supersedes}
affects: []
---

# ${title}

## Context and Problem Statement

Test fixture.
`;
}

async function quiet(fn) {
  const origLog = console.log;
  const origErr = console.error;
  const output = [];
  console.log = (...args) => output.push(args.join(' '));
  console.error = (...args) => output.push(args.join(' '));
  try {
    const code = await fn();
    return { code, output };
  } finally {
    console.log = origLog;
    console.error = origErr;
  }
}

describe('integration: decision index', () => {
  let projectRoot;

  beforeEach(() => {
    projectRoot = mkdtempSync(join(tmpdir(), 'aif-decisions-'));
  });

  afterEach(() => {
    rmSync(projectRoot, { recursive: true, force: true });
  });

  it('DEC-IT01: writes a correct index.json at a configured non-default paths.decisions', () => {
    const decisionsDir = join(projectRoot, 'governance', 'records');
    mkdirSync(decisionsDir, { recursive: true });
    writeFileSync(
      join(projectRoot, '.aiconfig.json'),
      JSON.stringify({ paths: { decisions: 'governance/records' } }),
      'utf8',
    );
    writeFileSync(
      join(decisionsDir, '0001-first-decision.md'),
      decisionFixture({ title: 'First Decision' }),
      'utf8',
    );
    writeFileSync(
      join(decisionsDir, '0002-second-decision.md'),
      decisionFixture({ title: 'Second Decision', supersedes: '["0001"]' }),
      'utf8',
    );

    return quiet(() => runIndex({ args: {}, positional: ['decisions'] }, projectRoot)).then(
      ({ code }) => {
        assert.equal(code, 0);
        const indexPath = join(decisionsDir, 'index.json');
        assert.ok(existsSync(indexPath));
        const index = JSON.parse(readFileSync(indexPath, 'utf8'));
        assert.equal(index.entries.length, 2);
        const byId = Object.fromEntries(index.entries.map((e) => [e.id, e]));
        assert.deepEqual(byId['0001'].superseded_by, ['0002']);
        assert.deepEqual(byId['0002'].supersedes, ['0001']);
      },
    );
  });

  it('DEC-IT02: no target is a usage error, not an implicit knowledge index', async () => {
    const { code, output } = await quiet(() => runIndex({ args: {}, positional: [] }, projectRoot));
    assert.equal(code, 1);
    assert.ok(output.some((line) => /decisions|architecture/.test(line)));
    assert.ok(!existsSync(join(projectRoot, 'knowledge', 'index.json')));
  });

  it('DEC-IT03: --check against a freshly-generated, unmodified index exits 0', async () => {
    const decisionsDir = join(projectRoot, 'docs', 'decisions');
    mkdirSync(decisionsDir, { recursive: true });
    writeFileSync(
      join(projectRoot, '.aiconfig.json'),
      JSON.stringify({ paths: { decisions: 'docs/decisions' } }),
      'utf8',
    );
    writeFileSync(
      join(decisionsDir, '0001-first-decision.md'),
      decisionFixture({ title: 'First Decision' }),
      'utf8',
    );

    const gen = await quiet(() => runIndex({ args: {}, positional: ['decisions'] }, projectRoot));
    assert.equal(gen.code, 0);

    const check = await quiet(() =>
      runIndex({ args: { check: true }, positional: ['decisions'] }, projectRoot),
    );
    assert.equal(check.code, 0);
  });

  it('DEC-IT04: --check against a staled index exits non-zero with a diff summary', async () => {
    const decisionsDir = join(projectRoot, 'docs', 'decisions');
    mkdirSync(decisionsDir, { recursive: true });
    writeFileSync(
      join(projectRoot, '.aiconfig.json'),
      JSON.stringify({ paths: { decisions: 'docs/decisions' } }),
      'utf8',
    );
    const fixturePath = join(decisionsDir, '0001-first-decision.md');
    writeFileSync(fixturePath, decisionFixture({ title: 'First Decision' }), 'utf8');

    const gen = await quiet(() => runIndex({ args: {}, positional: ['decisions'] }, projectRoot));
    assert.equal(gen.code, 0);

    // Stale the index by changing the fixture's status after generation.
    writeFileSync(
      fixturePath,
      decisionFixture({ title: 'First Decision', status: 'deprecated' }),
      'utf8',
    );

    const check = await quiet(() =>
      runIndex({ args: { check: true }, positional: ['decisions'] }, projectRoot),
    );
    assert.equal(check.code, 1);
    assert.ok(check.output.some((line) => /0001/.test(line)));
  });

  it('DEC-IT05: a malformed fixture file exits non-zero and names the offending file', async () => {
    const decisionsDir = join(projectRoot, 'docs', 'decisions');
    mkdirSync(decisionsDir, { recursive: true });
    writeFileSync(
      join(projectRoot, '.aiconfig.json'),
      JSON.stringify({ paths: { decisions: 'docs/decisions' } }),
      'utf8',
    );
    writeFileSync(
      join(decisionsDir, '0001-good-decision.md'),
      decisionFixture({ title: 'Good Decision' }),
      'utf8',
    );
    writeFileSync(join(decisionsDir, '0002-broken.md'), '# Broken\n\nNo frontmatter.\n', 'utf8');

    const { code, output } = await quiet(() =>
      runIndex({ args: {}, positional: ['decisions'] }, projectRoot),
    );
    assert.equal(code, 1);
    assert.ok(output.some((line) => /0002-broken\.md/.test(line)));
    assert.ok(!existsSync(join(decisionsDir, 'index.json')));
  });

  it('DEC-IT06: an unknown index target exits non-zero with a usage error', async () => {
    const { code, output } = await quiet(() =>
      runIndex({ args: {}, positional: ['bogus'] }, projectRoot),
    );
    assert.equal(code, 1);
    assert.ok(output.some((line) => /Unknown index target/.test(line)));
  });

  it('DEC-IT07: a file under an archive/ subfolder is not picked up (flat corpus only)', async () => {
    const decisionsDir = join(projectRoot, 'docs', 'decisions');
    const archiveDir = join(decisionsDir, 'archive', 'process');
    mkdirSync(archiveDir, { recursive: true });
    writeFileSync(
      join(projectRoot, '.aiconfig.json'),
      JSON.stringify({ paths: { decisions: 'docs/decisions' } }),
      'utf8',
    );
    writeFileSync(
      join(decisionsDir, '0001-live-decision.md'),
      decisionFixture({ title: 'Live Decision' }),
      'utf8',
    );
    // Old-format archived record — should never be scanned by the retargeted
    // MADR-only collector.
    writeFileSync(
      join(archiveDir, 'AIF-PROC-999_archived.decision.md'),
      '# Decision Record: Archived\n\n## Metadata\n\n| Field | Value |\n|---|---|\n| Decision ID | AIF-PROC-999 |\n| Status | Superseded |\n',
      'utf8',
    );

    const { code } = await quiet(() =>
      runIndex({ args: {}, positional: ['decisions'] }, projectRoot),
    );
    assert.equal(code, 0);

    const index = JSON.parse(readFileSync(join(decisionsDir, 'index.json'), 'utf8'));
    assert.equal(index.entries.length, 1);
    assert.equal(index.entries[0].id, '0001');
  });

  it('DEC-IT08: a template file (_template.md) is excluded from the scan', async () => {
    const decisionsDir = join(projectRoot, 'docs', 'decisions');
    mkdirSync(decisionsDir, { recursive: true });
    writeFileSync(
      join(projectRoot, '.aiconfig.json'),
      JSON.stringify({ paths: { decisions: 'docs/decisions' } }),
      'utf8',
    );
    writeFileSync(
      join(decisionsDir, '0001-live-decision.md'),
      decisionFixture({ title: 'Live Decision' }),
      'utf8',
    );
    writeFileSync(
      join(decisionsDir, '_template.md'),
      '---\nstatus: proposed\n---\n\n# Title\n',
      'utf8',
    );

    const { code } = await quiet(() =>
      runIndex({ args: {}, positional: ['decisions'] }, projectRoot),
    );
    assert.equal(code, 0);

    const index = JSON.parse(readFileSync(join(decisionsDir, 'index.json'), 'utf8'));
    assert.equal(index.entries.length, 1);
  });

  it(
    'end-to-end: `aif index decisions` (via the real bin/aif.js parseArgs) ' +
      'generates the decision index the same way a hand-built positional arg does',
    async () => {
      const decisionsDir = join(projectRoot, 'docs', 'decisions');
      mkdirSync(decisionsDir, { recursive: true });
      writeFileSync(
        join(projectRoot, '.aiconfig.json'),
        JSON.stringify({ paths: { decisions: 'docs/decisions' } }),
        'utf8',
      );
      writeFileSync(
        join(decisionsDir, '0001-first-decision.md'),
        decisionFixture({ title: 'First Decision' }),
        'utf8',
      );

      // Mirrors exactly what a real user typing `aif index decisions` triggers:
      // bin/aif.js's parseArgs(process.argv.slice(2)) feeding runIndex's
      // `parsed` argument, not a hand-built { positional: [...] } object like
      // every other test in this file uses.
      const parsed = parseArgs(['index', 'decisions']);
      const { code } = await quiet(() => runIndex(parsed, projectRoot));

      assert.equal(code, 0, 'Expected `aif index decisions` to generate the decision index.');
    },
  );

  describe('DEC-IT09: resolveDecisionsPath fallback derivation', () => {
    it('(a) paths.knowledge configured non-default, paths.decisions unset -> {knowledge}/decisions', () => {
      writeFileSync(
        join(projectRoot, '.aiconfig.json'),
        JSON.stringify({ paths: { knowledge: 'notes' } }),
        'utf8',
      );
      const resolved = resolveDecisionsPath(projectRoot);
      assert.equal(resolved, join(projectRoot, 'notes', 'decisions'));
      assert.notEqual(resolved, join(projectRoot, 'docs', 'decisions'));
    });

    it('(b) both paths.knowledge and paths.decisions unset -> knowledge/decisions default', () => {
      // No .aiconfig.json at all.
      const resolved = resolveDecisionsPath(projectRoot);
      assert.equal(resolved, join(projectRoot, 'knowledge', 'decisions'));
    });
  });

  describe('DEC-IT08: malformed .aiconfig.json', () => {
    it('`aif index decisions` exits non-zero with a clean message instead of throwing', async () => {
      writeFileSync(join(projectRoot, '.aiconfig.json'), '{ not json', 'utf8');

      const { code, output } = await quiet(() =>
        runIndex({ args: {}, positional: ['decisions'] }, projectRoot),
      );
      assert.equal(code, 1);
      assert.ok(output.some((line) => /not valid JSON/.test(line)));
    });
  });
});
