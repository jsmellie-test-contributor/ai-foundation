import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { runList } from '../../lib/commands/list.js';
import { createTempRepo, destroyTempRepo } from '../helpers/fixture.js';

describe('integration: list command', () => {
  let repo;

  beforeEach(() => {
    repo = createTempRepo({
      agents: [
        {
          name: 'alpha',
          version: '0.1.0',
          domain: 'engineering',
          description: 'Alpha agent.',
          prompt: 'x',
          tools: [],
          approved_tools: [],
        },
      ],
      skills: ['plan-lifecycle'],
      servers: ['git'],
      bundles: [
        {
          name: 'engineering',
          version: '1.0.0',
          description: 'Engineering bundle.',
          domain: 'engineering',
        },
      ],
    });
  });

  afterEach(() => {
    destroyTempRepo(repo);
  });

  // Helper to capture console output
  function captureOutput(fn) {
    const lines = [];
    const origLog = console.log;
    const origErr = console.error;
    console.log = (...args) => lines.push(args.join(' '));
    console.error = (...args) => lines.push(args.join(' '));
    try {
      const code = fn();
      return { code, output: lines.join('\n') };
    } finally {
      console.log = origLog;
      console.error = origErr;
    }
  }

  it('lists bundles', () => {
    const { code, output } = captureOutput(() =>
      runList({ args: {}, positional: ['bundles'] }, repo),
    );
    assert.equal(code, 0);
    assert.ok(output.includes('engineering'));
  });

  it('lists agents', () => {
    const { code, output } = captureOutput(() =>
      runList({ args: {}, positional: ['agents'] }, repo),
    );
    assert.equal(code, 0);
    assert.ok(output.includes('alpha'));
  });

  it('lists skills', () => {
    // Add frontmatter to the SKILL.md so description is found
    writeFileSync(
      join(repo, 'skills', 'plan-lifecycle', 'SKILL.md'),
      '---\nname: "plan-lifecycle"\nversion: "0.1.0"\ndescription: "Governs the Draft-to-Approved commit gate."\n---\n# PL\n',
      'utf8',
    );
    const { code, output } = captureOutput(() =>
      runList({ args: {}, positional: ['skills'] }, repo),
    );
    assert.equal(code, 0);
    assert.ok(output.includes('plan-lifecycle'));
  });

  it('lists servers', () => {
    const { code, output } = captureOutput(() =>
      runList({ args: {}, positional: ['servers'] }, repo),
    );
    assert.equal(code, 0);
    assert.ok(output.includes('git'));
  });

  it('returns error for missing target', () => {
    const { code, output } = captureOutput(() => runList({ args: {}, positional: [] }, repo));
    assert.equal(code, 1);
    assert.ok(output.includes('Usage'));
  });

  it('returns error for unknown target', () => {
    const { code, output } = captureOutput(() =>
      runList({ args: {}, positional: ['widgets'] }, repo),
    );
    assert.equal(code, 1);
    assert.ok(output.includes('Unknown list target'));
  });
});
