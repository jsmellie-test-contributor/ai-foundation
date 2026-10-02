/**
 * Integration tests for `ai-git doctor` (bin/ai-git.js) — Plan AIF-008, Task 002.
 *
 * Spawns the real CLI against fixture configs, fake PATH tools and a fake
 * shell-joining `secrets.run` wrapper (mimicking `bws run`, which joins argv
 * and runs it through a shell). No real bws/gh is needed or used.
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  readFileSync,
  existsSync,
  mkdirSync,
  cpSync,
  chmodSync,
} from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';

import { isShellSafeArg } from '../../lib/ai-git.js';

const BIN_PATH = resolve(import.meta.dirname, '../../bin/ai-git.js');
const SECRET = 'seeded-secret-token-98765';
const TOKEN_VAR = 'AI_GIT_TOKEN_TEST';

// Shell-joining wrapper: joins argv after `--`, records it, injects the
// secret (if FAKE_WRAP_SECRET is set) into the child, runs it via a shell.
const FAKE_WRAPPER = `
const { spawnSync } = require('node:child_process');
const { writeFileSync } = require('node:fs');
const args = process.argv.slice(2);
const rest = args.slice(args.indexOf('--') + 1);
const joined = rest.join(' ');
writeFileSync(process.env.FAKE_WRAP_LOG, joined);
const env = { ...process.env };
if (process.env.FAKE_WRAP_SECRET) env[process.env.FAKE_WRAP_VAR] = process.env.FAKE_WRAP_SECRET;
const r = spawnSync(joined, { shell: true, env, stdio: 'inherit' });
process.exit(r.status ?? 1);
`;

let root;
let binDir;

function makeTools(names) {
  for (const n of names) {
    const f = join(binDir, process.platform === 'win32' ? `${n}.cmd` : n);
    writeFileSync(f, '');
    chmodSync(f, 0o755);
  }
}

function writeConfig(extra = {}, identity = {}) {
  writeFileSync(
    join(root, '.aiconfig.json'),
    JSON.stringify({
      project_name: 't',
      ai_identity: { git_token_env: TOKEN_VAR, ...identity },
      ...extra,
    }),
  );
}

function wrapperRun(...mid) {
  return ['node', join(root, 'fake-wrap.js'), ...mid, '--'];
}

function runDoctor(cwd, extraEnv = {}, binPath = BIN_PATH) {
  const sysPath = process.platform === 'win32' ? '' : '/bin:/usr/bin';
  const env = {
    ...process.env,
    PATH: [binDir, dirname(process.execPath), sysPath]
      .filter(Boolean)
      .join(process.platform === 'win32' ? ';' : ':'),
    FAKE_WRAP_LOG: join(root, 'wrap.log'),
    FAKE_WRAP_VAR: TOKEN_VAR,
    ...extraEnv,
  };
  delete env[TOKEN_VAR];
  delete env.BWS_PROJECT_ID;
  delete env.AIF_SECRETS_WRAPPED;
  Object.assign(env, extraEnv);
  const r = spawnSync(process.execPath, [binPath, 'doctor'], { cwd, env, encoding: 'utf8' });
  return { code: r.status, out: r.stdout, err: r.stderr, all: `${r.stdout}\n${r.stderr}` };
}

describe('integration: ai-git doctor', () => {
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'ai-git-doctor-'));
    binDir = join(root, 'bin');
    mkdirSync(binDir);
    makeTools(['ai-git', 'gh', 'bws']);
    writeFileSync(join(root, 'fake-wrap.js'), FAKE_WRAPPER);
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('with no .aiconfig.json: exits 1, token check skipped', () => {
    const empty = mkdtempSync(join(tmpdir(), 'ai-git-doctor-empty-'));
    try {
      const r = runDoctor(empty);
      assert.equal(r.code, 1);
      assert.match(r.out, /FAIL .aiconfig.json: NOT found/);
      assert.match(r.out, /token: check skipped, no \.aiconfig\.json/);
      assert.match(r.out, /use ai-git/);
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  });

  it('token in env: exits 0, never prints the value', () => {
    writeConfig();
    const r = runDoctor(root, { [TOKEN_VAR]: SECRET });
    assert.equal(r.code, 0);
    assert.match(r.out, /ok\s+token \(AI_GIT_TOKEN_TEST\): resolved via env/);
    assert.ok(!r.all.includes(SECRET));
  });

  it('missing tool: exits 1 and names it', () => {
    rmSync(join(binDir, process.platform === 'win32' ? 'bws.cmd' : 'bws'));
    writeConfig();
    const r = runDoctor(root, { [TOKEN_VAR]: SECRET });
    assert.equal(r.code, 1);
    assert.match(r.out, /FAIL bws: NOT found on PATH/);
    assert.match(r.out, /ok\s+gh: found/);
  });

  it('wrapper success: probe argv is shell-safe and survives a shell-joining wrapper', () => {
    writeConfig({ secrets: { run: wrapperRun() } });
    const r = runDoctor(root, { FAKE_WRAP_SECRET: SECRET });
    assert.equal(r.code, 0, r.all);
    assert.match(r.out, /token \(AI_GIT_TOKEN_TEST\): resolved via wrapper/);
    assert.ok(!r.all.includes(SECRET));
    const joined = readFileSync(join(root, 'wrap.log'), 'utf8');
    const parts = joined.split(' ');
    assert.equal(parts[0], 'node');
    assert.ok(parts.every(isShellSafeArg), `unsafe argv through wrapper: ${joined}`);
  });

  it('wrapper failure (no token injected): exits 1, not resolved', () => {
    writeConfig({ secrets: { run: wrapperRun() } });
    const r = runDoctor(root);
    assert.equal(r.code, 1);
    assert.match(r.out, /FAIL token \(AI_GIT_TOKEN_TEST\): NOT resolved/);
    assert.ok(!r.all.includes(SECRET));
  });

  it('unset ${BWS_PROJECT_ID} placeholder: one explicit line, no stack trace', () => {
    writeConfig({ secrets: { run: wrapperRun('--project-id', '${BWS_PROJECT_ID}') } });
    const r = runDoctor(root, { FAKE_WRAP_SECRET: SECRET });
    assert.equal(r.code, 1);
    assert.match(r.out, /unset environment variable BWS_PROJECT_ID/);
    assert.doesNotMatch(r.all, /\n\s+at /);
    assert.ok(!r.all.includes(SECRET));
  });

  it('probe path not shell-safe (install dir with a space): explicit failure, wrapper never spawned', () => {
    const unsafeRoot = join(root, 'my install dir');
    cpSync(resolve(import.meta.dirname, '../../bin'), join(unsafeRoot, 'bin'), { recursive: true });
    cpSync(resolve(import.meta.dirname, '../../lib'), join(unsafeRoot, 'lib'), { recursive: true });
    writeConfig({ secrets: { run: wrapperRun() } });
    const r = runDoctor(root, { FAKE_WRAP_SECRET: SECRET }, join(unsafeRoot, 'bin', 'ai-git.js'));
    assert.equal(r.code, 1);
    assert.match(
      r.out,
      /probe path not shell-safe; token check could not run \(.*my install dir.*\)/,
    );
    assert.doesNotMatch(r.out, /resolved via/);
    assert.equal(existsSync(join(root, 'wrap.log')), false, 'wrapper must not be spawned');
    assert.ok(!r.all.includes(SECRET));
  });

  it(
    'a non-executable file or a directory on PATH does not count as the tool',
    { skip: process.platform === 'win32' && 'POSIX exec bit' },
    () => {
      rmSync(join(binDir, 'gh'));
      writeFileSync(join(binDir, 'gh'), '');
      chmodSync(join(binDir, 'gh'), 0o644);
      rmSync(join(binDir, 'bws'));
      mkdirSync(join(binDir, 'bws'));
      writeConfig();
      const r = runDoctor(root, { [TOKEN_VAR]: SECRET });
      assert.equal(r.code, 1);
      assert.match(r.out, /FAIL gh: NOT found/);
      assert.match(r.out, /FAIL bws: NOT found/);
    },
  );
});
