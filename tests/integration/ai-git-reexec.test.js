/**
 * Integration tests for bin/ai-git.js re-exec argument transport and
 * token-resolution failure policy.
 *
 * Plan: AIF-008 (Task 001 — re-exec argument transport and failure policy)
 *
 * Uses a fake secrets "run wrapper" that, like the real `bws run`, joins
 * its argv into a single string and runs it through a shell. Hostile
 * arguments must reach git/gh unchanged and nothing may be executed.
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, existsSync, readFileSync, chmodSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const BIN_PATH = resolve(import.meta.dirname, '../../bin/ai-git.js');
const TOKEN_VAR = 'AI_GIT_TOKEN_TEST';
const WRAPPER_TOKEN = 'reexec-wrapper-token-24680';
const MARKER = 'INJECTED_MARKER';

const NETWORK_BLOCK_ENV = {
  HTTPS_PROXY: 'http://127.0.0.1:1',
  HTTP_PROXY: 'http://127.0.0.1:1',
  GIT_TERMINAL_PROMPT: '0',
};

const HOSTILE_ARGS = [
  'with space',
  `semi;node -e "require('fs').writeFileSync('${MARKER}','1')"`,
  `amp&&node -e "require('fs').writeFileSync('${MARKER}','1')"`,
  '$(node -e "1")',
  '`node -e "1"`',
  'it\'s "quoted"',
  '(parens) $HOME',
  'line1\nline2',
];

function git(cwd, args) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
  assert.equal(r.status, 0, `git ${args.join(' ')} failed: ${r.stderr}`);
}

function setUpRepo(secrets) {
  const root = mkdtempSync(join(tmpdir(), 'ai-git-reexec-'));
  writeFileSync(
    join(root, '.aiconfig.json'),
    JSON.stringify({
      project_name: 'test-project',
      repo_type: 'framework',
      ai_identity: {
        git_author_name: 'Test Bot',
        git_author_email: 'bot@example.com',
        git_token_env: TOKEN_VAR,
      },
      ...(secrets ? { secrets } : {}),
    }),
    'utf8',
  );
  git(root, ['init', '-q']);
  git(root, ['remote', 'add', 'origin', 'https://github.com/nonexistent-org/nonexistent-repo.git']);
  return root;
}

function runAiGit(cwd, args, { token, extraEnv = {} } = {}) {
  const env = { ...process.env, ...NETWORK_BLOCK_ENV, ...extraEnv };
  delete env[TOKEN_VAR];
  delete env.AIF_SECRETS_WRAPPED;
  delete env.AIF_REEXEC_ARGS;
  if (token) env[TOKEN_VAR] = token;
  return spawnSync('node', [BIN_PATH, ...args], { cwd, encoding: 'utf8', env, timeout: 20000 });
}

const SHELL_JOIN_WRAPPER = `
import { spawnSync } from 'node:child_process';
const joined = process.argv.slice(2).join(' ');
const r = spawnSync(joined, {
  shell: true,
  env: { ...process.env, ${TOKEN_VAR}: '${WRAPPER_TOKEN}' },
  stdio: 'inherit',
});
process.exit(r.status ?? 1);
`;

describe('integration: ai-git re-exec argument transport', () => {
  let repo;
  let dir;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'ai-git-shellwrap-'));
    const wrapperPath = join(dir, 'shell-join-wrapper.mjs');
    // Mimics `bws run`: argv joined into one string and run through a
    // shell, token injected into the wrapped process's env only.
    writeFileSync(wrapperPath, SHELL_JOIN_WRAPPER, 'utf8');
    repo = setUpRepo({ run: ['node', wrapperPath] });
  });

  afterEach(() => {
    rmSync(repo, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    rmSync(dir, { recursive: true, force: true });
  });

  it('delivers hostile fetch arguments unchanged: same output with and without the wrapper', () => {
    for (const arg of HOSTILE_ARGS) {
      const wrapped = runAiGit(repo, ['fetch', arg]);
      const direct = runAiGit(repo, ['fetch', arg], { token: WRAPPER_TOKEN });
      assert.equal(wrapped.status, direct.status, `status differs for ${JSON.stringify(arg)}`);
      assert.equal(wrapped.stderr, direct.stderr, `stderr differs for ${JSON.stringify(arg)}`);
      assert.equal(wrapped.stdout, direct.stdout);
      assert.ok(!wrapped.stderr.includes(WRAPPER_TOKEN));
      assert.ok(!wrapped.stdout.includes(WRAPPER_TOKEN));
    }
    assert.ok(!existsSync(join(repo, MARKER)), 'an argument was executed by a shell');
    assert.ok(!existsSync(join(process.cwd(), MARKER)), 'an argument was executed by a shell');
  });

  it('echoes the hostile argument back verbatim in git output', () => {
    const arg = 'a;b $(c) `d` "e" (f)';
    const r = runAiGit(repo, ['fetch', arg]);
    assert.ok(r.stderr.includes(arg), `argument mangled: ${r.stderr}`);
  });

  // Windows caps a command line near 32 KiB, so an over-guard argv can't be
  // built there; the guard itself is covered by the unit tests.
  it(
    'rejects arguments over the size guard with an explicit error and no truncation',
    { skip: process.platform === 'win32' },
    () => {
      const r = runAiGit(repo, ['fetch', 'x'.repeat(120 * 1024)]);
      assert.equal(r.status, 1);
      assert.match(r.stderr, /too large/);
    },
  );
});

describe(
  'integration: ai-git re-exec with a fake gh (POSIX only)',
  { skip: process.platform === 'win32' },
  () => {
    it('passes hostile gh-* arguments through intact via the wrapper', () => {
      const dir = mkdtempSync(join(tmpdir(), 'ai-git-fakegh-'));
      const out = join(dir, 'argv.json');
      const ghPath = join(dir, 'gh');
      writeFileSync(
        ghPath,
        `#!/usr/bin/env node\nrequire('fs').writeFileSync(${JSON.stringify(out)}, JSON.stringify(process.argv.slice(2)));\n`,
        'utf8',
      );
      chmodSync(ghPath, 0o755);
      const wrapperPath = join(dir, 'w.mjs');
      writeFileSync(wrapperPath, SHELL_JOIN_WRAPPER, 'utf8');
      const repo = setUpRepo({ run: ['node', wrapperPath] });
      try {
        const r = runAiGit(repo, ['gh-api', 'repos/o/r/issues', '--field', ...HOSTILE_ARGS], {
          extraEnv: { PATH: `${dir}:${process.env.PATH}` },
        });
        assert.equal(r.status, 0, r.stderr);
        assert.deepEqual(JSON.parse(readFileSync(out, 'utf8')), [
          'api',
          'repos/o/r/issues',
          '--field',
          ...HOSTILE_ARGS,
        ]);
        assert.ok(!existsSync(join(repo, MARKER)));
      } finally {
        rmSync(repo, { recursive: true, force: true });
        rmSync(dir, { recursive: true, force: true });
      }
    });
  },
);

describe('integration: ai-git token-unresolved failure policy', () => {
  let repo;

  afterEach(() => {
    rmSync(repo, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  });

  const cases = [
    [
      'bws missing',
      { run: ['aif-no-such-binary-xyz', 'run', '--'] },
      /aif-no-such-binary-xyz not found on PATH/,
    ],
    [
      'BWS_PROJECT_ID unset',
      { run: ['node', '-e', '0', '--project-id', '${AIF_TEST_UNSET_PROJECT}', '--'] },
      /AIF_TEST_UNSET_PROJECT/,
    ],
  ];

  for (const [name, secrets, causeRe] of cases) {
    it(`${name}: push warns naming the variable and proceeds, no stack trace`, () => {
      repo = setUpRepo(secrets);
      const r = runAiGit(repo, ['push', 'origin', 'main']);
      assert.match(r.stderr, causeRe);
      assert.match(r.stderr, new RegExp(`WARNING: .*${TOKEN_VAR} is not set`));
      assert.ok(!/\n\s+at /.test(r.stderr), `stack trace: ${r.stderr}`);
      // git itself ran (proceeded) and failed on the missing branch/remote.
      assert.match(r.stderr, /error|fatal/i);
    });

    it(`${name}: gh-* stops with one error line naming the variable`, () => {
      repo = setUpRepo(secrets);
      const r = runAiGit(repo, ['gh-api', 'repos/o/r']);
      assert.equal(r.status, 1);
      assert.match(r.stderr, causeRe);
      assert.match(r.stderr, new RegExp(`ERROR: .*${TOKEN_VAR} is not set`));
      assert.ok(!/\n\s+at /.test(r.stderr), `stack trace: ${r.stderr}`);
    });
  }

  it('no secrets.run: push warns, gh-* errors', () => {
    repo = setUpRepo(null);
    const push = runAiGit(repo, ['push', 'origin', 'main']);
    assert.match(push.stderr, new RegExp(`WARNING: ${TOKEN_VAR} is not set`));
    const gh = runAiGit(repo, ['gh-api', 'repos/o/r']);
    assert.equal(gh.status, 1);
    assert.match(gh.stderr, new RegExp(`ERROR: ${TOKEN_VAR} is not set`));
  });
});
