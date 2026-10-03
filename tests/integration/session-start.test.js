/**
 * Integration tests for scripts/session-start.sh (the cloud SessionStart hook).
 *
 * Plan: AIF-008 (Task 004). npm, node and ai-git are stubbed on PATH so the
 * tests only observe what the hook would run, without installing anything.
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, chmodSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const SCRIPT = resolve(import.meta.dirname, '../../scripts/session-start.sh');
const REPO_ROOT = resolve(import.meta.dirname, '../..');

describe('scripts/session-start.sh', () => {
  let dir;
  let log;

  /** Replace a stub so it logs its call and then exits with `code`. */
  function stub(tool, code = 0) {
    const file = join(dir, tool);
    writeFileSync(file, `#!/bin/sh\necho "${tool} $*" >> "${log}"\nexit ${code}\n`);
    chmodSync(file, 0o755);
  }

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'session-start-'));
    log = join(dir, 'calls.log');
    for (const tool of ['npm', 'node', 'ai-git']) stub(tool);
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function run(env) {
    return spawnSync('bash', [SCRIPT], {
      encoding: 'utf8',
      env: {
        PATH: `${dir}:${process.env.PATH}`,
        CLAUDE_PROJECT_DIR: REPO_ROOT,
        ...env,
      },
    });
  }

  function calls() {
    return existsSync(log) ? readFileSync(log, 'utf8').trim().split('\n') : [];
  }

  it('does nothing outside a cloud session', () => {
    const result = run({ AIF_BUNDLES: 'engineering' });
    assert.equal(result.status, 0);
    assert.deepEqual(calls(), []);
  });

  it('links ai-git and runs doctor, but installs no bundles, when AIF_BUNDLES is unset', () => {
    const result = run({ CLAUDE_CODE_REMOTE: 'true' });
    assert.equal(result.status, 0);
    assert.deepEqual(calls(), ['npm link --ignore-scripts', 'ai-git doctor']);
  });

  it('installs the listed bundles to the claude harness between link and doctor', () => {
    const result = run({ CLAUDE_CODE_REMOTE: 'true', AIF_BUNDLES: 'engineering,generic' });
    assert.equal(result.status, 0);
    assert.deepEqual(calls(), [
      'npm link --ignore-scripts',
      'node bin/aif.js install -B engineering,generic -H claude',
      'ai-git doctor',
    ]);
  });

  it('never runs npm install (SessionStart does not install from the network)', () => {
    run({ CLAUDE_CODE_REMOTE: 'true', AIF_BUNDLES: 'engineering' });
    for (const call of calls()) {
      assert.doesNotMatch(call, /^npm install/);
    }
  });

  it('warns without failing when the bundle install fails', () => {
    stub('node', 1);
    const result = run({ CLAUDE_CODE_REMOTE: 'true', AIF_BUNDLES: 'nope' });
    assert.equal(result.status, 0);
    assert.match(result.stderr, /aif install failed for AIF_BUNDLES=nope/);
    assert.equal(calls().at(-1), 'ai-git doctor');
  });

  it('warns and still runs the later steps when npm link fails', () => {
    stub('npm', 1);
    const result = run({ CLAUDE_CODE_REMOTE: 'true', AIF_BUNDLES: 'engineering' });
    assert.equal(result.status, 0);
    assert.match(result.stderr, /npm link failed/);
    assert.deepEqual(calls(), [
      'npm link --ignore-scripts',
      'node bin/aif.js install -B engineering -H claude',
      'ai-git doctor',
    ]);
  });

  it('reports doctor problems on stderr but exits 0 (report only)', () => {
    stub('ai-git', 1);
    const result = run({ CLAUDE_CODE_REMOTE: 'true' });
    assert.equal(result.status, 0);
    assert.match(result.stderr, /ai-git doctor reported problems/);
  });
});
