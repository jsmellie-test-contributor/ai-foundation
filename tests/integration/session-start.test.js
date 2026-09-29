/**
 * Integration tests for scripts/session-start.sh (the cloud SessionStart hook).
 *
 * npm and node are stubbed on PATH so the tests only observe what the hook
 * would run, without installing anything.
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

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'session-start-'));
    log = join(dir, 'calls.log');
    for (const tool of ['npm', 'node']) {
      const stub = join(dir, tool);
      writeFileSync(stub, `#!/bin/sh\necho "${tool} $*" >> "${log}"\n`);
      chmodSync(stub, 0o755);
    }
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

  it('installs dependencies but no bundles when AIF_BUNDLES is unset', () => {
    const result = run({ CLAUDE_CODE_REMOTE: 'true' });
    assert.equal(result.status, 0);
    assert.deepEqual(calls(), ['npm install --no-save --no-audit --no-fund']);
  });

  it('installs the listed bundles to the claude harness when AIF_BUNDLES is set', () => {
    const result = run({ CLAUDE_CODE_REMOTE: 'true', AIF_BUNDLES: 'engineering,generic' });
    assert.equal(result.status, 0);
    assert.deepEqual(calls(), [
      'npm install --no-save --no-audit --no-fund',
      'node bin/aif.js install -B engineering,generic -H claude',
    ]);
  });

  it('warns without failing when the bundle install fails', () => {
    writeFileSync(join(dir, 'node'), '#!/bin/sh\nexit 1\n');
    const result = run({ CLAUDE_CODE_REMOTE: 'true', AIF_BUNDLES: 'nope' });
    assert.equal(result.status, 0);
    assert.match(result.stderr, /aif install failed for AIF_BUNDLES=nope/);
  });
});
