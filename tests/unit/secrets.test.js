/**
 * Unit tests for lib/secrets.js — pure logic for secrets resolution.
 *
 * Plan: AIF-008 (re-exec argument transport and failure policy)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  getSecretsConfig,
  resolvePlaceholders,
  parseDotenv,
  REEXEC_GUARD_ENV,
  isAlreadyWrapped,
  buildWrapperInvocation,
  REEXEC_ARGS_ENV,
  REEXEC_ARGS_TOO_LARGE,
  MAX_REEXEC_ARGS_BYTES,
  encodeReexecArgs,
  decodeReexecArgs,
  describeTokenFailure,
} from '../../lib/secrets.js';

describe('unit: secrets', () => {
  describe('getSecretsConfig()', () => {
    it('extracts run and allowInsecureDotenv from complete config', () => {
      const config = {
        secrets: {
          run: ['bws', 'run', '--project-id', '${BWS_PROJECT_ID}', '--'],
          allow_insecure_dotenv: true,
        },
      };
      const result = getSecretsConfig(config);
      assert.deepEqual(result.run, ['bws', 'run', '--project-id', '${BWS_PROJECT_ID}', '--']);
      assert.equal(result.allowInsecureDotenv, true);
    });

    it('returns null run and false allowInsecureDotenv when secrets is missing', () => {
      const result = getSecretsConfig({});
      assert.equal(result.run, null);
      assert.equal(result.allowInsecureDotenv, false);
    });

    it('treats an empty run array as null', () => {
      const result = getSecretsConfig({ secrets: { run: [] } });
      assert.equal(result.run, null);
    });

    it('treats a non-array run as null', () => {
      const result = getSecretsConfig({ secrets: { run: 'bws run --' } });
      assert.equal(result.run, null);
    });

    it('only treats literal true as allowInsecureDotenv', () => {
      assert.equal(
        getSecretsConfig({ secrets: { allow_insecure_dotenv: 'true' } }).allowInsecureDotenv,
        false,
      );
      assert.equal(
        getSecretsConfig({ secrets: { allow_insecure_dotenv: false } }).allowInsecureDotenv,
        false,
      );
    });
  });

  describe('resolvePlaceholders()', () => {
    it('resolves a single placeholder', () => {
      assert.equal(resolvePlaceholders('${FOO}', { FOO: 'bar' }), 'bar');
    });

    it('resolves multiple placeholders in one string', () => {
      assert.equal(resolvePlaceholders('${A}-${B}', { A: '1', B: '2' }), '1-2');
    });

    it('leaves a string with no placeholders unchanged', () => {
      assert.equal(resolvePlaceholders('plain-value', {}), 'plain-value');
    });

    it('throws on an unset variable', () => {
      assert.throws(
        () => resolvePlaceholders('${MISSING}', {}),
        /references unset environment variable MISSING/,
      );
    });
  });

  describe('parseDotenv()', () => {
    it('parses simple KEY=VALUE lines', () => {
      const result = parseDotenv('FOO=bar\nBAZ=qux\n');
      assert.deepEqual(result, { FOO: 'bar', BAZ: 'qux' });
    });

    it('skips blank lines and comments', () => {
      const result = parseDotenv('\n# a comment\nFOO=bar\n\n#another\n');
      assert.deepEqual(result, { FOO: 'bar' });
    });

    it('strips matching double quotes', () => {
      assert.deepEqual(parseDotenv('FOO="bar baz"'), { FOO: 'bar baz' });
    });

    it('strips matching single quotes', () => {
      assert.deepEqual(parseDotenv("FOO='bar baz'"), { FOO: 'bar baz' });
    });

    it('does not strip mismatched quotes', () => {
      assert.deepEqual(parseDotenv(`FOO="bar'`), { FOO: `"bar'` });
    });

    it('ignores lines with no =', () => {
      assert.deepEqual(parseDotenv('not-a-line\nFOO=bar'), { FOO: 'bar' });
    });

    it('handles an empty value', () => {
      assert.deepEqual(parseDotenv('FOO='), { FOO: '' });
    });

    it('returns an empty object for empty input', () => {
      assert.deepEqual(parseDotenv(''), {});
    });
  });

  describe('isAlreadyWrapped()', () => {
    it('returns true when the guard env var is set to "1"', () => {
      assert.equal(isAlreadyWrapped({ [REEXEC_GUARD_ENV]: '1' }), true);
    });

    it('returns false when the guard env var is unset', () => {
      assert.equal(isAlreadyWrapped({}), false);
    });

    it('returns false for any other value', () => {
      assert.equal(isAlreadyWrapped({ [REEXEC_GUARD_ENV]: 'true' }), false);
    });
  });

  describe('buildWrapperInvocation()', () => {
    it('builds command and args, resolving placeholders in run', () => {
      const run = ['bws', 'run', '--project-id', '${BWS_PROJECT_ID}', '--'];
      const result = buildWrapperInvocation(run, '/usr/bin/node', '/repo/bin/ai-git.js', {
        BWS_PROJECT_ID: 'proj-123',
      });
      assert.equal(result.command, 'bws');
      assert.deepEqual(result.args, [
        'run',
        '--project-id',
        'proj-123',
        '--',
        '/usr/bin/node',
        '/repo/bin/ai-git.js',
      ]);
    });

    it('works with a run array that has no placeholders', () => {
      const result = buildWrapperInvocation(
        ['op', 'run', '--'],
        '/usr/bin/node',
        '/repo/bin/ai-git.js',
        {},
      );
      assert.equal(result.command, 'op');
      assert.deepEqual(result.args, ['run', '--', '/usr/bin/node', '/repo/bin/ai-git.js']);
    });

    it('throws if a placeholder in run is unresolved', () => {
      assert.throws(
        () =>
          buildWrapperInvocation(
            ['bws', 'run', '--project-id', '${MISSING}', '--'],
            '/usr/bin/node',
            '/repo/bin/ai-git.js',
            {},
          ),
        /references unset environment variable MISSING/,
      );
    });
  });
  describe('buildWrapperInvocation() argv', () => {
    it('never includes user arguments in the wrapper argv', () => {
      const result = buildWrapperInvocation(['bws', 'run', '--'], 'node', '/x/ai-git.js', {});
      assert.deepEqual(result.args, ['run', '--', 'node', '/x/ai-git.js']);
    });
  });

  describe('encodeReexecArgs() / decodeReexecArgs()', () => {
    it('uses AIF_REEXEC_ARGS as the transport variable', () => {
      assert.equal(REEXEC_ARGS_ENV, 'AIF_REEXEC_ARGS');
    });

    it('round-trips hostile arguments losslessly', () => {
      const args = [
        'a b',
        'a;echo X',
        '$(id)',
        '`id`',
        "it's",
        'say "hi"',
        'l1\nl2',
        '(x)',
        '$HOME',
        '',
      ];
      assert.deepEqual(decodeReexecArgs(encodeReexecArgs(args)), args);
    });

    it('round-trips an empty argv', () => {
      assert.deepEqual(decodeReexecArgs(encodeReexecArgs([])), []);
    });

    it('rejects arguments over the size guard instead of truncating', () => {
      assert.throws(() => encodeReexecArgs(['x'.repeat(MAX_REEXEC_ARGS_BYTES)]), {
        code: REEXEC_ARGS_TOO_LARGE,
      });
    });

    it('accepts arguments just under the size guard', () => {
      const encoded = encodeReexecArgs(['x'.repeat(MAX_REEXEC_ARGS_BYTES - 100)]);
      assert.ok(Buffer.byteLength(encoded) <= MAX_REEXEC_ARGS_BYTES);
    });

    it('counts bytes, not characters, against the guard', () => {
      assert.throws(() => encodeReexecArgs(['é'.repeat(MAX_REEXEC_ARGS_BYTES / 2)]), {
        code: REEXEC_ARGS_TOO_LARGE,
      });
    });

    it('rejects malformed JSON on decode', () => {
      assert.throws(() => decodeReexecArgs('{nope'), /not valid JSON/);
    });

    it('rejects non-array and non-string-element JSON on decode', () => {
      assert.throws(() => decodeReexecArgs('{"a":1}'), /JSON array of strings/);
      assert.throws(() => decodeReexecArgs('["a",1]'), /JSON array of strings/);
    });
  });

  describe('describeTokenFailure()', () => {
    it('is fatal for gh commands and names the variable', () => {
      const r = describeTokenFailure(true, 'AI_GIT_TOKEN', null);
      assert.equal(r.fatal, true);
      assert.match(r.message, /^ERROR: AI_GIT_TOKEN is not set/);
    });

    it('is a non-fatal warning for push/fetch', () => {
      const r = describeTokenFailure(false, 'AI_GIT_TOKEN', null);
      assert.equal(r.fatal, false);
      assert.match(r.message, /^WARNING: AI_GIT_TOKEN is not set/);
    });

    it('includes the cause on a single line', () => {
      const r = describeTokenFailure(false, 'T', 'bws not found on PATH');
      assert.match(r.message, /bws not found on PATH; T is not set/);
      assert.ok(!r.message.includes('\n'));
    });
  });
});
