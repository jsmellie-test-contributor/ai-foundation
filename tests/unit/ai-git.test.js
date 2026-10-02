/**
 * Unit tests for lib/ai-git.js — pure logic for AI git identity and auth.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  getIdentity,
  buildGitEnv,
  buildGhEnv,
  parseGhCommand,
  isGhCommand,
  needsPushAuth,
  getAuthScope,
  buildAuthHeaderValue,
  buildAuthConfigArgs,
  findRemoteName,
  isDoctorCommand,
  buildDoctorReport,
  buildDoctorProbeArgs,
  isShellSafeArg,
  isOnPath,
} from '../../lib/ai-git.js';

describe('unit: ai-git', () => {
  describe('getIdentity()', () => {
    it('extracts identity from complete config', () => {
      const config = {
        ai_identity: {
          git_author_name: 'Bot',
          git_author_email: 'bot@example.com',
          git_token_env: 'MY_TOKEN',
        },
      };
      const identity = getIdentity(config);
      assert.equal(identity.name, 'Bot');
      assert.equal(identity.email, 'bot@example.com');
      assert.equal(identity.tokenEnvName, 'MY_TOKEN');
    });

    it('returns defaults when ai_identity is missing', () => {
      const identity = getIdentity({});
      assert.equal(identity.name, 'AI Agent');
      assert.equal(identity.email, 'ai@localhost');
      assert.equal(identity.tokenEnvName, null);
    });

    it('returns defaults for partial ai_identity', () => {
      const config = { ai_identity: { git_author_name: 'Custom' } };
      const identity = getIdentity(config);
      assert.equal(identity.name, 'Custom');
      assert.equal(identity.email, 'ai@localhost');
      assert.equal(identity.tokenEnvName, null);
    });
  });

  describe('buildGitEnv()', () => {
    it('injects all four identity env vars', () => {
      const env = buildGitEnv({ name: 'Bot', email: 'bot@test.com' });
      assert.equal(env.GIT_AUTHOR_NAME, 'Bot');
      assert.equal(env.GIT_AUTHOR_EMAIL, 'bot@test.com');
      assert.equal(env.GIT_COMMITTER_NAME, 'Bot');
      assert.equal(env.GIT_COMMITTER_EMAIL, 'bot@test.com');
    });

    it('preserves base env vars', () => {
      const env = buildGitEnv(
        { name: 'Bot', email: 'bot@test.com' },
        { PATH: '/usr/bin', HOME: '/home/user' },
      );
      assert.equal(env.PATH, '/usr/bin');
      assert.equal(env.HOME, '/home/user');
      assert.equal(env.GIT_AUTHOR_NAME, 'Bot');
    });

    it('overrides existing git identity in base env', () => {
      const base = { GIT_AUTHOR_NAME: 'Old', GIT_AUTHOR_EMAIL: 'old@test.com' };
      const env = buildGitEnv({ name: 'New', email: 'new@test.com' }, base);
      assert.equal(env.GIT_AUTHOR_NAME, 'New');
      assert.equal(env.GIT_AUTHOR_EMAIL, 'new@test.com');
    });
  });

  describe('buildGhEnv()', () => {
    it('injects GH_TOKEN when token is provided', () => {
      const env = buildGhEnv('abc123', { PATH: '/usr/bin' });
      assert.equal(env.GH_TOKEN, 'abc123');
      assert.equal(env.PATH, '/usr/bin');
    });

    it('does not inject GH_TOKEN when token is null', () => {
      const env = buildGhEnv(null, { PATH: '/usr/bin' });
      assert.equal(env.GH_TOKEN, undefined);
      assert.equal(env.PATH, '/usr/bin');
    });

    it('does not inject GH_TOKEN when token is empty string', () => {
      const env = buildGhEnv('', { PATH: '/usr/bin' });
      assert.equal(env.GH_TOKEN, undefined);
    });
  });

  describe('parseGhCommand()', () => {
    it('parses gh-pr-create to ["pr", "create"]', () => {
      assert.deepEqual(parseGhCommand('gh-pr-create'), ['pr', 'create']);
    });

    it('parses gh-pr-list to ["pr", "list"]', () => {
      assert.deepEqual(parseGhCommand('gh-pr-list'), ['pr', 'list']);
    });

    it('parses gh-pr-merge to ["pr", "merge"]', () => {
      assert.deepEqual(parseGhCommand('gh-pr-merge'), ['pr', 'merge']);
    });

    it('parses gh-repo-view to ["repo", "view"]', () => {
      assert.deepEqual(parseGhCommand('gh-repo-view'), ['repo', 'view']);
    });

    it('parses single subcommand gh-auth to ["auth"]', () => {
      assert.deepEqual(parseGhCommand('gh-auth'), ['auth']);
    });
  });

  describe('isGhCommand()', () => {
    it('returns true for gh- prefixed commands', () => {
      assert.equal(isGhCommand('gh-pr-create'), true);
      assert.equal(isGhCommand('gh-repo-view'), true);
    });

    it('returns false for regular git commands', () => {
      assert.equal(isGhCommand('commit'), false);
      assert.equal(isGhCommand('push'), false);
      assert.equal(isGhCommand('status'), false);
    });
  });

  describe('needsPushAuth()', () => {
    it('returns true for push', () => {
      assert.equal(needsPushAuth('push'), true);
    });

    it('returns true for fetch', () => {
      assert.equal(needsPushAuth('fetch'), true);
    });

    it('returns false for commit', () => {
      assert.equal(needsPushAuth('commit'), false);
    });

    it('returns false for status', () => {
      assert.equal(needsPushAuth('status'), false);
    });

    it('returns false for worktree', () => {
      assert.equal(needsPushAuth('worktree'), false);
    });
  });

  describe('getAuthScope()', () => {
    it('returns the scope prefix for a GitHub HTTPS remote', () => {
      assert.equal(getAuthScope('https://github.com/org/repo.git'), 'https://github.com/');
    });

    it('returns null for SSH URLs', () => {
      assert.equal(getAuthScope('git@github.com:org/repo.git'), null);
    });

    it('returns null for non-GitHub HTTPS URLs', () => {
      assert.equal(getAuthScope('https://gitlab.com/org/repo.git'), null);
    });
  });

  describe('buildAuthHeaderValue()', () => {
    it('builds a base64 Basic auth header value', () => {
      const value = buildAuthHeaderValue('token123', 'Bot Name');
      const expected = `AUTHORIZATION: basic ${Buffer.from('bot-name:token123').toString('base64')}`;
      assert.equal(value, expected);
    });

    it('never contains the raw token as a plain substring alongside the username delimiter', () => {
      // The header value must be base64-encoded, not string-concatenated,
      // so a naive substring scan for "token123" plaintext must fail.
      const value = buildAuthHeaderValue('token123', 'Bot');
      assert.equal(value.includes('token123'), false);
    });

    it('handles username with multiple spaces', () => {
      const value = buildAuthHeaderValue('tok', 'My AI Agent');
      const expected = `AUTHORIZATION: basic ${Buffer.from('my-ai-agent:tok').toString('base64')}`;
      assert.equal(value, expected);
    });
  });

  describe('buildAuthConfigArgs()', () => {
    it('builds -c extraheader args for a GitHub HTTPS remote', () => {
      const args = buildAuthConfigArgs('https://github.com/org/repo.git', 'token123', 'Bot');
      assert.equal(args[0], '-c');
      assert.ok(args[1].startsWith('http.https://github.com/.extraheader='));
      assert.equal(args.length, 2);
    });

    it('returns [] for SSH remotes', () => {
      assert.deepEqual(buildAuthConfigArgs('git@github.com:org/repo.git', 'token123', 'Bot'), []);
    });

    it('returns [] for non-GitHub HTTPS remotes', () => {
      assert.deepEqual(
        buildAuthConfigArgs('https://gitlab.com/org/repo.git', 'token123', 'Bot'),
        [],
      );
    });

    it('never includes the raw token in plaintext in the returned args', () => {
      const args = buildAuthConfigArgs(
        'https://github.com/org/repo.git',
        'super-secret-token',
        'Bot',
      );
      assert.ok(!args.join(' ').includes('super-secret-token'));
    });
  });

  describe('findRemoteName() — argument-order regression coverage', () => {
    it('finds remote when it is the first positional arg', () => {
      assert.equal(findRemoteName(['push', 'origin', 'main']), 'origin');
    });

    it('finds remote when -u precedes it', () => {
      assert.equal(findRemoteName(['push', '-u', 'origin', 'main']), 'origin');
    });

    it('finds remote when -u follows the branch', () => {
      assert.equal(findRemoteName(['push', 'origin', 'main', '-u']), 'origin');
    });

    it('finds remote when --set-upstream precedes it', () => {
      assert.equal(findRemoteName(['push', '--set-upstream', 'origin', 'main']), 'origin');
    });

    it('falls back to origin when no positional remote is present', () => {
      assert.equal(findRemoteName(['push', '-u']), 'origin');
      assert.equal(findRemoteName(['push']), 'origin');
    });
  });

  describe('regression: push/fetch auth injection is order-independent and leak-free', () => {
    const orderings = [
      ['push', '-u', 'origin', 'main'],
      ['push', 'origin', '-u', 'main'],
      ['push', 'origin', 'main', '-u'],
      ['push', '--set-upstream', 'origin', 'main'],
      ['push', 'origin', 'main'],
      ['fetch', '-v', 'origin'],
    ];

    for (const args of orderings) {
      it(`resolves the correct remote and never leaks the token for: ${args.join(' ')}`, () => {
        const remoteName = findRemoteName(args);
        assert.equal(remoteName, 'origin');

        const authConfigArgs = buildAuthConfigArgs(
          'https://github.com/org/repo.git',
          'super-secret-token',
          'Bot',
        );

        // Auth is injected as a prepended -c override; the caller's own
        // args (including -u in any position) are never rewritten.
        const finalArgs = [...authConfigArgs, ...args];
        assert.deepEqual(finalArgs.slice(authConfigArgs.length), args);

        // The raw token must never appear in plaintext anywhere in the
        // args that would be passed to spawnSync (and therefore never
        // in anything git could echo or persist).
        assert.ok(!finalArgs.join(' ').includes('super-secret-token'));
      });
    }
  });

  describe('doctor (AIF-008)', () => {
    const allOk = {
      tools: { 'ai-git': true, gh: true, bws: true },
      configFound: true,
      tokenEnvName: 'MY_TOKEN',
      tokenSource: 'env',
    };

    it('isDoctorCommand matches only doctor', () => {
      assert.equal(isDoctorCommand('doctor'), true);
      assert.equal(isDoctorCommand('commit'), false);
      assert.equal(isDoctorCommand(undefined), false);
    });

    it('reports ok when everything resolves', () => {
      const r = buildDoctorReport(allOk);
      assert.equal(r.ok, true);
      assert.ok(r.lines.some((l) => l.includes('token (MY_TOKEN): resolved via env')));
    });

    it('names each missing tool', () => {
      const r = buildDoctorReport({ ...allOk, tools: { 'ai-git': true, gh: false, bws: false } });
      assert.equal(r.ok, false);
      assert.ok(r.lines.some((l) => l.startsWith('FAIL') && l.includes('gh:')));
      assert.ok(r.lines.some((l) => l.startsWith('FAIL') && l.includes('bws:')));
      assert.ok(r.lines.some((l) => l.startsWith('ok') && l.includes('ai-git:')));
    });

    it('fails when config is not found', () => {
      const r = buildDoctorReport({ ...allOk, configFound: false });
      assert.equal(r.ok, false);
      assert.ok(r.lines.some((l) => l.includes('.aiconfig.json: NOT found')));
    });

    it('fails when the token does not resolve or is unconfigured', () => {
      assert.equal(buildDoctorReport({ ...allOk, tokenSource: null }).ok, false);
      const r = buildDoctorReport({ ...allOk, tokenEnvName: null, tokenSource: null });
      assert.equal(r.ok, false);
      assert.ok(r.lines.some((l) => l.includes('no ai_identity.git_token_env')));
    });

    it('always tells agents to use ai-git on identity errors', () => {
      for (const facts of [allOk, { ...allOk, configFound: false }]) {
        assert.ok(buildDoctorReport(facts).lines.some((l) => l.includes('use ai-git')));
      }
    });

    it('says the token check was skipped when config is absent', () => {
      const r = buildDoctorReport({
        ...allOk,
        configFound: false,
        tokenEnvName: null,
        tokenSource: null,
      });
      assert.ok(r.lines.some((l) => l.includes('check skipped, no .aiconfig.json')));
      assert.ok(!r.lines.some((l) => l.includes('no ai_identity.git_token_env')));
    });

    it('names the unset secrets.run placeholder variable', () => {
      const r = buildDoctorReport({
        ...allOk,
        tokenSource: null,
        unsetPlaceholder: 'BWS_PROJECT_ID',
      });
      assert.equal(r.ok, false);
      assert.ok(r.lines.some((l) => l.includes('unset environment variable BWS_PROJECT_ID')));
    });

    it('probe argv is a fixed node + script pair of shell-safe elements', () => {
      const args = buildDoctorProbeArgs('/repo/lib/doctor-probe.js');
      assert.deepEqual(args, ['node', '/repo/lib/doctor-probe.js']);
      assert.ok(args.every(isShellSafeArg));
      assert.ok(isShellSafeArg(String.raw`C:\repo\lib\doctor-probe.js`));
    });

    it('isShellSafeArg rejects shell metacharacters', () => {
      for (const bad of ['a b', "a'b", 'a"b', 'f(x)', 'a[0]', 'a?b', 'a;b', 'a$b', 'a|b', '']) {
        assert.equal(isShellSafeArg(bad), false, bad);
      }
    });

    it('isOnPath finds tools via an injected existence check (posix and win32)', () => {
      const mk = (platform, files) => ({
        pathVar: platform === 'win32' ? 'C:/a;C:/b' : '/a:/b',
        delimiter: platform === 'win32' ? ';' : ':',
        platform,
        pathext: '.EXE;.CMD',
        exists: (f) => files.includes(f),
        join: (d, n) => `${d}/${n}`,
      });
      assert.equal(isOnPath('gh', mk('linux', ['/b/gh'])), true);
      assert.equal(isOnPath('gh', mk('linux', ['/b/gh.cmd'])), false);
      assert.equal(isOnPath('gh', mk('win32', ['C:/b/gh.cmd'])), true);
      assert.equal(isOnPath('bws', mk('win32', [])), false);
    });
  });
});
